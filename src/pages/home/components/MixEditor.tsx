import { useState, useRef, useEffect, useCallback } from 'react';
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
  sourceNode?: AudioBufferSourceNode; volume: number; pan: number;
  muted: boolean; fftData: Uint8Array; waveformPeaks: Float32Array;
}
import { MixPreset, PRESETS } from './PresetScreen';

interface MixEditorProps {
  projectId: string; user: User; uploadedFiles: File[];
  onBack: () => void; onCreditsUpdate: (n: number) => void;
  onExport: (d: { audioBuffer: AudioBuffer; audioUrl: string; waveformPeaks: Float32Array; finalLufs: number }) => void;
  initialPreset?: MixPreset;
  reverbOn?: boolean;
  delayOn?: boolean;
  stereoOn?: boolean;
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

export default function MixEditor({ projectId, user, uploadedFiles, onBack, onCreditsUpdate, onExport, initialPreset, reverbOn = false, delayOn = false, stereoOn = false }: MixEditorProps) {
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
  const [showPresetPanel, setShowPresetPanel] = useState(false);
  const [reverbActive, setReverbActive] = useState(reverbOn);
  const [delayActive, setDelayActive] = useState(delayOn);
  const [momentaryLufs, setMomentaryLufs] = useState(-60.0);
  const [integratedLufs, setIntegratedLufs] = useState(-60.0);
  const [activePreset, setActivePreset] = useState<MixPreset|undefined>(initialPreset);
  const [allFiles, setAllFiles] = useState<File[]>(uploadedFiles);

  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const mixAnalyserRef = useRef<AnalyserNode | null>(null);
  const mixFftDataRef = useRef<Uint8Array | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const highFilterRef = useRef<BiquadFilterNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const delayGainRef = useRef<GainNode | null>(null);
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
      bassFilter.type = 'lowshelf'; bassFilter.frequency.value = 100; bassFilter.gain.value = bassGain;
      midFilter.type = 'peaking'; midFilter.frequency.value = 1000; midFilter.Q.value = 1; midFilter.gain.value = midGain;
      highFilter.type = 'highshelf'; highFilter.frequency.value = 8000; highFilter.gain.value = highGain;
      mixAnalyser.fftSize = 2048; mixAnalyser.smoothingTimeConstant = 0.8;
      masterGain.connect(bassFilter); bassFilter.connect(midFilter); midFilter.connect(highFilter);

      // REVERB real con ConvolverNode
      const reverbNode = audioContext.createConvolver();
      const reverbGain = audioContext.createGain();
      const dryGain = audioContext.createGain();
      const reverbLen = audioContext.sampleRate * 2.5;
      const reverbBuf = audioContext.createBuffer(2, reverbLen, audioContext.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = reverbBuf.getChannelData(c);
        for (let i = 0; i < reverbLen; i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/reverbLen, 3.5);
      }
      reverbNode.buffer = reverbBuf;
      const reverbWetVal = (initialPreset?.reverbWet ?? 0) * (reverbOn ? 1 : 0);
      reverbGain.gain.value = reverbWetVal;
      dryGain.gain.value = 1 - reverbWetVal * 0.4;

      // DELAY real con DelayNode
      const delayNode = audioContext.createDelay(1.0);
      const delayFeedback = audioContext.createGain();
      const delayGainNode = audioContext.createGain();
      delayNode.delayTime.value = 0.25;
      delayFeedback.gain.value = 0.3;
      delayGainNode.gain.value = (initialPreset?.delayWet ?? 0) * (delayOn ? 1 : 0);

      // Conectar cadena con efectos
      highFilter.connect(dryGain);
      highFilter.connect(reverbNode);
      reverbNode.connect(reverbGain);
      highFilter.connect(delayNode);
      delayNode.connect(delayFeedback);
      delayFeedback.connect(delayNode);
      delayNode.connect(delayGainNode);
      dryGain.connect(mixAnalyser);
      reverbGain.connect(mixAnalyser);
      delayGainNode.connect(mixAnalyser);
      mixAnalyser.connect(audioContext.destination);
      masterGain.gain.value = Math.pow(10, masterVolume / 20);
      masterGainRef.current = masterGain; mixAnalyserRef.current = mixAnalyser;
      mixFftDataRef.current = new Uint8Array(mixAnalyser.frequencyBinCount);
      bassFilterRef.current = bassFilter; midFilterRef.current = midFilter; highFilterRef.current = highFilter;
      reverbGainRef.current = reverbGain; dryGainRef.current = dryGain; delayGainRef.current = delayGainNode;
      setLoadingStep('Decodificando archivos...'); setLoadingProgress(30);
      const decoded = await Promise.all(allFiles.map(async (file, i) => {
        try {
          const ab = await file.arrayBuffer();
          const buf = await audioContext.decodeAudioData(ab);
          setLoadingProgress(30 + ((i+1)/allFiles.length)*40);
          setLoadingStep(`Procesando ${file.name}...`);
          return { file, buffer: buf };
        } catch { return null; }
      }));
      setLoadingStep('Configurando mezclador...'); setLoadingProgress(80);
      const valid = decoded.filter(Boolean) as {file:File,buffer:AudioBuffer}[];
      const stemsArr: Stem[] = []; let maxDur = 0;
      for (let i = 0; i < valid.length; i++) {
        const { file, buffer } = valid[i];
        const gainNode = audioContext.createGain();
        const panNode = audioContext.createStereoPanner();
        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 512; analyserNode.smoothingTimeConstant = 0.7;
        gainNode.connect(panNode); panNode.connect(analyserNode); analyserNode.connect(masterGain);
        stemsArr.push({ id:`stem-${i}`, name:file.name, file, buffer, gainNode, panNode, analyserNode,
          volume:0, pan:0, muted:false, fftData:new Uint8Array(analyserNode.frequencyBinCount),
          waveformPeaks:generateWaveformPeaks(buffer,400) });
        maxDur = Math.max(maxDur, buffer.duration);
      }
      setStems(stemsArr); setDuration(maxDur); startFFTAnimation();
      setLoadingProgress(100); setLoadingStep('¡Listo!');
      setTimeout(() => setIsLoading(false), 500);
    } catch (e) { console.error(e); setIsLoading(false); }
  };

  const applyPresetToAudio = (preset: MixPreset) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;
    const smooth = 0.08;
    // EQ en tiempo real
    if (bassFilterRef.current) bassFilterRef.current.gain.setTargetAtTime(preset.bass, t, smooth);
    if (midFilterRef.current) midFilterRef.current.gain.setTargetAtTime(preset.mid, t, smooth);
    if (highFilterRef.current) highFilterRef.current.gain.setTargetAtTime(preset.high, t, smooth);
    // Reverb en tiempo real
    const rvWet = preset.reverbWet * (reverbOnRef.current ? 1 : 0);
    if (reverbGainRef.current) reverbGainRef.current.gain.setTargetAtTime(rvWet, t, smooth);
    if (dryGainRef.current) dryGainRef.current.gain.setTargetAtTime(1 - rvWet * 0.4, t, smooth);
    // Delay en tiempo real
    const dlWet = preset.delayWet * (delayOnRef.current ? 1 : 0);
    if (delayGainRef.current) delayGainRef.current.gain.setTargetAtTime(dlWet, t, smooth);
    setBassGain(preset.bass); setMidGain(preset.mid); setHighGain(preset.high);
    setActivePreset(preset);
    setShowPresetPanel(false);
  };

  const toggleReverb = () => {
    const newVal = !reverbOnRef.current;
    reverbOnRef.current = newVal;
    const ctx = audioContextRef.current;
    if (!ctx || !activePreset) return;
    const rvWet = activePreset.reverbWet * (newVal ? 1 : 0);
    if (reverbGainRef.current) reverbGainRef.current.gain.setTargetAtTime(rvWet, ctx.currentTime, 0.05);
    if (dryGainRef.current) dryGainRef.current.gain.setTargetAtTime(1 - rvWet * 0.4, ctx.currentTime, 0.05);
    setReverbActive(newVal);
  };

  const toggleDelay = () => {
    const newVal = !delayOnRef.current;
    delayOnRef.current = newVal;
    const ctx = audioContextRef.current;
    if (!ctx || !activePreset) return;
    const dlWet = activePreset.delayWet * (newVal ? 1 : 0);
    if (delayGainRef.current) delayGainRef.current.gain.setTargetAtTime(dlWet, ctx.currentTime, 0.05);
    setDelayActive(newVal);
  };

  const generateWaveformPeaks = (buffer: AudioBuffer, samples: number): Float32Array => {
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

  const startFFTAnimation = useCallback(() => {
    const update = () => {
      const ma = mixAnalyserRef.current, fd = mixFftDataRef.current;
      if (ma && fd) {
        ma.getByteFrequencyData(fd);
        setStems(prev => prev.map(s => { s.analyserNode.getByteFrequencyData(s.fftData); return {...s}; }));
        const wd = new Float32Array(ma.fftSize); ma.getFloatTimeDomainData(wd);
        let rmsSum = 0;
        for (let i = 0; i < wd.length; i++) rmsSum += wd[i]*wd[i];
        const rms = Math.sqrt(rmsSum/wd.length);
        const momentary = rms > 0 ? Math.max(-60, 20*Math.log10(rms)-0.691) : -60;
        setMomentaryLufs(momentary);
        lufsHistoryRef.current.push(momentary);
        if (lufsHistoryRef.current.length > 300) lufsHistoryRef.current.shift();
        const integrated = lufsHistoryRef.current.reduce((a,b)=>a+b,0)/lufsHistoryRef.current.length;
        setIntegratedLufs(Math.max(-60, Math.min(0, integrated)));
        setLufsMomentary(momentary); setLufsIntegrated(integrated);
        if (mixFFTCanvasRef.current) drawFFTAnalyzer({ canvas:mixFFTCanvasRef.current, fftData:fd, style:'applemusic' });
      }
      animationFrameRef.current = requestAnimationFrame(update);
    };
    update();
  }, []);

  const adjustGlobalEQ = useCallback((band: 'bass'|'mid'|'high', dir: 'up'|'down') => {
    const ctx = audioContextRef.current; if (!ctx) return;
    const adj = dir==='up'?1:-1;
    if (band==='bass') { const v=Math.max(-12,Math.min(12,bassGain+adj)); bassFilterRef.current?.gain.setTargetAtTime(v,ctx.currentTime,0.01); setBassGain(v); }
    if (band==='mid') { const v=Math.max(-12,Math.min(12,midGain+adj)); midFilterRef.current?.gain.setTargetAtTime(v,ctx.currentTime,0.01); setMidGain(v); }
    if (band==='high') { const v=Math.max(-12,Math.min(12,highGain+adj)); highFilterRef.current?.gain.setTargetAtTime(v,ctx.currentTime,0.01); setHighGain(v); }
  }, [bassGain, midGain, highGain]);

  const setAllStemsGain = useCallback((db: number) => {
    const ctx = audioContextRef.current;
    setStems(prev => prev.map(s => {
      if (ctx) s.gainNode.gain.setTargetAtTime(Math.pow(10,db/20),ctx.currentTime,0.01);
      return {...s,volume:db};
    }));
  }, []);

  const handlePlayPause = async () => {
    const ctx = audioContextRef.current; if (!ctx || stems.length===0) return;
    if (ctx.state==='suspended') await ctx.resume();
    if (isPlaying) {
      stems.forEach(s => { s.sourceNode?.stop(); s.sourceNode?.disconnect(); });
      setIsPlaying(false); pausedTimeRef.current = currentTime;
      if (timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
    } else {
      const startTime = ctx.currentTime, offset = pausedTimeRef.current;
      const updated = stems.map(s => {
        if (!s.muted) {
          const src = ctx.createBufferSource(); src.buffer = s.buffer; src.connect(s.gainNode); src.start(startTime,offset);
          return {...s,sourceNode:src};
        }
        return s;
      });
      setStems(updated); setIsPlaying(true);
      timeUpdateIntervalRef.current = window.setInterval(() => {
        const elapsed = ctx.currentTime - startTime + offset;
        setCurrentTime(Math.min(elapsed,duration));
        if (elapsed >= duration) handleStop();
      }, 100);
    }
  };

  const handleStop = () => {
    stems.forEach(s => { s.sourceNode?.stop(); s.sourceNode?.disconnect(); });
    setStems(prev => prev.map(s => ({...s,sourceNode:undefined})));
    setIsPlaying(false); setCurrentTime(0); pausedTimeRef.current = 0;
    if (timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
  };

  const updateMasterVolume = (db: number) => {
    const ctx = audioContextRef.current, mg = masterGainRef.current;
    if (mg && ctx) mg.gain.setTargetAtTime(Math.pow(10,db/20),ctx.currentTime,0.01);
    setMasterVolume(db);
  };

  const updateStemVolume = (id: string, db: number) => {
    const ctx = audioContextRef.current;
    setStems(prev => prev.map(s => {
      if (s.id===id) { if (ctx) s.gainNode.gain.setTargetAtTime(Math.pow(10,db/20),ctx.currentTime,0.01); return {...s,volume:db}; }
      return s;
    }));
  };

  const updateStemPan = (id: string, pan: number) => {
    const ctx = audioContextRef.current;
    setStems(prev => prev.map(s => {
      if (s.id===id) { if (ctx) s.panNode.pan.setTargetAtTime(pan,ctx.currentTime,0.01); return {...s,pan}; }
      return s;
    }));
  };

  const toggleStemMute = (id: string) => {
    const ctx = audioContextRef.current;
    setStems(prev => prev.map(s => {
      if (s.id===id) {
        const muted = !s.muted;
        if (ctx) s.gainNode.gain.setTargetAtTime(muted?0:Math.pow(10,s.volume/20),ctx.currentTime,0.01);
        return {...s,muted};
      }
      return s;
    }));
  };

  const handleTimelineSeek = (t: number) => {
    if (isPlaying) { handleStop(); setTimeout(() => { pausedTimeRef.current=t; setCurrentTime(t); handlePlayPause(); },50); }
    else { pausedTimeRef.current=t; setCurrentTime(t); }
  };

  const handleUploadMoreStems = async (newFiles: File[]) => {
    if (stems.length+newFiles.length>12) { alert('Máximo 12 stems'); return; }
    if (isPlaying) { handleStop(); await new Promise(r=>setTimeout(r,100)); }
    setShowUploadModal(false);
    setAllFiles([...allFiles,...newFiles]);
  };

  const handleExportMix = async () => {
    if (!audioContextRef.current || stems.length===0) return;
    if (isPlaying) { handleStop(); await new Promise(r=>setTimeout(r,100)); }
    setIsExporting(true); setExportProgress(0); setExportStep('Inicializando procesamiento IA...');
    try {
      setExportProgress(15); setExportStep('Aplicando reducción de ruido, compresión y EQ...'); await new Promise(r=>setTimeout(r,1200));
      const offCtx = new OfflineAudioContext(2, Math.floor(44100*duration), 44100);
      const mixBus = offCtx.createGain();
      // Compresión real según preset
      const compMap: Record<string,(c:DynamicsCompressorNode)=>void> = {
        none: c => { c.threshold.value=-60; c.ratio.value=1; c.knee.value=40; c.attack.value=0.1; c.release.value=0.5; },
        low:  c => { c.threshold.value=-24; c.ratio.value=2; c.knee.value=20; c.attack.value=0.02; c.release.value=0.3; },
        medium: c => { c.threshold.value=-18; c.ratio.value=4; c.knee.value=12; c.attack.value=0.005; c.release.value=0.1; },
        high: c => { c.threshold.value=-14; c.ratio.value=6; c.knee.value=8; c.attack.value=0.003; c.release.value=0.08; },
        max:  c => { c.threshold.value=-10; c.ratio.value=10; c.knee.value=4; c.attack.value=0.001; c.release.value=0.05; },
      };
      const compressor = offCtx.createDynamicsCompressor();
      const compType = initialPreset?.compression ?? 'medium';
      (compMap[compType] || compMap.medium)(compressor);
      const noiseRed = offCtx.createBiquadFilter(); noiseRed.type='highpass'; noiseRed.frequency.value=40;
      const lowShelf = offCtx.createBiquadFilter(); lowShelf.type='lowshelf'; lowShelf.frequency.value=100; lowShelf.gain.value=bassGain+1.2;
      const midPeak = offCtx.createBiquadFilter(); midPeak.type='peaking'; midPeak.frequency.value=2500; midPeak.Q.value=0.8; midPeak.gain.value=midGain-0.5;
      const highShelf = offCtx.createBiquadFilter(); highShelf.type='highshelf'; highShelf.frequency.value=8000; highShelf.gain.value=highGain+1.8;
      const limiter = offCtx.createDynamicsCompressor(); limiter.threshold.value=-1; limiter.knee.value=0; limiter.ratio.value=20; limiter.attack.value=0.001; limiter.release.value=0.01;
      // REVERB offline con el preset activo
      const activePresetData = activePreset || initialPreset;
      const reverbWetVal = (activePresetData?.reverbWet ?? 0);
      const delayWetVal = (activePresetData?.delayWet ?? 0);
      
      const dryGainOff = offCtx.createGain(); dryGainOff.gain.value = 1 - reverbWetVal * 0.4;
      const reverbGainOff = offCtx.createGain(); reverbGainOff.gain.value = reverbWetVal;
      const reverbNodeOff = offCtx.createConvolver();
      const reverbLenOff = offCtx.sampleRate * 2.5;
      const reverbBufOff = offCtx.createBuffer(2, reverbLenOff, offCtx.sampleRate);
      for (let c=0;c<2;c++){const d=reverbBufOff.getChannelData(c);for(let i=0;i<reverbLenOff;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/reverbLenOff,3.5);}
      reverbNodeOff.buffer = reverbBufOff;
      
      const delayNodeOff = offCtx.createDelay(1.0); delayNodeOff.delayTime.value=0.25;
      const delayFeedOff = offCtx.createGain(); delayFeedOff.gain.value=0.3;
      const delayGainOff = offCtx.createGain(); delayGainOff.gain.value=delayWetVal;
      
      mixBus.connect(noiseRed); noiseRed.connect(lowShelf); lowShelf.connect(midPeak); midPeak.connect(highShelf); highShelf.connect(compressor); compressor.connect(dryGainOff);
      compressor.connect(reverbNodeOff); reverbNodeOff.connect(reverbGainOff);
      compressor.connect(delayNodeOff); delayNodeOff.connect(delayFeedOff); delayFeedOff.connect(delayNodeOff); delayNodeOff.connect(delayGainOff);
      dryGainOff.connect(limiter); reverbGainOff.connect(limiter); delayGainOff.connect(limiter); limiter.connect(offCtx.destination);
      setExportProgress(40); setExportStep('Renderizando stems...'); await new Promise(r=>setTimeout(r,800));
      for (const stem of stems) {
        if (stem.buffer && !stem.muted) {
          const src = offCtx.createBufferSource(); const g = offCtx.createGain(); const p = offCtx.createStereoPanner();
          src.buffer=stem.buffer; g.gain.value=Math.pow(10,stem.volume/20); p.pan.value=stem.pan;
          src.connect(g); g.connect(p); p.connect(mixBus); src.start(0);
        }
      }
      mixBus.gain.value = Math.pow(10,masterVolume/20);
      setExportProgress(75); setExportStep('Normalizando a -14 LUFS...'); await new Promise(r=>setTimeout(r,800));
      const rendered = await offCtx.startRendering();
      const normalized = normalizeTo14LUFS(rendered);
      setExportProgress(95); setExportStep('Generando archivo...'); await new Promise(r=>setTimeout(r,500));
      const peaks = generateWaveformPeaks(normalized,800);
      const wavBlob = bufferToWav(normalized,24);
      const wavUrl = URL.createObjectURL(wavBlob);
      setExportProgress(100); setExportStep('¡Listo!'); await new Promise(r=>setTimeout(r,800));
      onExport({ audioBuffer:normalized, audioUrl:wavUrl, waveformPeaks:peaks, finalLufs:-14.0, presetName:(activePreset||initialPreset)?.name });
      setIsExporting(false); setExportProgress(0); setExportStep('');
    } catch(e) { console.error(e); setIsExporting(false); }
  };

  const normalizeTo14LUFS = (buffer: AudioBuffer): AudioBuffer => {
    const target=-14, ch=buffer.getChannelData(0); let rmsSum=0;
    for (let i=0;i<ch.length;i++) rmsSum+=ch[i]*ch[i];
    const rms=Math.sqrt(rmsSum/ch.length), curr=rms>0?20*Math.log10(rms)-0.691:-60;
    const gain=Math.pow(10,(target-curr)/20);
    for (let c=0;c<buffer.numberOfChannels;c++) {
      const d=buffer.getChannelData(c);
      for (let i=0;i<d.length;i++) { d[i]*=gain; if(Math.abs(d[i])>0.95) d[i]=d[i]>0?0.95:-0.95; }
    }
    return buffer;
  };

  const bufferToWav = (buffer: AudioBuffer, bitDepth=24): Blob => {
    const len=buffer.length, ch=buffer.numberOfChannels, sr=buffer.sampleRate;
    const bps=bitDepth/8, ba=ch*bps, br=sr*ba, ds=len*ba, bs=44+ds;
    const ab=new ArrayBuffer(bs), view=new DataView(ab);
    const ws=(o:number,s:string)=>{for(let i=0;i<s.length;i++)view.setUint8(o+i,s.charCodeAt(i));};
    ws(0,'RIFF'); view.setUint32(4,bs-8,true); ws(8,'WAVE'); ws(12,'fmt ');
    view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,ch,true);
    view.setUint32(24,sr,true); view.setUint32(28,br,true); view.setUint16(32,ba,true);
    view.setUint16(34,bitDepth,true); ws(36,'data'); view.setUint32(40,ds,true);
    let offset=44;
    for (let i=0;i<len;i++) for (let c=0;c<ch;c++) {
      const s=Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]));
      const v=Math.round(s*8388607);
      if (offset+2<ab.byteLength) { view.setInt8(offset,v&0xFF); view.setInt8(offset+1,(v>>8)&0xFF); view.setInt8(offset+2,(v>>16)&0xFF); offset+=3; }
    }
    return new Blob([ab],{type:'audio/wav'});
  };

  useEffect(() => {
    const canvas=timelineCanvasRef.current;
    if (!canvas||duration===0) return;
    const combined=new Float32Array(400);
    stems.forEach(s => { if(!s.muted) for(let i=0;i<400;i++) combined[i]+=s.waveformPeaks[i]||0; });
    let max=0; for(let i=0;i<400;i++) max=Math.max(max,combined[i]);
    if(max>0) for(let i=0;i<400;i++) combined[i]/=max;
    drawWaveform({ canvas, waveformPeaks:combined, currentTime, duration, style:'soundcloud',
      colors:{played:'#C026D3',unplayed:'rgba(124,58,237,0.2)',playhead:'#EC4899'} });
  }, [stems,currentTime,duration]);

  useEffect(() => () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
    audioContextRef.current?.close();
  }, []);

  const fmt = (t:number) => `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;

  if (isLoading) return (
    <div style={C.page}><Header user={user} onLogout={()=>{}} onCreditsUpdate={onCreditsUpdate} />
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

  if (isExporting) {
    const steps=[{l:'Reducción Ruido',t:25},{l:'Compresión',t:50},{l:'EQ + Limiter',t:75},{l:'Normalización',t:95}];
    return (
      <div style={C.page}><Header user={user} onLogout={()=>{}} onCreditsUpdate={onCreditsUpdate} />
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

  return (
    <div style={C.page}>
      <Header user={user} onLogout={()=>{}} onCreditsUpdate={onCreditsUpdate} />
      <div style={{maxWidth:'1400px',margin:'0 auto',padding:'16px 12px 40px'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'16px',gap:'10px',flexWrap:'wrap'}}>
          <div>
            <h1 style={{fontSize:'clamp(18px,4vw,26px)',fontWeight:700,letterSpacing:'-0.5px',...C.grad,margin:0}}>🎛️ Mezclador AI Pro</h1>
            <p style={{color:'#9B7EC8',fontSize:'12px',marginTop:'4px'}}>
              {stems.length} stems · {fmt(duration)}
              {activePreset && (
                <button onClick={() => setShowPresetPanel(!showPresetPanel)}
                  style={{marginLeft:'8px',background:'linear-gradient(135deg,rgba(236,72,153,0.15),rgba(124,58,237,0.15))',border:`1.5px solid ${activePreset.color}`,borderRadius:'980px',padding:'5px 14px',fontSize:'12px',color:'#F8F0FF',fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:'6px',boxShadow:`0 0 10px ${activePreset.color}44`}}>
                  ✦ {activePreset.name}
                  <span style={{fontSize:'10px',color:'rgba(248,240,255,0.6)'}}>cambiar ▾</span>
                </button>
              )}
            </p>
          </div>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            {stems.length<12&&<button onClick={()=>setShowUploadModal(true)} style={{...C.ghostBtn,fontSize:'12px',padding:'8px 14px'}}>+ Stems ({stems.length}/12)</button>}
            <button onClick={handleExportMix} disabled={stems.length===0}
              style={{background:stems.length===0?'#241636':'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',border:'none',color:'#fff',padding:'12px 28px',borderRadius:'980px',fontSize:'15px',fontWeight:700,cursor:stems.length===0?'not-allowed':'pointer',boxShadow:stems.length>0?'0 0 28px rgba(192,38,211,0.6)':'none',fontFamily:'inherit',opacity:stems.length===0?0.4:1,display:'inline-flex',alignItems:'center',gap:'8px',animation:stems.length>0?'glow 2.5s infinite':'none',letterSpacing:'-0.2px'}}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="2" height="10" rx="1" fill="white" opacity="0.5"/><rect x="1" y="8" width="4" height="4" rx="2" fill="white"/><rect x="9" y="3" width="2" height="14" rx="1" fill="white" opacity="0.5"/><rect x="8" y="5" width="4" height="4" rx="2" fill="white"/><rect x="16" y="5" width="2" height="10" rx="1" fill="white" opacity="0.5"/><rect x="15" y="11" width="4" height="4" rx="2" fill="white"/></svg>
              ✦ Exportar Mezcla con IA
            </button>
            <button onClick={onBack} style={{...C.ghostBtn,fontSize:'12px',padding:'8px 14px'}}>← Volver</button>
          </div>
        </div>

        {/* TIMELINE + TRANSPORT — arriba de todo */}
        <div style={{...C.card,marginBottom:'12px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
            <span style={C.label}>Timeline</span>
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <span style={{...C.mono,fontSize:'12px',color:'#9B7EC8'}}>{fmt(currentTime)} / {fmt(duration)}</span>
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
              onClick={e=>{ if(timelineCanvasRef.current) handleWaveformClick(e,timelineCanvasRef.current,duration,handleTimelineSeek); }} />
          </div>
        </div>

        {/* PRESETS */}
        <div style={{...C.card,marginBottom:'12px'}}>
          <span style={C.label}>Preset — toca para aplicar y escuchar en tiempo real</span>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:'7px'}}>
            {PRESETS.map(p => {
              const isSel = activePreset?.id === p.id;
              return (
                <button key={p.id} onClick={() => applyPresetToAudio(p)}
                  style={{background:isSel?`linear-gradient(135deg,${p.color}22,${p.color}11)`:'rgba(8,4,16,0.5)',border:`1.5px solid ${isSel?p.color:'rgba(192,38,211,0.1)'}`,borderRadius:'11px',padding:'9px 8px',cursor:'pointer',textAlign:'left',transition:'all 0.15s',boxShadow:isSel?`0 0 12px ${p.color}44`:'none',position:'relative'}}>
                  {isSel&&<div style={{position:'absolute',top:'5px',right:'5px',width:'14px',height:'14px',borderRadius:'50%',background:p.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'8px',color:'#fff',fontWeight:700}}>✓</div>}
                  <div style={{height:'22px',display:'flex',alignItems:'flex-end',gap:'1px',marginBottom:'7px',background:'rgba(8,4,16,0.6)',borderRadius:'5px',padding:'3px 4px'}}>
                    {p.wavePattern.map((h,i) => (
                      <div key={i} style={{flex:1,borderRadius:'2px 2px 0 0',height:`${h*100}%`,background:isSel?p.color:'rgba(155,126,200,0.2)',transition:'background 0.2s'}}></div>
                    ))}
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
            {activePreset && <span style={{background:`linear-gradient(135deg,${activePreset.color},${activePreset.color}88)`,borderRadius:'980px',padding:'3px 10px',fontSize:'10px',color:'#fff',fontWeight:700}}>✦ {activePreset.name}</span>}
            <span style={{marginLeft:'auto',fontSize:'10px',color:isPlaying?'#4ade80':'#9B7EC8',fontFamily:"'DM Mono',monospace",fontWeight:600}}>{isPlaying?'▶ PLAYING':'■ STOPPED'}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'10px'}}>

            {/* EQ */}
            <div style={{background:'rgba(15,10,26,0.6)',borderRadius:'10px',padding:'12px'}}>
              <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8',marginBottom:'10px'}}>EQ</div>
              {[{label:'Bass',val:bassGain,color:'#EC4899'},{label:'Mid',val:midGain,color:'#C026D3'},{label:'High',val:highGain,color:'#7C3AED'}].map(eq=>(
                <div key={eq.label} style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'6px'}}>
                  <span style={{fontSize:'10px',color:'#9B7EC8',width:'28px'}}>{eq.label}</span>
                  <div style={{flex:1,height:'4px',background:'rgba(192,38,211,0.15)',borderRadius:'2px'}}>
                    <div style={{height:'100%',borderRadius:'2px',background:eq.color,width:`${((eq.val+12)/24)*100}%`}}></div>
                  </div>
                  <span style={{fontSize:'10px',color:eq.color,fontFamily:"'DM Mono',monospace",minWidth:'36px',textAlign:'right'}}>{eq.val>0?'+':''}{eq.val}dB</span>
                </div>
              ))}
            </div>

            {/* FX con toggles reales */}
            <div style={{background:'rgba(15,10,26,0.6)',borderRadius:'10px',padding:'12px'}}>
              <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8',marginBottom:'10px'}}>Efectos</div>
              {[
                {label:'Reverb',active:reverbActive,toggle:toggleReverb,val:activePreset?`${Math.round(activePreset.reverbWet*100)}%`:'0%',sub:'Espacio'},
                {label:'Delay',active:delayActive,toggle:toggleDelay,val:activePreset?`${Math.round(activePreset.delayWet*100)}%`:'0%',sub:'1/4 beat'},
                {label:'Widener',active:stereoOn,toggle:()=>{},val:activePreset?`${Math.round(activePreset.stereoWidth*100)}%`:'50%',sub:'Estéreo'},
              ].map(fx=>(
                <div key={fx.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                  <div>
                    <div style={{fontSize:'11px',color:'#F8F0FF',fontWeight:600}}>{fx.label}</div>
                    <div style={{fontSize:'10px',color:'#9B7EC8'}}>{fx.val} · {fx.sub}</div>
                  </div>
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

            {/* LUFS REALES */}
            <div style={{background:'rgba(15,10,26,0.6)',borderRadius:'10px',padding:'12px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                <span style={{fontSize:'9px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8'}}>LUFS</span>
                <span style={{fontSize:'9px',fontWeight:700,padding:'2px 8px',borderRadius:'980px',background:'rgba(74,222,128,0.1)',color:'#4ade80',border:'1px solid rgba(74,222,128,0.2)'}}>
                  {momentaryLufs>-14?'⚠ Loud':momentaryLufs<-30?'↓ Soft':'✓ Safe'}
                </span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'8px'}}>
                <div style={{background:'rgba(8,4,16,0.6)',borderRadius:'8px',padding:'8px',textAlign:'center',border:'1px solid rgba(192,38,211,0.1)'}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:'16px',fontWeight:500,background:'linear-gradient(90deg,#EC4899,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{momentaryLufs.toFixed(1)}</div>
                  <div style={{fontSize:'9px',color:'#9B7EC8',textTransform:'uppercase' as const,letterSpacing:'0.5px'}}>Mom</div>
                </div>
                <div style={{background:'rgba(8,4,16,0.6)',borderRadius:'8px',padding:'8px',textAlign:'center',border:'1px solid rgba(192,38,211,0.1)'}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:'16px',fontWeight:500,background:'linear-gradient(90deg,#EC4899,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{integratedLufs.toFixed(1)}</div>
                  <div style={{fontSize:'9px',color:'#9B7EC8',textTransform:'uppercase' as const,letterSpacing:'0.5px'}}>Int</div>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',marginBottom:'2px'}}>
                <span style={{color:'#9B7EC8'}}>Spotify</span>
                <span style={{color:momentaryLufs<=-13.5&&momentaryLufs>=-14.5?'#4ade80':'#f87171'}}>-14</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px'}}>
                <span style={{color:'#9B7EC8'}}>YouTube</span>
                <span style={{color:momentaryLufs<=-12.5&&momentaryLufs>=-13.5?'#4ade80':'#f87171'}}>-13</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls — mobile: stacked, desktop: 3 col */}
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
                  style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}} />
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
              <canvas ref={mixFFTCanvasRef} width={800} height={100} style={{width:'100%',height:'100%',display:'block'}} />
            </div>
            <div style={{display:'flex',justifyContent:'space-around'}}>
              {(['bass','mid','high'] as const).map(band=>{
                const val=band==='bass'?bassGain:band==='mid'?midGain:highGain;
                return (
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
              {[{n:'Spotify',v:'-14',c:'#4ade80'},{n:'YouTube',v:'-13',c:'#f87171'}].map(r=>(
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

        {/* Stems grid — mobile: 2 col, tablet: 3, desktop: 4+ */}
        {stems.length>0&&(
          <div className="stems-grid">
            {stems.map(stem=>(
              <div key={stem.id} style={{...C.card,borderColor:stem.muted?'rgba(248,113,113,0.3)':undefined}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                  <span style={{fontSize:'11px',fontWeight:600,color:'#F8F0FF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'calc(100% - 36px)'}}>
                    {stem.name.replace(/\.[^.]+$/,'').toUpperCase()}
                  </span>
                  <button onClick={()=>toggleStemMute(stem.id)}
                    style={{width:'26px',height:'26px',borderRadius:'7px',background:stem.muted?'rgba(248,113,113,0.15)':'linear-gradient(135deg,#C026D3,#7C3AED)',border:stem.muted?'1px solid rgba(248,113,113,0.4)':'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <i className={stem.muted?'ri-volume-mute-line':'ri-volume-up-line'} style={{color:'#fff',fontSize:'11px'}}></i>
                  </button>
                </div>
                {/* Mini FFT */}
                <div style={{background:'rgba(8,4,16,0.88)',borderRadius:'6px',height:'28px',overflow:'hidden',border:'1px solid rgba(192,38,211,0.08)',marginBottom:'8px'}}>
                  <canvas width={200} height={30} style={{width:'100%',height:'100%',display:'block'}}
                    ref={c=>{ if(c&&stem.fftData) drawMiniFFT(c,stem.fftData,'#C026D3'); }} />
                </div>
                {/* Volume */}
                <div style={{marginBottom:'8px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',marginBottom:'3px'}}>
                    <span style={{color:'#9B7EC8'}}>Vol</span>
                    <span style={{...C.mono,color:'#C026D3',fontWeight:500}}>{stem.volume>0?'+':''}{stem.volume.toFixed(1)} dB</span>
                  </div>
                  <div style={C.track}>
                    <div style={C.trackFill(((stem.volume+60)/72)*100)}></div>
                    <input type="range" min="-60" max="12" step="0.1" value={stem.volume}
                      onChange={e=>updateStemVolume(stem.id,parseFloat(e.target.value))}
                      style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}} />
                  </div>
                </div>
                {/* Pan */}
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',marginBottom:'3px'}}>
                    <span style={{color:'#9B7EC8'}}>Pan</span>
                    <span style={{...C.mono,color:'#C026D3',fontWeight:500}}>{stem.pan===0?'C':stem.pan>0?`R${(stem.pan*100).toFixed(0)}`:`L${(Math.abs(stem.pan)*100).toFixed(0)}`}</span>
                  </div>
                  <div style={C.track}>
                    <div style={C.trackFill(((stem.pan+1)/2)*100)}></div>
                    <input type="range" min="-1" max="1" step="0.01" value={stem.pan}
                      onChange={e=>updateStemPan(stem.id,parseFloat(e.target.value))}
                      style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      <UploadModal isOpen={showUploadModal} onClose={()=>setShowUploadModal(false)}
        onUploadComplete={handleUploadMoreStems} userCredits={user.credits} onCreditsUpdate={onCreditsUpdate} />
    </div>
  );
}
