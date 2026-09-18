import { measureIntegratedLufs } from '../mastering/loudnessMeter';
import { createWaveformPeaks } from '../mastering/MasteringWaveforms';
import { encodeWav24 } from '../mastering/wav24';
import { encodeMp3 } from '../mastering/mp3Encoder';
import {
  applyGain,
  applyLinkedCompression,
  connectStereoWidth,
  enforceSamplePeakCeiling,
  repairIsolatedSampleSpikes,
} from '../mastering/masteringEngine';

/**
 * "Mejorar mezcla" — gentle mix-bus shaping for a finished stereo mix, meant
 * to stay usable as the input to a later Mastering pass (it does not push
 * loudness the way Mastering does; it only corrects a mix that's too quiet
 * for streaming, and never past -12 LUFS).
 *
 * Ranges below and the reasoning for the -14 LUFS / -1.2 dBFS targets are
 * documented in full where they were proposed — kept in sync with
 * masteringEngine.ts's own `targetIntegratedLufs.balanced` and peak ceiling
 * so both tools agree on what "streaming-safe" means.
 */
export interface ImproveMixSettings {
  /** -6..+6 — low shelf @150Hz + a gentle counter-move on the highs. */
  warmth: number;
  /** -6..+6 — presence bell @3.5kHz + air shelf @9kHz. */
  clarity: number;
  /** 0..10 — bus glue compression amount. */
  dynamics: number;
  /** -30..+30 (%) — mid-side stereo width. */
  width: number;
}

export const DEFAULT_IMPROVE_MIX_SETTINGS: ImproveMixSettings = {
  warmth: 0,
  clarity: 0,
  dynamics: 0,
  width: 0,
};

export interface ImproveMixResult {
  buffer: AudioBuffer;
  wav24: Blob;
  mp3: Blob;
  integratedLufs: number;
  peakDbfs: number;
  appliedGainDb: number;
  originalWaveformPeaks: Float32Array;
  improvedWaveformPeaks: Float32Array;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const PEAK_CEILING_DBFS = -1.2;
const SAFE_LUFS_TARGET = -14;
/** Never correct level past this point — going louder than this is Mastering's job. */
const SAFE_LUFS_CEILING = -12;
const MAX_LEVEL_TRIM_DB = 4;

export function clampImproveMixSettings(settings: Partial<ImproveMixSettings>): ImproveMixSettings {
  return {
    warmth: clamp(settings.warmth ?? 0, -6, 6),
    clarity: clamp(settings.clarity ?? 0, -6, 6),
    dynamics: clamp(settings.dynamics ?? 0, 0, 10),
    width: clamp(settings.width ?? 0, -30, 30),
  };
}

export async function improveMix(
  file: File,
  rawSettings: ImproveMixSettings,
  onProgress?: (progress: number, label: string) => void,
): Promise<ImproveMixResult> {
  const settings = clampImproveMixSettings(rawSettings);

  onProgress?.(8, 'Decodificando mezcla');
  const fileBuffer = await file.arrayBuffer();
  const decodingContext = new AudioContext();
  const sourceBuffer = await decodingContext.decodeAudioData(fileBuffer.slice(0));
  await decodingContext.close();

  const originalWaveformPeaks = createWaveformPeaks(sourceBuffer);

  const offline = new OfflineAudioContext(2, sourceBuffer.length, sourceBuffer.sampleRate);
  const source = offline.createBufferSource();
  source.buffer = sourceBuffer;

  const warmthAmount = settings.warmth / 6; // -1..1
  const clarityAmount = settings.clarity / 6; // -1..1

  const lowShelf = offline.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 150;
  lowShelf.gain.value = clamp(warmthAmount * 2.5, -2.5, 2.5);

  // Counter-move so heavy warmth doesn't read as boxy/muddy.
  const lowMidTrim = offline.createBiquadFilter();
  lowMidTrim.type = 'peaking';
  lowMidTrim.frequency.value = 400;
  lowMidTrim.Q.value = 0.9;
  lowMidTrim.gain.value = warmthAmount > 0.5 ? clamp(-1 * (warmthAmount - 0.5) * 2, -1, 0) : 0;

  const highShelfWarmth = offline.createBiquadFilter();
  highShelfWarmth.type = 'highshelf';
  highShelfWarmth.frequency.value = 10000;
  highShelfWarmth.gain.value = clamp(warmthAmount * -1.5, -1.5, 1);

  const presence = offline.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 3500;
  presence.Q.value = 1;
  presence.gain.value = clarityAmount >= 0 ? clamp(clarityAmount * 3, 0, 3) : clamp(clarityAmount * 2, -2, 0);

  const airShelf = offline.createBiquadFilter();
  airShelf.type = 'highshelf';
  airShelf.frequency.value = 9000;
  airShelf.gain.value = clamp(Math.max(0, clarityAmount) * 2.5, 0, 2.5);

  // Declutter low-mids only when adding clarity, never when removing it.
  const clarityLowMidTrim = offline.createBiquadFilter();
  clarityLowMidTrim.type = 'peaking';
  clarityLowMidTrim.frequency.value = 300;
  clarityLowMidTrim.Q.value = 0.9;
  clarityLowMidTrim.gain.value = clamp(Math.max(0, clarityAmount) * -1.5, -1.5, 0);

  source.connect(lowShelf);
  lowShelf.connect(lowMidTrim);
  lowMidTrim.connect(highShelfWarmth);
  highShelfWarmth.connect(presence);
  presence.connect(airShelf);
  airShelf.connect(clarityLowMidTrim);

  const widthAmount = 1 + clamp(settings.width, -30, 30) / 100;
  connectStereoWidth(offline, clarityLowMidTrim, offline.destination, widthAmount);

  onProgress?.(30, 'Dando forma al tono');
  source.start();
  const progressTimer = window.setInterval(() => onProgress?.(55, 'Aplicando calidez y claridad'), 400);
  let rendered = await offline.startRendering();
  window.clearInterval(progressTimer);

  // Dynamics — bus glue compression, capped well short of a limiter.
  const dynamicsAmount = settings.dynamics / 10; // 0..1
  if (dynamicsAmount > 0) {
    onProgress?.(66, 'Aplicando dinámica');
    repairIsolatedSampleSpikes(rendered);
    const threshold = -20 + dynamicsAmount * 10; // -20 → -10 dB
    const ratio = 1.5 + dynamicsAmount * 1.5; // 1.5:1 → 3:1
    applyLinkedCompression(rendered, threshold, ratio, 0.015, 0.15);
  }

  // Safety net: same peak ceiling mastering uses, then a conservative,
  // one-directional loudness trim — never louder than SAFE_LUFS_CEILING,
  // and never a jump bigger than MAX_LEVEL_TRIM_DB.
  onProgress?.(80, 'Protegiendo el margen de salida');
  enforceSamplePeakCeiling(rendered, PEAK_CEILING_DBFS);

  onProgress?.(85, 'Midiendo loudness integrado');
  const preTrimLufs = await measureIntegratedLufs(rendered);
  let appliedGainDb = 0;
  if (preTrimLufs < SAFE_LUFS_TARGET) {
    appliedGainDb = clamp(SAFE_LUFS_TARGET - preTrimLufs, 0, MAX_LEVEL_TRIM_DB);
  } else if (preTrimLufs > SAFE_LUFS_CEILING) {
    // Only ever turns down here, and only if it crossed into "too loud for
    // this tool" territory — pushing louder is Mastering's job, not this one's.
    appliedGainDb = clamp(SAFE_LUFS_CEILING - preTrimLufs, -MAX_LEVEL_TRIM_DB, 0);
  }
  if (appliedGainDb !== 0) {
    applyGain(rendered, appliedGainDb);
    enforceSamplePeakCeiling(rendered, PEAK_CEILING_DBFS);
  }

  onProgress?.(90, 'Midiendo resultado final');
  const outputLevels = enforceSamplePeakCeiling(rendered, PEAK_CEILING_DBFS);
  const integratedLufs = appliedGainDb !== 0 ? await measureIntegratedLufs(rendered) : preTrimLufs;

  onProgress?.(93, 'Generando WAV de 24 bits');
  const wav24 = encodeWav24(rendered, false);
  onProgress?.(96, 'Generando MP3 de 320 kbps');
  const mp3 = await encodeMp3(wav24, (progress) => onProgress?.(96 + progress * 4, 'Generando MP3 de 320 kbps'));
  onProgress?.(100, 'Mezcla mejorada lista');

  return {
    buffer: rendered,
    wav24,
    mp3,
    integratedLufs,
    peakDbfs: outputLevels.peakDbfs,
    appliedGainDb,
    originalWaveformPeaks,
    improvedWaveformPeaks: createWaveformPeaks(rendered),
  };
}
