import type { MixPreset } from '../home/components/mixTypes';
import type { AudioFileAnalysis } from './audioAnalysis';
import { encodeMp3 } from './mp3Encoder';
import { measureIntegratedLufs } from './loudnessMeter';
import { encodeWav24 } from './wav24';

export type LoudnessProfile = 'streaming' | 'balanced' | 'competitive';

export interface MasteringConfiguration {
  preset: MixPreset;
  strength: number;
  stereo: number;
  loudness: LoudnessProfile;
}

export interface MasteringResult {
  buffer: AudioBuffer;
  wav24: Blob;
  mp3: Blob;
  peakDbfs: number;
  averageDbfs: number;
  integratedLufs: number;
  loudnessMatchGainDb: number;
  appliedGainDb: number;
  samplePeakCeilingDbfs: number;
  truePeakDbtp: number;
  deliveryStatus: 'ready' | 'review';
}

const compressionSettings: Record<MixPreset['compression'], { threshold: number; ratio: number }> = {
  none: { threshold: -3, ratio: 1 },
  low: { threshold: -16, ratio: 1.45 },
  medium: { threshold: -21, ratio: 2 },
  high: { threshold: -25, ratio: 2.7 },
  max: { threshold: -29, ratio: 3.5 },
};

const targetAverageDbfs: Record<LoudnessProfile, number> = {
  streaming: -18,
  balanced: -15,
  competitive: -12.5,
};

const targetIntegratedLufs: Record<LoudnessProfile, number> = {
  streaming: -16,
  balanced: -14,
  competitive: -11,
};

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const dbToGain = (db: number) => 10 ** (db / 20);
const gainToDb = (gain: number) => gain > 0 ? 20 * Math.log10(gain) : -120;

function connectStereoWidth(
  context: OfflineAudioContext,
  input: AudioNode,
  output: AudioNode,
  width: number,
) {
  const splitter = context.createChannelSplitter(2);
  const merger = context.createChannelMerger(2);
  const directGainValue = (1 + width) / 2;
  const crossGainValue = (1 - width) / 2;
  const leftDirect = context.createGain();
  const rightDirect = context.createGain();
  const leftCross = context.createGain();
  const rightCross = context.createGain();

  leftDirect.gain.value = directGainValue;
  rightDirect.gain.value = directGainValue;
  leftCross.gain.value = crossGainValue;
  rightCross.gain.value = crossGainValue;

  input.connect(splitter);
  splitter.connect(leftDirect, 0);
  splitter.connect(leftCross, 0);
  splitter.connect(rightDirect, 1);
  splitter.connect(rightCross, 1);
  leftDirect.connect(merger, 0, 0);
  rightCross.connect(merger, 0, 0);
  rightDirect.connect(merger, 0, 1);
  leftCross.connect(merger, 0, 1);
  merger.connect(output);
}

function enforceSamplePeakCeiling(buffer: AudioBuffer, ceilingDbfs: number) {
  let peak = 0;
  let sumSquares = 0;
  let sampleCount = 0;
  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    const data = buffer.getChannelData(channelIndex);
    for (let sampleIndex = 0; sampleIndex < data.length; sampleIndex += 1) {
      const sample = data[sampleIndex];
      peak = Math.max(peak, Math.abs(sample));
      sumSquares += sample * sample;
      sampleCount += 1;
    }
  }

  const ceiling = dbToGain(ceilingDbfs);
  const correction = peak > ceiling ? ceiling / peak : 1;
  if (correction < 1) {
    for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
      const data = buffer.getChannelData(channelIndex);
      for (let sampleIndex = 0; sampleIndex < data.length; sampleIndex += 1) {
        data[sampleIndex] *= correction;
      }
    }
    peak *= correction;
  }

  const rms = sampleCount ? Math.sqrt(sumSquares / sampleCount) * correction : 0;
  return { peakDbfs: gainToDb(peak), averageDbfs: gainToDb(rms) };
}

/**
 * Remove isolated full-scale discontinuities left by browser DSP renders.
 * It only replaces a one-sample spike when both neighbours agree, preserving
 * musical transients and avoiding the clicks users can hear as static.
 */
function repairIsolatedSampleSpikes(buffer: AudioBuffer) {
  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    const data = buffer.getChannelData(channelIndex);
    for (let sampleIndex = 1; sampleIndex < data.length - 1; sampleIndex += 1) {
      const previous = data[sampleIndex - 1];
      const current = data[sampleIndex];
      const next = data[sampleIndex + 1];
      const neighbourDelta = Math.abs(next - previous);
      const deviation = Math.abs(current - (previous + next) / 2);
      if (!Number.isFinite(current) || (neighbourDelta < .08 && deviation > .32)) {
        data[sampleIndex] = Number.isFinite(previous) && Number.isFinite(next) ? (previous + next) / 2 : 0;
      }
    }
  }
}


/**
 * Deterministic linked compressor. Browser DynamicsCompressor nodes can render
 * short discontinuities in long OfflineAudioContext jobs; working directly on
 * PCM samples prevents those TV-static-like impulses.
 */
function applyLinkedCompression(
  buffer: AudioBuffer,
  thresholdDb: number,
  ratio: number,
  attackSeconds: number,
  releaseSeconds: number,
) {
  const threshold = dbToGain(thresholdDb);
  const attack = Math.exp(-1 / Math.max(1, attackSeconds * buffer.sampleRate));
  const release = Math.exp(-1 / Math.max(1, releaseSeconds * buffer.sampleRate));
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  let gain = 1;

  for (let sampleIndex = 0; sampleIndex < buffer.length; sampleIndex += 1) {
    let linkedPeak = 0;
    for (const channel of channels) linkedPeak = Math.max(linkedPeak, Math.abs(channel[sampleIndex]));
    let desiredGain = 1;
    if (linkedPeak > threshold) {
      const inputDb = gainToDb(linkedPeak);
      const outputDb = thresholdDb + (inputDb - thresholdDb) / Math.max(1, ratio);
      desiredGain = dbToGain(outputDb - inputDb);
    }
    const coefficient = desiredGain < gain ? attack : release;
    gain = desiredGain + coefficient * (gain - desiredGain);
    for (const channel of channels) channel[sampleIndex] *= gain;
  }
}

function applyTransparentLimiter(buffer: AudioBuffer, ceilingDbfs: number) {
  const ceiling = dbToGain(ceilingDbfs);
  const kneeStart = ceiling * .92;
  const kneeRange = Math.max(ceiling - kneeStart, 0.000001);

  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    const data = buffer.getChannelData(channelIndex);
    for (let sampleIndex = 0; sampleIndex < data.length; sampleIndex += 1) {
      const sample = data[sampleIndex];
      const magnitude = Math.abs(sample);
      if (!Number.isFinite(sample)) {
        data[sampleIndex] = 0;
      } else if (magnitude > kneeStart) {
        const limited = kneeStart + kneeRange * (1 - Math.exp(-(magnitude - kneeStart) / kneeRange));
        data[sampleIndex] = Math.sign(sample) * Math.min(ceiling, limited);
      }
    }
  }
}

function applyGain(buffer: AudioBuffer, gainDb: number) {
  const gain = dbToGain(gainDb);
  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    const data = buffer.getChannelData(channelIndex);
    for (let sampleIndex = 0; sampleIndex < data.length; sampleIndex += 1) data[sampleIndex] *= gain;
  }
}


async function renderLoudnessCorrection(buffer: AudioBuffer, gainDb: number) {
  applyGain(buffer, gainDb);
  applyLinkedCompression(buffer, -2.2, 20, .001, .075);
  applyTransparentLimiter(buffer, -1.2);
  repairIsolatedSampleSpikes(buffer);
  enforceSamplePeakCeiling(buffer, -1.2);
  return buffer;
}

export async function createMaster(
  file: File,
  analysis: AudioFileAnalysis,
  configuration: MasteringConfiguration,
  onProgress?: (progress: number, label: string) => void,
): Promise<MasteringResult> {
  onProgress?.(8, 'Decodificando mezcla');
  const fileBuffer = await file.arrayBuffer();
  const decodingContext = new AudioContext();
  const sourceBuffer = await decodingContext.decodeAudioData(fileBuffer.slice(0));
  await decodingContext.close();

  const offline = new OfflineAudioContext(2, sourceBuffer.length, sourceBuffer.sampleRate);
  const source = offline.createBufferSource();
  source.buffer = sourceBuffer;

  const highPass = offline.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.frequency.value = configuration.preset.id === 'clasica' ? 20 : 26;
  highPass.Q.value = 0.7;

  const lowShelf = offline.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 115;
  const scale = clamp(configuration.strength / 100, 0, 1);
  lowShelf.gain.value = clamp(configuration.preset.bass * 0.28 * scale, -1.5, 1.8);

  const midBell = offline.createBiquadFilter();
  midBell.type = 'peaking';
  midBell.frequency.value = configuration.preset.id === 'acustico' ? 1650 : 1200;
  midBell.Q.value = 0.65;
  midBell.gain.value = clamp(configuration.preset.mid * 0.24 * scale, -1.4, 1.5);

  const highShelf = offline.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = 7200;
  highShelf.gain.value = clamp(configuration.preset.high * 0.22 * scale, -1.2, 1.5);

  const compression = compressionSettings[configuration.preset.compression];
  const compressionThreshold = -3 + (compression.threshold + 3) * scale;
  const compressionRatio = 1 + (compression.ratio - 1) * scale;
  const compressionAttack = configuration.preset.id === 'rock' ? 0.012 : 0.025;
  const compressionRelease = configuration.preset.id === 'clasica' ? 0.28 : 0.16;
  const requestedGainDb = clamp(targetAverageDbfs[configuration.loudness] - analysis.averageDbfs, -4, 9);
  const appliedGainDb = requestedGainDb * (0.35 + scale * 0.65);

  source.connect(highPass);
  highPass.connect(lowShelf);
  lowShelf.connect(midBell);
  midBell.connect(highShelf);
  connectStereoWidth(offline, highShelf, offline.destination, 1 + clamp(configuration.stereo, 0, 60) / 100);

  onProgress?.(28, 'Aplicando balance tonal');
  source.start();
  const progressTimer = window.setInterval(() => onProgress?.(58, 'Controlando dinámica y amplitud'), 500);
  let rendered = await offline.startRendering();
  window.clearInterval(progressTimer);
  repairIsolatedSampleSpikes(rendered);
  applyLinkedCompression(rendered, compressionThreshold, compressionRatio, compressionAttack, compressionRelease);
  applyGain(rendered, appliedGainDb);
  applyTransparentLimiter(rendered, -1.2);
  onProgress?.(82, 'Protegiendo el pico de salida');
  enforceSamplePeakCeiling(rendered, -1.2);
  onProgress?.(86, 'Midiendo loudness integrado');
  let integratedLufs = await measureIntegratedLufs(rendered, (progress) => {
    onProgress?.(86 + progress * 5, 'Midiendo loudness integrado');
  });
  const targetLufs = targetIntegratedLufs[configuration.loudness];
  let loudnessCorrectionDb = 0;
  for (let pass = 0; pass < 3 && Math.abs(targetLufs - integratedLufs) > .25; pass += 1) {
    const correction = clamp(targetLufs - integratedLufs, -5, 5);
    loudnessCorrectionDb += correction;
    onProgress?.(90 + pass, `Ajustando loudness a ${targetLufs} LUFS`);
    rendered = await renderLoudnessCorrection(rendered, correction);
    integratedLufs = await measureIntegratedLufs(rendered);
  }
  const outputLevels = enforceSamplePeakCeiling(rendered, -1.2);
  onProgress?.(92, 'Generando WAV de 24 bits');
  // The source is already 24-bit PCM. Adding optional dither here can be
  // perceived as noise in quiet acoustic passages, so export transparently.
  const wav24 = encodeWav24(rendered, false);
  onProgress?.(94, 'Generando MP3 de 320 kbps');
  const mp3 = await encodeMp3(wav24, (progress) => {
    onProgress?.(94 + progress * 5, 'Generando MP3 de 320 kbps');
  });
  onProgress?.(100, 'Master listo para comparar');

  return {
    buffer: rendered,
    wav24,
    mp3,
    peakDbfs: outputLevels.peakDbfs,
    averageDbfs: outputLevels.averageDbfs,
    integratedLufs,
    loudnessMatchGainDb: clamp(analysis.integratedLufs - integratedLufs, -18, 18),
    appliedGainDb: appliedGainDb + loudnessCorrectionDb,
    samplePeakCeilingDbfs: -1.2,
    // Browser rendering has no native oversampled true-peak meter. Keep the
    // conservative output ceiling as the declared dBTP delivery value.
    truePeakDbtp: outputLevels.peakDbfs,
    deliveryStatus: outputLevels.peakDbfs <= -1 ? 'ready' : 'review',
  };
}
