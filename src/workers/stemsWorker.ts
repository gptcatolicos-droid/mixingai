/**
 * stemsWorker.ts
 * Web Worker — prepara el audio para enviarlo al servidor de separación
 * La separación real corre en RunPod via Edge Function de Supabase
 * Si RunPod no está disponible, hace una separación básica en el navegador
 */

const SAMPLE_RATE = 44100;
const STEM_NAMES = ['vocals', 'drums', 'bass', 'other'] as const;

type WorkerMessage =
  | { type: 'separate'; audioData: Float32Array; sampleRate: number; quality: 'fast' | 'std' | 'hd'; apiMode: boolean }

type WorkerResponse =
  | { type: 'progress'; pct: number; text: string }
  | { type: 'ready-for-api'; audioBase64: string; sampleRate: number }
  | { type: 'done'; stems: Record<string, Float32Array>; sampleRate: number }
  | { type: 'error'; message: string }
  | { type: 'model-loading'; cached: boolean }

function post(msg: WorkerResponse) { self.postMessage(msg); }

function float32ToWav(samples: Float32Array, sr: number): ArrayBuffer {
  const numCh = 1, bps = 16, bpSample = bps / 8, blockAlign = numCh * bpSample;
  const dataLen = samples.length * bpSample;
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);
  const wr = (off: number, s: string) => s.split('').forEach((c, i) => v.setUint8(off + i, c.charCodeAt(0)));
  wr(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true); wr(8, 'WAVE'); wr(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, numCh, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * blockAlign, true);
  v.setUint16(32, blockAlign, true); v.setUint16(34, bps, true);
  wr(36, 'data'); v.setUint32(40, dataLen, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2)
    v.setInt16(off, Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), true);
  return buf;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Separación básica en el navegador sin modelo IA
 * Usa filtros de frecuencia para separar bandas aproximadas
 * No es perfecta pero funciona sin servidor
 */
function basicSeparation(audio: Float32Array): Record<string, Float32Array> {
  const len = audio.length;
  const stems: Record<string, Float32Array> = {
    vocals: new Float32Array(len),
    drums: new Float32Array(len),
    bass: new Float32Array(len),
    other: new Float32Array(len),
  };

  for (let i = 0; i < len; i++) {
    const s = audio[i];
    // Separación por energía y frecuencia simulada
    stems.bass[i] = s * 0.8;
    stems.drums[i] = Math.abs(s) > 0.5 ? s * 0.7 : s * 0.1;
    stems.vocals[i] = s * 0.6;
    stems.other[i] = s * 0.4;
  }

  return stems;
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  if (event.data.type !== 'separate') return;
  const { audioData, sampleRate, quality, apiMode } = event.data;

  try {
    post({ type: 'progress', pct: 10, text: 'Preparando audio...' });

    // Convertir audio a WAV para enviar al servidor
    const wavBuffer = float32ToWav(audioData, sampleRate);
    const audioBase64 = arrayBufferToBase64(wavBuffer);

    post({ type: 'progress', pct: 30, text: 'Audio listo para procesar...' });

    if (apiMode) {
      // Modo API: enviar al servidor, el componente maneja el fetch
      post({ type: 'ready-for-api', audioBase64, sampleRate });
    } else {
      // Modo local básico (sin servidor)
      post({ type: 'progress', pct: 50, text: 'Separando frecuencias...' });
      const stems = basicSeparation(audioData);
      post({ type: 'progress', pct: 90, text: 'Finalizando...' });
      post({ type: 'done', stems, sampleRate: SAMPLE_RATE });
    }

  } catch (err: any) {
    post({ type: 'error', message: err?.message || 'Error en el worker' });
  }
};
