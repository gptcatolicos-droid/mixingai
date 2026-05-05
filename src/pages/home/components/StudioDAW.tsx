/**
 * StudioDAW.tsx
 * DAW con el visual de Claude Design + motor de audio real del MixEditor
 * Timeline con clips y waveforms reales, inspector, presets, EQ, LUFS, exportar
 */
import { useState, useRef, useEffect } from 'react';
import FlowNav from '@/components/flow/FlowNav';
import { MixPreset, PRESETS } from './PresetScreen';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface User { id:string; firstName:string; lastName:string; email:string; country:string; credits:number; provider?:string; createdAt:string; is_pro?:boolean; plan?:string; }
interface Stem { id:string; name:string; file:File; buffer:AudioBuffer; gainNode:GainNode; panNode:StereoPannerNode; analyserNode:AnalyserNode; eqLow:BiquadFilterNode; eqMid:BiquadFilterNode; eqHigh:BiquadFilterNode; sourceNode?:AudioBufferSourceNode; volume:number; pan:number; muted:boolean; solo:boolean; fftData:Uint8Array; waveformPeaks:Float32Array; instrument:string; icon:string; color:string; }
interface StudioDAWProps { projectId:string; user:User; uploadedFiles:File[]; onBack:()=>void; onCreditsUpdate:(n:number)=>void; onExport:(d:any)=>void; initialPreset?:MixPreset; reverbOn?:boolean; delayOn?:boolean; stereoOn?:boolean; onNavigate?:(id:string)=>void; }

// ─── Constantes ───────────────────────────────────────────────────────────────
const T = { bg:'#0a0612', bgDeep:'#0F0A1A', surface:'rgba(26,16,40,0.62)', surface2:'rgba(35,20,55,0.5)', surfaceSolid:'#1a1028', text:'#F8F0FF', text2:'#b8a8d0', text3:'#7a6a90', pink:'#ec4899', fuchsia:'#C026D3', violet:'#a259ff', amber:'#fbbf24', green:'#10b981', red:'#ef4444', border:'rgba(192,38,211,0.18)', borderStrong:'rgba(192,38,211,0.45)' };
const STEM_COLORS = ['#ec4899','#10b981','#f97316','#3b82f6','#fbbf24','#a259ff','#94a3b8','#14b8a6','#f472b6','#4ade80','#fb923c','#60a5fa'];
const TRACK_H = 58;
const IAEQ_PRESETS = [
  { id:'default', name:'Default', bands:[0,0,0,0,0,0,0,0,0,0,0,0] },
  { id:'car', name:'Car', bands:[0,3,4,2,1,0,-1,0,1,2,2,1] },
  { id:'iphone', name:'iPhone', bands:[0,-2,-1,0,1,2,2,1,0,-1,-2,-3] },
  { id:'headphones', name:'Headphones', bands:[0,2,3,1,0,-1,0,1,2,3,3,2] },
  { id:'tv', name:'TV', bands:[0,-4,-3,-1,0,2,3,2,1,0,-1,-2] },
  { id:'bt', name:'Bluetooth', bands:[0,4,5,3,1,-1,-2,-1,0,1,1,0] },
  { id:'studio', name:'Studio Monitors', bands:[0,0,0,0,0,0,0,0,0,0,0,0] },
];

function detectInstrument(filename:string):{instrument:string;icon:string} {
  const n=filename.toLowerCase().replace(/[_\-\.]/g,' ');
  if(/voz|voc|vocal|lead|singer|coro|choir|bgv|backing/.test(n)) return{instrument:'Voz',icon:'🎤'};
  if(/kick|bombo|drum|perc|beat|snare|hihat/.test(n)) return{instrument:'Batería',icon:'🥁'};
  if(/bass|bajo|808|sub/.test(n)) return{instrument:'Bajo',icon:'🎸'};
  if(/guitar|guitarra|gtr/.test(n)) return{instrument:'Guitarra',icon:'🎸'};
  if(/piano|keys|keyboard|synth|pad|organ/.test(n)) return{instrument:'Teclado',icon:'🎹'};
  return{instrument:'Pista',icon:'🎵'};
}

function generatePeaks(buffer:AudioBuffer,count:number):Float32Array {
  const data=buffer.getChannelData(0);
  const peaks=new Float32Array(count);
  const step=Math.floor(data.length/count);
  for(let i=0;i<count;i++){let max=0;for(let j=0;j<step;j++){const v=Math.abs(data[i*step+j]||0);if(v>max)max=v;}peaks[i]=max;}
  return peaks;
}

function fmt(s:number){return`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;}

// ─── Clip Waveform Canvas ─────────────────────────────────────────────────────
function ClipWave({peaks,color,width,height,muted}:{peaks:Float32Array;color:string;width:number;height:number;muted:boolean}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c=ref.current;if(!c)return;
    const dpr=window.devicePixelRatio||1;
    c.width=width*dpr;c.height=height*dpr;
    const ctx=c.getContext('2d');if(!ctx)return;
    ctx.scale(dpr,dpr);ctx.clearRect(0,0,width,height);
    const cy=height/2;
    ctx.strokeStyle=muted?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.8)';
    ctx.lineWidth=1;ctx.beginPath();
    for(let i=0;i<peaks.length;i++){
      const x=(i/(peaks.length-1))*width;
      const a=peaks[i]*(height/2-2);
      ctx.moveTo(x,cy-a);ctx.lineTo(x,cy+a);
    }
    ctx.stroke();
  },[peaks,color,width,height,muted]);
  return <canvas ref={ref} style={{width,height,display:'block',opacity:muted?0.3:1}}/>;
}

// ─── Mini Slider ─────────────────────────────────────────────────────────────
function SliderRow({label,value,min,max,step,color,onChange}:{label:string;value:number;min:number;max:number;step:number;color:string;onChange:(v:number)=>void}) {
  return(
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
        <span style={{fontSize:10,color:T.text2}}>{label}</span>
        <span style={{fontSize:10,color,fontFamily:'monospace',fontWeight:600}}>{value>0?'+':''}{value} dB</span>
      </div>
      <div style={{position:'relative',height:16,display:'flex',alignItems:'center'}}>
        <div style={{position:'absolute',left:0,right:0,height:4,background:'rgba(192,38,211,0.15)',borderRadius:2}}>
          <div style={{height:'100%',background:color,borderRadius:2,width:`${((value-min)/(max-min))*100}%`}}/>
        </div>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}}/>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StudioDAW({projectId,user,uploadedFiles,onBack,onCreditsUpdate,onExport,initialPreset=PRESETS[0],reverbOn=false,delayOn=false,stereoOn=false,onNavigate}:StudioDAWProps) {
  const [stems,setStems]=useState<Stem[]>([]);
  const [isPlaying,setIsPlaying]=useState(false);
  const [currentTime,setCurrentTime]=useState(0);
  const [duration,setDuration]=useState(0);
  const [isLoading,setIsLoading]=useState(uploadedFiles.length>0);
  const [loadingProgress,setLoadingProgress]=useState(0);
  const [isExporting,setIsExporting]=useState(false);
  const [bassGain,setBassGain]=useState(initialPreset.bass??0);
  const [midGain,setMidGain]=useState(initialPreset.mid??0);
  const [highGain,setHighGain]=useState(initialPreset.high??0);
  const [reverbActive,setReverbActive]=useState(reverbOn);
  const [delayActive,setDelayActive]=useState(delayOn);
  const [widenerActive,setWidenerActive]=useState(stereoOn);
  const [activePreset,setActivePreset]=useState<MixPreset>(initialPreset);
  const [iaEqPreset,setIaEqPreset]=useState(IAEQ_PRESETS[0]);
  const [momentaryLufs,setMomentaryLufs]=useState(-60.0);
  const [integratedLufs,setIntegratedLufs]=useState(-60.0);
  const [selectedStemId,setSelectedStemId]=useState<string|null>(null);
  const [tab,setTab]=useState<'mix'|'gen'|'stems'>('mix');
  const [showPresets,setShowPresets]=useState(false);
  const [allFiles,setAllFiles]=useState<File[]>(uploadedFiles);

  const audioCtxRef=useRef<AudioContext|null>(null);
  const masterGainRef=useRef<GainNode|null>(null);
  const mixAnalyserRef=useRef<AnalyserNode|null>(null);
  const bassFilterRef=useRef<BiquadFilterNode|null>(null);
  const midFilterRef=useRef<BiquadFilterNode|null>(null);
  const highFilterRef=useRef<BiquadFilterNode|null>(null);
  const reverbGainRef=useRef<GainNode|null>(null);
  const dryGainRef=useRef<GainNode|null>(null);
  const delayGainRef=useRef<GainNode|null>(null);
  const pausedTimeRef=useRef(0);
  const timerRef=useRef<number>();
  const fftCanvasRef=useRef<HTMLCanvasElement>(null);
  const timelineCanvasRef=useRef<HTMLCanvasElement>(null);
  const iaEqNodesRef=useRef<(BiquadFilterNode|GainNode)[]>([]);
  const lufsHistRef=useRef<number[]>([]);

  useEffect(()=>{setAllFiles(uploadedFiles);},[uploadedFiles]);
  useEffect(()=>{if(allFiles.length>0)initAudio();},[allFiles]);

  const initAudio=async()=>{
    setIsLoading(true);setLoadingProgress(10);
    try{
      if(audioCtxRef.current&&audioCtxRef.current.state!=='closed') await audioCtxRef.current.close();
      const ctx=new(window.AudioContext||(window as any).webkitAudioContext)();
      audioCtxRef.current=ctx;
      // Master chain
      const masterGain=ctx.createGain();masterGain.gain.value=1;masterGainRef.current=masterGain;
      const mixAnalyser=ctx.createAnalyser();mixAnalyser.fftSize=2048;mixAnalyser.smoothingTimeConstant=0.8;mixAnalyserRef.current=mixAnalyser;
      const bassFilter=ctx.createBiquadFilter();bassFilter.type='lowshelf';bassFilter.frequency.value=200;bassFilter.gain.value=bassGain;bassFilterRef.current=bassFilter;
      const midFilter=ctx.createBiquadFilter();midFilter.type='peaking';midFilter.frequency.value=1000;midFilter.Q.value=1;midFilter.gain.value=midGain;midFilterRef.current=midFilter;
      const highFilter=ctx.createBiquadFilter();highFilter.type='highshelf';highFilter.frequency.value=5000;highFilter.gain.value=highGain;highFilterRef.current=highFilter;
      // IA EQ chain
      const iaEqOutput=buildIAEQChain(ctx,highFilter);
      // Reverb/Delay
      const dryGain=ctx.createGain();dryGain.gain.value=1;dryGainRef.current=dryGain;
      const reverbGain=ctx.createGain();reverbGain.gain.value=reverbActive?0.3:0;reverbGainRef.current=reverbGain;
      const delayNode=ctx.createDelay(2.0);delayNode.delayTime.value=0.25;
      const delayGain=ctx.createGain();delayGain.gain.value=delayActive?0.2:0;delayGainRef.current=delayGain;
      iaEqOutput.connect(dryGain);iaEqOutput.connect(delayNode);delayNode.connect(delayGain);
      dryGain.connect(masterGain);reverbGain.connect(masterGain);delayGain.connect(masterGain);
      masterGain.connect(mixAnalyser);mixAnalyser.connect(ctx.destination);
      // Connect EQ chain
      masterGain.connect(bassFilter);bassFilter.connect(midFilter);midFilter.connect(highFilter);
      setLoadingProgress(30);
      // Decode files
      const stemsArr:Stem[]=[];
      for(let i=0;i<allFiles.length;i++){
        const file=allFiles[i];
        setLoadingProgress(30+Math.round((i/allFiles.length)*60));
        try{
          const ab=await file.arrayBuffer();
          const buffer=await ctx.decodeAudioData(ab);
          const gainNode=ctx.createGain();gainNode.gain.value=1;
          const panNode=ctx.createStereoPanner();panNode.pan.value=0;
          const analyserNode=ctx.createAnalyser();analyserNode.fftSize=512;analyserNode.smoothingTimeConstant=0.7;
          const eqLow=ctx.createBiquadFilter();eqLow.type='lowshelf';eqLow.frequency.value=200;eqLow.gain.value=0;
          const eqMid=ctx.createBiquadFilter();eqMid.type='peaking';eqMid.frequency.value=1000;eqMid.Q.value=1;eqMid.gain.value=0;
          const eqHigh=ctx.createBiquadFilter();eqHigh.type='highshelf';eqHigh.frequency.value=5000;eqHigh.gain.value=0;
          gainNode.connect(panNode);panNode.connect(eqLow);eqLow.connect(eqMid);eqMid.connect(eqHigh);eqHigh.connect(analyserNode);analyserNode.connect(dryGain);
          const {instrument,icon}=detectInstrument(file.name);
          const peaks=generatePeaks(buffer,200);
          stemsArr.push({id:`stem-${i}`,name:file.name.replace(/\.[^.]+$/,''),file,buffer,gainNode,panNode,analyserNode,eqLow,eqMid,eqHigh,volume:0,pan:0,muted:false,solo:false,fftData:new Uint8Array(analyserNode.frequencyBinCount),waveformPeaks:peaks,instrument,icon,color:STEM_COLORS[i%STEM_COLORS.length]});
        }catch(e){console.error('Error decodificando',file.name,e);}
      }
      setStems(stemsArr);
      setDuration(Math.max(...stemsArr.map(s=>s.buffer.duration),0));
      if(stemsArr.length>0)setSelectedStemId(stemsArr[0].id);
      setLoadingProgress(100);
      setIsLoading(false);
      startFFT();
    }catch(err){console.error('Audio init error',err);setIsLoading(false);}
  };

  const buildIAEQChain=(ctx:AudioContext,input:AudioNode):AudioNode=>{
    const nodes:(BiquadFilterNode|GainNode)[]=[];
    const pg=ctx.createGain();pg.gain.value=1;nodes.push(pg);input.connect(pg);let prev:AudioNode=pg;
    for(let i=1;i<12;i++){const f=ctx.createBiquadFilter();f.type=i===1?'lowshelf':i===11?'highshelf':'peaking';f.frequency.value=[30,60,170,310,600,1000,3000,6000,12000,14000,16000][i-1];f.Q.value=1;f.gain.value=0;nodes.push(f);prev.connect(f);prev=f;}
    iaEqNodesRef.current=nodes;return prev;
  };

  const startFFT=()=>{
    const tick=()=>{
      const analyser=mixAnalyserRef.current;const canvas=fftCanvasRef.current;
      if(analyser&&canvas){
        const data=new Uint8Array(analyser.frequencyBinCount);analyser.getByteFrequencyData(data);
        // LUFS approximation
        let sum=0;for(let i=0;i<data.length;i++)sum+=data[i]*data[i];
        const rms=Math.sqrt(sum/data.length);const lufs=-60+rms*0.35;
        setMomentaryLufs(Math.max(-60,Math.min(0,lufs)));
        lufsHistRef.current.push(lufs);if(lufsHistRef.current.length>300)lufsHistRef.current.shift();
        const avg=lufsHistRef.current.reduce((a,b)=>a+b,0)/lufsHistRef.current.length;
        setIntegratedLufs(Math.max(-60,Math.min(0,avg)));
        // Draw FFT
        const dpr=window.devicePixelRatio||1;const w=canvas.offsetWidth,h=canvas.offsetHeight;
        canvas.width=w*dpr;canvas.height=h*dpr;const ctx=canvas.getContext('2d');if(ctx){ctx.scale(dpr,dpr);
          const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#ec4899');grad.addColorStop(0.5,'#C026D3');grad.addColorStop(1,'rgba(192,38,211,0.1)');
          ctx.clearRect(0,0,w,h);ctx.fillStyle=grad;
          for(let i=0;i<data.length&&i<w;i++){const bar=(data[i]/255)*h;ctx.fillRect(i*(w/data.length),h-bar,Math.max(1,w/data.length-1),bar);}
        }
      }
      requestAnimationFrame(tick);
    };requestAnimationFrame(tick);
  };

  const handlePlayPause=async()=>{
    const ctx=audioCtxRef.current;if(!ctx||stems.length===0)return;
    if(ctx.state==='suspended')await ctx.resume();
    if(isPlaying){
      stems.forEach(s=>{try{s.sourceNode?.stop();s.sourceNode?.disconnect();}catch(e){}});
      setIsPlaying(false);pausedTimeRef.current=currentTime;
      if(timerRef.current)clearInterval(timerRef.current);
    }else{
      const startTime=ctx.currentTime,offset=pausedTimeRef.current;
      const updated=stems.map(s=>{
        if(!s.muted){const src=ctx.createBufferSource();src.buffer=s.buffer;src.connect(s.gainNode);src.start(startTime,offset);return{...s,sourceNode:src};}
        return s;
      });
      setStems(updated);setIsPlaying(true);
      timerRef.current=window.setInterval(()=>{
        const elapsed=ctx.currentTime-startTime+offset;
        setCurrentTime(Math.min(elapsed,duration));
        if(elapsed>=duration)handleStop();
      },100);
    }
  };

  const handleStop=()=>{
    stems.forEach(s=>{try{s.sourceNode?.stop();s.sourceNode?.disconnect();}catch(e){}});
    setStems(prev=>prev.map(s=>({...s,sourceNode:undefined})));
    setIsPlaying(false);setCurrentTime(0);pausedTimeRef.current=0;
    if(timerRef.current)clearInterval(timerRef.current);
  };

  const toggleMute=(id:string)=>{
    const ctx=audioCtxRef.current;
    setStems(prev=>prev.map(s=>{
      if(s.id===id){const muted=!s.muted;if(ctx)s.gainNode.gain.setTargetAtTime(muted?0:Math.pow(10,s.volume/20),ctx.currentTime,0.01);return{...s,muted};}
      return s;
    }));
  };
  const toggleSolo=(id:string)=>{
    setStems(prev=>{
      const anyActive=prev.some(s=>s.id===id?!s.solo:s.solo);
      return prev.map(s=>{
        const solo=s.id===id?!s.solo:anyActive?false:s.solo;
        if(audioCtxRef.current)s.gainNode.gain.setTargetAtTime(solo||(anyActive&&!s.solo)?0:Math.pow(10,s.volume/20),audioCtxRef.current.currentTime,0.01);
        return{...s,solo};
      });
    });
  };
  const updateStemVolume=(id:string,db:number)=>{
    const ctx=audioCtxRef.current;
    setStems(prev=>prev.map(s=>{if(s.id===id){if(ctx)s.gainNode.gain.setTargetAtTime(Math.pow(10,db/20),ctx.currentTime,0.01);return{...s,volume:db};}return s;}));
  };
  const applyPreset=(p:MixPreset)=>{
    setActivePreset(p);setBassGain(p.bass);setMidGain(p.mid);setHighGain(p.high);
    setReverbActive(p.reverbWet>0);setDelayActive(p.delayWet>0);setWidenerActive(p.stereoWidth>0.5);
    const ctx=audioCtxRef.current;
    if(bassFilterRef.current&&ctx)bassFilterRef.current.gain.setTargetAtTime(p.bass,ctx.currentTime,0.05);
    if(midFilterRef.current&&ctx)midFilterRef.current.gain.setTargetAtTime(p.mid,ctx.currentTime,0.05);
    if(highFilterRef.current&&ctx)highFilterRef.current.gain.setTargetAtTime(p.high,ctx.currentTime,0.05);
    if(reverbGainRef.current&&ctx)reverbGainRef.current.gain.setTargetAtTime(p.reverbWet>0?p.reverbWet:0,ctx.currentTime,0.1);
    if(delayGainRef.current&&ctx)delayGainRef.current.gain.setTargetAtTime(p.delayWet>0?p.delayWet:0,ctx.currentTime,0.1);
    setShowPresets(false);
  };
  const updateEQ=(band:'bass'|'mid'|'high',val:number)=>{
    const ctx=audioCtxRef.current;
    if(band==='bass'){setBassGain(val);if(bassFilterRef.current&&ctx)bassFilterRef.current.gain.setTargetAtTime(val,ctx.currentTime,0.05);}
    else if(band==='mid'){setMidGain(val);if(midFilterRef.current&&ctx)midFilterRef.current.gain.setTargetAtTime(val,ctx.currentTime,0.05);}
    else{setHighGain(val);if(highFilterRef.current&&ctx)highFilterRef.current.gain.setTargetAtTime(val,ctx.currentTime,0.05);}
  };

  const handleExportClick=async()=>{
    if(stems.length===0||isExporting)return;
    setIsExporting(true);
    try{
      const duration2=Math.max(...stems.map(s=>s.buffer.duration));
      const offCtx=new OfflineAudioContext(2,Math.floor(44100*duration2),44100);
      const master=offCtx.createGain();const dest=offCtx.destination;
      const bass2=offCtx.createBiquadFilter();bass2.type='lowshelf';bass2.frequency.value=200;bass2.gain.value=bassGain;
      const mid2=offCtx.createBiquadFilter();mid2.type='peaking';mid2.frequency.value=1000;mid2.Q.value=1;mid2.gain.value=midGain;
      const high2=offCtx.createBiquadFilter();high2.type='highshelf';high2.frequency.value=5000;high2.gain.value=highGain;
      master.connect(bass2);bass2.connect(mid2);mid2.connect(high2);high2.connect(dest);
      stems.filter(s=>!s.muted).forEach(s=>{
        const src=offCtx.createBufferSource();src.buffer=s.buffer;
        const g=offCtx.createGain();g.gain.value=Math.pow(10,s.volume/20);
        src.connect(g);g.connect(master);src.start(0);
      });
      const rendered=await offCtx.startRendering();
      const wav=audioBufferToWav(rendered);
      const blob=new Blob([wav],{type:'audio/wav'});
      const url=URL.createObjectURL(blob);
      const peaks=generatePeaks(rendered,800);
      onExport({audioBuffer:rendered,audioUrl:url,waveformPeaks:peaks,finalLufs:integratedLufs,presetName:activePreset.name,iaEqPreset:iaEqPreset.name});
    }catch(e){console.error('Export error',e);}
    setIsExporting(false);
  };

  const handleAddFiles=(files:File[])=>{
    setAllFiles(prev=>[...prev,...files]);
  };

  const selectedStem=stems.find(s=>s.id===selectedStemId)||stems[0];
  const pct=duration>0?currentTime/duration:0;

  // ─── LOADING ─────────────────────────────────────────────────────────────
  if(isLoading) return(
    <div style={{width:'100%',height:'100vh',background:T.bgDeep,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',color:T.text}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:72,height:72,margin:'0 auto 20px',background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`,borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:`0 0 32px ${T.fuchsia}66`,fontSize:30}}>✦</div>
        <div style={{fontSize:16,fontWeight:600,marginBottom:8}}>Cargando MixingStudio AI</div>
        <div style={{fontSize:12,color:T.text3,marginBottom:20}}>Decodificando audio…</div>
        <div style={{width:240,height:6,background:'rgba(192,38,211,0.15)',borderRadius:3,margin:'0 auto',overflow:'hidden'}}>
          <div style={{height:'100%',background:`linear-gradient(90deg,${T.fuchsia},${T.pink})`,borderRadius:3,width:`${loadingProgress}%`,transition:'width 0.3s'}}/>
        </div>
        <div style={{fontSize:11,color:T.pink,marginTop:8,fontFamily:'monospace'}}>{loadingProgress}%</div>
      </div>
    </div>
  );

  // ─── MAIN DAW ─────────────────────────────────────────────────────────────
  return(
    <div style={{width:'100%',height:'100vh',background:`radial-gradient(ellipse at 90% -10%,rgba(192,38,211,0.18),transparent 50%),radial-gradient(ellipse at 0% 110%,rgba(162,89,255,0.14),transparent 50%),${T.bgDeep}`,fontFamily:'-apple-system,BlinkMacSystemFont,"DM Sans",system-ui,sans-serif',color:T.text,display:'flex',flexDirection:'column',overflow:'hidden'}}>

      {/* FLOWNAV */}
      <FlowNav active="studio" onNavigate={(id)=>{if(onNavigate)onNavigate(id);else onBack();}} user={user}/>

      {/* TITLE BAR */}
      <div style={{padding:'10px 20px',display:'flex',alignItems:'center',gap:14,borderBottom:`0.5px solid ${T.border}`,background:'rgba(10,6,18,0.6)',flexShrink:0,flexWrap:'wrap'}}>
        <span style={{width:10,height:10,background:T.fuchsia,borderRadius:2,boxShadow:`0 0 10px ${T.fuchsia}`}}/>
        <span style={{fontSize:18,fontWeight:600,background:`linear-gradient(90deg,${T.pink},${T.violet})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>MixingStudio AI</span>
        <span style={{fontSize:11,color:T.text3}}>{stems.length} stems · {fmt(duration)}</span>
        {/* Preset badge */}
        <div style={{position:'relative'}}>
          <button onClick={()=>setShowPresets(!showPresets)} style={{padding:'4px 12px',borderRadius:980,background:`linear-gradient(135deg,${activePreset.color}22,${activePreset.color}11)`,border:`1.5px solid ${activePreset.color}`,color:activePreset.color,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✦ {activePreset.name} ▾</button>
          {showPresets&&(
            <div style={{position:'absolute',top:'100%',left:0,zIndex:200,marginTop:4,background:T.surfaceSolid,border:`1px solid ${T.borderStrong}`,borderRadius:12,padding:8,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,minWidth:360,boxShadow:`0 8px 32px rgba(0,0,0,0.5)`}}>
              {PRESETS.map(p=>(
                <button key={p.id} onClick={()=>applyPreset(p)} style={{background:`${p.color}11`,border:`1px solid ${p.id===activePreset.id?p.color:p.color+'33'}`,borderRadius:8,padding:'8px 6px',cursor:'pointer',textAlign:'left',fontFamily:'inherit'}}>
                  <div style={{height:16,display:'flex',alignItems:'flex-end',gap:'1px',marginBottom:4}}>
                    {p.wavePattern.map((h,i)=><div key={i} style={{flex:1,height:`${h*100}%`,background:p.color,borderRadius:'1px 1px 0 0',opacity:0.8}}/>)}
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:T.text}}>{p.name}</div>
                  <div style={{fontSize:9,color:p.color,marginTop:2}}>B:{p.bass>0?'+':''}{p.bass} R:{Math.round(p.reverbWet*100)}%</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{flex:1}}/>
        {/* Transport */}
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <button onClick={handleStop} disabled={!isPlaying} style={{width:28,height:28,borderRadius:7,background:'rgba(255,255,255,0.04)',border:`0.5px solid ${T.border}`,cursor:'pointer',color:T.text2,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10}}>⏹</button>
          <button onClick={handlePlayPause} disabled={stems.length===0} style={{width:32,height:32,borderRadius:8,background:stems.length===0?'rgba(255,255,255,0.04)':`linear-gradient(135deg,${T.fuchsia},${T.pink})`,border:'none',cursor:stems.length===0?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:stems.length>0?`0 0 16px ${T.fuchsia}66`:'none'}}>
            {isPlaying?<span style={{fontSize:12,color:'#fff'}}>⏸</span>:<span style={{fontSize:14,color:'#fff'}}>▶</span>}
          </button>
          <span style={{fontFamily:'monospace',fontSize:13,color:T.text,padding:'4px 10px',background:'rgba(8,4,16,0.5)',borderRadius:6}}>{fmt(currentTime)} / {fmt(duration)}</span>
        </div>
        {/* Stems + Export */}
        <label style={{height:30,padding:'0 12px',borderRadius:8,background:'rgba(255,255,255,0.04)',border:`0.5px solid ${T.border}`,color:T.text2,fontSize:11,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:6}}>
          <input type="file" multiple accept="audio/*" style={{display:'none'}} onChange={e=>{if(e.target.files)handleAddFiles(Array.from(e.target.files));e.target.value='';}}/>
          ⬆ Stems ({stems.length}/12)
        </label>
        <button onClick={handleExportClick} disabled={stems.length===0||isExporting} style={{height:34,padding:'0 18px',borderRadius:980,background:stems.length===0?'rgba(255,255,255,0.04)':`linear-gradient(135deg,${T.fuchsia},${T.pink})`,border:'none',color:'#fff',fontSize:12,fontWeight:600,cursor:stems.length===0?'not-allowed':'pointer',boxShadow:stems.length>0?`0 0 20px ${T.fuchsia}55`:'none',fontFamily:'inherit'}}>
          {isExporting?'Exportando…':'⬇ Exportar Mezcla'}
        </button>
      </div>

      {/* MAIN BODY */}
      <div style={{flex:1,display:'flex',minHeight:0,overflow:'hidden'}}>

        {/* INSPECTOR */}
        <div style={{width:220,flexShrink:0,background:'rgba(15,10,26,0.7)',borderRight:`0.5px solid ${T.border}`,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'12px 14px',borderBottom:`0.5px solid ${T.border}`}}>
            <div style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Inspector</div>
            {selectedStem?(
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:4,height:24,borderRadius:2,background:selectedStem.color,boxShadow:`0 0 8px ${selectedStem.color}`}}/>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:T.text,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selectedStem.name}</div>
                  <div style={{fontSize:10,color:T.text3}}>{selectedStem.instrument}</div>
                </div>
              </div>
            ):<div style={{fontSize:11,color:T.text3}}>Selecciona un track</div>}
          </div>
          {selectedStem&&(
            <div style={{flex:1,overflow:'auto',padding:'12px 14px'}}>
              <SliderRow label="Volumen" value={selectedStem.volume} min={-24} max={6} step={1} color={selectedStem.color} onChange={v=>updateStemVolume(selectedStem.id,v)}/>
              <div style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginTop:10,marginBottom:8}}>EQ — Stem</div>
              <SliderRow label="Bass" value={selectedStem.eqLow.gain.value} min={-12} max={12} step={1} color={T.pink} onChange={v=>{const ctx=audioCtxRef.current;setStems(p=>p.map(s=>s.id===selectedStem.id?{...s}:s));if(ctx)selectedStem.eqLow.gain.setTargetAtTime(v,ctx.currentTime,0.05);}}/>
              <SliderRow label="Mid" value={selectedStem.eqMid.gain.value} min={-12} max={12} step={1} color={T.fuchsia} onChange={v=>{const ctx=audioCtxRef.current;if(ctx)selectedStem.eqMid.gain.setTargetAtTime(v,ctx.currentTime,0.05);}}/>
              <SliderRow label="High" value={selectedStem.eqHigh.gain.value} min={-12} max={12} step={1} color={T.violet} onChange={v=>{const ctx=audioCtxRef.current;if(ctx)selectedStem.eqHigh.gain.setTargetAtTime(v,ctx.currentTime,0.05);}}/>
              {/* FX del stem */}
              <div style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginTop:12,marginBottom:8}}>Efectos</div>
              {[{l:'Reverb',a:reverbActive,t:()=>setReverbActive(!reverbActive)},{l:'Delay',a:delayActive,t:()=>setDelayActive(!delayActive)},{l:'Widener',a:widenerActive,t:()=>setWidenerActive(!widenerActive)}].map(fx=>(
                <div key={fx.l} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontSize:11,color:T.text}}>{fx.l}</span>
                  <div onClick={fx.t} style={{width:30,height:16,borderRadius:8,background:fx.a?T.fuchsia:'rgba(155,126,200,0.2)',position:'relative',cursor:'pointer',transition:'background 0.2s'}}>
                    <div style={{width:12,height:12,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:fx.a?16:2,transition:'left 0.2s'}}/>
                  </div>
                </div>
              ))}
              <div style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginTop:12,marginBottom:6}}>Output</div>
              <div style={{fontSize:11,color:T.text2,padding:'5px 8px',borderRadius:6,background:'rgba(255,255,255,0.03)'}}>Mix Bus → Master</div>
            </div>
          )}
        </div>

        {/* TIMELINE */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minHeight:0}}>
          {/* Toolbar */}
          <div style={{height:28,padding:'0 12px',borderBottom:`0.5px solid ${T.border}`,display:'flex',alignItems:'center',gap:12,background:'rgba(10,6,18,0.4)',flexShrink:0,fontSize:10,color:T.text3,fontFamily:'monospace'}}>
            <span>Snap 1/4</span><span style={{width:.5,height:10,background:T.border}}/>
            <span>Zoom 100%</span><span style={{width:.5,height:10,background:T.border}}/>
            <span>Grid Bars</span>
            <div style={{flex:1}}/>
            <span style={{color:T.green}}>● Spotify -14 ✓</span>
            <span style={{width:.5,height:10,background:T.border}}/>
            <span>YouTube -10 ✓</span>
          </div>
          <div style={{flex:1,display:'flex',minHeight:0,overflow:'hidden'}}>
            {/* Track headers */}
            <div style={{width:190,flexShrink:0,borderRight:`0.5px solid ${T.border}`,background:'rgba(15,10,26,0.85)',display:'flex',flexDirection:'column'}}>
              <div style={{height:22,padding:'0 12px',display:'flex',alignItems:'center',fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase',borderBottom:`0.5px solid ${T.border}`,flexShrink:0}}>Tracks</div>
              <div style={{flex:1,overflowY:'auto'}}>
                {stems.length===0?(
                  <div style={{padding:20,textAlign:'center'}}>
                    <div style={{fontSize:28,marginBottom:12}}>🎵</div>
                    <div style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:6}}>Sube stems para empezar</div>
                    <div style={{fontSize:10,color:T.text3}}>o usa las opciones del menú</div>
                  </div>
                ):stems.map(s=>(
                  <div key={s.id} onClick={()=>setSelectedStemId(s.id)} style={{height:TRACK_H,padding:'6px 10px',borderBottom:`0.5px solid ${T.border}`,display:'flex',alignItems:'center',gap:7,background:selectedStemId===s.id?'rgba(192,38,211,0.06)':'transparent',cursor:'pointer'}}>
                    <span style={{width:3,height:30,borderRadius:2,background:s.color,boxShadow:`0 0 8px ${s.color}66`,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:500,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:4}}>
                        <span style={{fontSize:12}}>{s.icon}</span>{s.name}
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:5,marginTop:3}}>
                        <div style={{flex:1,height:3,background:'rgba(255,255,255,0.06)',borderRadius:2}}>
                          <div style={{height:'100%',background:s.color,borderRadius:2,width:`${Math.max(0,Math.min(100,(s.volume+24)/30*100))}%`}}/>
                        </div>
                        <span style={{fontSize:9,color:T.text3,fontFamily:'monospace',width:28,textAlign:'right'}}>{s.volume>0?'+':''}{s.volume}dB</span>
                      </div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();toggleMute(s.id);}} style={{width:18,height:18,borderRadius:4,background:s.muted?T.amber:'transparent',color:s.muted?'#000':T.text3,border:`0.5px solid ${s.muted?T.amber:T.border}`,fontSize:9,fontWeight:600,cursor:'pointer',flexShrink:0}}>M</button>
                    <button onClick={e=>{e.stopPropagation();toggleSolo(s.id);}} style={{width:18,height:18,borderRadius:4,background:s.solo?T.pink:'transparent',color:s.solo?'#fff':T.text3,border:`0.5px solid ${s.solo?T.pink:T.border}`,fontSize:9,fontWeight:600,cursor:'pointer',flexShrink:0}}>S</button>
                  </div>
                ))}
                {/* Add track row */}
                <label style={{height:TRACK_H,padding:'6px 10px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',borderBottom:`0.5px solid ${T.border}`}}>
                  <input type="file" multiple accept="audio/*" style={{display:'none'}} onChange={e=>{if(e.target.files)handleAddFiles(Array.from(e.target.files));e.target.value='';}}/>
                  <div style={{width:'100%',height:'100%',border:`1px dashed ${T.borderStrong}`,borderRadius:8,background:'rgba(192,38,211,0.04)',display:'flex',alignItems:'center',justifyContent:'center',gap:6,fontSize:11,color:T.pink,fontWeight:500}}>
                    <span>✦</span> Nueva pista
                  </div>
                </label>
              </div>
            </div>

            {/* Timeline scroll */}
            <div style={{flex:1,overflow:'auto',position:'relative',background:'rgba(10,6,18,0.4)'}}>
              {/* Ruler */}
              <div style={{height:22,position:'sticky',top:0,zIndex:2,background:'rgba(15,10,26,0.95)',borderBottom:`0.5px solid ${T.border}`,backdropFilter:'blur(6px)',display:'flex',alignItems:'center',padding:'0 0 0 8px'}}>
                {Array.from({length:20}).map((_,i)=>(
                  <div key={i} style={{width:60,fontSize:9,color:i%4===0?T.text3:'rgba(122,106,144,0.3)',fontFamily:'monospace',flexShrink:0,borderLeft:`0.5px solid ${i%4===0?T.border:'transparent'}`,paddingLeft:4}}>{i%4===0?`${i+1}`:''}</div>
                ))}
              </div>
              {/* Track content */}
              <div style={{position:'relative',minWidth:'100%',minHeight:stems.length*TRACK_H}}>
                {stems.map((s,i)=>(
                  <div key={s.id} style={{height:TRACK_H,borderBottom:`0.5px solid ${T.border}`,background:i%2===0?'rgba(255,255,255,0.008)':'transparent',position:'relative',display:'flex',alignItems:'center',padding:'4px 8px'}}>
                    <div style={{borderRadius:5,overflow:'hidden',background:`${s.color}cc`,border:`0.5px solid ${s.color}`,width:'98%',height:TRACK_H-12}}>
                      <div style={{position:'absolute',top:8,left:16,fontSize:9,fontWeight:600,color:'#fff',zIndex:1,whiteSpace:'nowrap'}}>{s.name}</div>
                      <ClipWave peaks={s.waveformPeaks} color={s.color} width={800} height={TRACK_H-12} muted={s.muted}/>
                    </div>
                  </div>
                ))}
                {/* Add IA row */}
                {stems.length>0&&(
                  <div style={{height:TRACK_H,borderBottom:`0.5px solid ${T.border}`,display:'flex',alignItems:'center',padding:'0 8px'}}>
                    <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'8px 16px',border:`1px dashed ${T.borderStrong}`,borderRadius:8,color:T.pink,fontSize:11,fontWeight:500,background:'rgba(192,38,211,0.05)',cursor:'pointer'}} onClick={()=>onNavigate?onNavigate('create'):null}>
                      <span>✦</span> Genera instrumentos con IA · haz clic en "Crear con IA"
                    </div>
                  </div>
                )}
                {/* Playhead */}
                {duration>0&&(
                  <div style={{position:'absolute',top:0,bottom:0,left:`${pct*100}%`,width:2,background:T.pink,pointerEvents:'none',boxShadow:`0 0 10px ${T.pink}`,zIndex:5}}>
                    <div style={{position:'absolute',top:0,left:-6,width:14,height:8,background:T.pink,clipPath:'polygon(0 0,100% 0,50% 100%)'}}/>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI PANEL */}
        <div style={{width:300,flexShrink:0,background:'rgba(15,10,26,0.7)',borderLeft:`0.5px solid ${T.border}`,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{display:'flex',padding:5,gap:4,borderBottom:`0.5px solid ${T.border}`,flexShrink:0}}>
            {(['mix','gen','stems'] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{flex:1,height:28,borderRadius:6,background:tab===t?'rgba(192,38,211,0.15)':'transparent',color:tab===t?T.pink:T.text2,border:tab===t?`0.5px solid ${T.borderStrong}`:'0.5px solid transparent',fontSize:11,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                {t==='mix'?'Mix':t==='gen'?'Generar':'Stems'}
              </button>
            ))}
          </div>
          <div style={{flex:1,overflow:'auto'}}>
            {tab==='mix'&&(
              <div style={{padding:14,display:'flex',flexDirection:'column',gap:12}}>
                {/* Mix bus EQ */}
                <div style={{background:T.surface,borderRadius:10,padding:12}}>
                  <div style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:10}}>EQ Master</div>
                  <SliderRow label="Bass" value={bassGain} min={-12} max={12} step={1} color={T.pink} onChange={v=>updateEQ('bass',v)}/>
                  <SliderRow label="Mid" value={midGain} min={-12} max={12} step={1} color={T.fuchsia} onChange={v=>updateEQ('mid',v)}/>
                  <SliderRow label="High" value={highGain} min={-12} max={12} step={1} color={T.violet} onChange={v=>updateEQ('high',v)}/>
                </div>
                {/* Compresión */}
                <div style={{background:T.surface,borderRadius:10,padding:12}}>
                  <div style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:8}}>Compresión</div>
                  <div style={{fontSize:14,fontWeight:700,color:T.text,textTransform:'capitalize'}}>{activePreset.compression||'medium'}</div>
                  <div style={{fontSize:10,color:T.text3,marginTop:3}}>{activePreset.compression==='none'?'Sin compresión':activePreset.compression==='low'?'Thr: -24dB · 2:1':activePreset.compression==='medium'?'Thr: -18dB · 4:1':activePreset.compression==='high'?'Thr: -14dB · 6:1':'Thr: -10dB · 10:1'}</div>
                  <div style={{height:5,background:'rgba(192,38,211,0.15)',borderRadius:3,marginTop:8,overflow:'hidden'}}>
                    <div style={{height:'100%',background:`linear-gradient(90deg,${T.green},${T.amber},${T.pink})`,width:activePreset.compression==='none'?'5%':activePreset.compression==='low'?'20%':activePreset.compression==='medium'?'40%':activePreset.compression==='high'?'60%':'80%'}}/>
                  </div>
                </div>
                {/* LUFS */}
                <div style={{background:T.surface,borderRadius:10,padding:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                    <span style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase'}}>LUFS</span>
                    <span style={{fontSize:9,fontWeight:700,padding:'2px 8px',borderRadius:980,background:'rgba(74,222,128,0.1)',color:T.green,border:`0.5px solid rgba(74,222,128,0.3)`}}>{momentaryLufs>-14?'⚠ Loud':momentaryLufs<-30?'↓ Soft':'✓ Safe'}</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:8}}>
                    {[{l:'MOM',v:momentaryLufs},{l:'INT',v:integratedLufs}].map(m=>(
                      <div key={m.l} style={{background:'rgba(8,4,16,0.6)',borderRadius:8,padding:'8px',textAlign:'center',border:`0.5px solid ${T.border}`}}>
                        <div style={{fontFamily:'monospace',fontSize:16,fontWeight:500,background:`linear-gradient(90deg,${T.pink},${T.violet})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{m.v.toFixed(1)}</div>
                        <div style={{fontSize:9,color:T.text3,textTransform:'uppercase',letterSpacing:.5}}>{m.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10}}><span style={{color:T.text3}}>Spotify</span><span style={{color:T.green}}>-14 LUFS</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginTop:2}}><span style={{color:T.text3}}>YouTube</span><span style={{color:T.text3}}>-14 LUFS</span></div>
                </div>
                {/* IA EQ */}
                <div style={{background:T.surface,borderRadius:10,padding:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                    <span style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase'}}>IA EQ</span>
                    <span style={{fontSize:9,color:T.green,display:'flex',alignItems:'center',gap:4}}><span style={{width:4,height:4,borderRadius:'50%',background:T.green,display:'inline-block'}}/>Live</span>
                  </div>
                  <select value={iaEqPreset.id} onChange={e=>{const p=IAEQ_PRESETS.find(x=>x.id===e.target.value);if(p)setIaEqPreset(p);}} style={{width:'100%',padding:'6px 8px',borderRadius:7,background:'rgba(192,38,211,0.1)',color:T.pink,fontSize:11,fontWeight:500,border:`0.5px solid ${T.borderStrong}`,cursor:'pointer',fontFamily:'inherit'}}>
                    {IAEQ_PRESETS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                {/* FFT */}
                <div style={{background:T.surface,borderRadius:10,padding:12}}>
                  <div style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Analizador FFT</div>
                  <canvas ref={fftCanvasRef} style={{width:'100%',height:60,borderRadius:6,background:'rgba(8,4,16,0.6)'}}/>
                </div>
              </div>
            )}
            {tab==='gen'&&(
              <div style={{padding:14,display:'flex',flexDirection:'column',gap:10}}>
                <div style={{fontSize:11,color:T.text2,lineHeight:1.5}}>Genera instrumentos con IA y agrégalos como pistas al DAW.</div>
                <button onClick={()=>onNavigate?onNavigate('create'):null} style={{width:'100%',height:40,borderRadius:10,background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`,border:'none',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 0 20px ${T.fuchsia}55`}}>
                  ✦ Crear canción completa con IA
                </button>
                <div style={{fontSize:10,color:T.text3,textAlign:'center'}}>Se generará y abrirá en este DAW</div>
                <div style={{height:.5,background:T.border,margin:'4px 0'}}/>
                <div style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:4}}>Separar stems de una canción</div>
                <button onClick={()=>onNavigate?onNavigate('separate'):null} style={{width:'100%',height:36,borderRadius:8,background:'rgba(124,58,237,0.15)',border:`0.5px solid rgba(124,58,237,0.4)`,color:'#a259ff',fontSize:11,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                  ✂ Separar stems con Demucs
                </button>
              </div>
            )}
            {tab==='stems'&&(
              <div style={{padding:14,display:'flex',flexDirection:'column',gap:8}}>
                <div style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:4}}>Stems cargados ({stems.length})</div>
                {stems.map(s=>(
                  <div key={s.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:T.surface,borderRadius:8,border:`0.5px solid ${s.color}22`}}>
                    <span style={{fontSize:14}}>{s.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:500,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</div>
                      <div style={{fontSize:9,color:T.text3}}>{fmt(s.buffer.duration)} · {s.instrument}</div>
                    </div>
                    <span style={{fontSize:9,fontWeight:600,color:s.muted?T.amber:s.solo?T.pink:T.text3}}>{s.muted?'M':s.solo?'S':'—'}</span>
                  </div>
                ))}
                <label style={{width:'100%',height:36,borderRadius:8,background:'rgba(192,38,211,0.06)',border:`1px dashed ${T.borderStrong}`,color:T.pink,fontSize:11,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                  <input type="file" multiple accept="audio/*" style={{display:'none'}} onChange={e=>{if(e.target.files)handleAddFiles(Array.from(e.target.files));e.target.value='';}}/>
                  ⬆ Agregar más stems
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MASTER STRIP */}
      <div style={{height:80,flexShrink:0,borderTop:`0.5px solid ${T.border}`,background:'rgba(15,10,26,0.85)',display:'grid',gridTemplateColumns:'180px 1fr 180px 180px 180px',overflow:'hidden'}}>
        {/* Mix bus label */}
        <div style={{padding:'10px 14px',borderRight:`0.5px solid ${T.border}`,display:'flex',flexDirection:'column',justifyContent:'center',gap:5}}>
          <div style={{fontSize:10,fontWeight:600,color:T.text,letterSpacing:.5}}>MIX BUS</div>
          <div style={{height:4,background:'rgba(255,255,255,0.06)',borderRadius:2}}>
            <div style={{height:'100%',background:`linear-gradient(90deg,${T.fuchsia},${T.pink})`,borderRadius:2,width:'70%'}}/>
          </div>
          <div style={{padding:'2px 8px',borderRadius:980,background:`${activePreset.color}18`,color:activePreset.color,fontSize:9,fontWeight:600,alignSelf:'flex-start',border:`0.5px solid ${activePreset.color}33`}}>✦ {activePreset.name}</div>
        </div>
        {/* FFT mini */}
        <div style={{padding:'10px 14px',borderRight:`0.5px solid ${T.border}`,display:'flex',flexDirection:'column',gap:6}}>
          <div style={{fontSize:9,color:T.text3,letterSpacing:.4,textTransform:'uppercase'}}>EQ Master</div>
          <div style={{display:'flex',gap:10,flex:1,alignItems:'center'}}>
            {[{l:'Bass',v:bassGain,c:T.pink,b:'bass' as const},{l:'Mid',v:midGain,c:T.fuchsia,b:'mid' as const},{l:'High',v:highGain,c:T.violet,b:'high' as const}].map(eq=>(
              <div key={eq.l} style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}><span style={{fontSize:9,color:T.text3}}>{eq.l}</span><span style={{fontSize:9,color:eq.c,fontFamily:'monospace'}}>{eq.v>0?'+':''}{eq.v}</span></div>
                <div style={{height:3,background:'rgba(192,38,211,0.15)',borderRadius:2}}><div style={{height:'100%',background:eq.c,borderRadius:2,width:`${((eq.v+12)/24)*100}%`}}/></div>
              </div>
            ))}
          </div>
        </div>
        {/* FX */}
        <div style={{padding:'10px 14px',borderRight:`0.5px solid ${T.border}`}}>
          <div style={{fontSize:9,color:T.text3,letterSpacing:.4,textTransform:'uppercase',marginBottom:6}}>FX Master</div>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {[{l:'Reverb',a:reverbActive},{l:'Delay',a:delayActive},{l:'Wide',a:widenerActive}].map(fx=>(
              <span key={fx.l} style={{padding:'3px 8px',borderRadius:980,background:fx.a?`linear-gradient(135deg,${T.fuchsia}33,${T.pink}22)`:'rgba(255,255,255,0.04)',color:fx.a?T.pink:T.text3,fontSize:9,fontWeight:500,border:`0.5px solid ${fx.a?T.borderStrong:T.border}`}}>{fx.l}</span>
            ))}
          </div>
        </div>
        {/* IA EQ */}
        <div style={{padding:'10px 14px',borderRight:`0.5px solid ${T.border}`}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:9,color:T.text3,letterSpacing:.4,textTransform:'uppercase'}}>IA EQ</span><span style={{fontSize:9,color:T.green,display:'flex',alignItems:'center',gap:3}}><span style={{width:4,height:4,borderRadius:'50%',background:T.green,display:'inline-block'}}/>Live</span></div>
          <select value={iaEqPreset.id} onChange={e=>{const p=IAEQ_PRESETS.find(x=>x.id===e.target.value);if(p)setIaEqPreset(p);}} style={{width:'100%',padding:'5px 8px',borderRadius:6,background:'rgba(192,38,211,0.1)',color:T.pink,fontSize:10,fontWeight:500,border:`0.5px solid ${T.borderStrong}`,cursor:'pointer',fontFamily:'inherit'}}>
            {IAEQ_PRESETS.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {/* LUFS */}
        <div style={{padding:'10px 14px'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <span style={{fontSize:9,color:T.text3,letterSpacing:.4,textTransform:'uppercase'}}>LUFS</span>
            <span style={{padding:'1px 6px',borderRadius:980,background:'rgba(192,38,211,0.15)',color:T.pink,fontSize:9,fontWeight:500,border:`0.5px solid ${T.borderStrong}`}}>+ Safe</span>
          </div>
          <div style={{display:'flex',gap:5}}>
            {[{v:momentaryLufs,l:'MOM'},{v:integratedLufs,l:'INT'}].map(m=>(
              <div key={m.l} style={{flex:1,padding:'4px 6px',borderRadius:6,background:'rgba(10,6,18,0.6)',border:`0.5px solid ${T.border}`,textAlign:'center'}}>
                <div style={{fontFamily:'monospace',fontSize:12,fontWeight:600,color:T.pink}}>{m.v.toFixed(1)}</div>
                <div style={{fontSize:8,color:T.text3,textTransform:'uppercase'}}>{m.l}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:5,fontSize:9}}><span style={{color:T.green,display:'flex',alignItems:'center',gap:3}}><span style={{width:3,height:3,borderRadius:'50%',background:T.green,display:'inline-block'}}/>Spotify</span><span style={{color:T.text3,fontFamily:'monospace'}}>-14</span></div>
        </div>
      </div>
    </div>
  );
}

// ─── WAV encoder ─────────────────────────────────────────────────────────────
function audioBufferToWav(buffer:AudioBuffer):ArrayBuffer {
  const numCh=buffer.numberOfChannels,sr=buffer.sampleRate,len=buffer.length,bps=16,bpS=bps/8,ba=numCh*bpS,dl=len*ba;
  const ab=new ArrayBuffer(44+dl);const v=new DataView(ab);
  const wr=(o:number,s:string)=>s.split('').forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  wr(0,'RIFF');v.setUint32(4,36+dl,true);wr(8,'WAVE');wr(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,numCh,true);v.setUint32(24,sr,true);v.setUint32(28,sr*ba,true);v.setUint16(32,ba,true);v.setUint16(34,bps,true);wr(36,'data');v.setUint32(40,dl,true);
  let off=44;
  for(let i=0;i<len;i++){for(let ch=0;ch<numCh;ch++){const s=Math.max(-1,Math.min(1,buffer.getChannelData(ch)[i]));v.setInt16(off,s<0?s*32768:s*32767,true);off+=2;}}
  return ab;
}
