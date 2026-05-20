
export interface WaveformDrawOptions {
  canvas: HTMLCanvasElement;
  waveformPeaks: Float32Array;
  currentTime: number;
  duration: number;
  style?: 'soundcloud' | 'minimal';
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
  style = 'soundcloud',
  colors = {
    played: '#ff6b35',
    unplayed: '#e2e8f0',
    playhead: '#1e40af'
  }
}: WaveformDrawOptions): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  // Background - Apple style
  if (style === 'minimal') {
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = style === 'soundcloud' ? '#f8fafc' : '#1e293b';
    ctx.fillRect(0, 0, width, height);
  }

  // Progress background
  const progressX = (currentTime / duration) * width;
  if (style === 'minimal') {
    ctx.fillStyle = 'rgba(0, 122, 255, 0.08)';
    ctx.fillRect(0, 0, progressX, height);
  } else if (style === 'soundcloud') {
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.fillRect(0, 0, progressX, height);
  }

  // Ensure we have valid waveform data
  if (!waveformPeaks || waveformPeaks.length === 0) {
    // Generate mock waveform if no data
    const mockPeaks = new Float32Array(400);
    for (let i = 0; i < mockPeaks.length; i++) {
      mockPeaks[i] = Math.random() * 0.8 + 0.1;
    }
    drawWaveformBars(ctx, mockPeaks, width, height, currentTime, duration, style, colors);
  } else {
    drawWaveformBars(ctx, waveformPeaks, width, height, currentTime, duration, style, colors);
  }

  // Current position indicator (vertical line)
  ctx.strokeStyle = colors.playhead;
  ctx.lineWidth = style === 'minimal' ? 2 : 3;
  ctx.beginPath();
  ctx.moveTo(progressX, 0);
  ctx.lineTo(progressX, height);
  ctx.stroke();

  // Playhead circle
  ctx.fillStyle = colors.playhead;
  ctx.beginPath();
  ctx.arc(progressX, height / 2, style === 'minimal' ? 4 : 6, 0, 2 * Math.PI);
  ctx.fill();

  // White border for playhead
  if (style !== 'minimal') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Time indicators
  if (style === 'soundcloud' || style === 'minimal') {
    ctx.fillStyle = style === 'minimal' ? '#8e8e93' : '#64748b';
    ctx.font = style === 'minimal' ? '12px -apple-system, BlinkMacSystemFont, sans-serif' : '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('0:00', 8, height - 8);
    const durationText = `${Math.floor(duration / 60)}:${(duration % 60).toFixed(0).padStart(2, '0')}`;
    const textWidth = ctx.measureText(durationText).width;
    ctx.fillText(durationText, width - textWidth - 8, height - 8);
  }
}

function drawWaveformBars(
  ctx: CanvasRenderingContext2D,
  waveformPeaks: Float32Array,
  width: number,
  height: number,
  currentTime: number,
  duration: number,
  style: string,
  colors: { played: string; unplayed: string; playhead: string }
): void {
  // Waveform bars
  const barCount = Math.min(waveformPeaks.length, 400); // Límite para rendimiento
  const barWidth = Math.max(1.5, (width - barCount) / barCount);
  const barSpacing = width / barCount;

  for (let i = 0; i < barCount; i++) {
    const dataIndex = Math.floor((i / barCount) * waveformPeaks.length);
    const peak = waveformPeaks[dataIndex] || 0;
    const barHeight = Math.max(2, peak * height * 0.9); // Altura mínima de 2px
    const x = i * barSpacing;
    const y = (height - barHeight) / 2;

    // Color based on progress
    const isPast = (i / barCount) <= (currentTime / duration);
    
    if (style === 'minimal') {
      // Apple Music style colors
      ctx.fillStyle = isPast ? colors.played : colors.unplayed;
    } else if (style === 'soundcloud') {
      if (isPast) {
        // Gradiente naranja a azul para parte reproducida
        const progress = Math.min(1, (i / barCount) / Math.max(0.001, currentTime / duration));
        const hue = 20 + progress * 200; // De naranja (20) a azul (220)
        ctx.fillStyle = `hsl(${hue}, 85%, 55%)`;
      } else {
        ctx.fillStyle = colors.unplayed;
      }
    } else {
      ctx.fillStyle = isPast ? colors.played : colors.unplayed;
    }

    // Draw rounded bar
    if (style === 'minimal') {
      // Apple style - cleaner bars
      ctx.beginPath();
      ctx.roundRect(x + 0.5, y, barWidth - 1, barHeight, [1, 1, 1, 1]);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [1, 1, 1, 1]);
      ctx.fill();
    }

    // Add glow effect for active bars (not for minimal style)
    if (isPast && peak > 0.3 && style !== 'minimal') {
      ctx.shadowColor = style === 'soundcloud' ? 'rgba(59, 130, 246, 0.4)' : colors.played + '40';
      ctx.shadowBlur = 2;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

// Handle waveform click for seeking
export function handleWaveformClick(
  event: React.MouseEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement,
  duration: number,
  onSeek: (time: number) => void
): void {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const clickProgress = x / canvas.width;
  const newTime = clickProgress * duration;
  
  onSeek(newTime);
}
