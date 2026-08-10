import { Zip, ZipPassThrough } from 'fflate';

export interface AlbumArchiveFile {
  blob: Blob;
  fileName: string;
}

export type AlbumArchiveChunkWriter = (chunk: Uint8Array) => Promise<void> | void;

function archiveFileName(fileName: string, index: number) {
  const safeName = fileName
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim() || `cancion-${index + 1}`;

  return `${String(index + 1).padStart(2, '0')} - ${safeName}`;
}

export function streamAlbumArchive(
  files: AlbumArchiveFile[],
  writeChunk: AlbumArchiveChunkWriter,
  onProgress?: (progress: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    if (!files.length) {
      reject(new Error('No hay masters listos para empaquetar.'));
      return;
    }

    const totalBytes = files.reduce((total, file) => total + file.blob.size, 0);
    let processedBytes = 0;
    let settled = false;
    let writeQueue = Promise.resolve();

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error instanceof Error ? error : new Error('No se pudo crear el archivo ZIP.'));
    };

    const zip = new Zip((error, chunk, final) => {
      if (error) {
        fail(error);
        return;
      }
      if (chunk.byteLength) {
        const stableChunk = chunk.slice();
        writeQueue = writeQueue.then(() => writeChunk(stableChunk));
      }
      if (final && !settled) {
        void writeQueue.then(() => {
          if (settled) return;
          settled = true;
          onProgress?.(100);
          resolve();
        }, fail);
      }
    });

    void (async () => {
      try {
        for (let index = 0; index < files.length; index += 1) {
          const file = files[index];
          const entry = new ZipPassThrough(archiveFileName(file.fileName, index));
          zip.add(entry);

          const reader = file.blob.stream().getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              entry.push(new Uint8Array(0), true);
              break;
            }
            processedBytes += value.byteLength;
            entry.push(value);
            onProgress?.(Math.min(99, Math.round((processedBytes / Math.max(totalBytes, 1)) * 99)));
          }
        }
        zip.end();
      } catch (error) {
        zip.terminate();
        fail(error);
      }
    })();
  });
}

export async function buildAlbumArchive(
  files: AlbumArchiveFile[],
  onProgress?: (progress: number) => void,
) {
  const chunks: Uint8Array[] = [];
  await streamAlbumArchive(files, (chunk) => { chunks.push(chunk); }, onProgress);
  return new Blob(chunks, { type: 'application/zip' });
}
