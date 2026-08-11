/** Trigger a browser download reliably across Chrome, Edge, Firefox and Safari. */
export function downloadObjectUrl(url: string, fileName: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Create a temporary object URL and keep it alive long enough for large files. */
export function downloadBlob(blob: Blob, fileName: string) {
  if (!blob.size) throw new Error('El archivo generado está vacío. Vuelve a procesarlo.');
  const url = URL.createObjectURL(blob);
  downloadObjectUrl(url, fileName);
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

interface BrowserFileWriter {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort?(): Promise<void>;
}

interface BrowserSaveHandle {
  createWritable(): Promise<BrowserFileWriter>;
}

type SaveFilePicker = (options: {
  suggestedName: string;
  types: Array<{ description: string; accept: Record<string, string[]> }>;
}) => Promise<BrowserSaveHandle>;

/**
 * Save a generated file without creating another large in-memory copy.
 * Chromium writes each chunk directly to disk; other browsers retain the
 * object-URL fallback used for smaller downloads.
 */
export async function saveBlobToDisk(
  blob: Blob,
  fileName: string,
  mimeType: string,
  extension: string,
) {
  if (!blob.size) throw new Error('El archivo generado está vacío. Vuelve a procesarlo.');

  const saveFilePicker = (window as typeof window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  if (!saveFilePicker) {
    downloadBlob(blob, fileName);
    return true;
  }

  let writer: BrowserFileWriter | null = null;
  try {
    const handle = await saveFilePicker({
      suggestedName: fileName,
      types: [{ description: extension.toUpperCase().replace('.', ''), accept: { [mimeType]: [extension] } }],
    });
    writer = await handle.createWritable();

    const reader = blob.stream().getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      await writer.write(value);
    }
    await writer.close();
    return true;
  } catch (error) {
    await writer?.abort?.().catch(() => {});
    if (error instanceof DOMException && error.name === 'AbortError') return false;
    throw error;
  }
}
