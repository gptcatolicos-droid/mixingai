import { useEffect, useRef } from 'react';

export function createWaveformPeaks(buffer: AudioBuffer, points = 720) {
  const peaks = new Float32Array(points);
  const samplesPerPoint = Math.max(1, Math.floor(buffer.length / points));
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));

  for (let point = 0; point < points; point += 1) {
    const start = point * samplesPerPoint;
    const end = Math.min(buffer.length, start + samplesPerPoint);
    let peak = 0;
    for (let sample = start; sample < end; sample += 1) {
      for (const channel of channels) peak = Math.max(peak, Math.abs(channel[sample]));
    }
    peaks[point] = peak;
  }
  return peaks;
}

function WaveformStrip({ label, peaks, accent }: { label: string; peaks: Float32Array; accent: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks.length) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const width = canvas.width;
    const height = canvas.height;
    const center = height / 2;
    context.clearRect(0, 0, width, height);
    context.fillStyle = 'rgba(255,255,255,.025)';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = 'rgba(255,255,255,.09)';
    context.beginPath(); context.moveTo(0, center); context.lineTo(width, center); context.stroke();
    context.fillStyle = accent;
    const step = width / peaks.length;
    for (let index = 0; index < peaks.length; index += 1) {
      const amplitude = Math.max(1, Math.min(center - 4, peaks[index] * (center - 4)));
      context.fillRect(index * step, center - amplitude, Math.max(1, step), amplitude * 2);
    }
  }, [peaks, accent]);

  return (
    <div className="master-waveform-strip">
      <div><span>{label}</span><small>Vista completa · misma escala temporal</small></div>
      <canvas ref={canvasRef} width="720" height="82" aria-label={`Forma de onda de ${label}`} />
    </div>
  );
}

export function MasteringWaveformComparison({
  originalPeaks,
  masterPeaks,
}: {
  originalPeaks: Float32Array;
  masterPeaks: Float32Array;
}) {
  return (
    <section className="master-waveform-comparison">
      <div className="master-waveform-heading">
        <div><span className="master-kicker">CAMBIO VISUAL</span><h2>Mezcla y master, lado a lado.</h2></div>
        <p>La forma de onda muestra energía y dinámica. Escucha la comparación A/B para decidir el resultado.</p>
      </div>
      <WaveformStrip label="MEZCLA ORIGINAL" peaks={originalPeaks} accent="rgba(128, 167, 255, .92)" />
      <WaveformStrip label="MASTER GENERADO" peaks={masterPeaks} accent="rgba(232, 104, 205, .96)" />
    </section>
  );
}

export function CompactWaveformComparison({
  originalPeaks,
  masterPeaks,
}: {
  originalPeaks: Float32Array;
  masterPeaks: Float32Array;
}) {
  return <div className="album-waveform-pair"><WaveformStrip label="ORIGINAL" peaks={originalPeaks} accent="rgba(128, 167, 255, .88)" /><WaveformStrip label="MASTER" peaks={masterPeaks} accent="rgba(232, 104, 205, .92)" /></div>;
}
