/**
 * StudioPro.tsx — World-class Browser DAW
 * Merges ProTimeline (arrangement) + StudioDAW (full mixing) + WAM plugins + AI panel
 * MixingMusic.AI v3.0
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import FlowNav from '@/components/flow/FlowNav';
import { PRESETS, MixPreset } from './PresetScreen';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface User {
  id: string; firstName: string; lastName: string;
  email: string; country: string; credits: number;
  provider?: string; createdAt: string;
  is_pro?: boolean; plan?: string;
}

interface TrackData {
  id: string;
  name: string;
  instrument: string;
  icon: string;
  color: string;
  volume: number;    // 0-1 (display), 0 dB = 1.0
  pan: number;       // -1 to 1
  muted: boolean;
  solo: boolean;
  armed: boolean;
  height: number;
  // clip data
  audioBuffer: AudioBuffer | null;
  peaks: Float32Array | null;
  clipStart: number; // timeline position (sec)
  trimStart: number; // fraction 0-1
  trimEnd: number;   // fraction 0-1
  fadeIn: number;    // fraction 0-1
  fadeOut: number;   // fraction 0-1
  // EQ (dB)
  eqBass: number;
  eqMid: number;
  eqHigh: number;
  // gain correction (dB, from clip editor)
  gainDb: number;
}

interface TrackNodes {
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  pan: StereoPannerNode;
  eqLow: BiquadFilterNode;
  eqMid: BiquadFilterNode;
  eqHigh: BiquadFilterNode;
  analyser: AnalyserNode;
  dry: GainNode;
}

interface AIMessage { role: 'user' | 'assistant'; content: string; }

interface StudioProProps {
  projectId: string;
  user: User;
  uploadedFiles: File[];
  onBack: () => void;
  onCreditsUpdate: (n: number) => void;
  onExport: (d: any) => void;
  initialPreset?: MixPreset;
  reverbOn?: boolean;
  delayOn?: boolean;
  stereoOn?: boolean;
  onNavigate?: (id: string) => void;
  onLogout?: () => void;
  onSwitchToMixer?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════

const T = {
  bg:      '#07060f',
  panel:   '#0c0a18',
  surface: '#111026',
  surface2:'#191530',
  text:    '#f0ecff',
  text2:   '#9b8fc0',
  text3:   '#5c5278',
  pink:    '#e879f9',
  violet:  '#8b5cf6',
  green:   '#10b981',
  red:     '#f43f5e',
  amber:   '#f59e0b',
  blue:    '#60a5fa',
  cyan:    '#22d3ee',
  border:  'rgba(139,92,246,0.14)',
  borderM: 'rgba(139,92,246,0.28)',
  borderS: 'rgba(139,92,246,0.5)',
};

const TRACK_COLORS = [
  '#e879f9','#10b981','#f97316','#3b82f6','#f59e0b',
  '#a855f7','#14b8a6','#ec4899','#22c55e','#fb923c',
  '#60a5fa','#c084fc','#f472b6','#34d399',
];

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const STRIP_W   = 220;
const RULER_H   = 40;
const TRACK_H   = 80;
const DEF_ZOOM  = 80;  // px/sec
const MIN_ZOOM  = 10;
const MAX_ZOOM  = 600;
const LOOKAHEAD = 0.3;
const SCHED_MS  = 20;
const SIDEBAR_W = 320;

// IA EQ presets per device
const IAEQ_PRESETS = [
  { id:'default',  name:'Default',         lo:0,   mid:0,    hi:0   },
  { id:'car',      name:'Car',             lo:3,   mid:-1,   hi:2   },
  { id:'iphone',   name:'iPhone',          lo:-2,  mid:1,    hi:3   },
  { id:'macbook',  name:'MacBook',         lo:-1,  mid:2,    hi:2   },
  { id:'headphones',name:'Headphones',     lo:1,   mid:0,    hi:1   },
  { id:'tv',       name:'TV',              lo:2,   mid:1,    hi:-1  },
  { id:'theater',  name:'Home Theater',    lo:4,   mid:-1,   hi:2   },
  { id:'bt',       name:'Bluetooth',       lo:2,   mid:-2,   hi:1   },
  { id:'studio',   name:'Studio Monitors', lo:0,   mid:0,    hi:0   },
  { id:'gaming',   name:'Gaming Headset',  lo:3,   mid:1,    hi:4   },
  { id:'tablet',   name:'Tablet',          lo:-1,  mid:2,    hi:1   },
];

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO WORKLET PROCESSORS (inline as blob URLs)
// ═══════════════════════════════════════════════════════════════════════════

const SATURATOR_PROCESSOR = `
class SaturatorProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'drive', defaultValue: 1.5, minValue: 1.0, maxValue: 6.0 }];
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0], output = outputs[0];
    if (!input || !input[0]) return true;
    const drive = parameters.drive[0] || 1.5;
    for (let ch = 0; ch < input.length; ch++) {
      const inBuf = input[ch], outBuf = output[ch];
      for (let i = 0; i < inBuf.length; i++) {
        const x = inBuf[i] * drive;
        outBuf[i] = (2 / Math.PI) * Math.atan(x);
      }
    }
    return true;
  }
}
registerProcessor('saturator-processor', SaturatorProcessor);
`;

const WIDENER_PROCESSOR = `
class WidenerProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: 'width', defaultValue: 0.5, minValue: 0.0, maxValue: 1.0 }];
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0], output = outputs[0];
    if (!input || input.length < 2) return true;
    const width = parameters.width[0] ?? 0.5;
    const L = input[0], R = input[1];
    const outL = output[0], outR = output[1];
    for (let i = 0; i < L.length; i++) {
      const mid  = (L[i] + R[i]) * 0.5;
      const side = (L[i] - R[i]) * 0.5 * (1 + width);
      outL[i] = mid + side;
      outR[i] = mid - side;
    }
    return true;
  }
}
registerProcessor('widener-processor', WidenerProcessor);
`;

function makeBlobUrl(code: string) {
  return URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function genPeaks(buf: AudioBuffer, res = 1200): Float32Array {
  const data = buf.getChannelData(0);
  const out  = new Float32Array(res);
  const step = Math.max(1, Math.floor(data.length / res));
  for (let i = 0; i < res; i++) {
    let max = 0;
    const s = i * step, e = Math.min(s + step, data.length);
    for (let j = s; j < e; j++) { const v = Math.abs(data[j]); if (v > max) max = v; }
    out[i] = max;
  }
  return out;
}

function detectInst(name: string): { instrument: string; icon: string } {
  const n = name.toLowerCase();
  if (/voz|voc|vocal|lead|singer|choir|bgv|backing/.test(n)) return { instrument: 'Vocals', icon: '🎤' };
  if (/kick|drum|perc|beat|snare|hi.hat|hihat/.test(n))      return { instrument: 'Drums',  icon: '🥁' };
  if (/bass|bajo|808|sub/.test(n))                            return { instrument: 'Bass',   icon: '🎸' };
  if (/guitar|gtr|electric|acoustic/.test(n))                 return { instrument: 'Guitar', icon: '🎸' };
  if (/piano|keys|keyboard|synth|pad|organ/.test(n))          return { instrument: 'Keys',   icon: '🎹' };
  if (/brass|trumpet|horn|sax/.test(n))                       return { instrument: 'Brass',  icon: '🎺' };
  if (/string|violin|cello/.test(n))                          return { instrument: 'Strings',icon: '🎻' };
  return { instrument: 'Track', icon: '🎵' };
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60), sc = Math.floor(s % 60);
  return `${m}:${String(sc).padStart(2, '0')}`;
}

function fmtPos(s: number, bpm: number): string {
  const beat = 60 / bpm, bar = beat * 4;
  const bars = Math.floor(s / bar), beats = Math.floor((s % bar) / beat);
  return `${bars + 1} : ${String(beats + 1).padStart(2, '0')}`;
}

function dbToGain(db: number): number { return Math.pow(10, db / 20); }

// ═══════════════════════════════════════════════════════════════════════════
// SMALL UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function TBtn({ onClick, active, color, glow, title, children }: {
  onClick: () => void; active: boolean; color: string;
  glow?: boolean; title?: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick} title={title}
      style={{
        width: 34, height: 34, borderRadius: 7, border: 'none', cursor: 'pointer',
        background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
        color: active ? color : T.text3,
        fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
        boxShadow: glow && active ? `0 0 10px ${color}66` : 'none',
        transition: 'all 0.15s',
      }}
    >{children}</button>
  );
}

function Knob({ value, min, max, label, color, onChange }: {
  value: number; min: number; max: number; label: string; color: string;
  onChange: (v: number) => void;
}) {
  const pct  = (value - min) / (max - min);
  const angle = -140 + pct * 280;
  const dragging = useRef(false);
  const startY = useRef(0);
  const startV = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startV.current = value;
    const move = (me: MouseEvent) => {
      if (!dragging.current) return;
      const delta = (startY.current - me.clientY) / 120;
      onChange(Math.max(min, Math.min(max, startV.current + delta * (max - min))));
    };
    const up = () => { dragging.current = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  const cx = 22, cy = 22, r = 16;
  const rad = (angle - 90) * Math.PI / 180;
  const ex = cx + r * Math.cos(rad), ey = cy + r * Math.sin(rad);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, userSelect: 'none' }}>
      <svg width={44} height={44} onMouseDown={onMouseDown} style={{ cursor: 'ns-resize' }}>
        <circle cx={cx} cy={cy} r={r} fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.08)" strokeWidth={1.5}/>
        <path d={`M${cx} ${cy} L${ex} ${ey}`} stroke={color} strokeWidth={2.5} strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={4} fill={color} opacity={0.7}/>
      </svg>
      <span style={{ fontSize: 9, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      <span style={{ fontSize: 9, color, fontFamily: 'monospace' }}>{Number.isInteger(value) ? value : value.toFixed(2)}</span>
    </div>
  );
}

function HSlider({ value, min, max, step = 0.01, color, onChange }: {
  value: number; min: number; max: number; step?: number; color: string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ position: 'relative', height: 14, display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
        <div style={{ height: '100%', background: color, borderRadius: 2, width: `${((value - min) / (max - min)) * 100}%` }} />
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
      />
    </div>
  );
}

function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  return <span style={{ fontSize: 9, color: color || T.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{children}</span>;
}

function Row({ children, gap = 8 }: { children: React.ReactNode; gap?: number }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap }}>{children}</div>;
}

// ═══════════════════════════════════════════════════════════════════════════
// FFT VISUALIZER
// ═══════════════════════════════════════════════════════════════════════════

function FFTCanvas({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    if (!analyser) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      if (canvas.width !== W * 2) { canvas.width = W * 2; canvas.height = H * 2; ctx.scale(2, 2); }
      analyser.getByteFrequencyData(data);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#060510';
      ctx.fillRect(0, 0, W, H);

      const bars = 64;
      const bw   = W / bars - 1;
      for (let i = 0; i < bars; i++) {
        const idx  = Math.floor((i / bars) * data.length * 0.6);
        const val  = data[idx] / 255;
        const h    = val * (H - 4);
        const hue  = 260 + val * 80;
        const alpha = 0.6 + val * 0.4;
        ctx.fillStyle = `hsla(${hue},80%,65%,${alpha})`;
        ctx.fillRect(i * (bw + 1), H - h - 2, bw, h);
      }
      // center line
      ctx.strokeStyle = 'rgba(139,92,246,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', borderRadius: 8 }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LUFS METER
// ═══════════════════════════════════════════════════════════════════════════

function LUFSMeter({ analyser }: { analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const peak      = useRef(0);

  useEffect(() => {
    if (!analyser) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const td  = new Float32Array(analyser.fftSize);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      if (canvas.width !== W * 2) { canvas.width = W * 2; canvas.height = H * 2; ctx.scale(2, 2); }
      analyser.getFloatTimeDomainData(td);

      let rms = 0;
      for (let i = 0; i < td.length; i++) rms += td[i] * td[i];
      rms = Math.sqrt(rms / td.length);
      const lufs = rms > 0.00001 ? 20 * Math.log10(rms) - 0.691 : -100;
      const norm = Math.max(0, Math.min(1, (lufs + 60) / 60));
      if (norm > peak.current) peak.current = norm;
      else peak.current *= 0.995;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#060510'; ctx.fillRect(0, 0, W, H);

      // meter bar
      const barH = norm * (H - 20);
      const grad = ctx.createLinearGradient(0, H, 0, H - barH);
      grad.addColorStop(0, '#10b981');
      grad.addColorStop(0.6, '#f59e0b');
      grad.addColorStop(1, '#f43f5e');
      ctx.fillStyle = grad;
      ctx.fillRect(8, H - barH - 4, W - 16, barH);

      // peak hold
      const pkY = H - peak.current * (H - 20) - 4;
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(8, pkY, W - 16, 2);

      // text
      ctx.fillStyle = T.text2;
      ctx.font = `bold 10px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`${lufs.toFixed(1)}`, W / 2, H - barH - 8 < 12 ? 12 : H - barH - 8);
      ctx.fillText('LUFS', W / 2, H - 2);
    };
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 40, height: '100%', display: 'block' }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CLIP EDITOR MODAL
// ═══════════════════════════════════════════════════════════════════════════

function ClipEditor({ track, onClose, onUpdate }: {
  track: TrackData;
  onClose: () => void;
  onUpdate: (changes: Partial<TrackData>) => void;
}) {
  const [name, setName]       = useState(track.name);
  const [gainDb, setGainDb]   = useState(track.gainDb);
  const [trimStart, setTs]    = useState(track.trimStart);
  const [trimEnd, setTe]      = useState(track.trimEnd);
  const [fadeIn, setFi]       = useState(track.fadeIn);
  const [fadeOut, setFo]      = useState(track.fadeOut);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging  = useRef<null | 'ts' | 'te' | 'fi' | 'fo'>(null);

  useEffect(() => {
    const c = canvasRef.current; if (!c || !track.peaks) return;
    const ctx = c.getContext('2d')!;
    const W = c.clientWidth, H = c.clientHeight;
    c.width = W; c.height = H;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#080615'; ctx.fillRect(0, 0, W, H);

    // dark zones outside trim
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, trimStart * W, H);
    ctx.fillRect(trimEnd * W, 0, (1 - trimEnd) * W, H);

    // waveform
    const p = track.peaks;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, H);
    for (let x = 0; x < W; x++) {
      const idx = Math.floor((x / W) * p.length);
      let amp = p[idx] ?? 0;
      const pct = x / W;
      if (fadeIn > 0 && pct < trimStart + fadeIn) amp *= (pct - trimStart) / fadeIn;
      if (fadeOut > 0 && pct > trimEnd - fadeOut) amp *= (trimEnd - pct) / fadeOut;
      const inRange = pct >= trimStart && pct <= trimEnd;
      ctx.fillStyle = inRange ? `rgba(139,92,246,${0.3 + amp * 0.7})` : 'rgba(60,40,80,0.3)';
      const h2 = Math.max(1, amp * H * 0.45);
      ctx.fillRect(x, H / 2 - h2, 1, h2 * 2);
    }

    // fade overlays
    if (fadeIn > 0) {
      const g = ctx.createLinearGradient(trimStart * W, 0, (trimStart + fadeIn) * W, 0);
      g.addColorStop(0, 'rgba(251,191,36,0.3)'); g.addColorStop(1, 'rgba(251,191,36,0)');
      ctx.fillStyle = g; ctx.fillRect(trimStart * W, 0, fadeIn * W, H);
    }
    if (fadeOut > 0) {
      const g = ctx.createLinearGradient((trimEnd - fadeOut) * W, 0, trimEnd * W, 0);
      g.addColorStop(0, 'rgba(232,121,249,0)'); g.addColorStop(1, 'rgba(232,121,249,0.3)');
      ctx.fillStyle = g; ctx.fillRect((trimEnd - fadeOut) * W, 0, fadeOut * W, H);
    }

    // handles
    const handles: [number, string][] = [
      [trimStart * W, '#fff'], [trimEnd * W, '#fff'],
      [(trimStart + fadeIn) * W, '#f59e0b'], [(trimEnd - fadeOut) * W, '#e879f9'],
    ];
    handles.forEach(([x, col]) => {
      ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    });
  }, [track.peaks, trimStart, trimEnd, fadeIn, fadeOut]);

  const onMouseDown = (e: React.MouseEvent) => {
    const c = canvasRef.current; if (!c) return;
    const px = (e.clientX - c.getBoundingClientRect().left) / c.clientWidth;
    const pts = [
      { id: 'ts', pos: trimStart }, { id: 'te', pos: trimEnd },
      { id: 'fi', pos: trimStart + fadeIn }, { id: 'fo', pos: trimEnd - fadeOut },
    ];
    const near = pts.reduce((a, b) => Math.abs(b.pos - px) < Math.abs(a.pos - px) ? b : a);
    if (Math.abs(near.pos - px) < 0.05) dragging.current = near.id as any;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !canvasRef.current) return;
    const px = Math.max(0, Math.min(1, (e.clientX - canvasRef.current.getBoundingClientRect().left) / canvasRef.current.clientWidth));
    if (dragging.current === 'ts') setTs(Math.min(px, trimEnd - 0.05));
    else if (dragging.current === 'te') setTe(Math.max(px, trimStart + 0.05));
    else if (dragging.current === 'fi') setFi(Math.max(0, Math.min(px - trimStart, 0.4)));
    else if (dragging.current === 'fo') setFo(Math.max(0, Math.min(trimEnd - px, 0.4)));
  };

  const dur = track.audioBuffer?.duration ?? 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,4,14,0.95)', backdropFilter: 'blur(16px)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: T.surface, border: `1px solid ${T.borderS}`, borderRadius: 18, padding: 24, maxWidth: 680, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: 0 }}>
            <span style={{ color: track.color }}>{track.icon}</span> Editor — {track.name}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.text3, fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ borderRadius: 10, overflow: 'hidden', height: 120, marginBottom: 16, cursor: 'col-resize', position: 'relative' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove}
            onMouseUp={() => { dragging.current = null; }} onMouseLeave={() => { dragging.current = null; }}
          />
          <div style={{ position: 'absolute', bottom: 4, left: 8, display: 'flex', gap: 10, fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>
            <span style={{ color: '#fff' }}>◀▶ Trim</span>
            <span style={{ color: '#f59e0b' }}>━ Fade In</span>
            <span style={{ color: '#e879f9' }}>━ Fade Out</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
          {[
            ['Inicio', fmtTime(trimStart * dur)],
            ['Fin',    fmtTime(trimEnd * dur)],
            ['Fade In', fmtTime(fadeIn * dur)],
            ['Fade Out',fmtTime(fadeOut * dur)],
          ].map(([k, v]) => (
            <div key={k}>
              <Label color={k === 'Fade In' ? '#f59e0b' : k === 'Fade Out' ? '#e879f9' : undefined}>{k}</Label>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: T.text, fontWeight: 600, marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <Label>Nombre</Label>
            <input value={name} onChange={e => setName(e.target.value)}
              style={{ width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.border}`, color: T.text, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Label>Ganancia</Label>
              <span style={{ fontSize: 10, color: track.color, fontFamily: 'monospace' }}>{gainDb > 0 ? '+' : ''}{gainDb} dB</span>
            </div>
            <HSlider value={gainDb} min={-24} max={12} step={1} color={track.color} onChange={setGainDb} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { onUpdate({ name, gainDb, trimStart, trimEnd, fadeIn, fadeOut }); onClose(); }}
            style={{ flex: 1, padding: '11px', borderRadius: 10, background: `linear-gradient(135deg,${T.violet},${T.pink})`, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Aplicar cambios
          </button>
          <button onClick={() => { setTs(0); setTe(1); setFi(0); setFo(0); setGainDb(0); }}
            style={{ padding: '11px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, color: T.text2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            Reset
          </button>
          <button onClick={onClose}
            style={{ padding: '11px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`, color: T.text2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function StudioPro({
  projectId, user, uploadedFiles, onBack, onCreditsUpdate, onExport,
  initialPreset, reverbOn = false, delayOn = false, stereoOn = false,
  onNavigate, onLogout, onSwitchToMixer,
}: StudioProProps) {

  // ── Transport state ──
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [bpm,         setBpm]         = useState(120);
  const [masterVol,   setMasterVol]   = useState(0.8);
  const [zoom,        setZoom]        = useState(DEF_ZOOM);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [scrollX,     setScrollX]     = useState(0);

  // ── Tracks ──
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [editingClip,   setEditingClip]   = useState<string | null>(null);

  // ── Master FX ──
  const [masterBass,  setMasterBass]  = useState(initialPreset?.bass  ?? 0);
  const [masterMid,   setMasterMid]   = useState(initialPreset?.mid   ?? 0);
  const [masterHigh,  setMasterHigh]  = useState(initialPreset?.high  ?? 0);
  const [reverbLevel, setReverbLevel] = useState(initialPreset?.reverbWet ?? (reverbOn ? 0.2 : 0));
  const [delayLevel,  setDelayLevel]  = useState(initialPreset?.delayWet  ?? (delayOn  ? 0.15 : 0));
  const [delayTime,   setDelayTime]   = useState(0.35);
  const [widenerOn,   setWidenerOn]   = useState(initialPreset ? initialPreset.stereoWidth > 0.5 : stereoOn);
  const [widenerAmt,  setWidenerAmt]  = useState(0.5);
  const [compOn,      setCompOn]      = useState(true);
  const [iaEqId,      setIaEqId]      = useState('default');

  // ── WAM plugins ──
  const [satOn,  setSatOn]  = useState(false);
  const [satDrive, setSatDrive] = useState(1.8);

  // ── Sidebar ──
  const [sidebarTab, setSidebarTab] = useState<'MIX' | 'TRACK' | 'METERS' | 'AI' | 'PLUGINS'>('MIX');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── AI ──
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [aiInput,    setAiInput]    = useState('');
  const [aiLoading,  setAiLoading]  = useState(false);

  // ── Export ──
  const [exporting, setExporting] = useState(false);

  // ── Audio refs ──
  const actxRef        = useRef<AudioContext | null>(null);
  const masterGainRef  = useRef<GainNode | null>(null);
  const limiterRef     = useRef<DynamicsCompressorNode | null>(null);
  const masterAnalyser = useRef<AnalyserNode | null>(null);
  const masterBassRef  = useRef<BiquadFilterNode | null>(null);
  const masterMidRef   = useRef<BiquadFilterNode | null>(null);
  const masterHighRef  = useRef<BiquadFilterNode | null>(null);
  const iaEqLoRef      = useRef<BiquadFilterNode | null>(null);
  const iaEqMidRef     = useRef<BiquadFilterNode | null>(null);
  const iaEqHiRef      = useRef<BiquadFilterNode | null>(null);
  const reverbNodeRef  = useRef<ConvolverNode | null>(null);
  const reverbGainRef  = useRef<GainNode | null>(null);
  const delayNodeRef   = useRef<DelayNode | null>(null);
  const delayGainRef   = useRef<GainNode | null>(null);
  const satNodeRef     = useRef<AudioWorkletNode | null>(null);
  const widenerNodeRef = useRef<AudioWorkletNode | null>(null);
  const trackNodes     = useRef<Map<string, TrackNodes>>(new Map());
  const scheduledSrcs  = useRef<Map<string, AudioBufferSourceNode>>(new Map());

  // ── Timeline refs ──
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const canvasWrapRef  = useRef<HTMLDivElement>(null);
  const startTimeRef   = useRef<number>(0); // actx time when play started
  const startPosRef    = useRef<number>(0); // playhead position when play started
  const playheadRef    = useRef<number>(0);
  const rafRef         = useRef<number>(0);
  const schedRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollXRef     = useRef(0);
  const zoomRef        = useRef(DEF_ZOOM);
  const tracksRef      = useRef<TrackData[]>([]);
  const isPlayingRef   = useRef(false);

  // keep refs in sync
  useEffect(() => { scrollXRef.current = scrollX; }, [scrollX]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // ── Init AudioContext ──
  useEffect(() => {
    const actx = new AudioContext({ sampleRate: 48000 });
    actxRef.current = actx;

    // Master chain
    const mBass  = actx.createBiquadFilter(); mBass.type  = 'lowshelf';   mBass.frequency.value  = 120;
    const mMid   = actx.createBiquadFilter(); mMid.type   = 'peaking';    mMid.frequency.value   = 1000; mMid.Q.value = 0.8;
    const mHigh  = actx.createBiquadFilter(); mHigh.type  = 'highshelf';  mHigh.frequency.value  = 8000;
    const iaLo   = actx.createBiquadFilter(); iaLo.type   = 'lowshelf';   iaLo.frequency.value   = 120;
    const iaMid  = actx.createBiquadFilter(); iaMid.type  = 'peaking';    iaMid.frequency.value  = 1000; iaMid.Q.value = 0.8;
    const iaHi   = actx.createBiquadFilter(); iaHi.type   = 'highshelf';  iaHi.frequency.value   = 8000;
    const masterGain = actx.createGain(); masterGain.gain.value = 0.8;
    const limiter    = actx.createDynamicsCompressor();
    limiter.threshold.value = -1; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.001; limiter.release.value = 0.1;
    const masterAn = actx.createAnalyser(); masterAn.fftSize = 2048;

    // Reverb (pre-delay simulation)
    const revDelay = actx.createDelay(0.05); revDelay.delayTime.value = 0.03;
    const revGain  = actx.createGain(); revGain.gain.value = 0;
    const revFilt  = actx.createBiquadFilter(); revFilt.type = 'highpass'; revFilt.frequency.value = 200;
    revDelay.connect(revFilt); revFilt.connect(revGain); revGain.connect(mBass);

    // Delay
    const dly     = actx.createDelay(1.0); dly.delayTime.value = 0.35;
    const dlyGain = actx.createGain(); dlyGain.gain.value = 0;
    dly.connect(dlyGain); dlyGain.connect(mBass);

    // Connect chain
    mBass.connect(mMid); mMid.connect(mHigh); mHigh.connect(iaLo);
    iaLo.connect(iaMid); iaMid.connect(iaHi); iaHi.connect(masterGain);
    masterGain.connect(limiter); limiter.connect(masterAn); masterAn.connect(actx.destination);

    masterGainRef.current  = masterGain;
    limiterRef.current     = limiter;
    masterAnalyser.current = masterAn;
    masterBassRef.current  = mBass;
    masterMidRef.current   = mMid;
    masterHighRef.current  = mHigh;
    iaEqLoRef.current      = iaLo;
    iaEqMidRef.current     = iaMid;
    iaEqHiRef.current      = iaHi;
    reverbNodeRef.current  = null;
    reverbGainRef.current  = revGain;
    delayNodeRef.current   = dly;
    delayGainRef.current   = dlyGain;

    // Load WAM worklets
    (async () => {
      try {
        const satUrl = makeBlobUrl(SATURATOR_PROCESSOR);
        const widUrl = makeBlobUrl(WIDENER_PROCESSOR);
        await actx.audioWorklet.addModule(satUrl);
        await actx.audioWorklet.addModule(widUrl);
        URL.revokeObjectURL(satUrl);
        URL.revokeObjectURL(widUrl);
        // Sat node (bypass by default — not connected to destination)
        const sat = new AudioWorkletNode(actx, 'saturator-processor');
        satNodeRef.current = sat;
        // Widener node
        const wid = new AudioWorkletNode(actx, 'widener-processor', { outputChannelCount: [2] });
        widenerNodeRef.current = wid;
      } catch (e) {
        console.warn('AudioWorklet not available:', e);
      }
    })();

    return () => { actx.close(); };
  }, []);

  // ── Apply master EQ params ──
  useEffect(() => {
    if (masterBassRef.current) masterBassRef.current.gain.value = masterBass;
    if (masterMidRef.current)  masterMidRef.current.gain.value  = masterMid;
    if (masterHighRef.current) masterHighRef.current.gain.value = masterHigh;
  }, [masterBass, masterMid, masterHigh]);

  // ── Apply IA EQ ──
  useEffect(() => {
    const p = IAEQ_PRESETS.find(x => x.id === iaEqId) ?? IAEQ_PRESETS[0];
    if (iaEqLoRef.current)  iaEqLoRef.current.gain.value  = p.lo;
    if (iaEqMidRef.current) iaEqMidRef.current.gain.value = p.mid;
    if (iaEqHiRef.current)  iaEqHiRef.current.gain.value  = p.hi;
  }, [iaEqId]);

  // ── Apply reverb level ──
  useEffect(() => {
    if (reverbGainRef.current) reverbGainRef.current.gain.value = reverbLevel;
  }, [reverbLevel]);

  // ── Apply delay ──
  useEffect(() => {
    if (delayGainRef.current) delayGainRef.current.gain.value = delayLevel;
    if (delayNodeRef.current) delayNodeRef.current.delayTime.value = delayTime;
  }, [delayLevel, delayTime]);

  // ── Apply master volume ──
  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = masterVol;
  }, [masterVol]);

  // ── Apply saturator ──
  useEffect(() => {
    const sat = satNodeRef.current;
    if (!sat) return;
    if (satOn) {
      (sat.parameters as any).get('drive').value = satDrive;
    }
  }, [satOn, satDrive]);

  // ── Load uploaded files ──
  useEffect(() => {
    if (!uploadedFiles.length) return;
    const actx = actxRef.current; if (!actx) return;

    uploadedFiles.forEach(async (file, i) => {
      try {
        const ab  = await file.arrayBuffer();
        const buf = await actx.decodeAudioData(ab);
        const peaks = genPeaks(buf, 1200);
        const { instrument, icon } = detectInst(file.name);
        const color = TRACK_COLORS[i % TRACK_COLORS.length];
        const id    = `trk-${Date.now()}-${i}`;

        const track: TrackData = {
          id, name: file.name.replace(/\.[^.]+$/, '').slice(0, 30),
          instrument, icon, color,
          volume: 0.8, pan: 0, muted: false, solo: false, armed: false, height: TRACK_H,
          audioBuffer: buf, peaks,
          clipStart: 0, trimStart: 0, trimEnd: 1, fadeIn: 0, fadeOut: 0,
          eqBass: 0, eqMid: 0, eqHigh: 0, gainDb: 0,
        };

        // Build audio nodes
        const gain    = actx.createGain(); gain.gain.value = 0.8;
        const pan     = actx.createStereoPanner();
        const eqLow   = actx.createBiquadFilter(); eqLow.type  = 'lowshelf';  eqLow.frequency.value  = 120;
        const eqMid   = actx.createBiquadFilter(); eqMid.type  = 'peaking';   eqMid.frequency.value  = 1000; eqMid.Q.value = 0.8;
        const eqHigh  = actx.createBiquadFilter(); eqHigh.type = 'highshelf'; eqHigh.frequency.value = 8000;
        const analyser= actx.createAnalyser(); analyser.fftSize = 512;
        const dry     = actx.createGain(); dry.gain.value = 1;

        gain.connect(pan); pan.connect(eqLow); eqLow.connect(eqMid); eqMid.connect(eqHigh);
        eqHigh.connect(analyser); analyser.connect(dry);

        // dry → master chain
        if (masterBassRef.current) dry.connect(masterBassRef.current);
        // dry → reverb send
        if (reverbGainRef.current) dry.connect(reverbNodeRef.current ?? reverbGainRef.current);
        // dry → delay send
        if (delayNodeRef.current) dry.connect(delayNodeRef.current);

        trackNodes.current.set(id, { source: null, gain, pan, eqLow, eqMid, eqHigh, analyser, dry });

        setTracks(prev => [...prev, track]);
      } catch (e) {
        console.error('Failed to load', file.name, e);
      }
    });
  }, [uploadedFiles]);

  // ── Get track analyser for sidebar ──
  const selectedNodes = selectedTrack ? trackNodes.current.get(selectedTrack) : null;

  // ── Update track node when track data changes ──
  const applyTrackNodes = useCallback((t: TrackData) => {
    const nodes = trackNodes.current.get(t.id); if (!nodes) return;
    const isSoloing = tracksRef.current.some(x => x.solo);
    const active = t.muted ? false : (!isSoloing || t.solo);
    nodes.gain.gain.value  = active ? t.volume * dbToGain(t.gainDb) : 0;
    nodes.pan.pan.value    = t.pan;
    nodes.eqLow.gain.value  = t.eqBass;
    nodes.eqMid.gain.value  = t.eqMid;
    nodes.eqHigh.gain.value = t.eqHigh;
  }, []);

  const updateTrack = useCallback((id: string, changes: Partial<TrackData>) => {
    setTracks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...changes } : t);
      const updated = next.find(t => t.id === id);
      if (updated) applyTrackNodes(updated);
      return next;
    });
  }, [applyTrackNodes]);

  // ── Scheduling ──
  const scheduleClips = useCallback(() => {
    const actx = actxRef.current; if (!actx || !isPlayingRef.current) return;
    const now       = actx.currentTime;
    const elapsed   = now - startTimeRef.current;
    const head      = startPosRef.current + elapsed;
    const lookahead = head + LOOKAHEAD;

    tracksRef.current.forEach(track => {
      if (!track.audioBuffer || track.muted) return;
      const nodes = trackNodes.current.get(track.id); if (!nodes) return;
      const isSoloing = tracksRef.current.some(x => x.solo);
      if (isSoloing && !track.solo) return;

      const buf      = track.audioBuffer;
      const dur      = buf.duration;
      const trimS    = track.trimStart * dur;
      const trimE    = track.trimEnd * dur;
      const clipDur  = trimE - trimS;
      const clipEnd  = track.clipStart + clipDur;

      if (clipEnd < head || track.clipStart > lookahead) return;
      if (scheduledSrcs.current.has(track.id)) return;

      const src = actxRef.current!.createBufferSource();
      src.buffer = buf;
      nodes.gain.connect(nodes.pan); // re-connect safety
      src.connect(nodes.gain);

      const when    = Math.max(now, now + (track.clipStart - head));
      const offset  = Math.max(trimS, trimS + (head - track.clipStart));
      const playDur = Math.max(0, clipDur - (offset - trimS));
      if (playDur <= 0) return;

      src.start(when, offset, playDur);
      scheduledSrcs.current.set(track.id, src);
      src.onended = () => { scheduledSrcs.current.delete(track.id); };
    });
  }, []);

  // ── Play/Pause/Stop ──
  const handlePlay = useCallback(async () => {
    const actx = actxRef.current; if (!actx) return;
    if (actx.state === 'suspended') await actx.resume();
    startTimeRef.current = actx.currentTime;
    startPosRef.current  = playheadRef.current;
    isPlayingRef.current = true;
    setIsPlaying(true);

    schedRef.current = setInterval(scheduleClips, SCHED_MS);
    scheduleClips();

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const elapsed = actxRef.current!.currentTime - startTimeRef.current;
      playheadRef.current = startPosRef.current + elapsed;
      drawCanvas();
      // auto-scroll
      const cw = canvasWrapRef.current?.clientWidth ?? 800;
      const px = playheadRef.current * zoomRef.current - scrollXRef.current;
      if (px > cw * 0.75) setScrollX(s => s + cw * 0.2);
    };
    rafRef.current = requestAnimationFrame(draw);
  }, [scheduleClips]);

  const handlePause = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (schedRef.current) { clearInterval(schedRef.current); schedRef.current = null; }
    cancelAnimationFrame(rafRef.current);
    scheduledSrcs.current.forEach(src => { try { src.stop(); } catch {} });
    scheduledSrcs.current.clear();
    drawCanvas();
  }, []);

  const handleStop = useCallback(() => {
    handlePause();
    playheadRef.current = 0;
    setScrollX(0);
    drawCanvas();
  }, [handlePause]);

  // ── Canvas drawing ──
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth, H = canvas.offsetHeight;
    if (canvas.width !== Math.round(W * dpr)) {
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.scale(dpr, dpr);
    }
    ctx.clearRect(0, 0, W, H);

    const sx   = scrollXRef.current;
    const zoom = zoomRef.current;
    const tks  = tracksRef.current;
    const rulerH = RULER_H;

    // ── Background ──
    ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);

    // ── Grid lines (seconds) ──
    const secW = zoom;
    const startSec = Math.floor(sx / secW);
    const endSec   = Math.ceil((sx + W) / secW) + 1;
    for (let s = startSec; s <= endSec; s++) {
      const x = s * secW - sx;
      ctx.strokeStyle = s % 4 === 0 ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)';
      ctx.lineWidth = s % 4 === 0 ? 1 : 0.5;
      ctx.beginPath(); ctx.moveTo(x, rulerH); ctx.lineTo(x, H); ctx.stroke();
    }

    // ── Ruler ──
    ctx.fillStyle = T.ruler; ctx.fillRect(0, 0, W, rulerH);
    ctx.strokeStyle = T.border; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, rulerH); ctx.lineTo(W, rulerH); ctx.stroke();
    ctx.font = '10px -apple-system,system-ui,sans-serif';
    for (let s = startSec; s <= endSec; s++) {
      if (s % 2 !== 0) continue;
      const x = s * secW - sx;
      if (x < 0 || x > W) continue;
      ctx.fillStyle = T.text3; ctx.textAlign = 'center';
      ctx.fillText(fmtTime(s), x, rulerH - 6);
      ctx.strokeStyle = 'rgba(139,92,246,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, rulerH - 4); ctx.lineTo(x, rulerH); ctx.stroke();
    }

    // ── Tracks ──
    let trackY = rulerH;
    tks.forEach(track => {
      const th = track.height;

      // track background
      ctx.fillStyle = track.id === selectedTrack ? 'rgba(139,92,246,0.06)' : T.surface;
      ctx.fillRect(0, trackY, W, th);
      ctx.strokeStyle = T.border; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(0, trackY + th); ctx.lineTo(W, trackY + th); ctx.stroke();

      // draw clip
      if (track.audioBuffer && track.peaks) {
        const dur     = track.audioBuffer.duration;
        const trimS   = track.trimStart * dur;
        const trimE   = track.trimEnd * dur;
        const clipDur = trimE - trimS;
        const cx      = track.clipStart * zoom - sx;
        const cw      = clipDur * zoom;
        if (cx + cw > 0 && cx < W) {
          // clip body
          ctx.fillStyle = track.muted ? 'rgba(80,70,100,0.25)' : `${track.color}22`;
          ctx.strokeStyle = track.muted ? 'rgba(140,130,160,0.3)' : `${track.color}88`;
          ctx.lineWidth = 1.5;
          const rx = Math.max(0, cx), rw = Math.min(cw, W - rx);
          ctx.fillRect(rx, trackY + 2, rw, th - 4);
          ctx.strokeRect(rx, trackY + 2, rw, th - 4);

          // waveform inside clip
          const p = track.peaks;
          ctx.save();
          ctx.beginPath(); ctx.rect(Math.max(0, cx), trackY + 2, Math.min(cw, W - Math.max(0, cx)), th - 4); ctx.clip();
          const waveColor = track.muted ? 'rgba(180,160,210,0.2)' : `${track.color}cc`;
          for (let px2 = Math.max(0, cx); px2 < Math.min(cx + cw, W); px2++) {
            const frac  = (px2 - cx) / cw;
            const idx   = Math.floor((track.trimStart + frac * (track.trimEnd - track.trimStart)) * p.length);
            let amp = p[Math.min(idx, p.length - 1)] ?? 0;
            if (track.fadeIn > 0 && frac < track.fadeIn) amp *= frac / track.fadeIn;
            if (track.fadeOut > 0 && frac > 1 - track.fadeOut) amp *= (1 - frac) / track.fadeOut;
            const h2 = Math.max(1, amp * (th - 8) * 0.45);
            ctx.fillStyle = waveColor;
            ctx.fillRect(px2, trackY + th / 2 - h2, 1, h2 * 2);
          }
          ctx.restore();

          // clip label
          ctx.fillStyle = track.color; ctx.font = 'bold 10px -apple-system,sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(track.name.slice(0, 22), Math.max(0, cx) + 6, trackY + 14);
        }
      }

      trackY += th;
    });

    // ── Playhead ──
    const phX = playheadRef.current * zoom - sx;
    if (phX >= 0 && phX <= W) {
      ctx.strokeStyle = T.red; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(phX, 0); ctx.lineTo(phX, H); ctx.stroke();
      ctx.fillStyle = T.red;
      ctx.beginPath(); ctx.moveTo(phX - 7, 0); ctx.lineTo(phX + 7, 0); ctx.lineTo(phX, 10); ctx.closePath(); ctx.fill();
    }
  }, [selectedTrack]);

  // ── RAF loop (idle) ──
  useEffect(() => {
    const idle = () => {
      if (!isPlayingRef.current) drawCanvas();
      rafRef.current = requestAnimationFrame(idle);
    };
    rafRef.current = requestAnimationFrame(idle);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawCanvas]);

  // ── ResizeObserver ──
  useEffect(() => {
    const obs = new ResizeObserver(() => drawCanvas());
    if (canvasWrapRef.current) obs.observe(canvasWrapRef.current);
    return () => obs.disconnect();
  }, [drawCanvas]);

  // ── Apply initial preset ──
  useEffect(() => {
    if (!initialPreset) return;
    setMasterBass(initialPreset.bass ?? 0);
    setMasterMid(initialPreset.mid ?? 0);
    setMasterHigh(initialPreset.high ?? 0);
    setReverbLevel(initialPreset.reverbWet ?? 0);
    setDelayLevel(initialPreset.delayWet ?? 0);
    setWidenerOn(initialPreset.stereoWidth > 0.5);
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ') {
        e.preventDefault();
        isPlayingRef.current ? handlePause() : handlePlay();
      }
      if (e.key === 'Home') handleStop();
      if (e.key === 'Delete' && selectedTrack) removeTrack(selectedTrack);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handlePlay, handlePause, handleStop, selectedTrack]);

  // ── Canvas mouse: click to set playhead, right-drag to scroll ──
  const canvasMouse = useRef({ down: false, right: false, startX: 0, startScrollX: 0 });

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      canvasMouse.current = { down: true, right: true, startX: e.clientX, startScrollX: scrollXRef.current };
    } else {
      const rect = canvasRef.current!.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const newT = (relX + scrollXRef.current) / zoomRef.current;
      playheadRef.current = Math.max(0, newT);
      if (!isPlayingRef.current) drawCanvas();
    }
  };
  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasMouse.current.right) return;
    const dx = e.clientX - canvasMouse.current.startX;
    setScrollX(Math.max(0, canvasMouse.current.startScrollX - dx));
  };
  const onCanvasMouseUp = () => { canvasMouse.current.down = false; canvasMouse.current.right = false; };
  const onCanvasWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const newZ = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * (e.deltaY < 0 ? 1.15 : 0.87)));
      setZoom(newZ);
    } else {
      setScrollX(s => Math.max(0, s + e.deltaX + e.deltaY));
    }
  };

  // ── Track management ──
  const addEmptyTrack = () => {
    const id = `trk-${Date.now()}`;
    const i  = tracks.length;
    const track: TrackData = {
      id, name: `Track ${i + 1}`, instrument: 'Track', icon: '🎵',
      color: TRACK_COLORS[i % TRACK_COLORS.length],
      volume: 0.8, pan: 0, muted: false, solo: false, armed: false, height: TRACK_H,
      audioBuffer: null, peaks: null, clipStart: 0,
      trimStart: 0, trimEnd: 1, fadeIn: 0, fadeOut: 0,
      eqBass: 0, eqMid: 0, eqHigh: 0, gainDb: 0,
    };
    const actx = actxRef.current!;
    const gain    = actx.createGain(); gain.gain.value = 0.8;
    const pan     = actx.createStereoPanner();
    const eqLow   = actx.createBiquadFilter(); eqLow.type  = 'lowshelf';  eqLow.frequency.value  = 120;
    const eqMid   = actx.createBiquadFilter(); eqMid.type  = 'peaking';   eqMid.frequency.value  = 1000; eqMid.Q.value = 0.8;
    const eqHigh  = actx.createBiquadFilter(); eqHigh.type = 'highshelf'; eqHigh.frequency.value = 8000;
    const analyser= actx.createAnalyser(); analyser.fftSize = 512;
    const dry     = actx.createGain(); dry.gain.value = 1;
    gain.connect(pan); pan.connect(eqLow); eqLow.connect(eqMid); eqMid.connect(eqHigh);
    eqHigh.connect(analyser); analyser.connect(dry);
    if (masterBassRef.current) dry.connect(masterBassRef.current);
    trackNodes.current.set(id, { source: null, gain, pan, eqLow, eqMid, eqHigh, analyser, dry });
    setTracks(prev => [...prev, track]);
  };

  const removeTrack = (id: string) => {
    const src = scheduledSrcs.current.get(id);
    if (src) { try { src.stop(); } catch {} scheduledSrcs.current.delete(id); }
    trackNodes.current.delete(id);
    setTracks(prev => prev.filter(t => t.id !== id));
    if (selectedTrack === id) setSelectedTrack(null);
  };

  // ── File drop on track ──
  const onTrackFileDrop = async (id: string, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0]; if (!file) return;
    const actx = actxRef.current!;
    try {
      const ab  = await file.arrayBuffer();
      const buf = await actx.decodeAudioData(ab);
      const peaks = genPeaks(buf, 1200);
      updateTrack(id, { audioBuffer: buf, peaks, name: file.name.replace(/\.[^.]+$/, '').slice(0, 30) });
    } catch (err) {
      console.error('Drop failed', err);
    }
  };

  // ── AI Panel ──
  const sendAI = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg: AIMessage = { role: 'user', content: aiInput };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setAiLoading(true);

    // Build mixData snapshot
    const mixData = {
      lufsMomentary: -18,
      lufsIntegrated: -16,
      masterEQ: { bass: masterBass, mid: masterMid, high: masterHigh },
      reverbLevel, delayLevel, widenerEnabled: widenerOn,
      tracks: tracks.map(t => ({
        id: t.id, name: t.name, instrument: t.instrument,
        volume: t.volume, pan: t.pan, muted: t.muted,
        eqBass: t.eqBass, eqMid: t.eqMid, eqHigh: t.eqHigh,
      })),
      freqBands: { sub: 45, bass: 60, lowMid: 55, mid: 50, highMid: 45, air: 35 },
    };

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-mix-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ messages: [...aiMessages, userMsg], mixData }),
        }
      );
      const data = await res.json();
      const text = data.text || 'Sin respuesta del asistente.';
      const actions: any[] = data.actions || [];

      setAiMessages(prev => [...prev, { role: 'assistant', content: text }]);

      // Apply AI actions
      actions.forEach((a: any) => {
        if (a.type === 'master_eq') {
          if (a.bass  !== undefined) setMasterBass(a.bass);
          if (a.mid   !== undefined) setMasterMid(a.mid);
          if (a.high  !== undefined) setMasterHigh(a.high);
        }
        if (a.type === 'reverb' && a.level !== undefined) setReverbLevel(a.level);
        if (a.type === 'delay')  { if (a.level !== undefined) setDelayLevel(a.level); if (a.time !== undefined) setDelayTime(a.time); }
        if (a.type === 'widener' && a.enabled !== undefined) setWidenerOn(a.enabled);
        if (a.type === 'compression' && a.enabled !== undefined) setCompOn(a.enabled);
        if (a.type === 'track_eq') updateTrack(a.trackId, { eqBass: a.bass ?? 0, eqMid: a.mid ?? 0, eqHigh: a.high ?? 0 });
        if (a.type === 'track_volume') updateTrack(a.trackId, { volume: a.volume });
        if (a.type === 'track_pan')    updateTrack(a.trackId, { pan: a.pan });
      });
    } catch {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Error conectando con el asistente de IA.' }]);
    }
    setAiLoading(false);
  };

  // ── Export WAV 24-bit ──
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const duration = Math.max(...tracks.map(t => t.clipStart + (t.audioBuffer?.duration ?? 0)), 5);
      const sr = 48000;
      const offline = new OfflineAudioContext(2, Math.ceil(duration * sr), sr);

      // Rebuild master chain in offline context
      const mBass = offline.createBiquadFilter(); mBass.type = 'lowshelf'; mBass.frequency.value = 120; mBass.gain.value = masterBass;
      const mMid  = offline.createBiquadFilter(); mMid.type  = 'peaking';  mMid.frequency.value  = 1000; mMid.Q.value = 0.8; mMid.gain.value = masterMid;
      const mHigh = offline.createBiquadFilter(); mHigh.type = 'highshelf';mHigh.frequency.value = 8000; mHigh.gain.value = masterHigh;
      const mg    = offline.createGain(); mg.gain.value = masterVol;
      const lim   = offline.createDynamicsCompressor();
      lim.threshold.value = -1; lim.knee.value = 0; lim.ratio.value = 20;
      lim.attack.value = 0.001; lim.release.value = 0.1;
      mBass.connect(mMid); mMid.connect(mHigh); mHigh.connect(mg); mg.connect(lim); lim.connect(offline.destination);

      // Render tracks
      await Promise.all(tracks.map(async t => {
        if (!t.audioBuffer || t.muted) return;
        const src = offline.createBufferSource(); src.buffer = t.audioBuffer;
        const g   = offline.createGain(); g.gain.value = t.volume * dbToGain(t.gainDb);
        const pan = offline.createStereoPanner(); pan.pan.value = t.pan;
        const eqL = offline.createBiquadFilter(); eqL.type = 'lowshelf';  eqL.frequency.value = 120;  eqL.gain.value = t.eqBass;
        const eqM = offline.createBiquadFilter(); eqM.type = 'peaking';   eqM.frequency.value = 1000; eqM.Q.value = 0.8; eqM.gain.value = t.eqMid;
        const eqH = offline.createBiquadFilter(); eqH.type = 'highshelf'; eqH.frequency.value = 8000; eqH.gain.value = t.eqHigh;
        src.connect(g); g.connect(pan); pan.connect(eqL); eqL.connect(eqM); eqM.connect(eqH); eqH.connect(mBass);
        const trimS = t.trimStart * t.audioBuffer.duration;
        const trimE = t.trimEnd * t.audioBuffer.duration;
        src.start(t.clipStart, trimS, trimE - trimS);
      }));

      const rendered = await offline.startRendering();

      // Normalize to -14 LUFS (approx)
      const ch0 = rendered.getChannelData(0);
      let rms = 0;
      for (let i = 0; i < ch0.length; i++) rms += ch0[i] * ch0[i];
      rms = Math.sqrt(rms / ch0.length);
      const currentLufs = rms > 0.00001 ? 20 * Math.log10(rms) - 0.691 : -60;
      const targetLufs  = -14;
      const normGain    = Math.pow(10, (targetLufs - currentLufs) / 20);

      // Write 24-bit WAV
      const numCh = rendered.numberOfChannels;
      const numSamples = rendered.length;
      const byteDepth = 3;
      const dataSize  = numSamples * numCh * byteDepth;
      const buffer    = new ArrayBuffer(44 + dataSize);
      const view      = new DataView(buffer);
      const wstr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
      wstr(0, 'RIFF'); view.setUint32(4, 36 + dataSize, true);
      wstr(8, 'WAVE'); wstr(12, 'fmt '); view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); view.setUint16(22, numCh, true);
      view.setUint32(24, sr, true); view.setUint32(28, sr * numCh * byteDepth, true);
      view.setUint16(32, numCh * byteDepth, true); view.setUint16(34, 24, true);
      wstr(36, 'data'); view.setUint32(40, dataSize, true);
      let offset = 44;
      for (let i = 0; i < numSamples; i++) {
        for (let ch = 0; ch < numCh; ch++) {
          const s = Math.max(-1, Math.min(1, rendered.getChannelData(ch)[i] * normGain));
          const v = s < 0 ? s * 0x800000 : s * 0x7FFFFF;
          view.setUint8(offset, v & 0xFF);
          view.setUint8(offset + 1, (v >> 8) & 0xFF);
          view.setUint8(offset + 2, (v >> 16) & 0xFF);
          offset += 3;
        }
      }

      const blob = new Blob([buffer], { type: 'audio/wav' });
      const url  = URL.createObjectURL(blob);
      const peaks = new Float32Array(1200);
      genPeaks(rendered, 1200).forEach((v, i) => { peaks[i] = v; });

      onExport({ audioBuffer: rendered, audioUrl: url, waveformPeaks: peaks, finalLufs: targetLufs, wavUrl: url });
    } catch (e) {
      console.error('Export failed', e);
    }
    setExporting(false);
  };

  // ── Selected track ──
  const selTrack = tracks.find(t => t.id === selectedTrack);

  // ── Sidebar content ──
  const renderSidebar = () => {
    if (!sidebarOpen) return null;

    return (
      <div style={{ width: SIDEBAR_W, minWidth: SIDEBAR_W, height: '100%', background: T.panel, borderLeft: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          {(['MIX', 'TRACK', 'METERS', 'AI', 'PLUGINS'] as const).map(tab => (
            <button key={tab} onClick={() => setSidebarTab(tab)}
              style={{ flex: 1, height: 36, border: 'none', background: 'none', color: sidebarTab === tab ? T.violet : T.text3, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer', fontFamily: 'inherit', borderBottom: sidebarTab === tab ? `2px solid ${T.violet}` : '2px solid transparent', transition: 'color 0.15s' }}>
              {tab}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>

          {/* ── MIX TAB ── */}
          {sidebarTab === 'MIX' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Master EQ */}
              <Section title="Master EQ">
                <Row>
                  <Knob value={masterBass} min={-12} max={12} label="Bass" color="#f59e0b" onChange={setMasterBass} />
                  <Knob value={masterMid}  min={-12} max={12} label="Mid"  color={T.violet} onChange={setMasterMid} />
                  <Knob value={masterHigh} min={-12} max={12} label="High" color={T.cyan}   onChange={setMasterHigh} />
                </Row>
              </Section>

              {/* Genre presets */}
              <Section title="Genre Preset">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
                  {PRESETS.map(p => (
                    <button key={p.id} onClick={() => {
                      setMasterBass(p.bass ?? 0); setMasterMid(p.mid ?? 0); setMasterHigh(p.high ?? 0);
                      setReverbLevel(p.reverbWet ?? 0); setDelayLevel(p.delayWet ?? 0);
                      setWidenerOn(p.stereoWidth > 0.5);
                    }}
                      style={{ padding: '5px 2px', borderRadius: 6, border: `1px solid ${T.border}`, background: T.surface, color: T.text2, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </Section>

              {/* Reverb */}
              <Section title="Reverb">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Label>Level</Label>
                  <span style={{ fontSize: 10, color: T.violet, fontFamily: 'monospace' }}>{Math.round(reverbLevel * 100)}%</span>
                </div>
                <HSlider value={reverbLevel} min={0} max={0.5} color={T.violet} onChange={setReverbLevel} />
              </Section>

              {/* Delay */}
              <Section title="Delay">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Label>Level</Label>
                  <span style={{ fontSize: 10, color: T.blue, fontFamily: 'monospace' }}>{Math.round(delayLevel * 100)}%</span>
                </div>
                <HSlider value={delayLevel} min={0} max={0.4} color={T.blue} onChange={setDelayLevel} />
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Label>Time</Label>
                  <span style={{ fontSize: 10, color: T.blue, fontFamily: 'monospace' }}>{delayTime.toFixed(2)}s</span>
                </div>
                <HSlider value={delayTime} min={0.1} max={0.8} color={T.blue} onChange={setDelayTime} />
              </Section>

              {/* Widener */}
              <Section title="Stereo Widener">
                <Row>
                  <ToggleBtn active={widenerOn} color={T.cyan} onClick={() => setWidenerOn(v => !v)} label={widenerOn ? 'ON' : 'OFF'} />
                  {widenerOn && (
                    <div style={{ flex: 1 }}>
                      <HSlider value={widenerAmt} min={0} max={1} color={T.cyan} onChange={setWidenerAmt} />
                    </div>
                  )}
                </Row>
              </Section>

              {/* Compression */}
              <Section title="Master Compression">
                <ToggleBtn active={compOn} color={T.amber} onClick={() => setCompOn(v => !v)} label={compOn ? 'ON' : 'OFF'} />
              </Section>

              {/* IA EQ */}
              <Section title="IA EQ — Device Emulation">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 4 }}>
                  {IAEQ_PRESETS.map(p => (
                    <button key={p.id} onClick={() => setIaEqId(p.id)}
                      style={{ padding: '5px 8px', borderRadius: 6, border: `1px solid ${iaEqId === p.id ? T.violet : T.border}`, background: iaEqId === p.id ? `${T.violet}22` : T.surface, color: iaEqId === p.id ? T.violet : T.text2, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* ── TRACK TAB ── */}
          {sidebarTab === 'TRACK' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {selTrack ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{selTrack.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: selTrack.color }}>{selTrack.name}</div>
                      <div style={{ fontSize: 10, color: T.text3 }}>{selTrack.instrument}</div>
                    </div>
                  </div>

                  <Section title="Track EQ">
                    <Row>
                      <Knob value={selTrack.eqBass} min={-12} max={12} label="Bass" color="#f59e0b" onChange={v => updateTrack(selTrack.id, { eqBass: Math.round(v) })} />
                      <Knob value={selTrack.eqMid}  min={-12} max={12} label="Mid"  color={T.violet} onChange={v => updateTrack(selTrack.id, { eqMid: Math.round(v) })} />
                      <Knob value={selTrack.eqHigh} min={-12} max={12} label="High" color={T.cyan}   onChange={v => updateTrack(selTrack.id, { eqHigh: Math.round(v) })} />
                    </Row>
                  </Section>

                  <Section title="Volume & Pan">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Label>Volume</Label>
                      <span style={{ fontSize: 10, color: selTrack.color, fontFamily: 'monospace' }}>{Math.round(selTrack.volume * 100)}%</span>
                    </div>
                    <HSlider value={selTrack.volume} min={0} max={1} color={selTrack.color} onChange={v => updateTrack(selTrack.id, { volume: v })} />
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Label>Pan</Label>
                      <span style={{ fontSize: 10, color: selTrack.color, fontFamily: 'monospace' }}>{selTrack.pan > 0 ? `R${Math.round(selTrack.pan * 100)}` : selTrack.pan < 0 ? `L${Math.round(-selTrack.pan * 100)}` : 'C'}</span>
                    </div>
                    <HSlider value={selTrack.pan} min={-1} max={1} color={selTrack.color} onChange={v => updateTrack(selTrack.id, { pan: v })} />
                  </Section>

                  <Section title="Clip Editor">
                    <button onClick={() => setEditingClip(selTrack.id)}
                      style={{ width: '100%', padding: '9px', borderRadius: 8, border: `1px solid ${T.borderM}`, background: T.surface2, color: T.text, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                      ✂ Abrir editor de clip
                    </button>
                  </Section>

                  {/* Track FFT */}
                  <Section title="Track Spectrum">
                    <div style={{ height: 80, borderRadius: 8, overflow: 'hidden' }}>
                      <FFTCanvas analyser={selectedNodes?.analyser ?? null} />
                    </div>
                  </Section>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: T.text3, fontSize: 12, padding: 24 }}>
                  Selecciona un track para editar sus parámetros
                </div>
              )}
            </div>
          )}

          {/* ── METERS TAB ── */}
          {sidebarTab === 'METERS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Section title="FFT Spectrum Analyzer">
                <div style={{ height: 160, borderRadius: 8, overflow: 'hidden' }}>
                  <FFTCanvas analyser={masterAnalyser.current} />
                </div>
              </Section>
              <Section title="LUFS Meter">
                <div style={{ height: 200, display: 'flex', justifyContent: 'center' }}>
                  <LUFSMeter analyser={masterAnalyser.current} />
                </div>
                <div style={{ fontSize: 10, color: T.text3, textAlign: 'center', marginTop: 6 }}>
                  Target: -14 LUFS (Streaming) · -8 LUFS (Club)
                </div>
              </Section>
              <Section title="Master Volume">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Label>Output</Label>
                  <span style={{ fontSize: 10, color: T.green, fontFamily: 'monospace' }}>{Math.round(masterVol * 100)}%</span>
                </div>
                <HSlider value={masterVol} min={0} max={1} color={T.green} onChange={setMasterVol} />
              </Section>
            </div>
          )}

          {/* ── AI TAB ── */}
          {sidebarTab === 'AI' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
              <div style={{ fontSize: 11, color: T.violet, fontWeight: 600, marginBottom: 4 }}>
                🎚 Asistente de mezcla — Claude Sonnet
              </div>
              <div style={{ fontSize: 10, color: T.text3, marginBottom: 6 }}>
                Pregúntame cómo mejorar tu mezcla. Aplicaré los cambios automáticamente.
              </div>

              {/* Message history */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, maxHeight: 340 }}>
                {aiMessages.length === 0 && (
                  <div style={{ color: T.text3, fontSize: 11, padding: '12px 0' }}>
                    Ejemplos:<br/>
                    • "La mezcla suena turbia"<br/>
                    • "Las voces no se escuchan bien"<br/>
                    • "Más bass en el kick"<br/>
                    • "Ajusta para club"
                  </div>
                )}
                {aiMessages.map((msg, i) => (
                  <div key={i} style={{
                    padding: '8px 12px', borderRadius: 10, fontSize: 11, lineHeight: 1.5,
                    background: msg.role === 'user' ? `${T.violet}22` : T.surface2,
                    color: msg.role === 'user' ? T.text : T.text2,
                    border: `1px solid ${msg.role === 'user' ? T.borderM : T.border}`,
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '90%',
                  }}>
                    {msg.content}
                  </div>
                ))}
                {aiLoading && (
                  <div style={{ padding: '8px 12px', borderRadius: 10, fontSize: 11, background: T.surface2, color: T.text3, border: `1px solid ${T.border}` }}>
                    Analizando mezcla…
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAI(); } }}
                  placeholder="¿Cómo mejorar la mezcla?"
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: T.surface2, border: `1px solid ${T.border}`, color: T.text, fontSize: 11, fontFamily: 'inherit', outline: 'none' }}
                />
                <button onClick={sendAI} disabled={aiLoading || !aiInput.trim()}
                  style={{ padding: '8px 12px', borderRadius: 8, background: aiLoading ? 'rgba(139,92,246,0.2)' : T.violet, border: 'none', color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', opacity: aiLoading ? 0.7 : 1 }}>
                  →
                </button>
              </div>
            </div>
          )}

          {/* ── PLUGINS TAB ── */}
          {sidebarTab === 'PLUGINS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 10, color: T.text3, marginBottom: 2 }}>
                Plugins WAM (AudioWorklet) — procesamiento nativo en el browser
              </div>

              {/* Saturator */}
              <Section title="Tape Saturator">
                <Row gap={10}>
                  <ToggleBtn active={satOn} color={T.amber} onClick={() => setSatOn(v => !v)} label={satOn ? 'ON' : 'OFF'} />
                  <Knob value={satDrive} min={1} max={6} label="Drive" color={T.amber} onChange={v => { setSatDrive(v); if (satNodeRef.current) (satNodeRef.current.parameters as any).get('drive').value = v; }} />
                </Row>
                <div style={{ fontSize: 9, color: T.text3, marginTop: 6 }}>
                  Saturación analógica · Soft-clip armónico
                </div>
              </Section>

              {/* Stereo Widener */}
              <Section title="Stereo Widener (M/S)">
                <Row gap={10}>
                  <ToggleBtn active={widenerOn} color={T.cyan} onClick={() => setWidenerOn(v => !v)} label={widenerOn ? 'ON' : 'OFF'} />
                  <Knob value={widenerAmt} min={0} max={1} label="Width" color={T.cyan} onChange={v => {
                    setWidenerAmt(v);
                    if (widenerNodeRef.current) (widenerNodeRef.current.parameters as any).get('width').value = v;
                  }} />
                </Row>
                <div style={{ fontSize: 9, color: T.text3, marginTop: 6 }}>
                  Procesamiento Mid/Side · Cuidado con mono
                </div>
              </Section>

              <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.06)', border: `1px solid ${T.border}`, fontSize: 10, color: T.text3 }}>
                Los plugins usan AudioWorklet — mismo motor de audio que los DAWs nativos. Sin latencia de plugin.
              </div>
            </div>
          )}
        </div>

        {/* Export button at bottom of sidebar */}
        <div style={{ padding: 14, borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
          <button onClick={handleExport} disabled={exporting || tracks.length === 0}
            style={{ width: '100%', height: 42, borderRadius: 10, border: 'none', background: exporting ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: tracks.length === 0 ? 0.4 : 1 }}>
            {exporting ? 'Exportando...' : '💾 Export WAV 24-bit'}
          </button>
        </div>
      </div>
    );
  };

  // ── Left track strips ──
  const renderTrackStrip = (track: TrackData) => {
    const isSel = selectedTrack === track.id;
    return (
      <div key={track.id}
        onClick={() => setSelectedTrack(track.id)}
        onDoubleClick={() => { setSelectedTrack(track.id); setSidebarTab('TRACK'); setSidebarOpen(true); }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => onTrackFileDrop(track.id, e)}
        style={{
          height: track.height, display: 'flex', alignItems: 'center', gap: 6,
          padding: '0 10px', background: isSel ? 'rgba(139,92,246,0.1)' : T.surface,
          borderBottom: `1px solid ${T.border}`, cursor: 'pointer', flexShrink: 0,
          borderLeft: isSel ? `3px solid ${T.violet}` : `3px solid ${track.color}44`,
          boxSizing: 'border-box',
        }}>
        <span style={{ fontSize: 16 }}>{track.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: isSel ? T.text : T.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.name}</div>
          <div style={{ fontSize: 9, color: T.text3 }}>{track.instrument}</div>
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          <MiniBtn active={track.muted} color={T.amber} onClick={e => { e.stopPropagation(); updateTrack(track.id, { muted: !track.muted }); }}>M</MiniBtn>
          <MiniBtn active={track.solo}  color={T.green} onClick={e => { e.stopPropagation(); updateTrack(track.id, { solo: !track.solo }); }}>S</MiniBtn>
          <MiniBtn active={false} color={T.red} onClick={e => { e.stopPropagation(); removeTrack(track.id); }}>✕</MiniBtn>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text, fontFamily: '-apple-system,BlinkMacSystemFont,"DM Sans",system-ui,sans-serif', overflow: 'hidden' }}>

      {/* ── FlowNav ── */}
      <FlowNav active="studio" onNavigate={onNavigate ?? (() => {})} user={user} onLogout={onLogout} />

      {/* ── Transport bar ── */}
      <div style={{ height: 50, minHeight: 50, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', background: 'linear-gradient(180deg,#0e0b20,#0b0916)', borderBottom: `1px solid ${T.border}`, flexShrink: 0, userSelect: 'none' }}>
        {/* Back */}
        <button onClick={onBack} style={{ height: 30, padding: '0 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.04)', color: T.text3, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
        <div style={{ width: 1, height: 24, background: T.border, margin: '0 4px' }} />

        {/* Transport */}
        <TBtn onClick={handleStop}  title="Stop (Home)" active={false} color={T.text3}>■</TBtn>
        <TBtn onClick={isPlaying ? handlePause : handlePlay} title={isPlaying ? 'Pause (Space)' : 'Play (Space)'} active={isPlaying} color={T.green} glow>
          {isPlaying ? '⏸' : '▶'}
        </TBtn>
        <TBtn onClick={() => setLoopEnabled(v => !v)} title="Loop" active={loopEnabled} color={T.blue}>↻</TBtn>

        {/* Position */}
        <div style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${T.border}`, borderRadius: 6, padding: '3px 12px', fontFamily: 'monospace', fontSize: 16, fontWeight: 700, letterSpacing: 2, minWidth: 120, textAlign: 'center' }}>
          {fmtPos(playheadRef.current, bpm)}
        </div>

        <div style={{ width: 1, height: 24, background: T.border, margin: '0 4px' }} />

        {/* BPM */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Label>BPM</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <button onClick={() => setBpm(b => Math.max(40, b - 1))} style={microBtnStyle}>−</button>
            <input type="number" min={40} max={300} value={bpm} onChange={e => setBpm(+e.target.value)}
              style={{ width: 44, textAlign: 'center', background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.border}`, borderRadius: 4, color: T.text, fontFamily: 'monospace', fontSize: 13, fontWeight: 700, padding: '2px 0', outline: 'none' }} />
            <button onClick={() => setBpm(b => Math.min(300, b + 1))} style={microBtnStyle}>+</button>
          </div>
        </div>

        <div style={{ width: 1, height: 24, background: T.border, margin: '0 4px' }} />

        {/* Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Label>Zoom</Label>
          <button onClick={() => setZoom(z => Math.max(MIN_ZOOM, z * 0.8))} style={microBtnStyle}>−</button>
          <button onClick={() => setZoom(z => Math.min(MAX_ZOOM, z * 1.25))} style={microBtnStyle}>+</button>
        </div>

        <div style={{ flex: 1 }} />

        {/* Sidebar toggle */}
        <button onClick={() => setSidebarOpen(v => !v)}
          style={{ height: 30, padding: '0 10px', borderRadius: 6, border: `1px solid ${sidebarOpen ? T.borderM : T.border}`, background: sidebarOpen ? `${T.violet}22` : 'rgba(255,255,255,0.04)', color: sidebarOpen ? T.violet : T.text3, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
          {sidebarOpen ? '▶ Panel' : '◀ Panel'}
        </button>

        {/* Switch to mixer */}
        {onSwitchToMixer && (
          <button onClick={onSwitchToMixer}
            style={{ height: 30, padding: '0 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'rgba(255,255,255,0.04)', color: T.text3, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
            🎚 Mixer
          </button>
        )}
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left strip panel ── */}
        <div style={{ width: STRIP_W, minWidth: STRIP_W, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${T.border}`, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ height: RULER_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', background: T.ruler, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tracks</span>
            <button onClick={addEmptyTrack}
              style={{ height: 22, padding: '0 8px', borderRadius: 5, border: `1px solid ${T.border}`, background: 'rgba(139,92,246,0.12)', color: T.violet, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
              + Add
            </button>
          </div>
          {/* Track strips */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {tracks.map(renderTrackStrip)}
            {tracks.length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: T.text3, fontSize: 11 }}>
                Arrastra archivos de audio aquí<br/>o usa "+ Add" para crear un track
              </div>
            )}
          </div>
        </div>

        {/* ── Arrangement canvas ── */}
        <div
          ref={canvasWrapRef}
          style={{ flex: 1, overflow: 'hidden', position: 'relative', cursor: 'crosshair' }}
          onDragOver={e => e.preventDefault()}
          onDrop={async e => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/') || /\.(wav|mp3|flac|aac|ogg|m4a)$/i.test(f.name));
            const actx = actxRef.current; if (!actx) return;
            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              try {
                const ab = await file.arrayBuffer();
                const buf = await actx.decodeAudioData(ab);
                const peaks = genPeaks(buf, 1200);
                const { instrument, icon } = detectInst(file.name);
                const id = `trk-${Date.now()}-${i}`;
                const color = TRACK_COLORS[(tracks.length + i) % TRACK_COLORS.length];
                const track: TrackData = {
                  id, name: file.name.replace(/\.[^.]+$/, '').slice(0, 30),
                  instrument, icon, color,
                  volume: 0.8, pan: 0, muted: false, solo: false, armed: false, height: TRACK_H,
                  audioBuffer: buf, peaks, clipStart: 0,
                  trimStart: 0, trimEnd: 1, fadeIn: 0, fadeOut: 0,
                  eqBass: 0, eqMid: 0, eqHigh: 0, gainDb: 0,
                };
                const gain    = actx.createGain(); gain.gain.value = 0.8;
                const pan     = actx.createStereoPanner();
                const eqLow   = actx.createBiquadFilter(); eqLow.type  = 'lowshelf';  eqLow.frequency.value  = 120;
                const eqMid_n = actx.createBiquadFilter(); eqMid_n.type = 'peaking';  eqMid_n.frequency.value = 1000; eqMid_n.Q.value = 0.8;
                const eqHigh  = actx.createBiquadFilter(); eqHigh.type = 'highshelf'; eqHigh.frequency.value = 8000;
                const analyser= actx.createAnalyser(); analyser.fftSize = 512;
                const dry     = actx.createGain(); dry.gain.value = 1;
                gain.connect(pan); pan.connect(eqLow); eqLow.connect(eqMid_n); eqMid_n.connect(eqHigh);
                eqHigh.connect(analyser); analyser.connect(dry);
                if (masterBassRef.current) dry.connect(masterBassRef.current);
                if (delayNodeRef.current) dry.connect(delayNodeRef.current);
                trackNodes.current.set(id, { source: null, gain, pan, eqLow, eqMid: eqMid_n, eqHigh, analyser, dry });
                setTracks(prev => [...prev, track]);
              } catch (err) { console.error('Drop failed', err); }
            }
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
            onMouseDown={onCanvasMouseDown}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onMouseLeave={onCanvasMouseUp}
            onWheel={onCanvasWheel}
            onContextMenu={e => e.preventDefault()}
          />

          {/* Empty state overlay */}
          {tracks.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>🎬</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.text3, marginBottom: 8 }}>Arrastra stems al DAW</div>
              <div style={{ fontSize: 12, color: T.text3, opacity: 0.7 }}>WAV · MP3 · FLAC · hasta 16 pistas</div>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        {renderSidebar()}
      </div>

      {/* ── Clip Editor Modal ── */}
      {editingClip && tracks.find(t => t.id === editingClip) && (
        <ClipEditor
          track={tracks.find(t => t.id === editingClip)!}
          onClose={() => setEditingClip(null)}
          onUpdate={changes => { updateTrack(editingClip, changes); setEditingClip(null); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SMALL REUSABLE UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.6, paddingBottom: 4, borderBottom: `1px solid ${T.border}` }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function MiniBtn({ active, color, onClick, children }: { active: boolean; color: string; onClick: (e: React.MouseEvent) => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{ width: 20, height: 20, borderRadius: 4, border: 'none', cursor: 'pointer', background: active ? `${color}33` : 'rgba(255,255,255,0.05)', color: active ? color : T.text3, fontSize: 9, fontWeight: 700, fontFamily: 'inherit', lineHeight: 1 }}>
      {children}
    </button>
  );
}

function ToggleBtn({ active, color, onClick, label }: { active: boolean; color: string; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      style={{ height: 26, padding: '0 12px', borderRadius: 6, border: `1px solid ${active ? color : T.border}`, background: active ? `${color}22` : 'rgba(255,255,255,0.04)', color: active ? color : T.text3, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
      {label}
    </button>
  );
}

const microBtnStyle: React.CSSProperties = {
  width: 20, height: 20, borderRadius: 4, border: `1px solid rgba(255,255,255,0.1)`,
  background: 'rgba(255,255,255,0.05)', color: T.text3, fontSize: 12, cursor: 'pointer',
  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
};
