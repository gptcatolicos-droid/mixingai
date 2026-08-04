interface BiquadCoefficients {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

interface BiquadState {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

const silenceLufs = -120;

function highShelfCoefficients(sampleRate: number): BiquadCoefficients {
  const gainDb = 3.999843853973347;
  const quality = 0.7071752369554196;
  const frequency = 1681.974450955533;
  const k = Math.tan(Math.PI * frequency / sampleRate);
  const highGain = 10 ** (gainDb / 20);
  const bandGain = highGain ** 0.4996667741545416;
  const denominator = 1 + k / quality + k * k;

  return {
    b0: (highGain + bandGain * k / quality + k * k) / denominator,
    b1: 2 * (k * k - highGain) / denominator,
    b2: (highGain - bandGain * k / quality + k * k) / denominator,
    a1: 2 * (k * k - 1) / denominator,
    a2: (1 - k / quality + k * k) / denominator,
  };
}

function highPassCoefficients(sampleRate: number): BiquadCoefficients {
  const quality = 0.5003270373238773;
  const frequency = 38.13547087602444;
  const k = Math.tan(Math.PI * frequency / sampleRate);
  const denominator = 1 + k / quality + k * k;

  return {
    b0: 1,
    b1: -2,
    b2: 1,
    a1: 2 * (k * k - 1) / denominator,
    a2: (1 - k / quality + k * k) / denominator,
  };
}

function filterSample(input: number, coefficients: BiquadCoefficients, state: BiquadState) {
  const output = coefficients.b0 * input
    + coefficients.b1 * state.x1
    + coefficients.b2 * state.x2
    - coefficients.a1 * state.y1
    - coefficients.a2 * state.y2;

  state.x2 = state.x1;
  state.x1 = input;
  state.y2 = state.y1;
  state.y1 = output;
  return output;
}

const energyToLufs = (energy: number) => energy > 0 ? -0.691 + 10 * Math.log10(energy) : silenceLufs;

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export async function measureIntegratedLufs(
  buffer: AudioBuffer,
  onProgress?: (progress: number) => void,
) {
  const blockSize = Math.max(1, Math.round(buffer.sampleRate * 0.4));
  const hopSize = Math.max(1, Math.round(blockSize * 0.25));
  const ring = new Float64Array(blockSize);
  const blockEnergies: number[] = [];
  const shelf = highShelfCoefficients(buffer.sampleRate);
  const highPass = highPassCoefficients(buffer.sampleRate);
  const channels = Array.from({ length: Math.min(buffer.numberOfChannels, 2) }, (_, index) => buffer.getChannelData(index));
  const states = channels.map(() => ({
    shelf: { x1: 0, x2: 0, y1: 0, y2: 0 },
    highPass: { x1: 0, x2: 0, y1: 0, y2: 0 },
  }));
  let windowEnergy = 0;

  for (let sampleIndex = 0; sampleIndex < buffer.length; sampleIndex += 1) {
    let combinedEnergy = 0;
    for (let channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
      const shelfOutput = filterSample(channels[channelIndex][sampleIndex], shelf, states[channelIndex].shelf);
      const weighted = filterSample(shelfOutput, highPass, states[channelIndex].highPass);
      combinedEnergy += weighted * weighted;
    }

    const ringIndex = sampleIndex % blockSize;
    windowEnergy += combinedEnergy - ring[ringIndex];
    ring[ringIndex] = combinedEnergy;

    if (sampleIndex + 1 >= blockSize && (sampleIndex + 1 - blockSize) % hopSize === 0) {
      blockEnergies.push(Math.max(0, windowEnergy / blockSize));
    }

    if (sampleIndex > 0 && sampleIndex % 1_000_000 === 0) {
      onProgress?.(sampleIndex / buffer.length);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
  }

  // Very short files have no complete 400 ms block; retain a useful reading.
  if (!blockEnergies.length && buffer.length) {
    blockEnergies.push(Math.max(0, windowEnergy / buffer.length));
  }

  const absoluteGated = blockEnergies.filter((energy) => energyToLufs(energy) >= -70);
  if (!absoluteGated.length) return silenceLufs;

  const relativeThreshold = energyToLufs(average(absoluteGated)) - 10;
  const relativeGated = absoluteGated.filter((energy) => energyToLufs(energy) >= relativeThreshold);
  onProgress?.(1);
  return energyToLufs(average(relativeGated));
}
