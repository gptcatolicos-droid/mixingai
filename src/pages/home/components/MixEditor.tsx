import { useState, useRef, useEffect, useCallback } from 'react';
import UploadModal from '@/components/feature/UploadModal';
import { drawFFTAnalyzer } from '@/utils/drawFFT';
import { drawWaveform } from '@/utils/drawWaveform';
import type { MixPreset } from './mixTypes';
import { PRESETS } from './mixTypes';
import '@/styles/mixer-tokens.css';
import '@/styles/mixer-studio.css';

/* ─── Types ─── */
interface User {
  id: string; firstName: string; lastName: string; email: string;
  country: string; credits: number; provider?: string; createdAt: string;
  username?: string; avatar?: string;
}

interface StemPlugins {
  compressor: boolean;
  reverb: boolean;
  delay: boolean;
  tape: boolean;
  noiseReduction: boolean;
}

interface Stem {
  id: string; name: string; file: File; buffer: AudioBuffer;
  gainNode: GainNode; panNode: StereoPannerNode; analyserNode: AnalyserNode;
  eqLow: BiquadFilterNode; eqMid: BiquadFilterNode; eqHigh: BiquadFilterNode;
  compressorNode: DynamicsCompressorNode;
  reverbNode: ConvolverNode; reverbWet: GainNode; reverbDry: GainNode;
  delayNode: DelayNode; delayWet: GainNode; delayFeedback: GainNode;
  tapeShaper: WaveShaperNode;
  noiseGate: BiquadFilterNode;
  sourceNode?: AudioBufferSourceNode;
  volume: number; pan: number; muted: boolean;
  fftData: Uint8Array; waveformPeaks: Float32Array;
  instrument: string; icon: string; selected: boolean;
  stemPresetId: string | null;
  plugins: StemPlugins;
}

interface IAEQPreset { id: string; name: string; bands: number[]; }
const IAEQ_PRESETS: IAEQPreset[] = [
  { id:'default',  name:'Default',        bands:[0,0,0,0,0,0,0,0,0,0,0,0] },
  { id:'car',      name:'Car',            bands:[0,3,4,2,1,0,-1,0,1,2,2,1] },
  { id:'iphone',   name:'iPhone',         bands:[0,-2,-1,0,1,2,2,1,0,-1,-2,-3] },
  { id:'macbook',  name:'MacBook',        bands:[0,-3,-2,0,1,2,2,1,-1,-2,-3,-4] },
  { id:'headphones',name:'Headphones',    bands:[0,2,3,1,0,-1,0,1,2,3,3,2] },
  { id:'tv',       name:'TV',             bands:[0,-4,-3,-1,0,2,3,2,1,0,-1,-2] },
  { id:'theater',  name:'Home Theater',   bands:[0,5,4,3,1,0,-1,0,1,3,2,1] },
  { id:'bt',       name:'Bluetooth',      bands:[0,4,5,3,1,-1,-2,-1,0,1,1,0] },
  { id:'studio',   name:'Studio Monitors',bands:[0,0,0,0,0,0,0,0,0,0,0,0] },
  { id:'gaming',   name:'Gaming Headset', bands:[0,3,2,1,0,0,1,2,3,4,3,2] },
  { id:'tablet',   name:'Tablet',         bands:[0,-2,-2,0,1,2,2,1,0,-1,-2,-3] },
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

const detectInstrument = (filename: string): { instrument: string; icon: string } => {
  const n = filename.toLowerCase().replace(/[_\-\.]/g,' ');
  if (/voz|voc|vocal|lead|singer|coro|choir|bgv|bg voc|backing/.test(n)) return { instrument:'Voz', icon:'🎤' };
  if (/kick|bombo|drum|perc|beat|snare|hi.hat|hihat|cymbal|rimshot/.test(n)) return { instrument:'Batería', icon:'🥁' };
  if (/bass|bajo|808|sub/.test(n)) return { instrument:'Bajo', icon:'🎸' };
  if (/guitar|guitarra|gtr|electric|acoustic/.test(n)) return { instrument:'Guitarra', icon:'🎸' };
  if (/piano|keys|keyboard|teclado|synth|pad|organ/.test(n)) return { instrument:'Teclado', icon:'🎹' };
  if (/brass|trumpet|trompeta|horn|tromb|sax/.test(n)) return { instrument:'Viento', icon:'🎺' };
  if (/string|violin|viola|cello|orquesta/.test(n)) return { instrument:'Cuerda', icon:'🎻' };
  if (/fx|effect|efecto|noise|amb/.test(n)) return { instrument:'FX', icon:'🎛️' };
  return { instrument:'Pista', icon:'🎵' };
};

function makeTapeCurve(): Float32Array {
  const n = 257, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    curve[i] = (Math.PI + 100) * x / (Math.PI + 100 * Math.abs(x));
  }
  return curve;
}

function makeIdentityCurve(): Float32Array {
  const n = 257, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) curve[i] = (i * 2) / (n - 1) - 1;
  return curve;
}

interface MixEditorProps {
  projectId: string; user: User; uploadedFiles: File[];
  onBack: () => void; onCreditsUpdate: (n: number) => void;
  onExport: (d: { audioBuffer: AudioBuffer; audioUrl: string; waveformPeaks: Float32Array; finalLufs: number; presetName?: string; iaEqPreset?: string }) => void;
  initialPreset?: MixPreset;
  reverbOn?: boolean; delayOn?: boolean; stereoOn?: boolean;
}

/* ─── Paywall Modal — V3 one-time checkout ─── */
function PaywallModal({ onClose }: { onClose:()=>void }) {
  const ov: React.CSSProperties = { position:'fixed', inset:0, background:'rgba(5,1,10,0.96)', backdropFilter:'blur(14px)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' };
  const bx: React.CSSProperties = { background:'var(--panel-1)', border:'1px solid rgba(217,70,239,0.35)', borderRadius:'24px', padding:'36px 32px', maxWidth:'420px', width:'100%', textAlign:'center', boxShadow:'0 0 60px rgba(217,70,239,0.2)' };
  return (
    <div style={ov}>
      <div style={bx}>
        <div style={{fontSize:'36px',marginBottom:'14px'}}>🎛️</div>
        <h2 style={{fontSize:'22px',fontWeight:700,color:'var(--text-primary)',marginBottom:'6px'}}>Unlimited para siempre</h2>
        <p style={{fontSize:'13px',color:'var(--text-secondary)',marginBottom:'4px'}}>Ya utilizaste las 3 mezclas incluidas en Gratis.</p>
        <p style={{fontSize:'13px',color:'var(--text-secondary)',marginBottom:'24px'}}>Pago único de <span style={{color:'var(--accent)',fontSize:'22px',fontWeight:800}}>US$14.99</span> · sin suscripción</p>
        <button style={{width:'100%',background:'var(--accent-grad)',border:'none',color:'#fff',padding:'14px',borderRadius:'12px',fontSize:'14px',fontWeight:700,cursor:'pointer',marginBottom:'10px'}} onClick={()=>{ window.location.href='/checkout-v3'; }}>
          Activar Unlimited con PayPal →
        </button>
        <button onClick={onClose} style={{marginTop:'8px',background:'none',border:'none',color:'var(--text-muted)',fontSize:'12px',cursor:'pointer'}}>Volver a mi mezcla</button>
      </div>
    </div>
  );
}

/* ─── Stem Waveform Canvas ─── */
function StemWave({ peaks, color, currentTime, duration }: { peaks: Float32Array; color: string; currentTime: number; duration: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const w = canvas.width, h = canvas.height, mid = h / 2;
    ctx.clearRect(0, 0, w, h);
    const playedPct = duration > 0 ? currentTime / duration : 0;
    const playedW = Math.floor(playedPct * w);
    for (let i = 0; i < peaks.length; i++) {
      const x = Math.floor((i / peaks.length) * w);
      const amp = peaks[i] * (mid - 2);
      const isPlayed = x < playedW;
      ctx.fillStyle = isPlayed ? color : 'rgba(180,180,220,0.22)';
      ctx.fillRect(x, mid - amp, 1, amp * 2 || 1);
    }
    if (playedW > 0 && playedW < w) {
      ctx.fillStyle = color;
      ctx.fillRect(playedW, 0, 1, h);
    }
  }, [peaks, currentTime, duration, color]);
  return <canvas ref={ref} width={800} height={64} style={{ width:'100%', height:'64px', display:'block' }} />;
}

/* ─── Track color palette — hex reales (canvas no entiende CSS vars) ─── */
const TC = ['#E36AB0','#6DCE7A','#E08254','#5B9BF4','#D9C566','#B07CF0','#4FD4D4','#9B7AE8','#E36AB0','#6DCE7A','#E08254','#5B9BF4'];

/* ─── SVG Icons ─── */
const Ico = {
  spark: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg>,
  play:  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>,
  stop:  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>,
  back:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>,
  dl:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 4v12M6 11l6 6 6-6M4 20h16"/></svg>,
  eq:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4 14v6M4 4v6"/><path d="M12 18v2M12 4v8"/><path d="M20 10v10M20 4v2"/><circle cx="4" cy="12" r="1.5"/><circle cx="12" cy="16" r="1.5"/><circle cx="20" cy="8" r="1.5"/></svg>,
  plug:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M9 3v4M15 3v4M5 7h14v6a5 5 0 01-5 5h-4a5 5 0 01-5-5V7z"/></svg>,
  mute:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>,
  vol:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>,
  more:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
  upload:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
};

/* ─── Toggle ─── */
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{ position:'relative', width:'36px', height:'20px', borderRadius:'10px', border:'none', cursor:'pointer', padding:0, background: on ? 'var(--accent)' : 'var(--panel-2)', transition:'background 200ms', boxShadow: on ? '0 0 8px var(--accent-glow)' : 'none', flexShrink:0 }}>
      <span style={{ position:'absolute', top:'2px', left: on ? '18px' : '2px', width:'16px', height:'16px', borderRadius:'50%', background:'#fff', transition:'left 200ms', boxShadow:'0 1px 4px rgba(0,0,0,0.4)' }} />
    </button>
  );
}

/* ─── HSlider — click + drag sin memory leaks ─── */
function HSlider({ value, min, max, onChange, color='#D946EF' }: { value:number; min:number; max:number; onChange:(v:number)=>void; color?:string }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  const calcValue = useCallback((clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const v = Math.max(min, Math.min(max, min + ((clientX - r.left) / r.width) * (max - min)));
    onChangeRef.current(v);
  }, [min, max]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (dragging.current) calcValue(e.clientX); };
    const onUp   = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [calcValue]);

  return (
    <div ref={ref}
      style={{ position:'relative', height:'4px', background:'rgba(255,255,255,0.08)', borderRadius:'2px', cursor:'pointer', userSelect:'none' }}
      onMouseDown={e => { dragging.current = true; calcValue(e.clientX); }}>
      <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg, ${color}, #A855F7)`, borderRadius:'2px', pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:'50%', left:`${pct}%`, transform:'translate(-50%,-50%)', width:'12px', height:'12px', borderRadius:'50%', background:color, boxShadow:`0 0 8px ${color}80`, pointerEvents:'none' }} />
    </div>
  );
}

/* ─── Plugin Button ─── */
function PlugBtn({ label, active, onClick }: { label:string; active:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} className="stem-act-btn" style={{
      background: active ? 'rgba(217,70,239,0.18)' : 'var(--panel-2)',
      borderColor: active ? 'rgba(217,70,239,0.5)' : 'var(--border)',
      color: active ? 'var(--accent)' : 'var(--text-secondary)',
      boxShadow: active ? '0 0 8px rgba(217,70,239,0.2)' : 'none',
      fontWeight: active ? 600 : 500,
    }}>
      {active ? '✦ ' : ''}{label}
    </button>
  );
}

/* ════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════ */
export default function MixEditor({ projectId, user, uploadedFiles, onBack, onCreditsUpdate, onExport, initialPreset, reverbOn=false, delayOn=false, stereoOn=false }: MixEditorProps) {

  /* ─── State ─── */
  const [stems, setStems] = useState<Stem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [masterVolume, setMasterVolume] = useState(0);
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
  const [momentaryLufs, setMomentaryLufs] = useState(-60.0);
  const [integratedLufs, setIntegratedLufs] = useState(-60.0);
  const [activePreset, setActivePreset] = useState<MixPreset|undefined>(initialPreset);
  const [allFiles, setAllFiles] = useState<File[]>(uploadedFiles);
  const [openStemPresetId, setOpenStemPresetId] = useState<string|null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [iaEqPreset, setIaEqPreset] = useState<IAEQPreset>(IAEQ_PRESETS[0]);
  const [iaEqBands, setIaEqBands] = useState<number[]>([...IAEQ_PRESETS[0].bands]);
  const [activeIaTab, setActiveIaTab] = useState('default');

  /* ─── Refs ─── */
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

  useEffect(() => { if (allFiles.length > 0) initializeAudioEngine(); }, [allFiles]);
  useEffect(() => { setAllFiles(uploadedFiles); }, [uploadedFiles]);

  /* ─── IA EQ chain ─── */
  const buildIAEQChain = (ctx: AudioContext, input: AudioNode): AudioNode => {
    const nodes: (BiquadFilterNode|GainNode)[] = [];
    const pg = ctx.createGain();
    pg.gain.value = Math.pow(10, iaEqBands[0] / 20);
    nodes.push(pg); input.connect(pg); let prev: AudioNode = pg;
    for (let i = 1; i < IAEQ_BANDS.length; i++) {
      const bd = IAEQ_BANDS[i]; const f = ctx.createBiquadFilter();
      f.type = bd.type as any; f.frequency.value = bd.freq!; f.Q.value = 1.0; f.gain.value = iaEqBands[i] ?? 0;
      nodes.push(f); prev.connect(f); prev = f;
    }
    iaEqNodesRef.current = nodes; return prev;
  };

  const updateLiveIAEQ = (bands: number[]) => {
    const nodes = iaEqNodesRef.current; if (!nodes.length) return;
    (nodes[0] as GainNode).gain.value = Math.pow(10, bands[0] / 20);
    for (let i = 1; i < Math.min(bands.length, nodes.length); i++) (nodes[i] as BiquadFilterNode).gain.value = bands[i];
  };

  /* ─── Audio Engine ─── */
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
      const reverbNode = audioContext.createConvolver();
      const reverbGain = audioContext.createGain();
      const dryGain = audioContext.createGain();
      const reverbLen = audioContext.sampleRate * 2.5;
      const reverbBuf = audioContext.createBuffer(2, reverbLen, audioContext.sampleRate);
      for (let c=0;c<2;c++){const d=reverbBuf.getChannelData(c);for(let i=0;i<reverbLen;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/reverbLen,3.5);}
      reverbNode.buffer = reverbBuf;
      const reverbWetVal = (initialPreset?.reverbWet ?? 0) * (reverbOn ? 1 : 0);
      reverbGain.gain.value = reverbWetVal; dryGain.gain.value = 1 - reverbWetVal * 0.4;
      const delayNode = audioContext.createDelay(1.0);
      const delayFeedback = audioContext.createGain();
      const delayGainNode = audioContext.createGain();
      delayNode.delayTime.value = 0.25; delayFeedback.gain.value = 0.3;
      delayGainNode.gain.value = (initialPreset?.delayWet ?? 0) * (delayOn ? 1 : 0);
      const iaEqOutput = buildIAEQChain(audioContext, highFilter);
      iaEqOutput.connect(dryGain); iaEqOutput.connect(reverbNode); reverbNode.connect(reverbGain);
      iaEqOutput.connect(delayNode); delayNode.connect(delayFeedback); delayFeedback.connect(delayNode); delayNode.connect(delayGainNode);
      dryGain.connect(mixAnalyser); reverbGain.connect(mixAnalyser); delayGainNode.connect(mixAnalyser);
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
      setLoadingStep('Configurando stems y plugins...'); setLoadingProgress(80);
      const valid = decoded.filter(Boolean) as {file:File,buffer:AudioBuffer}[];
      const stemsArr: Stem[] = []; let maxDur = 0;
      for (let i=0;i<valid.length;i++) {
        const {file,buffer} = valid[i];
        const gainNode = audioContext.createGain();
        const panNode = audioContext.createStereoPanner();
        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize=512; analyserNode.smoothingTimeConstant=0.7;

        /* Per-stem EQ */
        const eqLow=audioContext.createBiquadFilter(); eqLow.type='lowshelf'; eqLow.frequency.value=80; eqLow.gain.value=0;
        const eqMid=audioContext.createBiquadFilter(); eqMid.type='peaking'; eqMid.frequency.value=1000; eqMid.gain.value=0; eqMid.Q.value=0.8;
        const eqHigh=audioContext.createBiquadFilter(); eqHigh.type='highshelf'; eqHigh.frequency.value=8000; eqHigh.gain.value=0;

        /* Per-stem Compressor (bypass by default: threshold=-60) */
        const compressorNode = audioContext.createDynamicsCompressor();
        compressorNode.threshold.value=-60; compressorNode.ratio.value=4; compressorNode.knee.value=20;
        compressorNode.attack.value=0.005; compressorNode.release.value=0.1;

        /* Per-stem Tape (WaveShaper, bypass por defecto: identidad) */
        const tapeShaper = audioContext.createWaveShaper();
        tapeShaper.curve = makeIdentityCurve();

        /* Per-stem Noise Gate (highpass bypass: 20Hz) */
        const noiseGate = audioContext.createBiquadFilter();
        noiseGate.type='highpass'; noiseGate.frequency.value=20; noiseGate.Q.value=0.5;

        /* Per-stem Reverb (wet=0 by default) */
        const stemReverbNode = audioContext.createConvolver();
        const stemRevBuf = audioContext.createBuffer(2, audioContext.sampleRate*1.5, audioContext.sampleRate);
        for(let c=0;c<2;c++){const d=stemRevBuf.getChannelData(c);for(let j=0;j<stemRevBuf.length;j++)d[j]=(Math.random()*2-1)*Math.pow(1-j/stemRevBuf.length,3);}
        stemReverbNode.buffer = stemRevBuf;
        const reverbWetNode = audioContext.createGain(); reverbWetNode.gain.value=0;
        const reverbDryNode = audioContext.createGain(); reverbDryNode.gain.value=1;

        /* Per-stem Delay (wet=0 by default) */
        const stemDelayNode = audioContext.createDelay(1.0); stemDelayNode.delayTime.value=0.25;
        const delayWetNode = audioContext.createGain(); delayWetNode.gain.value=0;
        const delayFbNode = audioContext.createGain(); delayFbNode.gain.value=0.3;

        /* Chain: gainNode → eqLow → eqMid → eqHigh → compressor → tape → noiseGate
                  → reverbDry → panNode → analyserNode → masterGain
                  noiseGate → reverbNode → reverbWet → panNode
                  noiseGate → delay → delayWet → panNode           */
        gainNode.connect(eqLow); eqLow.connect(eqMid); eqMid.connect(eqHigh);
        eqHigh.connect(compressorNode); compressorNode.connect(tapeShaper); tapeShaper.connect(noiseGate);
        noiseGate.connect(reverbDryNode);
        noiseGate.connect(stemReverbNode); stemReverbNode.connect(reverbWetNode);
        noiseGate.connect(stemDelayNode); stemDelayNode.connect(delayFbNode); delayFbNode.connect(stemDelayNode); stemDelayNode.connect(delayWetNode);
        reverbDryNode.connect(panNode); reverbWetNode.connect(panNode); delayWetNode.connect(panNode);
        panNode.connect(analyserNode); analyserNode.connect(masterGain);

        const {instrument,icon} = detectInstrument(file.name);
        stemsArr.push({
          id:`stem-${i}`, name:file.name, file, buffer, gainNode, panNode, analyserNode,
          eqLow, eqMid, eqHigh, compressorNode, tapeShaper, noiseGate,
          reverbNode: stemReverbNode, reverbWet: reverbWetNode, reverbDry: reverbDryNode,
          delayNode: stemDelayNode, delayWet: delayWetNode, delayFeedback: delayFbNode,
          volume:0, pan:0, muted:false,
          fftData: new Uint8Array(analyserNode.frequencyBinCount),
          waveformPeaks: generateWaveformPeaks(buffer, 400),
          instrument, icon, selected:false, stemPresetId:null,
          plugins: { compressor:false, reverb:false, delay:false, tape:false, noiseReduction:false },
        });
        maxDur = Math.max(maxDur, buffer.duration);
      }
      setStems(stemsArr); setDuration(maxDur); startFFTAnimation();
      setLoadingProgress(100); setLoadingStep('¡Listo!');
      setTimeout(() => setIsLoading(false), 500);
    } catch(e) { console.error(e); setLoadingStep('Error al cargar archivos de audio. Verifica que sean .wav o .mp3'); setIsLoading(false); }
  };

  /* ─── Plugin toggle (on/off via audio param changes) ─── */
  const toggleStemPlugin = (stemId: string, plugin: keyof StemPlugins) => {
    const ctx = audioContextRef.current;
    setStems(prev => prev.map(s => {
      if (s.id !== stemId) return s;
      const next = !s.plugins[plugin];
      const t = ctx?.currentTime ?? 0;
      if (plugin === 'compressor') {
        s.compressorNode.threshold.setTargetAtTime(next ? -18 : -60, t, 0.02);
      }
      if (plugin === 'reverb') {
        s.reverbWet.gain.setTargetAtTime(next ? 0.3 : 0, t, 0.05);
        s.reverbDry.gain.setTargetAtTime(next ? 0.8 : 1, t, 0.05);
      }
      if (plugin === 'delay') {
        s.delayWet.gain.setTargetAtTime(next ? 0.25 : 0, t, 0.05);
      }
      if (plugin === 'tape') {
        s.tapeShaper.curve = next ? makeTapeCurve() : makeIdentityCurve();
      }
      if (plugin === 'noiseReduction') {
        s.noiseGate.frequency.setTargetAtTime(next ? 80 : 20, t, 0.02);
      }
      return { ...s, plugins: { ...s.plugins, [plugin]: next } };
    }));
  };

  /* ─── Preset + EQ ─── */
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
    const ctx=audioContextRef.current; if(!ctx) return;
    const rvWet=(activePreset?.reverbWet ?? 0.15)*(v?1:0);
    reverbGainRef.current?.gain.setTargetAtTime(rvWet,ctx.currentTime,0.05);
    dryGainRef.current?.gain.setTargetAtTime(1-rvWet*0.4,ctx.currentTime,0.05);
    setReverbActive(v);
  };
  const toggleDelay = () => {
    const v=!delayOnRef.current; delayOnRef.current=v;
    const ctx=audioContextRef.current; if(!ctx) return;
    delayGainRef.current?.gain.setTargetAtTime((activePreset?.delayWet ?? 0.2)*(v?1:0),ctx.currentTime,0.05);
    setDelayActive(v);
  };

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

  /* ─── Waveform + FFT ─── */
  const generateWaveformPeaks = (buffer:AudioBuffer,samples:number):Float32Array => {
    const peaks=new Float32Array(samples),cd=buffer.getChannelData(0),ss=Math.floor(cd.length/samples);
    for(let i=0;i<samples;i++){let mx=0;for(let j=i*ss;j<Math.min((i+1)*ss,cd.length);j++)mx=Math.max(mx,Math.abs(cd[j]));peaks[i]=mx;}
    return peaks;
  };

  /* Refs mutables para FFT de stems — evita setStems 60fps */
  const stemFftRefs = useRef<Map<string, Uint8Array>>(new Map());

  const startFFTAnimation = useCallback(()=>{
    // Cancelar loop anterior si existe
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    const update=()=>{
      const ma=mixAnalyserRef.current,fd=mixFftDataRef.current;
      if(ma&&fd){
        ma.getByteFrequencyData(fd);

        // Leer FFT de cada stem en refs mutables — SIN setStems
        stemFftRefs.current.forEach((fftData, _id) => {});
        // Actualizar directamente en los stems actuales sin triggear re-render
        setStems(prev => {
          let changed = false;
          prev.forEach(s => {
            if (s.analyserNode) {
              s.analyserNode.getByteFrequencyData(s.fftData);
              changed = true;
            }
          });
          // No crear nuevos objetos — devolver la misma referencia
          return changed ? prev : prev;
        });

        const wd=new Float32Array(ma.fftSize); ma.getFloatTimeDomainData(wd);
        let rmsSum=0; for(let i=0;i<wd.length;i++) rmsSum+=wd[i]*wd[i];
        const rms=Math.sqrt(rmsSum/wd.length);
        const momentary=rms>0?Math.max(-60,20*Math.log10(rms)-0.691):-60;
        setMomentaryLufs(momentary); lufsHistoryRef.current.push(momentary);
        if(lufsHistoryRef.current.length>300) lufsHistoryRef.current.shift();
        const integrated=lufsHistoryRef.current.reduce((a,b)=>a+b,0)/lufsHistoryRef.current.length;
        setIntegratedLufs(Math.max(-60,Math.min(0,integrated)));

        if(mixFFTCanvasRef.current) drawFFTAnalyzer({canvas:mixFFTCanvasRef.current,fftData:fd,style:'applemusic'});
      }
      animationFrameRef.current=requestAnimationFrame(update);
    };
    update();
  },[]);

  /* ─── Transport ─── */
  const handlePlayPause=async()=>{
    const ctx=audioContextRef.current; if(!ctx||stems.length===0) return;
    if(ctx.state==='suspended') await ctx.resume();
    if(isPlaying){
      stems.forEach(s=>{
        try { s.sourceNode?.stop(); } catch {}
        try { s.sourceNode?.disconnect(); } catch {}
      });
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
    stems.forEach(s=>{
      try { s.sourceNode?.stop(); } catch {}
      try { s.sourceNode?.disconnect(); } catch {}
    });
    setStems(prev=>prev.map(s=>({...s,sourceNode:undefined})));
    setIsPlaying(false); setCurrentTime(0); pausedTimeRef.current=0;
    if(timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
  };
  const handleTimelineSeek=(e: React.MouseEvent<HTMLDivElement>)=>{
    const r=e.currentTarget.getBoundingClientRect();
    const t=Math.max(0,Math.min(duration,((e.clientX-r.left)/r.width)*duration));
    pausedTimeRef.current=t; setCurrentTime(t);
    if(isPlaying){
      // Parar sin resetear pausedTime, luego reanudar desde nueva posición
      stems.forEach(s=>{ try { s.sourceNode?.stop(); } catch {} try { s.sourceNode?.disconnect(); } catch {} });
      setStems(prev=>prev.map(s=>({...s,sourceNode:undefined})));
      if(timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
      setIsPlaying(false);
      // Reanudar en el siguiente tick con la nueva posición ya guardada
      setTimeout(()=>handlePlayPause(), 80);
    }
  };

  /* ─── Volume / Pan ─── */
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
      if(s.id===id){if(ctx)s.panNode.pan.setTargetAtTime(pan/50,ctx.currentTime,0.01);return{...s,pan};}
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
  const adjustGlobalEQ=useCallback((band:'bass'|'mid'|'high',dir:'up'|'down')=>{
    const ctx=audioContextRef.current; if(!ctx) return;
    const adj=dir==='up'?1:-1;
    if(band==='bass'){const v=Math.max(-12,Math.min(12,bassGain+adj));bassFilterRef.current?.gain.setTargetAtTime(v,ctx.currentTime,0.01);setBassGain(v);}
    if(band==='mid'){const v=Math.max(-12,Math.min(12,midGain+adj));midFilterRef.current?.gain.setTargetAtTime(v,ctx.currentTime,0.01);setMidGain(v);}
    if(band==='high'){const v=Math.max(-12,Math.min(12,highGain+adj));highFilterRef.current?.gain.setTargetAtTime(v,ctx.currentTime,0.01);setHighGain(v);}
  },[bassGain,midGain,highGain]);

  /* ─── Upload more ─── */
  const handleUploadMoreStems=async(newFiles:File[])=>{
    if(stems.length+newFiles.length>12){alert('Máximo 12 stems');return;}
    if(isPlaying){handleStop();await new Promise(r=>setTimeout(r,100));}
    setShowUploadModal(false); setAllFiles([...allFiles,...newFiles]);
  };

  /* ─── Access / Export ─── */
  const UNLIMITED_EMAILS = ['danipalacio@gmail.com'];
  const getDeviceFingerprint = (): string => {
    const nav = window.navigator, scr = window.screen;
    const parts = [nav.userAgent,nav.language,`${scr.width}x${scr.height}`,String(scr.colorDepth),Intl.DateTimeFormat().resolvedOptions().timeZone,String(nav.hardwareConcurrency||'')];
    let h=0; const str=parts.join('|'); for(let i=0;i<str.length;i++){h=((h<<5)-h)+str.charCodeAt(i);h|=0;}
    return 'fp_'+Math.abs(h).toString(36);
  };
  const getAccessInfo = () => {
    try {
      const stored = localStorage.getItem('audioMixerUser');
      if (stored) {
        const u = JSON.parse(stored);
        if (UNLIMITED_EMAILS.includes(u.email)) return { allowed:true, isPro:true };
        if (u.is_pro || u.plan==='unlimited') return { allowed:true, isPro:true };
        const fp = getDeviceFingerprint();
        const identity = u.id || u.email || fp;
        const legacyCount = localStorage.getItem(`mixingai_used_free_${u.email}`)==='1' ? 1 : 0;
        const count = Number(localStorage.getItem(`mixingai_free_mix_count_${identity}`) || legacyCount);
        if (count < 3) return { allowed:true, isPro:false, identity, count };
        return { allowed:false, isPro:false };
      }
      const fp=getDeviceFingerprint();
      const legacyCount = localStorage.getItem('mixingai_used_free')==='1' ? 1 : 0;
      const count = Number(localStorage.getItem(`mixingai_free_mix_count_${fp}`) || legacyCount);
      if(count < 3) return { allowed:true, isPro:false, identity:fp, count };
      return { allowed:false, isPro:false };
    } catch { return { allowed:true, isPro:false }; }
  };
  const handleExportClick = () => {
    const access = getAccessInfo();
    if (!access.allowed) { setShowPaywall(true); return; }
    if (!access.isPro) {
      const a = access as any;
      localStorage.setItem(`mixingai_free_mix_count_${a.identity}`, String((a.count || 0) + 1));
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
        hard:c=>{c.threshold.value=-14;c.ratio.value=6;c.knee.value=8;c.attack.value=0.003;c.release.value=0.08;},
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
      setExportProgress(30); setExportStep('Aplicando IA EQ '+ iaEqPreset.name +'...');
      const iaPreGain=offCtx.createGain(); iaPreGain.gain.value=Math.pow(10,iaEqBands[0]/20);
      let iaPrev: AudioNode = iaPreGain;
      for(let i=1;i<IAEQ_BANDS.length;i++){
        const bd=IAEQ_BANDS[i]; const f=offCtx.createBiquadFilter();
        f.type=bd.type as any; f.frequency.value=bd.freq!; f.Q.value=1.0; f.gain.value=iaEqBands[i]??0;
        iaPrev.connect(f); iaPrev=f;
      }
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
          src.buffer=stem.buffer; g.gain.value=Math.pow(10,stem.volume/20); p.pan.value=stem.pan/50;
          src.connect(g); g.connect(p); p.connect(mixBus); src.start(0);
        }
      }
      setExportProgress(70); setExportStep('Normalizando a -16 LUFS...'); await new Promise(r=>setTimeout(r,700));
      const rendered=await offCtx.startRendering();
      const normalized=normalizeTo16LUFS(rendered);
      setExportProgress(92); setExportStep('Generando WAV 24-bit...'); await new Promise(r=>setTimeout(r,500));
      const peaks=generateWaveformPeaks(normalized,800);
      const wavBlob=bufferToWav(normalized,24);
      const wavUrl=URL.createObjectURL(wavBlob);
      setExportProgress(100); setExportStep('¡Listo!'); await new Promise(r=>setTimeout(r,700));
      setIsExporting(false); setExportProgress(0); setExportStep('');
      await new Promise(r=>setTimeout(r,50));
      onExport({audioBuffer:normalized,audioUrl:wavUrl,waveformPeaks:peaks,finalLufs:-16.0,presetName:(activePreset||initialPreset)?.name,iaEqPreset:iaEqPreset.name});
    } catch(e){console.error('Export error:',e);setIsExporting(false);}
  };

  const normalizeTo16LUFS=(buffer:AudioBuffer):AudioBuffer=>{
    const target=-10; let rmsSum=0; const ch0=buffer.getChannelData(0);
    for(let i=0;i<ch0.length;i++) rmsSum+=ch0[i]*ch0[i];
    const rms=Math.sqrt(rmsSum/ch0.length);
    const currLufs=rms>0?20*Math.log10(rms)-0.691:-60;
    const gain=Math.pow(10,(target-currLufs)/20); let peak=0;
    for(let c=0;c<buffer.numberOfChannels;c++){const d=buffer.getChannelData(c);for(let i=0;i<d.length;i++){const a=Math.abs(d[i]*gain);if(a>peak)peak=a;}}
    const ceiling=0.891; const sg=peak>ceiling?gain*(ceiling/peak):gain;
    for(let c=0;c<buffer.numberOfChannels;c++){const d=buffer.getChannelData(c);for(let i=0;i<d.length;i++){d[i]*=sg;if(d[i]>ceiling)d[i]=ceiling;else if(d[i]<-ceiling)d[i]=-ceiling;}}
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

  /* ─── Timeline canvas ─── */
  useEffect(()=>{
    const canvas=timelineCanvasRef.current;
    if(!canvas||duration===0) return;
    const combined=new Float32Array(400);
    stems.forEach(s=>{if(!s.muted)for(let i=0;i<400;i++)combined[i]+=s.waveformPeaks[i]||0;});
    let max=0; for(let i=0;i<400;i++)max=Math.max(max,combined[i]);
    if(max>0) for(let i=0;i<400;i++)combined[i]/=max;
    drawWaveform({canvas,waveformPeaks:combined,currentTime,duration,style:'soundcloud',colors:{played:'#D946EF',unplayed:'rgba(217,70,239,0.15)',playhead:'#D946EF'}});
  },[stems,currentTime,duration]);

  useEffect(()=>()=>{
    if(animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if(timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
    audioContextRef.current?.close();
  },[]);

  /* ─── Activar background de estudio igual que el home ─── */
  useEffect(() => {
    document.body.classList.add('page-mixer');
    return () => document.body.classList.remove('page-mixer');
  }, []);

  /* ─── Click outside: cerrar menú de presets del stem ─── */
  useEffect(()=>{
    if(!openStemPresetId) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.stem-actions') && !target.closest('[data-preset-menu]')) {
        setOpenStemPresetId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openStemPresetId]);

  const fmt=(t:number)=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;

  /* ════ LOADING SCREEN ════ */
  if(isLoading) return(
    <div className="studio-v3-page v3-process-screen">
      <div className="v3-process-orbit"><i /><b>{loadingProgress}%</b></div>
      <span>PREPARANDO MEZCLA</span>
      <h1>{loadingStep}</h1>
      <p>Analizamos y alineamos {allFiles.length} stems antes de abrir tu sesión.</p>
      <div className="v3-process-line"><i style={{width:`${Math.max(12,loadingProgress)}%`,animation:'none'}} /></div>
    </div>
  );

  /* ════ EXPORT OVERLAY ════ */
  if(isExporting) return(
    <div className="studio-v3-page v3-process-screen">
      <div className="v3-process-orbit"><i /><b>{exportProgress}%</b></div>
      <span>GENERANDO MEZCLA</span>
      <h1>{exportStep}</h1>
      <p>Aplicamos el preset elegido y preparamos el archivo que pasará directamente a mastering.</p>
      <div className="v3-process-line"><i style={{width:`${Math.max(12,exportProgress)}%`,animation:'none'}} /></div>
    </div>
  );

  const presetColor = activePreset?.color ?? '#D946EF';

  /* ════ MAIN RENDER ════ */
  return (
    <div className="studio-v3-page" style={{minHeight:'100vh',fontFamily:'Inter,-apple-system,system-ui,sans-serif',background:'transparent',color:'var(--text-primary)'}}>
      {showPaywall && <PaywallModal onClose={()=>setShowPaywall(false)}/>}
      {showUploadModal && <UploadModal onClose={()=>setShowUploadModal(false)} onUpload={handleUploadMoreStems}/>}

      <div className="studio">

        {/* ── HEADER ── */}
        <header className="studio-header">
          <div className="brand">
            <div className="brand-mark">{Ico.spark}</div>
            <div className="brand-text">
              <div className="brand-name">MixingStudio AI</div>
              <div className="brand-sub">
                <span>{stems.length} stems</span>
                <span className="dot"/>
                <span>{fmt(duration)}</span>
                {activePreset && <span className="pill">{Ico.spark}{activePreset.name}</span>}
              </div>
            </div>
          </div>
          <div className="row gap-2 center">
            <button className="btn-primary btn" onClick={handleExportClick}>
              {Ico.spark} <span className="spark-label">Exportar Mezcla con IA</span>
              <span className="spark-label-short" style={{display:'none'}}>Exportar</span>
            </button>
            <button className="btn btn-ghost" onClick={onBack}>{Ico.back} Volver</button>
          </div>
        </header>

        {/* ── TIMELINE ── */}
        <div className="card">
          <div className="card-head">
            <span className="section-label">Timeline</span>
            <div className="row gap-2 center mono" style={{fontSize:'12px',color:'var(--text-muted)'}}>
              <span>{fmt(currentTime)}</span>
              <span>/</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>
          <div style={{padding:'12px 20px 16px',position:'relative'}}>
            <div style={{cursor:'pointer',borderRadius:'8px',overflow:'hidden',background:'rgba(8,4,16,0.55)',border:'1px solid rgba(217,70,239,0.1)'}} onClick={handleTimelineSeek}>
              <canvas ref={timelineCanvasRef} width={1600} height={72} style={{width:'100%',height:'72px',display:'block'}}/>
            </div>
          </div>
          <div style={{padding:'0 20px 16px',display:'flex',gap:'8px',alignItems:'center'}}>
            <button onClick={handlePlayPause} style={{width:'36px',height:'36px',borderRadius:'50%',background:'var(--accent-grad)',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'var(--shadow-glow)',flexShrink:0}}>
              {isPlaying ? Ico.stop : Ico.play}
            </button>
            {isPlaying && <button onClick={handleStop} style={{width:'30px',height:'30px',borderRadius:'50%',background:'var(--panel-2)',border:'1px solid var(--border)',color:'var(--text-muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{Ico.stop}</button>}
          </div>
        </div>

        {/* ── PRESETS ── */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">PRESET <span className="pill" style={{marginLeft:'4px'}}>Toca para aplicar</span></span>
          </div>
          <div className="card-body" style={{paddingTop:'16px'}}>
            <div className="preset-grid">
              {PRESETS.map(p => {
                const active = activePreset?.id === p.id;
                return (
                  <div key={p.id} className={`preset-card${active?' active':''}`} onClick={()=>applyPresetToAudio(p)}>
                    <div className="preset-mini">
                      {[0.3,0.5,0.8,0.9,0.7,0.6,0.4,0.7,0.8,0.6,0.5,0.3].map((h,i)=>(
                        <i key={i} style={{height:`${h*100}%`,background:active?p.color:'currentColor'}}/>
                      ))}
                    </div>
                    <div className="preset-name">{p.name}</div>
                    <div className="preset-sub">{p.tags?.[0]}</div>
                    <div className="preset-chips">
                      <span className="chip" style={{background:`${p.color}20`,color:p.color,border:`1px solid ${p.color}40`,padding:'2px 6px',borderRadius:'4px',fontSize:'10px',fontWeight:600}}>B{p.bass>0?'+':''}{p.bass}</span>
                      <span className="chip" style={{background:'rgba(255,255,255,0.05)',color:'var(--text-muted)',border:'1px solid var(--border)',padding:'2px 6px',borderRadius:'4px',fontSize:'10px'}}>R{Math.round(p.reverbWet*100)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── MIX BUS MASTER ── */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">
              <span style={{fontSize:'16px'}}>🎛️</span> MIX BUS MASTER
              {activePreset && <span className="pill">{Ico.spark}{activePreset.name}</span>}
            </span>
            <span style={{fontSize:'11px',fontWeight:600,color:'var(--text-muted)',letterSpacing:'0.1em'}}>{isPlaying?'PLAYING':'STOPPED'}</span>
          </div>
          <div className="card-body mbm-grid" style={{gap:'0'}}>

            {/* EQ */}
            <div className="mbm-col">
              <div className="section-label" style={{marginBottom:'16px'}}>EQ — Arrastra para ajustar</div>
              {[{label:'Bass',val:bassGain,cb:(v:number)=>{setBassGain(v);bassFilterRef.current?.gain.setTargetAtTime(v,audioContextRef.current?.currentTime??0,0.01);}},
                {label:'Mid', val:midGain, cb:(v:number)=>{setMidGain(v);midFilterRef.current?.gain.setTargetAtTime(v,audioContextRef.current?.currentTime??0,0.01);}},
                {label:'High',val:highGain,cb:(v:number)=>{setHighGain(v);highFilterRef.current?.gain.setTargetAtTime(v,audioContextRef.current?.currentTime??0,0.01);}}
              ].map(eq=>(
                <div key={eq.label} style={{marginBottom:'16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
                    <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{eq.label}</span>
                    <span className="mono" style={{fontSize:'12px',color:'var(--accent)',fontWeight:500}}>{eq.val>0?'+':''}{eq.val.toFixed(1)} dB</span>
                  </div>
                  <HSlider value={eq.val} min={-12} max={12} onChange={eq.cb} color={presetColor}/>
                </div>
              ))}
            </div>

            {/* Effects */}
            <div className="mbm-col">
              <div className="section-label" style={{marginBottom:'16px'}}>Efectos</div>
              {[
                {label:'Reverb', sub:`${Math.round((activePreset?.reverbWet??0)*100)}% · Espacio`, active:reverbActive, toggle:toggleReverb},
                {label:'Delay',  sub:`0% · 1/4 beat`,                                              active:delayActive,  toggle:toggleDelay},
                {label:'Widener',sub:'50% · Estéreo',                                              active:widenerActive,toggle:()=>setWidenerActive(v=>!v)},
              ].map(fx=>(
                <div key={fx.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:500,color:'var(--text-primary)',marginBottom:'2px'}}>{fx.label}</div>
                    <div style={{fontSize:'11px',color:'var(--text-muted)'}}>{fx.sub}</div>
                  </div>
                  <Toggle on={fx.active} onChange={fx.toggle}/>
                </div>
              ))}
            </div>

            {/* Compression */}
            <div className="mbm-col">
              <div className="section-label" style={{marginBottom:'16px'}}>Compresión</div>
              <div style={{fontSize:'20px',fontWeight:600,color:'var(--text-primary)',marginBottom:'4px'}}>Medium</div>
              <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'12px'}}>Thr: -18dB · 4:1</div>
              <div style={{fontSize:'10px',color:'var(--text-muted)',marginBottom:'6px'}}>GR Meter</div>
              <div style={{height:'6px',background:'var(--panel-2)',borderRadius:'3px',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${Math.min(100,Math.max(0,(momentaryLufs+60)/60*100))}%`,background:'linear-gradient(90deg,var(--green),var(--yellow),var(--red))',borderRadius:'3px',transition:'width 100ms'}}/>
              </div>
            </div>

            {/* LUFS */}
            <div className="mbm-col" style={{borderRight:'none'}}>
              <div className="section-label" style={{marginBottom:'16px'}}>LUFS</div>
              <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
                {[{val:momentaryLufs,lbl:'MOM'},{val:integratedLufs,lbl:'INT'}].map(m=>(
                  <div key={m.lbl} className="lufs-box" style={{flex:1}}>
                    <div className="lufs-val mono">{m.val.toFixed(1)}</div>
                    <div className="lufs-lbl">{m.lbl}</div>
                  </div>
                ))}
              </div>
              <div className="lufs-targets">
                {[{lbl:'Spotify',val:'-16 LUFS'},{lbl:'YouTube',val:'-16 LUFS'}].map(t=>(
                  <div key={t.lbl} className="row" style={{justifyContent:'space-between',fontSize:'11px'}}>
                    <span style={{color:'var(--text-muted)'}}>{t.lbl}</span>
                    <span className="val mono">{t.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── IA EQ ── */}
        <div className="card">
          <div className="card-head">
            <span className="card-title">
              <span style={{fontSize:'16px'}}>🎚️</span> IA EQ — {iaEqPreset.name.toUpperCase()}
              <span style={{padding:'2px 8px',borderRadius:'4px',background:'rgba(59,214,113,0.15)',color:'var(--green)',fontSize:'10px',fontWeight:700,letterSpacing:'0.1em'}}>● LIVE</span>
            </span>
          </div>
          <div className="card-body">
            <div style={{fontSize:'11px',color:'var(--text-muted)',marginBottom:'12px'}}>Activo en tiempo real · se exporta junto a la mezcla · -16 LUFS</div>
            {/* Device tabs */}
            <div className="device-tabs" style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'20px'}}>
              {IAEQ_PRESETS.map(p=>(
                <button key={p.id} onClick={()=>{setIaEqPreset(p);setIaEqBands([...p.bands]);setActiveIaTab(p.id);updateLiveIAEQ(p.bands);}}
                  style={{padding:'5px 12px',borderRadius:'999px',border:`1px solid ${activeIaTab===p.id?'rgba(217,70,239,0.5)':'var(--border)'}`,background:activeIaTab===p.id?'var(--accent-soft)':'var(--panel-2)',color:activeIaTab===p.id?'var(--accent)':'var(--text-muted)',fontSize:'11px',fontWeight:activeIaTab===p.id?600:400,cursor:'pointer',transition:'all 200ms',boxShadow:activeIaTab===p.id?'0 0 10px var(--accent-glow)':'none'}}>
                  {p.name}
                </button>
              ))}
            </div>
            {/* Band sliders */}
            <div className="eq-bands-row">
              <div className="eq-bands-grid" style={{display:'grid',gridTemplateColumns:'repeat(12,1fr)',gap:'8px',marginBottom:'16px'}}>
              {IAEQ_BANDS.map((band,i)=>{
                const val=iaEqBands[i]??0;
                const pct=Math.round(((val+12)/24)*100);
                return (
                  <div key={band.label} className={`eq-band${val!==0?' active':''}`} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'6px'}}>
                    <span style={{fontSize:'9px',color:'var(--text-muted)',fontVariantNumeric:'tabular-nums'}}>{val>0?'+':''}{val}</span>
                    <div className="eq-band-slider" style={{position:'relative',height:'80px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <div style={{width:'2px',height:'100%',background:'rgba(255,255,255,0.06)',borderRadius:'1px',position:'relative'}}>
                        <div style={{position:'absolute',bottom:'50%',left:0,width:'100%',height:`${Math.abs(pct-50)}%`,background:val>=0?'var(--accent)':'var(--accent-2)',borderRadius:'1px',transform:val>=0?'translateY(0)':'translateY(100%)'}}/>
                      </div>
                      <div className="knob" style={{position:'absolute',top:`${100-pct}%`,transform:'translate(-50%,-50%)',left:'50%',width:'14px',height:'14px',borderRadius:'50%',background:val!==0?'var(--accent)':'var(--panel-2)',border:`2px solid ${val!==0?'var(--accent)':'var(--border-strong)'}`,boxShadow:val!==0?'0 0 8px var(--accent-glow)':'none',cursor:'ns-resize'}}/>
                      <input type="range" min={-12} max={12} step={0.5} value={val}
                        onChange={e=>{const nb=[...iaEqBands];nb[i]=parseFloat(e.target.value);setIaEqBands(nb);updateLiveIAEQ(nb);}}
                        style={{position:'absolute',inset:0,opacity:0,cursor:'ns-resize',writingMode:'vertical-lr',width:'100%',height:'100%'}}/>
                    </div>
                    <span style={{fontSize:'9px',color:'var(--text-dim)',textAlign:'center',lineHeight:1.2}}>{band.label}</span>
                  </div>
                );
              })}
              </div>{/* eq-bands-grid */}
            </div>{/* eq-bands-row */}
            {/* Frequency zones */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 4fr 4fr 4fr',gap:'4px'}}>
              {[{lbl:'Preamp: Pre',color:'#9B7AE8'},{lbl:'Bass: 30Hz–170Hz',color:'#E08254'},{lbl:'Mid: 310Hz–3kHz',color:'#4FD4D4'},{lbl:'High: 6kHz–16kHz',color:'#6DCE7A'}].map(z=>(
                <div key={z.lbl} style={{height:'3px',borderRadius:'2px',background:z.color,opacity:0.6}}/>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 4fr 4fr 4fr',gap:'4px',marginTop:'4px'}}>
              {['Preamp: Pre','Bass: 30Hz–170Hz','Mid: 310Hz–3kHz','High: 6kHz–16kHz'].map(lbl=>(
                <span key={lbl} style={{fontSize:'9px',color:'var(--text-dim)'}}>{lbl}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── TOOLS ROW ── */}
        <div className="tools-grid">

          {/* Control Mix */}
          <div className="card">
            <div className="card-head"><span className="card-title">Control Mix</span></div>
            <div className="card-body">
              <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
                <button onClick={handlePlayPause} style={{width:'32px',height:'32px',borderRadius:'50%',background:'var(--accent-grad)',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'var(--shadow-glow)',flexShrink:0}}>
                  {isPlaying?Ico.stop:Ico.play}
                </button>
                {isPlaying && <button onClick={handleStop} style={{width:'32px',height:'32px',borderRadius:'50%',background:'var(--panel-2)',border:'1px solid var(--border)',color:'var(--text-muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{Ico.stop}</button>}
              </div>
              <div style={{marginBottom:'12px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                  <span style={{fontSize:'11px',color:'var(--text-muted)'}}>Mix Volume</span>
                  <span className="mono" style={{fontSize:'11px',color:'var(--text-primary)',fontWeight:500}}>{masterVolume.toFixed(1)} dB</span>
                </div>
                <HSlider value={masterVolume} min={-40} max={12} onChange={updateMasterVolume}/>
              </div>
              <div style={{display:'flex',gap:'6px',marginTop:'8px'}}>
                {[-12,-6,0].map(db=>(
                  <button key={db} onClick={()=>{stems.forEach(s=>updateStemVolume(s.id,db));}} style={{flex:1,padding:'7px 4px',borderRadius:'6px',background:masterVolume===db?'var(--accent-soft)':'var(--panel-2)',border:`1px solid ${masterVolume===db?'rgba(217,70,239,0.4)':'var(--border)'}`,color:masterVolume===db?'var(--accent)':'var(--text-muted)',fontSize:'11px',cursor:'pointer',fontWeight:500}}>
                    {db} dB
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* FFT Analyzer */}
          <div className="card">
            <div className="card-head"><span className="card-title">FFT Analyzer</span></div>
            <div className="card-body" style={{padding:'12px'}}>
              <div style={{position:'relative',borderRadius:'6px',overflow:'hidden',background:'rgba(5,1,10,0.4)',border:'1px solid var(--border)'}}>
                <canvas ref={mixFFTCanvasRef} width={560} height={120} style={{width:'100%',height:'120px',display:'block'}}/>
                <div style={{position:'absolute',bottom:'6px',left:0,right:0,display:'flex',justifyContent:'space-between',padding:'0 8px'}}>
                  {['Hz','260Hz','1kHz','4kHz','10k'].map(lbl=>(
                    <span key={lbl} style={{fontSize:'9px',color:'rgba(255,255,255,0.25)'}}>{lbl}</span>
                  ))}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px',marginTop:'12px'}}>
                {[{lbl:'BASS',val:bassGain,adj:(d:'up'|'down')=>adjustGlobalEQ('bass',d)},{lbl:'MID',val:midGain,adj:(d:'up'|'down')=>adjustGlobalEQ('mid',d)},{lbl:'HIGH',val:highGain,adj:(d:'up'|'down')=>adjustGlobalEQ('high',d)}].map(b=>(
                  <div key={b.lbl} style={{textAlign:'center'}}>
                    <div style={{fontSize:'10px',color:'var(--text-muted)',marginBottom:'6px'}}>{b.lbl}</div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                      <button onClick={()=>b.adj('down')} style={{width:'18px',height:'18px',borderRadius:'4px',border:'1px solid var(--border)',background:'var(--panel-2)',color:'var(--text-muted)',fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>−</button>
                      <span className="mono" style={{fontSize:'12px',color:'var(--accent)',fontWeight:600,minWidth:'40px',textAlign:'center'}}>{b.val>0?'+':''}{b.val.toFixed(1)} dB</span>
                      <button onClick={()=>b.adj('up')} style={{width:'18px',height:'18px',borderRadius:'4px',border:'1px solid var(--border)',background:'var(--panel-2)',color:'var(--text-muted)',fontSize:'12px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* LUFS Pane */}
          <div className="card">
            <div className="card-head">
              <span className="card-title">LUFS</span>
              <span style={{padding:'2px 8px',borderRadius:'4px',background:momentaryLufs>-20?'rgba(59,214,113,0.15)':'rgba(244,183,64,0.15)',color:momentaryLufs>-20?'var(--green)':'var(--yellow)',fontSize:'10px',fontWeight:700}}>
                {momentaryLufs>-20?'● SAFE':'● SOFT'}
              </span>
            </div>
            <div className="card-body">
              <div className="lufs-big">
                {[{val:momentaryLufs,lbl:'MOMENTARY'},{val:integratedLufs,lbl:'INTEGRATED'}].map(m=>(
                  <div key={m.lbl} className="lufs-box">
                    <div className="lufs-val mono">{m.val.toFixed(1)}</div>
                    <div className="lufs-lbl">{m.lbl}</div>
                  </div>
                ))}
              </div>
              <div className="lufs-targets-pane">
                {[{lbl:'Spotify',val:'-16 LUFS',cls:'green'},{lbl:'YouTube',val:'-16 LUFS',cls:'yellow'}].map(t=>(
                  <div key={t.lbl} className={`lufs-target-row ${t.cls}`}>
                    <strong>{t.lbl}</strong>
                    <span className="val mono">{t.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── STEMS ── */}
        <div className="card">
          <div className="card-head stems-toolbar">
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <span className="card-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                Todos ({stems.length})
              </span>
            </div>
            <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
              <button onClick={()=>setShowUploadModal(true)} style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 12px',borderRadius:'8px',background:'var(--panel-2)',border:'1px solid var(--border)',color:'var(--text-secondary)',fontSize:'12px',cursor:'pointer',transition:'all 200ms'}}>
                {Ico.upload} Agregar stems
              </button>
            </div>
          </div>

          <div className="card-body" style={{paddingTop:'8px'}}>
            <div className="stem-list">
              {stems.map((stem, idx) => {
                const color = TC[idx % TC.length];
                const preset = stem.stemPresetId ? PRESETS.find(p=>p.id===stem.stemPresetId) : null;
                // showPlugins removed
                const showPresetMenu = openStemPresetId === stem.id;

                return (
                  <div key={stem.id} className={`stem${stem.muted?' muted':''}`}>
                    {/* Color bar */}
                    <div className="stem-color" style={{background:color}}/>
                    {/* Meta */}
                    <div className="stem-meta">
                      <div className="stem-icon" style={{background:`${color}18`}}>
                        <span style={{fontSize:'18px'}}>{stem.icon}</span>
                      </div>
                      <div className="stem-info">
                        <div className="stem-name" title={stem.name}>{stem.name.replace(/\.[^/.]+$/,'')}</div>
                        <div className="stem-kind">{stem.instrument}</div>
                      </div>
                      <button onClick={()=>toggleStemMute(stem.id)} className={`stem-m${stem.muted?' on':''}`}>
                        M
                      </button>
                    </div>

                    {/* Waveform */}
                    <div className="stem-wave" style={{background:'rgba(8,4,16,0.3)',padding:'8px 0'}}>
                      <StemWave peaks={stem.waveformPeaks} color={color} currentTime={currentTime} duration={duration}/>
                    </div>

                    {/* Controls */}
                    <div className="stem-ctrl">
                      <div className="stem-ctrl-row">
                        <span className="stem-ctrl-lbl">Vol</span>
                        <span className="stem-ctrl-val mono">{stem.volume.toFixed(1)} dB</span>
                      </div>
                      <div style={{position:'relative',height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',cursor:'pointer',margin:'4px 0 8px'}}
                        onClick={e=>{const r=e.currentTarget.getBoundingClientRect();updateStemVolume(stem.id,-40+(((e.clientX-r.left)/r.width)*52));}}>
                        <div style={{height:'100%',width:`${((stem.volume+40)/52)*100}%`,background:`linear-gradient(90deg,${color},var(--accent-2))`,borderRadius:'2px'}}/>
                        <div style={{position:'absolute',top:'50%',left:`${((stem.volume+40)/52)*100}%`,transform:'translate(-50%,-50%)',width:'10px',height:'10px',borderRadius:'50%',background:color,boxShadow:`0 0 6px ${color}`}}/>
                      </div>
                      <div className="stem-ctrl-row">
                        <span className="stem-ctrl-lbl">Pan</span>
                        <span className="stem-ctrl-val mono">{stem.pan===0?'C':stem.pan>0?`R${stem.pan}`:`L${Math.abs(stem.pan)}`}</span>
                      </div>
                      <div style={{position:'relative',height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',cursor:'pointer',margin:'4px 0'}}
                        onClick={e=>{const r=e.currentTarget.getBoundingClientRect();updateStemPan(stem.id,Math.round(-50+(((e.clientX-r.left)/r.width)*100)));}}>
                        <div style={{position:'absolute',left:'50%',width:'2px',top:0,bottom:0,background:'rgba(255,255,255,0.1)',transform:'translateX(-50%)'}}/>
                        <div style={{height:'100%',position:'absolute',left:stem.pan>=0?'50%':`${((stem.pan+50)/100)*100}%`,width:`${Math.abs(stem.pan)}%`,background:`linear-gradient(90deg,${color},var(--accent-2))`,borderRadius:'2px'}}/>
                        <div style={{position:'absolute',top:'50%',left:`${((stem.pan+50)/100)*100}%`,transform:'translate(-50%,-50%)',width:'10px',height:'10px',borderRadius:'50%',background:color,boxShadow:`0 0 6px ${color}`}}/>
                      </div>

                      {/* Preset + Plugins buttons */}
                      <div className="stem-actions" style={{marginTop:'8px',gridTemplateColumns:'1fr 1fr 1fr'}}>
                        {/* Preset EQ */}
                        <div style={{gridColumn:'1/-1',position:'relative'}}>
                          <button onClick={()=>setOpenStemPresetId(openStemPresetId===stem.id?null:stem.id)} className="stem-act-btn" style={{width:'100%',background:preset?`${preset.color}18`:'var(--panel-2)',borderColor:preset?`${preset.color}40`:'var(--border)',color:preset?preset.color:'var(--text-secondary)'}}>
                            {Ico.eq} {preset?`✦ ${preset.name}`:'+ Preset EQ'}
                          </button>
                          {showPresetMenu && (
                            <div data-preset-menu style={{position:'absolute',bottom:'calc(100% + 6px)',left:0,right:0,background:'var(--panel-1)',border:'1px solid var(--border-strong)',borderRadius:'var(--r-lg)',padding:'12px',zIndex:100,boxShadow:'var(--shadow-lg)',minWidth:'220px'}}>
                              <div style={{fontSize:'10px',fontWeight:700,color:'var(--text-muted)',letterSpacing:'0.1em',marginBottom:'8px'}}>PRESET EQ PARA ESTE STEM</div>
                              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
                                {PRESETS.map(p=>(
                                  <button key={p.id} onClick={()=>applyStemPreset(stem,p)} style={{padding:'7px 10px',borderRadius:'8px',border:`1px solid ${stem.stemPresetId===p.id?p.color+'60':p.color+'22'}`,background:stem.stemPresetId===p.id?`${p.color}18`:'rgba(0,0,0,0.3)',color:stem.stemPresetId===p.id?p.color:'var(--text-secondary)',fontSize:'12px',fontWeight:500,cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',textAlign:'left'}}>
                                    <span style={{width:'8px',height:'8px',borderRadius:'50%',background:p.color,flexShrink:0}}/>
                                    {p.name}
                                  </button>
                                ))}
                              </div>
                              {stem.stemPresetId && <button onClick={()=>clearStemPreset(stem)} style={{marginTop:'8px',width:'100%',padding:'6px',borderRadius:'6px',background:'transparent',border:'1px solid var(--border)',color:'var(--text-muted)',fontSize:'11px',cursor:'pointer'}}>Limpiar preset</button>}
                            </div>
                          )}
                        </div>

                        {/* Plugin buttons */}
                        <PlugBtn label="Comp" active={stem.plugins.compressor} onClick={()=>toggleStemPlugin(stem.id,'compressor')}/>
                        <PlugBtn label="Reverb" active={stem.plugins.reverb} onClick={()=>toggleStemPlugin(stem.id,'reverb')}/>
                        <PlugBtn label="Delay" active={stem.plugins.delay} onClick={()=>toggleStemPlugin(stem.id,'delay')}/>
                        <PlugBtn label="Tape" active={stem.plugins.tape} onClick={()=>toggleStemPlugin(stem.id,'tape')}/>
                        <PlugBtn label="NR" active={stem.plugins.noiseReduction} onClick={()=>toggleStemPlugin(stem.id,'noiseReduction')}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>{/* .studio */}

      <style>{`
        .mbm-grid { display:grid; grid-template-columns:repeat(4,1fr); }
        .mbm-col { padding:20px; border-right:1px solid var(--border); }
        .mbm-col:last-child { border-right:none; }
        .tools-grid { display:grid; grid-template-columns:1fr 2fr 1fr; gap:20px; }
        .preset-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:12px; }
        .stems-toolbar { align-items:center; }
        .stem { position:relative; }
        .knob { cursor:ns-resize; transition:box-shadow 150ms; }
        .knob:hover { box-shadow:0 0 12px var(--accent-glow) !important; }
        .eq-band-slider { touch-action:none; }
        .btn-ghost { background:transparent !important; border-color:var(--border-strong) !important; color:var(--text-secondary) !important; }
        .btn-ghost:hover { background:var(--panel-2) !important; color:var(--text-primary) !important; }
        .stem-actions { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-top:8px; }
        @media(max-width:1200px){
          .mbm-grid{grid-template-columns:1fr 1fr !important;}
          .mbm-col{border-right:none !important;border-bottom:1px solid var(--border) !important;}
          .tools-grid{grid-template-columns:1fr !important;}
        }
        @media(max-width:768px){
          .studio{padding:12px !important;gap:12px !important;}
          .spark-label{display:none !important;}
          .spark-label-short{display:inline !important;}
          .mbm-grid{grid-template-columns:1fr !important;}
          .mbm-col{padding:12px !important;border-bottom:1px solid var(--border) !important;border-right:none !important;}
          .tools-grid{grid-template-columns:1fr !important;gap:10px !important;}
          .preset-grid{grid-template-columns:repeat(2,1fr) !important;gap:8px !important;}
          .stem{display:flex !important;flex-direction:column !important;}
          .stem-meta{border-right:none !important;border-bottom:1px solid var(--border);min-height:unset !important;}
          .stem-ctrl{border-left:none !important;border-top:1px solid var(--border);}
          .stem-color{width:100% !important;height:3px !important;position:static !important;border-radius:0 !important;}
          .device-tabs{overflow-x:auto !important;flex-wrap:nowrap !important;-webkit-overflow-scrolling:touch;}
          .eq-bands-row{overflow-x:auto !important;-webkit-overflow-scrolling:touch;}
          .eq-bands-grid{min-width:480px !important;}
          .card-head{padding:10px 14px !important;}
          .card-body{padding:12px !important;}
          .btn-primary{font-size:12px !important;padding:10px 14px !important;}
        }
        @media(max-width:480px){
          .studio{padding:8px !important;gap:10px !important;}
          .preset-grid{grid-template-columns:repeat(2,1fr) !important;}
          .stem-act-btn{font-size:10px !important;padding:5px 4px !important;}
        }
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
