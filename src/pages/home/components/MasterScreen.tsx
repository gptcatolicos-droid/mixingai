import { useState, useEffect, useRef, useCallback } from 'react';
import { drawWaveform } from '../../../utils/drawWaveform';

interface MasterData { audioBuffer: AudioBuffer; audioUrl: string; waveformPeaks: Float32Array; }
interface MixData { audioBuffer: AudioBuffer; audioUrl: string; waveformPeaks: Float32Array; finalLufs: number; presetName?: string; }
interface MasterScreenProps { masterData: MasterData; mixData: MixData | null; onBack: () => void; onBackToMixer?: () => void; }

const CHAIN = [
  { icon:'🔇', label:'Noise Reduction',    val:'Highpass 40Hz' },
  { icon:'📊', label:'EQ Mastering',        val:'+1.5dB Low · +0.8dB Pres · +1.2dB Air' },
  { icon:'🗜️', label:'Compresión',          val:'Ratio 2:1 · Thr -18dB' },
  { icon:'⛔', label:'True Peak Limiter',   val:'-1.0 dBFS' },
  { icon:'✅', label:'Output final',        val:'-12 LUFS', success:true },
];

export default function MasterScreen({ masterData, mixData, onBack, onBackToMixer }: MasterScreenProps) {
  const [activeTab, setActiveTab] = useState<'master'|'mix'>('master');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [momentaryLufs, setMomentaryLufs] = useState(-60.0);
  const [integratedLufs, setIntegratedLufs] = useState(-60.0);
  const [vuLeft, setVuLeft] = useState(0);
  const [vuRight, setVuRight] = useState(0);
  const [outputGain, setOutputGain] = useState(1.0);

  const audioCtxRef     = useRef<AudioContext|null>(null);
  const sourceRef       = useRef<AudioBufferSourceNode|null>(null);
  const analyserLRef    = useRef<AnalyserNode|null>(null);
  const analyserRRef    = useRef<AnalyserNode|null>(null);
  const gainNodeRef     = useRef<GainNode|null>(null);
  const masterCanvasRef = useRef<HTMLCanvasElement>(null);
  const mixCanvasRef    = useRef<HTMLCanvasElement>(null);
  const vuCanvasRef     = useRef<HTMLCanvasElement>(null);
  const timeRef         = useRef<number>();
  const vuAnimRef       = useRef<number>();
  const lufsHistRef     = useRef<number[]>([]);
  const startTimeRef    = useRef(0);
  const pausedAtRef     = useRef(0);
  const isPlayingRef    = useRef(false); // ref para usar en callbacks async

  const activeBuffer = activeTab==='master' ? masterData.audioBuffer : mixData?.audioBuffer;
  const dur = activeBuffer?.duration ?? 0;
  const fmt = (s: number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const lufsColor = (v: number) => v > -14 ? '#4ade80' : v > -23 ? '#FBBF24' : '#9B7EC8';
  const isOk = integratedLufs > -16 && integratedLufs < -8;

  // Waveforms
  useEffect(() => {
    if (masterCanvasRef.current && masterData.waveformPeaks)
      drawWaveform({ canvas:masterCanvasRef.current, waveformPeaks:masterData.waveformPeaks,
        currentTime:activeTab==='master'?currentTime:0, duration:masterData.audioBuffer.duration, style:'soundcloud',
        colors:{played:'#F59E0B', unplayed:'rgba(245,158,11,0.15)', playhead:'#EF6C00'} });
  }, [masterData, currentTime, activeTab]);

  useEffect(() => {
    if (mixCanvasRef.current && mixData?.waveformPeaks)
      drawWaveform({ canvas:mixCanvasRef.current, waveformPeaks:mixData.waveformPeaks,
        currentTime:activeTab==='mix'?currentTime:0, duration:mixData.audioBuffer.duration, style:'soundcloud',
        colors:{played:'#C026D3', unplayed:'rgba(192,38,211,0.15)', playhead:'#EC4899'} });
  }, [mixData, currentTime, activeTab]);

  // VU Canvas
  const drawVU = useCallback(() => {
    const canvas = vuCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const drawCh = (level: number, x: number, cw: number) => {
      const segs = 24, segH = Math.floor((h - segs) / segs);
      for (let i = 0; i < segs; i++) {
        const normalized = (segs - 1 - i) / segs;
        const lit = level > normalized;
        const isRed    = i < segs * 0.15;
        const isYellow = i < segs * 0.35;
        ctx.fillStyle = isRed ? (lit?'#EF4444':'rgba(239,68,68,0.07)') : isYellow ? (lit?'#FBBF24':'rgba(251,191,36,0.07)') : (lit?'#4ade80':'rgba(74,222,128,0.07)');
        ctx.fillRect(x, i*(segH+1), cw, segH);
      }
    };
    drawCh(vuLeft,  2, Math.floor((w-6)/2));
    drawCh(vuRight, Math.floor((w-6)/2)+4, Math.floor((w-6)/2));
  }, [vuLeft, vuRight]);

  useEffect(() => { drawVU(); }, [drawVU]);

  const resetMeters = () => {
    setMomentaryLufs(-60); setIntegratedLufs(-60);
    setVuLeft(0); setVuRight(0);
    lufsHistRef.current = [];
    drawVU();
  };

  const startVULoop = useCallback(() => {
    const loop = () => {
      if (!isPlayingRef.current) return; // parar si ya no suena
      const anlL = analyserLRef.current; const anlR = analyserRRef.current;
      if (!anlL || !anlR) return;
      const bL = new Float32Array(anlL.fftSize); const bR = new Float32Array(anlR.fftSize);
      anlL.getFloatTimeDomainData(bL); anlR.getFloatTimeDomainData(bR);
      const rL = Math.sqrt(bL.reduce((s,v)=>s+v*v,0)/bL.length);
      const rR = Math.sqrt(bR.reduce((s,v)=>s+v*v,0)/bR.length);
      setVuLeft(Math.min(1, rL*4)); setVuRight(Math.min(1, rR*4));
      const rms = (rL+rR)/2;
      if (rms > 0.0001) {
        const lufs = 20*Math.log10(rms) - 0.691;
        setMomentaryLufs(parseFloat(lufs.toFixed(1)));
        lufsHistRef.current.push(lufs);
        if (lufsHistRef.current.length > 200) lufsHistRef.current.shift();
        const intL = lufsHistRef.current.reduce((a,b)=>a+b,0)/lufsHistRef.current.length;
        setIntegratedLufs(parseFloat(intL.toFixed(1)));
      }
      vuAnimRef.current = requestAnimationFrame(loop);
    };
    vuAnimRef.current = requestAnimationFrame(loop);
  }, []);

  // BUG FIX 3: Stop completo al cambiar de tab
  useEffect(() => {
    stopAudio();
    setCurrentTime(0); pausedAtRef.current = 0;
    resetMeters();
  }, [activeTab]);

  const stopAudio = useCallback(() => {
    isPlayingRef.current = false;
    if (sourceRef.current) { try { sourceRef.current.stop(); sourceRef.current.disconnect(); } catch(e){} sourceRef.current = null; }
    if (timeRef.current) clearInterval(timeRef.current);
    if (vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
    setIsPlaying(false); setVuLeft(0); setVuRight(0);
  }, []);

  const handleStop = () => {
    stopAudio();
    setCurrentTime(0); pausedAtRef.current = 0;
    resetMeters();
  };

  const buildAndStartSource = useCallback((time: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !activeBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = activeBuffer;
    const anlL = ctx.createAnalyser(); anlL.fftSize = 512;
    const anlR = ctx.createAnalyser(); anlR.fftSize = 512;
    analyserLRef.current = anlL; analyserRRef.current = anlR;
    const gn = ctx.createGain(); gn.gain.value = outputGain;
    gainNodeRef.current = gn;
    if (activeBuffer.numberOfChannels >= 2) {
      const split = ctx.createChannelSplitter(2);
      src.connect(split); split.connect(anlL,0); split.connect(anlR,1);
      anlL.connect(gn); anlR.connect(gn); gn.connect(ctx.destination);
    } else { src.connect(anlL); anlL.connect(gn); gn.connect(ctx.destination); }
    src.start(0, time); startTimeRef.current = ctx.currentTime - time;
    sourceRef.current = src;
    isPlayingRef.current = true;
    setIsPlaying(true);
    startVULoop();
    timeRef.current = window.setInterval(() => {
      if (!audioCtxRef.current) return;
      const t = Math.min(audioCtxRef.current.currentTime - startTimeRef.current, dur);
      setCurrentTime(t);
      if (t >= dur - 0.05) {
        clearInterval(timeRef.current);
        if (vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
        isPlayingRef.current = false;
        setIsPlaying(false); setCurrentTime(0); pausedAtRef.current = 0;
        sourceRef.current = null; setVuLeft(0); setVuRight(0);
      }
    }, 80);
    src.onended = () => {
      clearInterval(timeRef.current);
      if (vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
      isPlayingRef.current = false;
      setIsPlaying(false); pausedAtRef.current = 0; setCurrentTime(0);
      sourceRef.current = null; setVuLeft(0); setVuRight(0);
    };
  }, [activeBuffer, outputGain, dur, startVULoop]);

  const togglePlay = async () => {
    if (isPlaying) { pausedAtRef.current = currentTime; stopAudio(); return; }
    if (!activeBuffer) return;
    const ctx = audioCtxRef.current || new AudioContext();
    audioCtxRef.current = ctx;
    if (ctx.state === 'suspended') await ctx.resume();
    buildAndStartSource(pausedAtRef.current);
  };

  // BUG FIX 2: Seek con VU reiniciado correctamente
  const seekTo = (pos: number) => {
    const time = Math.max(0, Math.min(pos, dur));
    pausedAtRef.current = time; setCurrentTime(time);
    if (isPlaying) {
      // Detener source actual
      isPlayingRef.current = false;
      if (sourceRef.current) { try { sourceRef.current.stop(); sourceRef.current.disconnect(); } catch(e){} sourceRef.current = null; }
      if (timeRef.current) clearInterval(timeRef.current);
      if (vuAnimRef.current) cancelAnimationFrame(vuAnimRef.current);
      // Resetear VU antes de reiniciar
      setVuLeft(0); setVuRight(0);
      lufsHistRef.current = [];
      // Reiniciar desde nueva posición
      setTimeout(() => buildAndStartSource(time), 30);
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeBuffer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo(((e.clientX - rect.left) / rect.width) * dur);
  };

  const handleGainChange = (val: number) => {
    setOutputGain(val);
    if (gainNodeRef.current && audioCtxRef.current)
      gainNodeRef.current.gain.setTargetAtTime(val, audioCtxRef.current.currentTime, 0.05);
  };

  const gainDb = outputGain > 0 ? (20 * Math.log10(outputGain)).toFixed(1) : '-∞';
  const tabColor = activeTab==='master' ? '#F59E0B' : '#C026D3';
  const tabGlow  = activeTab==='master' ? 'rgba(245,158,11,0.5)' : 'rgba(192,38,211,0.5)';

  return (
    // BUG FIX 4: Mismo fondo que el resto del sitio
    <div style={{ minHeight:'100vh', background:'#0D0A14', backgroundImage:'url(/studio-bg.png)', backgroundSize:'cover', backgroundPosition:'center', backgroundAttachment:'fixed', color:'#F8F0FF', fontFamily:"'Outfit', system-ui, sans-serif" }}>
      <div style={{ minHeight:'100vh', background:'rgba(8,4,16,0.78)' }}>

      {/* TOPBAR */}
      <div style={{ background:'rgba(13,10,20,0.97)', borderBottom:'1px solid rgba(245,158,11,0.18)', padding:'0 20px', height:'58px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100, backdropFilter:'blur(12px)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <button onClick={() => { stopAudio(); onBack(); }}
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#9B7EC8', padding:'7px 14px', borderRadius:'8px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
            ← Mezcla
          </button>
          {onBackToMixer && (
            <button onClick={() => { stopAudio(); onBackToMixer(); }}
              style={{ background:'rgba(192,38,211,0.1)', border:'1px solid rgba(192,38,211,0.25)', color:'#C026D3', padding:'7px 14px', borderRadius:'8px', fontSize:'12px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'6px' }}>
              🎛️ Volver al Mezclador
            </button>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'30px', height:'30px', background:'linear-gradient(135deg,#F59E0B,#EF6C00)', borderRadius:'9px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px' }}>✦</div>
          <span style={{ fontSize:'15px', fontWeight:800, color:'#F8F0FF', letterSpacing:'-0.3px' }}>Master Final</span>
          <span style={{ background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.35)', borderRadius:'980px', padding:'3px 12px', fontSize:'11px', fontWeight:700, color:'#F59E0B' }}>✦ -12 LUFS</span>
        </div>
        <button onClick={() => { const a=document.createElement('a'); a.href=masterData.audioUrl; a.download='master-mixingmusic.wav'; a.click(); }}
          style={{ background:'linear-gradient(135deg,#F59E0B,#EF6C00)', border:'none', color:'#fff', padding:'9px 20px', borderRadius:'980px', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'7px', boxShadow:'0 0 16px rgba(245,158,11,0.4)' }}>
          ⬇ Descargar WAV
        </button>
      </div>

      <div style={{ maxWidth:'900px', margin:'0 auto', padding:'28px 20px' }}>

        {/* TABS */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
          {[
            { id:'master' as const, label:'✦ Master', sub:'-12 LUFS', color:'#F59E0B', bg:'rgba(245,158,11,0.1)', bd:'rgba(245,158,11,0.3)' },
            { id:'mix'    as const, label:'🎛️ Mezcla',  sub:'-20 LUFS', color:'#C026D3', bg:'rgba(192,38,211,0.08)', bd:'rgba(192,38,211,0.3)' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ flex:1, padding:'13px', borderRadius:'14px', border:`1px solid ${activeTab===tab.id ? tab.bd : 'rgba(255,255,255,0.06)'}`, background:activeTab===tab.id ? tab.bg : 'rgba(26,16,40,0.6)', color:activeTab===tab.id ? tab.color : '#9B7EC8', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s', display:'flex', flexDirection:'column' as const, alignItems:'center', gap:'2px' }}>
              <span>{tab.label}</span>
              <span style={{ fontSize:'10px', opacity:0.7, fontFamily:'monospace' }}>{tab.sub}</span>
            </button>
          ))}
        </div>

        {/* PLAYER CARD */}
        <div style={{ background:'rgba(20,14,34,0.92)', border:`1px solid ${tabColor}33`, borderRadius:'20px', overflow:'hidden', marginBottom:'14px', borderTop:`3px solid ${tabColor}` }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:'15px', fontWeight:700, color:'#F8F0FF' }}>{activeTab==='master' ? '✦ Master Final' : '🎛️ Mezcla Original'}</div>
              <div style={{ fontSize:'11px', color:'#9B7EC8', marginTop:'2px' }}>{activeTab==='master' ? 'IA Mastering · -12 LUFS · WAV 24-bit' : `${mixData?.presetName||'Custom'} · -20 LUFS`}</div>
            </div>
            <span style={{ background:`${tabColor}18`, border:`1px solid ${tabColor}44`, borderRadius:'980px', padding:'4px 14px', fontSize:'11px', fontWeight:700, color:tabColor }}>
              {activeTab==='master' ? '✦ MASTERIZADO' : '🎛️ MEZCLA'}
            </span>
          </div>

          <div style={{ padding:'16px 20px 0' }}>
            {/* Waveform */}
            <div style={{ background:'rgba(8,4,16,0.8)', borderRadius:'10px', padding:'10px', border:`1px solid ${tabColor}18`, cursor:'pointer', marginBottom:'16px' }}>
              <div style={{ display:activeTab==='master'?'block':'none' }}>
                <canvas ref={masterCanvasRef} width={1400} height={100} style={{ width:'100%', height:'76px', display:'block', borderRadius:'6px' }} onClick={handleWaveformClick} />
              </div>
              <div style={{ display:activeTab==='mix'?'block':'none' }}>
                <canvas ref={mixCanvasRef} width={1400} height={100} style={{ width:'100%', height:'76px', display:'block', borderRadius:'6px' }} onClick={handleWaveformClick} />
              </div>
            </div>

            {/* Controls row: Play + Stop + Timeline + VU + LUFS */}
            <div style={{ display:'grid', gridTemplateColumns:'auto auto 1fr auto', gap:'12px', alignItems:'center', paddingBottom:'16px' }}>
              {/* Play */}
              <button onClick={togglePlay}
                style={{ width:'52px', height:'52px', borderRadius:'50%', background:`linear-gradient(135deg,${activeTab==='master'?'#F59E0B,#EF6C00':'#EC4899,#C026D3'})`, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0, boxShadow:`0 0 24px ${tabGlow}` }}>
                {isPlaying ? '⏸' : '▶'}
              </button>
              {/* BUG FIX 1: Botón STOP */}
              <button onClick={handleStop}
                style={{ width:'40px', height:'40px', borderRadius:'10px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0, color:'#9B7EC8' }}>
                ⏹
              </button>
              {/* Timeline */}
              <div>
                <div style={{ height:'5px', background:'rgba(255,255,255,0.08)', borderRadius:'3px', overflow:'hidden', marginBottom:'8px', cursor:'pointer' }}
                  onClick={e => { const rect=e.currentTarget.getBoundingClientRect(); seekTo(((e.clientX-rect.left)/rect.width)*dur); }}>
                  <div style={{ height:'100%', width:`${dur>0?(currentTime/dur)*100:0}%`, background:`linear-gradient(90deg,${activeTab==='master'?'#F59E0B,#EF6C00':'#EC4899,#C026D3'})`, borderRadius:'3px', transition:'width 0.08s linear' }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#9B7EC8', fontFamily:'monospace' }}>
                  <span>{fmt(currentTime)}</span><span>{fmt(dur)}</span>
                </div>
              </div>
              {/* VU + LUFS */}
              <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                <div style={{ display:'flex', flexDirection:'column' as const, alignItems:'center', gap:'4px' }}>
                  <canvas ref={vuCanvasRef} width={28} height={80} style={{ width:'28px', height:'80px', borderRadius:'4px', background:'rgba(8,4,16,0.7)', border:'1px solid rgba(255,255,255,0.06)' }} />
                  <span style={{ fontSize:'8px', color:'#9B7EC8', letterSpacing:'0.5px' }}>VU</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column' as const, gap:'6px' }}>
                  <div style={{ background:'rgba(8,4,16,0.7)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'8px', padding:'6px 10px', minWidth:'68px', textAlign:'center' as const }}>
                    <div style={{ fontSize:'16px', fontWeight:800, color:lufsColor(momentaryLufs), fontFamily:'monospace', lineHeight:1 }}>{momentaryLufs.toFixed(1)}</div>
                    <div style={{ fontSize:'8px', color:'#9B7EC8', marginTop:'2px', letterSpacing:'0.5px' }}>MOM</div>
                  </div>
                  <div style={{ background:'rgba(8,4,16,0.7)', border:`1px solid ${isOk?'rgba(74,222,128,0.25)':'rgba(255,255,255,0.06)'}`, borderRadius:'8px', padding:'6px 10px', minWidth:'68px', textAlign:'center' as const }}>
                    <div style={{ fontSize:'16px', fontWeight:800, color:isOk?'#4ade80':lufsColor(integratedLufs), fontFamily:'monospace', lineHeight:1 }}>{integratedLufs.toFixed(1)}</div>
                    <div style={{ fontSize:'8px', color:'#9B7EC8', marginTop:'2px', letterSpacing:'0.5px' }}>INT</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GAIN SLIDER */}
        <div style={{ background:'rgba(20,14,34,0.8)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'14px', padding:'14px 20px', marginBottom:'14px', display:'flex', alignItems:'center', gap:'16px' }}>
          <div style={{ flexShrink:0 }}>
            <div style={{ fontSize:'10px', fontWeight:700, color:'#9B7EC8', letterSpacing:'0.8px', textTransform:'uppercase' as const, marginBottom:'2px' }}>Output Gain</div>
            <div style={{ fontSize:'18px', fontWeight:800, fontFamily:'monospace', color:outputGain>0.9?'#EF4444':outputGain>0.7?'#FBBF24':'#4ade80', lineHeight:1 }}>{gainDb} dB</div>
          </div>
          <input type="range" min="0.1" max="1.0" step="0.01" value={outputGain}
            onChange={e => handleGainChange(parseFloat(e.target.value))}
            style={{ flex:1, accentColor:tabColor, height:'4px', cursor:'pointer' }} />
          <button onClick={() => handleGainChange(1.0)}
            style={{ flexShrink:0, background:'transparent', border:'1px solid rgba(255,255,255,0.1)', color:'#9B7EC8', padding:'4px 10px', borderRadius:'6px', fontSize:'11px', cursor:'pointer', fontFamily:'inherit', fontWeight:600 }}>
            Reset
          </button>
        </div>

        {/* CADENA — solo master */}
        {activeTab==='master' && (
          <div style={{ background:'rgba(20,14,34,0.92)', border:'1px solid rgba(245,158,11,0.12)', borderRadius:'16px', padding:'18px', marginBottom:'16px' }}>
            <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'1.2px', textTransform:'uppercase' as const, color:'#9B7EC8', marginBottom:'12px' }}>Cadena de mastering aplicada</div>
            {CHAIN.map((item, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', background:item.success?'rgba(74,222,128,0.08)':'rgba(8,4,16,0.5)', borderRadius:'10px', marginBottom:'4px', border:item.success?'1px solid rgba(74,222,128,0.2)':'1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize:'16px', flexShrink:0 }}>{item.icon}</span>
                <span style={{ fontSize:'12px', fontWeight:600, color:item.success?'#4ade80':'#C9B8F0', flex:1 }}>{item.label}</span>
                <span style={{ fontSize:'11px', color:item.success?'#4ade80':'#9B7EC8', fontFamily:'monospace' }}>{item.val}</span>
              </div>
            ))}
          </div>
        )}

        {/* DESCARGA */}
        <button onClick={() => { const a=document.createElement('a'); a.href=masterData.audioUrl; a.download='master-mixingmusic.wav'; a.click(); }}
          style={{ width:'100%', background:'linear-gradient(135deg,#F59E0B,#EF6C00)', border:'none', color:'#fff', padding:'20px', borderRadius:'16px', fontSize:'17px', fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 0 36px rgba(245,158,11,0.4)', display:'flex', alignItems:'center', justifyContent:'center', gap:'12px', marginBottom:'12px' }}>
          <span style={{ fontSize:'22px' }}>⬇</span>Descargar Master .WAV — -12 LUFS
        </button>
        <div style={{ textAlign:'center', fontSize:'12px', color:'rgba(248,240,255,0.35)', marginBottom:'32px' }}>
          ✅ Listo para Spotify · Apple Music · YouTube Music
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}
