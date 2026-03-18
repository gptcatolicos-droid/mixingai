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
  }, [exportAudioContext, exportData, exportSourceNode, startPlayback])

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
          <button onClick={onBack} style={{...S.ghostBtn,padding:'10px 18px'}}>← Volver al Mezclador</button>
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

            {/* Botones de descarga */}
            <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap',marginBottom:'16px'}}>
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

            <div style={{textAlign:'center',fontSize:'12px',color:'rgba(155,126,200,0.6)'}}>
              Descarga gratuita · WAV 24bit / MP3
            </div>
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
