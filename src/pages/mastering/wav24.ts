const writeText = (view: DataView, offset: number, value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
};

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

/** Encode an AudioBuffer as genuine interleaved 24-bit PCM WAV. */
export function encodeWav24(audio: AudioBuffer, applyDither = false): Blob {
  const channels = audio.numberOfChannels;
  const bytesPerSample = 3;
  const blockAlign = channels * bytesPerSample;
  const dataLength = audio.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  writeText(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeText(view, 8, 'WAVE');
  writeText(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM integer
  view.setUint16(22, channels, true);
  view.setUint32(24, audio.sampleRate, true);
  view.setUint32(28, audio.sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 24, true);
  writeText(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  const channelData = Array.from({ length: channels }, (_, index) => audio.getChannelData(index));
  const scale = 0x7fffff;
  const ditherScale = 1 / scale;
  let offset = 44;

  for (let sampleIndex = 0; sampleIndex < audio.length; sampleIndex += 1) {
    for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
      const dither = applyDither ? (Math.random() - Math.random()) * ditherScale : 0;
      let sample = Math.round(clamp(channelData[channelIndex][sampleIndex] + dither) * scale);
      if (sample < 0) sample += 0x1000000;
      view.setUint8(offset, sample & 0xff);
      view.setUint8(offset + 1, (sample >> 8) & 0xff);
      view.setUint8(offset + 2, (sample >> 16) & 0xff);
      offset += 3;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
