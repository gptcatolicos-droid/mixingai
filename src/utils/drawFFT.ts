
export interface FFTDrawOptions {
  canvas: HTMLCanvasElement;
  fftData: Uint8Array;
  style?: 'professional' | 'colorful' | 'minimal' | 'applemusic';
}

export function drawFFTAnalyzer({
  canvas,
  fftData,
  style = 'professional'
}: FFTDrawOptions): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  // MEJORADO: Anti-aliasing para líneas más nítidas
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // NUEVO: Estilo Apple Music con fondo gris degradado suave
  if (style === 'applemusic') {
    // Fondo degradado gris suave estilo Apple Music
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#f3f4f6');
    bgGradient.addColorStop(0.3, '#e5e7eb');
    bgGradient.addColorStop(0.7, '#d1d5db');
    bgGradient.addColorStop(1, '#e5e7eb');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Grid lines sutiles estilo Apple
    ctx.strokeStyle = 'rgba(107, 114, 128, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([]);
    
    // Líneas horizontales
    for (let i = 1; i < 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Líneas verticales para frecuencias
    const freqPositions = [0.1, 0.25, 0.5, 0.75, 0.9];
    freqPositions.forEach(pos => {
      const x = width * pos;
      ctx.strokeStyle = 'rgba(107, 114, 128, 0.1)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    });
  } else {
    // Otros estilos existentes
    if (style === 'minimal') {
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, width, height);
    } else {
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      if (style === 'professional') {
        bgGradient.addColorStop(0, '#0f172a');
        bgGradient.addColorStop(0.5, '#1e293b');
        bgGradient.addColorStop(1, '#0f172a');
      } else {
        bgGradient.addColorStop(0, '#1a1a2e');
        bgGradient.addColorStop(0.5, '#16213e');
        bgGradient.addColorStop(1, '#0f3460');
      }
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Grid lines para otros estilos
    if (style !== 'minimal') {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([]);
      
      for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const freqMarkers = [60, 250, 1000, 4000, 16000];
      freqMarkers.forEach((freq, i) => {
        const x = (width / (freqMarkers.length - 1)) * i;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      });
    } else {
      ctx.strokeStyle = 'rgba(142, 142, 147, 0.1)';
      ctx.lineWidth = 0.5;
      for (let i = 1; i < 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
  }

  // MEJORADO: FFT bars más nítidas y definidas
  const barCount = style === 'applemusic' ? 100 : style === 'minimal' ? 80 : 80;
  const barWidth = width / barCount;
  const dataStep = Math.floor(fftData.length / barCount);

  // Smoothing buffer para transiciones más fluidas
  const smoothedData = new Float32Array(barCount);
  
  for (let i = 0; i < barCount; i++) {
    let sum = 0;
    let count = 0;
    
    for (let j = 0; j < dataStep; j++) {
      const index = i * dataStep + j;
      if (index < fftData.length) {
        sum += fftData[index];
        count++;
      }
    }
    
    const average = count > 0 ? sum / count : 0;
    smoothedData[i] = average;
    
    // Frequency weighting
    const freqWeight = Math.log10(1 + i / barCount * 9);
    smoothedData[i] *= freqWeight;
  }

  // NUEVO: Dibujar barras estilo Apple Music con degradado lila-fucsia
  for (let i = 0; i < barCount; i++) {
    const value = smoothedData[i];
    const barHeight = (value / 255) * height * 0.9;
    const x = i * barWidth;
    const y = height - barHeight;

    let barColor: string;
    
    if (style === 'applemusic') {
      // NUEVO: Degradado lila-fucsia estilo Apple Music
      const barGradient = ctx.createLinearGradient(0, height, 0, y);
      
      // Base del degradado - lila oscuro
      barGradient.addColorStop(0, '#8b5cf6'); // Violet-500
      barGradient.addColorStop(0.3, '#a855f7'); // Purple-500
      barGradient.addColorStop(0.6, '#c026d3'); // Fuchsia-600
      barGradient.addColorStop(0.8, '#d946ef'); // Fuchsia-500
      barGradient.addColorStop(1, '#ec4899'); // Pink-500

      ctx.fillStyle = barGradient;
      
      // Barra con bordes redondeados estilo Apple
      ctx.beginPath();
      ctx.roundRect(x + 1, y, Math.max(barWidth - 2, 1), barHeight, [2, 2, 0, 0]);
      ctx.fill();

      // Efecto glow sutil para barras activas
      if (value > 100) {
        ctx.shadowColor = '#d946ef';
        ctx.shadowBlur = Math.min(value / 50, 6);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Línea de contorno sutil
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.3)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

    } else if (style === 'minimal') {
      const intensity = value / 255;
      const baseBlue = '#007AFF';
      const alpha = 0.4 + intensity * 0.6;
      barColor = `rgba(0, 122, 255, ${alpha})`;
      
      ctx.fillStyle = barColor;
      ctx.beginPath();
      ctx.roundRect(x + 0.5, y, barWidth - 1, barHeight, [1, 1, 0, 0]);
      ctx.fill();
    } else if (style === 'colorful') {
      let hue: number, saturation = 90, lightness = 50;
      
      if (i < barCount * 0.15) {
        hue = 0 + (i / (barCount * 0.15)) * 25;
        saturation = 95;
      } else if (i < barCount * 0.35) {
        hue = 25 + ((i - barCount * 0.15) / (barCount * 0.2)) * 35;
        saturation = 90;
      } else if (i < barCount * 0.65) {
        hue = 60 + ((i - barCount * 0.35) / (barCount * 0.3)) * 60;
        saturation = 80;
      } else if (i < barCount * 0.85) {
        hue = 120 + ((i - barCount * 0.65) / (barCount * 0.2)) * 60;
        saturation = 85;
      } else {
        hue = 180 + ((i - barCount * 0.85) / (barCount * 0.15)) * 60;
        saturation = 90;
      }
      
      const intensity = value / 255;
      lightness = 35 + intensity * 55;
      barColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

      const barGradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
      const hue2 = 180 + (i / barCount) * 80;
      const baseLightness = 35 + intensity * 55;
      
      barGradient.addColorStop(0, `hsl(${hue2}, 90%, ${Math.max(baseLightness - 15, 20)}%)`);
      barGradient.addColorStop(0.6, `hsl(${hue2}, 95%, ${baseLightness}%)`);
      barGradient.addColorStop(1, `hsl(${hue2}, 100%, ${Math.min(baseLightness + 25, 85)}%)`);

      ctx.fillStyle = barGradient;
      ctx.beginPath();
      ctx.roundRect(x + 0.5, y, barWidth - 1, barHeight, [1, 1, 0, 0]);
      ctx.fill();

      if (value > 120) {
        ctx.shadowColor = barColor;
        ctx.shadowBlur = Math.min(value / 40, 8);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (value > 220) {
        const hue3 = 180 + (i / barCount) * 80;
        ctx.fillStyle = `hsl(${hue3}, 100%, 95%)`;
        ctx.beginPath();
        ctx.arc(x + barWidth/2, y + 3, 1, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    } else {
      // Professional style
      const hue = 180 + (i / barCount) * 60;
      const intensity = value / 255;
      const lightness = 35 + intensity * 55;
      barColor = `hsl(${hue}, 90%, ${lightness}%)`;

      const barGradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
      barGradient.addColorStop(0, barColor);
      barGradient.addColorStop(0.7, barColor + 'CC');
      barGradient.addColorStop(1, barColor + '66');

      ctx.fillStyle = barGradient;
      ctx.beginPath();
      ctx.roundRect(x + 0.5, y, barWidth - 1, barHeight, [1, 1, 0, 0]);
      ctx.fill();

      if (value > 120) {
        ctx.shadowColor = barColor;
        ctx.shadowBlur = Math.min(value / 40, 8);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  // MEJORADO: Frequency labels
  if (style === 'applemusic') {
    // Labels estilo Apple Music
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    const freqLabels = ['60Hz', '250Hz', '1kHz', '4kHz', '16kHz'];
    freqLabels.forEach((label, i) => {
      const x = (width / (freqLabels.length - 1)) * i;
      ctx.fillText(label, x, height - 6);
    });
  } else if (style !== 'minimal') {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    const freqMarkers = [60, 250, 1000, 4000, 16000];
    freqMarkers.forEach((freq, i) => {
      const x = (width / (freqMarkers.length - 1)) * i;
      const label = freq >= 1000 ? `${freq/1000}k` : `${freq}`;
      ctx.fillText(label, x, height - 4);
    });
  } else {
    ctx.fillStyle = '#8e8e93';
    ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    const freqMarkers = ['60Hz', '250Hz', '1kHz', '4kHz', '16kHz'];
    freqMarkers.forEach((label, i) => {
      const x = (width / (freqMarkers.length - 1)) * i;
      ctx.fillText(label, x, height - 3);
    });
  }
}

// Draw mini FFT for stems - MEJORADO: Mayor precisión
export function drawMiniFFT(
  canvas: HTMLCanvasElement,
  fftData: Uint8Array,
  color: string = '#3b82f6'
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  // MEJORADO: Anti-aliasing para mini FFT
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // NUEVO: Background degradado gris estilo Apple Music
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, '#f3f4f6');
  bgGradient.addColorStop(0.3, '#e5e7eb');
  bgGradient.addColorStop(0.7, '#d1d5db');
  bgGradient.addColorStop(1, '#e5e7eb');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // MEJORADO: FFT bars más definidas para mini versión
  const barCount = 20; // Aumentado para mayor definición
  const barWidth = width / barCount;
  const dataStep = Math.floor(fftData.length / barCount);

  for (let i = 0; i < barCount; i++) {
    let sum = 0;
    let count = 0;
    
    for (let j = 0; j < dataStep; j++) {
      const index = i * dataStep + j;
      if (index < fftData.length) {
        sum += fftData[index];
        count++;
      }
    }
    
    const average = count > 0 ? sum / count : 0;
    const barHeight = (average / 255) * height * 0.8;

    const x = i * barWidth;
    const y = height - barHeight;

    // NUEVO: Degradado lila-fucsia estilo Apple Music para mini FFT
    const barGradient = ctx.createLinearGradient(0, height, 0, y);
    
    // Base del degradado - lila oscuro
    barGradient.addColorStop(0, '#8b5cf6'); // Violet-500
    barGradient.addColorStop(0.3, '#a855f7'); // Purple-500
    barGradient.addColorStop(0.6, '#c026d3'); // Fuchsia-600
    barGradient.addColorStop(0.8, '#d946ef'); // Fuchsia-500
    barGradient.addColorStop(1, '#ec4899'); // Pink-500

    ctx.fillStyle = barGradient;
    
    // Barra con bordes redondeados estilo Apple
    ctx.beginPath();
    ctx.roundRect(x + 1, y, Math.max(barWidth - 2, 1), barHeight, [2, 2, 0, 0]);
    ctx.fill();

    // Efecto glow sutil para barras activas
    if (average > 80) {
      ctx.shadowColor = '#d946ef';
      ctx.shadowBlur = Math.min(average / 50, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Línea de contorno sutil
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}
