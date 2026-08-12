import { useEffect, useRef, useState } from 'react';

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

type Playback = { isPlaying: boolean; progress: number };

function WaveformStrip({
  label,
  peaks,
  accent,
  playback,
  onToggle,
  onSeek,
}: {
  label: string;
  peaks: Float32Array;
  accent: string;
  playback: Playback;
  onToggle: () => void;
  onSeek: (progress: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks.length) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const width = canvas.width;
    const height = canvas.height;
    const center = height / 2;
    const progress = Math.max(0, Math.min(1, playback.progress));

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

    if (progress > 0) {
      context.fillStyle = 'rgba(255,255,255,.13)';
      context.fillRect(0, 0, width * progress, height);
    }
    const cursor = Math.max(1, Math.min(width - 1, width * progress));
    context.strokeStyle = playback.isPlaying ? '#ffffff' : 'rgba(255,255,255,.55)';
    context.lineWidth = 1.5;
    context.beginPath(); context.moveTo(cursor, 0); context.lineTo(cursor, height); context.stroke();
  }, [peaks, accent, playback.isPlaying, playback.progress]);

  const seekFromPointer = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    onSeek((clientX - rect.left) / rect.width);
  };

  return (
    <div className="master-waveform-strip">
      <div className="master-waveform-strip-top">
        <span>{label}</span>
        <small>Haz clic en la onda para adelantar</small>
        <button type="button" onClick={onToggle} aria-label={playback.isPlaying ? `Pausar ${label}` : `Reproducir ${label}`}>
          {playback.isPlaying ? '❚❚ Pausar' : '▶ Escuchar'}
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width="720"
        height="82"
        aria-label={`Forma de onda interactiva de ${label}`}
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(playback.progress * 100)}
        onPointerDown={(event) => seekFromPointer(event.clientX)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); onSeek(playback.progress - .05); }
          if (event.key === 'ArrowRight') { event.preventDefault(); onSeek(playback.progress + .05); }
          if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); onToggle(); }
        }}
      />
    </div>
  );
}

export function MasteringWaveformComparison({
  originalPeaks,
  masterPeaks,
  originalPlayback,
  masterPlayback,
  onToggleOriginal,
  onToggleMaster,
  onSeekOriginal,
  onSeekMaster,
}: {
  originalPeaks: Float32Array;
  masterPeaks: Float32Array;
  originalPlayback: Playback;
  masterPlayback: Playback;
  onToggleOriginal: () => void;
  onToggleMaster: () => void;
  onSeekOriginal: (progress: number) => void;
  onSeekMaster: (progress: number) => void;
}) {
  return (
    <section className="master-waveform-comparison">
      <div className="master-waveform-heading">
        <div><span className="master-kicker">CAMBIO VISUAL</span><h2>Mezcla y master, lado a lado.</h2></div>
        <p>Reproduce cada onda, pausa o haz clic para saltar a cualquier momento. Solo sonará una versión a la vez.</p>
      </div>
      <WaveformStrip label="MEZCLA ORIGINAL" peaks={originalPeaks} accent="rgba(128, 167, 255, .92)" playback={originalPlayback} onToggle={onToggleOriginal} onSeek={onSeekOriginal} />
      <WaveformStrip label="MASTER GENERADO" peaks={masterPeaks} accent="rgba(232, 104, 205, .96)" playback={masterPlayback} onToggle={onToggleMaster} onSeek={onSeekMaster} />
    </section>
  );
}

let activeCompactAudio: HTMLAudioElement | null = null;

export function CompactWaveformComparison({
  originalPeaks,
  masterPeaks,
  originalSource,
  masterSource,
}: {
  originalPeaks: Float32Array;
  masterPeaks: Float32Array;
  originalSource: string;
  masterSource: string;
}) {
  const originalRef = useRef<HTMLAudioElement>(null);
  const masterRef = useRef<HTMLAudioElement>(null);
  const [originalPlayback, setOriginalPlayback] = useState<Playback>({ isPlaying: false, progress: 0 });
  const [masterPlayback, setMasterPlayback] = useState<Playback>({ isPlaying: false, progress: 0 });

  const playOnly = (element: HTMLAudioElement | null) => {
    if (!element) return;
    if (activeCompactAudio && activeCompactAudio !== element) activeCompactAudio.pause();
    activeCompactAudio = element;
    element.play().catch(() => {});
  };

  const toggle = (kind: 'original' | 'master') => {
    const target = kind === 'original' ? originalRef.current : masterRef.current;
    const other = kind === 'original' ? masterRef.current : originalRef.current;
    if (!target) return;
    other?.pause();
    if (target.paused) playOnly(target);
    else target.pause();
  };

  const seek = (kind: 'original' | 'master', progress: number) => {
    const target = kind === 'original' ? originalRef.current : masterRef.current;
    if (!target || !Number.isFinite(target.duration)) return;
    target.currentTime = Math.max(0, Math.min(1, progress)) * target.duration;
    const update = { isPlaying: !target.paused, progress: target.currentTime / target.duration };
    if (kind === 'original') setOriginalPlayback(update);
    else setMasterPlayback(update);
  };

  const bind = (kind: 'original' | 'master') => ({
    onPlay: () => {
      const other = kind === 'original' ? masterRef.current : originalRef.current;
      other?.pause();
      if (kind === 'original') setOriginalPlayback((current) => ({ ...current, isPlaying: true }));
      else setMasterPlayback((current) => ({ ...current, isPlaying: true }));
    },
    onPause: () => {
      if (kind === 'original') setOriginalPlayback((current) => ({ ...current, isPlaying: false }));
      else setMasterPlayback((current) => ({ ...current, isPlaying: false }));
    },
    onTimeUpdate: (event: React.SyntheticEvent<HTMLAudioElement>) => {
      const audio = event.currentTarget;
      const progress = audio.duration ? audio.currentTime / audio.duration : 0;
      if (kind === 'original') setOriginalPlayback((current) => ({ ...current, progress }));
      else setMasterPlayback((current) => ({ ...current, progress }));
    },
    onEnded: () => {
      if (kind === 'original') setOriginalPlayback((current) => ({ ...current, isPlaying: false, progress: 1 }));
      else setMasterPlayback((current) => ({ ...current, isPlaying: false, progress: 1 }));
    },
  });

  return (
    <div className="album-waveform-pair">
      <audio className="master-waveform-audio" ref={originalRef} src={originalSource} preload="metadata" {...bind('original')} />
      <audio className="master-waveform-audio" ref={masterRef} src={masterSource} preload="metadata" {...bind('master')} />
      <WaveformStrip label="ORIGINAL" peaks={originalPeaks} accent="rgba(128, 167, 255, .88)" playback={originalPlayback} onToggle={() => toggle('original')} onSeek={(progress) => seek('original', progress)} />
      <WaveformStrip label="MASTER" peaks={masterPeaks} accent="rgba(232, 104, 205, .92)" playback={masterPlayback} onToggle={() => toggle('master')} onSeek={(progress) => seek('master', progress)} />
    </div>
  );
}
