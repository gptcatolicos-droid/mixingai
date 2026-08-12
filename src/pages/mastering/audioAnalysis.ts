import { measureIntegratedLufs } from './loudnessMeter';

export interface AudioFileAnalysis {
  name: string;
  sizeBytes: number;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  bitDepth: number | null;
  peakDbfs: number;
  averageDbfs: number;
  integratedLufs: number;
  headroomDb: number;
  crestFactorDb: number;
  isClipping: boolean;
  stereoCorrelation: number | null;
  isDualMono: boolean;
  noiseFloorDbfs: number;
  signalToNoiseDb: number;
  waveformPeaks: Float32Array;
}

const readAscii = (view: DataView, offset: number, length: number) => {
  let result = '';
  for (let index = 0; index < length; index += 1) {
    result += String.fromCharCode(view.getUint8(offset + index));
  }
  return result;
};

function detectBitDepth(buffer: ArrayBuffer): number | null {
  if (buffer.byteLength < 24) return null;
  const view = new DataView(buffer);

  // RIFF/WAVE: locate the fmt chunk instead of assuming a fixed offset.
  if (readAscii(view, 0, 4) === 'RIFF' && readAscii(view, 8, 4) === 'WAVE') {
    let offset = 12;
    while (offset + 8 <= view.byteLength) {
      const chunkId = readAscii(view, offset, 4);
      const chunkSize = view.getUint32(offset + 4, true);
      if (chunkId === 'fmt ' && offset + 22 <= view.byteLength) {
        return view.getUint16(offset + 22, true);
      }
      offset += 8 + chunkSize + (chunkSize % 2);
    }
  }

  // AIFF/AIFC: sample size is stored in the COMM chunk.
  if (readAscii(view, 0, 4) === 'FORM' && ['AIFF', 'AIFC'].includes(readAscii(view, 8, 4))) {
    let offset = 12;
    while (offset + 8 <= view.byteLength) {
      const chunkId = readAscii(view, offset, 4);
      const chunkSize = view.getUint32(offset + 4, false);
      if (chunkId === 'COMM' && offset + 14 <= view.byteLength) {
        return view.getUint16(offset + 14, false);
      }
      offset += 8 + chunkSize + (chunkSize % 2);
    }
  }

  return null;
}

const toDb = (value: number) => value > 0 ? 20 * Math.log10(value) : -120;

const createWaveformPeaks = (buffer: AudioBuffer, points = 720) => {
  const peaks = new Float32Array(points);
  const samplesPerPoint = Math.max(1, Math.floor(buffer.length / points));
  for (let point = 0; point < points; point += 1) {
    const start = point * samplesPerPoint;
    const end = Math.min(buffer.length, start + samplesPerPoint);
    let peak = 0;
    for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
      const channel = buffer.getChannelData(channelIndex);
      for (let sample = start; sample < end; sample += 1) peak = Math.max(peak, Math.abs(channel[sample]));
    }
    peaks[point] = peak;
  }
  return peaks;
};

export async function analyzeAudioFile(file: File): Promise<AudioFileAnalysis> {
  const fileBuffer = await file.arrayBuffer();
  const bitDepth = detectBitDepth(fileBuffer);
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) throw new Error('Este navegador no permite analizar audio.');

  const context = new AudioContextClass();
  try {
    const decoded = await context.decodeAudioData(fileBuffer.slice(0));
    let peak = 0;
    let sumSquares = 0;
    let sampleCount = 0;
    const maxSamplesPerChannel = 1_500_000;
    const stride = Math.max(1, Math.ceil(decoded.length / maxSamplesPerChannel));

    for (let channelIndex = 0; channelIndex < decoded.numberOfChannels; channelIndex += 1) {
      const channel = decoded.getChannelData(channelIndex);
      for (let sampleIndex = 0; sampleIndex < channel.length; sampleIndex += stride) {
        const absolute = Math.abs(channel[sampleIndex]);
        if (absolute > peak) peak = absolute;
        sumSquares += channel[sampleIndex] * channel[sampleIndex];
        sampleCount += 1;
      }
    }

    const rms = sampleCount ? Math.sqrt(sumSquares / sampleCount) : 0;
    const peakDbfs = toDb(peak);
    const averageDbfs = toDb(rms);
    const integratedLufs = await measureIntegratedLufs(decoded);
    // Ignore digital silence and estimate the quiet musical floor from short blocks.
    const noiseBlocks: number[] = [];
    const blockSize = Math.max(1, Math.round(decoded.sampleRate * .4));
    for (let start = 0; start < decoded.length; start += blockSize) {
      let energy = 0;
      let count = 0;
      const end = Math.min(decoded.length, start + blockSize);
      for (let channelIndex = 0; channelIndex < decoded.numberOfChannels; channelIndex += 1) {
        const channel = decoded.getChannelData(channelIndex);
        for (let index = start; index < end; index += stride) {
          energy += channel[index] * channel[index];
          count += 1;
        }
      }
      const blockDb = toDb(count ? Math.sqrt(energy / count) : 0);
      if (blockDb > -70) noiseBlocks.push(blockDb);
    }
    noiseBlocks.sort((a, b) => a - b);
    const noiseFloorDbfs = noiseBlocks.length ? noiseBlocks[Math.floor((noiseBlocks.length - 1) * .1)] : -120;
    const signalLevelDbfs = noiseBlocks.length ? noiseBlocks[Math.floor((noiseBlocks.length - 1) * .9)] : averageDbfs;
    const signalToNoiseDb = Math.max(0, signalLevelDbfs - noiseFloorDbfs);
    let stereoCorrelation: number | null = null;
    if (decoded.numberOfChannels >= 2) {
      const left = decoded.getChannelData(0);
      const right = decoded.getChannelData(1);
      let leftEnergy = 0;
      let rightEnergy = 0;
      let crossEnergy = 0;
      for (let index = 0; index < decoded.length; index += stride) {
        leftEnergy += left[index] * left[index];
        rightEnergy += right[index] * right[index];
        crossEnergy += left[index] * right[index];
      }
      stereoCorrelation = leftEnergy && rightEnergy ? crossEnergy / Math.sqrt(leftEnergy * rightEnergy) : 1;
    }

    return {
      name: file.name,
      sizeBytes: file.size,
      durationSeconds: decoded.duration,
      sampleRate: decoded.sampleRate,
      channels: decoded.numberOfChannels,
      bitDepth,
      peakDbfs,
      averageDbfs,
      integratedLufs,
      headroomDb: Math.max(0, -peakDbfs),
      crestFactorDb: Math.max(0, peakDbfs - averageDbfs),
      isClipping: peak >= 0.999,
      stereoCorrelation,
      isDualMono: stereoCorrelation !== null && stereoCorrelation > .995,
      noiseFloorDbfs,
      signalToNoiseDb,
      waveformPeaks: createWaveformPeaks(decoded),
    };
  } catch {
    throw new Error('No pudimos leer este audio. Prueba con un WAV o AIFF estéreo sin protección.');
  } finally {
    await context.close();
  }
}

export const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

export const formatFileSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
