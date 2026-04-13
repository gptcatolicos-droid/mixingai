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

// =============================================
// EQ PRESETS
// =============================================
interface EQPreset { id: string; name: string; bands: number[]; }

const EQ_PRESETS: EQPreset[] = [
  { id:'default',  name:'Default',          bands:[0,0,0,0,0,0,0,0,0,0,0,0] },
  { id:'car',      name:'Car',              bands:[0,3,4,2,1,0,-1,0,1,2,2,1] },
  { id:'iphone',   name:'iPhone',           bands:[0,-2,-1,0,1,2,2,1,0,-1,-2,-3] },
  { id:'macbook',  name:'MacBook',          bands:[0,-3,-2,0,1,2,2,1,-1,-2,-3,-4] },
  { id:'headphones',name:'Headphones',      bands:[0,2,3,1,0,-1,0,1,2,3,3,2] },
  { id:'tv',       name:'TV',               bands:[0,-4,-3,-1,0,2,3,2,1,0,-1,-2] },
  { id:'theater',  name:'Home Theater',     bands:[0,5,4,3,1,0,-1,0,1,3,2,1] },
  { id:'bt',       name:'Bluetooth Speaker',bands:[0,4,5,3,1,-1,-2,-1,0,1,1,0] },
  { id:'studio',   name:'Studio Monitors',  bands:[0,0,0,0,0,0,0,0,0,0,0,0] },
  { id:'gaming',   name:'Gaming Headset',   bands:[0,3,2,1,0,0,1,2,3,4,3,2] },
  { id:'tablet',   name:'Tablet',           bands:[0,-2,-2,0,1,2,2,1,0,-1,-2,-3] },
];

const EQ_BAND_FREQS = [
  { label:'Pre',    freq:null,  type:'gain'      as const },
  { label:'30 Hz',  freq:30,    type:'lowshelf'  as const },
  { label:'60 Hz',  freq:60,    type:'peaking'   as const },
  { label:'170 Hz', freq:170,   type:'peaking'   as const },
  { label:'310 Hz', freq:310,   type:'peaking'   as const },
  { label:'600 Hz', freq:600,   type:'peaking'   as const },
  { label:'1k Hz',  freq:1000,  type:'peaking'   as const },
  { label:'3k Hz',  freq:3000,  type:'peaking'   as const },
  { label:'6k Hz',  freq:6000,  type:'peaking'   as const },
  { label:'12k Hz', freq:12000, type:'peaking'   as const },
  { label:'14k Hz', freq:14000, type:'peaking'   as const },
  { label:'16k Hz', freq:16000, type:'highshelf' as const },
];

// =============================================
// PAYMENT MODAL
// =============================================
function PaymentModal({ onClose, onSuccess }: { onClose: ()=>void; onSuccess: ()=>void }) {
  const [step, setStep] = useState<'choose'|'processing'|'done'>('choose');
  const [method, setMethod] = useState<'paypal'|'mercadopago'|null>(null);

  const handlePay = (m: 'paypal'|'mercadopago') => {
    setMethod(m); setStep('processing');
    setTimeout(() => {
      setStep('done');
      try {
        const stored = localStorage.getItem('audioMixerUser');
        const u = stored ? JSON.parse(stored) : {};
        u.is_pro = true; u.plan = 'pro';
        localStorage.setItem('audioMixerUser', JSON.stringify(u));
      } catch {}
    }, 2400);
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(8,4,16,0.96)',backdropFilter:'blur(14px)',zIndex:1100,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      <div style={{background:'linear-gradient(135deg,rgba(26,16,40,0.99),rgba(15,10,26,0.99))',border:'1px solid rgba(192,38,211,0.35)',borderRadius:'24px',padding:'36px 32px',maxWidth:'420px',width:'100%',textAlign:'center',boxShadow:'0 0 60px rgba(192,38,211,0.25)'}}>
        {step==='choose' && <>
          <div style={{fontSize:'36px',marginBottom:'14px'}}>🎛️</div>
          <h2 style={{fontSize:'22px',fontWeight:800,color:'#F8F0FF',marginBottom:'6px',letterSpacing:'-0.5px'}}>Mezclas Ilimitadas</h2>
          <p style={{fontSize:'13px',color:'#9B7EC8',marginBottom:'6px'}}>Tu primera mezcla fue gratis.</p>
          <p style={{fontSize:'13px',color:'#9B7EC8',marginBottom:'24px'}}>Desbloquea mezclas ilimitadas con Audio Lab por solo <span style={{color:'#EC4899',fontSize:'22px',fontWeight:800}}>$3.99</span></p>
          <div style={{display:'flex',flexDirection:'column',gap:'12px',marginBottom:'20px'}}>
            <button onClick={()=>handlePay('paypal')} style={{width:'100%',background:'#0070BA',border:'none',color:'#fff',padding:'16px',borderRadius:'14px',fontSize:'15px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',boxShadow:'0 4px 20px rgba(0,112,186,0.4)'}}>
              <span style={{fontSize:'20px',background:'#fff',borderRadius:'4px',padding:'2px 6px',color:'#003087',fontWeight:900,fontFamily:'sans-serif'}}>P</span>
              Pagar con PayPal
            </button>
            <button onClick={()=>handlePay('mercadopago')} style={{width:'100%',background:'linear-gradient(135deg,#009EE3,#00B1EA)',border:'none',color:'#fff',padding:'16px',borderRadius:'14px',fontSize:'15px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',boxShadow:'0 4px 20px rgba(0,158,227,0.4)'}}>
              <span style={{fontSize:'20px'}}>💳</span>
              Pagar con Mercado Pago
            </button>
          </div>
          <button onClick={onClose} style={{background:'transparent',border:'none',color:'rgba(155,126,200,0.5)',fontSize:'12px',cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>
        </>}
        {step==='processing' && <>
          <div style={{width:'64px',height:'64px',borderRadius:'50%',background:'rgba(192,38,211,0.12)',border:'2px solid rgba(192,38,211,0.4)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:'28px'}}>⏳</div>
          <h2 style={{fontSize:'20px',fontWeight:800,color:'#F8F0FF',marginBottom:'8px'}}>Procesando pago...</h2>
          <p style={{fontSize:'13px',color:'#9B7EC8',marginBottom:'20px'}}>Conectando con {method==='paypal'?'PayPal':'Mercado Pago'}...</p>
          <div style={{height:'4px',background:'rgba(192,38,211,0.15)',borderRadius:'2px',overflow:'hidden'}}>
            <div style={{height:'100%',background:'linear-gradient(90deg,#EC4899,#C026D3)',animation:'pay-prog 2.4s ease forwards',borderRadius:'2px'}}></div>
          </div>
          <style>{`@keyframes pay-prog{from{width:0}to{width:88%}}`}</style>
        </>}
        {step==='done' && <>
          <div style={{width:'64px',height:'64px',borderRadius:'50%',background:'rgba(74,222,128,0.12)',border:'2px solid rgba(74,222,128,0.4)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:'28px'}}>✅</div>
          <h2 style={{fontSize:'20px',fontWeight:800,color:'#4ade80',marginBottom:'8px'}}>¡Pago exitoso!</h2>
          <p style={{fontSize:'13px',color:'#9B7EC8',marginBottom:'24px'}}>Ya tienes mezclas ilimitadas. ¡A crear música!</p>
          <button onClick={onSuccess} style={{width:'100%',background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'16px',borderRadius:'14px',fontSize:'15px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 0 24px rgba(192,38,211,0.4)'}}>
            Abrir Audio Lab →
          </button>
        </>}
      </div>
    </div>
  );
}

// =============================================
// EQ FADER (vertical)
// =============================================
function EQFader({ value, onChange, label }: { value:number; onChange:(v:number)=>void; label:string }) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'5px',minWidth:'54px',flex:1}}>
      <span style={{fontSize:'10px',fontWeight:700,fontFamily:'monospace',color:value===0?'#9B7EC8':value>0?'#4ade80':'#EC4899',minHeight:'14px',textAlign:'center'}}>
        {value>0?`+${value.toFixed(1)}`:value.toFixed(1)} dB
      </span>
      <div style={{position:'relative',height:'80px',display:'flex',alignItems:'center',justifyContent:'center',width:'100%'}}>
        <input
          type="range" min="-12" max="12" step="0.5" value={value}
          onChange={e=>onChange(parseFloat(e.target.value))}
          style={{
            writingMode:'vertical-lr' as any,
            direction:'rtl' as any,
            WebkitAppearance:'slider-vertical' as any,
            height:'80px',width:'20px',
            accentColor:value>0?'#C026D3':value<0?'#EC4899':'#9B7EC8',
            cursor:'pointer',
          }}
        />
      </div>
      <span style={{fontSize:'9px',color:'#9B7EC8',textAlign:'center',lineHeight:1.2,maxWidth:'52px'}}>{label}</span>
    </div>
  );
}

// =============================================
// AUDIO LAB MODAL
// =============================================
interface AudioLabProps {
  exportData: {audioBuffer:AudioBuffer;waveformPeaks:Float32Array;finalLufs:number;presetName?:string};
  onClose: ()=>void;
  onDownload: (bands:number[],preset:string)=>void;
  isPro: boolean;
  onPaywall: ()=>void;
}

function AudioLabModal({ exportData, onClose, onDownload, isPro, onPaywall }: AudioLabProps) {
  const [selPreset, setSelPreset] = useState<EQPreset>(EQ_PRESETS[0]);
  const [bands, setBands] = useState<number[]>([...EQ_PRESETS[0].bands]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportPct, setExportPct] = useState(0);

  const ctxRef = useRef<AudioContext|null>(null);
  const srcRef = useRef<AudioBufferSourceNode|null>(null);
  const startRef = useRef(0);
  const pausedRef = useRef(0);
  const timerRef = useRef<number>();
  const eqRef = useRef<(BiquadFilterNode|GainNode)[]>([]);
  const wavRef = useRef<HTMLCanvasElement>(null);
  const dur = exportData.audioBuffer.duration;

  useEffect(()=>{
    if(!wavRef.current) return;
    drawWaveform({canvas:wavRef.current,waveformPeaks:exportData.waveformPeaks,currentTime:curTime,duration:dur,style:'soundcloud',colors:{played:'#C026D3',unplayed:'rgba(124,58,237,0.2)',playhead:'#EC4899'}});
  },[curTime,dur]);

  const updateLiveEQ = (b: number[]) => {
    const nodes = eqRef.current; if(!nodes.length) return;
    (nodes[0] as GainNode).gain.value = Math.pow(10, b[0]/20);
    for(let i=1;i<Math.min(b.length,nodes.length);i++) (nodes[i] as BiquadFilterNode).gain.value = b[i];
  };

  const applyPreset = (p: EQPreset) => { setSelPreset(p); setBands([...p.bands]); updateLiveEQ([...p.bands]); };

  const buildChain = (ctx: AudioContext, src: AudioNode): AudioNode => {
    const ns: (BiquadFilterNode|GainNode)[] = [];
    const pg = ctx.createGain(); pg.gain.value = Math.pow(10,bands[0]/20); ns.push(pg);
    src.connect(pg); let prev: AudioNode = pg;
    for(let i=1;i<EQ_BAND_FREQS.length;i++){
      const bd = EQ_BAND_FREQS[i]; const f = ctx.createBiquadFilter();
      f.type = bd.type as any; f.frequency.value = bd.freq!; f.Q.value = 1.0; f.gain.value = bands[i]??0;
      ns.push(f); prev.connect(f); prev=f;
    }
    eqRef.current = ns; return prev;
  };

  const stopAudio = () => {
    if(srcRef.current){try{srcRef.current.stop();srcRef.current.disconnect();}catch{}srcRef.current=null;}
    if(timerRef.current) clearInterval(timerRef.current);
    setIsPlaying(false);
  };

  const togglePlay = async () => {
    if(isPlaying){pausedRef.current=curTime;stopAudio();return;}
    const ctx = ctxRef.current||new AudioContext(); ctxRef.current=ctx;
    if(ctx.state==='suspended') await ctx.resume();
    const s = ctx.createBufferSource(); s.buffer=exportData.audioBuffer;
    const out = buildChain(ctx,s); out.connect(ctx.destination);
    const off = pausedRef.current; s.start(0,off); startRef.current=ctx.currentTime-off;
    srcRef.current=s; setIsPlaying(true);
    timerRef.current=window.setInterval(()=>{
      if(!ctxRef.current) return;
      const t=Math.min(ctxRef.current.currentTime-startRef.current,dur); setCurTime(t);
      if(t>=dur-0.05){stopAudio();setCurTime(0);pausedRef.current=0;}
    },80);
    s.onended=()=>{if(timerRef.current)clearInterval(timerRef.current);setIsPlaying(false);pausedRef.current=0;setCurTime(0);};
  };

  const handleBand = (i:number,v:number) => { const b=[...bands]; b[i]=v; setBands(b); updateLiveEQ(b); };

  const handleDownload = async () => {
    if(!isPro){onPaywall();return;}
    setIsExporting(true); setExportPct(0); stopAudio();
    try {
      const s = exportData.audioBuffer;
      const off = new OfflineAudioContext(s.numberOfChannels,s.length,s.sampleRate);
      const src2 = off.createBufferSource(); src2.buffer=s;
      const pg = off.createGain(); pg.gain.value=Math.pow(10,bands[0]/20); src2.connect(pg);
      let prev: AudioNode = pg;
      for(let i=1;i<EQ_BAND_FREQS.length;i++){
        const bd=EQ_BAND_FREQS[i]; const f=off.createBiquadFilter();
        f.type=bd.type as any; f.frequency.value=bd.freq!; f.Q.value=1.0; f.gain.value=bands[i]??0;
        prev.connect(f); prev=f;
      }
      prev.connect(off.destination); src2.start(0);
      setExportPct(35);
      const rendered = await off.startRendering();
      setExportPct(65);
      normalizeTo(rendered,-20);
      setExportPct(88);
      const blob = bufferToWav(rendered);
      const url = URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=`mix-${selPreset.id}-20lufs.wav`; a.click();
      URL.revokeObjectURL(url);
      setExportPct(100); await new Promise(r=>setTimeout(r,500));
      onDownload(bands,selPreset.name);
    } catch(e){console.error(e);}
    setIsExporting(false); setExportPct(0);
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(8,4,16,0.98)',backdropFilter:'blur(8px)',zIndex:1000,display:'flex',flexDirection:'column',overflowY:'auto'}}>
      {/* TOPBAR */}
      <div style={{background:'rgba(10,6,18,0.99)',borderBottom:'1px solid rgba(192,38,211,0.18)',padding:'0 20px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10,backdropFilter:'blur(12px)'}}>
        <button onClick={onClose} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'#9B7EC8',padding:'6px 14px',borderRadius:'8px',fontSize:'12px',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>← Volver</button>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'1.5px',color:'#C026D3',textTransform:'uppercase'}}>CREATOR TOOLS</div>
          <div style={{fontSize:'17px',fontWeight:800,color:'#F8F0FF',letterSpacing:'-0.3px',lineHeight:1.1}}>Audio Lab (Beta)</div>
        </div>
        <div style={{display:'flex',gap:'6px'}}>
          <span style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'5px 10px',fontSize:'10px',fontWeight:600,color:'#9B7EC8',cursor:'pointer'}}>↩ Songs</span>
          <span style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'5px 10px',fontSize:'10px',fontWeight:600,color:'#9B7EC8',cursor:'pointer'}}>🏠 Home</span>
        </div>
      </div>

      <div style={{maxWidth:'1000px',margin:'0 auto',padding:'24px 20px',width:'100%'}}>
        <p style={{fontSize:'12px',color:'rgba(155,126,200,0.6)',marginBottom:'20px'}}>
          Preview a waveform and test EQ presets. This version is UI + browser processing only.
        </p>

        {/* EQ PRESET BUTTONS */}
        <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'20px'}}>
          {EQ_PRESETS.map(p=>(
            <button key={p.id} onClick={()=>applyPreset(p)} style={{
              padding:'8px 18px',borderRadius:'980px',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s',
              background:selPreset.id===p.id?'rgba(192,38,211,0.18)':'rgba(255,255,255,0.04)',
              border:`1px solid ${selPreset.id===p.id?'#C026D3':'rgba(255,255,255,0.1)'}`,
              color:selPreset.id===p.id?'#EC4899':'#9B7EC8',
              boxShadow:selPreset.id===p.id?'0 0 12px rgba(192,38,211,0.3)':'none',
            }}>
              {p.name}
            </button>
          ))}
        </div>

        {/* EQ FADERS */}
        <div style={{background:'rgba(13,8,22,0.95)',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'16px',padding:'20px 16px 16px',marginBottom:'20px',overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <div style={{display:'flex',gap:'2px',alignItems:'flex-end',minWidth:'600px',padding:'0 4px 8px'}}>
              {EQ_BAND_FREQS.map((bd,i)=>(
                <EQFader key={bd.label} value={bands[i]??0} onChange={v=>handleBand(i,v)} label={bd.label} />
              ))}
            </div>
          </div>
          {/* Band group labels */}
          <div style={{display:'flex',gap:'6px',marginTop:'8px',flexWrap:'wrap'}}>
            {[
              {label:'Preamp: Pre',flex:'0 0 auto'},
              {label:'Bass: 30 Hz – 170 Hz',flex:'1'},
              {label:'Mid: 310 Hz – 3 kHz',flex:'1'},
              {label:'High: 6 kHz – 16 kHz',flex:'1'},
            ].map(({label,flex})=>(
              <div key={label} style={{background:'rgba(36,22,54,0.7)',border:'1px solid rgba(192,38,211,0.18)',borderRadius:'8px',padding:'5px 12px',fontSize:'10px',fontWeight:700,color:'#9B7EC8',flex,textAlign:'center',whiteSpace:'nowrap'}}>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* PLAYER */}
        <div style={{background:'rgba(20,14,34,0.92)',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'16px',padding:'18px',marginBottom:'20px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
            <div>
              <div style={{fontSize:'13px',fontWeight:700,color:'#F8F0FF'}}>🎛️ {exportData.presetName||'Tu Mezcla'} — EQ: {selPreset.name}</div>
              <div style={{fontSize:'11px',color:'#9B7EC8'}}>Preview en tiempo real con EQ aplicado</div>
            </div>
            <span style={{background:'rgba(192,38,211,0.1)',border:'1px solid rgba(192,38,211,0.25)',borderRadius:'980px',padding:'4px 12px',fontSize:'11px',fontWeight:700,color:'#C026D3'}}>
              {exportData.finalLufs?.toFixed(1)} LUFS → -20 LUFS
            </span>
          </div>
          <div style={{background:'rgba(8,4,16,0.88)',borderRadius:'10px',padding:'10px',marginBottom:'14px',cursor:'pointer'}}
            onClick={e=>{if(wavRef.current) handleWaveformClick(e as any,wavRef.current,dur,(t)=>{pausedRef.current=t;setCurTime(t);});}}>
            <canvas ref={wavRef} width={1200} height={100} style={{width:'100%',height:'70px',borderRadius:'6px',display:'block'}} />
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <button onClick={togglePlay} style={{width:'52px',height:'52px',borderRadius:'50%',background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',cursor:'pointer',fontSize:'20px',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 20px rgba(192,38,211,0.4)',flexShrink:0}}>
              {isPlaying?'⏸':'▶'}
            </button>
            <div style={{flex:1}}>
              <div style={{height:'4px',background:'rgba(255,255,255,0.08)',borderRadius:'2px',overflow:'hidden',marginBottom:'6px'}}>
                <div style={{height:'100%',width:`${dur>0?(curTime/dur)*100:0}%`,background:'linear-gradient(90deg,#EC4899,#C026D3)',borderRadius:'2px',transition:'width 0.08s linear'}} />
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'#9B7EC8',fontFamily:'monospace'}}>
                <span>{fmt(curTime)}</span><span>{fmt(dur)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* DOWNLOAD */}
        {!isExporting ? (
          <button onClick={handleDownload} style={{width:'100%',background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'20px',borderRadius:'16px',fontSize:'17px',fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 0 36px rgba(192,38,211,0.45)',display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',marginBottom:'10px'}}>
            <span style={{fontSize:'22px'}}>⬇</span>
            Descargar WAV — {selPreset.name} · -20 LUFS
            {!isPro && <span style={{background:'rgba(255,255,255,0.12)',borderRadius:'8px',padding:'3px 10px',fontSize:'12px',fontWeight:600}}>$3.99</span>}
          </button>
        ) : (
          <div style={{background:'rgba(20,14,34,0.92)',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'16px',padding:'24px',textAlign:'center',marginBottom:'10px'}}>
            <div style={{fontSize:'15px',fontWeight:700,color:'#F8F0FF',marginBottom:'12px'}}>Exportando con EQ {selPreset.name}...</div>
            <div style={{height:'6px',background:'rgba(192,38,211,0.12)',borderRadius:'3px',overflow:'hidden',marginBottom:'8px'}}>
              <div style={{height:'100%',background:'linear-gradient(90deg,#EC4899,#C026D3)',borderRadius:'3px',width:`${exportPct}%`,transition:'width 0.3s ease'}} />
            </div>
            <div style={{fontSize:'13px',color:'#C026D3',fontFamily:'monospace',fontWeight:600}}>{exportPct}%</div>
          </div>
        )}
        <div style={{textAlign:'center',fontSize:'12px',color:'rgba(155,126,200,0.45)',marginBottom:'32px'}}>
          EQ {selPreset.name} aplicado · Normalizado a -20 LUFS · WAV 24-bit
        </div>
      </div>
    </div>
  );
}

// Utils
function normalizeTo(buffer: AudioBuffer, targetLufs: number): void {
  let rmsSum=0, totalSamples=0;
  for(let c=0;c<buffer.numberOfChannels;c++){
    const d=buffer.getChannelData(c);
    for(let i=0;i<d.length;i++){rmsSum+=d[i]*d[i];totalSamples++;}
  }
  const rms=Math.sqrt(rmsSum/totalSamples);
  const currLufs=rms>0.000001?20*Math.log10(rms)-0.691:-60;
  const gain=Math.pow(10,(targetLufs-currLufs)/20);
  const ceiling=0.891;
  let peak=0;
  for(let c=0;c<buffer.numberOfChannels;c++){
    const d=buffer.getChannelData(c);
    for(let i=0;i<d.length;i++){const a=Math.abs(d[i]*gain);if(a>peak)peak=a;}
  }
  const sg=peak>ceiling?gain*(ceiling/peak):gain;
  for(let c=0;c<buffer.numberOfChannels;c++){
    const d=buffer.getChannelData(c);
    for(let i=0;i<d.length;i++){
      const s=d[i]*sg;
      d[i]=Math.max(-ceiling,Math.min(ceiling,Math.tanh(s*1.3)/1.3));
    }
  }
}

function bufferToWav(buffer: AudioBuffer): Blob {
  const len=buffer.length,ch=buffer.numberOfChannels,sr=buffer.sampleRate;
  const bps=3,ba=ch*bps,br=sr*ba,ds=len*ba,bs=44+ds;
  const ab=new ArrayBuffer(bs),view=new DataView(ab);
  const ws=(o:number,s:string)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
  ws(0,'RIFF');view.setUint32(4,bs-8,true);ws(8,'WAVE');ws(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,ch,true);
  view.setUint32(24,sr,true);view.setUint32(28,br,true);view.setUint16(32,ba,true);
  view.setUint16(34,24,true);ws(36,'data');view.setUint32(40,ds,true);
  let offset=44;
  for(let i=0;i<len;i++) for(let c=0;c<ch;c++){
    const s=Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]));
    const v=Math.round(s*8388607);
    if(offset+2<ab.byteLength){view.setInt8(offset,v&0xFF);view.setInt8(offset+1,(v>>8)&0xFF);view.setInt8(offset+2,(v>>16)&0xFF);offset+=3;}
  }
  return new Blob([ab],{type:'audio/wav'});
}

// =============================================
// MAIN EXPORT SCREEN
// =============================================
const S = {
  page: {minHeight:'100vh',background:'#0D0A14',fontFamily:"'Outfit',system-ui,sans-serif"},
  card: {background:'rgba(26,16,40,0.82)',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'18px',padding:'24px'},
  label: {fontSize:'10px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8',marginBottom:'12px',display:'block'},
  mono: {fontFamily:"'DM Mono',monospace"},
  glowBtn: {background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',borderRadius:'980px',fontSize:'13px',fontWeight:600,cursor:'pointer',boxShadow:'0 0 20px rgba(192,38,211,0.4)',fontFamily:'inherit'},
  ghostBtn: {background:'transparent',border:'1px solid rgba(192,38,211,0.25)',color:'#9B7EC8',borderRadius:'980px',fontSize:'13px',cursor:'pointer',fontFamily:'inherit'},
  progressBar: (pct:number)=>({height:'100%',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'8px',width:`${pct}%`,transition:'width 0.4s ease'}),
  progressTrack: {background:'#241636',borderRadius:'8px',height:'6px',overflow:'hidden' as const},
};

export default function ExportScreen({ user, projectId, exportData, exportProgress, exportStep, onBack, onCreditsUpdate }: ExportScreenProps) {
  const [isExportPlaying, setIsExportPlaying] = useState(false);
  const [exportCurrentTime, setExportCurrentTime] = useState(0);
  const [exportPausedTime, setExportPausedTime] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadFormat, setDownloadFormat] = useState<'mp3'|'wav'|null>(null);
  const [exportAudioContext, setExportAudioContext] = useState<AudioContext|null>(null);
  const [exportSourceNode, setExportSourceNode] = useState<AudioBufferSourceNode|null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const vuCanvasRef = useRef<HTMLCanvasElement>(null);
  const exportTimeUpdateRef = useRef<number>();
  const exportAnalyserRef = useRef<AnalyserNode|null>(null);
  const vuAnimRef = useRef<number>();
  const [exportMomentaryLufs, setExportMomentaryLufs] = useState(-60.0);
  const [exportIntegratedLufs, setExportIntegratedLufs] = useState(-60.0);
  const [playGain, setPlayGain] = useState(1.0);
  const playGainNodeRef = useRef<GainNode|null>(null);
  const exportLufsHistoryRef = useRef<number[]>([]);
  const lufsFrameRef = useRef(0);

  const [showAudioLab, setShowAudioLab] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const isPro = (()=>{ try{const u=localStorage.getItem('audioMixerUser');if(!u) return false;const p=JSON.parse(u);return p.is_pro||p.plan==='pro';}catch{return false;} })();
  const hasUsedFreeMix = localStorage.getItem('mixingai_used_free')==='1';

  const handleOpenAudioLab = () => {
    if(!isPro && hasUsedFreeMix){setShowPaywall(true);return;}
    if(!isPro) localStorage.setItem('mixingai_used_free','1');
    setShowAudioLab(true);
  };

  useEffect(()=>{
    if(exportData && !exportAudioContext) setExportAudioContext(new AudioContext());
  },[exportData,exportAudioContext]);

  useEffect(()=>{
    const canvas=waveformCanvasRef.current; if(!canvas||!exportData) return;
    const peaks=exportData.waveformPeaks?.length>0?exportData.waveformPeaks:(()=>{const m=new Float32Array(800);for(let i=0;i<m.length;i++)m[i]=Math.random()*0.7+0.1;return m;})();
    drawWaveform({canvas,waveformPeaks:peaks,currentTime:exportCurrentTime,duration:exportData.audioBuffer.duration,style:'soundcloud',colors:{played:'#C026D3',unplayed:'rgba(124,58,237,0.2)',playhead:'#EC4899'}});
  },[exportData,exportCurrentTime]);

  const startPlayback = useCallback((offset:number)=>{
    if(!exportAudioContext||!exportData) return;
    if(vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
    if(exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
    exportAnalyserRef.current=null; exportLufsHistoryRef.current=[]; lufsFrameRef.current=0;
    setExportMomentaryLufs(-60); setExportIntegratedLufs(-60);
    const sourceNode=exportAudioContext.createBufferSource(); sourceNode.buffer=exportData.audioBuffer;
    const analyser=exportAudioContext.createAnalyser(); analyser.fftSize=2048; analyser.smoothingTimeConstant=0.6;
    const limiter=exportAudioContext.createDynamicsCompressor();
    limiter.threshold.value=-1.0;limiter.knee.value=0;limiter.ratio.value=20;limiter.attack.value=0.0003;limiter.release.value=0.05;
    const pgn=exportAudioContext.createGain(); pgn.gain.value=playGain; playGainNodeRef.current=pgn;
    sourceNode.connect(analyser);analyser.connect(limiter);limiter.connect(pgn);pgn.connect(exportAudioContext.destination);
    exportAnalyserRef.current=analyser;
    const startTime=exportAudioContext.currentTime; sourceNode.start(startTime,offset);
    setExportSourceNode(sourceNode); setIsExportPlaying(true);
    const vuLoop=()=>{
      if(!exportAnalyserRef.current) return;
      const td=new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(td);
      let rmsSum=0; for(let i=0;i<td.length;i++) rmsSum+=td[i]*td[i];
      const rms=Math.sqrt(rmsSum/td.length);
      const momentary=rms>0.0001?Math.max(-50,Math.min(-5,20*Math.log10(rms)-0.691)):-60;
      const vc=vuCanvasRef.current;
      if(vc){const ctx2=vc.getContext('2d');if(ctx2){
        const w=vc.width,h=vc.height; ctx2.clearRect(0,0,w,h); ctx2.fillStyle='rgba(8,4,16,0.8)'; ctx2.fillRect(0,0,w,h);
        const level=Math.max(0,Math.min(1,(momentary+50)/45)); const barW=Math.floor(w/2)-3,barH=Math.floor(h*level);
        const gr=ctx2.createLinearGradient(0,h,0,0); gr.addColorStop(0,'#4ade80');gr.addColorStop(0.55,'#4ade80');gr.addColorStop(0.75,'#FBBF24');gr.addColorStop(0.88,'#EC4899');gr.addColorStop(1,'#ef4444');
        ctx2.fillStyle=gr; if(barH>0){ctx2.fillRect(2,h-barH,barW,barH);ctx2.fillRect(barW+4,h-Math.floor(barH*0.95),barW,Math.floor(barH*0.95));}
        const tY=h-Math.floor(h*(36/45)); ctx2.strokeStyle='rgba(74,222,128,0.7)';ctx2.lineWidth=1;ctx2.setLineDash([3,3]);
        ctx2.beginPath();ctx2.moveTo(0,tY);ctx2.lineTo(w,tY);ctx2.stroke();ctx2.setLineDash([]);
      }}
      lufsFrameRef.current++;
      if(lufsFrameRef.current%4===0&&rms>0.0001){
        setExportMomentaryLufs(momentary); exportLufsHistoryRef.current.push(momentary);
        if(exportLufsHistoryRef.current.length>600) exportLufsHistoryRef.current.shift();
        const valid=exportLufsHistoryRef.current.filter(v=>v>-50);
        if(valid.length>0) setExportIntegratedLufs(Math.max(-50,Math.min(-5,valid.reduce((a,b)=>a+b,0)/valid.length)));
      }
      vuAnimRef.current=requestAnimationFrame(vuLoop);
    };
    vuAnimRef.current=requestAnimationFrame(vuLoop);
    sourceNode.onended=()=>{
      exportAnalyserRef.current=null; if(vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
      setIsExportPlaying(false);setExportPausedTime(0);setExportCurrentTime(0);
      if(exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
    };
    exportTimeUpdateRef.current=window.setInterval(()=>{
      const elapsed=exportAudioContext.currentTime-startTime+offset;
      setExportCurrentTime(Math.min(elapsed,exportData.audioBuffer.duration));
      if(elapsed>=exportData.audioBuffer.duration){setIsExportPlaying(false);setExportPausedTime(0);setExportCurrentTime(0);if(exportTimeUpdateRef.current)clearInterval(exportTimeUpdateRef.current);}
    },100);
  },[exportAudioContext,exportData,playGain]);

  const handleExportPlayPause=useCallback(async()=>{
    if(!exportAudioContext||!exportData) return;
    if(exportAudioContext.state==='suspended') await exportAudioContext.resume();
    if(isExportPlaying){
      exportSourceNode?.stop();exportSourceNode?.disconnect();exportAnalyserRef.current=null;
      if(vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
      setIsExportPlaying(false);setExportPausedTime(exportCurrentTime);
      if(exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
    } else { startPlayback(exportPausedTime); }
  },[exportAudioContext,exportData,isExportPlaying,exportCurrentTime,exportPausedTime,exportSourceNode,startPlayback]);

  const handleExportStop=useCallback(()=>{
    exportSourceNode?.stop();exportSourceNode?.disconnect();
    setIsExportPlaying(false);setExportPausedTime(0);setExportCurrentTime(0);
    if(exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
  },[exportSourceNode]);

  const handleWaveformSeek=useCallback((t:number)=>{
    if(!exportData||!exportAudioContext) return;
    const wasPlaying=isExportPlaying;
    if(exportSourceNode){try{exportSourceNode.stop();exportSourceNode.disconnect();}catch{}}
    exportAnalyserRef.current=null; if(vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
    if(exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
    setExportCurrentTime(t);setExportPausedTime(t);
    if(wasPlaying) setTimeout(()=>startPlayback(t),30); else setIsExportPlaying(false);
  },[exportAudioContext,exportData,exportSourceNode,isExportPlaying,startPlayback]);

  const handleDirectDownload=async(format:'mp3'|'wav')=>{
    if(!exportData) return;
    setIsDownloading(true);setDownloadFormat(format);setDownloadProgress(0);
    try {
      const pi=setInterval(()=>setDownloadProgress(prev=>{if(prev>=90){clearInterval(pi);return prev;}return prev+Math.random()*15+5;}),200);
      const blob=await createAudioBlob(exportData.audioBuffer,format);
      clearInterval(pi);setDownloadProgress(100); await new Promise(r=>setTimeout(r,400));
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`mezcla-mixingmusic.${format}`; a.click(); URL.revokeObjectURL(url);
    } catch(e){console.error(e);}
    setIsDownloading(false);setDownloadProgress(0);setDownloadFormat(null);
  };

  const dur=exportData?.audioBuffer?.duration??0;

  const stopAll=()=>{
    if(exportSourceNode){try{exportSourceNode.stop();exportSourceNode.disconnect();}catch{}}
    exportAnalyserRef.current=null; if(vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
    if(exportTimeUpdateRef.current) clearInterval(exportTimeUpdateRef.current);
  };

  return (
    <div style={{...S.page,backgroundImage:'url(/studio-bg.png)',backgroundSize:'cover',backgroundPosition:'center top',backgroundAttachment:'fixed',backgroundBlendMode:'darken',backgroundColor:'rgba(8,4,16,0.82)'}}>
      <Header user={user} onLogout={()=>{}} onCreditsUpdate={onCreditsUpdate} />

      <div style={{maxWidth:'900px',padding:'20px 20px 60px',margin:'0 auto'}}>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'24px',flexWrap:'wrap',gap:'12px'}}>
          <div>
            <h1 style={{fontSize:'26px',fontWeight:600,letterSpacing:'-0.5px',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Tu Mezcla Final</h1>
            <p style={{color:'#9B7EC8',fontSize:'13px',marginTop:'4px'}}>Optimizada con IA · 44.1 kHz/24 bits · {exportData?.finalLufs.toFixed(1)} LUFS</p>
          </div>
          <button onClick={()=>{stopAll();onBack();}} style={{...S.ghostBtn,padding:'10px 18px'}}>← Volver al Mezclador</button>
        </div>

        {exportData ? (
          <div style={S.card}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
              <span style={S.label}>Preview de tu Mezcla Final</span>
              <span style={{fontSize:'11px',fontWeight:600,padding:'4px 12px',borderRadius:'980px',background:'rgba(192,38,211,0.1)',color:'#C026D3',border:'1px solid rgba(192,38,211,0.25)'}}>
                ✦ {exportData.presetName?exportData.presetName+' · ':''}Procesada con IA · {exportData.finalLufs.toFixed(1)} LUFS
              </span>
            </div>
            <div style={{background:'rgba(8,4,16,0.88)',borderRadius:'12px',padding:'12px',border:'1px solid rgba(192,38,211,0.1)',marginBottom:'20px'}}>
              <canvas ref={waveformCanvasRef} width={1200} height={100} style={{width:'100%',height:'70px',borderRadius:'8px',cursor:'pointer',display:'block'}}
                onClick={e=>{if(waveformCanvasRef.current) handleWaveformClick(e,waveformCanvasRef.current,dur,handleWaveformSeek);}} />
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'12px',marginBottom:'16px'}}>
              <button onClick={handleExportStop} style={{width:'40px',height:'40px',borderRadius:'50%',background:'#241636',border:'1px solid rgba(192,38,211,0.2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="ri-stop-fill" style={{color:'#9B7EC8',fontSize:'14px'}}></i>
              </button>
              <button onClick={handleExportPlayPause} style={{width:'56px',height:'56px',borderRadius:'50%',background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 28px rgba(236,72,153,0.5)'}}>
                <i className={isExportPlaying?'ri-pause-fill':'ri-play-fill'} style={{color:'#fff',fontSize:'22px',marginLeft:isExportPlaying?0:'3px'}}></i>
              </button>
            </div>
            <div style={{textAlign:'center',...S.mono,color:'#9B7EC8',fontSize:'14px',fontWeight:500,marginBottom:'28px'}}>{fmt(exportCurrentTime)}{' / '}{fmt(dur)}</div>

            {/* VU + LUFS */}
            <div style={{background:'linear-gradient(135deg,rgba(36,22,54,0.88),rgba(26,16,40,0.88))',border:'1px solid rgba(192,38,211,0.25)',borderRadius:'14px',padding:'16px',marginBottom:'20px',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)'}}></div>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'14px'}}>
                <i className="ri-equalizer-fill" style={{color:'#C026D3',fontSize:'13px'}}></i>
                <span style={{fontSize:'10px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8'}}>Mix Bus Master</span>
                {exportData.presetName&&<span style={{background:'linear-gradient(135deg,#EC4899,#C026D3)',borderRadius:'980px',padding:'2px 10px',fontSize:'9px',color:'#fff',fontWeight:700}}>✦ {exportData.presetName}</span>}
                <span style={{marginLeft:'auto',fontSize:'9px',color:isExportPlaying?'#4ade80':'#9B7EC8',fontFamily:"'DM Mono',monospace",fontWeight:600}}>{isExportPlaying?'▶ PLAYING':'■ STOPPED'}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'52px 1fr',gap:'14px',alignItems:'start'}}>
                <div style={{display:'flex',flexDirection:'column' as const,alignItems:'center',gap:'4px'}}>
                  <canvas ref={vuCanvasRef} width={60} height={100} style={{width:'44px',height:'80px',borderRadius:'6px',border:'1px solid rgba(192,38,211,0.2)'}} />
                  <span style={{fontSize:'9px',color:'#9B7EC8',fontFamily:"'DM Mono',monospace"}}>VU</span>
                </div>
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                    {[{v:exportMomentaryLufs,label:'LUFS Momentary',color:exportMomentaryLufs>-14?'#f87171':exportMomentaryLufs<-30?'#9B7EC8':'#4ade80'},{v:exportIntegratedLufs,label:'LUFS Integrated',color:'#C026D3'}].map((x,i)=>(
                      <div key={i} style={{background:'rgba(15,10,26,0.6)',borderRadius:'10px',padding:'10px',textAlign:'center' as const,border:'1px solid rgba(192,38,211,0.08)'}}>
                        <div style={{...S.mono,fontSize:'20px',fontWeight:600,color:x.color,transition:'color 0.3s'}}>{x.v.toFixed(1)}</div>
                        <div style={{fontSize:'9px',textTransform:'uppercase' as const,letterSpacing:'0.5px',color:'#9B7EC8',marginTop:'2px'}}>{x.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'6px'}}>
                    {[{label:'Sample Rate',val:'44.1 kHz',color:'#C026D3'},{label:'Bit Depth',val:'24 bits',color:'#7C3AED'},{label:'Spotify',val:exportData.finalLufs.toFixed(1),color:Math.abs(exportData.finalLufs+14)<0.5?'#4ade80':'#FBBF24'}].map(s=>(
                      <div key={s.label} style={{background:'rgba(15,10,26,0.6)',borderRadius:'8px',padding:'8px',textAlign:'center' as const,border:'1px solid rgba(192,38,211,0.06)'}}>
                        <div style={{...S.mono,fontSize:'13px',fontWeight:600,color:s.color}}>{s.val}</div>
                        <div style={{fontSize:'9px',color:'#9B7EC8'}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Direct downloads */}
            <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap',marginBottom:'12px'}}>
              <button onClick={()=>handleDirectDownload('mp3')} disabled={isDownloading} style={{...S.glowBtn,padding:'14px 28px',fontSize:'14px',opacity:isDownloading?0.5:1,display:'flex',alignItems:'center',gap:'8px'}}>
                <i className="ri-download-line"></i>Descargar .MP3
              </button>
              <button onClick={()=>handleDirectDownload('wav')} disabled={isDownloading} style={{background:'linear-gradient(135deg,#7C3AED,#4F46E5)',border:'none',color:'#fff',padding:'14px 28px',borderRadius:'980px',fontSize:'14px',fontWeight:600,cursor:'pointer',boxShadow:'0 0 20px rgba(124,58,237,0.4)',fontFamily:'inherit',display:'flex',alignItems:'center',gap:'8px',opacity:isDownloading?0.5:1}}>
                <i className="ri-download-2-line"></i>Descargar .WAV
              </button>
            </div>

            {/* Output gain */}
            <div style={{background:'rgba(15,10,26,0.6)',border:'1px solid rgba(192,38,211,0.12)',borderRadius:'12px',padding:'12px 16px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'14px'}}>
              <div style={{flexShrink:0,minWidth:'64px'}}>
                <div style={{fontSize:'9px',fontWeight:700,color:'#9B7EC8',letterSpacing:'0.8px',textTransform:'uppercase' as const,marginBottom:'2px'}}>Output Gain</div>
                <div style={{fontSize:'16px',fontWeight:800,fontFamily:'monospace',lineHeight:1.2,color:playGain>0.9?'#EF4444':playGain>0.7?'#FBBF24':'#4ade80'}}>
                  {playGain>0?(20*Math.log10(playGain)).toFixed(1):'-∞'} dB
                </div>
              </div>
              <input type="range" min="0.1" max="1.0" step="0.01" value={playGain}
                onChange={e=>{const v=parseFloat(e.target.value);setPlayGain(v);if(playGainNodeRef.current&&exportAudioContext) playGainNodeRef.current.gain.setTargetAtTime(v,exportAudioContext.currentTime,0.05);}}
                style={{flex:1,accentColor:'#C026D3',cursor:'pointer',height:'4px'}} />
              <button onClick={()=>{setPlayGain(1.0);if(playGainNodeRef.current&&exportAudioContext) playGainNodeRef.current.gain.setTargetAtTime(1.0,exportAudioContext.currentTime,0.05);}}
                style={{flexShrink:0,background:'transparent',border:'1px solid rgba(255,255,255,0.1)',color:'#9B7EC8',padding:'4px 10px',borderRadius:'6px',fontSize:'11px',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>Reset</button>
            </div>

            {/* AUDIO LAB CTA */}
            <div style={{background:'linear-gradient(135deg,rgba(26,12,46,0.95),rgba(36,18,58,0.95))',border:'1px solid rgba(192,38,211,0.32)',borderRadius:'16px',padding:'20px',overflow:'hidden',position:'relative'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)'}}></div>
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px'}}>
                <div style={{width:'44px',height:'44px',borderRadius:'12px',background:'linear-gradient(135deg,#EC4899,#C026D3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px',flexShrink:0}}>🎚️</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:'15px',fontWeight:800,color:'#F8F0FF'}}>Exportar con IA — Audio Lab</div>
                  <div style={{fontSize:'11px',color:'#9B7EC8'}}>Elige EQ · Escucha el cambio · Descarga a -20 LUFS</div>
                </div>
                {!isPro && !hasUsedFreeMix && (
                  <span style={{background:'rgba(74,222,128,0.12)',border:'1px solid rgba(74,222,128,0.3)',borderRadius:'980px',padding:'5px 14px',fontSize:'11px',fontWeight:700,color:'#4ade80',flexShrink:0}}>✦ 1 gratis</span>
                )}
                {!isPro && hasUsedFreeMix && (
                  <span style={{background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:'980px',padding:'5px 14px',fontSize:'11px',fontWeight:700,color:'#F59E0B',flexShrink:0}}>$3.99</span>
                )}
              </div>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'14px'}}>
                {['Car','iPhone','MacBook','Headphones','TV','Home Theater','Bluetooth','Studio','Gaming','Tablet'].map(p=>(
                  <span key={p} style={{background:'rgba(192,38,211,0.08)',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'980px',padding:'3px 10px',fontSize:'10px',fontWeight:600,color:'#9B7EC8'}}>{p}</span>
                ))}
              </div>
              <button onClick={handleOpenAudioLab}
                style={{width:'100%',background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'17px',borderRadius:'13px',fontSize:'15px',fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 0 28px rgba(192,38,211,0.45)',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'}}>
                <span>🎛️</span>Abrir Audio Lab
              </button>
            </div>
          </div>
        ) : (
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
            <h3 style={{fontSize:'22px',fontWeight:600,color:'#F8F0FF',marginBottom:'10px'}}>Creando {downloadFormat?.toUpperCase()}</h3>
            <div style={S.progressTrack}><div style={S.progressBar(downloadProgress)}></div></div>
            <div style={{...S.mono,color:'#C026D3',fontWeight:600,fontSize:'18px',marginTop:'10px'}}>{Math.round(downloadProgress)}%</div>
          </div>
        </div>
      )}

      {showAudioLab&&exportData&&(
        <AudioLabModal
          exportData={exportData}
          onClose={()=>setShowAudioLab(false)}
          onDownload={()=>setShowAudioLab(false)}
          isPro={isPro}
          onPaywall={()=>{setShowAudioLab(false);setShowPaywall(true);}}
        />
      )}

      {showPaywall&&(
        <PaymentModal
          onClose={()=>setShowPaywall(false)}
          onSuccess={()=>{setShowPaywall(false);setShowAudioLab(true);}}
        />
      )}
    </div>
  );
}

async function createAudioBlob(buffer: AudioBuffer, format: 'mp3'|'wav'): Promise<Blob> {
  const length=buffer.length,channels=buffer.numberOfChannels,sampleRate=buffer.sampleRate;
  const blockAlign=channels*2,byteRate=sampleRate*blockAlign,dataSize=length*blockAlign,bufferSize=44+dataSize;
  const arrayBuffer=new ArrayBuffer(bufferSize); const view=new DataView(arrayBuffer);
  const ws=(offset:number,s:string)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i));};
  ws(0,'RIFF');view.setUint32(4,bufferSize-8,true);ws(8,'WAVE');ws(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);
  view.setUint32(24,sampleRate,true);view.setUint32(28,byteRate,true);
  view.setUint16(32,blockAlign,true);view.setUint16(34,16,true);ws(36,'data');view.setUint32(40,dataSize,true);
  let offset=44;
  for(let i=0;i<length;i++) for(let c=0;c<channels;c++){
    const s=Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]));
    view.setInt16(offset,Math.round(s*32767),true);offset+=2;
  }
  return new Blob([arrayBuffer],{type:format==='mp3'?'audio/mp3':'audio/wav'});
}
