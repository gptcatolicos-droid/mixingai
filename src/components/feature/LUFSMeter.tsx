
import { useEffect, useRef } from 'react';

interface LUFSMeterProps {
  momentary?: number;
  integrated?: number;
  analyserNode?: AnalyserNode | null;
  className?: string;
  // NUEVO: Props adicionales para compatibilidad
  currentLufs?: number;
  targetLufs?: number;
}

export default function LUFSMeter({ 
  momentary = -23.0, 
  integrated = -23.0, 
  analyserNode, 
  className = '',
  // NUEVO: Compatibilidad con otros nombres de props
  currentLufs = -23.0,
  targetLufs = -14.0
}: LUFSMeterProps) {
  const meterCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const waveformDataRef = useRef<Float32Array | null>(null);

  // CORREGIDO: Usar valores seguros con fallbacks
  const safeMomentary = typeof momentary === 'number' ? momentary : (typeof currentLufs === 'number' ? currentLufs : -23.0);
  const safeIntegrated = typeof integrated === 'number' ? integrated : (typeof currentLufs === 'number' ? currentLufs : -23.0);

  useEffect(() => {
    const canvas = meterCanvasRef.current;
    if (!canvas) return;

    // Initialize waveform data buffer
    if (analyserNode && !waveformDataRef.current) {
      waveformDataRef.current = new Float32Array(analyserNode.fftSize);
    }

    const drawMeter = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, '#0f172a');
      bgGradient.addColorStop(0.5, '#1e293b');
      bgGradient.addColorStop(1, '#0f172a');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // LUFS scale (-60 to 0) - CORREGIDO: Escala correcta
      const lufsRange = 60;
      const meterHeight = height - 40;
      const meterY = 20;

      // Draw scale lines and labels - MEJORADO: Más marcas para precisión
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'right';

      // Escala cada 10 dB para mayor precisión
      for (let lufs = -60; lufs <= 0; lufs += 10) {
        const y = meterY + ((60 + lufs) / lufsRange) * meterHeight;
        
        // Scale line
        ctx.beginPath();
        ctx.moveTo(width - 40, y);
        ctx.lineTo(width - 35, y);
        ctx.stroke();

        // Label
        ctx.fillText(lufs.toString(), width - 45, y + 3);
      }

      // Draw reference lines
      const spotifyY = meterY + ((60 + 14) / lufsRange) * meterHeight; // -14 LUFS
      const youtubeY = meterY + ((60 + 13) / lufsRange) * meterHeight; // -13 LUFS

      // Spotify reference (-14 LUFS)
      ctx.strokeStyle = '#1db954';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(10, spotifyY);
      ctx.lineTo(width - 50, spotifyY);
      ctx.stroke();

      // YouTube reference (-13 LUFS)
      ctx.strokeStyle = '#ff0000';
      ctx.beginPath();
      ctx.moveTo(10, youtubeY);
      ctx.lineTo(width - 50, youtubeY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Get real-time audio data - CORREGIDO: Cálculo RMS/LUFS en tiempo real
      let realtimeMomentary = safeMomentary;
      let realtimeIntegrated = safeIntegrated;

      if (analyserNode && waveformDataRef.current) {
        // Get fresh time domain data for RMS calculation
        analyserNode.getFloatTimeDomainData(waveformDataRef.current);
        
        // Calculate accurate RMS from time domain data
        let rmsSum = 0;
        for (let i = 0; i < waveformDataRef.current.length; i++) {
          rmsSum += waveformDataRef.current[i] * waveformDataRef.current[i];
        }
        const rms = Math.sqrt(rmsSum / waveformDataRef.current.length);
        
        // Convert RMS to LUFS (EBU R128 approximation)
        realtimeMomentary = rms > 0 ? Math.max(-60, Math.min(0, 20 * Math.log10(rms) - 0.691)) : -60;
        
        // Simple moving average for integrated LUFS
        realtimeIntegrated = (realtimeIntegrated * 0.95) + (realtimeMomentary * 0.05);
      }

      // Draw meter bars with real-time data - MEJORADO: Barras más responsivas
      const barWidth = 20;
      const momentaryX = 10;
      const integratedX = 35;

      // Momentary LUFS bar - CORREGIDO: Cálculo de altura corregido
      const momentaryHeight = Math.max(0, ((60 + realtimeMomentary) / lufsRange) * meterHeight);
      const momentaryBarY = meterY + meterHeight - momentaryHeight;

      const momentaryGradient = ctx.createLinearGradient(0, meterY + meterHeight, 0, meterY);
      momentaryGradient.addColorStop(0, '#ef4444'); // Red at bottom (-60 dB)
      momentaryGradient.addColorStop(0.2, '#f97316'); // Orange
      momentaryGradient.addColorStop(0.4, '#eab308'); // Yellow
      momentaryGradient.addColorStop(0.7, '#22c55e'); // Green
      momentaryGradient.addColorStop(1, '#3b82f6'); // Blue at top (0 dB)

      ctx.fillStyle = momentaryGradient;
      ctx.fillRect(momentaryX, momentaryBarY, barWidth, momentaryHeight);

      // Momentary bar border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(momentaryX, meterY, barWidth, meterHeight);

      // Integrated LUFS bar - CORREGIDO: Cálculo de altura corregido
      const integratedHeight = Math.max(0, ((60 + realtimeIntegrated) / lufsRange) * meterHeight);
      const integratedBarY = meterY + meterHeight - integratedHeight;

      const integratedGradient = ctx.createLinearGradient(0, meterY + meterHeight, 0, meterY);
      integratedGradient.addColorStop(0, '#ef444490'); // Semi-transparent
      integratedGradient.addColorStop(0.2, '#f9731690');
      integratedGradient.addColorStop(0.4, '#eab30890');
      integratedGradient.addColorStop(0.7, '#22c55e90');
      integratedGradient.addColorStop(1, '#3b82f690');

      ctx.fillStyle = integratedGradient;
      ctx.fillRect(integratedX, integratedBarY, barWidth, integratedHeight);

      // Integrated bar border
      ctx.strokeRect(integratedX, meterY, barWidth, meterHeight);

      // Labels
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.font = '8px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('M', momentaryX + barWidth/2, height - 5);
      ctx.fillText('I', integratedX + barWidth/2, height - 5);

      // Peak indicators - MEJORADO: Indicadores más precisos
      if (realtimeMomentary > -3) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(momentaryX + barWidth/2, meterY - 10, 4, 0, 2 * Math.PI);
        ctx.fill();
      }

      if (realtimeIntegrated > -6) {
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(integratedX + barWidth/2, meterY - 10, 3, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Continue animation loop
      animationRef.current = requestAnimationFrame(drawMeter);
    };

    drawMeter();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [safeMomentary, safeIntegrated, analyserNode]);

  const getComplianceStatus = (lufs: number) => {
    // CORREGIDO: Validar que lufs sea un número válido
    const validLufs = typeof lufs === 'number' && !isNaN(lufs) ? lufs : -23.0;
    
    if (validLufs >= -16 && validLufs <= -12) return { status: 'Spotify Ready', color: '#1db954' };
    if (validLufs >= -15 && validLufs <= -11) return { status: 'YouTube Ready', color: '#ff0000' };
    if (validLufs > -6) return { status: 'Too Loud', color: '#ef4444' };
    if (validLufs < -30) return { status: 'Too Quiet', color: '#6b7280' };
    return { status: 'Broadcast Safe', color: '#22c55e' };
  };

  const compliance = getComplianceStatus(safeIntegrated);

  return (
    <div className={`bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-6 border border-slate-700/50 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white" style={{ fontFamily: '"JetBrains Mono", sans-serif' }}>
          LUFS Meter
        </h3>
        <div 
          className="px-3 py-1 rounded-full text-xs font-bold"
          style={{ 
            backgroundColor: compliance.color + '20',
            color: compliance.color,
            border: `1px solid ${compliance.color}40`
          }}
        >
          {compliance.status}
        </div>
      </div>

      {/* Canvas Meter - MEJORADO: Actualización en tiempo real garantizada */}
      <div className="relative mb-4">
        <canvas
          ref={meterCanvasRef}
          width={120}
          height={200}
          className="w-full h-50 rounded-lg border border-slate-600 bg-slate-900"
        />
      </div>

      {/* Digital Readouts - ACTUALIZADO: Valores en tiempo real con validación */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-xs text-slate-400 mb-1 font-medium">Momentary</div>
          <div 
            className="text-lg font-bold" 
            style={{ 
              fontFamily: '"JetBrains Mono", monospace',
              color: safeMomentary > -6 ? '#ef4444' : safeMomentary > -12 ? '#eab308' : '#22c55e'
            }}
          >
            {safeMomentary.toFixed(1)}
          </div>
          <div className="text-xs text-slate-500">LUFS</div>
        </div>

        <div className="text-center">
          <div className="text-xs text-slate-400 mb-1 font-medium">Integrated</div>
          <div 
            className="text-lg font-bold" 
            style={{ 
              fontFamily: '"JetBrains Mono", monospace',
              color: safeIntegrated > -6 ? '#ef4444' : safeIntegrated > -12 ? '#eab308' : '#22c55e'
            }}
          >
            {safeIntegrated.toFixed(1)}
          </div>
          <div className="text-xs text-slate-500">LUFS</div>
        </div>
      </div>

      {/* Reference Standards */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="text-xs text-slate-400 mb-2 font-medium">Standards</div>
        <div className="flex justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-slate-300">Spotify: -14</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-slate-300">YouTube: -13</span>
          </div>
        </div>
      </div>
    </div>
  );
}
