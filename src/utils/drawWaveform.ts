import React from 'react';

export interface WaveformDrawOptions {
  canvas: HTMLCanvasElement;
  waveformPeaks: Float32Array;
  currentTime: number;
  duration: number;
  style?: 'soundcloud' | 'minimal' | 'dark';
  colors?: {
    played: string;
    unplayed: string;
    playhead: string;
  };
}

export function drawWaveform({
  canvas,
  waveformPeaks,
  currentTime,
  duration,
  style = 'dark',
  colors = {
    played: '#D946EF',
    unplayed: 'rgba(217,70,239,0.18)',
    playhead: '#D946EF'
  }
}: WaveformDrawOptions): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  // Background
  if (style === 'minimal') {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
  } else if (style === 'soundcloud') {
    // Fondo oscuro para el mixer de estudio
    ctx.fillStyle = 'rgba(8,4,16,0.0)';
    ctx.fillRect(0, 0, width, height);
  } else {
    // 'dark' — transparente, el fondo del card se ve a través
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, width, height);
  }

  const peaks = (!waveformPeaks || waveformPeaks.length === 0)
    ? (() => { const m = new Float32Array(400); for (let i=0;i<m.length;i++) m[i]=Math.random()*0.8+0.1; return m; })()
    : waveformPeaks;

  // Draw bars
  const barCount = Math.min(peaks.length, 400);
  const barSpacing = width / barCount;
  const barWidth = Math.max(1.5, barSpacing - 0.5);
  const progressX = duration > 0 ? (currentTime / duration) * width : 0;

  for (let i = 0; i < barCount; i++) {
    const dataIndex = Math.floor((i / barCount) * peaks.length);
    const peak = peaks[dataIndex] || 0;
    const barHeight = Math.max(2, peak * height * 0.88);
    const x = i * barSpacing;
    const y = (height - barHeight) / 2;
    const isPast = x < progressX;

    ctx.fillStyle = isPast ? colors.played : colors.unplayed;

    if (isPast && peak > 0.3) {
      ctx.shadowColor = colors.played + '50';
      ctx.shadowBlur = 3;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, [1]);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Playhead line
  if (progressX > 0) {
    ctx.strokeStyle = colors.playhead;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();

    // Playhead circle
    ctx.fillStyle = colors.playhead;
    ctx.beginPath();
    ctx.arc(progressX, height / 2, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Time labels
  if (duration > 0) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.fillText('0:00', 8, height - 6);
    const durationText = `${Math.floor(duration/60)}:${String(Math.floor(duration%60)).padStart(2,'0')}`;
    const tw = ctx.measureText(durationText).width;
    ctx.fillText(durationText, width - tw - 8, height - 6);
  }
}

export function handleWaveformClick(
  event: React.MouseEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
  duration: number,
  onSeek: (time: number) => void
): void {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  onSeek((x / rect.width) * duration);
}
