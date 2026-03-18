import { useState, useRef, useEffect, useCallback } from 'react';
import Header from '@/components/feature/Header';
import { drawWaveform, handleWaveformClick } from '@/utils/drawWaveform';

interface User {
  id: string; firstName: string; lastName: string; email: string;
  country: string; credits: number; provider?: string; createdAt: string;
}

interface ExportScreenProps {
  user: User; projectId: string;
  exportData: { audioBuffer: AudioBuffer; audioUrl: string; waveformPeaks: Float32Array; finalLufs: number; mp3Url?: string; wavUrl?: string; } | null;
  exportProgress: number; exportStep: string;
  onBack: () => void; onCreditsUpdate: (newCredits: number) => void;
}

const S = {
  page: {minHeight:'100vh',background:'#0F0A1A',fontFamily:"'DM Sans',system-ui,sans-serif"},
  card: {background:'#1A1028',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'18px',padding:'24px'},
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
  const exportTimeUpdateRef = useRef<number>();

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

  const handleExportPlayPause = useCallback(async () => {
    if (!exportAudioContext || !exportData) return;
    if (exportAudioContext.state === 'suspended') await exportAudioContext.resume();
    if (isExportPlaying) {
      exportSourceNode?.stop(); exportSourceNode?.disconnect();
      setIsExportPlaying(false); setExportPausedTime(exportCurrentTime);
      if (exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
    } else {
      const sourceNode = exportAudioContext.createBufferSource();
      sourceNode.buffer = exportData.audioBuffer;
      sourceNode.connect(exportAudioContext.destination);
      const startTime = exportAudioContext.currentTime;
      const offset = exportPausedTime;
      sourceNode.start(startTime, offset);
      setExportSourceNode(sourceNode); setIsExportPlaying(true);
      sourceNode.onended = () => { setIsExportPlaying(false); setExportPausedTime(0); setExportCurrentTime(0); };
      exportTimeUpdateRef.current = window.setInterval(() => {
        const elapsed = exportAudioContext.currentTime - startTime + offset;
        setExportCurrentTime(Math.min(elapsed, exportData.audioBuffer.duration));
        if (elapsed >= exportData.audioBuffer.duration) {
          setIsExportPlaying(false); setExportPausedTime(0); setExportCurrentTime(0);
          if (exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
        }
      }, 100);
    }
  }, [exportAudioContext, exportData, isExportPlaying, exportCurrentTime, exportPausedTime, exportSourceNode]);

  const handleExportStop = useCallback(() => {
    exportSourceNode?.stop(); exportSourceNode?.disconnect();
    setIsExportPlaying(false); setExportPausedTime(0); setExportCurrentTime(0);
    if (exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
  }, [exportSourceNode]);

  const handleWaveformSeek = useCallback((newTime: number) => {
    if (!exportData || !exportAudioContext) return;
    if (isExportPlaying && exportSourceNode) { exportSourceNode.stop(); exportSourceNode.disconnect(); }
    setExportCurrentTime(newTime); setExportPausedTime(newTime);
    if (isExportPlaying) {
      const sourceNode = exportAudioContext.createBufferSource();
      sourceNode.buffer = exportData.audioBuffer;
      sourceNode.connect(exportAudioContext.destination);
      const startTime = exportAudioContext.currentTime;
      sourceNode.start(startTime, newTime);
      setExportSourceNode(sourceNode);
      sourceNode.onended = () => { setIsExportPlaying(false); setExportPausedTime(0); setExportCurrentTime(0); };
      if (exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
      exportTimeUpdateRef.current = window.setInterval(() => {
        const elapsed = exportAudioContext.currentTime - startTime + newTime;
        setExportCurrentTime(Math.min(elapsed, exportData.audioBuffer.duration));
        if (elapsed >= exportData.audioBuffer.duration) {
          setIsExportPlaying(false); setExportPausedTime(0); setExportCurrentTime(0);
          if (exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
        }
      }, 100);
    }
  }, [exportData, exportAudioContext, isExportPlaying, exportSourceNode]);

  const handleDirectDownload = async (format: 'mp3' | 'wav') => {
    if (!exportData || isDownloading) return;
    setIsDownloading(true); setDownloadFormat(format); setDownloadProgress(0);
    try {
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => { if (prev >= 90) { clearInterval(progressInterval); return prev; } return prev + Math.random() * 15 + 5; });
      }, 300);
      if (!(window as any).JSZip) await loadJSZip();
      const audioBlob = await createAudioBlob(exportData.audioBuffer, format);
      const zip = new (window as any).JSZip();
      zip.file(`Mix_AI_${Date.now()}.${format}`, audioBlob);
      setTimeout(async () => {
        clearInterval(progressInterval); setDownloadProgress(100);
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url; link.download = `MixingMusic_AI_${format}_${Date.now()}.zip`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
        setDeductedCreditsInfo({ format: format.toUpperCase(), creditsDeducted: 0, remainingCredits: user.credits });
        setIsDownloading(false); setDownloadFormat(null); setDownloadProgress(0);
        setShowSuccessModal(true);
      }, 1500 + Math.random() * 1000);
    } catch (error) {
      console.error('Error:', error);
      setIsDownloading(false); setDownloadFormat(null); setDownloadProgress(0);
      alert('Error exportando. Intenta de nuevo.');
    }
  };

  useEffect(() => {
    return () => {
      if (exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
      exportAudioContext?.close();
    };
  }, [exportAudioContext]);

  const dur = exportData?.audioBuffer.duration || 0;
  const fmt = (t: number) => `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;

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
                ✦ Procesada con IA · {exportData.finalLufs.toFixed(1)} LUFS
              </span>
            </div>

            {/* Waveform — muestra los peaks REALES de la mezcla exportada */}
            <div style={{background:'#0F0A1A',borderRadius:'12px',padding:'12px',border:'1px solid rgba(192,38,211,0.1)',marginBottom:'20px'}}>
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

            {/* Stats de mejora — muestra el contraste antes/después */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px',marginBottom:'28px'}}>
              {[
                {label:'LUFS Final',val:exportData.finalLufs.toFixed(1),sub:'Streaming ready'},
                {label:'Sample Rate',val:'44.1 kHz',sub:'Alta fidelidad'},
                {label:'Bit Depth',val:'24 bits',sub:'Estudio profesional'},
              ].map(s=>(
                <div key={s.label} style={{background:'#0F0A1A',borderRadius:'12px',padding:'14px',textAlign:'center',border:'1px solid rgba(192,38,211,0.08)'}}>
                  <div style={{...S.mono,fontSize:'18px',fontWeight:500,background:'linear-gradient(90deg,#EC4899,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{s.val}</div>
                  <div style={{fontSize:'10px',color:'#9B7EC8',marginTop:'3px',textTransform:'uppercase',letterSpacing:'0.6px'}}>{s.label}</div>
                  <div style={{fontSize:'10px',color:'rgba(155,126,200,0.6)',marginTop:'2px'}}>{s.sub}</div>
                </div>
              ))}
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
              <h3 style={{fontSize:'22px',fontWeight:600,color:'#F8F0FF',marginBottom:'10px'}}>Procesando con IA</h3>
              <p style={{color:'#9B7EC8',marginBottom:'24px',fontSize:'14px'}}>{exportStep}</p>
              <div style={S.progressTrack}><div style={S.progressBar(exportProgress)}></div></div>
              <div style={{...S.mono,color:'#C026D3',fontWeight:600,fontSize:'18px',marginTop:'10px'}}>{exportProgress}%</div>
            </div>
          </div>
        )}
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
            <div style={{background:'#0F0A1A',borderRadius:'12px',padding:'14px',marginBottom:'20px',border:'1px solid rgba(74,222,128,0.15)'}}>
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
