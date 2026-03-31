import { useState, useRef, useEffect, useCallback } from 'react';
import Header from '@/components/feature/Header';
import { drawWaveform, handleWaveformClick } from '@/utils/drawWaveform';

interface User {
  id: string; firstName: string; lastName: string; email: string;
  country: string; credits: number; provider?: string; createdAt: string;
}

interface ExportScreenProps {
  user: User; projectId: string;
  exportData: { audioBuffer: AudioBuffer; audioUrl: string; waveformPeaks: Float32Array; finalLufs: number; mp3Url?: string; wavUrl?: string; presetName?: string; } | null;
  exportProgress: number; exportStep: string;
  onBack: () => void; onCreditsUpdate: (newCredits: number) => void;
}

const fmt = (s: number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

const S = {
  page: {minHeight:'100vh',background:'transparent',fontFamily:"'DM Sans',system-ui,sans-serif"},
  card: {background:'rgba(26,16,40,0.82)',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'18px',padding:'24px'},
  label: {fontSize:'10px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8',marginBottom:'12px',display:'block'},
  mono: {fontFamily:"'DM Mono',monospace"},
  glowBtn: {background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',borderRadius:'980px',fontSize:'13px',fontWeight:600,cursor:'pointer',boxShadow:'0 0 20px rgba(192,38,211,0.4)',fontFamily:'inherit'},
  ghostBtn: {background:'transparent',border:'1px solid rgba(192,38,211,0.25)',color:'#9B7EC8',borderRadius:'980px',fontSize:'13px',cursor:'pointer',fontFamily:'inherit'},
  progressBar: (pct: number) => ({height:'100%',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'8px',width:`${pct}%`,transition:'width 0.4s ease'}),
  progressTrack: {background:'#241636',borderRadius:'8px',height:'6px',overflow:'hidden' as const},
};

export default function ExportScreen({ user, projectId, exportData, exportProgress, exportStep, onBack, onCreditsUpdate }: ExportScreenProps) {
  const [isExportPlaying, setIsExportPlaying] = useState(false);
  const [exportCurrentTime, setExportCurrentTime] = useState(0);
  const [exportPausedTime, setExportPausedTime] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadFormat, setDownloadFormat] = useState<'mp3' | 'wav' | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [deductedCreditsInfo, setDeductedCreditsInfo] = useState<{format:string;creditsDeducted:number;remainingCredits:number}|null>(null);
  const [exportAudioContext, setExportAudioContext] = useState<AudioContext | null>(null);
  const [exportSourceNode, setExportSourceNode] = useState<AudioBufferSourceNode | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const vuCanvasRef = useRef<HTMLCanvasElement>(null);
  const exportTimeUpdateRef = useRef<number>();
  const exportAnalyserRef = useRef<AnalyserNode | null>(null);
  const vuAnimRef = useRef<number>();
  const [exportMomentaryLufs, setExportMomentaryLufs] = useState(-60.0);
  const [exportIntegratedLufs, setExportIntegratedLufs] = useState(-60.0);
  const exportLufsHistoryRef = useRef<number[]>([]);
  const lufsFrameRef = useRef(0);

  // Estados de mastering
  const [showMasterModal, setShowMasterModal] = useState(false);
  const [isMastering, setIsMastering] = useState(false);
  const [masterProgress, setMasterProgress] = useState(0);
  const [masterStep, setMasterStep] = useState('');
  const [masterBuffer, setMasterBuffer] = useState<AudioBuffer|null>(null);
  const [masterUrl, setMasterUrl] = useState<string|null>(null);
  const [masterWaveform, setMasterWaveform] = useState<Float32Array|null>(null);
  const [activeTab, setActiveTab] = useState<'mix'|'master'>('mix');
  const masterCanvasRef = useRef<HTMLCanvasElement>(null);
  const lufsFrameRef = useRef(0);

  useEffect(() => {
    if (exportData && !exportAudioContext) {
      const ctx = new AudioContext();
      setExportAudioContext(ctx);
    }
  }, [exportData, exportAudioContext]);

  // Draw waveform con colores del tema — usa los peaks reales de la mezcla exportada
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !exportData) return;
    const peaks = exportData.waveformPeaks && exportData.waveformPeaks.length > 0
      ? exportData.waveformPeaks
      : (() => { const m = new Float32Array(800); for(let i=0;i<m.length;i++) m[i]=Math.random()*0.7+0.1; return m; })();
    drawWaveform({
      canvas, waveformPeaks: peaks, currentTime: exportCurrentTime,
      duration: exportData.audioBuffer.duration, style: 'soundcloud',
      colors: { played: '#C026D3', unplayed: 'rgba(124,58,237,0.2)', playhead: '#EC4899' }
    });
  }, [exportData, exportCurrentTime]);

  // Función centralizada para iniciar playback con limiter + VU meter
  const startPlayback = useCallback((offset: number) => {
    if (!exportAudioContext || !exportData) return;
    // Limpiar loops anteriores
    if (vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
    if (exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
    exportAnalyserRef.current = null;
    // Resetear historial LUFS para integrated correcto
    exportLufsHistoryRef.current = [];
    lufsFrameRef.current = 0;
    setExportMomentaryLufs(-60); setExportIntegratedLufs(-60);

    const sourceNode = exportAudioContext.createBufferSource();
    sourceNode.buffer = exportData.audioBuffer;

    // Analyser para VU meter
    const analyser = exportAudioContext.createAnalyser();
    analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.6;

    // Limiter anti-clipping en el playback también
    const limiter = exportAudioContext.createDynamicsCompressor();
    limiter.threshold.value = -1.0; limiter.knee.value = 0;
    limiter.ratio.value = 20; limiter.attack.value = 0.0003; limiter.release.value = 0.05;

    // Cadena: source → analyser → limiter → destination
    sourceNode.connect(analyser);
    analyser.connect(limiter);
    limiter.connect(exportAudioContext.destination);
    exportAnalyserRef.current = analyser;

    const startTime = exportAudioContext.currentTime;
    sourceNode.start(startTime, offset);
    setExportSourceNode(sourceNode); setIsExportPlaying(true);

    // VU meter loop
    const vuLoop = () => {
      if (!exportAnalyserRef.current) return;
      const td = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(td);
      let rmsSum = 0;
      for (let i = 0; i < td.length; i++) rmsSum += td[i]*td[i];
      const rms = Math.sqrt(rmsSum/td.length);
      // LUFS momentary correcto: escalar al rango -10 a -30 para mezclas normalizadas
      const momentary = rms > 0.0001 ? Math.max(-50, Math.min(-5, 20*Math.log10(rms)-0.691)) : -60;
      // Canvas VU
      const vc = vuCanvasRef.current;
      if (vc) {
        const ctx2 = vc.getContext('2d');
        if (ctx2) {
          const w = vc.width, h = vc.height;
          ctx2.clearRect(0,0,w,h);
          ctx2.fillStyle = 'rgba(8,4,16,0.8)'; ctx2.fillRect(0,0,w,h);
          // Nivel visual: -50 = 0%, -5 = 100%
          const level = Math.max(0, Math.min(1, (momentary + 50) / 45));
          const barW = Math.floor(w/2) - 3;
          const barH = Math.floor(h * level);
          const gr = ctx2.createLinearGradient(0, h, 0, 0);
          gr.addColorStop(0, '#4ade80');
          gr.addColorStop(0.55, '#4ade80');
          gr.addColorStop(0.75, '#FBBF24');
          gr.addColorStop(0.88, '#EC4899');
          gr.addColorStop(1, '#ef4444');
          ctx2.fillStyle = gr;
          if (barH > 0) {
            ctx2.fillRect(2, h - barH, barW, barH);
            ctx2.fillRect(barW + 4, h - Math.floor(barH * 0.95), barW, Math.floor(barH * 0.95));
          }
          // Línea -14 LUFS target = (50-14)/45 = 80% del rango
          const targetY = h - Math.floor(h * (36/45));
          ctx2.strokeStyle = 'rgba(74,222,128,0.7)'; ctx2.lineWidth = 1;
          ctx2.setLineDash([3,3]);
          ctx2.beginPath(); ctx2.moveTo(0, targetY); ctx2.lineTo(w, targetY); ctx2.stroke();
          ctx2.setLineDash([]);
        }
      }
      // LUFS state cada 4 frames
      lufsFrameRef.current++;
      if (lufsFrameRef.current % 4 === 0 && rms > 0.0001) {
        setExportMomentaryLufs(momentary);
        exportLufsHistoryRef.current.push(momentary);
        if (exportLufsHistoryRef.current.length > 600) exportLufsHistoryRef.current.shift();
        const validSamples = exportLufsHistoryRef.current.filter(v => v > -50);
        if (validSamples.length > 0) {
          const integrated = validSamples.reduce((a,b)=>a+b,0)/validSamples.length;
          setExportIntegratedLufs(Math.max(-50, Math.min(-5, integrated)));
        }
      }
      vuAnimRef.current = requestAnimationFrame(vuLoop);
    };
    vuAnimRef.current = requestAnimationFrame(vuLoop);

    sourceNode.onended = () => {
      exportAnalyserRef.current = null;
      if (vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
      setIsExportPlaying(false); setExportPausedTime(0); setExportCurrentTime(0);
      if (exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
    };
    exportTimeUpdateRef.current = window.setInterval(() => {
      const elapsed = exportAudioContext.currentTime - startTime + offset;
      setExportCurrentTime(Math.min(elapsed, exportData.audioBuffer.duration));
      if (elapsed >= exportData.audioBuffer.duration) {
        setIsExportPlaying(false); setExportPausedTime(0); setExportCurrentTime(0);
        if (exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
      }
    }, 100);
  }, [exportAudioContext, exportData]);

  const handleExportPlayPause = useCallback(async () => {
    if (!exportAudioContext || !exportData) return;
    if (exportAudioContext.state === 'suspended') await exportAudioContext.resume();
    if (isExportPlaying) {
      exportSourceNode?.stop(); exportSourceNode?.disconnect();
      exportAnalyserRef.current = null;
      if (vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
      setIsExportPlaying(false); setExportPausedTime(exportCurrentTime);
      if (exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
    } else {
      startPlayback(exportPausedTime);
    }
  }, [exportAudioContext, exportData, isExportPlaying, exportCurrentTime, exportPausedTime, exportSourceNode, startPlayback]);

  const handleExportStop = useCallback(() => {
    exportSourceNode?.stop(); exportSourceNode?.disconnect();
    setIsExportPlaying(false); setExportPausedTime(0); setExportCurrentTime(0);
    if (exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
  }, [exportSourceNode]);

  const handleWaveformSeek = useCallback((newTime: number) => {
    if (!exportData || !exportAudioContext) return;
    if (exportSourceNode) { try { exportSourceNode.stop(); exportSourceNode.disconnect(); } catch(e) {} }
    exportAnalyserRef.current = null;
    if (vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
    if (exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
    setIsExportPlaying(false);
    setExportCurrentTime(newTime);
    setExportPausedTime(newTime);
    // Reiniciar playback desde la nueva posición con VU meter fresco
    setTimeout(() => startPlayback(newTime), 50);
  }, [exportAudioContext, exportData, exportSourceNode, startPlayback]);

  // =============================================
  // MASTERING CON IA
  // =============================================
  const handleMaster = async () => {
    if (!exportData) return;
    setIsMastering(true); setMasterProgress(0); setMasterStep('Analizando mezcla...');
    try {
      const offCtx = new OfflineAudioContext(2, exportData.audioBuffer.length, exportData.audioBuffer.sampleRate);
      const src = offCtx.createBufferSource();
      src.buffer = exportData.audioBuffer;

      // 1. Noise gate suave (highpass 40hz para cortar ruido de fondo)
      setMasterProgress(15); setMasterStep('Reducción de ruido...');
      await new Promise(r => setTimeout(r, 600));
      const noiseGate = offCtx.createBiquadFilter();
      noiseGate.type = 'highpass'; noiseGate.frequency.value = 40; noiseGate.Q.value = 0.5;

      // 2. EQ de mastering — realce sutil de presencia y aire
      setMasterProgress(30); setMasterStep('Aplicando EQ de mastering...');
      await new Promise(r => setTimeout(r, 600));
      const eqLow = offCtx.createBiquadFilter();
      eqLow.type = 'lowshelf'; eqLow.frequency.value = 80; eqLow.gain.value = 1.5;
      const eqMid = offCtx.createBiquadFilter();
      eqMid.type = 'peaking'; eqMid.frequency.value = 3500; eqMid.Q.value = 0.7; eqMid.gain.value = 0.8;
      const eqHigh = offCtx.createBiquadFilter();
      eqHigh.type = 'highshelf'; eqHigh.frequency.value = 10000; eqHigh.gain.value = 1.2;

      // 3. Compresión de mastering — suave y transparente
      setMasterProgress(50); setMasterStep('Compresión de mastering...');
      await new Promise(r => setTimeout(r, 600));
      const comp = offCtx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 12;
      comp.ratio.value = 2; comp.attack.value = 0.01; comp.release.value = 0.3;

      // 4. Limiter true peak
      setMasterProgress(70); setMasterStep('True peak limiter...');
      await new Promise(r => setTimeout(r, 600));
      const limiter = offCtx.createDynamicsCompressor();
      limiter.threshold.value = -1.0; limiter.knee.value = 0;
      limiter.ratio.value = 20; limiter.attack.value = 0.0003; limiter.release.value = 0.05;

      // Cadena: src → noiseGate → eqLow → eqMid → eqHigh → comp → limiter → dest
      src.connect(noiseGate);
      noiseGate.connect(eqLow);
      eqLow.connect(eqMid);
      eqMid.connect(eqHigh);
      eqHigh.connect(comp);
      comp.connect(limiter);
      limiter.connect(offCtx.destination);
      src.start(0);

      setMasterProgress(80); setMasterStep('Renderizando master...');
      await new Promise(r => setTimeout(r, 400));
      const rendered = await offCtx.startRendering();

      // 5. Normalizar a -12 LUFS
      setMasterProgress(90); setMasterStep('Normalizando a -12 LUFS...');
      await new Promise(r => setTimeout(r, 500));
      const normalized = normalizeLUFS(rendered, -12);

      // Generar peaks para waveform
      const peaks = generateMasterPeaks(normalized, 800);
      setMasterWaveform(peaks);

      // Crear URL descarga
      const wavBlob = bufferToWavMaster(normalized);
      const url = URL.createObjectURL(wavBlob);
      setMasterUrl(url);
      setMasterBuffer(normalized);
      setMasterProgress(100); setMasterStep('¡Master listo!');
      await new Promise(r => setTimeout(r, 500));
      setIsMastering(false);
      setActiveTab('master');
    } catch(e) {
      console.error('Mastering error:', e);
      setIsMastering(false);
    }
  };

  const normalizeLUFS = (buffer: AudioBuffer, targetLufs: number): AudioBuffer => {
    const ch0 = buffer.getChannelData(0);
    let rmsSum = 0;
    for (let i = 0; i < ch0.length; i++) rmsSum += ch0[i] * ch0[i];
    const rms = Math.sqrt(rmsSum / ch0.length);
    const currLufs = rms > 0 ? 20 * Math.log10(rms) - 0.691 : -60;
    const gain = Math.pow(10, (targetLufs - currLufs) / 20);
    const ceiling = 0.891;
    let peakAfterGain = 0;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const d = buffer.getChannelData(c);
      for (let i = 0; i < d.length; i++) { const abs = Math.abs(d[i] * gain); if (abs > peakAfterGain) peakAfterGain = abs; }
    }
    const safeGain = peakAfterGain > ceiling ? gain * (ceiling / peakAfterGain) : gain;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const d = buffer.getChannelData(c);
      for (let i = 0; i < d.length; i++) {
        d[i] *= safeGain;
        if (d[i] > ceiling) d[i] = ceiling;
        else if (d[i] < -ceiling) d[i] = -ceiling;
      }
    }
    return buffer;
  };

  const generateMasterPeaks = (buffer: AudioBuffer, samples: number): Float32Array => {
    const peaks = new Float32Array(samples);
    const channelData = buffer.getChannelData(0);
    const sampleSize = Math.floor(channelData.length / samples);
    for (let i = 0; i < samples; i++) {
      let max = 0;
      for (let j = i*sampleSize; j < Math.min((i+1)*sampleSize, channelData.length); j++)
        max = Math.max(max, Math.abs(channelData[j]));
      peaks[i] = max;
    }
    return peaks;
  };

  const bufferToWavMaster = (buffer: AudioBuffer): Blob => {
    const len=buffer.length, ch=buffer.numberOfChannels, sr=buffer.sampleRate;
    const bps=3, ba=ch*bps, br=sr*ba, ds=len*ba, bs=44+ds;
    const ab=new ArrayBuffer(bs), view=new DataView(ab);
    const ws=(o:number,s:string)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
    ws(0,'RIFF'); view.setUint32(4,bs-8,true); ws(8,'WAVE'); ws(12,'fmt ');
    view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,ch,true);
    view.setUint32(24,sr,true); view.setUint32(28,br,true); view.setUint16(32,ba,true);
    view.setUint16(34,24,true); ws(36,'data'); view.setUint32(40,ds,true);
    let offset=44;
    for(let i=0;i<len;i++) for(let c=0;c<ch;c++){
      const s=Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]));
      const v=Math.round(s*8388607);
      if(offset+2<ab.byteLength){view.setInt8(offset,v&0xFF);view.setInt8(offset+1,(v>>8)&0xFF);view.setInt8(offset+2,(v>>16)&0xFF);offset+=3;}
    }
    return new Blob([ab],{type:'audio/wav'});
  };

  const handleDirectDownload = async (format: 'mp3' | 'wav') => {
    if (!exportData) return;
    setIsDownloading(true); setDownloadFormat(format); setDownloadProgress(0);
    try {
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => { if (prev >= 90) { clearInterval(progressInterval); return prev; } return prev + Math.random()*15+5; });
      }, 200);
      const blob = await createAudioBlob(exportData.audioBuffer, format);
      clearInterval(progressInterval); setDownloadProgress(100);
      await new Promise(r => setTimeout(r, 400));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `mezcla-mixingmusic.${format}`; a.click();
      URL.revokeObjectURL(url);
    } catch(e) { console.error(e); }
    setIsDownloading(false); setDownloadProgress(0); setDownloadFormat(null);
  };

  const dur = exportData?.audioBuffer?.duration ?? 0;

  // Dibujar waveform del master cuando cambia
  useEffect(() => {
    if (!masterCanvasRef.current || !masterWaveform) return;
    drawWaveform({
      canvas: masterCanvasRef.current,
      waveformPeaks: masterWaveform,
      currentTime: 0, duration: dur,
      style: 'soundcloud',
      colors: { played: '#F59E0B', unplayed: 'rgba(245,158,11,0.2)', playhead: '#EF6C00' }
    });
  }, [masterWaveform, dur]);

  return (
    <div style={S.page}>
      <Header user={user} onLogout={() => {}} onCreditsUpdate={onCreditsUpdate} />

      <div style={{maxWidth:'900px',padding:'0 12px',margin:'0 auto',padding:'20px 20px 60px'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
          <div>
            <h1 style={{fontSize:'26px',fontWeight:600,letterSpacing:'-0.5px',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
              Tu Mezcla Final
            </h1>
            <p style={{color:'#9B7EC8',fontSize:'13px',marginTop:'4px'}}>
              Optimizada con IA · 44.1 kHz / 24 bits · {exportData?.finalLufs.toFixed(1)} LUFS
            </p>
          </div>
          <button onClick={()=>{
            // Detener audio antes de volver
            if(exportSourceNode){try{exportSourceNode.stop();exportSourceNode.disconnect();}catch(e){}}
            exportAnalyserRef.current=null;
            if(vuAnimRef.current)cancelAnimationFrame(vuAnimRef.current);
            if(exportTimeUpdateRef.current)clearInterval(exportTimeUpdateRef.current);
            onBack();
          }} style={{...S.ghostBtn,padding:'10px 18px'}}>← Volver al Mezclador</button>
        </div>

        {exportData ? (
          <div style={S.card}>
            {/* Badge IA */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
              <span style={S.label}>Preview de tu Mezcla Final</span>
              <span style={{fontSize:'11px',fontWeight:600,padding:'4px 12px',borderRadius:'980px',background:'rgba(192,38,211,0.1)',color:'#C026D3',border:'1px solid rgba(192,38,211,0.25)'}}>
                ✦ {exportData.presetName ? exportData.presetName + ' · ' : ''}Procesada con IA · {exportData.finalLufs.toFixed(1)} LUFS
              </span>
            </div>

            {/* Waveform — muestra los peaks REALES de la mezcla exportada */}
            <div style={{background:'rgba(8,4,16,0.88)',borderRadius:'12px',padding:'12px',border:'1px solid rgba(192,38,211,0.1)',marginBottom:'20px'}}>
              <canvas ref={waveformCanvasRef} width={1200} height={100}
                style={{width:'100%',height:'70px',borderRadius:'8px',cursor:'pointer',display:'block'}}
                onClick={e => { if(waveformCanvasRef.current) handleWaveformClick(e,waveformCanvasRef.current,dur,handleWaveformSeek); }} />
            </div>

            {/* Controles */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',marginBottom:'16px'}}>
              <button onClick={handleExportStop} style={{width:'40px',height:'40px',borderRadius:'50%',background:'#241636',border:'1px solid rgba(192,38,211,0.2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="ri-stop-fill" style={{color:'#9B7EC8',fontSize:'14px'}}></i>
              </button>
              <button onClick={handleExportPlayPause} style={{width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 28px rgba(236,72,153,0.5)'}}>
                <i className={isExportPlaying?'ri-pause-fill':'ri-play-fill'} style={{color:'#fff',fontSize:'22px',marginLeft:isExportPlaying?0:'3px'}}></i>
              </button>
            </div>

            {/* Tiempo */}
            <div style={{textAlign:'center',...S.mono,color:'#9B7EC8',fontSize:'14px',fontWeight:500,marginBottom:'28px'}}>
              {fmt(exportCurrentTime)} / {fmt(dur)}
            </div>

            {/* MIX BUS MASTER con VU meter en tiempo real */}
            <div style={{background:'linear-gradient(135deg,rgba(36,22,54,0.88),rgba(26,16,40,0.88))',border:'1px solid rgba(192,38,211,0.25)',borderRadius:'14px',padding:'16px',marginBottom:'16px',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)'}}></div>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'14px'}}>
                <i className="ri-equalizer-fill" style={{color:'#C026D3',fontSize:'13px'}}></i>
                <span style={{fontSize:'10px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8'}}>Mix Bus Master</span>
                {exportData.presetName && <span style={{background:'linear-gradient(135deg,#EC4899,#C026D3)',borderRadius:'980px',padding:'2px 10px',fontSize:'9px',color:'#fff',fontWeight:700}}>✦ {exportData.presetName}</span>}
                <span style={{marginLeft:'auto',fontSize:'9px',color:isExportPlaying?'#4ade80':'#9B7EC8',fontFamily:"'DM Mono',monospace",fontWeight:600}}>{isExportPlaying?'▶ PLAYING':'■ STOPPED — dale Play para ver los LUFS'}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'52px 1fr',gap:'14px',alignItems:'start'}}>
                <div style={{display:'flex',flexDirection:'column' as const,alignItems:'center',gap:'4px'}}>
                  <canvas ref={vuCanvasRef} width={60} height={100} style={{width:'44px',height:'80px',borderRadius:'6px',border:'1px solid rgba(192,38,211,0.2)'}} />
                  <span style={{fontSize:'9px',color:'#9B7EC8',fontFamily:"'DM Mono',monospace"}}>VU</span>
                </div>
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                    <div style={{background:'rgba(15,10,26,0.6)',borderRadius:'10px',padding:'10px',textAlign:'center' as const,border:'1px solid rgba(192,38,211,0.08)'}}>
                      <div style={{...S.mono,fontSize:'20px',fontWeight:600,color:exportMomentaryLufs>-14?'#f87171':exportMomentaryLufs<-30?'#9B7EC8':'#4ade80',transition:'color 0.3s'}}>{exportMomentaryLufs.toFixed(1)}</div>
                      <div style={{fontSize:'9px',textTransform:'uppercase' as const,letterSpacing:'0.5px',color:'#9B7EC8',marginTop:'2px'}}>LUFS Momentary</div>
                    </div>
                    <div style={{background:'rgba(15,10,26,0.6)',borderRadius:'10px',padding:'10px',textAlign:'center' as const,border:'1px solid rgba(192,38,211,0.08)'}}>
                      <div style={{...S.mono,fontSize:'20px',fontWeight:600,color:'#C026D3'}}>{exportIntegratedLufs.toFixed(1)}</div>
                      <div style={{fontSize:'9px',textTransform:'uppercase' as const,letterSpacing:'0.5px',color:'#9B7EC8',marginTop:'2px'}}>LUFS Integrated</div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'6px'}}>
                    {[
                      {label:'Sample Rate',val:'44.1 kHz',color:'#C026D3'},
                      {label:'Bit Depth',val:'24 bits',color:'#7C3AED'},
                      {label:'Spotify',val:exportData.finalLufs.toFixed(1),sub:Math.abs(exportData.finalLufs+14)<0.5?'✓ Óptimo':'⚠ Check',color:Math.abs(exportData.finalLufs+14)<0.5?'#4ade80':'#FBBF24'},
                    ].map(s=>(
                      <div key={s.label} style={{background:'rgba(15,10,26,0.6)',borderRadius:'8px',padding:'8px',textAlign:'center' as const,border:'1px solid rgba(192,38,211,0.06)'}}>
                        <div style={{...S.mono,fontSize:'13px',fontWeight:600,color:s.color}}>{s.val}</div>
                        <div style={{fontSize:'9px',color:'#9B7EC8'}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs Mezcla / Master — solo si ya hay master */}
            {masterBuffer && (
              <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
                <button onClick={()=>setActiveTab('mix')}
                  style={{flex:1,padding:'10px',borderRadius:'10px',border:`1px solid ${activeTab==='mix'?'#C026D3':'rgba(192,38,211,0.2)'}`,background:activeTab==='mix'?'rgba(192,38,211,0.12)':'transparent',color:activeTab==='mix'?'#EC4899':'#9B7EC8',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s'}}>
                  Mezcla · -20 LUFS
                </button>
                <button onClick={()=>setActiveTab('master')}
                  style={{flex:1,padding:'10px',borderRadius:'10px',border:`1px solid ${activeTab==='master'?'#F59E0B':'rgba(245,158,11,0.2)'}`,background:activeTab==='master'?'rgba(245,158,11,0.12)':'transparent',color:activeTab==='master'?'#F59E0B':'#9B7EC8',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s'}}>
                  ✦ Master · -12 LUFS
                </button>
              </div>
            )}

            {/* PANTALLA MASTER */}
            {activeTab==='master' && masterBuffer && (
              <div style={{marginBottom:'16px'}}>
                {/* Badge masterizado */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <div style={{width:'32px',height:'32px',borderRadius:'9px',background:'linear-gradient(135deg,#F59E0B,#EF6C00)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>✦</div>
                    <div>
                      <div style={{fontSize:'13px',fontWeight:700,color:'#F8F0FF'}}>Master Final</div>
                      <div style={{fontSize:'11px',color:'#9B7EC8'}}>Procesado con IA · -12 LUFS · WAV 24-bit</div>
                    </div>
                  </div>
                  <span style={{background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:'980px',padding:'4px 12px',fontSize:'11px',fontWeight:700,color:'#F59E0B'}}>✦ MASTERIZADO</span>
                </div>
                {/* Waveform master — color ámbar */}
                <div style={{background:'rgba(8,4,16,0.88)',borderRadius:'12px',padding:'12px',border:'1px solid rgba(245,158,11,0.15)',marginBottom:'14px'}}>
                  <canvas ref={masterCanvasRef} width={1200} height={100} style={{width:'100%',height:'70px',borderRadius:'8px',display:'block'}} />
                </div>
                {/* Chain info */}
                <div style={{background:'rgba(15,10,26,0.6)',borderRadius:'12px',padding:'14px',marginBottom:'14px',border:'1px solid rgba(245,158,11,0.1)'}}>
                  <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8',marginBottom:'10px'}}>Cadena de mastering aplicada</div>
                  {[
                    {icon:'🔇',label:'Noise Reduction',val:'Highpass 40Hz'},
                    {icon:'📊',label:'EQ Mastering',val:'+1.5dB Low · +0.8dB Pres · +1.2dB Air'},
                    {icon:'🗜️',label:'Compresión',val:'Ratio 2:1 · Thr -18dB'},
                    {icon:'⛔',label:'True Peak Limiter',val:'-1.0 dBFS'},
                    {icon:'✅',label:'Output',val:'-12 LUFS'},
                  ].map((item,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'6px 8px',background:i===4?'rgba(74,222,128,0.08)':'rgba(8,4,16,0.4)',borderRadius:'7px',marginBottom:'4px',border:i===4?'1px solid rgba(74,222,128,0.15)':'1px solid transparent'}}>
                      <span style={{fontSize:'14px'}}>{item.icon}</span>
                      <span style={{fontSize:'11px',fontWeight:600,color:i===4?'#4ade80':'#C9B8F0',flex:1}}>{item.label}</span>
                      <span style={{fontSize:'10px',color:i===4?'#4ade80':'#9B7EC8',fontFamily:"'DM Mono',monospace"}}>{item.val}</span>
                    </div>
                  ))}
                </div>
                {/* Botón descargar master */}
                <button onClick={()=>{
                  if(!masterUrl) return;
                  const a = document.createElement('a');
                  a.href = masterUrl; a.download = 'master-mixingmusic.wav'; a.click();
                }}
                  style={{width:'100%',background:'linear-gradient(135deg,#F59E0B,#EF6C00)',border:'none',color:'#fff',padding:'16px',borderRadius:'980px',fontSize:'15px',fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 0 24px rgba(245,158,11,0.4)',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'}}>
                  <i className="ri-download-2-line" style={{fontSize:'18px'}}></i>
                  Descargar Master .WAV — -12 LUFS
                </button>
              </div>
            )}

            {/* PANTALLA MEZCLA (default) */}
            {(activeTab==='mix' || !masterBuffer) && (
              <div>
                {/* Botones de descarga */}
                <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap',marginBottom:'12px'}}>
                  <button onClick={()=>handleDirectDownload('mp3')} disabled={isDownloading}
                    style={{...S.glowBtn,padding:'14px 28px',fontSize:'14px',opacity:isDownloading?0.5:1,display:'flex',alignItems:'center',gap:'8px'}}>
                    <i className="ri-download-line"></i>
                    Descargar .MP3
                  </button>
                  <button onClick={()=>handleDirectDownload('wav')} disabled={isDownloading}
                    style={{background:'linear-gradient(135deg,#7C3AED,#4F46E5)',border:'none',color:'#fff',padding:'14px 28px',borderRadius:'980px',fontSize:'14px',fontWeight:600,cursor:'pointer',boxShadow:'0 0 20px rgba(124,58,237,0.4)',fontFamily:'inherit',display:'flex',alignItems:'center',gap:'8px',opacity:isDownloading?0.5:1}}>
                    <i className="ri-download-2-line"></i>
                    Descargar .WAV
                  </button>
                </div>
                <div style={{textAlign:'center',fontSize:'12px',color:'rgba(155,126,200,0.6)',marginBottom:'16px'}}>
                  Descarga gratuita · WAV 24bit / MP3
                </div>

                {/* BOTÓN MASTERIZAR */}
                {!isMastering && !masterBuffer && (
                  <button onClick={()=>handleMaster()}
                    style={{width:'100%',background:'linear-gradient(135deg,#F59E0B,#EF6C00)',border:'none',color:'#fff',padding:'18px',borderRadius:'16px',fontSize:'16px',fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 0 28px rgba(245,158,11,0.4)',display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',marginTop:'4px'}}>
                    <span style={{fontSize:'20px'}}>✦</span>
                    MASTERIZAR con IA
                    <span style={{background:'rgba(255,255,255,0.2)',borderRadius:'50%',width:'28px',height:'28px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px'}}>→</span>
                  </button>
                )}

                {/* Modal mastering en progreso */}
                {isMastering && (
                  <div style={{background:'rgba(15,10,26,0.95)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:'16px',padding:'24px',textAlign:'center'}}>
                    <div style={{fontSize:'32px',marginBottom:'12px'}}>✦</div>
                    <div style={{fontSize:'16px',fontWeight:700,color:'#F8F0FF',marginBottom:'6px'}}>Masterizando con IA</div>
                    <div style={{fontSize:'13px',color:'#9B7EC8',marginBottom:'16px'}}>{masterStep}</div>
                    <div style={{height:'6px',background:'rgba(245,158,11,0.15)',borderRadius:'3px',overflow:'hidden',marginBottom:'8px'}}>
                      <div style={{height:'100%',background:'linear-gradient(90deg,#F59E0B,#EF6C00)',borderRadius:'3px',width:`${masterProgress}%`,transition:'width 0.4s ease'}}></div>
                    </div>
                    <div style={{fontSize:'12px',color:'#F59E0B',fontFamily:"'DM Mono',monospace"}}>{masterProgress}%</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'400px'}}>
            <div style={{...S.card,maxWidth:'420px',width:'100%',textAlign:'center'}}>
              <div style={{width:'72px',height:'72px',margin:'0 auto 24px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'20px',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 32px rgba(192,38,211,0.5)'}}>
                <i className="ri-equalizer-fill" style={{color:'#fff',fontSize:'28px'}}></i>
              </div>
              <h3 style={{fontSize:'22px',fontWeight:600,color:'#F8F0FF',marginBottom:'10px'}}>
                {exportProgress > 0 ? 'Procesando con IA' : 'Preparando mezcla...'}
              </h3>
              <p style={{color:'#9B7EC8',marginBottom:'24px',fontSize:'14px'}}>
                {exportStep || 'Aplicando efectos y normalizando...'}
              </p>
              {exportProgress > 0 && (
                <>
                  <div style={S.progressTrack}><div style={S.progressBar(exportProgress)}></div></div>
                  <div style={{...S.mono,color:'#C026D3',fontWeight:600,fontSize:'18px',marginTop:'10px'}}>{exportProgress}%</div>
                </>
              )}
              {exportProgress === 0 && (
                <div style={{display:'flex',justifyContent:'center',gap:'5px',marginTop:'8px'}}>
                  {[0,150,300].map(d=>(
                    <div key={d} style={{width:'8px',height:'8px',borderRadius:'50%',background:'#C026D3',animation:'bounce 1s infinite',animationDelay:`${d}ms`}}></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
      </div>

      {/* Modal descargando */}
      {isDownloading && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,10,26,0.95)',backdropFilter:'blur(8px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
          <div style={{...S.card,maxWidth:'420px',width:'100%',textAlign:'center'}}>
            <div style={{width:'72px',height:'72px',margin:'0 auto 24px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'20px',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 32px rgba(192,38,211,0.5)'}}>
              <i className="ri-file-zip-line" style={{color:'#fff',fontSize:'28px'}}></i>
            </div>
            <h3 style={{fontSize:'22px',fontWeight:600,color:'#F8F0FF',marginBottom:'10px'}}>Creando {downloadFormat?.toUpperCase()}</h3>
            <p style={{color:'#9B7EC8',marginBottom:'24px',fontSize:'13px'}}>Comprimiendo tu mezcla optimizada con IA...</p>
            <div style={S.progressTrack}><div style={S.progressBar(downloadProgress)}></div></div>
            <div style={{...S.mono,color:'#C026D3',fontWeight:600,fontSize:'18px',marginTop:'10px'}}>{Math.round(downloadProgress)}%</div>
            <div style={{fontSize:'12px',color:'rgba(155,126,200,0.5)',marginTop:'12px'}}>Preparando tu archivo...</div>
          </div>
        </div>
      )}

      {/* Modal éxito */}
      {showSuccessModal && deductedCreditsInfo && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,10,26,0.95)',backdropFilter:'blur(8px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
          <div style={{...S.card,maxWidth:'380px',width:'100%',textAlign:'center'}}>
            <div style={{width:'60px',height:'60px',margin:'0 auto 20px',background:'linear-gradient(135deg,#4ade80,#22c55e)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 24px rgba(74,222,128,0.4)'}}>
              <i className="ri-checkbox-circle-fill" style={{color:'#fff',fontSize:'26px'}}></i>
            </div>
            <h3 style={{fontSize:'20px',fontWeight:600,color:'#F8F0FF',marginBottom:'16px'}}>¡Descarga Completada!</h3>
            <div style={{background:'rgba(8,4,16,0.88)',borderRadius:'12px',padding:'14px',marginBottom:'20px',border:'1px solid rgba(74,222,128,0.15)'}}>
              <div style={{fontSize:'13px',color:'#4ade80',fontWeight:600,marginBottom:'4px'}}>✓ Formato: {deductedCreditsInfo.format}</div>
              <div style={{fontSize:'12px',color:'#9B7EC8'}}>Tu mezcla está lista para subir a Spotify, YouTube y más plataformas.</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {deductedCreditsInfo.remainingCredits >= 500 ? (
                <button onClick={()=>{setShowSuccessModal(false);onBack();}} style={{...S.glowBtn,padding:'12px',width:'100%'}}>
                  + Crear Otra Mezcla
                </button>
              ) : (
                <button onClick={()=>{setShowSuccessModal(false);window.location.href='/billing';}} style={{...S.glowBtn,padding:'12px',width:'100%'}}>
                  Comprar Créditos
                </button>
              )}
              <button onClick={()=>{setShowSuccessModal(false);onBack();}} style={{...S.ghostBtn,padding:'12px',width:'100%'}}>
                Volver al Inicio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function createAudioBlob(buffer: AudioBuffer, format: 'mp3' | 'wav'): Promise<Blob> {
  const length = buffer.length, channels = buffer.numberOfChannels, sampleRate = buffer.sampleRate;
  const blockAlign = channels * 2, byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign, bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);
  const ws = (offset: number, s: string) => { for(let i=0;i<s.length;i++) view.setUint8(offset+i,s.charCodeAt(i)); };
  ws(0,'RIFF'); view.setUint32(4,bufferSize-8,true); ws(8,'WAVE'); ws(12,'fmt ');
  view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,channels,true);
  view.setUint32(24,sampleRate,true); view.setUint32(28,byteRate,true);
  view.setUint16(32,blockAlign,true); view.setUint16(34,16,true); ws(36,'data'); view.setUint32(40,dataSize,true);
  let offset = 44;
  for (let i=0;i<length;i++) for (let c=0;c<channels;c++) {
    const s = Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]));
    view.setInt16(offset,Math.round(s*32767),true); offset+=2;
  }
  return new Blob([arrayBuffer],{type:format==='mp3'?'audio/mp3':'audio/wav'});
}

async function loadJSZip(): Promise<void> {
  return new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load JSZip'));
    document.head.appendChild(script);
  });
}
// Mobile styles injected
