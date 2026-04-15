import { useState, useRef, useEffect, useCallback } from 'react';
import UpgradeModal from './UpgradeModal';
import Header from '@/components/feature/Header';
import UploadModal from '@/components/feature/UploadModal';
import { drawFFTAnalyzer, drawMiniFFT } from '@/utils/drawFFT';
import { drawWaveform, handleWaveformClick } from '@/utils/drawWaveform';

interface User {
  id: string; firstName: string; lastName: string; email: string;
  country: string; credits: number; provider?: string; createdAt: string;
  username?: string; avatar?: string;
}
interface Stem {
  id: string; name: string; file: File; buffer: AudioBuffer;
  gainNode: GainNode; panNode: StereoPannerNode; analyserNode: AnalyserNode;
  eqLow: BiquadFilterNode; eqMid: BiquadFilterNode; eqHigh: BiquadFilterNode;
  sourceNode?: AudioBufferSourceNode; volume: number; pan: number;
  muted: boolean; fftData: Uint8Array; waveformPeaks: Float32Array;
  instrument: string; icon: string; selected: boolean;
  stemPresetId: string | null;
}

const detectInstrument = (filename: string): { instrument: string; icon: string } => {
  const n = filename.toLowerCase().replace(/[_\-\.]/g,' ');
  if (/voz|voc|vocal|lead|singer|coro|choir|bgv|bg voc|backing/.test(n)) return { instrument:'Voz', icon:'🎤' };
  if (/kick|bombo|drum|perc|beat|snare|hi.hat|hihat|cymbal|rimshot/.test(n)) return { instrument:'Batería', icon:'🥁' };
  if (/bass|bajo|808|sub/.test(n)) return { instrument:'Bajo', icon:'🎸' };
  if (/guitar|guitarra|gtr|electric|acoustic/.test(n)) return { instrument:'Guitarra', icon:'🎸' };
  if (/piano|keys|keyboard|teclado|synth|pad|organ/.test(n)) return { instrument:'Teclado', icon:'🎹' };
  if (/brass|trumpet|trompeta|horn|tromb|sax/.test(n)) return { instrument:'Viento', icon:'🎺' };
  if (/string|violin|viola|cello|orquesta/.test(n)) return { instrument:'Cuerda', icon:'🎻' };
  if (/fx|effect|efecto|noise|amb|reverb/.test(n)) return { instrument:'FX', icon:'🎛️' };
  return { instrument:'Pista', icon:'🎵' };
};

import { MixPreset, PRESETS } from './PresetScreen';

// =============================================
// IA EQ — 12 BANDS (same as Audio Lab)
// =============================================
interface IAEQPreset { id: string; name: string; bands: number[]; }
const IAEQ_PRESETS: IAEQPreset[] = [
  { id:'default',  name:'Default',          bands:[0,0,0,0,0,0,0,0,0,0,0,0] },
  { id:'car',      name:'Car',              bands:[0,3,4,2,1,0,-1,0,1,2,2,1] },
  { id:'iphone',   name:'iPhone',           bands:[0,-2,-1,0,1,2,2,1,0,-1,-2,-3] },
  { id:'macbook',  name:'MacBook',          bands:[0,-3,-2,0,1,2,2,1,-1,-2,-3,-4] },
  { id:'headphones',name:'Headphones',      bands:[0,2,3,1,0,-1,0,1,2,3,3,2] },
  { id:'tv',       name:'TV',               bands:[0,-4,-3,-1,0,2,3,2,1,0,-1,-2] },
  { id:'theater',  name:'Home Theater',     bands:[0,5,4,3,1,0,-1,0,1,3,2,1] },
  { id:'bt',       name:'Bluetooth',        bands:[0,4,5,3,1,-1,-2,-1,0,1,1,0] },
  { id:'studio',   name:'Studio Monitors',  bands:[0,0,0,0,0,0,0,0,0,0,0,0] },
  { id:'gaming',   name:'Gaming Headset',   bands:[0,3,2,1,0,0,1,2,3,4,3,2] },
  { id:'tablet',   name:'Tablet',           bands:[0,-2,-2,0,1,2,2,1,0,-1,-2,-3] },
];
const IAEQ_BANDS = [
  { label:'Pre',   freq:null,  type:'gain'      as const },
  { label:'30Hz',  freq:30,    type:'lowshelf'  as const },
  { label:'60Hz',  freq:60,    type:'peaking'   as const },
  { label:'170Hz', freq:170,   type:'peaking'   as const },
  { label:'310Hz', freq:310,   type:'peaking'   as const },
  { label:'600Hz', freq:600,   type:'peaking'   as const },
  { label:'1kHz',  freq:1000,  type:'peaking'   as const },
  { label:'3kHz',  freq:3000,  type:'peaking'   as const },
  { label:'6kHz',  freq:6000,  type:'peaking'   as const },
  { label:'12kHz', freq:12000, type:'peaking'   as const },
  { label:'14kHz', freq:14000, type:'peaking'   as const },
  { label:'16kHz', freq:16000, type:'highshelf' as const },
];

interface MixEditorProps {
  projectId: string; user: User; uploadedFiles: File[];
  onBack: () => void; onCreditsUpdate: (n: number) => void;
  onExport: (d: { audioBuffer: AudioBuffer; audioUrl: string; waveformPeaks: Float32Array; finalLufs: number; presetName?: string; iaEqPreset?: string }) => void;
  initialPreset?: MixPreset;
  reverbOn?: boolean; delayOn?: boolean; stereoOn?: boolean;
}

// =============================================
// PAYWALL MODAL — registration required, real payments
// =============================================
function PaywallModal({ onClose, onSuccess }: { onClose:()=>void; onSuccess:()=>void }) {
  const [step, setStep] = useState<'choose'|'processing'|'done'>('choose');
  const [method, setMethod] = useState<'paypal'|'mp'|null>(null);
  const [mpError, setMpError] = useState('');

  // Check if user is registered
  const getUser = () => {
    try { const s = localStorage.getItem('audioMixerUser'); return s ? JSON.parse(s) : null; } catch { return null; }
  };

  const markPro = () => {
    try {
      const stored = localStorage.getItem('audioMixerUser');
      const u = stored ? JSON.parse(stored) : {};
      u.is_pro = true; u.plan = 'unlimited';
      localStorage.setItem('audioMixerUser', JSON.stringify(u));
      localStorage.removeItem('mixingai_used_free');
    } catch {}
  };

  const pay = async (m: 'paypal'|'mp') => {
    const u = getUser();
    setMethod(m); setStep('processing'); setMpError('');

    if (m === 'paypal') {
      // Redirect to PayPal — payment-confirmation page handles the result
      window.location.href = 'https://www.paypal.com/ncp/payment/HDU4UAXJCNVXW';
    } else {
      // MercadoPago via Supabase Edge Function
      try {
        const supaUrl = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_URL;
        const supaKey = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_ANON_KEY;
        if (!supaUrl || !supaKey) throw new Error('Config missing');
        const res = await fetch(`${supaUrl}/functions/v1/create-mercadopago-subscription`, {
          method: 'POST',
          headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${supaKey}` },
          body: JSON.stringify({ userId: u?.id || u?.email || 'guest', userEmail: u?.email || 'guest@mixingmusic.ai' }),
        });
        const data = await res.json();
        if (data?.error) throw new Error(data.error);
        const mpUrl = data?.init_point || data?.sandbox_init_point;
        if (mpUrl) {
          window.location.href = mpUrl;
        } else {
          throw new Error('No se recibió URL de pago');
        }
      } catch (e: any) {
        setMpError(e.message || 'Error al conectar con Mercado Pago');
        setStep('choose');
      }
    }
  };

  const S = {
    overlay: {position:'fixed' as const,inset:0,background:'rgba(8,4,16,0.96)',backdropFilter:'blur(14px)',zIndex:1100,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'},
    box: {background:'linear-gradient(135deg,rgba(26,16,40,0.99),rgba(15,10,26,0.99))',border:'1px solid rgba(192,38,211,0.35)',borderRadius:'24px',padding:'36px 32px',maxWidth:'420px',width:'100%',textAlign:'center' as const,boxShadow:'0 0 60px rgba(192,38,211,0.25)'},
    btnPP: {width:'100%',background:'#0070BA',border:'none',color:'#fff',padding:'16px',borderRadius:'14px',fontSize:'15px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:'10px',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'},
    btnMP: {width:'100%',background:'linear-gradient(135deg,#009EE3,#00B1EA)',border:'none',color:'#fff',padding:'16px',borderRadius:'14px',fontSize:'15px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px'},
    btnOk: {width:'100%',background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'16px',borderRadius:'14px',fontSize:'15px',fontWeight:700,cursor:'pointer',fontFamily:'inherit'},
  };

  return (
    <div style={S.overlay}>
      <div style={S.box}>

        {/* CHOOSE PAYMENT */}
        {step==='choose' && <>
          <div style={{fontSize:'36px',marginBottom:'14px'}}>🎛️</div>
          <h2 style={{fontSize:'22px',fontWeight:800,color:'#F8F0FF',marginBottom:'6px'}}>Mezclas Ilimitadas</h2>
          <p style={{fontSize:'13px',color:'rgba(155,126,200,0.8)',marginBottom:'4px'}}>Tu primera mezcla fue gratis.</p>
          <p style={{fontSize:'13px',color:'rgba(155,126,200,0.8)',marginBottom:'24px'}}>
            Desbloquea mezclas ilimitadas + IA EQ por solo{' '}
            <span style={{color:'#EC4899',fontSize:'22px',fontWeight:800}}>$3.99</span>
          </p>
          {mpError && <p style={{fontSize:'12px',color:'#f87171',marginBottom:'12px',background:'rgba(239,68,68,0.08)',padding:'8px 12px',borderRadius:'8px'}}>{mpError}</p>}
          <button style={S.btnPP} onClick={()=>pay('paypal')}>
            <span style={{background:'#fff',borderRadius:'4px',padding:'2px 6px',color:'#003087',fontWeight:900,fontSize:'14px'}}>P</span>
            Pagar con PayPal
          </button>
          <button style={S.btnMP} onClick={()=>pay('mp')}>
            <span style={{fontSize:'18px'}}>💳</span>
            Pagar con Mercado Pago
          </button>
          <button onClick={onClose} style={{marginTop:'14px',background:'none',border:'none',color:'rgba(155,126,200,0.4)',fontSize:'12px',cursor:'pointer',fontFamily:'inherit'}}>
            Cancelar
          </button>
        </>}

        {/* PROCESSING */}
        {step==='processing' && <>
          <div style={{fontSize:'32px',marginBottom:'16px'}}>⏳</div>
          <h2 style={{fontSize:'18px',fontWeight:700,color:'#F8F0FF',marginBottom:'8px'}}>Redirigiendo al pago...</h2>
          <p style={{fontSize:'13px',color:'rgba(155,126,200,0.7)',marginBottom:'20px'}}>
            Conectando con {method==='paypal'?'PayPal':'Mercado Pago'}...
          </p>
          <div style={{height:'4px',background:'rgba(192,38,211,0.15)',borderRadius:'2px',overflow:'hidden'}}>
            <div style={{height:'100%',background:'linear-gradient(90deg,#EC4899,#C026D3)',animation:'pay-prog 2s ease forwards',borderRadius:'2px'}}></div>
          </div>
          <style>{`@keyframes pay-prog{from{width:0}to{width:95%}}`}</style>
        </>}

        {/* DONE (fallback if redirect doesn't happen) */}
        {step==='done' && <>
          <div style={{fontSize:'32px',marginBottom:'16px'}}>✅</div>
          <h2 style={{fontSize:'18px',fontWeight:700,color:'#4ade80',marginBottom:'8px'}}>¡Pago exitoso!</h2>
          <p style={{fontSize:'13px',color:'rgba(155,126,200,0.7)',marginBottom:'20px'}}>Ya tienes mezclas ilimitadas.</p>
          <button style={S.btnOk} onClick={()=>{ markPro(); onSuccess(); }}>Continuar →</button>
        </>}

      </div>
    </div>
  );
}

const C = {
  page: {minHeight:'100vh',background:'transparent'},
  card: {background:'rgba(26,16,40,0.82)',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'16px',padding:'16px'},
  label: {fontSize:'10px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8',marginBottom:'10px',display:'block'},
  mono: {fontFamily:"'DM Mono',monospace"},
  grad: {background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'},
  glowBtn: (disabled=false) => ({background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'10px 18px',borderRadius:'980px',fontSize:'13px',fontWeight:600,cursor:disabled?'not-allowed':'pointer',boxShadow:'0 0 16px rgba(192,38,211,0.4)',fontFamily:'inherit',opacity:disabled?0.4:1,display:'inline-flex',alignItems:'center',gap:'6px'}),
  ghostBtn: {background:'transparent',border:'1px solid rgba(192,38,211,0.25)',color:'#9B7EC8',padding:'10px 16px',borderRadius:'980px',fontSize:'13px',cursor:'pointer',fontFamily:'inherit',display:'inline-flex',alignItems:'center',gap:'6px'},
  track: {height:'4px',background:'rgba(36,22,54,0.75)',borderRadius:'2px',position:'relative' as const,marginTop:'4px'},
  trackFill: (pct:number) => ({height:'100%',background:'linear-gradient(90deg,#EC4899,#7C3AED)',borderRadius:'2px',width:`${pct}%`,pointerEvents:'none' as const}),
  progressBar: (pct:number) => ({height:'100%',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'8px',width:`${pct}%`,transition:'width 0.3s ease'}),
};

export default function MixEditor({ projectId, user, uploadedFiles, onBack, onCreditsUpdate, onExport, initialPreset, reverbOn=false, delayOn=false, stereoOn=false }: MixEditorProps) {
  const [stems, setStems] = useState<Stem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [masterVolume, setMasterVolume] = useState(0);
  const [lufsIntegrated, setLufsIntegrated] = useState(-23.0);
  const [lufsMomentary, setLufsMomentary] = useState(-23.0);
  const [bassGain, setBassGain] = useState(initialPreset?.bass ?? 0);
  const [midGain, setMidGain] = useState(initialPreset?.mid ?? 0);
  const [highGain, setHighGain] = useState(initialPreset?.high ?? 0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState('Inicializando...');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStep, setExportStep] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [reverbActive, setReverbActive] = useState(reverbOn);
  const [delayActive, setDelayActive] = useState(delayOn);
  const [widenerActive, setWidenerActive] = useState(stereoOn);
  const [selectedStems, setSelectedStems] = useState<Set<string>>(new Set());
  const [editingVolumeId, setEditingVolumeId] = useState<string|null>(null);
  const [editingVolumeVal, setEditingVolumeVal] = useState('');
  const [momentaryLufs, setMomentaryLufs] = useState(-60.0);
  const [integratedLufs, setIntegratedLufs] = useState(-60.0);
  const [activePreset, setActivePreset] = useState<MixPreset|undefined>(initialPreset);
  const [allFiles, setAllFiles] = useState<File[]>(uploadedFiles);
  const [openStemPresetId, setOpenStemPresetId] = useState<string|null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [bulkDbInput, setBulkDbInput] = useState('');

  // IA EQ state
  const [iaEqPreset, setIaEqPreset] = useState<IAEQPreset>(IAEQ_PRESETS[0]);
  const [iaEqBands, setIaEqBands] = useState<number[]>([...IAEQ_PRESETS[0].bands]);
  const iaEqNodesRef = useRef<(BiquadFilterNode|GainNode)[]>([]);

  const audioContextRef = useRef<AudioContext|null>(null);
  const masterGainRef = useRef<GainNode|null>(null);
  const mixAnalyserRef = useRef<AnalyserNode|null>(null);
  const mixFftDataRef = useRef<Uint8Array|null>(null);
  const bassFilterRef = useRef<BiquadFilterNode|null>(null);
  const midFilterRef = useRef<BiquadFilterNode|null>(null);
  const highFilterRef = useRef<BiquadFilterNode|null>(null);
  const reverbGainRef = useRef<GainNode|null>(null);
  const dryGainRef = useRef<GainNode|null>(null);
  const delayGainRef = useRef<GainNode|null>(null);
  const reverbOnRef = useRef(reverbOn);
  const delayOnRef = useRef(delayOn);
  const timeUpdateIntervalRef = useRef<number>();
  const animationFrameRef = useRef<number>();
  const pausedTimeRef = useRef(0);
  const lufsHistoryRef = useRef<number[]>([]);
  const mixFFTCanvasRef = useRef<HTMLCanvasElement>(null);
  const timelineCanvasRef = useRef<HTMLCanvasElement>(null);
  // IA EQ insert point in audio graph
  const iaEqInsertRef = useRef<{input:AudioNode,output:AudioNode}|null>(null);

  useEffect(() => { if (allFiles.length > 0) initializeAudioEngine(); }, [allFiles]);
  useEffect(() => { setAllFiles(uploadedFiles); }, [uploadedFiles]);

  const buildIAEQChain = (ctx: AudioContext, input: AudioNode): AudioNode => {
    const nodes: (BiquadFilterNode|GainNode)[] = [];
    const pg = ctx.createGain();
    pg.gain.value = Math.pow(10, iaEqBands[0] / 20);
    nodes.push(pg);
    input.connect(pg);
    let prev: AudioNode = pg;
    for (let i = 1; i < IAEQ_BANDS.length; i++) {
      const bd = IAEQ_BANDS[i];
      const f = ctx.createBiquadFilter();
      f.type = bd.type as any;
      f.frequency.value = bd.freq!;
      f.Q.value = 1.0;
      f.gain.value = iaEqBands[i] ?? 0;
      nodes.push(f);
      prev.connect(f);
      prev = f;
    }
    iaEqNodesRef.current = nodes;
    return prev;
  };

  const updateLiveIAEQ = (bands: number[]) => {
    const nodes = iaEqNodesRef.current;
    if (!nodes.length) return;
    (nodes[0] as GainNode).gain.value = Math.pow(10, bands[0] / 20);
    for (let i = 1; i < Math.min(bands.length, nodes.length); i++) {
      (nodes[i] as BiquadFilterNode).gain.value = bands[i];
    }
  };

  const initializeAudioEngine = async () => {
    try {
      setIsLoading(true); setLoadingStep('Inicializando motor de audio...'); setLoadingProgress(10);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') await audioContextRef.current.close();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const masterGain = audioContext.createGain();
      const mixAnalyser = audioContext.createAnalyser();
      const bassFilter = audioContext.createBiquadFilter();
      const midFilter = audioContext.createBiquadFilter();
      const highFilter = audioContext.createBiquadFilter();
      bassFilter.type='lowshelf'; bassFilter.frequency.value=100; bassFilter.gain.value=bassGain;
      midFilter.type='peaking'; midFilter.frequency.value=1000; midFilter.Q.value=1; midFilter.gain.value=midGain;
      highFilter.type='highshelf'; highFilter.frequency.value=8000; highFilter.gain.value=highGain;
      mixAnalyser.fftSize=2048; mixAnalyser.smoothingTimeConstant=0.8;
      masterGain.connect(bassFilter); bassFilter.connect(midFilter); midFilter.connect(highFilter);

      // Reverb
      const reverbNode = audioContext.createConvolver();
      const reverbGain = audioContext.createGain();
      const dryGain = audioContext.createGain();
      const reverbLen = audioContext.sampleRate * 2.5;
      const reverbBuf = audioContext.createBuffer(2, reverbLen, audioContext.sampleRate);
      for (let c=0;c<2;c++){const d=reverbBuf.getChannelData(c);for(let i=0;i<reverbLen;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/reverbLen,3.5);}
      reverbNode.buffer = reverbBuf;
      const reverbWetVal = (initialPreset?.reverbWet ?? 0) * (reverbOn ? 1 : 0);
      reverbGain.gain.value = reverbWetVal;
      dryGain.gain.value = 1 - reverbWetVal * 0.4;

      // Delay
      const delayNode = audioContext.createDelay(1.0);
      const delayFeedback = audioContext.createGain();
      const delayGainNode = audioContext.createGain();
      delayNode.delayTime.value = 0.25; delayFeedback.gain.value = 0.3;
      delayGainNode.gain.value = (initialPreset?.delayWet ?? 0) * (delayOn ? 1 : 0);

      // IA EQ insert: highFilter → iaEQ → dryGain/reverb/delay
      const iaEqOutput = buildIAEQChain(audioContext, highFilter);

      iaEqOutput.connect(dryGain);
      iaEqOutput.connect(reverbNode);
      reverbNode.connect(reverbGain);
      iaEqOutput.connect(delayNode);
      delayNode.connect(delayFeedback); delayFeedback.connect(delayNode);
      delayNode.connect(delayGainNode);
      dryGain.connect(mixAnalyser);
      reverbGain.connect(mixAnalyser);
      delayGainNode.connect(mixAnalyser);
      mixAnalyser.connect(audioContext.destination);
      masterGain.gain.value = Math.pow(10, masterVolume/20);
      masterGainRef.current=masterGain; mixAnalyserRef.current=mixAnalyser;
      mixFftDataRef.current=new Uint8Array(mixAnalyser.frequencyBinCount);
      bassFilterRef.current=bassFilter; midFilterRef.current=midFilter; highFilterRef.current=highFilter;
      reverbGainRef.current=reverbGain; dryGainRef.current=dryGain; delayGainRef.current=delayGainNode;

      setLoadingStep('Decodificando archivos...'); setLoadingProgress(30);
      const decoded = await Promise.all(allFiles.map(async (file,i) => {
        try {
          const ab = await file.arrayBuffer();
          const buf = await audioContext.decodeAudioData(ab);
          setLoadingProgress(30+((i+1)/allFiles.length)*40); setLoadingStep(`Procesando ${file.name}...`);
          return {file,buffer:buf};
        } catch { return null; }
      }));
      setLoadingStep('Configurando mezclador...'); setLoadingProgress(80);
      const valid = decoded.filter(Boolean) as {file:File,buffer:AudioBuffer}[];
      const stemsArr: Stem[] = []; let maxDur = 0;
      for (let i=0;i<valid.length;i++) {
        const {file,buffer} = valid[i];
        const gainNode = audioContext.createGain();
        const panNode = audioContext.createStereoPanner();
        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize=512; analyserNode.smoothingTimeConstant=0.7;
        const eqLow=audioContext.createBiquadFilter(); eqLow.type='lowshelf'; eqLow.frequency.value=80; eqLow.gain.value=0;
        const eqMid=audioContext.createBiquadFilter(); eqMid.type='peaking'; eqMid.frequency.value=1000; eqMid.gain.value=0; eqMid.Q.value=0.8;
        const eqHigh=audioContext.createBiquadFilter(); eqHigh.type='highshelf'; eqHigh.frequency.value=8000; eqHigh.gain.value=0;
        gainNode.connect(eqLow); eqLow.connect(eqMid); eqMid.connect(eqHigh); eqHigh.connect(panNode); panNode.connect(analyserNode); analyserNode.connect(masterGain);
        const {instrument,icon} = detectInstrument(file.name);
        stemsArr.push({id:`stem-${i}`,name:file.name,file,buffer,gainNode,panNode,analyserNode,eqLow,eqMid,eqHigh,volume:0,pan:0,muted:false,fftData:new Uint8Array(analyserNode.frequencyBinCount),waveformPeaks:generateWaveformPeaks(buffer,400),instrument,icon,selected:false,stemPresetId:null});
        maxDur = Math.max(maxDur, buffer.duration);
      }
      setStems(stemsArr); setDuration(maxDur); startFFTAnimation();
      setLoadingProgress(100); setLoadingStep('¡Listo!');
      setTimeout(() => setIsLoading(false), 500);
    } catch(e) { console.error(e); setIsLoading(false); }
  };

  const applyPresetToAudio = (preset: MixPreset) => {
    const ctx = audioContextRef.current; if (!ctx) return;
    const t=ctx.currentTime, s=0.08;
    if (bassFilterRef.current) bassFilterRef.current.gain.setTargetAtTime(preset.bass,t,s);
    if (midFilterRef.current) midFilterRef.current.gain.setTargetAtTime(preset.mid,t,s);
    if (highFilterRef.current) highFilterRef.current.gain.setTargetAtTime(preset.high,t,s);
    const rvWet = preset.reverbWet * (reverbOnRef.current?1:0);
    if (reverbGainRef.current) reverbGainRef.current.gain.setTargetAtTime(rvWet,t,s);
    if (dryGainRef.current) dryGainRef.current.gain.setTargetAtTime(1-rvWet*0.4,t,s);
    const dlWet = preset.delayWet * (delayOnRef.current?1:0);
    if (delayGainRef.current) delayGainRef.current.gain.setTargetAtTime(dlWet,t,s);
    setBassGain(preset.bass); setMidGain(preset.mid); setHighGain(preset.high);
    setActivePreset(preset);
  };

  const toggleReverb = () => {
    const v=!reverbOnRef.current; reverbOnRef.current=v;
    const ctx=audioContextRef.current; if(!ctx||!activePreset) return;
    const rvWet=activePreset.reverbWet*(v?1:0);
    reverbGainRef.current?.gain.setTargetAtTime(rvWet,ctx.currentTime,0.05);
    dryGainRef.current?.gain.setTargetAtTime(1-rvWet*0.4,ctx.currentTime,0.05);
    setReverbActive(v);
  };
  const toggleDelay = () => {
    const v=!delayOnRef.current; delayOnRef.current=v;
    const ctx=audioContextRef.current; if(!ctx||!activePreset) return;
    delayGainRef.current?.gain.setTargetAtTime(activePreset.delayWet*(v?1:0),ctx.currentTime,0.05);
    setDelayActive(v);
  };

  const generateWaveformPeaks = (buffer:AudioBuffer,samples:number):Float32Array => {
    const peaks=new Float32Array(samples),cd=buffer.getChannelData(0),ss=Math.floor(cd.length/samples);
    for(let i=0;i<samples;i++){let mx=0;for(let j=i*ss;j<Math.min((i+1)*ss,cd.length);j++)mx=Math.max(mx,Math.abs(cd[j]));peaks[i]=mx;}
    return peaks;
  };

  const startFFTAnimation = useCallback(()=>{
    const update=()=>{
      const ma=mixAnalyserRef.current,fd=mixFftDataRef.current;
      if(ma&&fd){
        ma.getByteFrequencyData(fd);
        setStems(prev=>prev.map(s=>{s.analyserNode.getByteFrequencyData(s.fftData);return{...s};}));
        const wd=new Float32Array(ma.fftSize); ma.getFloatTimeDomainData(wd);
        let rmsSum=0; for(let i=0;i<wd.length;i++) rmsSum+=wd[i]*wd[i];
        const rms=Math.sqrt(rmsSum/wd.length);
        const momentary=rms>0?Math.max(-60,20*Math.log10(rms)-0.691):-60;
        setMomentaryLufs(momentary); lufsHistoryRef.current.push(momentary);
        if(lufsHistoryRef.current.length>300) lufsHistoryRef.current.shift();
        const integrated=lufsHistoryRef.current.reduce((a,b)=>a+b,0)/lufsHistoryRef.current.length;
        setIntegratedLufs(Math.max(-60,Math.min(0,integrated)));
        setLufsMomentary(momentary); setLufsIntegrated(integrated);
        if(mixFFTCanvasRef.current) drawFFTAnalyzer({canvas:mixFFTCanvasRef.current,fftData:fd,style:'applemusic'});
      }
      animationFrameRef.current=requestAnimationFrame(update);
    };
    update();
  },[]);

  const applyStemPreset=(stem:Stem,preset:MixPreset)=>{
    const ctx=audioContextRef.current; if(!ctx) return;
    stem.eqLow.gain.setTargetAtTime(preset.bass,ctx.currentTime,0.05);
    stem.eqMid.gain.setTargetAtTime(preset.mid,ctx.currentTime,0.05);
    stem.eqHigh.gain.setTargetAtTime(preset.high,ctx.currentTime,0.05);
    setStems(prev=>prev.map(s=>s.id===stem.id?{...s,stemPresetId:preset.id}:s));
    setOpenStemPresetId(null);
  };
  const clearStemPreset=(stem:Stem)=>{
    const ctx=audioContextRef.current; if(!ctx) return;
    stem.eqLow.gain.setTargetAtTime(0,ctx.currentTime,0.05);
    stem.eqMid.gain.setTargetAtTime(0,ctx.currentTime,0.05);
    stem.eqHigh.gain.setTargetAtTime(0,ctx.currentTime,0.05);
    setStems(prev=>prev.map(s=>s.id===stem.id?{...s,stemPresetId:null}:s));
  };
  const applyBulkDb=(dbStr:string)=>{
    const db=parseFloat(dbStr); if(isNaN(db)) return;
    const clamped=Math.max(-60,Math.min(12,db));
    setStems(prev=>prev.map(s=>{
      if(!selectedStems.has(s.id)) return s;
      const ctx=audioContextRef.current;
      if(s.gainNode&&ctx) s.gainNode.gain.setTargetAtTime(Math.pow(10,clamped/20),ctx.currentTime,0.05);
      return{...s,volume:clamped};
    }));
  };
  const toggleStemSelect=(id:string,e:React.MouseEvent)=>{
    e.stopPropagation();
    setSelectedStems(prev=>{const n=new Set(prev);if(n.has(id))n.delete(id);else n.add(id);return n;});
  };
  const selectAll=()=>setSelectedStems(new Set(stems.map(s=>s.id)));
  const clearSelection=()=>setSelectedStems(new Set());
  const updateSelectedVolume=(delta:number)=>{
    setStems(prev=>prev.map(s=>{
      if(!selectedStems.has(s.id)) return s;
      const v=Math.max(-60,Math.min(12,s.volume+delta));
      const ctx=audioContextRef.current;
      if(s.gainNode&&ctx) s.gainNode.gain.setTargetAtTime(Math.pow(10,v/20),ctx.currentTime,0.05);
      return{...s,volume:v};
    }));
  };
  const startEditVolume=(stem:Stem)=>{setEditingVolumeId(stem.id);setEditingVolumeVal(stem.volume.toFixed(1));};
  const commitEditVolume=(id:string)=>{
    const val=parseFloat(editingVolumeVal);
    if(!isNaN(val)) updateStemVolume(id,Math.max(-60,Math.min(12,val)));
    setEditingVolumeId(null);
  };
  const adjustGlobalEQ=useCallback((band:'bass'|'mid'|'high',dir:'up'|'down')=>{
    const ctx=audioContextRef.current; if(!ctx) return;
    const adj=dir==='up'?1:-1;
    if(band==='bass'){const v=Math.max(-12,Math.min(12,bassGain+adj));bassFilterRef.current?.gain.setTargetAtTime(v,ctx.currentTime,0.01);setBassGain(v);}
    if(band==='mid'){const v=Math.max(-12,Math.min(12,midGain+adj));midFilterRef.current?.gain.setTargetAtTime(v,ctx.currentTime,0.01);setMidGain(v);}
    if(band==='high'){const v=Math.max(-12,Math.min(12,highGain+adj));highFilterRef.current?.gain.setTargetAtTime(v,ctx.currentTime,0.01);setHighGain(v);}
  },[bassGain,midGain,highGain]);
  const setAllStemsGain=useCallback((db:number)=>{
    const ctx=audioContextRef.current;
    setStems(prev=>prev.map(s=>{if(ctx)s.gainNode.gain.setTargetAtTime(Math.pow(10,db/20),ctx.currentTime,0.01);return{...s,volume:db};}));
  },[]);

  const handlePlayPause=async()=>{
    const ctx=audioContextRef.current; if(!ctx||stems.length===0) return;
    if(ctx.state==='suspended') await ctx.resume();
    if(isPlaying){
      stems.forEach(s=>{s.sourceNode?.stop();s.sourceNode?.disconnect();});
      setIsPlaying(false); pausedTimeRef.current=currentTime;
      if(timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
    } else {
      const startTime=ctx.currentTime,offset=pausedTimeRef.current;
      const updated=stems.map(s=>{
        if(!s.muted){const src=ctx.createBufferSource();src.buffer=s.buffer;src.connect(s.gainNode);src.start(startTime,offset);return{...s,sourceNode:src};}
        return s;
      });
      setStems(updated); setIsPlaying(true);
      timeUpdateIntervalRef.current=window.setInterval(()=>{
        const elapsed=ctx.currentTime-startTime+offset;
        setCurrentTime(Math.min(elapsed,duration));
        if(elapsed>=duration) handleStop();
      },100);
    }
  };
  const handleStop=()=>{
    stems.forEach(s=>{s.sourceNode?.stop();s.sourceNode?.disconnect();});
    setStems(prev=>prev.map(s=>({...s,sourceNode:undefined})));
    setIsPlaying(false); setCurrentTime(0); pausedTimeRef.current=0;
    if(timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
  };
  const updateMasterVolume=(db:number)=>{
    const ctx=audioContextRef.current,mg=masterGainRef.current;
    if(mg&&ctx) mg.gain.setTargetAtTime(Math.pow(10,db/20),ctx.currentTime,0.01);
    setMasterVolume(db);
  };
  const updateStemVolume=(id:string,db:number)=>{
    const ctx=audioContextRef.current;
    setStems(prev=>prev.map(s=>{
      if(s.id===id){if(ctx)s.gainNode.gain.setTargetAtTime(Math.pow(10,db/20),ctx.currentTime,0.01);return{...s,volume:db};}
      return s;
    }));
  };
  const updateStemPan=(id:string,pan:number)=>{
    const ctx=audioContextRef.current;
    setStems(prev=>prev.map(s=>{
      if(s.id===id){if(ctx)s.panNode.pan.setTargetAtTime(pan,ctx.currentTime,0.01);return{...s,pan};}
      return s;
    }));
  };
  const toggleStemMute=(id:string)=>{
    const ctx=audioContextRef.current;
    setStems(prev=>prev.map(s=>{
      if(s.id===id){const muted=!s.muted;if(ctx)s.gainNode.gain.setTargetAtTime(muted?0:Math.pow(10,s.volume/20),ctx.currentTime,0.01);return{...s,muted};}
      return s;
    }));
  };
  const handleTimelineSeek=(t:number)=>{
    if(isPlaying){handleStop();setTimeout(()=>{pausedTimeRef.current=t;setCurrentTime(t);handlePlayPause();},50);}
    else{pausedTimeRef.current=t;setCurrentTime(t);}
  };
  const handleUploadMoreStems=async(newFiles:File[])=>{
    if(stems.length+newFiles.length>12){alert('Máximo 12 stems');return;}
    if(isPlaying){handleStop();await new Promise(r=>setTimeout(r,100));}
    setShowUploadModal(false); setAllFiles([...allFiles,...newFiles]);
  };

  // ---- Access check ----
  // Users with permanent unlimited access
  const UNLIMITED_EMAILS = ['danipalacio@gmail.com'];

  const getDeviceFingerprint = (): string => {
    // Lightweight stable fingerprint — no external lib needed
    const nav = window.navigator;
    const scr = window.screen;
    const parts = [
      nav.userAgent,
      nav.language,
      String(scr.width) + 'x' + String(scr.height),
      String(scr.colorDepth),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      String(nav.hardwareConcurrency || ''),
    ];
    // Simple hash
    let h = 0;
    const str = parts.join('|');
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
    return 'fp_' + Math.abs(h).toString(36);
  };

  const getAccessInfo = () => {
    try {
      const stored = localStorage.getItem('audioMixerUser');
      if (stored) {
        const u = JSON.parse(stored);
        // Hardcoded unlimited users
        if (UNLIMITED_EMAILS.includes(u.email)) return { allowed:true, isPro:true };
        // Admin / paid plan
        if (u.is_pro || u.plan === 'unlimited') return { allowed:true, isPro:true };
        // Registered free user — check if they already used their 1 free mix
        // Key: we track free mix per user email, NOT per device fingerprint
        const usedKey = `mixingai_used_free_${u.email}`;
        const usedFree = localStorage.getItem(usedKey) === '1';
        if (usedFree) return { allowed:false, isPro:false, reason:'freeDone', email: u.email };
        return { allowed:true, isPro:false, email: u.email };
      }
      // Guest (not registered) — check device fingerprint
      const fp = getDeviceFingerprint();
      const usedFreeGuest = localStorage.getItem('mixingai_used_free') === '1' ||
                            localStorage.getItem(`mixingai_fp_${fp}`) === '1';
      if (usedFreeGuest) return { allowed:false, isPro:false, reason:'freeDone', fp };
      return { allowed:true, isPro:false, fp };
    } catch { return { allowed:true, isPro:false }; }
  };

  const handleExportClick = () => {
    const access = getAccessInfo();
    if (!access.allowed) { setShowPaywall(true); return; }
    if (!access.isPro) {
      // Mark free mix as used — per user email if registered, per device if guest
      const a = access as any;
      if (a.email) {
        localStorage.setItem(`mixingai_used_free_${a.email}`, '1');
      } else {
        localStorage.setItem('mixingai_used_free', '1');
        if (a.fp) localStorage.setItem(`mixingai_fp_${a.fp}`, '1');
      }
    }
    handleExportMix();
  };

  const handleExportMix=async()=>{
    if(!audioContextRef.current||stems.length===0) return;
    if(isPlaying){handleStop();await new Promise(r=>setTimeout(r,100));}
    setIsExporting(true); setExportProgress(0); setExportStep('Inicializando procesamiento IA...');
    try {
      setExportProgress(15); setExportStep('Aplicando IA EQ + Reducción de ruido...'); await new Promise(r=>setTimeout(r,1000));
      const offCtx=new OfflineAudioContext(2,Math.floor(44100*duration),44100);
      const mixBus=offCtx.createGain();
      const compMap: Record<string,(c:DynamicsCompressorNode)=>void>={
        none:c=>{c.threshold.value=-60;c.ratio.value=1;c.knee.value=40;c.attack.value=0.1;c.release.value=0.5;},
        low: c=>{c.threshold.value=-24;c.ratio.value=2;c.knee.value=20;c.attack.value=0.02;c.release.value=0.3;},
        medium:c=>{c.threshold.value=-18;c.ratio.value=4;c.knee.value=12;c.attack.value=0.005;c.release.value=0.1;},
        high:c=>{c.threshold.value=-14;c.ratio.value=6;c.knee.value=8;c.attack.value=0.003;c.release.value=0.08;},
        max: c=>{c.threshold.value=-10;c.ratio.value=10;c.knee.value=4;c.attack.value=0.001;c.release.value=0.05;},
      };
      const compressor=offCtx.createDynamicsCompressor();
      (compMap[initialPreset?.compression??'medium']||compMap.medium)(compressor);
      const noiseRed=offCtx.createBiquadFilter(); noiseRed.type='highpass'; noiseRed.frequency.value=40;
      const lowShelf=offCtx.createBiquadFilter(); lowShelf.type='lowshelf'; lowShelf.frequency.value=100; lowShelf.gain.value=bassGain+1.2;
      const midPeak=offCtx.createBiquadFilter(); midPeak.type='peaking'; midPeak.frequency.value=2500; midPeak.Q.value=0.8; midPeak.gain.value=midGain-0.5;
      const highShelf=offCtx.createBiquadFilter(); highShelf.type='highshelf'; highShelf.frequency.value=8000; highShelf.gain.value=highGain+1.8;
      const limiter=offCtx.createDynamicsCompressor();
      limiter.threshold.value=-1.0; limiter.knee.value=0; limiter.ratio.value=20; limiter.attack.value=0.0003; limiter.release.value=0.05;
      mixBus.gain.value=Math.pow(10,(masterVolume-2)/20);
      const activePresetData=activePreset||initialPreset;
      const dryGainOff=offCtx.createGain(); dryGainOff.gain.value=1-(activePresetData?.reverbWet??0)*0.4;
      const reverbGainOff=offCtx.createGain(); reverbGainOff.gain.value=activePresetData?.reverbWet??0;
      const reverbNodeOff=offCtx.createConvolver();
      const rl=offCtx.sampleRate*2.5; const rb=offCtx.createBuffer(2,rl,offCtx.sampleRate);
      for(let c=0;c<2;c++){const d=rb.getChannelData(c);for(let i=0;i<rl;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/rl,3.5);}
      reverbNodeOff.buffer=rb;
      const delayNodeOff=offCtx.createDelay(1.0); delayNodeOff.delayTime.value=0.25;
      const delayFeedOff=offCtx.createGain(); delayFeedOff.gain.value=0.3;
      const delayGainOff=offCtx.createGain(); delayGainOff.gain.value=activePresetData?.delayWet??0;

      // IA EQ offline chain
      setExportProgress(30); setExportStep('Aplicando IA EQ ' + iaEqPreset.name + '...');
      const iaPreGain=offCtx.createGain(); iaPreGain.gain.value=Math.pow(10,iaEqBands[0]/20);
      let iaPrev: AudioNode = iaPreGain;
      for(let i=1;i<IAEQ_BANDS.length;i++){
        const bd=IAEQ_BANDS[i]; const f=offCtx.createBiquadFilter();
        f.type=bd.type as any; f.frequency.value=bd.freq!; f.Q.value=1.0; f.gain.value=iaEqBands[i]??0;
        iaPrev.connect(f); iaPrev=f;
      }
      // Chain: mixBus → noiseRed → lowShelf → midPeak → highShelf → compressor → iaPreGain → [IA EQ bands] → iaPrev → dryGainOff/reverb/delay → limiter → dest
      mixBus.connect(noiseRed); noiseRed.connect(lowShelf); lowShelf.connect(midPeak); midPeak.connect(highShelf);
      highShelf.connect(compressor); compressor.connect(iaPreGain);
      iaPrev.connect(dryGainOff); iaPrev.connect(reverbNodeOff); reverbNodeOff.connect(reverbGainOff);
      iaPrev.connect(delayNodeOff); delayNodeOff.connect(delayFeedOff); delayFeedOff.connect(delayNodeOff); delayNodeOff.connect(delayGainOff);
      dryGainOff.connect(limiter); reverbGainOff.connect(limiter); delayGainOff.connect(limiter);
      limiter.connect(offCtx.destination);

      setExportProgress(45); setExportStep('Renderizando stems...'); await new Promise(r=>setTimeout(r,600));
      for(const stem of stems){
        if(stem.buffer&&!stem.muted){
          const src=offCtx.createBufferSource(),g=offCtx.createGain(),p=offCtx.createStereoPanner();
          src.buffer=stem.buffer; g.gain.value=Math.pow(10,stem.volume/20); p.pan.value=stem.pan;
          src.connect(g); g.connect(p); p.connect(mixBus); src.start(0);
        }
      }
      setExportProgress(70); setExportStep('Normalizando a -10 LUFS...'); await new Promise(r=>setTimeout(r,700));
      const rendered=await offCtx.startRendering();
      const normalized=normalizeTo10LUFS(rendered);
      setExportProgress(92); setExportStep('Generando archivo WAV 24-bit...'); await new Promise(r=>setTimeout(r,500));
      const peaks=generateWaveformPeaks(normalized,800);
      const wavBlob=bufferToWav(normalized,24);
      const wavUrl=URL.createObjectURL(wavBlob);
      setExportProgress(100); setExportStep('¡Listo!'); await new Promise(r=>setTimeout(r,700));
      setIsExporting(false); setExportProgress(0); setExportStep('');
      await new Promise(r=>setTimeout(r,50));
      onExport({audioBuffer:normalized,audioUrl:wavUrl,waveformPeaks:peaks,finalLufs:-10.0,presetName:(activePreset||initialPreset)?.name,iaEqPreset:iaEqPreset.name});
    } catch(e){console.error('Export error:',e);setIsExporting(false);}
  };

  const normalizeTo10LUFS=(buffer:AudioBuffer):AudioBuffer=>{
    const target=-10;
    let rmsSum=0; const ch0=buffer.getChannelData(0);
    for(let i=0;i<ch0.length;i++) rmsSum+=ch0[i]*ch0[i];
    const rms=Math.sqrt(rmsSum/ch0.length);
    const currLufs=rms>0?20*Math.log10(rms)-0.691:-60;
    const gain=Math.pow(10,(target-currLufs)/20);
    let peak=0;
    for(let c=0;c<buffer.numberOfChannels;c++){const d=buffer.getChannelData(c);for(let i=0;i<d.length;i++){const a=Math.abs(d[i]*gain);if(a>peak)peak=a;}}
    const ceiling=0.891;
    const sg=peak>ceiling?gain*(ceiling/peak):gain;
    for(let c=0;c<buffer.numberOfChannels;c++){
      const d=buffer.getChannelData(c);
      for(let i=0;i<d.length;i++){d[i]*=sg;if(d[i]>ceiling)d[i]=ceiling;else if(d[i]<-ceiling)d[i]=-ceiling;}
    }
    return buffer;
  };

  const bufferToWav=(buffer:AudioBuffer,bitDepth=24):Blob=>{
    const len=buffer.length,ch=buffer.numberOfChannels,sr=buffer.sampleRate;
    const bps=bitDepth/8,ba=ch*bps,br=sr*ba,ds=len*ba,bs=44+ds;
    const ab=new ArrayBuffer(bs),view=new DataView(ab);
    const ws=(o:number,s:string)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
    ws(0,'RIFF');view.setUint32(4,bs-8,true);ws(8,'WAVE');ws(12,'fmt ');
    view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,ch,true);
    view.setUint32(24,sr,true);view.setUint32(28,br,true);view.setUint16(32,ba,true);
    view.setUint16(34,bitDepth,true);ws(36,'data');view.setUint32(40,ds,true);
    let offset=44;
    for(let i=0;i<len;i++) for(let c=0;c<ch;c++){
      const s=Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]));
      const v=Math.round(s*8388607);
      if(offset+2<ab.byteLength){view.setInt8(offset,v&0xFF);view.setInt8(offset+1,(v>>8)&0xFF);view.setInt8(offset+2,(v>>16)&0xFF);offset+=3;}
    }
    return new Blob([ab],{type:'audio/wav'});
  };

  useEffect(()=>{
    const canvas=timelineCanvasRef.current;
    if(!canvas||duration===0) return;
    const combined=new Float32Array(400);
    stems.forEach(s=>{if(!s.muted)for(let i=0;i<400;i++)combined[i]+=s.waveformPeaks[i]||0;});
    let max=0; for(let i=0;i<400;i++)max=Math.max(max,combined[i]);
    if(max>0) for(let i=0;i<400;i++)combined[i]/=max;
    drawWaveform({canvas,waveformPeaks:combined,currentTime,duration,style:'soundcloud',colors:{played:'#C026D3',unplayed:'rgba(124,58,237,0.2)',playhead:'#EC4899'}});
  },[stems,currentTime,duration]);

  useEffect(()=>()=>{
    if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if(timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
    audioContextRef.current?.close();
  },[]);

  const fmt=(t:number)=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;

  if(isLoading) return(
    <div style={C.page}><Header user={user} onLogout={()=>{}} onCreditsUpdate={onCreditsUpdate}/>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'80vh',padding:'24px'}}>
        <div style={{...C.card,maxWidth:'380px',width:'100%',textAlign:'center',padding:'40px 24px'}}>
          <div style={{width:'64px',height:'64px',margin:'0 auto 20px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'18px',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 28px rgba(192,38,211,0.5)'}}>
            <i className="ri-equalizer-line" style={{color:'#fff',fontSize:'26px'}}></i>
          </div>
          <h3 style={{fontSize:'20px',fontWeight:600,color:'#F8F0FF',marginBottom:'10px'}}>Cargando Mezclador</h3>
          <p style={{color:'#9B7EC8',marginBottom:'20px',fontSize:'14px'}}>{loadingStep}</p>
          <div style={{background:'rgba(36,22,54,0.75)',borderRadius:'8px',height:'6px',overflow:'hidden',marginBottom:'8px'}}>
            <div style={C.progressBar(loadingProgress)}></div>
          </div>
          <div style={{...C.mono,color:'#C026D3',fontWeight:600}}>{loadingProgress}%</div>
        </div>
      </div>
    </div>
  );

  if(isExporting){
    const steps=[{l:'IA EQ '+iaEqPreset.name,t:30},{l:'Compresión',t:55},{l:'Limiter',t:75},{l:'-10 LUFS',t:92}];
    return(
      <div style={C.page}><Header user={user} onLogout={()=>{}} onCreditsUpdate={onCreditsUpdate}/>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'80vh',padding:'24px'}}>
          <div style={{...C.card,maxWidth:'420px',width:'100%',textAlign:'center',padding:'40px 24px'}}>
            <div style={{width:'72px',height:'72px',margin:'0 auto 20px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'20px',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 32px rgba(192,38,211,0.6)'}}>
              <i className="ri-equalizer-fill" style={{color:'#fff',fontSize:'28px'}}></i>
            </div>
            <h3 style={{fontSize:'22px',fontWeight:600,color:'#F8F0FF',marginBottom:'10px'}}>Procesando con IA</h3>
            <p style={{color:'#9B7EC8',marginBottom:'20px',fontSize:'13px',lineHeight:1.6}}>{exportStep}</p>
            <div style={{background:'rgba(36,22,54,0.75)',borderRadius:'8px',height:'6px',overflow:'hidden',marginBottom:'8px'}}>
              <div style={C.progressBar(exportProgress)}></div>
            </div>
            <div style={{...C.mono,color:'#C026D3',fontWeight:600,fontSize:'18px',marginBottom:'24px'}}>{exportProgress}%</div>
            <div style={{display:'flex',justifyContent:'center',gap:'16px',flexWrap:'wrap'}}>
              {steps.map(s=>(
                <div key={s.l} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'5px'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:exportProgress>=s.t?'#C026D3':'#241636',border:exportProgress>=s.t?'2px solid #EC4899':'2px solid #3D2560',boxShadow:exportProgress>=s.t?'0 0 8px rgba(192,38,211,0.7)':'none',transition:'all 0.4s'}}></div>
                  <span style={{fontSize:'10px',color:'#9B7EC8'}}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return(
    <div style={C.page}>
      <Header user={user} onLogout={()=>{}} onCreditsUpdate={onCreditsUpdate}/>
      <div style={{maxWidth:'1400px',margin:'0 auto',padding:'16px 12px 40px'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'16px',gap:'10px',flexWrap:'wrap'}}>
          <div>
            <h1 style={{fontSize:'clamp(18px,4vw,26px)',fontWeight:700,letterSpacing:'-0.5px',...C.grad,margin:0}}>🎛️ Mezclador AI Pro</h1>
            <p style={{color:'#9B7EC8',fontSize:'12px',marginTop:'4px'}}>
              {stems.length} stems · {fmt(duration)}
              {activePreset&&(
                <button onClick={()=>{}}
                  style={{marginLeft:'8px',background:`linear-gradient(135deg,${activePreset.color}22,${activePreset.color}11)`,border:`1.5px solid ${activePreset.color}`,borderRadius:'980px',padding:'5px 14px',fontSize:'12px',color:'#F8F0FF',fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:'6px',boxShadow:`0 0 10px ${activePreset.color}44`}}>
                  ✦ {activePreset.name}
                </button>
              )}
            </p>
          </div>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            {stems.length<12&&<button onClick={()=>setShowUploadModal(true)} style={{...C.ghostBtn,fontSize:'12px',padding:'8px 14px'}}>+ Stems ({stems.length}/12)</button>}
            <button onClick={handleExportClick} disabled={stems.length===0}
              style={{background:stems.length===0?'#241636':'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',border:'none',color:'#fff',padding:'12px 28px',borderRadius:'980px',fontSize:'15px',fontWeight:700,cursor:stems.length===0?'not-allowed':'pointer',boxShadow:stems.length>0?'0 0 28px rgba(192,38,211,0.6)':'none',fontFamily:'inherit',opacity:stems.length===0?0.4:1,display:'inline-flex',alignItems:'center',gap:'8px',letterSpacing:'-0.2px'}}>
              <i className="ri-equalizer-fill" style={{fontSize:'14px'}}></i>
              ✦ Exportar Mezcla con IA
            </button>
            <button onClick={onBack} style={{...C.ghostBtn,fontSize:'12px',padding:'8px 14px'}}>← Volver</button>
          </div>
        </div>

        {/* Timeline */}
        <div style={{...C.card,marginBottom:'12px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
            <span style={C.label}>Timeline</span>
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <span style={{...C.mono,fontSize:'12px',color:'#9B7EC8'}}>{fmt(currentTime)}{' / '}{fmt(duration)}</span>
              <button onClick={handlePlayPause} disabled={stems.length===0}
                style={{width:'42px',height:'42px',borderRadius:'50%',background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 16px rgba(236,72,153,0.5)',flexShrink:0}}>
                <i className={isPlaying?'ri-pause-fill':'ri-play-fill'} style={{color:'#fff',fontSize:'18px',marginLeft:isPlaying?0:'2px'}}></i>
              </button>
              <button onClick={handleStop} disabled={stems.length===0}
                style={{width:'34px',height:'34px',borderRadius:'50%',background:'rgba(36,22,54,0.75)',border:'1px solid rgba(192,38,211,0.2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="ri-stop-fill" style={{color:'#9B7EC8',fontSize:'13px'}}></i>
              </button>
            </div>
          </div>
          <div style={{background:'rgba(8,4,16,0.88)',borderRadius:'10px',padding:'8px',border:'1px solid rgba(192,38,211,0.1)'}}>
            <canvas ref={timelineCanvasRef} width={1200} height={80}
              style={{width:'100%',height:'50px',borderRadius:'6px',cursor:'pointer',display:'block'}}
              onClick={e=>{if(timelineCanvasRef.current) handleWaveformClick(e,timelineCanvasRef.current,duration,handleTimelineSeek);}}/>
          </div>
        </div>

        {/* Presets */}
        <div style={{...C.card,marginBottom:'12px'}}>
          <span style={C.label}>Preset — toca para aplicar y escuchar en tiempo real</span>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:'7px'}}>
            {PRESETS.map(p=>{
              const isSel=activePreset?.id===p.id;
              return(
                <button key={p.id} onClick={()=>applyPresetToAudio(p)}
                  style={{background:isSel?`linear-gradient(135deg,${p.color}22,${p.color}11)`:'rgba(8,4,16,0.5)',border:`1.5px solid ${isSel?p.color:'rgba(192,38,211,0.1)'}`,borderRadius:'11px',padding:'9px 8px',cursor:'pointer',textAlign:'left',transition:'all 0.15s',boxShadow:isSel?`0 0 12px ${p.color}44`:'none',position:'relative'}}>
                  {isSel&&<div style={{position:'absolute',top:'5px',right:'5px',width:'14px',height:'14px',borderRadius:'50%',background:p.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'8px',color:'#fff',fontWeight:700}}>✓</div>}
                  <div style={{height:'22px',display:'flex',alignItems:'flex-end',gap:'1px',marginBottom:'7px',background:'rgba(8,4,16,0.6)',borderRadius:'5px',padding:'3px 4px'}}>
                    {p.wavePattern.map((h,i)=><div key={i} style={{flex:1,borderRadius:'2px 2px 0 0',height:`${h*100}%`,background:isSel?p.color:'rgba(155,126,200,0.2)',transition:'background 0.2s'}}></div>)}
                  </div>
                  <div style={{fontSize:'11px',fontWeight:700,color:'#F8F0FF',marginBottom:'2px'}}>{p.name}</div>
                  <div style={{fontSize:'9px',color:'rgba(155,126,200,0.6)',marginBottom:'5px'}}>{p.tags[0]}</div>
                  <div style={{display:'flex',gap:'3px',flexWrap:'wrap'}}>
                    <span style={{fontSize:'9px',padding:'1px 5px',borderRadius:'980px',background:`${p.color}22`,color:p.color,border:`1px solid ${p.color}33`}}>B:{p.bass>0?'+':''}{p.bass}</span>
                    <span style={{fontSize:'9px',padding:'1px 5px',borderRadius:'980px',background:`${p.color}22`,color:p.color,border:`1px solid ${p.color}33`}}>R:{Math.round(p.reverbWet*100)}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* MIX BUS MASTER */}
        <div style={{background:'linear-gradient(135deg,rgba(36,22,54,0.88),rgba(26,16,40,0.88))',border:'1px solid rgba(192,38,211,0.3)',borderRadius:'16px',padding:'16px',marginBottom:'12px',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)'}}></div>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'14px'}}>
            <i className="ri-equalizer-fill" style={{color:'#C026D3',fontSize:'14px'}}></i>
            <span style={{fontSize:'11px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#F8F0FF'}}>Mix Bus Master</span>
            {activePreset&&<span style={{background:`linear-gradient(135deg,${activePreset.color},${activePreset.color}88)`,borderRadius:'980px',padding:'3px 10px',fontSize:'10px',color:'#fff',fontWeight:700}}>✦ {activePreset.name}</span>}
            <span style={{marginLeft:'auto',fontSize:'10px',color:isPlaying?'#4ade80':'#9B7EC8',fontFamily:"'DM Mono',monospace",fontWeight:600}}>{isPlaying?'▶ PLAYING':'■ STOPPED'}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'10px'}}>

            {/* EQ sliders */}
            <div style={{background:'rgba(15,10,26,0.6)',borderRadius:'10px',padding:'12px'}}>
              <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8',marginBottom:'10px'}}>EQ — arrastra para ajustar</div>
              {([{label:'Bass',val:bassGain,color:'#EC4899',band:'bass'},{label:'Mid',val:midGain,color:'#C026D3',band:'mid'},{label:'High',val:highGain,color:'#7C3AED',band:'high'}] as const).map(eq=>(
                <div key={eq.label} style={{marginBottom:'10px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                    <span style={{fontSize:'10px',color:'#9B7EC8'}}>{eq.label}</span>
                    <span style={{fontSize:'10px',color:eq.color,fontFamily:"'DM Mono',monospace",fontWeight:600}}>{eq.val>0?'+':''}{eq.val} dB</span>
                  </div>
                  <div style={{position:'relative',height:'18px',display:'flex',alignItems:'center'}}>
                    <div style={{position:'absolute',left:0,right:0,height:'4px',background:'rgba(192,38,211,0.15)',borderRadius:'2px'}}>
                      <div style={{height:'100%',borderRadius:'2px',background:eq.color,width:`${((eq.val+12)/24)*100}%`}}></div>
                    </div>
                    <input type="range" min="-12" max="12" step="1" value={eq.val}
                      onChange={e=>{
                        const v=parseInt(e.target.value); const ctx=audioContextRef.current;
                        if(eq.band==='bass'){setBassGain(v);if(bassFilterRef.current&&ctx)bassFilterRef.current.gain.setTargetAtTime(v,ctx.currentTime,0.05);}
                        else if(eq.band==='mid'){setMidGain(v);if(midFilterRef.current&&ctx)midFilterRef.current.gain.setTargetAtTime(v,ctx.currentTime,0.05);}
                        else{setHighGain(v);if(highFilterRef.current&&ctx)highFilterRef.current.gain.setTargetAtTime(v,ctx.currentTime,0.05);}
                      }}
                      style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}}/>
                  </div>
                </div>
              ))}
            </div>

            {/* FX */}
            <div style={{background:'rgba(15,10,26,0.6)',borderRadius:'10px',padding:'12px'}}>
              <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8',marginBottom:'10px'}}>Efectos</div>
              {[
                {label:'Reverb',active:reverbActive,toggle:toggleReverb,val:activePreset?`${Math.round(activePreset.reverbWet*100)}%`:'0%',sub:'Espacio'},
                {label:'Delay',active:delayActive,toggle:toggleDelay,val:activePreset?`${Math.round(activePreset.delayWet*100)}%`:'0%',sub:'1/4 beat'},
                {label:'Widener',active:widenerActive,toggle:()=>setWidenerActive(!widenerActive),val:activePreset?`${Math.round(activePreset.stereoWidth*100)}%`:'50%',sub:'Estéreo'},
              ].map(fx=>(
                <div key={fx.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                  <div><div style={{fontSize:'11px',color:'#F8F0FF',fontWeight:600}}>{fx.label}</div><div style={{fontSize:'10px',color:'#9B7EC8'}}>{fx.val} · {fx.sub}</div></div>
                  <div onClick={fx.toggle} style={{width:'32px',height:'18px',borderRadius:'9px',background:fx.active?'#C026D3':'rgba(155,126,200,0.2)',position:'relative',cursor:'pointer',transition:'background 0.2s'}}>
                    <div style={{width:'13px',height:'13px',borderRadius:'50%',background:'#fff',position:'absolute',top:'2.5px',left:fx.active?'16px':'3px',transition:'left 0.2s'}}></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Compresión */}
            <div style={{background:'rgba(15,10,26,0.6)',borderRadius:'10px',padding:'12px'}}>
              <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8',marginBottom:'10px'}}>Compresión</div>
              <div style={{fontSize:'14px',fontWeight:700,color:'#F8F0FF',marginBottom:'4px',textTransform:'capitalize' as const}}>{activePreset?.compression||'media'}</div>
              <div style={{fontSize:'10px',color:'#9B7EC8',marginBottom:'8px'}}>
                {activePreset?.compression==='none'?'Sin compresión':activePreset?.compression==='low'?'Thr: -24dB · 2:1':activePreset?.compression==='medium'?'Thr: -18dB · 4:1':activePreset?.compression==='high'?'Thr: -14dB · 6:1':'Thr: -10dB · 10:1'}
              </div>
              <div style={{fontSize:'10px',color:'#9B7EC8',marginBottom:'3px'}}>GR Meter</div>
              <div style={{height:'6px',background:'rgba(192,38,211,0.15)',borderRadius:'4px',overflow:'hidden'}}>
                <div style={{height:'100%',background:'linear-gradient(90deg,#4ade80,#FBBF24,#EC4899)',borderRadius:'4px',width:activePreset?.compression==='none'?'5%':activePreset?.compression==='low'?'20%':activePreset?.compression==='medium'?'40%':activePreset?.compression==='high'?'60%':'80%'}}></div>
              </div>
            </div>

            {/* LUFS */}
            <div style={{background:'rgba(15,10,26,0.6)',borderRadius:'10px',padding:'12px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                <span style={{fontSize:'9px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8'}}>LUFS</span>
                <span style={{fontSize:'9px',fontWeight:700,padding:'2px 8px',borderRadius:'980px',background:'rgba(74,222,128,0.1)',color:'#4ade80',border:'1px solid rgba(74,222,128,0.2)'}}>
                  {momentaryLufs>-14?'⚠ Loud':momentaryLufs<-30?'↓ Soft':'✓ Safe'}
                </span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'8px'}}>
                {[{l:'Mom',v:momentaryLufs},{l:'Int',v:integratedLufs}].map(m=>(
                  <div key={m.l} style={{background:'rgba(8,4,16,0.6)',borderRadius:'8px',padding:'8px',textAlign:'center',border:'1px solid rgba(192,38,211,0.1)'}}>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:'16px',fontWeight:500,...C.grad}}>{m.v.toFixed(1)}</div>
                    <div style={{fontSize:'9px',color:'#9B7EC8',textTransform:'uppercase' as const,letterSpacing:'0.5px'}}>{m.l}</div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',marginBottom:'2px'}}>
                <span style={{color:'#9B7EC8'}}>Spotify</span><span style={{color:'#4ade80'}}>-10</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px'}}>
                <span style={{color:'#9B7EC8'}}>YouTube -10</span>
              </div>
            </div>
          </div>
        </div>

        {/* IA EQ — inline below MixBusMaster, same dark style */}
        <div style={{background:'linear-gradient(135deg,rgba(20,10,36,0.92),rgba(26,14,44,0.92))',border:'1px solid rgba(192,38,211,0.3)',borderRadius:'16px',padding:'16px',marginBottom:'12px',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',background:'linear-gradient(90deg,#7C3AED,#C026D3,#EC4899)'}}></div>
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px',flexWrap:'wrap'}}>
            <div style={{width:'28px',height:'28px',borderRadius:'8px',background:'linear-gradient(135deg,#7C3AED,#C026D3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',flexShrink:0}}>🎚️</div>
            <div>
              <span style={{fontSize:'11px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#F8F0FF'}}>IA EQ — {iaEqPreset.name}</span>
              <div style={{fontSize:'9px',color:'rgba(155,126,200,0.7)'}}>Activo en tiempo real · se exporta junto a la mezcla · -10 LUFS</div>
            </div>
            <span style={{marginLeft:'auto',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'980px',padding:'2px 10px',fontSize:'10px',fontWeight:700,color:'#4ade80'}}>Live</span>
          </div>

          {/* Preset chips */}
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'12px'}}>
            {IAEQ_PRESETS.map(p=>(
              <button key={p.id} onClick={()=>{setIaEqPreset(p);setIaEqBands([...p.bands]);updateLiveIAEQ([...p.bands]);}}
                style={{padding:'5px 12px',borderRadius:'980px',fontSize:'11px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all 0.12s',
                  background:iaEqPreset.id===p.id?'rgba(192,38,211,0.2)':'rgba(255,255,255,0.04)',
                  border:`1px solid ${iaEqPreset.id===p.id?'#C026D3':'rgba(255,255,255,0.08)'}`,
                  color:iaEqPreset.id===p.id?'#EC4899':'rgba(155,126,200,0.7)',
                  boxShadow:iaEqPreset.id===p.id?'0 0 10px rgba(192,38,211,0.25)':'none'}}>
                {p.name}
              </button>
            ))}
          </div>

          {/* 12-band faders */}
          <div style={{overflowX:'auto'}}>
            <div style={{display:'flex',gap:'4px',alignItems:'flex-end',minWidth:'560px',padding:'4px 2px 8px'}}>
              {IAEQ_BANDS.map((bd,i)=>{
                const val=iaEqBands[i]??0;
                const pct=Math.round(((val+12)/24)*100);
                return(
                  <div key={bd.label} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',flex:1}}>
                    <span style={{fontSize:'9px',fontWeight:700,fontFamily:'monospace',color:val===0?'rgba(155,126,200,0.5)':val>0?'#4ade80':'#EC4899',minHeight:'12px',textAlign:'center'}}>
                      {val>0?`+${val.toFixed(0)}`:val.toFixed(0)}
                    </span>
                    <div style={{position:'relative',height:'72px',width:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {/* Track visual */}
                      <div style={{position:'absolute',top:0,bottom:0,left:'50%',width:'2px',transform:'translateX(-50%)',background:'rgba(192,38,211,0.12)',borderRadius:'1px'}}></div>
                      <div style={{position:'absolute',bottom:'50%',left:'50%',width:'2px',transform:'translateX(-50%)',background:val>0?'#C026D3':'#EC4899',borderRadius:'1px',height:`${Math.abs(val)/12*50}%`}}></div>
                      {/* Thumb dot */}
                      <div style={{position:'absolute',top:`${100-pct}%`,left:'50%',transform:'translate(-50%,-50%)',width:'12px',height:'12px',borderRadius:'50%',background:val===0?'rgba(155,126,200,0.6)':val>0?'#C026D3':'#EC4899',border:'2px solid rgba(255,255,255,0.15)',pointerEvents:'none',transition:'top 0.05s',zIndex:1}}></div>
                      <input type="range" min="-12" max="12" step="0.5" value={val}
                        onChange={e=>{
                          const v=parseFloat(e.target.value);
                          const nb=[...iaEqBands]; nb[i]=v; setIaEqBands(nb); updateLiveIAEQ(nb);
                        }}
                        style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%',writingMode:'vertical-lr' as any,direction:'rtl' as any,WebkitAppearance:'slider-vertical' as any}}/>
                    </div>
                    <span style={{fontSize:'9px',color:'rgba(155,126,200,0.55)',textAlign:'center',lineHeight:1.1}}>{bd.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Band labels */}
          <div style={{display:'flex',gap:'5px',marginTop:'6px',flexWrap:'wrap'}}>
            {[{l:'Preamp: Pre',flex:'0 0 auto'},{l:'Bass: 30Hz–170Hz',flex:'1'},{l:'Mid: 310Hz–3kHz',flex:'1'},{l:'High: 6kHz–16kHz',flex:'1'}].map(({l,flex})=>(
              <div key={l} style={{background:'rgba(192,38,211,0.06)',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'6px',padding:'3px 10px',fontSize:'9px',fontWeight:700,color:'rgba(155,126,200,0.7)',flex,textAlign:'center',whiteSpace:'nowrap'}}>
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Controls grid */}
        <div className="controls-grid" style={{marginBottom:'12px'}}>
          {/* Transport */}
          <div style={C.card}>
            <span style={C.label}>Control Mix</span>
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px'}}>
              <button onClick={handlePlayPause} disabled={stems.length===0}
                style={{width:'52px',height:'52px',borderRadius:'50%',background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 20px rgba(236,72,153,0.5)',flexShrink:0}}>
                <i className={isPlaying?'ri-pause-fill':'ri-play-fill'} style={{color:'#fff',fontSize:'20px',marginLeft:isPlaying?0:'2px'}}></i>
              </button>
              <button onClick={handleStop} disabled={stems.length===0}
                style={{width:'36px',height:'36px',borderRadius:'50%',background:'rgba(36,22,54,0.75)',border:'1px solid rgba(192,38,211,0.2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="ri-stop-fill" style={{color:'#9B7EC8',fontSize:'14px'}}></i>
              </button>
            </div>
            <div style={{marginBottom:'14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'4px'}}>
                <span style={{color:'#9B7EC8'}}>Mix Volume</span>
                <span style={{...C.mono,color:'#EC4899',fontWeight:500}}>{masterVolume>0?'+':''}{masterVolume.toFixed(1)} dB</span>
              </div>
              <div style={C.track}>
                <div style={C.trackFill(((masterVolume+60)/72)*100)}></div>
                <input type="range" min="-60" max="12" step="0.1" value={masterVolume}
                  onChange={e=>updateMasterVolume(parseFloat(e.target.value))}
                  style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}}/>
              </div>
            </div>
            <div>
              <div style={{fontSize:'11px',color:'#9B7EC8',marginBottom:'8px'}}>Stems Gain</div>
              <div style={{display:'flex',gap:'6px'}}>
                {[-12,-6,0].map(v=>(
                  <button key={v} onClick={()=>setAllStemsGain(v)}
                    style={{flex:1,padding:'7px 0',background:'rgba(36,22,54,0.75)',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'8px',fontSize:'11px',color:'#9B7EC8',cursor:'pointer',fontFamily:'inherit'}}>
                    {v===0?'0 dB':`${v}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* FFT */}
          <div style={C.card}>
            <span style={C.label}>FFT Analyzer</span>
            <div style={{background:'rgba(8,4,16,0.88)',borderRadius:'10px',padding:'8px',border:'1px solid rgba(192,38,211,0.1)',marginBottom:'14px',height:'90px',overflow:'hidden'}}>
              <canvas ref={mixFFTCanvasRef} width={800} height={100} style={{width:'100%',height:'100%',display:'block'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-around'}}>
              {(['bass','mid','high'] as const).map(band=>{
                const val=band==='bass'?bassGain:band==='mid'?midGain:highGain;
                return(
                  <div key={band} style={{textAlign:'center'}}>
                    <div style={{fontSize:'10px',fontWeight:600,letterSpacing:'0.8px',textTransform:'uppercase',color:'#9B7EC8',marginBottom:'8px'}}>{band}</div>
                    <div style={{display:'flex',gap:'6px',justifyContent:'center'}}>
                      <button onClick={()=>adjustGlobalEQ(band,'down')} style={{width:'32px',height:'32px',background:'rgba(36,22,54,0.75)',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'8px',color:'#F8F0FF',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                      <button onClick={()=>adjustGlobalEQ(band,'up')} style={{width:'32px',height:'32px',background:'rgba(36,22,54,0.75)',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'8px',color:'#F8F0FF',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                    </div>
                    <div style={{...C.mono,fontSize:'11px',color:'#C026D3',marginTop:'5px',fontWeight:500}}>{val>0?'+':''}{val.toFixed(1)} dB</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LUFS */}
          <div style={C.card}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
              <span style={{...C.label,marginBottom:0}}>LUFS</span>
              <span style={{fontSize:'10px',fontWeight:600,padding:'3px 10px',borderRadius:'980px',background:'rgba(74,222,128,0.1)',color:'#4ade80',border:'1px solid rgba(74,222,128,0.2)'}}>Safe</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
              {[{l:'Momentary',v:lufsMomentary},{l:'Integrated',v:lufsIntegrated}].map(m=>(
                <div key={m.l} style={{background:'rgba(8,4,16,0.88)',borderRadius:'10px',padding:'12px',textAlign:'center',border:'1px solid rgba(192,38,211,0.08)'}}>
                  <div style={{...C.mono,fontSize:'20px',fontWeight:500,...C.grad}}>{m.v.toFixed(1)}</div>
                  <div style={{fontSize:'10px',color:'#9B7EC8',marginTop:'2px',textTransform:'uppercase',letterSpacing:'0.6px'}}>{m.l}</div>
                </div>
              ))}
            </div>
            <div style={{borderTop:'1px solid rgba(192,38,211,0.1)',paddingTop:'10px'}}>
              {[{n:'Spotify -10',c:'#4ade80'},{n:'YouTube -10',c:'#f87171'}].map(r=>(
                <div key={r.n} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:'11px',marginBottom:'5px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                    <div style={{width:'6px',height:'6px',borderRadius:'50%',background:r.c}}></div>
                    <span style={{color:'#9B7EC8'}}>{r.n}</span>
                  </div>
                  <span style={{...C.mono,color:'#F8F0FF',fontWeight:500}}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stems */}
        {stems.length>0&&(
          <div>
            <div style={{background:'rgba(192,38,211,0.06)',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'12px',padding:'10px 14px',marginBottom:'12px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
              <button onClick={selectedStems.size===stems.length?clearSelection:selectAll}
                style={{fontSize:'12px',fontWeight:700,padding:'6px 14px',borderRadius:'8px',background:selectedStems.size===stems.length?'rgba(192,38,211,0.25)':'rgba(192,38,211,0.12)',border:'1px solid rgba(192,38,211,0.35)',color:'#C026D3',cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
                {selectedStems.size===stems.length?`✓ Todos (${stems.length})`:`Seleccionar todo (${stems.length})`}
              </button>
              {selectedStems.size>0&&<>
                <div style={{width:'1px',height:'24px',background:'rgba(192,38,211,0.2)',flexShrink:0}}></div>
                <span style={{fontSize:'11px',color:'#9B7EC8',flexShrink:0}}>{selectedStems.size} stem{selectedStems.size>1?'s':''} sel.</span>
                <div style={{display:'flex',alignItems:'center',gap:'6px',background:'rgba(8,4,16,0.5)',borderRadius:'8px',padding:'4px 10px',border:'1px solid rgba(192,38,211,0.25)'}}>
                  <span style={{fontSize:'11px',color:'#9B7EC8',flexShrink:0}}>Poner a:</span>
                  <input type="number" min="-60" max="12" step="0.5" value={bulkDbInput}
                    onChange={e=>setBulkDbInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter'){applyBulkDb(bulkDbInput);setBulkDbInput('');}}}
                    placeholder="-6.0"
                    style={{width:'56px',background:'transparent',border:'none',outline:'none',color:'#EC4899',fontSize:'13px',fontFamily:'monospace',fontWeight:700,textAlign:'center'}}/>
                  <span style={{fontSize:'11px',color:'#9B7EC8',flexShrink:0}}>dB</span>
                  <button onClick={()=>{applyBulkDb(bulkDbInput);setBulkDbInput('');}}
                    style={{background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'3px 10px',borderRadius:'6px',fontSize:'11px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>↵</button>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'3px'}}>
                  <button onClick={()=>updateSelectedVolume(-1)} style={{width:'26px',height:'26px',borderRadius:'6px',background:'rgba(192,38,211,0.12)',border:'1px solid rgba(192,38,211,0.2)',color:'#F8F0FF',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>−</button>
                  <span style={{fontSize:'10px',color:'#9B7EC8',padding:'0 2px'}}>1dB</span>
                  <button onClick={()=>updateSelectedVolume(1)} style={{width:'26px',height:'26px',borderRadius:'6px',background:'rgba(192,38,211,0.12)',border:'1px solid rgba(192,38,211,0.2)',color:'#F8F0FF',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>+</button>
                </div>
                <button onClick={clearSelection} style={{marginLeft:'auto',fontSize:'11px',padding:'4px 10px',borderRadius:'6px',background:'transparent',border:'1px solid rgba(255,255,255,0.1)',color:'#9B7EC8',cursor:'pointer',fontFamily:'inherit'}}>✕ Limpiar</button>
              </>}
            </div>
            <div className="stems-grid">
              {stems.map(stem=>{
                const isSel=selectedStems.has(stem.id);
                return(
                  <div key={stem.id} onClick={e=>toggleStemSelect(stem.id,e)}
                    style={{...C.card,position:'relative' as const,borderColor:stem.muted?'rgba(248,113,113,0.4)':isSel?'rgba(192,38,211,0.6)':'rgba(192,38,211,0.15)',boxShadow:isSel?'0 0 10px rgba(192,38,211,0.25)':'none',cursor:'pointer',transition:'all 0.15s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'8px'}}>
                      <span style={{fontSize:'16px',flexShrink:0}}>{stem.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:'10px',fontWeight:700,color:'#F8F0FF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{stem.name.replace(/\.[^.]+$/,'').toUpperCase()}</div>
                        <div style={{fontSize:'9px',color:'#9B7EC8'}}>{stem.instrument}</div>
                      </div>
                      <button onClick={e=>{e.stopPropagation();toggleStemMute(stem.id);}}
                        style={{width:'24px',height:'24px',borderRadius:'6px',flexShrink:0,background:stem.muted?'rgba(248,113,113,0.2)':'rgba(192,38,211,0.15)',border:stem.muted?'1px solid rgba(248,113,113,0.5)':'1px solid rgba(192,38,211,0.2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <i className={stem.muted?'ri-volume-mute-line':'ri-volume-up-line'} style={{color:stem.muted?'#f87171':'#C026D3',fontSize:'11px'}}></i>
                      </button>
                    </div>
                    <div style={{background:'rgba(8,4,16,0.88)',borderRadius:'6px',height:'24px',overflow:'hidden',border:'1px solid rgba(192,38,211,0.08)',marginBottom:'8px',opacity:stem.muted?0.3:1}}>
                      <canvas width={200} height={28} style={{width:'100%',height:'100%',display:'block'}}
                        ref={c=>{if(c&&stem.fftData) drawMiniFFT(c,stem.fftData,stem.muted?'#666':'#C026D3');}}/>
                    </div>
                    <div style={{marginBottom:'6px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',marginBottom:'3px',alignItems:'center'}}>
                        <span style={{color:'#9B7EC8'}}>Vol</span>
                        {editingVolumeId===stem.id?(
                          <input type="number" min="-60" max="12" step="0.1" value={editingVolumeVal}
                            onChange={e=>setEditingVolumeVal(e.target.value)}
                            onBlur={()=>commitEditVolume(stem.id)}
                            onKeyDown={e=>{if(e.key==='Enter')commitEditVolume(stem.id);if(e.key==='Escape')setEditingVolumeId(null);}}
                            onClick={e=>e.stopPropagation()} autoFocus
                            style={{width:'50px',background:'rgba(192,38,211,0.15)',border:'1px solid #C026D3',borderRadius:'4px',color:'#F8F0FF',fontSize:'10px',padding:'1px 4px',fontFamily:'monospace',textAlign:'right'}}/>
                        ):(
                          <span onClick={e=>{e.stopPropagation();startEditVolume(stem);}}
                            style={{...C.mono,color:'#C026D3',fontWeight:500,cursor:'text',borderBottom:'1px dashed rgba(192,38,211,0.3)',paddingBottom:'1px'}}>
                            {stem.volume>0?'+':''}{stem.volume.toFixed(1)} dB
                          </span>
                        )}
                      </div>
                      <div style={C.track}>
                        <div style={C.trackFill(((stem.volume+60)/72)*100)}></div>
                        <input type="range" min="-60" max="12" step="0.1" value={stem.volume}
                          onChange={e=>{e.stopPropagation();updateStemVolume(stem.id,parseFloat(e.target.value));}}
                          onClick={e=>e.stopPropagation()}
                          style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}}/>
                      </div>
                    </div>
                    <div style={{marginBottom:'8px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',marginBottom:'3px'}}>
                        <span style={{color:'#9B7EC8'}}>Pan</span>
                        <span style={{...C.mono,color:'#C026D3',fontWeight:500}}>{stem.pan===0?'C':stem.pan>0?`R${(stem.pan*100).toFixed(0)}`:`L${(Math.abs(stem.pan)*100).toFixed(0)}`}</span>
                      </div>
                      <div style={C.track}>
                        <div style={C.trackFill(((stem.pan+1)/2)*100)}></div>
                        <input type="range" min="-1" max="1" step="0.01" value={stem.pan}
                          onChange={e=>{e.stopPropagation();updateStemPan(stem.id,parseFloat(e.target.value));}}
                          onClick={e=>e.stopPropagation()}
                          style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}}/>
                      </div>
                    </div>
                    <div onClick={e=>e.stopPropagation()}>
                      <button onClick={e=>{e.stopPropagation();setOpenStemPresetId(openStemPresetId===stem.id?null:stem.id);}}
                        style={{width:'100%',background:stem.stemPresetId?`${PRESETS.find(p=>p.id===stem.stemPresetId)?.color}18`:'rgba(255,255,255,0.04)',border:`1px solid ${stem.stemPresetId?PRESETS.find(p=>p.id===stem.stemPresetId)?.color+'44':'rgba(255,255,255,0.08)'}`,borderRadius:'7px',padding:'5px 8px',color:stem.stemPresetId?PRESETS.find(p=>p.id===stem.stemPresetId)?.color:'#9B7EC8',fontSize:'10px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <span>{stem.stemPresetId?`✦ ${PRESETS.find(p=>p.id===stem.stemPresetId)?.name}`:'+ Preset EQ'}</span>
                        <span style={{fontSize:'9px',opacity:0.6}}>{openStemPresetId===stem.id?'▲':'▼'}</span>
                      </button>
                      {openStemPresetId===stem.id&&(
                        <div style={{position:'absolute',zIndex:50,background:'rgba(15,10,26,0.98)',border:'1px solid rgba(192,38,211,0.3)',borderRadius:'12px',padding:'10px',width:'220px',boxShadow:'0 8px 32px rgba(0,0,0,0.6)',marginTop:'4px'}}>
                          <div style={{fontSize:'10px',fontWeight:700,color:'#9B7EC8',marginBottom:'8px',letterSpacing:'0.5px',textTransform:'uppercase'}}>Preset EQ para este stem</div>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'5px',marginBottom:'8px'}}>
                            {PRESETS.map(p=>(
                              <button key={p.id} onClick={()=>applyStemPreset(stem,p)}
                                style={{padding:'6px 8px',borderRadius:'7px',border:`1px solid ${p.color}44`,background:stem.stemPresetId===p.id?`${p.color}22`:'rgba(8,4,16,0.6)',color:stem.stemPresetId===p.id?p.color:'#C9B8F0',fontSize:'10px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:'5px',textAlign:'left'}}>
                                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:p.color,flexShrink:0}}></div>{p.name}
                              </button>
                            ))}
                          </div>
                          {stem.stemPresetId&&(
                            <button onClick={()=>clearStemPreset(stem)}
                              style={{width:'100%',padding:'5px',borderRadius:'6px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',color:'#f87171',fontSize:'10px',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                              ✕ Quitar preset
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showUpgradeModal&&(
        <UpgradeModal trigger="export" onClose={()=>setShowUpgradeModal(false)}
          user={(()=>{try{const u=localStorage.getItem('audioMixerUser');return u?JSON.parse(u):null;}catch{return null;}})()}
          onSuccess={()=>setShowUpgradeModal(false)}/>
      )}
      {showPaywall&&(
        <PaywallModal onClose={()=>setShowPaywall(false)} onSuccess={()=>{setShowPaywall(false);handleExportMix();}}/>
      )}
      <UploadModal isOpen={showUploadModal} onClose={()=>setShowUploadModal(false)}
        onUploadComplete={handleUploadMoreStems} userCredits={user.credits} onCreditsUpdate={onCreditsUpdate}/>
    </div>
  );
}
