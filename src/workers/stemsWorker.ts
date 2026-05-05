/**
 * stemsWorker.ts
 * Web Worker — separación de stems con Demucs ONNX via onnxruntime-web
 * Coloca en: src/workers/stemsWorker.ts
 *
 * El audio nunca sale del dispositivo del usuario.
 * Modelo: htdemucs (4 stems) exportado a ONNX
 * - vocals, drums, bass, other
 */

import * as ort from 'onnxruntime-web';

// ─── Config ──────────────────────────────────────────────────────────────────
const MODEL_URL = 'https://huggingface.co/mixingmusicai/demucs-onnx/resolve/main/htdemucs.onnx';
const CACHE_KEY = 'demucs_htdemucs_v1';
const SAMPLE_RATE = 44100;
const CHUNK_SAMPLES = SAMPLE_RATE * 8;   // 8 segundos por chunk (balance memoria/velocidad)
const OVERLAP_SAMPLES = SAMPLE_RATE;     // 1 segundo de overlap para evitar artefactos

// Stem order del modelo htdemucs
const STEM_NAMES = ['drums', 'bass', 'other', 'vocals'] as const;

// ─── Tipos de mensajes ───────────────────────────────────────────────────────
type WorkerMessage =
  | { type: 'separate'; audioData: Float32Array; sampleRate: number; quality: 'fast' | 'std' | 'hd' }

type WorkerResponse =
  | { type: 'progress'; pct: number; text: string }
  | { type: 'done'; stems: Record<string, Float32Array>; sampleRate: number }
  | { type: 'error'; message: string }
  | { type: 'model-loading'; cached: boolean }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function post(msg: WorkerResponse) {
  self.postMessage(msg);
}

/** Normaliza audio a [-1, 1] */
function normalize(data: Float32Array): Float32Array {
  const max = Math.max(...Array.from(data).map(Math.abs));
  if (max === 0) return data;
  return data.map(x => x / max) as Float32Array;
}

/** Resamplea si el audio no es 44100 Hz */
function resampleIfNeeded(data: Float32Array, fromRate: number): Float32Array {
  if (fromRate === SAMPLE_RATE) return data;
  const ratio = SAMPLE_RATE / fromRate;
  const out = new Float32Array(Math.round(data.length * ratio));
  for (let i = 0; i < out.length; i++) {
    const src = i / ratio;
    const lo = Math.floor(src);
    const hi = Math.min(lo + 1, data.length - 1);
    const t = src - lo;
    out[i] = data[lo] * (1 - t) + data[hi] * t;
  }
  return out;
}

/** Aplica ventana de Hann para suavizar bordes de chunks */
function applyHannWindow(chunk: Float32Array, isFirst: boolean, isLast: boolean): Float32Array {
  const result = new Float32Array(chunk);
  const fadeLen = Math.min(OVERLAP_SAMPLES, chunk.length / 2);
  if (!isFirst) {
    for (let i = 0; i < fadeLen; i++) {
      result[i] *= i / fadeLen; // fade-in
    }
  }
  if (!isLast) {
    for (let i = 0; i < fadeLen; i++) {
      result[chunk.length - 1 - i] *= i / fadeLen; // fade-out
    }
  }
  return result;
}

/** Carga el modelo desde caché IndexedDB o descarga desde HuggingFace */
async function loadModel(): Promise<ort.InferenceSession> {
  // Intentar desde caché
  try {
    const cache = await caches.open(CACHE_KEY);
    const cached = await cache.match(MODEL_URL);
    if (cached) {
      post({ type: 'model-loading', cached: true });
      post({ type: 'progress', pct: 12, text: 'Cargando modelo desde caché…' });
      const buf = await cached.arrayBuffer();
      const session = await ort.InferenceSession.create(buf, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      return session;
    }
  } catch (_) { /* caché no disponible, descargamos */ }

  // Descargar modelo
  post({ type: 'model-loading', cached: false });
  post({ type: 'progress', pct: 2, text: 'Descargando modelo Demucs (~170MB)…' });

  const resp = await fetch(MODEL_URL);
  if (!resp.ok) throw new Error(`Error descargando modelo: ${resp.status} ${resp.statusText}`);

  const total = Number(resp.headers.get('content-length') || 0);
  const reader = resp.body!.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) {
      const pct = Math.round((received / total) * 18) + 2; // 2→20%
      post({ type: 'progress', pct, text: `Descargando modelo… ${Math.round(received / 1024 / 1024)}MB / ${Math.round(total / 1024 / 1024)}MB` });
    }
  }

  // Reconstruir buffer
  const modelBuffer = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) { modelBuffer.set(c, offset); offset += c.length; }

  // Guardar en caché para próximas veces
  try {
    const cache = await caches.open(CACHE_KEY);
    await cache.put(MODEL_URL, new Response(modelBuffer.buffer, { headers: { 'Content-Type': 'application/octet-stream' } }));
  } catch (_) { /* ignorar errores de caché */ }

  post({ type: 'progress', pct: 22, text: 'Inicializando modelo ONNX…' });
  const session = await ort.InferenceSession.create(modelBuffer.buffer, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  });
  return session;
}

/** Procesa un chunk de audio y retorna los 4 stems */
async function processChunk(
  session: ort.InferenceSession,
  chunk: Float32Array,
  quality: 'fast' | 'std' | 'hd'
): Promise<Record<string, Float32Array>> {
  // htdemucs espera: [1, 2, samples] (batch, stereo, time)
  // Si el audio es mono, duplicamos el canal
  const stereoChunk = new Float32Array(2 * chunk.length);
  stereoChunk.set(chunk, 0);
  stereoChunk.set(chunk, chunk.length);

  const inputTensor = new ort.Tensor('float32', stereoChunk, [1, 2, chunk.length]);

  const feeds: Record<string, ort.Tensor> = {};
  // El nombre del input depende del modelo exportado
  // htdemucs suele usar 'mix' o el primer input name
  const inputName = session.inputNames[0];
  feeds[inputName] = inputTensor;

  const results = await session.run(feeds);

  // Output: [1, 4, 2, samples] → stems en orden: drums, bass, other, vocals
  const outputName = session.outputNames[0];
  const outputData = results[outputName].data as Float32Array;
  const samplesPerStem = chunk.length;

  const stems: Record<string, Float32Array> = {};
  STEM_NAMES.forEach((name, idx) => {
    // Tomar canal izquierdo de cada stem (promedio L+R para mono)
    const stemData = new Float32Array(samplesPerStem);
    const offset = idx * 2 * samplesPerStem;
    for (let i = 0; i < samplesPerStem; i++) {
      stemData[i] = (outputData[offset + i] + outputData[offset + samplesPerStem + i]) / 2;
    }
    stems[name] = stemData;
  });

  return stems;
}

// ─── Handler principal ────────────────────────────────────────────────────────
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  if (event.data.type !== 'separate') return;

  const { audioData, sampleRate, quality } = event.data;

  try {
    // 1. Cargar modelo
    const session = await loadModel();
    post({ type: 'progress', pct: 25, text: 'Modelo listo · Preparando audio…' });

    // 2. Preprocesar audio
    const resampled = resampleIfNeeded(audioData, sampleRate);
    const normalized = normalize(resampled);
    const totalSamples = normalized.length;

    post({ type: 'progress', pct: 30, text: `Separando ${Math.round(totalSamples / SAMPLE_RATE)}s de audio…` });

    // 3. Procesar en chunks con overlap
    const step = quality === 'fast'
      ? CHUNK_SAMPLES * 2      // chunks más grandes → menos precisión, más rápido
      : quality === 'hd'
        ? CHUNK_SAMPLES / 2    // chunks pequeños → más precisión, más lento
        : CHUNK_SAMPLES;

    const stemAccumulators: Record<string, Float32Array> = {};
    STEM_NAMES.forEach(name => {
      stemAccumulators[name] = new Float32Array(totalSamples);
    });

    let chunkStart = 0;
    let chunkIdx = 0;
    const totalChunks = Math.ceil(totalSamples / step);

    while (chunkStart < totalSamples) {
      const chunkEnd = Math.min(chunkStart + step + OVERLAP_SAMPLES, totalSamples);
      const rawChunk = normalized.slice(chunkStart, chunkEnd);

      const isFirst = chunkStart === 0;
      const isLast = chunkEnd >= totalSamples;
      const windowedChunk = applyHannWindow(rawChunk, isFirst, isLast);

      const chunkStems = await processChunk(session, windowedChunk, quality);

      // Acumular stems con cross-fade en overlaps
      STEM_NAMES.forEach(name => {
        const stemChunk = applyHannWindow(chunkStems[name], isFirst, isLast);
        for (let i = 0; i < stemChunk.length && chunkStart + i < totalSamples; i++) {
          stemAccumulators[name][chunkStart + i] += stemChunk[i];
        }
      });

      chunkStart += step;
      chunkIdx++;

      const pct = 30 + Math.round((chunkIdx / totalChunks) * 60); // 30→90%
      const stemLabels = ['voces', 'batería', 'bajo', 'otros'];
      post({ type: 'progress', pct, text: `Separando ${stemLabels[Math.min(chunkIdx % 4, 3)]}… (${chunkIdx}/${totalChunks})` });
    }

    post({ type: 'progress', pct: 92, text: 'Normalizando stems…' });

    // 4. Normalizar cada stem
    const finalStems: Record<string, Float32Array> = {};
    STEM_NAMES.forEach(name => {
      finalStems[name] = normalize(stemAccumulators[name]);
    });

    post({ type: 'progress', pct: 98, text: 'Exportando WAV…' });
    post({ type: 'done', stems: finalStems, sampleRate: SAMPLE_RATE });

  } catch (err: any) {
    post({ type: 'error', message: err?.message || 'Error desconocido en el worker' });
  }
};
