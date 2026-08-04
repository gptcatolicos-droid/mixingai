import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp3OutputFormat,
  Output,
  Quality,
  canEncodeAudio,
} from 'mediabunny';
import { registerMp3Encoder } from '@mediabunny/mp3-encoder';

let customEncoderRegistered = false;

export async function encodeMp3(
  source: Blob,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  if (!(await canEncodeAudio('mp3')) && !customEncoderRegistered) {
    registerMp3Encoder();
    customEncoderRegistered = true;
  }

  const input = new Input({
    source: new BlobSource(source),
    formats: ALL_FORMATS,
  });
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp3OutputFormat(),
    target,
  });
  const conversion = await Conversion.init({
    input,
    output,
    audio: {
      codec: 'mp3',
      quality: new Quality({ bitrate: 320_000, bitrateMode: 'constant' }),
      forceTranscode: true,
      numberOfChannels: 2,
    },
    video: { discard: true },
    showWarnings: false,
  });

  if (!conversion.isValid) {
    throw new Error('Este navegador no pudo preparar la exportación MP3. Prueba con Chrome, Edge o Safari actualizado.');
  }

  conversion.onProgress = (progress) => onProgress?.(progress);
  await conversion.execute();

  if (!target.buffer) {
    throw new Error('No se pudo finalizar el archivo MP3.');
  }

  return new Blob([target.buffer], { type: 'audio/mpeg' });
}
