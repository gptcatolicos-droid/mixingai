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
  /** Used by Album Mode to preserve intentional level differences between songs. */
  targetLufsOverride?: number;
}

export interface MasteringResult {
  buffer: AudioBuffer;
  wav24: Blob;
  mp3: Blob;
  peakDbfs: number;
  truePeakDbtp: number;
  averageDbfs: number;
  integratedLufs: number;
  loudnessMatchGainDb: number;
  appliedGainDb: number;
  samplePeakCeilingDbfs: number;
  deliveryStatus: 'ready' | 'review';
  noiseProtectionApplied: boolean;
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
  // Streaming is aligned with Spotify normal playback; Dynamic preserves more space.
  streaming: -14,
  balanced: -16,
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

async function measureTruePeakDbtp(buffer: AudioBuffer) {
  const oversample = 4;
  const context = new OfflineAudioContext(Math.min(buffer.numberOfChannels, 2), Math.ceil(buffer.length * oversample), buffer.sampleRate * oversample);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start();
  const rendered = await context.startRendering();
  let peak = 0;
  for (let channelIndex = 0; channelIndex < rendered.numberOfChannels; channelIndex += 1) {
    const data = rendered.getChannelData(channelIndex);
    for (let sampleIndex = 0; sampleIndex < data.length; sampleIndex += 1) peak = Math.max(peak, Math.abs(data[sampleIndex]));
  }
  return gainToDb(peak);
}

async function enforceTruePeakCeiling(buffer: AudioBuffer, ceilingDbtp: number) {
  const measuredDbtp = await measureTruePeakDbtp(buffer);
  const correctionDb = measuredDbtp > ceilingDbtp ? ceilingDbtp - measuredDbtp : 0;
  if (correctionDb < 0) {
    const gain = dbToGain(correctionDb);
    for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
      const data = buffer.getChannelData(channelIndex);
      for (let sampleIndex = 0; sampleIndex < data.length; sampleIndex += 1) data[sampleIndex] *= gain;
    }
  }
  return { truePeakDbtp: correctionDb < 0 ? ceilingDbtp : measuredDbtp };
}

async function renderLoudnessCorrection(buffer: AudioBuffer, gainDb: number) {
  const context = new OfflineAudioContext(2, buffer.length, buffer.sampleRate);
  const source = context.createBufferSource();
  source.buffer = buffer;
  const gain = context.createGain();
  gain.gain.value = dbToGain(gainDb);
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -2.2;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = .001;
  limiter.release.value = .075;
  source.connect(gain);
  gain.connect(limiter);
  limiter.connect(context.destination);
  source.start();
  const corrected = await context.startRendering();
  enforceSamplePeakCeiling(corrected, -1.2);
  return corrected;
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

  const compressor = offline.createDynamicsCompressor();
  const compression = compressionSettings[configuration.preset.compression];
  compressor.threshold.value = -3 + (compression.threshold + 3) * scale;
  compressor.ratio.value = 1 + (compression.ratio - 1) * scale;
  compressor.knee.value = 12;
  compressor.attack.value = configuration.preset.id === 'rock' ? 0.012 : 0.025;
  compressor.release.value = configuration.preset.id === 'clasica' ? 0.28 : 0.16;

  const makeup = offline.createGain();
  // A loud premaster noise floor must never be raised aggressively just to hit a LUFS target.
  const noiseProtectionApplied = analysis.noiseFloorDbfs > -55;
  const maximumMakeupGainDb = noiseProtectionApplied ? 3 : 9;
  const requestedGainDb = clamp(targetAverageDbfs[configuration.loudness] - analysis.averageDbfs, -4, maximumMakeupGainDb);
  const appliedGainDb = requestedGainDb * (0.35 + scale * 0.65);
  makeup.gain.value = dbToGain(appliedGainDb);

  const limiter = offline.createDynamicsCompressor();
  limiter.threshold.value = -1.4;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.09;

  source.connect(highPass);
  highPass.connect(lowShelf);
  lowShelf.connect(midBell);
  midBell.connect(highShelf);
  highShelf.connect(compressor);
  connectStereoWidth(offline, compressor, makeup, 1 + clamp(configuration.stereo, 0, 60) / 100);
  makeup.connect(limiter);
  limiter.connect(offline.destination);

  onProgress?.(28, 'Aplicando balance tonal');
  source.start();
  const progressTimer = window.setInterval(() => onProgress?.(58, 'Controlando dinámica y amplitud'), 500);
  let rendered = await offline.startRendering();
  window.clearInterval(progressTimer);
  onProgress?.(82, 'Protegiendo el pico de salida');
  enforceSamplePeakCeiling(rendered, -1.2);
  onProgress?.(86, 'Midiendo loudness integrado');
  let integratedLufs = await measureIntegratedLufs(rendered, (progress) => {
    onProgress?.(86 + progress * 5, 'Midiendo loudness integrado');
  });
  const targetLufs = configuration.targetLufsOverride ?? targetIntegratedLufs[configuration.loudness];
  let loudnessCorrectionDb = 0;
  const maximumLoudnessBoostDb = noiseProtectionApplied ? 3 : 8;
  for (let pass = 0; pass < 3 && Math.abs(targetLufs - integratedLufs) > .25; pass += 1) {
    const availableBoostDb = Math.max(0, maximumLoudnessBoostDb - Math.max(0, loudnessCorrectionDb));
    const correction = clamp(targetLufs - integratedLufs, -5, availableBoostDb);
    if (Math.abs(correction) < .05) break;
    loudnessCorrectionDb += correction;
    onProgress?.(90 + pass, `Ajustando loudness a ${targetLufs} LUFS`);
    rendered = await renderLoudnessCorrection(rendered, correction);
    integratedLufs = await measureIntegratedLufs(rendered);
  }
  onProgress?.(92, 'Validando True Peak y entrega');
  const truePeakCeiling = configuration.loudness === 'competitive' ? -2 : -1;
  const truePeak = await enforceTruePeakCeiling(rendered, truePeakCeiling);
  integratedLufs = await measureIntegratedLufs(rendered);
  const outputLevels = enforceSamplePeakCeiling(rendered, -1.2);
  onProgress?.(93, 'Generando WAV de 24 bits');
  const wav24 = encodeWav24(rendered, true);
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
    truePeakDbtp: truePeak.truePeakDbtp,
    averageDbfs: outputLevels.averageDbfs,
    integratedLufs,
    loudnessMatchGainDb: clamp(analysis.integratedLufs - integratedLufs, -18, 18),
    appliedGainDb: appliedGainDb + loudnessCorrectionDb,
    samplePeakCeilingDbfs: -1.2,
    deliveryStatus: integratedLufs <= targetLufs + .5 && integratedLufs >= targetLufs - .75 && truePeak.truePeakDbtp <= truePeakCeiling + .05 ? 'ready' : 'review',
    noiseProtectionApplied,
  };
}
