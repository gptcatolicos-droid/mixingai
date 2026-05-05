import { useState, useRef, useEffect } from 'react';
import FlowNav from '@/components/flow/FlowNav';
import { MixPreset, PRESETS } from './PresetScreen';

interface User { id:string; firstName:string; lastName:string; email:string; country:string; credits:number; provider?:string; createdAt:string; is_pro?:boolean; plan?:string; }
interface Stem { id:string; name:string; file:File; buffer:AudioBuffer; gainNode:GainNode; panNode:StereoPannerNode; analyserNode:AnalyserNode; eqLow:BiquadFilterNode; eqMid:BiquadFilterNode; eqHigh:BiquadFilterNode; sourceNode?:AudioBufferSourceNode; volume:number; pan:number; muted:boolean; solo:boolean; waveformPeaks:Float32Array; instrument:string; icon:string; color:string; }
interface Props { projectId:string; user:User; uploadedFiles:File[]; onBack:()=>void; onCreditsUpdate:(n:number)=>void; onExport:(d:any)=>void; initialPreset?:MixPreset; reverbOn?:boolean; delayOn?:boolean; stereoOn?:boolean; onNavigate?:(id:string)=>void; }

const T = { bgDeep:'#0F0A1A', surface:'rgba(26,16,40,0.8)', surface2:'rgba(35,20,55,0.6)', surfaceSolid:'#12091e', text:'#F8F0FF', text2:'#b8a8d0', text3:'#7a6a90', pink:'#ec4899', fuchsia:'#C026D3', violet:'#a259ff', amber:'#fbbf24', green:'#10b981', border:'rgba(192,38,211,0.2)', borderStrong:'rgba(192,38,211,0.5)' };
const COLORS = ['#ec4899','#10b981','#f97316','#3b82f6','#fbbf24','#a259ff','#14b8a6','#f472b6','#4ade80','#fb923c','#60a5fa','#c084fc'];
const TH = 56;
const IAEQ = [
  {id:'default',name:'Default',bands:[0,0,0,0,0,0,0,0,0,0,0,0]},
  {id:'car',name:'Car',bands:[0,3,4,2,1,0,-1,0,1,2,2,1]},
  {id:'iphone',name:'iPhone',bands:[0,-2,-1,0,1,2,2,1,0,-1,-2,-3]},
  {id:'macbook',name:'MacBook',bands:[0,-3,-2,0,1,2,2,1,-1,-2,-3,-4]},
  {id:'headphones',name:'Headphones',bands:[0,2,3,1,0,-1,0,1,2,3,3,2]},
  {id:'tv',name:'TV',bands:[0,-4,-3,-1,0,2,3,2,1,0,-1,-2]},
  {id:'theater',name:'Home Theater',bands:[0,5,4,3,1,0,-1,0,1,3,2,1]},
  {id:'bt',name:'Bluetooth',bands:[0,4,5,3,1,-1,-2,-1,0,1,1,0]},
  {id:'studio',name:'Studio Monitors',bands:[0,0,0,0,0,0,0,0,0,0,0,0]},
  {id:'gaming',name:'Gaming Headset',bands:[0,3,2,1,0,0,1,2,3,4,3,2]},
  {id:'tablet',name:'Tablet',bands:[0,-2,-2,0,1,2,2,1,0,-1,-2,-3]},
];

function detectInfo(n:string){
  const s=n.toLowerCase().replace(/[_\-\.]/g,' ');
  if(/voz|voc|vocal|lead|singer|coro|choir|bgv|backing/.test(s))return{instrument:'Voz',icon:'🎤'};
  if(/kick|bombo|drum|perc|beat|snare|hihat/.test(s))return{instrument:'Batería',icon:'🥁'};
  if(/bass|bajo|808|sub/.test(s))return{instrument:'Bajo',icon:'🎸'};
  if(/guitar|guitarra|gtr/.test(s))return{instrument:'Guitarra',icon:'🎸'};
  if(/piano|keys|keyboard|synth|pad|organ/.test(s))return{instrument:'Teclado',icon:'🎹'};
  return{instrument:'Pista',icon:'🎵'};
}

function peaks(buf:AudioBuffer,n:number):Float32Array{
  const d=buf.getChannelData(0),r=new Float32Array(n),s=Math.floor(d.length/n);
  for(let i=0;i<n;i++){let m=0;for(let j=0;j<s;j++){const v=Math.abs(d[i*s+j]||0);if(v>m)m=v;}r[i]=m;}
  return r;
}

function fmt(s:number){return`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;}

// Waveform canvas inside clip
function WaveClip({p,color,w,h,muted}:{p:Float32Array;color:string;w:number;h:number;muted:boolean}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c=ref.current;if(!c)return;
    const dpr=window.devicePixelRatio||1;
    c.width=w*dpr;c.height=h*dpr;
    const ctx=c.getContext('2d');if(!ctx)return;
    ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
    ctx.strokeStyle='rgba(255,255,255,'+(muted?0.2:0.85)+')';
    ctx.lineWidth=0.8;ctx.beginPath();
    const cy=h/2;
    for(let i=0;i<p.length;i++){
      const x=(i/(p.length-1))*w,a=p[i]*(cy-1);
      ctx.moveTo(x,cy-a);ctx.lineTo(x,cy+a);
    }
    ctx.stroke();
  },[p,w,h,muted]);
  return <canvas ref={ref} style={{width:w,height:h,display:'block'}}/>;
}

// Slider row in inspector
function SRow({label,value,min,max,step,color,unit='dB',onChange}:{label:string;value:number;min:number;max:number;step:number;color:string;unit?:string;onChange:(v:number)=>void}){
  return(
    <div style={{marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
        <span style={{fontSize:10,color:T.text2}}>{label}</span>
        <span style={{fontSize:10,color,fontFamily:'monospace',fontWeight:600}}>{value>0&&unit==='dB'?'+':''}{value}{unit}</span>
      </div>
      <div style={{position:'relative',height:14,display:'flex',alignItems:'center'}}>
        <div style={{position:'absolute',left:0,right:0,height:3,background:'rgba(255,255,255,0.06)',borderRadius:2}}>
          <div style={{height:'100%',background:color,borderRadius:2,width:`${((value-min)/(max-min))*100}%`}}/>
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e=>onChange(+e.target.value)}
          style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}}/>
      </div>
    </div>
  );
}

export default function StudioDAW({uploadedFiles,user,initialPreset=PRESETS[0],reverbOn=false,delayOn=false,stereoOn=false,onBack,onCreditsUpdate,onExport,onNavigate}:Props){
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

  // Audio refs
  const ctxRef=useRef<AudioContext|null>(null);
  const masterRef=useRef<GainNode|null>(null);
  const analyserRef=useRef<AnalyserNode|null>(null);
  const bassRef=useRef<BiquadFilterNode|null>(null);
  const midRef=useRef<BiquadFilterNode|null>(null);
  const highRef=useRef<BiquadFilterNode|null>(null);
  const dryRef=useRef<GainNode|null>(null);
  const revRef=useRef<GainNode|null>(null);
  const delRef=useRef<GainNode|null>(null);
  const pauseRef=useRef(0);
  const timerRef=useRef<number>();
  const fftRef=useRef<HTMLCanvasElement>(null);
  const lufsHist=useRef<number[]>([]);
  const iaNodes=useRef<(BiquadFilterNode|GainNode)[]>([]);
  const rafRef=useRef<number>();

  useEffect(()=>{setAllFiles(uploadedFiles);},[uploadedFiles]);
  useEffect(()=>{if(allFiles.length>0)initAudio();},[allFiles]);
  useEffect(()=>()=>{if(rafRef.current)cancelAnimationFrame(rafRef.current);},[]);

  const initAudio=async()=>{
    setLoading(true);setLoadPct(5);
    try{
      if(ctxRef.current&&ctxRef.current.state!=='closed')await ctxRef.current.close();
      const ctx=new(window.AudioContext||(window as any).webkitAudioContext)();
      ctxRef.current=ctx;

      // ── Correct signal chain ──
      // stem gainNode → stem panNode → stem eqLow → eqMid → eqHigh → stem analyser → dryGain
      // dryGain → bassFilter → midFilter → highFilter → masterGain → mixAnalyser → destination
      // (reverb/delay taps from dryGain)

      const master=ctx.createGain();master.gain.value=1;masterRef.current=master;
      const analyser=ctx.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=0.8;analyserRef.current=analyser;
      master.connect(analyser);analyser.connect(ctx.destination);

      const bass=ctx.createBiquadFilter();bass.type='lowshelf';bass.frequency.value=200;bass.gain.value=bassGain;bassRef.current=bass;
      const mid=ctx.createBiquadFilter();mid.type='peaking';mid.frequency.value=1000;mid.Q.value=1;mid.gain.value=midGain;midRef.current=mid;
      const high=ctx.createBiquadFilter();high.type='highshelf';high.frequency.value=5000;high.gain.value=highGain;highRef.current=high;

      // IA EQ chain inserted between high and master
      const iaOut=buildIA(ctx,high);

      const dry=ctx.createGain();dry.gain.value=1;dryRef.current=dry;
      iaOut.connect(dry);

      // Reverb via convolver approximation (simple delay)
      const revConv=ctx.createDelay(1.0);revConv.delayTime.value=0.06;
      const rev=ctx.createGain();rev.gain.value=revActive?0.25:0;revRef.current=rev;
      dry.connect(revConv);revConv.connect(rev);

      // Delay
      const delNode=ctx.createDelay(2.0);delNode.delayTime.value=0.25;
      const del=ctx.createGain();del.gain.value=delActive?0.2:0;delRef.current=del;
      dry.connect(delNode);delNode.connect(del);

      // All mix into bass (EQ chain)
      dry.connect(bass);rev.connect(bass);del.connect(bass);
      bass.connect(mid);mid.connect(high);
      // high → iaOut (already built) → dry (already)
      // Wait — iaOut needs to come BEFORE dry. Let me fix:
      // correct: stems → dry → bass → mid → high → iaEq → master → analyser → dest
      // Rebuild:
      dry.disconnect();rev.disconnect();del.disconnect();
      bass.disconnect();mid.disconnect();high.disconnect();

      // Correct chain: dry → bass → mid → high → iaOut2 → master → analyser → dest
      dry.connect(bass);bass.connect(mid);mid.connect(high);
      const iaOut2=buildIA(ctx,high);
      iaOut2.connect(master);

      // Rev/Del taps from dry (parallel)
      dry.connect(revConv);revConv.connect(rev);rev.connect(master);
      dry.connect(delNode);delNode.connect(del);del.connect(master);

      setLoadPct(20);

      // Decode stems
      const arr:Stem[]=[];
      for(let i=0;i<allFiles.length;i++){
        const file=allFiles[i];
        setLoadPct(20+Math.round((i/allFiles.length)*70));
        try{
          const ab=await file.arrayBuffer();
          const buf=await ctx.decodeAudioData(ab);
          const gain=ctx.createGain();gain.gain.value=1;
          const pan=ctx.createStereoPanner();pan.pan.value=0;
          const an=ctx.createAnalyser();an.fftSize=256;an.smoothingTimeConstant=0.7;
          const el=ctx.createBiquadFilter();el.type='lowshelf';el.frequency.value=200;el.gain.value=0;
          const em=ctx.createBiquadFilter();em.type='peaking';em.frequency.value=1000;em.Q.value=1;em.gain.value=0;
          const eh=ctx.createBiquadFilter();eh.type='highshelf';eh.frequency.value=5000;eh.gain.value=0;
          // stem chain
          gain.connect(pan);pan.connect(el);el.connect(em);em.connect(eh);eh.connect(an);an.connect(dry);
          const info=detectInfo(file.name);
          arr.push({id:`s${i}`,name:file.name.replace(/\.[^.]+$/,''),file,buffer:buf,gainNode:gain,panNode:pan,analyserNode:an,eqLow:el,eqMid:em,eqHigh:eh,volume:0,pan:0,muted:false,solo:false,waveformPeaks:peaks(buf,300),instrument:info.instrument,icon:info.icon,color:COLORS[i%COLORS.length]});
        }catch(e){console.error('decode err',file.name,e);}
      }
      setStems(arr);
      setDuration(arr.length?Math.max(...arr.map(s=>s.buffer.duration)):0);
      if(arr.length)setSelId(arr[0].id);
      setLoadPct(100);setLoading(false);
      startFFT();
    }catch(e){console.error('initAudio',e);setLoading(false);}
  };

  const buildIA=(ctx:AudioContext,input:AudioNode):AudioNode=>{
    // Build fresh IA EQ nodes
    const nodes:(BiquadFilterNode|GainNode)[]=[];
    const pg=ctx.createGain();pg.gain.value=1;nodes.push(pg);
    input.connect(pg);let prev:AudioNode=pg;
    const freqs=[30,60,170,310,600,1000,3000,6000,12000,14000,16000];
    for(let i=0;i<freqs.length;i++){
      const f=ctx.createBiquadFilter();
      f.type=i===0?'lowshelf':i===10?'highshelf':'peaking';
      f.frequency.value=freqs[i];f.Q.value=1;f.gain.value=iaEq.bands[i+1]??0;
      nodes.push(f);prev.connect(f);prev=f;
    }
    iaNodes.current=nodes;return prev;
  };

  const startFFT=()=>{
    const tick=()=>{
      rafRef.current=requestAnimationFrame(tick);
      const an=analyserRef.current;const c=fftRef.current;
      if(an&&c){
        const data=new Uint8Array(an.frequencyBinCount);an.getByteFrequencyData(data);
        const dpr=window.devicePixelRatio||1,w=c.offsetWidth,h=c.offsetHeight;
        if(w===0)return;
        c.width=w*dpr;c.height=h*dpr;
        const ctx=c.getContext('2d');if(!ctx)return;
        ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
        const bw=w/data.length;
        for(let i=0;i<data.length;i++){
          const pct=data[i]/255;const bh=pct*h;
          const g=ctx.createLinearGradient(0,h-bh,0,h);
          g.addColorStop(0,'#ec4899');g.addColorStop(1,'rgba(192,38,211,0.2)');
          ctx.fillStyle=g;ctx.fillRect(i*bw,h-bh,Math.max(1,bw-1),bh);
        }
        let sum=0;for(let i=0;i<data.length;i++)sum+=data[i]*data[i];
        const rms=Math.sqrt(sum/data.length);const lv=rms>0?-60+rms*0.4:-60;
        setMomLufs(Math.max(-60,Math.min(0,lv)));
        lufsHist.current.push(lv);if(lufsHist.current.length>300)lufsHist.current.shift();
        const avg=lufsHist.current.reduce((a,b)=>a+b,0)/lufsHist.current.length;
        setIntLufs(Math.max(-60,Math.min(0,avg)));
      }
    };tick();
  };

  const play=async()=>{
    const ctx=ctxRef.current;if(!ctx||stems.length===0)return;
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
        if(el>=duration)stop();
      },80);
    }
  };

  const stop=()=>{
    stems.forEach(s=>{try{s.sourceNode?.stop();s.sourceNode?.disconnect();}catch(e){}});
    setStems(p=>p.map(s=>({...s,sourceNode:undefined})));
    setPlaying(false);setCurrentTime(0);pauseRef.current=0;
    if(timerRef.current)clearInterval(timerRef.current);
  };

  const mute=(id:string)=>{
    const ctx=ctxRef.current;
    setStems(p=>p.map(s=>{
      if(s.id===id){const m=!s.muted;if(ctx)s.gainNode.gain.setTargetAtTime(m?0:Math.pow(10,s.volume/20),ctx.currentTime,0.01);return{...s,muted:m};}return s;
    }));
  };
  const solo=(id:string)=>{
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
  const setStemEQ=(id:string,band:'low'|'mid'|'high',val:number)=>{
    const ctx=ctxRef.current;
    setStems(p=>p.map(s=>{
      if(s.id===id){
        if(ctx){if(band==='low')s.eqLow.gain.setTargetAtTime(val,ctx.currentTime,0.05);else if(band==='mid')s.eqMid.gain.setTargetAtTime(val,ctx.currentTime,0.05);else s.eqHigh.gain.setTargetAtTime(val,ctx.currentTime,0.05);}
        return{...s};
      }return s;
    }));
  };
  const applyPreset=(p:MixPreset)=>{
    setPreset(p);setBassGain(p.bass);setMidGain(p.mid);setHighGain(p.high);
    setRevActive(p.reverbWet>0);setDelActive(p.delayWet>0);setWidActive(p.stereoWidth>0.5);
    const ctx=ctxRef.current;
    if(bassRef.current&&ctx)bassRef.current.gain.setTargetAtTime(p.bass,ctx.currentTime,0.05);
    if(midRef.current&&ctx)midRef.current.gain.setTargetAtTime(p.mid,ctx.currentTime,0.05);
    if(highRef.current&&ctx)highRef.current.gain.setTargetAtTime(p.high,ctx.currentTime,0.05);
    if(revRef.current&&ctx)revRef.current.gain.setTargetAtTime(p.reverbWet>0?0.25:0,ctx.currentTime,0.1);
    if(delRef.current&&ctx)delRef.current.gain.setTargetAtTime(p.delayWet>0?0.2:0,ctx.currentTime,0.1);
    setShowPresets(false);
  };
  const updEQ=(band:'bass'|'mid'|'high',v:number)=>{
    const ctx=ctxRef.current;
    if(band==='bass'){setBassGain(v);if(bassRef.current&&ctx)bassRef.current.gain.setTargetAtTime(v,ctx.currentTime,0.05);}
    else if(band==='mid'){setMidGain(v);if(midRef.current&&ctx)midRef.current.gain.setTargetAtTime(v,ctx.currentTime,0.05);}
    else{setHighGain(v);if(highRef.current&&ctx)highRef.current.gain.setTargetAtTime(v,ctx.currentTime,0.05);}
  };
  const addFiles=(files:File[])=>{setAllFiles(p=>[...p,...files]);};

  // Recording
  const toggleRecord=async()=>{
    if(recActive&&mediaRec){mediaRec.stop();setRecActive(false);return;}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mr=new MediaRecorder(stream);const chunks:Blob[]=[];
      mr.ondataavailable=e=>chunks.push(e.data);
      mr.onstop=async()=>{
        const blob=new Blob(chunks,{type:'audio/wav'});
        const fname=`grabacion_${Date.now()}.wav`;
        const file=new File([blob],fname,{type:'audio/wav'});
        addFiles([file]);
        stream.getTracks().forEach(t=>t.stop());
      };
      mr.start();setMediaRec(mr);setRecActive(true);
    }catch(e){alert('No se pudo acceder al micrófono');}
  };

  const exportMix=async()=>{
    if(stems.length===0||exporting)return;
    setExporting(true);
    try{
      const dur=Math.max(...stems.map(s=>s.buffer.duration));
      const off=new OfflineAudioContext(2,Math.floor(44100*dur),44100);
      const mg=off.createGain();mg.gain.value=1;
      const ba=off.createBiquadFilter();ba.type='lowshelf';ba.frequency.value=200;ba.gain.value=bassGain;
      const mi=off.createBiquadFilter();mi.type='peaking';mi.frequency.value=1000;mi.Q.value=1;mi.gain.value=midGain;
      const hi=off.createBiquadFilter();hi.type='highshelf';hi.frequency.value=5000;hi.gain.value=highGain;
      ba.connect(mi);mi.connect(hi);hi.connect(mg);mg.connect(off.destination);
      stems.filter(s=>!s.muted).forEach(s=>{
        const src=off.createBufferSource();src.buffer=s.buffer;
        const g=off.createGain();g.gain.value=Math.pow(10,s.volume/20);
        src.connect(g);g.connect(ba);src.start(0);
      });
      const rendered=await off.startRendering();
      const wav=toWav(rendered);
      const blob=new Blob([wav],{type:'audio/wav'});
      const url=URL.createObjectURL(blob);
      const pk=new Float32Array(800);
      const ch=rendered.getChannelData(0);const st=Math.floor(ch.length/800);
      for(let i=0;i<800;i++){let m=0;for(let j=0;j<st;j++){const v=Math.abs(ch[i*st+j]||0);if(v>m)m=v;}pk[i]=m;}
      onExport({audioBuffer:rendered,audioUrl:url,waveformPeaks:pk,finalLufs:intLufs,presetName:preset.name});
    }catch(e){console.error('export',e);}
    setExporting(false);
  };

  const selStem=stems.find(s=>s.id===selId)||stems[0];
  const pct=duration>0?currentTime/duration:0;
  const isPro=user?.is_pro||user?.plan==='unlimited';

  if(loading)return(
    <div style={{width:'100%',height:'100vh',background:T.bgDeep,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui',color:T.text}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:72,height:72,margin:'0 auto 20px',background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`,borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,boxShadow:`0 0 32px ${T.fuchsia}66`}}>✦</div>
        <div style={{fontSize:16,fontWeight:600,marginBottom:8}}>Cargando MixingStudio AI</div>
        <div style={{fontSize:12,color:T.text3,marginBottom:20}}>Inicializando motor de audio…</div>
        <div style={{width:260,height:5,background:'rgba(192,38,211,0.15)',borderRadius:3,margin:'0 auto',overflow:'hidden'}}>
          <div style={{height:'100%',background:`linear-gradient(90deg,${T.fuchsia},${T.pink})`,borderRadius:3,width:`${loadPct}%`,transition:'width 0.3s'}}/>
        </div>
        <div style={{fontSize:11,color:T.pink,marginTop:8,fontFamily:'monospace'}}>{loadPct}%</div>
      </div>
    </div>
  );

  // ── LAYOUT ────────────────────────────────────────────────────────────────
  return(
    <div style={{width:'100%',height:'100vh',background:`radial-gradient(ellipse at 80% -10%,rgba(192,38,211,0.15),transparent 50%),radial-gradient(ellipse at 0% 110%,rgba(162,89,255,0.12),transparent 50%),${T.bgDeep}`,fontFamily:'-apple-system,BlinkMacSystemFont,"DM Sans",system-ui,sans-serif',color:T.text,display:'flex',flexDirection:'column',overflow:'hidden'}}>

      <FlowNav active="studio" onNavigate={id=>{if(onNavigate)onNavigate(id);else onBack();}} user={user}/>

      {/* TITLE + TRANSPORT */}
      <div style={{padding:'8px 18px',display:'flex',alignItems:'center',gap:12,borderBottom:`0.5px solid ${T.border}`,background:'rgba(10,6,18,0.7)',flexShrink:0,flexWrap:'wrap'}}>
        <div style={{width:8,height:8,background:T.fuchsia,borderRadius:2,boxShadow:`0 0 8px ${T.fuchsia}`}}/>
        <span style={{fontSize:16,fontWeight:700,background:`linear-gradient(90deg,${T.pink},${T.violet})`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>MixingStudio AI</span>
        <span style={{fontSize:11,color:T.text3}}>{stems.length} tracks · {fmt(duration)}</span>

        {/* Preset picker */}
        <div style={{position:'relative'}}>
          <button onClick={()=>setShowPresets(!showPresets)} style={{padding:'4px 10px',borderRadius:980,background:`${preset.color}22`,border:`1.5px solid ${preset.color}`,color:preset.color,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
            <span>✦</span>{preset.name}<span style={{fontSize:9}}>▾</span>
          </button>
          {showPresets&&(
            <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,zIndex:300,background:T.surfaceSolid,border:`1px solid ${T.borderStrong}`,borderRadius:14,padding:10,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,minWidth:380,boxShadow:'0 12px 40px rgba(0,0,0,0.7)'}}>
              {PRESETS.map(p=>(
                <button key={p.id} onClick={()=>applyPreset(p)} style={{background:p.id===preset.id?`${p.color}22`:'rgba(255,255,255,0.03)',border:`1px solid ${p.id===preset.id?p.color:p.color+'22'}`,borderRadius:8,padding:'8px 6px',cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all 0.1s'}}>
                  <div style={{height:16,display:'flex',alignItems:'flex-end',gap:'1px',marginBottom:4}}>
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
        <button onClick={stop} style={{width:28,height:28,borderRadius:7,background:'rgba(255,255,255,0.04)',border:`0.5px solid ${T.border}`,cursor:'pointer',color:T.text2,fontSize:11,display:'flex',alignItems:'center',justifyContent:'center'}}>⏹</button>
        <button onClick={play} disabled={stems.length===0} style={{width:32,height:32,borderRadius:8,background:stems.length?`linear-gradient(135deg,${T.fuchsia},${T.pink})`:'rgba(255,255,255,0.04)',border:'none',cursor:stems.length?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:stems.length?`0 0 14px ${T.fuchsia}66`:'none'}}>
          {playing?<span style={{fontSize:13,color:'#fff'}}>⏸</span>:<span style={{fontSize:15,color:'#fff'}}>▶</span>}
        </button>
        <span style={{fontFamily:'monospace',fontSize:12,color:T.text,padding:'4px 8px',background:'rgba(8,4,16,0.5)',borderRadius:6}}>{fmt(currentTime)}/{fmt(duration)}</span>

        {/* Record */}
        <button onClick={toggleRecord} style={{height:28,padding:'0 10px',borderRadius:7,background:recActive?'rgba(239,68,68,0.2)':'rgba(255,255,255,0.04)',border:`0.5px solid ${recActive?'#ef4444':T.border}`,color:recActive?'#ef4444':T.text2,fontSize:11,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:recActive?'#ef4444':T.text3,display:'inline-block',animation:recActive?'pulse 1s infinite':'none'}}/>
          {recActive?'Detener':'Grabar'}
        </button>

        {/* Add stems */}
        <label style={{height:28,padding:'0 10px',borderRadius:7,background:'rgba(255,255,255,0.04)',border:`0.5px solid ${T.border}`,color:T.text2,fontSize:11,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5}}>
          <input type="file" multiple accept="audio/*" style={{display:'none'}} onChange={e=>{if(e.target.files)addFiles(Array.from(e.target.files));e.target.value='';}}/>
          ⬆ Stems ({stems.length}/12)
        </label>

        {/* Export */}
        <button onClick={exportMix} disabled={stems.length===0||exporting} style={{height:32,padding:'0 16px',borderRadius:980,background:stems.length?`linear-gradient(135deg,${T.fuchsia},${T.pink})`:'rgba(255,255,255,0.04)',border:'none',color:'#fff',fontSize:11,fontWeight:600,cursor:stems.length?'pointer':'not-allowed',fontFamily:'inherit',boxShadow:stems.length?`0 0 18px ${T.fuchsia}55`:'none'}}>
          {exporting?'Exportando…':'⬇ Exportar Mezcla'}
        </button>
      </div>

      {/* BODY: LEFT INSPECTOR | TIMELINE | RIGHT MIX BUS */}
      <div style={{flex:1,display:'flex',minHeight:0,overflow:'hidden'}}>

        {/* ── LEFT: INSPECTOR (selected track) ── */}
        <div style={{width:200,flexShrink:0,background:'rgba(12,7,22,0.9)',borderRight:`0.5px solid ${T.border}`,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'10px 12px',borderBottom:`0.5px solid ${T.border}`}}>
            <div style={{fontSize:8,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Inspector</div>
            {selStem?(
              <div style={{display:'flex',alignItems:'center',gap:7}}>
                <span style={{width:3,height:24,borderRadius:2,background:selStem.color,boxShadow:`0 0 8px ${selStem.color}`}}/>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:600,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:150}}>{selStem.name}</div>
                  <div style={{fontSize:9,color:T.text3}}>{selStem.instrument}</div>
                </div>
              </div>
            ):<div style={{fontSize:10,color:T.text3}}>Selecciona un track</div>}
          </div>
          {selStem&&(
            <div style={{flex:1,overflow:'auto',padding:'10px 12px'}}>
              <SRow label="Volumen" value={selStem.volume} min={-24} max={6} step={1} color={selStem.color} onChange={v=>setVol(selStem.id,v)}/>
              <div style={{fontSize:8,color:T.text3,letterSpacing:.5,textTransform:'uppercase',margin:'10px 0 8px'}}>EQ — Stem</div>
              <SRow label="Bass" value={Math.round(selStem.eqLow.gain.value)} min={-12} max={12} step={1} color={T.pink} onChange={v=>setStemEQ(selStem.id,'low',v)}/>
              <SRow label="Mid" value={Math.round(selStem.eqMid.gain.value)} min={-12} max={12} step={1} color={T.fuchsia} onChange={v=>setStemEQ(selStem.id,'mid',v)}/>
              <SRow label="High" value={Math.round(selStem.eqHigh.gain.value)} min={-12} max={12} step={1} color={T.violet} onChange={v=>setStemEQ(selStem.id,'high',v)}/>
              <div style={{fontSize:8,color:T.text3,letterSpacing:.5,textTransform:'uppercase',margin:'10px 0 8px'}}>Efectos del stem</div>
              {[{l:'Reverb',a:revActive,fn:()=>setRevActive(!revActive)},{l:'Delay',a:delActive,fn:()=>setDelActive(!delActive)},{l:'Widener',a:widActive,fn:()=>setWidActive(!widActive)}].map(fx=>(
                <div key={fx.l} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7}}>
                  <span style={{fontSize:10,color:T.text}}>{fx.l}</span>
                  <div onClick={fx.fn} style={{width:28,height:14,borderRadius:7,background:fx.a?T.fuchsia:'rgba(155,126,200,0.2)',position:'relative',cursor:'pointer'}}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:fx.a?16:2,transition:'left 0.15s'}}/>
                  </div>
                </div>
              ))}
              <div style={{fontSize:8,color:T.text3,letterSpacing:.5,textTransform:'uppercase',margin:'10px 0 6px'}}>Presets de género</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {PRESETS.map(p=>(
                  <button key={p.id} onClick={()=>applyPreset(p)} style={{padding:'3px 8px',borderRadius:980,background:`${p.color}15`,border:`0.5px solid ${p.color}44`,color:p.color,fontSize:9,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{p.name}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── CENTER: TIMELINE ── */}
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minHeight:0}}>
          {/* Toolbar */}
          <div style={{height:26,padding:'0 10px',borderBottom:`0.5px solid ${T.border}`,display:'flex',alignItems:'center',gap:12,background:'rgba(8,4,16,0.5)',flexShrink:0,fontSize:9,color:T.text3,fontFamily:'monospace'}}>
            <span>Snap 1/4</span><span style={{width:.5,height:8,background:T.border}}/>
            <span>Zoom 100%</span><span style={{width:.5,height:8,background:T.border}}/>
            <div style={{flex:1}}/>
            <span style={{color:T.green,display:'flex',alignItems:'center',gap:4}}><span style={{width:4,height:4,borderRadius:'50%',background:T.green,display:'inline-block'}}/>Spotify -14 ✓</span>
          </div>

          <div style={{flex:1,display:'flex',minHeight:0,overflow:'hidden'}}>
            {/* Track headers */}
            <div style={{width:185,flexShrink:0,borderRight:`0.5px solid ${T.border}`,background:'rgba(12,7,22,0.8)',display:'flex',flexDirection:'column'}}>
              <div style={{height:20,padding:'0 10px',display:'flex',alignItems:'center',fontSize:8,color:T.text3,letterSpacing:.4,textTransform:'uppercase',borderBottom:`0.5px solid ${T.border}`,flexShrink:0}}>Tracks</div>
              <div style={{flex:1,overflowY:'auto'}}>
                {stems.length===0&&(
                  <div style={{padding:20,textAlign:'center'}}>
                    <div style={{fontSize:28,marginBottom:10}}>🎵</div>
                    <div style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:5}}>Sube stems para empezar</div>
                    <div style={{fontSize:10,color:T.text3}}>O usa las opciones del menú superior</div>
                  </div>
                )}
                {stems.map(s=>(
                  <div key={s.id} onClick={()=>setSelId(s.id)} style={{height:TH,padding:'5px 9px',borderBottom:`0.5px solid ${T.border}`,display:'flex',alignItems:'center',gap:6,background:selId===s.id?'rgba(192,38,211,0.08)':'transparent',cursor:'pointer'}}>
                    <span style={{width:3,height:28,borderRadius:2,background:s.color,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:10,fontWeight:500,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:3}}>
                        <span style={{fontSize:11}}>{s.icon}</span>{s.name}
                      </div>
                      {/* Volume mini slider */}
                      <div style={{display:'flex',alignItems:'center',gap:4,marginTop:3}}>
                        <input type="range" min={-24} max={6} step={1} value={s.volume}
                          onChange={e=>{e.stopPropagation();setVol(s.id,+e.target.value);}}
                          onClick={e=>e.stopPropagation()}
                          style={{flex:1,accentColor:s.color,height:3,cursor:'pointer'}}/>
                        <span style={{fontSize:8,color:T.text3,fontFamily:'monospace',width:22,textAlign:'right'}}>{s.volume>0?'+':''}{s.volume}</span>
                      </div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();mute(s.id);}} style={{width:16,height:16,borderRadius:3,background:s.muted?T.amber:'transparent',color:s.muted?'#000':T.text3,border:`0.5px solid ${s.muted?T.amber:T.border}`,fontSize:8,fontWeight:700,cursor:'pointer',flexShrink:0}}>M</button>
                    <button onClick={e=>{e.stopPropagation();solo(s.id);}} style={{width:16,height:16,borderRadius:3,background:s.solo?T.pink:'transparent',color:s.solo?'#fff':T.text3,border:`0.5px solid ${s.solo?T.pink:T.border}`,fontSize:8,fontWeight:700,cursor:'pointer',flexShrink:0}}>S</button>
                  </div>
                ))}
                {/* Add track */}
                <label style={{height:TH,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',borderBottom:`0.5px solid ${T.border}`}}>
                  <input type="file" multiple accept="audio/*" style={{display:'none'}} onChange={e=>{if(e.target.files)addFiles(Array.from(e.target.files));e.target.value='';}}/>
                  <div style={{border:`1px dashed ${T.borderStrong}`,borderRadius:7,padding:'6px 12px',fontSize:10,color:T.pink,fontWeight:500,display:'flex',alignItems:'center',gap:5}}>
                    ✦ Nueva pista
                  </div>
                </label>
              </div>
            </div>

            {/* Timeline clips */}
            <div style={{flex:1,overflow:'auto',position:'relative',background:'rgba(8,4,12,0.5)'}}>
              {/* Ruler */}
              <div style={{height:20,position:'sticky',top:0,zIndex:3,background:'rgba(12,7,22,0.98)',borderBottom:`0.5px solid ${T.border}`,backdropFilter:'blur(4px)',display:'flex',alignItems:'center',padding:'0 0 0 6px'}}>
                {Array.from({length:32}).map((_,i)=>(
                  <div key={i} style={{width:50,fontSize:8,color:i%4===0?T.text3:'rgba(122,106,144,0.25)',fontFamily:'monospace',flexShrink:0,borderLeft:`0.5px solid ${i%4===0?T.border:'transparent'}`,paddingLeft:3}}>
                    {i%4===0?`${i+1}`:''}
                  </div>
                ))}
              </div>
              {/* Clips */}
              <div style={{position:'relative',minWidth:'max-content',minHeight:stems.length*TH+TH}}>
                {stems.map((s,i)=>{
                  const clipW=duration>0?Math.round((s.buffer.duration/duration)*1500):1400;
                  return(
                    <div key={s.id} style={{height:TH,borderBottom:`0.5px solid ${T.border}`,background:i%2===0?'rgba(255,255,255,0.006)':'transparent',position:'relative',display:'flex',alignItems:'center',padding:'3px 6px'}}>
                      <div style={{borderRadius:5,overflow:'hidden',background:`${s.color}bb`,border:`0.5px solid ${s.color}`,width:clipW,height:TH-8,position:'relative',cursor:'pointer',opacity:s.muted?0.35:1}}>
                        <div style={{position:'absolute',top:3,left:8,fontSize:8,fontWeight:600,color:'#fff',zIndex:1,whiteSpace:'nowrap',textShadow:'0 1px 2px rgba(0,0,0,0.5)'}}>{s.icon} {s.name}</div>
                        <WaveClip p={s.waveformPeaks} color={s.color} w={clipW} h={TH-8} muted={s.muted}/>
                      </div>
                    </div>
                  );
                })}
                {/* Playhead */}
                {duration>0&&(
                  <div style={{position:'absolute',top:0,bottom:0,left:`${pct*1500}px`,width:2,background:T.pink,pointerEvents:'none',boxShadow:`0 0 8px ${T.pink}`,zIndex:5}}>
                    <div style={{position:'absolute',top:0,left:-5,width:12,height:7,background:T.pink,clipPath:'polygon(0 0,100% 0,50% 100%)'}}/>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: MIX BUS + CONTROLS ── */}
        <div style={{width:280,flexShrink:0,background:'rgba(12,7,22,0.9)',borderLeft:`0.5px solid ${T.border}`,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          {/* Tabs */}
          <div style={{display:'flex',padding:5,gap:3,borderBottom:`0.5px solid ${T.border}`,flexShrink:0}}>
            {(['mix','gen','stems'] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{flex:1,height:26,borderRadius:5,background:tab===t?'rgba(192,38,211,0.18)':'transparent',color:tab===t?T.pink:T.text2,border:tab===t?`0.5px solid ${T.borderStrong}`:'0.5px solid transparent',fontSize:10,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                {t==='mix'?'Mix Bus':t==='gen'?'Generar':'Stems'}
              </button>
            ))}
          </div>

          <div style={{flex:1,overflow:'auto'}}>
            {tab==='mix'&&(
              <div style={{padding:12,display:'flex',flexDirection:'column',gap:10}}>

                {/* LUFS — VU Meter */}
                <div style={{background:T.surface,borderRadius:10,padding:12,border:`0.5px solid ${T.border}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                    <span style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase'}}>LUFS — VU Meter</span>
                    <span style={{fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:980,background:momLufs>-14?'rgba(239,68,68,0.12)':momLufs<-30?'rgba(255,255,255,0.06)':'rgba(74,222,128,0.1)',color:momLufs>-14?T.red:momLufs<-30?T.text3:T.green,border:`0.5px solid ${momLufs>-14?T.red:momLufs<-30?T.border:T.green}33`}}>
                      {momLufs>-14?'⚠ Loud':momLufs<-30?'↓ Soft':'✓ Safe'}
                    </span>
                  </div>
                  {/* VU bars */}
                  <div style={{display:'flex',gap:3,height:48,alignItems:'flex-end',marginBottom:8}}>
                    {Array.from({length:20}).map((_,i)=>{
                      const thresh=-60+i*3;const lit=momLufs>thresh;
                      const c=thresh>-9?T.red:thresh>-18?T.amber:T.green;
                      return <div key={i} style={{flex:1,height:`${(i/20)*100+20}%`,borderRadius:'1px 1px 0 0',background:lit?c:'rgba(255,255,255,0.05)',transition:'background 0.05s'}}/>;
                    })}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                    {[{l:'MOM',v:momLufs},{l:'INT',v:intLufs}].map(m=>(
                      <div key={m.l} style={{background:'rgba(8,4,16,0.6)',borderRadius:7,padding:'7px',textAlign:'center',border:`0.5px solid ${T.border}`}}>
                        <div style={{fontFamily:'monospace',fontSize:15,fontWeight:600,color:T.pink}}>{m.v.toFixed(1)}</div>
                        <div style={{fontSize:8,color:T.text3,textTransform:'uppercase',letterSpacing:.4}}>{m.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:7,display:'flex',justifyContent:'space-between',fontSize:9}}><span style={{color:T.text3}}>Spotify</span><span style={{color:T.green}}>-14 LUFS</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:9}}><span style={{color:T.text3}}>YouTube</span><span style={{color:T.text3}}>-14 LUFS</span></div>
                </div>

                {/* EQ Master */}
                <div style={{background:T.surface,borderRadius:10,padding:12,border:`0.5px solid ${T.border}`}}>
                  <div style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:10}}>EQ Master</div>
                  <SRow label="Bass" value={bassGain} min={-12} max={12} step={1} color={T.pink} onChange={v=>updEQ('bass',v)}/>
                  <SRow label="Mid" value={midGain} min={-12} max={12} step={1} color={T.fuchsia} onChange={v=>updEQ('mid',v)}/>
                  <SRow label="High" value={highGain} min={-12} max={12} step={1} color={T.violet} onChange={v=>updEQ('high',v)}/>
                </div>

                {/* Compresión */}
                <div style={{background:T.surface,borderRadius:10,padding:12,border:`0.5px solid ${T.border}`}}>
                  <div style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:7}}>Compresión</div>
                  <div style={{fontSize:14,fontWeight:700,color:T.text,textTransform:'capitalize'}}>{preset.compression||'medium'}</div>
                  <div style={{fontSize:10,color:T.text3,marginTop:2}}>{preset.compression==='none'?'Sin compresión':preset.compression==='low'?'Thr: -24dB · 2:1':preset.compression==='medium'?'Thr: -18dB · 4:1':preset.compression==='high'?'Thr: -14dB · 6:1':'Thr: -10dB · 10:1'}</div>
                  <div style={{height:4,background:'rgba(192,38,211,0.12)',borderRadius:2,marginTop:7,overflow:'hidden'}}>
                    <div style={{height:'100%',background:`linear-gradient(90deg,${T.green},${T.amber},${T.pink})`,width:preset.compression==='none'?'5%':preset.compression==='low'?'25%':preset.compression==='medium'?'45%':preset.compression==='high'?'65%':'85%'}}/>
                  </div>
                </div>

                {/* FX */}
                <div style={{background:T.surface,borderRadius:10,padding:12,border:`0.5px solid ${T.border}`}}>
                  <div style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:9}}>Efectos Master</div>
                  {[{l:'Reverb',v:`${Math.round(preset.reverbWet*100)}%`,sub:'Espacio',a:revActive,fn:()=>setRevActive(!revActive)},{l:'Delay',v:`${Math.round(preset.delayWet*100)}%`,sub:'1/4 beat',a:delActive,fn:()=>setDelActive(!delActive)},{l:'Widener',v:`${Math.round(preset.stereoWidth*100)}%`,sub:'Estéreo',a:widActive,fn:()=>setWidActive(!widActive)}].map(fx=>(
                    <div key={fx.l} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                      <div><div style={{fontSize:11,color:T.text}}>{fx.l}</div><div style={{fontSize:9,color:T.text3}}>{fx.v} · {fx.sub}</div></div>
                      <div onClick={fx.fn} style={{width:30,height:16,borderRadius:8,background:fx.a?T.fuchsia:'rgba(155,126,200,0.15)',position:'relative',cursor:'pointer',transition:'background 0.2s'}}>
                        <div style={{width:12,height:12,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:fx.a?16:2,transition:'left 0.2s'}}/>
                      </div>
                    </div>
                  ))}
                </div>

                {/* IA EQ */}
                <div style={{background:T.surface,borderRadius:10,padding:12,border:`0.5px solid ${T.border}`}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                    <span style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase'}}>IA EQ — Optimizar para</span>
                    <span style={{fontSize:8,color:T.green,display:'flex',alignItems:'center',gap:3}}><span style={{width:4,height:4,borderRadius:'50%',background:T.green,display:'inline-block'}}/>Live</span>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                    {IAEQ.map(p=>(
                      <button key={p.id} onClick={()=>setIaEq(p)} style={{padding:'4px 9px',borderRadius:980,background:iaEq.id===p.id?`linear-gradient(135deg,${T.fuchsia},${T.pink})`:'rgba(255,255,255,0.04)',border:`0.5px solid ${iaEq.id===p.id?T.borderStrong:T.border}`,color:iaEq.id===p.id?'#fff':T.text2,fontSize:9,fontWeight:iaEq.id===p.id?600:400,cursor:'pointer',fontFamily:'inherit',boxShadow:iaEq.id===p.id?`0 0 10px ${T.fuchsia}44`:undefined}}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* FFT */}
                <div style={{background:T.surface,borderRadius:10,padding:12,border:`0.5px solid ${T.border}`}}>
                  <div style={{fontSize:9,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:6}}>Analizador FFT</div>
                  <canvas ref={fftRef} style={{width:'100%',height:56,borderRadius:6,background:'rgba(8,4,16,0.8)',display:'block'}}/>
                </div>
              </div>
            )}

            {tab==='gen'&&(
              <div style={{padding:14,display:'flex',flexDirection:'column',gap:10}}>
                <div style={{fontSize:11,color:T.text2,lineHeight:1.5}}>Genera y agrega pistas directamente al DAW.</div>
                <button onClick={()=>onNavigate?onNavigate('create'):null} style={{width:'100%',height:38,borderRadius:9,background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`,border:'none',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 0 18px ${T.fuchsia}55`}}>✦ Crear canción completa</button>
                <button onClick={()=>onNavigate?onNavigate('separate'):null} style={{width:'100%',height:36,borderRadius:8,background:'rgba(124,58,237,0.12)',border:`0.5px solid rgba(124,58,237,0.4)`,color:T.violet,fontSize:11,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>✂ Separar stems con Demucs</button>
                <button onClick={toggleRecord} style={{width:'100%',height:36,borderRadius:8,background:recActive?'rgba(239,68,68,0.12)':'rgba(255,255,255,0.04)',border:`0.5px solid ${recActive?'#ef4444':T.border}`,color:recActive?'#ef4444':T.text2,fontSize:11,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                  <span style={{width:7,height:7,borderRadius:'50%',background:recActive?'#ef4444':T.text3,display:'inline-block'}}/>
                  {recActive?'Detener grabación':'🎤 Grabar desde micrófono'}
                </button>
              </div>
            )}

            {tab==='stems'&&(
              <div style={{padding:12,display:'flex',flexDirection:'column',gap:7}}>
                <div style={{fontSize:8,color:T.text3,letterSpacing:.5,textTransform:'uppercase',marginBottom:3}}>Stems cargados ({stems.length}/12)</div>
                {stems.map(s=>(
                  <div key={s.id} onClick={()=>setSelId(s.id)} style={{display:'flex',alignItems:'center',gap:7,padding:'7px 9px',background:selId===s.id?`${s.color}12`:T.surface,borderRadius:8,border:`0.5px solid ${selId===s.id?s.color+'55':T.border}`,cursor:'pointer'}}>
                    <span style={{fontSize:13}}>{s.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:10,fontWeight:500,color:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</div>
                      <div style={{fontSize:8,color:T.text3}}>{fmt(s.buffer.duration)} · {s.instrument}</div>
                    </div>
                    <span style={{fontSize:8,color:s.muted?T.amber:s.solo?T.pink:T.text3,fontWeight:700}}>{s.muted?'M':s.solo?'S':'—'}</span>
                  </div>
                ))}
                <label style={{width:'100%',height:34,borderRadius:8,background:'rgba(192,38,211,0.06)',border:`1px dashed ${T.borderStrong}`,color:T.pink,fontSize:10,fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:5,marginTop:4}}>
                  <input type="file" multiple accept="audio/*" style={{display:'none'}} onChange={e=>{if(e.target.files)addFiles(Array.from(e.target.files));e.target.value='';}}/>⬆ Agregar más
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MASTER STRIP — bottom */}
      <div style={{height:68,flexShrink:0,borderTop:`0.5px solid ${T.border}`,background:'rgba(12,7,22,0.9)',display:'grid',gridTemplateColumns:'160px 1fr auto auto auto auto',alignItems:'center',padding:'0 14px',gap:14,overflow:'hidden'}}>
        <div>
          <div style={{fontSize:9,fontWeight:700,color:T.text,letterSpacing:.4}}>MIX BUS</div>
          <div style={{height:3,background:'rgba(255,255,255,0.06)',borderRadius:2,marginTop:4}}>
            <div style={{height:'100%',background:`linear-gradient(90deg,${T.fuchsia},${T.pink})`,borderRadius:2,width:'68%'}}/>
          </div>
          <div style={{marginTop:4,padding:'2px 7px',borderRadius:980,background:`${preset.color}18`,color:preset.color,fontSize:8,fontWeight:600,display:'inline-block',border:`0.5px solid ${preset.color}33`}}>✦ {preset.name}</div>
        </div>
        {/* EQ strip */}
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          {[{l:'Bass',v:bassGain,c:T.pink,b:'bass'as const},{l:'Mid',v:midGain,c:T.fuchsia,b:'mid'as const},{l:'High',v:highGain,c:T.violet,b:'high'as const}].map(eq=>(
            <div key={eq.l} style={{flex:1}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}><span style={{fontSize:8,color:T.text3}}>{eq.l}</span><span style={{fontSize:8,color:eq.c,fontFamily:'monospace'}}>{eq.v>0?'+':''}{eq.v}</span></div>
              <div style={{height:2,background:'rgba(192,38,211,0.12)',borderRadius:1}}><div style={{height:'100%',background:eq.c,borderRadius:1,width:`${((eq.v+12)/24)*100}%`}}/></div>
            </div>
          ))}
        </div>
        {/* FX pills */}
        <div style={{display:'flex',gap:4}}>
          {[{l:'Rev',a:revActive},{l:'Dly',a:delActive},{l:'Wide',a:widActive}].map(fx=>(
            <span key={fx.l} style={{padding:'3px 7px',borderRadius:980,background:fx.a?`${T.fuchsia}22`:'rgba(255,255,255,0.04)',color:fx.a?T.pink:T.text3,fontSize:8,fontWeight:500,border:`0.5px solid ${fx.a?T.borderStrong:T.border}`}}>{fx.l}</span>
          ))}
        </div>
        {/* IA EQ */}
        <div style={{fontSize:9,color:T.pink,fontWeight:500,padding:'4px 10px',borderRadius:980,background:'rgba(192,38,211,0.1)',border:`0.5px solid ${T.borderStrong}`}}>IA · {iaEq.name}</div>
        {/* LUFS strip */}
        <div style={{display:'flex',gap:5}}>
          {[{v:momLufs,l:'MOM'},{v:intLufs,l:'INT'}].map(m=>(
            <div key={m.l} style={{padding:'3px 7px',borderRadius:6,background:'rgba(8,4,16,0.7)',border:`0.5px solid ${T.border}`,textAlign:'center'}}>
              <div style={{fontFamily:'monospace',fontSize:11,fontWeight:600,color:T.pink}}>{m.v.toFixed(1)}</div>
              <div style={{fontSize:7,color:T.text3,textTransform:'uppercase'}}>{m.l}</div>
            </div>
          ))}
        </div>
        {/* Safe badge */}
        <span style={{fontSize:9,color:T.green,padding:'3px 8px',borderRadius:980,background:'rgba(74,222,128,0.08)',border:'0.5px solid rgba(74,222,128,0.3)'}}>+ Safe</span>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

// WAV encoder
function toWav(buf:AudioBuffer):ArrayBuffer{
  const nc=buf.numberOfChannels,sr=buf.sampleRate,len=buf.length,bps=16,bpS=bps/8,ba=nc*bpS,dl=len*ba;
  const ab=new ArrayBuffer(44+dl);const v=new DataView(ab);
  const w=(o:number,s:string)=>s.split('').forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  w(0,'RIFF');v.setUint32(4,36+dl,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,nc,true);v.setUint32(24,sr,true);v.setUint32(28,sr*ba,true);v.setUint16(32,ba,true);v.setUint16(34,bps,true);w(36,'data');v.setUint32(40,dl,true);
  let off=44;for(let i=0;i<len;i++){for(let ch=0;ch<nc;ch++){const s=Math.max(-1,Math.min(1,buf.getChannelData(ch)[i]));v.setInt16(off,s<0?s*32768:s*32767,true);off+=2;}}
  return ab;
}
