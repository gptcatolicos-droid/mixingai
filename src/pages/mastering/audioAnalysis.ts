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
