import { useState, useRef, useEffect } from 'react';
import FlowNav from '@/components/flow/FlowNav';
import { MixPreset, PRESETS } from './PresetScreen';

interface User { id:string; firstName:string; lastName:string; email:string; country:string; credits:number; provider?:string; createdAt:string; is_pro?:boolean; plan?:string; }
interface Stem { id:string; name:string; file:File; buffer:AudioBuffer; gainNode:GainNode; panNode:StereoPannerNode; analyserNode:AnalyserNode; eqLow:BiquadFilterNode; eqMid:BiquadFilterNode; eqHigh:BiquadFilterNode; sourceNode?:AudioBufferSourceNode; volume:number; pan:number; muted:boolean; solo:boolean; waveformPeaks:Float32Array; instrument:string; icon:string; color:string; startOffset:number; endOffset:number; fadeIn:number; fadeOut:number; }
interface Props { projectId:string; user:User; uploadedFiles:File[]; onBack:()=>void; onCreditsUpdate:(n:number)=>void; onExport:(d:any)=>void; initialPreset?:MixPreset; reverbOn?:boolean; delayOn?:boolean; stereoOn?:boolean; onNavigate?:(id:string)=>void; onLogout?:()=>void; onSwitchToMixer?:()=>void; }

const T = { bgDeep:'#0F0A1A', surface:'rgba(26,16,40,0.8)', surface2:'rgba(35,20,55,0.6)', surfaceSolid:'#12091e', text:'#F8F0FF', text2:'#b8a8d0', text3:'#7a6a90', pink:'#ec4899', fuchsia:'#C026D3', violet:'#a259ff', amber:'#fbbf24', green:'#10b981', red:'#ef4444', border:'rgba(192,38,211,0.2)', borderStrong:'rgba(192,38,211,0.5)' };
const COLORS = ['#ec4899','#10b981','#f97316','#3b82f6','#fbbf24','#a259ff','#14b8a6','#f472b6','#4ade80','#fb923c','#60a5fa','#c084fc'];
const TH = 60;
const IAEQ = [{id:'default',name:'Default'},{id:'car',name:'Car'},{id:'iphone',name:'iPhone'},{id:'macbook',name:'MacBook'},{id:'headphones',name:'Headphones'},{id:'tv',name:'TV'},{id:'theater',name:'Home Theater'},{id:'bt',name:'Bluetooth'},{id:'studio',name:'Studio Monitors'},{id:'gaming',name:'Gaming Headset'},{id:'tablet',name:'Tablet'}];

function detectInfo(n:string):{instrument:string;icon:string}{
  const s=n.toLowerCase().replace(/[_\-\.]/g,' ');
  if(/voz|voc|vocal|lead|singer|coro|choir|bgv/.test(s))return{instrument:'Voz',icon:'🎤'};
  if(/kick|bombo|drum|perc|beat|snare|hihat/.test(s))return{instrument:'Batería',icon:'🥁'};
  if(/bass|bajo|808|sub/.test(s))return{instrument:'Bajo',icon:'🎸'};
  if(/guitar|guitarra|gtr/.test(s))return{instrument:'Guitarra',icon:'🎸'};
  if(/piano|keys|keyboard|synth|pad|organ/.test(s))return{instrument:'Teclado',icon:'🎹'};
  return{instrument:'Pista',icon:'🎵'};
}

function genPeaks(buf:AudioBuffer,n:number):Float32Array{
  const d=buf.getChannelData(0),r=new Float32Array(n),s=Math.floor(d.length/n);
  for(let i=0;i<n;i++){let m=0;for(let j=0;j<s;j++){const v=Math.abs(d[i*s+j]||0);if(v>m)m=v;}r[i]=m;}
  return r;
}

function fmt(s:number){return`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;}

// Waveform real del clip
function WaveClip({p,color,w,h,muted,fadeIn=0,fadeOut=0}:{p:Float32Array;color:string;w:number;h:number;muted:boolean;fadeIn?:number;fadeOut?:number}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c=ref.current;if(!c||w<1)return;
    const dpr=window.devicePixelRatio||1;
    c.width=w*dpr;c.height=h*dpr;
    const ctx=c.getContext('2d');if(!ctx)return;
    ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
    ctx.strokeStyle='rgba(255,255,255,'+(muted?0.15:0.8)+')';
    ctx.lineWidth=0.8;ctx.beginPath();
    const cy=h/2;
    for(let i=0;i<p.length;i++){
      const x=(i/(p.length-1))*w;
      let amp=p[i];
      if(fadeIn>0&&i/p.length<fadeIn)amp*=i/p.length/fadeIn;
      if(fadeOut>0&&i/p.length>1-fadeOut)amp*=(1-i/p.length)/fadeOut;
      const a=amp*(cy-1);
      ctx.moveTo(x,cy-a);ctx.lineTo(x,cy+a);
    }
    ctx.stroke();
  },[p,w,h,muted,fadeIn,fadeOut]);
  return <canvas ref={ref} style={{width:w,height:h,display:'block'}}/>;
}

// Vertical fader
function VFader({value,onChange,color,height=120}:{value:number;onChange:(v:number)=>void;color:string;height?:number}){
  const min=-24,max=6;
  const pct=((value-min)/(max-min));
  const thumbY=(1-pct)*(height-16);
  const trackRef=useRef<HTMLDivElement>(null);
  const dragging=useRef(false);

  const startDrag=(e:React.MouseEvent)=>{
    e.preventDefault();dragging.current=true;
    const move=(me:MouseEvent)=>{
      if(!trackRef.current)return;
      const rect=trackRef.current.getBoundingClientRect();
      const p=Math.max(0,Math.min(1,1-(me.clientY-rect.top)/rect.height));
      onChange(Math.round(min+p*(max-min)));
    };
    const up=()=>{dragging.current=false;document.removeEventListener('mousemove',move);document.removeEventListener('mouseup',up);};
    document.addEventListener('mousemove',move);document.addEventListener('mouseup',up);
  };

  return(
    <div style={{position:'relative',width:20,height,cursor:'ns-resize',userSelect:'none'}} onMouseDown={startDrag}>
      <div ref={trackRef} style={{position:'absolute',left:'50%',top:0,bottom:0,width:3,transform:'translateX(-50%)',background:'rgba(255,255,255,0.06)',borderRadius:2}}>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:`${pct*100}%`,background:`linear-gradient(0deg,${color},${color}99)`,borderRadius:2}}/>
      </div>
      <div style={{position:'absolute',left:'50%',top:thumbY,transform:'translate(-50%,0)',width:16,height:16,borderRadius:3,background:color,boxShadow:`0 0 6px ${color}88`,border:'1px solid rgba(255,255,255,0.2)'}}/>
    </div>
  );
}

// Horizontal slider
function HSlider({value,min,max,step,color,onChange}:{value:number;min:number;max:number;step:number;color:string;onChange:(v:number)=>void}){
  return(
    <div style={{position:'relative',height:12,display:'flex',alignItems:'center'}}>
      <div style={{position:'absolute',left:0,right:0,height:3,background:'rgba(255,255,255,0.06)',borderRadius:2}}>
        <div style={{height:'100%',background:color,borderRadius:2,width:`${((value-min)/(max-min))*100}%`}}/>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%'}}/>
    </div>
  );
}

// Context menu
function ContextMenu({x,y,stemId,onSeparate,onRename,onClose}:{x:number;y:number;stemId:string;onSeparate:()=>void;onRename:()=>void;onClose:()=>void}){
  useEffect(()=>{
    const h=()=>onClose();
    document.addEventListener('click',h,{once:true});
    return()=>document.removeEventListener('click',h);
  },[]);
  return(
    <div style={{position:'fixed',left:x,top:y,background:T.surfaceSolid,border:`1px solid ${T.borderStrong}`,borderRadius:8,padding:4,zIndex:1000,minWidth:180,boxShadow:'0 8px 24px rgba(0,0,0,0.6)'}}>
      {[
        {icon:'✂',label:'Separar stems con Demucs',fn:onSeparate,color:T.violet},
        {icon:'✏',label:'Renombrar track',fn:onRename,color:T.text2},
      ].map(item=>(
        <button key={item.label} onClick={()=>{item.fn();onClose();}} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'8px 12px',borderRadius:6,background:'transparent',border:'none',color:item.color,fontSize:12,cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
          <span style={{fontSize:14}}>{item.icon}</span>{item.label}
        </button>
      ))}
    </div>
  );
}

// Waveform Editor — Logic Pro style con fade in/out visual y recorte
function TrackEditor({stem,onClose,onUpdate}:{stem:Stem;onClose:()=>void;onUpdate:(changes:Partial<Stem>)=>void}){
  const [name,setName]=useState(stem.name);
  const [gain,setGain]=useState(stem.volume);
  const [fadeIn,setFadeIn]=useState(stem.fadeIn);
  const [fadeOut,setFadeOut]=useState(stem.fadeOut);
  const [trimStart,setTrimStart]=useState(stem.startOffset/stem.buffer.duration);
  const [trimEnd,setTrimEnd]=useState(stem.endOffset/stem.buffer.duration);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const W=600,H=120;

  // Dibujar waveform con fade in/out y trim markers
  useEffect(()=>{
    const c=canvasRef.current;if(!c)return;
    const ctx=c.getContext('2d');if(!ctx)return;
    c.width=W;c.height=H;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='rgba(8,4,16,1)';
    ctx.fillRect(0,0,W,H);

    // Zona recortada (fuera del trim) — oscura
    ctx.fillStyle='rgba(0,0,0,0.5)';
    ctx.fillRect(0,0,trimStart*W,H);
    ctx.fillRect(trimEnd*W,0,(1-trimEnd)*W,H);

    // Waveform
    const peaks=stem.waveformPeaks;
    const step=Math.ceil(peaks.length/W);
    for(let x=0;x<W;x++){
      const idx=Math.floor(x/W*peaks.length);
      const amp=Math.abs(peaks[idx]??0);
      // Calcular opacidad por fade
      const pct=x/W;
      let alpha=1;
      if(fadeIn>0&&pct<fadeIn)alpha=pct/fadeIn;
      if(fadeOut>0&&pct>1-fadeOut)alpha=(1-pct)/fadeOut;
      // Color segun zona
      const inTrim=pct>=trimStart&&pct<=trimEnd;
      ctx.fillStyle=inTrim?`rgba(${stem.color==='#e879f9'?'232,121,249':stem.color==='#f87171'?'248,113,113':stem.color==='#60a5fa'?'96,165,250':stem.color==='#34d399'?'52,211,153':'168,85,247'},${0.3+amp*0.7})`:'rgba(80,60,100,0.3)';
      const h=Math.max(1,amp*H*0.45);
      ctx.fillRect(x,H/2-h,1,h*2);
    }

    // Fade In overlay (amarillo)
    if(fadeIn>0){
      const grad=ctx.createLinearGradient(trimStart*W,0,trimStart*W+fadeIn*W,0);
      grad.addColorStop(0,'rgba(251,191,36,0.35)');
      grad.addColorStop(1,'rgba(251,191,36,0)');
      ctx.fillStyle=grad;
      ctx.fillRect(trimStart*W,0,fadeIn*W,H);
    }
    // Fade Out overlay (rosa)
    if(fadeOut>0){
      const grad=ctx.createLinearGradient((trimEnd-fadeOut)*W,0,trimEnd*W,0);
      grad.addColorStop(0,'rgba(232,121,249,0)');
      grad.addColorStop(1,'rgba(232,121,249,0.35)');
      ctx.fillStyle=grad;
      ctx.fillRect((trimEnd-fadeOut)*W,0,fadeOut*W,H);
    }

    // Trim handles
    ctx.strokeStyle='#fff';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(trimStart*W,0);ctx.lineTo(trimStart*W,H);ctx.stroke();
    ctx.beginPath();ctx.moveTo(trimEnd*W,0);ctx.lineTo(trimEnd*W,H);ctx.stroke();

    // Fade In handle (amarillo)
    const fiX=trimStart*W+fadeIn*W;
    ctx.strokeStyle='#fbbf24';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(fiX,0);ctx.lineTo(fiX,H);ctx.stroke();
    // Fade Out handle (rosa)
    const foX=trimEnd*W-fadeOut*W;
    ctx.strokeStyle='#e879f9';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(foX,0);ctx.lineTo(foX,H);ctx.stroke();

    // Labels
    ctx.fillStyle='rgba(255,255,255,0.5)';ctx.font='9px monospace';
    ctx.fillText(`${fmt(trimStart*stem.buffer.duration)}`,trimStart*W+4,12);
    ctx.fillText(`${fmt(trimEnd*stem.buffer.duration)}`,Math.max(4,trimEnd*W-36),12);
  },[fadeIn,fadeOut,trimStart,trimEnd,stem]);

  // Drag handlers para trim y fade
  const dragging=useRef<null|'trimStart'|'trimEnd'|'fadeIn'|'fadeOut'>(null);
  const onMouseDown=(e:React.MouseEvent)=>{
    const c=canvasRef.current;if(!c)return;
    const rect=c.getBoundingClientRect();
    const px=(e.clientX-rect.left)/rect.width;
    // Detectar qua handle esta mas cerca (tolerancia 3%)
    const handles=[
      {id:'trimStart',pos:trimStart},{id:'trimEnd',pos:trimEnd},
      {id:'fadeIn',pos:trimStart+fadeIn},{id:'fadeOut',pos:trimEnd-fadeOut},
    ];
    const closest=handles.reduce((a,b)=>Math.abs(b.pos-px)<Math.abs(a.pos-px)?b:a);
    if(Math.abs(closest.pos-px)<0.05)dragging.current=closest.id as any;
  };
  const onMouseMove=(e:React.MouseEvent)=>{
    if(!dragging.current||!canvasRef.current)return;
    const rect=canvasRef.current.getBoundingClientRect();
    const px=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
    if(dragging.current==='trimStart')setTrimStart(Math.min(px,trimEnd-0.05));
    else if(dragging.current==='trimEnd')setTrimEnd(Math.max(px,trimStart+0.05));
    else if(dragging.current==='fadeIn')setFadeIn(Math.max(0,Math.min(px-trimStart,0.5)));
    else if(dragging.current==='fadeOut')setFadeOut(Math.max(0,Math.min(trimEnd-px,0.5)));
  };
  const onMouseUp=()=>{dragging.current=null;};

  const apply=()=>{
    onUpdate({
      name,volume:gain,fadeIn,fadeOut,
      startOffset:trimStart*stem.buffer.duration,
      endOffset:trimEnd*stem.buffer.duration,
    });
    onClose();
  };

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(8,4,16,0.95)',backdropFilter:'blur(16px)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:T.surfaceSolid,border:`1px solid ${T.borderStrong}`,borderRadius:18,padding:24,maxWidth:660,width:'100%'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3 style={{fontSize:15,fontWeight:700,color:T.text,margin:0,display:'flex',alignItems:'center',gap:8}}>
            <span style={{color:stem.color}}>{stem.icon}</span> Editor de clip — {stem.name}
          </h3>
          <button onClick={onClose} style={{background:'none',border:'none',color:T.text3,fontSize:18,cursor:'pointer',padding:'0 4px'}}>✕</button>
        </div>

        {/* Waveform visual interactivo */}
        <div style={{marginBottom:16,borderRadius:10,overflow:'hidden',border:`1px solid ${T.border}`,position:'relative'}}>
          <canvas ref={canvasRef} style={{width:'100%',height:H,display:'block',cursor:'col-resize'}}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}/>
          <div style={{position:'absolute',bottom:4,left:8,display:'flex',gap:12,fontSize:9,color:'rgba(255,255,255,0.4)'}}>
            <span style={{color:'#fff'}}>◀▶ Trim</span>
            <span style={{color:'#fbbf24'}}>━ Fade In</span>
            <span style={{color:'#e879f9'}}>━ Fade Out</span>
          </div>
          <div style={{position:'absolute',bottom:4,right:8,fontSize:9,color:'rgba(255,255,255,0.3)'}}>
            Arrastra los marcadores para editar
          </div>
        </div>

        {/* Controles */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,marginBottom:16}}>
          <div>
            <div style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:4}}>Inicio</div>
            <div style={{fontSize:12,fontWeight:600,color:T.text,fontFamily:'monospace'}}>{fmt(trimStart*stem.buffer.duration)}</div>
          </div>
          <div>
            <div style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:4}}>Fin</div>
            <div style={{fontSize:12,fontWeight:600,color:T.text,fontFamily:'monospace'}}>{fmt(trimEnd*stem.buffer.duration)}</div>
          </div>
          <div>
            <div style={{fontSize:9,color:'#fbbf24',letterSpacing:.5,textTransform:'uppercase',marginBottom:4}}>Fade In</div>
            <div style={{fontSize:12,fontWeight:600,color:'#fbbf24',fontFamily:'monospace'}}>{fmt(fadeIn*stem.buffer.duration)}</div>
          </div>
          <div>
            <div style={{fontSize:9,color:'#e879f9',letterSpacing:.5,textTransform:'uppercase',marginBottom:4}}>Fade Out</div>
            <div style={{fontSize:12,fontWeight:600,color:'#e879f9',fontFamily:'monospace'}}>{fmt(fadeOut*stem.buffer.duration)}</div>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
          <div>
            <div style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Nombre</div>
            <input value={name} onChange={e=>setName(e.target.value)} style={{width:'100%',padding:'7px 10px',borderRadius:7,background:'rgba(255,255,255,0.06)',border:`1px solid ${T.border}`,color:T.text,fontSize:12,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}/>
          </div>
          <div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase'}}>Ganancia</span>
              <span style={{fontSize:10,color:stem.color,fontFamily:'monospace',fontWeight:600}}>{gain>0?'+':''}{gain} dB</span>
            </div>
            <HSlider value={gain} min={-24} max={6} step={1} color={stem.color} onChange={setGain}/>
          </div>
        </div>

        <div style={{display:'flex',gap:10}}>
          <button onClick={apply} style={{flex:1,padding:'11px',borderRadius:10,background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`,border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>Aplicar cambios</button>
          <button onClick={()=>{setTrimStart(0);setTrimEnd(1);setFadeIn(0);setFadeOut(0);}} style={{padding:'11px 14px',borderRadius:10,background:'rgba(255,255,255,0.04)',border:`1px solid ${T.border}`,color:T.text2,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Reset</button>
          <button onClick={onClose} style={{padding:'11px 14px',borderRadius:10,background:'rgba(255,255,255,0.04)',border:`1px solid ${T.border}`,color:T.text2,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

export default function StudioDAW({uploadedFiles,user,initialPreset=PRESETS[0],reverbOn=false,delayOn=false,stereoOn=false,onBack,onCreditsUpdate,onExport,onNavigate,onLogout,onSwitchToMixer}:Props){
  const [stems,setStems]=useState<Stem[]>([]);
  const [playing,setPlaying]=useState(false);
  const [currentTime,setCurrentTime]=useState(0);
  const [duration,setDuration]=useState(0);
  const [loading,setLoading]=useState(uploadedFiles.length>0);
  const [loadPct,setLoadPct]=useState(0);
  const [exporting,setExporting]=useState(false);
  const [bassGain,setBassGain]=useState(initialPreset.bass??0);
  const [midGain,setMidGain]=useState(initialPreset.mid??0);
  const [highGain,setHighGain]=useState(initialPreset.high??0);
  const [revActive,setRevActive]=useState(reverbOn);
  const [delActive,setDelActive]=useState(delayOn);
  const [widActive,setWidActive]=useState(stereoOn);
  const [preset,setPreset]=useState<MixPreset>(initialPreset);
  const [showPresets,setShowPresets]=useState(false);
  const [iaEq,setIaEq]=useState(IAEQ[0]);
  const [momLufs,setMomLufs]=useState(-60.0);
  const [intLufs,setIntLufs]=useState(-60.0);
  const [selId,setSelId]=useState<string|null>(null);
  const [tab,setTab]=useState<'mix'|'gen'|'stems'>('mix');
  const [allFiles,setAllFiles]=useState<File[]>(uploadedFiles);
  const [recActive,setRecActive]=useState(false);
  const [mediaRec,setMediaRec]=useState<MediaRecorder|null>(null);
  const [ctxMenu,setCtxMenu]=useState<{x:number;y:number;stemId:string}|null>(null);
  const [editStem,setEditStem]=useState<Stem|null>(null);
  const [renamingId,setRenamingId]=useState<string|null>(null);
  const [renameVal,setRenameVal]=useState('');

  const ctxRef=useRef<AudioContext|null>(null);
  const masterRef=useRef<GainNode|null>(null);
  const analyserRef=useRef<AnalyserNode|null>(null);
  const bassRef=useRef<BiquadFilterNode|null>(null);
  const midRef=useRef<BiquadFilterNode|null>(null);
  const highRef=useRef<BiquadFilterNode|null>(null);
  const dryRef=useRef<GainNode|null>(null);
  const revRef=useRef<GainNode|null>(null);
  const delRef=useRef<GainNode|null>(null);
  const iaEqLoRef=useRef<BiquadFilterNode|null>(null);
  const iaEqMidRef=useRef<BiquadFilterNode|null>(null);
  const iaEqHiRef=useRef<BiquadFilterNode|null>(null);
  const pauseRef=useRef(0);
  const timerRef=useRef<number>();
  const fftRef=useRef<HTMLCanvasElement>(null);
  const lufsHist=useRef<number[]>([]);
  const rafRef=useRef<number>();

  useEffect(()=>{setAllFiles(uploadedFiles);},[uploadedFiles]);
  const initializedRef=useRef(false);
  useEffect(()=>{
    if(allFiles.length>0){
      // Si es la primera vez O si cambió el número de archivos
      initAudio();
    }
  },[allFiles]);
  useEffect(()=>()=>{
    if(rafRef.current)cancelAnimationFrame(rafRef.current);
    if(timerRef.current)clearInterval(timerRef.current);
    if(ctxRef.current&&ctxRef.current.state!=='closed'){
      ctxRef.current.close().catch(()=>{});
    }
  },[]);

  const initAudio=async()=>{
    setLoading(true);setLoadPct(5);
    try{
      if(ctxRef.current&&ctxRef.current.state!=='closed')await ctxRef.current.close();
      const ctx=new(window.AudioContext||(window as any).webkitAudioContext)();
      ctxRef.current=ctx;
      const master=ctx.createGain();master.gain.value=0.7;masterRef.current=master;
      // Limiter para evitar clipping
      const limiter=ctx.createDynamicsCompressor();
      limiter.threshold.value=-3;limiter.knee.value=0;limiter.ratio.value=20;
      limiter.attack.value=0.001;limiter.release.value=0.1;
      const analyser=ctx.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=0.8;analyserRef.current=analyser;
      master.connect(limiter);limiter.connect(analyser);analyser.connect(ctx.destination);
      const bass=ctx.createBiquadFilter();bass.type='lowshelf';bass.frequency.value=200;bass.gain.value=bassGain;bassRef.current=bass;
      const mid=ctx.createBiquadFilter();mid.type='peaking';mid.frequency.value=1000;mid.Q.value=1;mid.gain.value=midGain;midRef.current=mid;
      const high=ctx.createBiquadFilter();high.type='highshelf';high.frequency.value=5000;high.gain.value=highGain;highRef.current=high;
      const dry=ctx.createGain();dry.gain.value=1;dryRef.current=dry;
      const revDelay=ctx.createDelay(0.08);revDelay.delayTime.value=0.05;
      const rev=ctx.createGain();rev.gain.value=revActive?0.2:0;revRef.current=rev;
      const delNode=ctx.createDelay(2.0);delNode.delayTime.value=0.25;
      const del=ctx.createGain();del.gain.value=delActive?0.18:0;delRef.current=del;
      // Signal chain: stems → dry → bass → mid → high → master → analyser → dest
      // IA EQ nodes (post master EQ, pre reverb/delay)
      const iaLo=ctx.createBiquadFilter();iaLo.type='lowshelf';iaLo.frequency.value=120;iaLo.gain.value=0;iaEqLoRef.current=iaLo;
      const iaMid=ctx.createBiquadFilter();iaMid.type='peaking';iaMid.frequency.value=2500;iaMid.Q.value=0.8;iaMid.gain.value=0;iaEqMidRef.current=iaMid;
      const iaHi=ctx.createBiquadFilter();iaHi.type='highshelf';iaHi.frequency.value=8000;iaHi.gain.value=0;iaEqHiRef.current=iaHi;
      dry.connect(bass);bass.connect(mid);mid.connect(high);high.connect(iaLo);iaLo.connect(iaMid);iaMid.connect(iaHi);iaHi.connect(master);
      // Parallel FX
      dry.connect(revDelay);revDelay.connect(rev);rev.connect(master);
      dry.connect(delNode);delNode.connect(del);del.connect(master);
      setLoadPct(20);
      const arr:Stem[]=[];
      for(let i=0;i<allFiles.length;i++){
        const file=allFiles[i];
        setLoadPct(20+Math.round((i/allFiles.length)*72));
        try{
          const ab=await file.arrayBuffer();
          const buf=await ctx.decodeAudioData(ab);
          const gain=ctx.createGain();gain.gain.value=1;
          const pan=ctx.createStereoPanner();pan.pan.value=0;
          const an=ctx.createAnalyser();an.fftSize=256;an.smoothingTimeConstant=0.7;
          const el=ctx.createBiquadFilter();el.type='lowshelf';el.frequency.value=200;el.gain.value=0;
          const em=ctx.createBiquadFilter();em.type='peaking';em.frequency.value=1000;em.Q.value=1;em.gain.value=0;
          const eh=ctx.createBiquadFilter();eh.type='highshelf';eh.frequency.value=5000;eh.gain.value=0;
          gain.connect(pan);pan.connect(el);el.connect(em);em.connect(eh);eh.connect(an);an.connect(dry);
          const info=detectInfo(file.name);
          arr.push({id:`s${i}`,name:file.name.replace(/\.[^.]+$/,''),file,buffer:buf,gainNode:gain,panNode:pan,analyserNode:an,eqLow:el,eqMid:em,eqHigh:eh,volume:0,pan:0,muted:false,solo:false,waveformPeaks:genPeaks(buf,300),instrument:info.instrument,icon:info.icon,color:COLORS[i%COLORS.length],startOffset:0,endOffset:buf.duration,fadeIn:0,fadeOut:0});
        }catch(e){console.error('decode',file.name,e);}
      }
      setStems(arr);
      setDuration(arr.length?Math.max(...arr.map(s=>s.buffer.duration)):0);
      if(arr.length)setSelId(arr[0].id);
      setLoadPct(100);setLoading(false);
      startFFT();
    }catch(e){console.error('initAudio',e);setLoading(false);}
  };

  const startFFT=()=>{
    const tick=()=>{
      rafRef.current=requestAnimationFrame(tick);
      const an=analyserRef.current;const c=fftRef.current;
      if(an&&c){
        const data=new Uint8Array(an.frequencyBinCount);an.getByteFrequencyData(data);
        const dpr=window.devicePixelRatio||1,w=c.offsetWidth,h=c.offsetHeight;
        if(!w)return;
        c.width=w*dpr;c.height=h*dpr;
        const ctx=c.getContext('2d');if(!ctx)return;
        ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
        const bw=w/data.length;
        for(let i=0;i<data.length;i++){
          const pct=data[i]/255,bh=pct*h;
          const g=ctx.createLinearGradient(0,h-bh,0,h);
          g.addColorStop(0,'#ec4899');g.addColorStop(1,'rgba(192,38,211,0.1)');
          ctx.fillStyle=g;ctx.fillRect(i*bw,h-bh,Math.max(1,bw-1),bh);
        }
        let sum=0;for(let i=0;i<data.length;i++)sum+=data[i]*data[i];
        const rms=Math.sqrt(sum/data.length);const lv=rms>0?-60+rms*0.42:-60;
        setMomLufs(Math.max(-60,Math.min(0,lv)));
        lufsHist.current.push(lv);if(lufsHist.current.length>300)lufsHist.current.shift();
        setIntLufs(Math.max(-60,Math.min(0,lufsHist.current.reduce((a,b)=>a+b,0)/lufsHist.current.length)));
      }
    };tick();
  };

  const playPause=async()=>{
    const ctx=ctxRef.current;if(!ctx||stems.length===0)return;
    const playableStems=stems.filter(s=>!s.muted);
    if(!playing&&playableStems.length===0)return; // nada que reproducir
    if(ctx.state==='suspended')await ctx.resume();
    if(playing){
      stems.forEach(s=>{try{s.sourceNode?.stop();s.sourceNode?.disconnect();}catch(e){}});
      setPlaying(false);pauseRef.current=currentTime;
      if(timerRef.current)clearInterval(timerRef.current);
    }else{
      const t0=ctx.currentTime,off=pauseRef.current;
      const upd=stems.map(s=>{
        if(!s.muted){
          const src=ctx.createBufferSource();src.buffer=s.buffer;
          src.connect(s.gainNode);src.start(t0,off);
          return{...s,sourceNode:src};
        }return s;
      });
      setStems(upd);setPlaying(true);
      timerRef.current=window.setInterval(()=>{
        const el=ctx.currentTime-t0+off;
        setCurrentTime(Math.min(el,duration));
        if(el>=duration)stopAll();
      },80);
    }
  };

  const stopAll=()=>{
    stems.forEach(s=>{try{s.sourceNode?.stop();s.sourceNode?.disconnect();}catch(e){}});
    setStems(p=>p.map(s=>({...s,sourceNode:undefined})));
    setPlaying(false);setCurrentTime(0);pauseRef.current=0;
    if(timerRef.current)clearInterval(timerRef.current);
  };

  const muteStem=(id:string)=>{
    const ctx=ctxRef.current;
    setStems(p=>p.map(s=>{if(s.id===id){const m=!s.muted;if(ctx)s.gainNode.gain.setTargetAtTime(m?0:Math.pow(10,s.volume/20),ctx.currentTime,0.01);return{...s,muted:m};}return s;}));
  };
  const soloStem=(id:string)=>{
    setStems(p=>{
      const any=p.some(s=>s.id===id?!s.solo:s.solo);
      return p.map(s=>{
        const sl=s.id===id?!s.solo:any?false:s.solo;
        const ctx=ctxRef.current;
        if(ctx)s.gainNode.gain.setTargetAtTime(!sl&&any?0:Math.pow(10,s.volume/20),ctx.currentTime,0.01);
        return{...s,solo:sl};
      });
    });
  };
  const setVol=(id:string,db:number)=>{
    const ctx=ctxRef.current;
    setStems(p=>p.map(s=>{if(s.id===id){if(ctx)s.gainNode.gain.setTargetAtTime(Math.pow(10,db/20),ctx.currentTime,0.01);return{...s,volume:db};}return s;}));
  };
  const setPan=(id:string,val:number)=>{
    const ctx=ctxRef.current;
    setStems(p=>p.map(s=>{if(s.id===id){if(ctx)s.panNode.pan.setTargetAtTime(val/100,ctx.currentTime,0.01);return{...s,pan:val};}return s;}));
  };
  const updateStemEQ=(id:string,band:'low'|'mid'|'high',val:number)=>{
    const ctx=ctxRef.current;
    setStems(p=>p.map(s=>{
      if(s.id!==id)return s;
      if(ctx){
        if(band==='low'){s.eqLow.gain.value=val;s.eqLow.gain.setTargetAtTime(val,ctx.currentTime,0.02);}
        else if(band==='mid'){s.eqMid.gain.value=val;s.eqMid.gain.setTargetAtTime(val,ctx.currentTime,0.02);}
        else{s.eqHigh.gain.value=val;s.eqHigh.gain.setTargetAtTime(val,ctx.currentTime,0.02);}
      }
      return{...s};
    }));
  };
  const applyPreset=(p:MixPreset)=>{
    setPreset(p);setBassGain(p.bass);setMidGain(p.mid);setHighGain(p.high);
    setRevActive(p.reverbWet>0);setDelActive(p.delayWet>0);setWidActive(p.stereoWidth>0.5);
    const ctx=ctxRef.current;
    if(bassRef.current&&ctx)bassRef.current.gain.setTargetAtTime(p.bass,ctx.currentTime,0.05);
    if(midRef.current&&ctx)midRef.current.gain.setTargetAtTime(p.mid,ctx.currentTime,0.05);
    if(highRef.current&&ctx)highRef.current.gain.setTargetAtTime(p.high,ctx.currentTime,0.05);
    if(revRef.current&&ctx)revRef.current.gain.setTargetAtTime(p.reverbWet>0?0.2:0,ctx.currentTime,0.1);
    if(delRef.current&&ctx)delRef.current.gain.setTargetAtTime(p.delayWet>0?0.18:0,ctx.currentTime,0.1);
    setShowPresets(false);
  };
  const applyPresetToStem=(stemId:string,p:MixPreset)=>{
    const ctx=ctxRef.current;
    setStems(prev=>prev.map(s=>{
      if(s.id===stemId){
        if(ctx){
          s.eqLow.gain.value=p.bass;s.eqLow.gain.setTargetAtTime(p.bass,ctx.currentTime,0.02);
          s.eqMid.gain.value=p.mid;s.eqMid.gain.setTargetAtTime(p.mid,ctx.currentTime,0.02);
          s.eqHigh.gain.value=p.high;s.eqHigh.gain.setTargetAtTime(p.high,ctx.currentTime,0.02);
          // Aplicar reverb/delay si el preset los tiene
          if(revRef.current)revRef.current.gain.setTargetAtTime(p.reverbWet>0?p.reverbWet:0,ctx.currentTime,0.1);
          if(delRef.current)delRef.current.gain.setTargetAtTime(p.delayWet>0?p.delayWet:0,ctx.currentTime,0.1);
        }
        return{...s};
      }return s;
    }));
  };
  const updMasterEQ=(band:'bass'|'mid'|'high',v:number)=>{
    const ctx=ctxRef.current;
    if(band==='bass'){setBassGain(v);if(bassRef.current&&ctx){bassRef.current.gain.value=v;bassRef.current.gain.setTargetAtTime(v,ctx.currentTime,0.02);}}
    else if(band==='mid'){setMidGain(v);if(midRef.current&&ctx){midRef.current.gain.value=v;midRef.current.gain.setTargetAtTime(v,ctx.currentTime,0.02);}}
    else{setHighGain(v);if(highRef.current&&ctx){highRef.current.gain.value=v;highRef.current.gain.setTargetAtTime(v,ctx.currentTime,0.02);}}
  };
  const addFiles=(files:File[])=>setAllFiles(p=>[...p,...files]);

  const toggleRecord=async()=>{
    if(recActive&&mediaRec){mediaRec.stop();setRecActive(false);return;}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mr=new MediaRecorder(stream);const chunks:Blob[]=[];
      mr.ondataavailable=e=>chunks.push(e.data);
      mr.onstop=async()=>{
        const blob=new Blob(chunks,{type:'audio/webm'});
        const file=new File([blob],`grabacion_${Date.now()}.webm`,{type:'audio/webm'});
        addFiles([file]);stream.getTracks().forEach(t=>t.stop());
      };
      mr.start();setMediaRec(mr);setRecActive(true);
    }catch{alert('Sin acceso al micrófono');}
  };

  const exportMix=async()=>{
    if(stems.length===0||exporting)return;
    // Parar reproduccion antes de exportar
    if(playing) stopAll();
    setExporting(true);
    try{
      const dur=Math.max(...stems.map(s=>s.buffer.duration));
      const off=new OfflineAudioContext(2,Math.floor(44100*dur),44100);
      const mg=off.createGain();mg.gain.value=0.85;
      const ba=off.createBiquadFilter();ba.type='lowshelf';ba.frequency.value=200;ba.gain.value=bassGain;
      const mi=off.createBiquadFilter();mi.type='peaking';mi.frequency.value=1000;mi.Q.value=1;mi.gain.value=midGain;
      const hi=off.createBiquadFilter();hi.type='highshelf';hi.frequency.value=5000;hi.gain.value=highGain;
      ba.connect(mi);mi.connect(hi);hi.connect(mg);mg.connect(off.destination);
      stems.filter(s=>!s.muted).forEach(s=>{
        const src=off.createBufferSource();src.buffer=s.buffer;
        const g=off.createGain();g.gain.value=Math.pow(10,s.volume/20);
        const p=off.createStereoPanner();p.pan.value=s.pan/100;
        // Apply fade in/out
        if(s.fadeIn>0)g.gain.setValueCurveAtTime(new Float32Array([0,1]),0,s.buffer.duration*s.fadeIn);
        if(s.fadeOut>0)g.gain.setValueCurveAtTime(new Float32Array([1,0]),s.buffer.duration*(1-s.fadeOut),s.buffer.duration*s.fadeOut);
        src.connect(g);g.connect(p);p.connect(ba);src.start(0);
      });
      const rendered=await off.startRendering();
      const wav=toWav(rendered);
      const blob=new Blob([wav],{type:'audio/wav'});
      const url=URL.createObjectURL(blob);
      const pk=genPeaks(rendered,800);
      onExport({audioBuffer:rendered,audioUrl:url,waveformPeaks:pk,finalLufs:intLufs,presetName:preset.name});
    }catch(e){console.error('export',e);}
    setExporting(false);
  };

  const updateStem=(id:string,changes:Partial<Stem>)=>{
    const ctx=ctxRef.current;
    setStems(p=>p.map(s=>{
      if(s.id!==id)return s;
      const ns={...s,...changes};
      if(changes.volume!==undefined&&ctx)s.gainNode.gain.setTargetAtTime(Math.pow(10,changes.volume/20),ctx.currentTime,0.01);
      return ns;
    }));
  };

  const selStem=stems.find(s=>s.id===selId)||stems[0];
  const pct=duration>0?currentTime/duration:0;
  const isPro=user?.is_pro||user?.plan==='unlimited';
  const CLIP_W=1600;

  if(loading)return(
    <div style={{width:'100%',height:'100vh',background:T.bgDeep,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui',color:T.text}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:72,height:72,margin:'0 auto 20px',background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`,borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>✦</div>
        <div style={{fontSize:16,fontWeight:600,marginBottom:8}}>Cargando MixingStudio AI</div>
        <div style={{width:260,height:5,background:'rgba(192,38,211,0.15)',borderRadius:3,margin:'16px auto',overflow:'hidden'}}>
          <div style={{height:'100%',background:`linear-gradient(90deg,${T.fuchsia},${T.pink})`,borderRadius:3,width:`${loadPct}%`,transition:'width 0.3s'}}/>
        </div>
        <div style={{fontSize:11,color:T.pink,fontFamily:'monospace'}}>{loadPct}%</div>
      </div>
    </div>
  );

  return(
    <div style={{width:'100%',height:'100vh',background:`radial-gradient(ellipse at 80% -10%,rgba(192,38,211,0.15),transparent 50%),${T.bgDeep}`,fontFamily:'-apple-system,BlinkMacSystemFont,"DM Sans",system-ui,sans-serif',color:T.text,display:'flex',flexDirection:'column',overflow:'hidden'}}>

      <FlowNav active="studio" onNavigate={id=>{ stopAll(); if(onNavigate)onNavigate(id);else onBack(); }} user={user} onLogout={onLogout}/>

      {/* TITLE BAR */}
      <div style={{padding:'7px 16px',display:'flex',alignItems:'center',gap:10,borderBottom:`0.5px solid ${T.border}`,background:'rgba(10,6,18,0.8)',flexShrink:0,flexWrap:'wrap'}}>
        <div style={{width:7,height:7,background:T.fuchsia,borderRadius:2}}/>
        <span style={{fontSize:15,fontWeight:700,background:`linear-gradient(90deg,${T.pink},${T.violet})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>MixingStudio AI</span>
        <span style={{fontSize:10,color:T.text3}}>{stems.length} tracks · {fmt(duration)}</span>

        {/* Preset picker */}
        <div style={{position:'relative'}}>
          <button onClick={()=>setShowPresets(!showPresets)} style={{padding:'3px 10px',borderRadius:980,background:`${preset.color}22`,border:`1.5px solid ${preset.color}`,color:preset.color,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4}}>
            ✦ {preset.name} ▾
          </button>
          {showPresets&&(
            <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,zIndex:300,background:T.surfaceSolid,border:`1px solid ${T.borderStrong}`,borderRadius:12,padding:8,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5,minWidth:360,boxShadow:'0 12px 40px rgba(0,0,0,0.7)'}}>
              {PRESETS.map(p=>(
                <button key={p.id} onClick={()=>applyPreset(p)} style={{background:`${p.color}11`,border:`1px solid ${p.id===preset.id?p.color:p.color+'22'}`,borderRadius:7,padding:'7px 5px',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>
                  <div style={{height:14,display:'flex',alignItems:'flex-end',gap:'1px',marginBottom:3}}>
                    {p.wavePattern.map((h,i)=><div key={i} style={{flex:1,height:`${h*100}%`,background:p.color,borderRadius:'1px 1px 0 0',opacity:0.85}}/>)}
                  </div>
                  <div style={{fontSize:10,fontWeight:700,color:T.text}}>{p.name}</div>
                  <div style={{fontSize:8,color:p.color,marginTop:1}}>B:{p.bass>0?'+':''}{p.bass} R:{Math.round(p.reverbWet*100)}%</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{flex:1}}/>

        {/* Transport */}
        <button onClick={stopAll} style={{width:26,height:26,borderRadius:6,background:'rgba(255,255,255,0.04)',border:`0.5px solid ${T.border}`,cursor:'pointer',color:T.text2,fontSize:10,display:'flex',alignItems:'center',justifyContent:'center'}}>⏹</button>
        <button onClick={playPause} disabled={stems.length===0} style={{width:30,height:30,borderRadius:7,background:stems.length?`linear-gradient(135deg,${T.fuchsia},${T.pink})`:'rgba(255,255,255,0.04)',border:'none',cursor:stems.length?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:stems.length?`0 0 12px ${T.fuchsia}66`:'none'}}>
          {playing?<span style={{fontSize:11,color:'#fff'}}>⏸</span>:<span style={{fontSize:13,color:'#fff'}}>▶</span>}
        </button>
        <span style={{fontFamily:'monospace',fontSize:11,color:T.text,padding:'3px 7px',background:'rgba(8,4,16,0.5)',borderRadius:5}}>{fmt(currentTime)}/{fmt(duration)}</span>

        <button onClick={toggleRecord} style={{height:26,padding:'0 9px',borderRadius:6,background:recActive?'rgba(239,68,68,0.15)':'rgba(255,255,255,0.04)',border:`0.5px solid ${recActive?T.red:T.border}`,color:recActive?T.red:T.text2,fontSize:10,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:recActive?T.red:T.text3,display:'inline-block'}}/>
          {recActive?'Detener':'🎤 Grabar'}
        </button>

        <label style={{height:26,padding:'0 9px',borderRadius:6,background:'rgba(255,255,255,0.04)',border:`0.5px solid ${T.border}`,color:T.text2,fontSize:10,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4}}>
          <input type="file" multiple accept="audio/*" style={{display:'none'}} onChange={e=>{if(e.target.files)addFiles(Array.from(e.target.files));e.target.value='';}}/>
          ⬆ Stems ({stems.length}/12)
        </label>

        {onSwitchToMixer && (
          <button onClick={()=>{stopAll();onSwitchToMixer();}} style={{height:30,padding:'0 12px',borderRadius:980,background:'rgba(168,85,247,0.15)',border:'1px solid rgba(168,85,247,0.4)',color:'#a855f7',fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
            🎚️ Mixer rápido
          </button>
        )}
        <button onClick={exportMix} disabled={stems.length===0||exporting} style={{height:30,padding:'0 14px',borderRadius:980,background:stems.length?`linear-gradient(135deg,${T.fuchsia},${T.pink})`:'rgba(255,255,255,0.04)',border:'none',color:'#fff',fontSize:10,fontWeight:600,cursor:stems.length?'pointer':'not-allowed',fontFamily:'inherit',boxShadow:stems.length?`0 0 14px ${T.fuchsia}55`:'none'}}>
          {exporting?'Exportando…':'⬇ Exportar Mezcla'}
        </button>
      </div>

      {/* BODY */}
      <div style={{flex:1,display:'flex',minHeight:0,overflow:'hidden'}}>

        {/* LEFT INSPECTOR */}
        <div style={{width:192,flexShrink:0,background:'rgba(12,7,22,0.9)',borderRight:`0.5px solid ${T.border}`,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'9px 11px',borderBottom:`0.5px solid ${T.border}`}}>
            <div style={{fontSize:8,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:5}}>Inspector</div>
            {selStem?(
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{width:3,height:22,borderRadius:2,background:selStem.color}}/>
                {renamingId===selStem.id?(
                  <input value={renameVal} onChange={e=>setRenameVal(e.target.value)}
                    onBlur={()=>{updateStem(selStem.id,{name:renameVal});setRenamingId(null);}}
                    onKeyDown={e=>{if(e.key==='Enter'){updateStem(selStem.id,{name:renameVal});setRenamingId(null);}}}
                    autoFocus style={{flex:1,background:'transparent',border:`1px solid ${T.borderStrong}`,borderRadius:4,padding:'2px 6px',color:T.text,fontSize:11,fontFamily:'inherit',outline:'none'}}/>
                ):(
                  <div style={{flex:1,minWidth:0}} onDoubleClick={()=>{setRenamingId(selStem.id);setRenameVal(selStem.name);}}>
                    <div style={{fontSize:11,fontWeight:600,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selStem.name}</div>
                    <div style={{fontSize:9,color:T.text3}}>{selStem.instrument} · doble clic para renombrar</div>
                  </div>
                )}
              </div>
            ):<div style={{fontSize:10,color:T.text3}}>Selecciona un track</div>}
          </div>
          {selStem&&(
            <div style={{flex:1,overflow:'auto',padding:'10px 11px'}}>
              {/* Volume */}
              <div style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:9,color:T.text2}}>Volumen</span>
                  <span style={{fontSize:9,color:selStem.color,fontFamily:'monospace',fontWeight:600}}>{selStem.volume>0?'+':''}{selStem.volume} dB</span>
                </div>
                <HSlider value={selStem.volume} min={-24} max={6} step={1} color={selStem.color} onChange={v=>setVol(selStem.id,v)}/>
              </div>
              {/* Pan */}
              <div style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:9,color:T.text2}}>Paneo</span>
                  <span style={{fontSize:9,color:T.amber,fontFamily:'monospace',fontWeight:600}}>{selStem.pan===0?'C':selStem.pan>0?`R${selStem.pan}`:`L${Math.abs(selStem.pan)}`}</span>
                </div>
                <HSlider value={selStem.pan} min={-100} max={100} step={1} color={T.amber} onChange={v=>setPan(selStem.id,v)}/>
              </div>
              {/* EQ */}
              <div style={{fontSize:8,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:7}}>EQ — Stem</div>
              {[{l:'Bass',b:'low'as const,c:T.pink,v:Math.round(selStem.eqLow.gain.value)},{l:'Mid',b:'mid'as const,c:T.fuchsia,v:Math.round(selStem.eqMid.gain.value)},{l:'High',b:'high'as const,c:T.violet,v:Math.round(selStem.eqHigh.gain.value)}].map(eq=>(
                <div key={eq.l} style={{marginBottom:9}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontSize:9,color:T.text2}}>{eq.l}</span>
                    <span style={{fontSize:9,color:eq.c,fontFamily:'monospace',fontWeight:600}}>{eq.v>0?'+':''}{eq.v} dB</span>
                  </div>
                  <HSlider value={eq.v} min={-12} max={12} step={1} color={eq.c} onChange={v=>updateStemEQ(selStem.id,eq.b,v)}/>
                </div>
              ))}
              {/* Presets de género — miniaturas visuales */}
              <div style={{fontSize:8,color:T.text3,letterSpacing:.5,textTransform:'uppercase',margin:'10px 0 6px'}}>Preset para este stem</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:4}}>
                {PRESETS.map(p=>(
                  <button key={p.id} onClick={()=>applyPresetToStem(selStem.id,p)}
                    style={{background:`${p.color}11`,border:`1px solid ${p.color}33`,borderRadius:7,padding:'5px 4px',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>
                    <div style={{height:12,display:'flex',alignItems:'flex-end',gap:'1px',marginBottom:3}}>
                      {p.wavePattern.map((h:number,i:number)=><div key={i} style={{flex:1,height:`${h*100}%`,background:p.color,borderRadius:'1px 1px 0 0',opacity:0.85}}/>)}
                    </div>
                    <div style={{fontSize:8,fontWeight:700,color:T.text}}>{p.name}</div>
                  </button>
                ))}
              </div>
              {/* Edit button */}
              <button onClick={()=>setEditStem(selStem)} style={{width:'100%',marginTop:12,padding:'8px',borderRadius:8,background:'rgba(192,38,211,0.1)',border:`0.5px solid ${T.borderStrong}`,color:T.pink,fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                ✏ Editar · Fade · Recortar
              </button>
            </div>
          )}
        </div>

        {/* CENTER TIMELINE */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minHeight:0}}>
          <div style={{height:24,padding:'0 10px',borderBottom:`0.5px solid ${T.border}`,display:'flex',alignItems:'center',gap:10,background:'rgba(8,4,12,0.6)',flexShrink:0,fontSize:9,color:T.text3,fontFamily:'monospace'}}>
            <span>Snap 1/4</span><span style={{width:.5,height:8,background:T.border}}/>
            <span>Zoom 100%</span>
            <div style={{flex:1}}/>
            <span style={{color:T.green}}>● Spotify -14 ✓</span>
          </div>
          <div style={{flex:1,display:'flex',minHeight:0,overflow:'hidden'}}>
            {/* Track headers */}
            <div style={{width:180,flexShrink:0,borderRight:`0.5px solid ${T.border}`,background:'rgba(12,7,22,0.85)',display:'flex',flexDirection:'column'}}>
              <div style={{height:20,padding:'0 10px',display:'flex',alignItems:'center',fontSize:8,color:T.text3,letterSpacing:.4,textTransform:'uppercase',borderBottom:`0.5px solid ${T.border}`,flexShrink:0}}>Tracks</div>
              <div style={{flex:1,overflowY:'auto'}}>
                {stems.length===0&&(
                  <div style={{padding:20,textAlign:'center'}}>
                    <div style={{fontSize:26,marginBottom:8}}>🎵</div>
                    <div style={{fontSize:11,fontWeight:600,color:T.text,marginBottom:4}}>Sube stems para empezar</div>
                    <div style={{fontSize:9,color:T.text3}}>Botón "Stems" arriba a la derecha</div>
                  </div>
                )}
                {stems.map(s=>(
                  <div key={s.id} onClick={()=>setSelId(s.id)}
                    onContextMenu={e=>{e.preventDefault();setCtxMenu({x:e.clientX,y:e.clientY,stemId:s.id});setSelId(s.id);}}
                    onDoubleClick={()=>setEditStem(s)}
                    style={{height:TH,padding:'5px 8px',borderBottom:`0.5px solid ${T.border}`,display:'flex',alignItems:'center',gap:5,background:selId===s.id?'rgba(192,38,211,0.08)':'transparent',cursor:'pointer'}}>
                    <span style={{width:3,height:26,borderRadius:2,background:s.color,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:10,fontWeight:500,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {s.icon} {s.name}
                      </div>
                      <input type="range" min={-24} max={6} step={1} value={s.volume}
                        onChange={e=>{e.stopPropagation();setVol(s.id,+e.target.value);}}
                        onClick={e=>e.stopPropagation()}
                        style={{width:'100%',accentColor:s.color,height:3,marginTop:4,cursor:'pointer'}}/>
                    </div>
                    <button onClick={e=>{e.stopPropagation();muteStem(s.id);}} style={{width:15,height:15,borderRadius:3,background:s.muted?T.amber:'transparent',color:s.muted?'#000':T.text3,border:`0.5px solid ${s.muted?T.amber:T.border}`,fontSize:7,fontWeight:700,cursor:'pointer',flexShrink:0}}>M</button>
                    <button onClick={e=>{e.stopPropagation();soloStem(s.id);}} style={{width:15,height:15,borderRadius:3,background:s.solo?T.pink:'transparent',color:s.solo?'#fff':T.text3,border:`0.5px solid ${s.solo?T.pink:T.border}`,fontSize:7,fontWeight:700,cursor:'pointer',flexShrink:0}}>S</button>
                  </div>
                ))}
                <label style={{height:TH,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',borderBottom:`0.5px solid ${T.border}`}}>
                  <input type="file" multiple accept="audio/*" style={{display:'none'}} onChange={e=>{if(e.target.files)addFiles(Array.from(e.target.files));e.target.value='';}}/>
                  <div style={{border:`1px dashed ${T.borderStrong}`,borderRadius:6,padding:'5px 10px',fontSize:9,color:T.pink,fontWeight:500,display:'flex',alignItems:'center',gap:4}}>✦ Nueva pista</div>
                </label>
              </div>
            </div>

            {/* Timeline clips + scroll */}
            <div style={{flex:1,overflow:'auto',position:'relative',background:'rgba(8,4,12,0.5)'}}>
              {/* Ruler - click y drag para seek */}
              <div style={{height:20,position:'sticky',top:0,zIndex:3,background:'rgba(12,7,22,0.98)',borderBottom:`0.5px solid ${T.border}`,display:'flex',alignItems:'center',padding:'0 0 0 6px',cursor:'pointer',userSelect:'none'}}
                onMouseDown={e=>{
                  const rulerRect=e.currentTarget.getBoundingClientRect();
                  const seek=(clientX:number)=>{
                    const rect=rulerRect;
                    const p=Math.max(0,Math.min(1,(clientX-rect.left)/rect.width));
                    const newTime=p*duration;
                    pauseRef.current=newTime;
                    setCurrentTime(newTime);
                    if(playing){
                      stems.forEach(s=>{try{s.sourceNode?.stop();s.sourceNode?.disconnect();}catch(e){}});
                      if(timerRef.current)clearInterval(timerRef.current);
                      const ctx2=ctxRef.current;
                      if(ctx2){
                        const t0=ctx2.currentTime;
                        const upd=stems.map(s=>{
                          if(!s.muted){const src=ctx2.createBufferSource();src.buffer=s.buffer;src.connect(s.gainNode);src.start(t0,newTime);return{...s,sourceNode:src};}return s;
                        });
                        setStems(upd);
                        timerRef.current=window.setInterval(()=>{
                          const el=ctx2.currentTime-t0+newTime;
                          setCurrentTime(Math.min(el,duration));
                          if(el>=duration)stopAll();
                        },80);
                      }
                    }
                  };
                  seek(e.clientX);
                  const onMove=(ev:MouseEvent)=>seek(ev.clientX);
                  const onUp=()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp);};
                  window.addEventListener('mousemove',onMove);
                  window.addEventListener('mouseup',onUp);
                }}>
                {Array.from({length:32}).map((_,i)=>(
                  <div key={i} style={{width:50,fontSize:8,color:i%4===0?T.text3:'rgba(122,106,144,0.2)',fontFamily:'monospace',flexShrink:0,borderLeft:`0.5px solid ${i%4===0?T.border:'transparent'}`,paddingLeft:2}}>
                    {i%4===0?`${i+1}`:''}
                  </div>
                ))}
              </div>
              <div style={{position:'relative',minWidth:'max-content',minHeight:stems.length*TH+TH}}>
                {stems.map((s,i)=>{
                  const clipW=duration>0?Math.round((s.buffer.duration/duration)*CLIP_W):CLIP_W;
                  return(
                    <div key={s.id} style={{height:TH,borderBottom:`0.5px solid ${T.border}`,background:i%2===0?'rgba(255,255,255,0.007)':'transparent',position:'relative',display:'flex',alignItems:'center',padding:'3px 6px'}}>
                      <div style={{borderRadius:5,overflow:'hidden',background:`${s.color}cc`,border:`0.5px solid ${s.color}`,width:clipW,height:TH-8,position:'relative',cursor:'pointer',opacity:s.muted?0.3:1}}
                        onDoubleClick={()=>setEditStem(s)}
                        onContextMenu={e=>{e.preventDefault();setCtxMenu({x:e.clientX,y:e.clientY,stemId:s.id});}}>
                        <div style={{position:'absolute',top:3,left:7,fontSize:8,fontWeight:600,color:'#fff',zIndex:1,whiteSpace:'nowrap',textShadow:'0 1px 2px rgba(0,0,0,0.5)'}}>{s.icon} {s.name}</div>
                        <WaveClip p={s.waveformPeaks} color={s.color} w={clipW} h={TH-8} muted={s.muted} fadeIn={s.fadeIn} fadeOut={s.fadeOut}/>
                      </div>
                    </div>
                  );
                })}

                {/* Playhead */}
                {duration>0&&(
                  <div style={{position:'absolute',top:0,bottom:0,left:`${pct*CLIP_W}px`,width:2,background:T.pink,pointerEvents:'none',boxShadow:`0 0 8px ${T.pink}`,zIndex:5}}>
                    <div style={{position:'absolute',top:0,left:-5,width:12,height:7,background:T.pink,clipPath:'polygon(0 0,100% 0,50% 100%)'}}/>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MIXER — faders verticales debajo del timeline */}
          {stems.length>0&&(
            <div style={{height:220,flexShrink:0,borderTop:`1px solid ${T.borderStrong}`,background:'rgba(8,4,18,0.95)',display:'flex',overflow:'hidden'}}>
              {/* Mixer label */}
              <div style={{width:180,flexShrink:0,borderRight:`0.5px solid ${T.border}`,padding:'10px 12px',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize:9,fontWeight:700,color:T.text,letterSpacing:.5}}>MIXER</div>
                  <div style={{fontSize:8,color:T.text3,marginTop:2}}>Volumen · Paneo · Presets</div>
                </div>
                <div style={{fontSize:8,color:T.text3}}>Doble clic en clip para editar</div>
              </div>
              {/* Faders */}
              <div style={{flex:1,display:'flex',overflowX:'auto',padding:'10px 8px',gap:8}}>
                {stems.map(s=>(
                  <div key={s.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,minWidth:52,padding:'0 4px',background:selId===s.id?`${s.color}08`:'transparent',borderRadius:8,border:selId===s.id?`0.5px solid ${s.color}33`:'0.5px solid transparent',cursor:'pointer'}}
                    onClick={()=>setSelId(s.id)}>
                    {/* Track name */}
                    <div style={{fontSize:8,fontWeight:600,color:s.color,textAlign:'center',maxWidth:50,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</div>
                    {/* Instrument icon */}
                    <div style={{fontSize:14}}>{s.icon}</div>
                    {/* Volume value */}
                    <div style={{fontSize:8,color:T.text3,fontFamily:'monospace'}}>{s.volume>0?'+':''}{s.volume}</div>
                    {/* Vertical fader */}
                    <VFader value={s.volume} onChange={v=>setVol(s.id,v)} color={s.color} height={80}/>
                    {/* Pan knob (simple slider) */}
                    <div style={{width:44}}>
                      <div style={{fontSize:7,color:T.text3,textAlign:'center',marginBottom:2}}>{s.pan===0?'C':s.pan>0?`R${s.pan}`:`L${Math.abs(s.pan)}`}</div>
                      <input type="range" min={-100} max={100} step={1} value={s.pan}
                        onChange={e=>setPan(s.id,+e.target.value)}
                        style={{width:'100%',accentColor:T.amber,height:3,cursor:'pointer'}}/>
                    </div>
                    {/* M/S buttons */}
                    <div style={{display:'flex',gap:3}}>
                      <button onClick={e=>{e.stopPropagation();muteStem(s.id);}} style={{width:18,height:14,fontSize:7,fontWeight:700,borderRadius:3,background:s.muted?T.amber:'rgba(255,255,255,0.06)',color:s.muted?'#000':T.text3,border:`0.5px solid ${s.muted?T.amber:T.border}`,cursor:'pointer'}}>M</button>
                      <button onClick={e=>{e.stopPropagation();soloStem(s.id);}} style={{width:18,height:14,fontSize:7,fontWeight:700,borderRadius:3,background:s.solo?T.pink:'rgba(255,255,255,0.06)',color:s.solo?'#fff':T.text3,border:`0.5px solid ${s.solo?T.pink:T.border}`,cursor:'pointer'}}>S</button>
                    </div>
                    {/* Mini preset selector */}
                    <select onChange={e=>{const p=PRESETS.find(x=>x.id===e.target.value);if(p)applyPresetToStem(s.id,p);}}
                      style={{width:44,fontSize:7,background:'rgba(255,255,255,0.05)',border:`0.5px solid ${T.border}`,borderRadius:4,color:T.text3,cursor:'pointer',padding:'1px 2px',fontFamily:'inherit'}}
                      defaultValue="">
                      <option value="" disabled>EQ</option>
                      {PRESETS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                ))}
                {/* Master fader */}
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,minWidth:56,padding:'0 6px',borderLeft:`1px solid ${T.borderStrong}`,marginLeft:8}}>
                  <div style={{fontSize:8,fontWeight:700,color:T.text}}>MASTER</div>
                  <div style={{fontSize:14}}>🎚️</div>
                  <div style={{fontSize:8,color:T.pink,fontFamily:'monospace'}}>0 dB</div>
                  <VFader value={0} onChange={()=>{}} color={T.pink} height={80}/>
                  <div style={{fontSize:7,color:T.text3,textAlign:'center'}}>C</div>
                  <div style={{padding:'2px 6px',borderRadius:980,background:`${preset.color}18`,color:preset.color,fontSize:7,fontWeight:600,border:`0.5px solid ${preset.color}33`,maxWidth:50,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textAlign:'center'}}>✦ {preset.name}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: MIX BUS */}
        <div style={{width:268,flexShrink:0,background:'rgba(12,7,22,0.9)',borderLeft:`0.5px solid ${T.border}`,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{display:'flex',padding:4,gap:3,borderBottom:`0.5px solid ${T.border}`,flexShrink:0}}>
            {(['mix','gen','stems'] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{flex:1,height:24,borderRadius:5,background:tab===t?'rgba(192,38,211,0.18)':'transparent',color:tab===t?T.pink:T.text2,border:tab===t?`0.5px solid ${T.borderStrong}`:'0.5px solid transparent',fontSize:10,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                {t==='mix'?'Mix Bus':t==='gen'?'Generar':'Stems'}
              </button>
            ))}
          </div>

          <div style={{flex:1,overflow:'auto'}}>
            {tab==='mix'&&(
              <div style={{padding:10,display:'flex',flexDirection:'column',gap:9}}>
                {/* LUFS */}
                <div style={{background:T.surface,borderRadius:9,padding:10,border:`0.5px solid ${T.border}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
                    <span style={{fontSize:8,color:T.text3,letterSpacing:.5,textTransform:'uppercase'}}>LUFS — VU Meter</span>
                    <span style={{fontSize:8,fontWeight:700,padding:'1px 6px',borderRadius:980,background:momLufs>-14?'rgba(239,68,68,0.1)':momLufs<-30?'rgba(255,255,255,0.05)':'rgba(74,222,128,0.08)',color:momLufs>-14?T.red:momLufs<-30?T.text3:T.green,border:`0.5px solid ${momLufs>-14?T.red:momLufs<-30?T.border:T.green}33`}}>
                      {momLufs>-14?'Loud':momLufs<-30?'Soft':'Safe'}
                    </span>
                  </div>
                  <div style={{display:'flex',gap:2,height:40,alignItems:'flex-end',marginBottom:6}}>
                    {Array.from({length:20}).map((_,i)=>{const th=-60+i*3;const lit=momLufs>th;const c=th>-9?T.red:th>-18?T.amber:T.green;return <div key={i} style={{flex:1,height:`${(i/20)*100+15}%`,borderRadius:'1px 1px 0 0',background:lit?c:'rgba(255,255,255,0.04)',transition:'background 0.05s'}}/>;})}</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
                    {[{l:'MOM',v:momLufs},{l:'INT',v:intLufs}].map(m=>(
                      <div key={m.l} style={{background:'rgba(8,4,16,0.6)',borderRadius:6,padding:'5px',textAlign:'center',border:`0.5px solid ${T.border}`}}>
                        <div style={{fontFamily:'monospace',fontSize:13,fontWeight:600,color:T.pink}}>{m.v.toFixed(1)}</div>
                        <div style={{fontSize:7,color:T.text3,textTransform:'uppercase'}}>{m.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:6,display:'flex',justifyContent:'space-between',fontSize:8}}><span style={{color:T.text3}}>Spotify</span><span style={{color:T.green}}>-14 LUFS</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:8}}><span style={{color:T.text3}}>YouTube</span><span style={{color:T.text3}}>-14 LUFS</span></div>
                </div>
                {/* EQ Master */}
                <div style={{background:T.surface,borderRadius:9,padding:10,border:`0.5px solid ${T.border}`}}>
                  <div style={{fontSize:8,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:9}}>EQ Master</div>
                  {[{l:'Bass',v:bassGain,c:T.pink,b:'bass'as const},{l:'Mid',v:midGain,c:T.fuchsia,b:'mid'as const},{l:'High',v:highGain,c:T.violet,b:'high'as const}].map(eq=>(
                    <div key={eq.l} style={{marginBottom:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{fontSize:9,color:T.text2}}>{eq.l}</span><span style={{fontSize:9,color:eq.c,fontFamily:'monospace',fontWeight:600}}>{eq.v>0?'+':''}{eq.v}</span></div>
                      <HSlider value={eq.v} min={-12} max={12} step={1} color={eq.c} onChange={v=>updMasterEQ(eq.b,v)}/>
                    </div>
                  ))}
                </div>
                {/* Compresión */}
                <div style={{background:T.surface,borderRadius:9,padding:10,border:`0.5px solid ${T.border}`}}>
                  <div style={{fontSize:8,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Compresión</div>
                  <div style={{fontSize:13,fontWeight:700,color:T.text,textTransform:'capitalize'}}>{preset.compression||'medium'}</div>
                  <div style={{fontSize:9,color:T.text3,marginTop:1}}>{preset.compression==='none'?'Sin comp':preset.compression==='low'?'Thr:-24 2:1':preset.compression==='medium'?'Thr:-18 4:1':preset.compression==='high'?'Thr:-14 6:1':'Thr:-10 10:1'}</div>
                  <div style={{height:3,background:'rgba(192,38,211,0.1)',borderRadius:2,marginTop:6,overflow:'hidden'}}>
                    <div style={{height:'100%',background:`linear-gradient(90deg,${T.green},${T.amber},${T.pink})`,width:preset.compression==='none'?'5%':preset.compression==='low'?'25%':preset.compression==='medium'?'45%':preset.compression==='high'?'65%':'85%'}}/>
                  </div>
                </div>
                {/* FX Master */}
                <div style={{background:T.surface,borderRadius:9,padding:10,border:`0.5px solid ${T.border}`}}>
                  <div style={{fontSize:8,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:8}}>Efectos Master</div>
                  {[{l:'Reverb',v:`${Math.round(preset.reverbWet*100)}%`,a:revActive,fn:()=>setRevActive(!revActive)},{l:'Delay',v:`${Math.round(preset.delayWet*100)}%`,a:delActive,fn:()=>setDelActive(!delActive)},{l:'Widener',v:`${Math.round(preset.stereoWidth*100)}%`,a:widActive,fn:()=>setWidActive(!widActive)}].map(fx=>(
                    <div key={fx.l} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7}}>
                      <div><div style={{fontSize:10,color:T.text}}>{fx.l}</div><div style={{fontSize:8,color:T.text3}}>{fx.v}</div></div>
                      <div onClick={fx.fn} style={{width:28,height:14,borderRadius:7,background:fx.a?T.fuchsia:'rgba(155,126,200,0.12)',position:'relative',cursor:'pointer',transition:'background 0.2s'}}>
                        <div style={{width:10,height:10,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:fx.a?16:2,transition:'left 0.15s'}}/>
                      </div>
                    </div>
                  ))}
                </div>
                {/* IA EQ */}
                <div style={{background:T.surface,borderRadius:9,padding:10,border:`0.5px solid ${T.border}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
                    <span style={{fontSize:8,color:T.text3,letterSpacing:.5,textTransform:'uppercase'}}>IA EQ — Optimizar para</span>
                    <span style={{fontSize:7,color:T.green,display:'flex',alignItems:'center',gap:2}}><span style={{width:3,height:3,borderRadius:'50%',background:T.green,display:'inline-block'}}/>Live</span>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                    {IAEQ.map(p=>(
                      <button key={p.id} onClick={()=>{
                        setIaEq(p);
                        const ctx=ctxRef.current;if(!ctx)return;
                        const t=ctx.currentTime;
                        // Presets de IA EQ: [low, mid, high] en dB
                        const presets:Record<string,[number,number,number]>={
                          default:[0,0,0],car:[-2,3,2],iphone:[-3,-1,4],macbook:[-1,0,3],
                          headphones:[3,0,2],tv:[0,2,-1],theater:[2,1,-1],bt:[-2,2,3],
                          studio:[0,0,0],gaming:[4,1,3],tablet:[-1,1,2]
                        };
                        const [lo,mi,hi]=presets[p.id]??[0,0,0];
                        if(iaEqLoRef.current)iaEqLoRef.current.gain.setTargetAtTime(lo,t,0.05);
                        if(iaEqMidRef.current)iaEqMidRef.current.gain.setTargetAtTime(mi,t,0.05);
                        if(iaEqHiRef.current)iaEqHiRef.current.gain.setTargetAtTime(hi,t,0.05);
                      }} style={{padding:'3px 7px',borderRadius:980,background:iaEq.id===p.id?`linear-gradient(135deg,${T.fuchsia},${T.pink})`:'rgba(255,255,255,0.04)',border:`0.5px solid ${iaEq.id===p.id?T.borderStrong:T.border}`,color:iaEq.id===p.id?'#fff':T.text2,fontSize:8,fontWeight:iaEq.id===p.id?600:400,cursor:'pointer',fontFamily:'inherit'}}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
                {/* FFT */}
                <div style={{background:T.surface,borderRadius:9,padding:10,border:`0.5px solid ${T.border}`}}>
                  <div style={{fontSize:8,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:5}}>Analizador FFT</div>
                  <canvas ref={fftRef} style={{width:'100%',height:48,borderRadius:5,background:'rgba(8,4,16,0.8)',display:'block'}}/>
                </div>
              </div>
            )}
            {tab==='gen'&&(
              <div style={{padding:12,display:'flex',flexDirection:'column',gap:9}}>
                <div style={{fontSize:10,color:T.text2,lineHeight:1.5}}>Genera y agrega pistas al DAW con IA.</div>
                <button onClick={()=>onNavigate?onNavigate('create'):null} style={{width:'100%',height:36,borderRadius:8,background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`,border:'none',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>✦ Crear canción completa</button>
                <button onClick={()=>onNavigate?onNavigate('separate'):null} style={{width:'100%',height:34,borderRadius:7,background:'rgba(124,58,237,0.1)',border:`0.5px solid rgba(124,58,237,0.35)`,color:T.violet,fontSize:10,cursor:'pointer',fontFamily:'inherit'}}>✂ Separar stems con Demucs</button>
                <button onClick={toggleRecord} style={{width:'100%',height:34,borderRadius:7,background:recActive?'rgba(239,68,68,0.1)':'rgba(255,255,255,0.04)',border:`0.5px solid ${recActive?T.red:T.border}`,color:recActive?T.red:T.text2,fontSize:10,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
                  <span style={{width:6,height:6,borderRadius:'50%',background:recActive?T.red:T.text3,display:'inline-block'}}/>
                  {recActive?'Detener grabación':'🎤 Grabar desde micrófono'}
                </button>
              </div>
            )}
            {tab==='stems'&&(
              <div style={{padding:10,display:'flex',flexDirection:'column',gap:6}}>
                <div style={{fontSize:8,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:2}}>Stems cargados ({stems.length}/12)</div>
                {stems.map(s=>(
                  <div key={s.id} onClick={()=>setSelId(s.id)} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 8px',background:selId===s.id?`${s.color}10`:T.surface,borderRadius:7,border:`0.5px solid ${selId===s.id?s.color+'44':T.border}`,cursor:'pointer'}}>
                    <span style={{fontSize:12}}>{s.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:10,fontWeight:500,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</div>
                      <div style={{fontSize:8,color:T.text3}}>{fmt(s.buffer.duration)} · {s.instrument}</div>
                    </div>
                    <span style={{fontSize:7,color:s.muted?T.amber:s.solo?T.pink:T.text3,fontWeight:700}}>{s.muted?'M':s.solo?'S':'—'}</span>
                  </div>
                ))}
                <label style={{width:'100%',height:32,borderRadius:7,background:'rgba(192,38,211,0.05)',border:`1px dashed ${T.borderStrong}`,color:T.pink,fontSize:9,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:4,marginTop:3}}>
                  <input type="file" multiple accept="audio/*" style={{display:'none'}} onChange={e=>{if(e.target.files)addFiles(Array.from(e.target.files));e.target.value='';}}/>⬆ Agregar más
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MASTER STRIP */}
      <div style={{height:56,flexShrink:0,borderTop:`0.5px solid ${T.border}`,background:'rgba(12,7,22,0.92)',display:'grid',gridTemplateColumns:'160px 1fr auto auto auto auto',alignItems:'center',padding:'0 12px',gap:12,overflow:'hidden'}}>
        <div>
          <div style={{fontSize:8,fontWeight:700,color:T.text,letterSpacing:.4}}>MIX BUS</div>
          <div style={{height:2,background:'rgba(255,255,255,0.06)',borderRadius:1,marginTop:3}}>
            <div style={{height:'100%',background:`linear-gradient(90deg,${T.fuchsia},${T.pink})`,borderRadius:1,width:'68%'}}/>
          </div>
          <div style={{marginTop:3,padding:'1px 6px',borderRadius:980,background:`${preset.color}15`,color:preset.color,fontSize:7,fontWeight:600,display:'inline-block',border:`0.5px solid ${preset.color}33`}}>✦ {preset.name}</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {[{l:'Bass',v:bassGain,c:T.pink},{l:'Mid',v:midGain,c:T.fuchsia},{l:'High',v:highGain,c:T.violet}].map(eq=>(
            <div key={eq.l} style={{flex:1}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}><span style={{fontSize:7,color:T.text3}}>{eq.l}</span><span style={{fontSize:7,color:eq.c,fontFamily:'monospace'}}>{eq.v>0?'+':''}{eq.v}</span></div>
              <div style={{height:2,background:'rgba(192,38,211,0.1)',borderRadius:1}}><div style={{height:'100%',background:eq.c,borderRadius:1,width:`${((eq.v+12)/24)*100}%`}}/></div>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:3}}>
          {[{l:'Rev',a:revActive},{l:'Dly',a:delActive},{l:'Wide',a:widActive}].map(fx=>(
            <span key={fx.l} style={{padding:'2px 6px',borderRadius:980,background:fx.a?`${T.fuchsia}22`:'rgba(255,255,255,0.03)',color:fx.a?T.pink:T.text3,fontSize:7,fontWeight:500,border:`0.5px solid ${fx.a?T.borderStrong:T.border}`}}>{fx.l}</span>
          ))}
        </div>
        <div style={{fontSize:8,color:T.pink,fontWeight:500,padding:'3px 8px',borderRadius:980,background:'rgba(192,38,211,0.08)',border:`0.5px solid ${T.borderStrong}`}}>IA · {iaEq.name}</div>
        <div style={{display:'flex',gap:4}}>
          {[{v:momLufs,l:'MOM'},{v:intLufs,l:'INT'}].map(m=>(
            <div key={m.l} style={{padding:'2px 6px',borderRadius:5,background:'rgba(8,4,16,0.7)',border:`0.5px solid ${T.border}`,textAlign:'center'}}>
              <div style={{fontFamily:'monospace',fontSize:10,fontWeight:600,color:T.pink}}>{m.v.toFixed(1)}</div>
              <div style={{fontSize:6,color:T.text3,textTransform:'uppercase'}}>{m.l}</div>
            </div>
          ))}
        </div>
        <span style={{fontSize:8,color:T.green,padding:'2px 7px',borderRadius:980,background:'rgba(74,222,128,0.07)',border:'0.5px solid rgba(74,222,128,0.25)'}}>+ Safe</span>
      </div>

      {/* Context menu */}
      {ctxMenu&&(
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} stemId={ctxMenu.stemId}
          onSeparate={()=>{if(onNavigate)onNavigate('separate');}}
          onRename={()=>{setRenamingId(ctxMenu.stemId);const s=stems.find(st=>st.id===ctxMenu.stemId);if(s)setRenameVal(s.name);}}
          onClose={()=>setCtxMenu(null)}/>
      )}

      {/* Track editor modal */}
      {editStem&&(
        <TrackEditor stem={editStem} onClose={()=>setEditStem(null)} onUpdate={changes=>updateStem(editStem.id,changes)}/>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

function toWav(buf:AudioBuffer):ArrayBuffer{
  const nc=buf.numberOfChannels,sr=buf.sampleRate,len=buf.length,bps=16,bpS=bps/8,ba=nc*bpS,dl=len*ba;
  const ab=new ArrayBuffer(44+dl);const v=new DataView(ab);
  const w=(o:number,s:string)=>s.split('').forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  w(0,'RIFF');v.setUint32(4,36+dl,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,nc,true);v.setUint32(24,sr,true);v.setUint32(28,sr*ba,true);v.setUint16(32,ba,true);v.setUint16(34,bps,true);w(36,'data');v.setUint32(40,dl,true);
  let off=44;for(let i=0;i<len;i++){for(let ch=0;ch<nc;ch++){const s=Math.max(-1,Math.min(1,buf.getChannelData(ch)[i]));v.setInt16(off,s<0?s*32768:s*32767,true);off+=2;}}
  return ab;
}
