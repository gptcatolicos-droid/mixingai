import { useState, useRef, useEffect, useCallback } from 'react';
import Header from '@/components/feature/Header';
import { drawWaveform, handleWaveformClick } from '@/utils/drawWaveform';

interface User { id:string; firstName:string; lastName:string; email:string; country:string; credits:number; provider?:string; createdAt:string; }
interface ExportScreenProps {
  user: User; projectId: string;
  exportData: { audioBuffer:AudioBuffer; audioUrl:string; waveformPeaks:Float32Array; finalLufs:number; mp3Url?:string; wavUrl?:string; presetName?:string; iaEqPreset?:string; } | null;
  exportProgress: number; exportStep: string;
  onBack: () => void; onCreditsUpdate: (n:number) => void;
}

const fmt = (s:number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

const S = {
  page: {minHeight:'100vh',background:'#0D0A14',fontFamily:"'Outfit',system-ui,sans-serif"},
  card: {background:'rgba(26,16,40,0.82)',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'18px',padding:'24px'},
  label: {fontSize:'10px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8',marginBottom:'12px',display:'block'},
  mono: {fontFamily:"'DM Mono',monospace"},
  glowBtn: {background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',borderRadius:'980px',fontSize:'13px',fontWeight:600,cursor:'pointer',boxShadow:'0 0 20px rgba(192,38,211,0.4)',fontFamily:'inherit'},
  ghostBtn: {background:'transparent',border:'1px solid rgba(192,38,211,0.25)',color:'#9B7EC8',borderRadius:'980px',fontSize:'13px',cursor:'pointer',fontFamily:'inherit'},
  progressBar: (pct:number) => ({height:'100%',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'8px',width:`${pct}%`,transition:'width 0.4s ease'}),
  progressTrack: {background:'#241636',borderRadius:'8px',height:'6px',overflow:'hidden' as const},
};

export default function ExportScreen({ user, exportData, exportProgress, exportStep, onBack, onCreditsUpdate }: ExportScreenProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [pausedTime, setPausedTime] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [dlProgress, setDlProgress] = useState(0);
  const [dlFormat, setDlFormat] = useState<'mp3'|'wav'|null>(null);
  const [audioCtx, setAudioCtx] = useState<AudioContext|null>(null);
  const [srcNode, setSrcNode] = useState<AudioBufferSourceNode|null>(null);
  const waveRef = useRef<HTMLCanvasElement>(null);
  const vuRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode|null>(null);
  const vuAnimRef = useRef<number>();
  const [momLufs, setMomLufs] = useState(-60.0);
  const [intLufs, setIntLufs] = useState(-60.0);
  const [playGain, setPlayGain] = useState(1.0);
  const gainNodeRef = useRef<GainNode|null>(null);
  const lufsHistRef = useRef<number[]>([]);
  const lufsFrameRef = useRef(0);

  useEffect(()=>{
    if(exportData&&!audioCtx) setAudioCtx(new AudioContext());
  },[exportData,audioCtx]);

  useEffect(()=>{
    const canvas=waveRef.current; if(!canvas||!exportData) return;
    const peaks = exportData.waveformPeaks?.length>0 ? exportData.waveformPeaks : (()=>{const m=new Float32Array(800);for(let i=0;i<m.length;i++)m[i]=Math.random()*0.7+0.1;return m;})();
    drawWaveform({canvas,waveformPeaks:peaks,currentTime:curTime,duration:exportData.audioBuffer.duration,style:'soundcloud',colors:{played:'#C026D3',unplayed:'rgba(124,58,237,0.2)',playhead:'#EC4899'}});
  },[exportData,curTime]);

  const startPlayback = useCallback((offset:number)=>{
    if(!audioCtx||!exportData) return;
    if(vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
    if(timerRef.current) clearInterval(timerRef.current);
    analyserRef.current=null; lufsHistRef.current=[]; lufsFrameRef.current=0;
    setMomLufs(-60); setIntLufs(-60);
    const src=audioCtx.createBufferSource(); src.buffer=exportData.audioBuffer;
    const analyser=audioCtx.createAnalyser(); analyser.fftSize=2048; analyser.smoothingTimeConstant=0.6;
    const limiter=audioCtx.createDynamicsCompressor();
    limiter.threshold.value=-1.0; limiter.knee.value=0; limiter.ratio.value=20; limiter.attack.value=0.0003; limiter.release.value=0.05;
    const gn=audioCtx.createGain(); gn.gain.value=playGain; gainNodeRef.current=gn;
    src.connect(analyser); analyser.connect(limiter); limiter.connect(gn); gn.connect(audioCtx.destination);
    analyserRef.current=analyser;
    const st=audioCtx.currentTime; src.start(st,offset);
    setSrcNode(src); setIsPlaying(true);
    const vuLoop=()=>{
      if(!analyserRef.current) return;
      const td=new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(td);
      let rms=0; for(let i=0;i<td.length;i++) rms+=td[i]*td[i]; rms=Math.sqrt(rms/td.length);
      const mom=rms>0.0001?Math.max(-50,Math.min(-5,20*Math.log10(rms)-0.691)):-60;
      const vc=vuRef.current;
      if(vc){const c2=vc.getContext('2d');if(c2){
        const w=vc.width,h=vc.height; c2.clearRect(0,0,w,h); c2.fillStyle='rgba(8,4,16,0.8)'; c2.fillRect(0,0,w,h);
        const level=Math.max(0,Math.min(1,(mom+50)/45)),barW=Math.floor(w/2)-3,barH=Math.floor(h*level);
        const gr=c2.createLinearGradient(0,h,0,0); gr.addColorStop(0,'#4ade80'); gr.addColorStop(0.55,'#4ade80'); gr.addColorStop(0.75,'#FBBF24'); gr.addColorStop(0.88,'#EC4899'); gr.addColorStop(1,'#ef4444');
        c2.fillStyle=gr; if(barH>0){c2.fillRect(2,h-barH,barW,barH);c2.fillRect(barW+4,h-Math.floor(barH*0.95),barW,Math.floor(barH*0.95));}
        const ty=h-Math.floor(h*(36/45)); c2.strokeStyle='rgba(74,222,128,0.7)'; c2.lineWidth=1; c2.setLineDash([3,3]);
        c2.beginPath(); c2.moveTo(0,ty); c2.lineTo(w,ty); c2.stroke(); c2.setLineDash([]);
      }}
      lufsFrameRef.current++;
      if(lufsFrameRef.current%4===0&&rms>0.0001){
        setMomLufs(mom); lufsHistRef.current.push(mom);
        if(lufsHistRef.current.length>600) lufsHistRef.current.shift();
        const valid=lufsHistRef.current.filter(v=>v>-50);
        if(valid.length>0) setIntLufs(Math.max(-50,Math.min(-5,valid.reduce((a,b)=>a+b,0)/valid.length)));
      }
      vuAnimRef.current=requestAnimationFrame(vuLoop);
    };
    vuAnimRef.current=requestAnimationFrame(vuLoop);
    src.onended=()=>{analyserRef.current=null;if(vuAnimRef.current)cancelAnimationFrame(vuAnimRef.current);setIsPlaying(false);setPausedTime(0);setCurTime(0);if(timerRef.current)clearInterval(timerRef.current);};
    timerRef.current=window.setInterval(()=>{
      const el=audioCtx.currentTime-st+offset;
      setCurTime(Math.min(el,exportData.audioBuffer.duration));
      if(el>=exportData.audioBuffer.duration){setIsPlaying(false);setPausedTime(0);setCurTime(0);if(timerRef.current)clearInterval(timerRef.current);}
    },100);
  },[audioCtx,exportData,playGain]);

  const handlePlayPause=useCallback(async()=>{
    if(!audioCtx||!exportData) return;
    if(audioCtx.state==='suspended') await audioCtx.resume();
    if(isPlaying){
      srcNode?.stop(); srcNode?.disconnect(); analyserRef.current=null;
      if(vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
      setIsPlaying(false); setPausedTime(curTime);
      if(timerRef.current) clearInterval(timerRef.current);
    } else { startPlayback(pausedTime); }
  },[audioCtx,exportData,isPlaying,curTime,pausedTime,srcNode,startPlayback]);

  const handleStop=useCallback(()=>{
    srcNode?.stop(); srcNode?.disconnect();
    setIsPlaying(false); setPausedTime(0); setCurTime(0);
    if(timerRef.current) clearInterval(timerRef.current);
  },[srcNode]);

  const handleSeek=useCallback((t:number)=>{
    if(!exportData||!audioCtx) return;
    const wasPlaying=isPlaying;
    if(srcNode){try{srcNode.stop();srcNode.disconnect();}catch{}}
    analyserRef.current=null; if(vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
    if(timerRef.current) clearInterval(timerRef.current);
    setCurTime(t); setPausedTime(t);
    if(wasPlaying) setTimeout(()=>startPlayback(t),30); else setIsPlaying(false);
  },[audioCtx,exportData,srcNode,isPlaying,startPlayback]);

  const handleDownload=async(format:'mp3'|'wav')=>{
    if(!exportData) return;
    setIsDownloading(true); setDlFormat(format); setDlProgress(0);
    try {
      const pi=setInterval(()=>setDlProgress(prev=>{if(prev>=90){clearInterval(pi);return prev;}return prev+Math.random()*15+5;}),200);
      const blob=await createAudioBlob(exportData.audioBuffer,format);
      clearInterval(pi); setDlProgress(100); await new Promise(r=>setTimeout(r,400));
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`mezcla-mixingmusic.${format}`; a.click(); URL.revokeObjectURL(url);
    } catch(e){console.error(e);}
    setIsDownloading(false); setDlProgress(0); setDlFormat(null);
  };

  const stopAll=()=>{if(srcNode){try{srcNode.stop();srcNode.disconnect();}catch{}}analyserRef.current=null;if(vuAnimRef.current)cancelAnimationFrame(vuAnimRef.current);if(timerRef.current)clearInterval(timerRef.current);};
  const dur=exportData?.audioBuffer?.duration??0;

  return(
    <div style={{...S.page,backgroundImage:'url(/studio-bg.png)',backgroundSize:'cover',backgroundPosition:'center top',backgroundAttachment:'fixed',backgroundBlendMode:'darken',backgroundColor:'rgba(8,4,16,0.82)'}}>
      <Header user={user} onLogout={()=>{}} onCreditsUpdate={onCreditsUpdate}/>
      <div style={{maxWidth:'900px',padding:'20px 20px 60px',margin:'0 auto'}}>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
          <div>
            <h1 style={{fontSize:'26px',fontWeight:600,letterSpacing:'-0.5px',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Tu Mezcla Final</h1>
            <p style={{color:'#9B7EC8',fontSize:'13px',marginTop:'4px'}}>
              IA Mixing · {exportData?.iaEqPreset?`IA EQ: ${exportData.iaEqPreset} · `:''}44.1kHz/24bit · {exportData?.finalLufs?.toFixed(1)} LUFS
            </p>
          </div>
          <button onClick={()=>{stopAll();onBack();}} style={{...S.ghostBtn,padding:'10px 18px'}}>← Volver al Mezclador</button>
        </div>

        {exportData?(
          <div style={S.card}>
            {/* Badge */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
              <span style={S.label}>Preview de tu Mezcla Final</span>
              <span style={{fontSize:'11px',fontWeight:600,padding:'4px 12px',borderRadius:'980px',background:'rgba(192,38,211,0.1)',color:'#C026D3',border:'1px solid rgba(192,38,211,0.25)'}}>
                ✦ {exportData.presetName?exportData.presetName+' · ':''}{exportData.iaEqPreset?`IA EQ ${exportData.iaEqPreset} · `:''}{exportData.finalLufs?.toFixed(1)} LUFS
              </span>
            </div>

            {/* Waveform */}
            <div style={{background:'rgba(8,4,16,0.88)',borderRadius:'12px',padding:'12px',border:'1px solid rgba(192,38,211,0.1)',marginBottom:'20px'}}>
              <canvas ref={waveRef} width={1200} height={100} style={{width:'100%',height:'70px',borderRadius:'8px',cursor:'pointer',display:'block'}}
                onClick={e=>{if(waveRef.current) handleWaveformClick(e,waveRef.current,dur,handleSeek);}}/>
            </div>

            {/* Play controls */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',marginBottom:'10px'}}>
              <button onClick={handleStop} style={{width:'40px',height:'40px',borderRadius:'50%',background:'#241636',border:'1px solid rgba(192,38,211,0.2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="ri-stop-fill" style={{color:'#9B7EC8',fontSize:'14px'}}></i>
              </button>
              <button onClick={handlePlayPause} style={{width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 28px rgba(236,72,153,0.5)'}}>
                <i className={isPlaying?'ri-pause-fill':'ri-play-fill'} style={{color:'#fff',fontSize:'22px',marginLeft:isPlaying?0:'3px'}}></i>
              </button>
            </div>
            <div style={{textAlign:'center',...S.mono,color:'#9B7EC8',fontSize:'14px',fontWeight:500,marginBottom:'24px'}}>{fmt(curTime)}{' / '}{fmt(dur)}</div>

            {/* VU + LUFS */}
            <div style={{background:'linear-gradient(135deg,rgba(36,22,54,0.88),rgba(26,16,40,0.88))',border:'1px solid rgba(192,38,211,0.25)',borderRadius:'14px',padding:'16px',marginBottom:'20px',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)'}}></div>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'14px'}}>
                <i className="ri-equalizer-fill" style={{color:'#C026D3',fontSize:'13px'}}></i>
                <span style={{fontSize:'10px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8'}}>Mix Bus Master</span>
                {exportData.presetName&&<span style={{background:'linear-gradient(135deg,#EC4899,#C026D3)',borderRadius:'980px',padding:'2px 10px',fontSize:'9px',color:'#fff',fontWeight:700}}>✦ {exportData.presetName}</span>}
                {exportData.iaEqPreset&&<span style={{background:'rgba(124,58,237,0.2)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:'980px',padding:'2px 10px',fontSize:'9px',color:'#7C3AED',fontWeight:700}}>🎚️ {exportData.iaEqPreset}</span>}
                <span style={{marginLeft:'auto',fontSize:'9px',color:isPlaying?'#4ade80':'#9B7EC8',fontFamily:"'DM Mono',monospace",fontWeight:600}}>{isPlaying?'▶ PLAYING':'■ STOPPED'}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'52px 1fr',gap:'14px',alignItems:'start'}}>
                <div style={{display:'flex',flexDirection:'column' as const,alignItems:'center',gap:'4px'}}>
                  <canvas ref={vuRef} width={60} height={100} style={{width:'44px',height:'80px',borderRadius:'6px',border:'1px solid rgba(192,38,211,0.2)'}}/>
                  <span style={{fontSize:'9px',color:'#9B7EC8',fontFamily:"'DM Mono',monospace"}}>VU</span>
                </div>
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                    {[{v:momLufs,l:'LUFS Momentary',c:momLufs>-14?'#f87171':momLufs<-30?'#9B7EC8':'#4ade80'},{v:intLufs,l:'LUFS Integrated',c:'#C026D3'}].map((x,i)=>(
                      <div key={i} style={{background:'rgba(15,10,26,0.6)',borderRadius:'10px',padding:'10px',textAlign:'center' as const,border:'1px solid rgba(192,38,211,0.08)'}}>
                        <div style={{...S.mono,fontSize:'20px',fontWeight:600,color:x.c,transition:'color 0.3s'}}>{x.v.toFixed(1)}</div>
                        <div style={{fontSize:'9px',textTransform:'uppercase' as const,letterSpacing:'0.5px',color:'#9B7EC8',marginTop:'2px'}}>{x.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'6px'}}>
                    {[{l:'Sample Rate',v:'44.1 kHz',c:'#C026D3'},{l:'Bit Depth',v:'24 bits',c:'#7C3AED'},{l:'Spotify',v:exportData.finalLufs?.toFixed(1),c:Math.abs((exportData.finalLufs??-20)+14)<0.5?'#4ade80':'#FBBF24'}].map(s=>(
                      <div key={s.l} style={{background:'rgba(15,10,26,0.6)',borderRadius:'8px',padding:'8px',textAlign:'center' as const,border:'1px solid rgba(192,38,211,0.06)'}}>
                        <div style={{...S.mono,fontSize:'13px',fontWeight:600,color:s.c}}>{s.v}</div>
                        <div style={{fontSize:'9px',color:'#9B7EC8'}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Download buttons */}
            <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap',marginBottom:'12px'}}>
              <button onClick={()=>handleDownload('mp3')} disabled={isDownloading}
                style={{...S.glowBtn,padding:'14px 28px',fontSize:'14px',opacity:isDownloading?0.5:1,display:'flex',alignItems:'center',gap:'8px'}}>
                <i className="ri-download-line"></i>Descargar .MP3
              </button>
              <button onClick={()=>handleDownload('wav')} disabled={isDownloading}
                style={{background:'linear-gradient(135deg,#7C3AED,#4F46E5)',border:'none',color:'#fff',padding:'14px 28px',borderRadius:'980px',fontSize:'14px',fontWeight:600,cursor:'pointer',boxShadow:'0 0 20px rgba(124,58,237,0.4)',fontFamily:'inherit',display:'flex',alignItems:'center',gap:'8px',opacity:isDownloading?0.5:1}}>
                <i className="ri-download-2-line"></i>Descargar .WAV 24bit
              </button>
            </div>

            {/* Output gain */}
            <div style={{background:'rgba(15,10,26,0.6)',border:'1px solid rgba(192,38,211,0.12)',borderRadius:'12px',padding:'12px 16px',display:'flex',alignItems:'center',gap:'14px'}}>
              <div style={{flexShrink:0,minWidth:'64px'}}>
                <div style={{fontSize:'9px',fontWeight:700,color:'#9B7EC8',letterSpacing:'0.8px',textTransform:'uppercase' as const,marginBottom:'2px'}}>Output Gain</div>
                <div style={{fontSize:'16px',fontWeight:800,fontFamily:'monospace',lineHeight:1.2,color:playGain>0.9?'#EF4444':playGain>0.7?'#FBBF24':'#4ade80'}}>
                  {playGain>0?(20*Math.log10(playGain)).toFixed(1):'-∞'} dB
                </div>
              </div>
              <input type="range" min="0.1" max="1.0" step="0.01" value={playGain}
                onChange={e=>{const v=parseFloat(e.target.value);setPlayGain(v);if(gainNodeRef.current&&audioCtx) gainNodeRef.current.gain.setTargetAtTime(v,audioCtx.currentTime,0.05);}}
                style={{flex:1,accentColor:'#C026D3',cursor:'pointer',height:'4px'}}/>
              <button onClick={()=>{setPlayGain(1.0);if(gainNodeRef.current&&audioCtx) gainNodeRef.current.gain.setTargetAtTime(1.0,audioCtx.currentTime,0.05);}}
                style={{flexShrink:0,background:'transparent',border:'1px solid rgba(255,255,255,0.1)',color:'#9B7EC8',padding:'4px 10px',borderRadius:'6px',fontSize:'11px',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>Reset</button>
            </div>

            <div style={{textAlign:'center',fontSize:'12px',color:'rgba(155,126,200,0.4)',marginTop:'10px'}}>
              ✅ Listo para Spotify · Apple Music · YouTube Music
            </div>
          </div>
        ):(
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'400px'}}>
            <div style={{...S.card,maxWidth:'420px',width:'100%',textAlign:'center'}}>
              <h3 style={{fontSize:'22px',fontWeight:600,color:'#F8F0FF',marginBottom:'10px'}}>{exportProgress>0?'Procesando con IA':'Preparando mezcla...'}</h3>
              <p style={{color:'#9B7EC8',marginBottom:'24px',fontSize:'14px'}}>{exportStep||'Aplicando efectos...'}</p>
              {exportProgress>0&&<><div style={S.progressTrack}><div style={S.progressBar(exportProgress)}></div></div><div style={{...S.mono,color:'#C026D3',fontWeight:600,fontSize:'18px',marginTop:'10px'}}>{exportProgress}%</div></>}
            </div>
          </div>
        )}
      </div>

      {isDownloading&&(
        <div style={{position:'fixed',inset:0,background:'rgba(15,10,26,0.95)',backdropFilter:'blur(8px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
          <div style={{...S.card,maxWidth:'420px',width:'100%',textAlign:'center'}}>
            <h3 style={{fontSize:'22px',fontWeight:600,color:'#F8F0FF',marginBottom:'10px'}}>Creando {dlFormat?.toUpperCase()}</h3>
            <div style={S.progressTrack}><div style={S.progressBar(dlProgress)}></div></div>
            <div style={{...S.mono,color:'#C026D3',fontWeight:600,fontSize:'18px',marginTop:'10px'}}>{Math.round(dlProgress)}%</div>
          </div>
        </div>
      )}
    </div>
  );
}

async function createAudioBlob(buffer:AudioBuffer,format:'mp3'|'wav'):Promise<Blob>{
  const length=buffer.length,channels=buffer.numberOfChannels,sampleRate=buffer.sampleRate;
  const ba=channels*2,br=sampleRate*ba,ds=length*ba,bs=44+ds;
  const ab=new ArrayBuffer(bs),view=new DataView(ab);
  const ws=(o:number,s:string)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
  ws(0,'RIFF');view.setUint32(4,bs-8,true);ws(8,'WAVE');ws(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);
  view.setUint32(24,sampleRate,true);view.setUint32(28,br,true);
  view.setUint16(32,ba,true);view.setUint16(34,16,true);ws(36,'data');view.setUint32(40,ds,true);
  let offset=44;
  for(let i=0;i<length;i++) for(let c=0;c<channels;c++){
    view.setInt16(offset,Math.round(Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]))*32767),true);
    offset+=2;
  }
  return new Blob([ab],{type:format==='mp3'?'audio/mp3':'audio/wav'});
}
