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
