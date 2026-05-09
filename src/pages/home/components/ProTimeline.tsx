/**
 * ProTimeline.tsx — Professional Logic Pro-style Timeline DAW
 * Real audio · Real waveforms · Sample-accurate transport
 * MixingMusic.AI v3.0
 */
import { useState, useRef, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface User {
  id: string; firstName: string; lastName: string;
  email: string; country: string; credits: number;
  is_pro?: boolean; plan?: string; createdAt: string;
}

interface ClipData {
  id: string;
  trackId: string;
  audioBuffer: AudioBuffer;
  peaks: Float32Array;
  startTime: number;    // timeline position (seconds)
  trimStart: number;    // seconds into buffer to skip
  trimEnd: number;      // seconds to cut from end
  fadeIn: number;
  fadeOut: number;
  name: string;
  color: string;
}

interface TrackData {
  id: string;
  name: string;
  instrument: string;
  icon: string;
  color: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  armed: boolean;
  height: number;
  clips: ClipData[];
}

interface TrackNodes {
  gainNode: GainNode;
  panNode: StereoPannerNode;
  analyserNode: AnalyserNode;
}

interface ProTimelineProps {
  user: User | null;
  uploadedFiles: File[];
  onBack: () => void;
  onNavigate?: (id: string) => void;
  onLogout?: () => void;
  onSwitchToMixer?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════

const T = {
  bg:           '#080610',
  panel:        '#0e0b1c',
  surface:      '#141028',
  surface2:     '#1c1636',
  text:         '#f0ecff',
  text2:        '#9b8fc0',
  text3:        '#5c5278',
  pink:         '#e879f9',
  violet:       '#8b5cf6',
  green:        '#10b981',
  red:          '#f43f5e',
  amber:        '#f59e0b',
  blue:         '#60a5fa',
  border:       'rgba(139,92,246,0.13)',
  borderMid:    'rgba(139,92,246,0.28)',
  borderStrong: 'rgba(139,92,246,0.5)',
  ruler:        '#0b0918',
  playhead:     '#f43f5e',
  loopRgn:      'rgba(96,165,250,0.12)',
};

const TRACK_COLORS = [
  '#e879f9','#10b981','#f97316','#3b82f6','#f59e0b',
  '#a855f7','#14b8a6','#ec4899','#22c55e','#fb923c',
  '#60a5fa','#c084fc','#f472b6','#34d399',
];

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const PANEL_W     = 228;
const RULER_H     = 42;
const MIN_ZOOM    = 15;
const MAX_ZOOM    = 4000;
const DEF_ZOOM    = 100; // px/second
const LOOKAHEAD   = 0.3; // seconds ahead to schedule
const SCHED_MS    = 20;  // scheduler check interval

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function genPeaks(buf: AudioBuffer, res = 1200): Float32Array {
  const data = buf.getChannelData(0);
  const out  = new Float32Array(res);
  const step = Math.max(1, Math.floor(data.length / res));
  for (let i = 0; i < res; i++) {
    let max = 0;
    const s = i * step;
    const e = Math.min(s + step, data.length);
    for (let j = s; j < e; j++) { const v = Math.abs(data[j]); if (v > max) max = v; }
    out[i] = max;
  }
  return out;
}

function detectInst(name: string): { instrument: string; icon: string } {
  const n = name.toLowerCase();
  if (/voz|voc|vocal|lead|singer|choir|bgv|backing/.test(n)) return { instrument: 'Vocals',  icon: '🎤' };
  if (/kick|drum|perc|beat|snare|hi.hat|hihat/.test(n))      return { instrument: 'Drums',   icon: '🥁' };
  if (/bass|bajo|808|sub/.test(n))                            return { instrument: 'Bass',    icon: '🎸' };
  if (/guitar|gtr|electric|acoustic/.test(n))                 return { instrument: 'Guitar',  icon: '🎸' };
  if (/piano|keys|keyboard|synth|pad|organ/.test(n))          return { instrument: 'Keys',    icon: '🎹' };
  if (/brass|trumpet|horn|sax/.test(n))                       return { instrument: 'Brass',   icon: '🎺' };
  if (/string|violin|cello/.test(n))                          return { instrument: 'Strings', icon: '🎻' };
  if (/fx|effect|noise|amb/.test(n))                          return { instrument: 'FX',      icon: '🎛️' };
  return { instrument: 'Track', icon: '🎵' };
}

function fmtPos(s: number, bpm: number, num: number): string {
  const beat = 60 / bpm;
  const bar  = beat * num;
  const bars  = Math.floor(s / bar);
  const beats = Math.floor((s % bar) / beat);
  return `${bars + 1} : ${String(beats + 1).padStart(2, '0')}`;
}

function fmtSec(s: number): string {
  const m  = Math.floor(s / 60);
  const sc = Math.floor(s % 60);
  const cs = Math.floor((s % 1) * 100);
  return `${m}:${String(sc).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSPORT BAR
// ═══════════════════════════════════════════════════════════════════════════

interface TransportProps {
  isPlaying: boolean;
  isRecording: boolean;
  playheadTime: number;
  bpm: number;
  timeSig: [number, number];
  masterVol: number;
  zoom: number;
  tracksCount: number;
  loopEnabled: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onRecord: () => void;
  onBpmChange: (b: number) => void;
  onMasterVolChange: (v: number) => void;
  onZoomChange: (z: number) => void;
  onLoopToggle: () => void;
}

function TransportBar(p: TransportProps) {
  return (
    <div style={{
      height: 52, minHeight: 52,
      display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px',
      background: 'linear-gradient(180deg, #0f0c20 0%, #0c0918 100%)',
      borderBottom: `1px solid ${T.border}`,
      zIndex: 50, userSelect: 'none',
    }}>
      {/* ── Transport buttons ── */}
      <div style={{ display: 'flex', gap: 4 }}>
        {/* Stop */}
        <TBtn
          onClick={p.onStop}
          title="Stop (Home)"
          active={false}
          color={T.text3}
        >■</TBtn>

        {/* Play / Pause */}
        <TBtn
          onClick={p.isPlaying ? p.onPause : p.onPlay}
          title={p.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          active={p.isPlaying}
          color={T.green}
          glow
        >{p.isPlaying ? '⏸' : '▶'}</TBtn>

        {/* Record */}
        <TBtn
          onClick={p.onRecord}
          title="Record"
          active={p.isRecording}
          color={T.red}
          glow={p.isRecording}
        >⏺</TBtn>

        {/* Loop */}
        <TBtn
          onClick={p.onLoopToggle}
          title="Loop"
          active={p.loopEnabled}
          color={T.blue}
        >↻</TBtn>
      </div>

      <Divider />

      {/* ── Time display ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'rgba(0,0,0,0.4)', border: `1px solid ${T.border}`,
        borderRadius: 6, padding: '3px 12px', minWidth: 130,
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: T.text, letterSpacing: 2, lineHeight: 1.2 }}>
          {fmtPos(p.playheadTime, p.bpm, p.timeSig[0])}
        </span>
        <span style={{ fontSize: 9, color: T.text3, letterSpacing: 1 }}>
          {fmtSec(p.playheadTime)}
        </span>
      </div>

      <Divider />

      {/* ── BPM ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={{ fontSize: 9, color: T.text3, letterSpacing: 0.5, textTransform: 'uppercase' }}>BPM</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => p.onBpmChange(Math.max(40, p.bpm - 1))}
            style={{ ...microBtn, width: 16 }}
          >−</button>
          <input
            type="number" min={40} max={300} value={p.bpm}
            onChange={e => p.onBpmChange(Math.max(40, Math.min(300, +e.target.value)))}
            style={{
              width: 48, textAlign: 'center', background: 'rgba(0,0,0,0.5)',
              border: `1px solid ${T.border}`, borderRadius: 4, color: T.text,
              fontSize: 14, fontWeight: 700, padding: '2px 0', fontFamily: 'monospace',
            }}
          />
          <button
            onClick={() => p.onBpmChange(Math.min(300, p.bpm + 1))}
            style={{ ...microBtn, width: 16 }}
          >+</button>
        </div>
      </div>

      {/* ── Time Sig ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <span style={{ fontSize: 9, color: T.text3, letterSpacing: 0.5, textTransform: 'uppercase' }}>Sig</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.text2, fontFamily: 'monospace' }}>
          {p.timeSig[0]}/{p.timeSig[1]}
        </span>
      </div>

      <Divider />

      {/* ── Master Volume ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Master</span>
          <span style={{ fontSize: 9, color: T.text2, fontFamily: 'monospace' }}>{Math.round(p.masterVol * 100)}%</span>
        </div>
        <KnobSlider
          value={p.masterVol} min={0} max={1} step={0.01}
          color={T.violet}
          onChange={p.onMasterVolChange}
        />
      </div>

      <Divider />

      {/* ── Zoom ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Zoom</span>
          <span style={{ fontSize: 9, color: T.text2, fontFamily: 'monospace' }}>{Math.round(p.zoom)}px/s</span>
        </div>
        <KnobSlider
          value={Math.log2(p.zoom)} min={Math.log2(MIN_ZOOM)} max={Math.log2(MAX_ZOOM)} step={0.01}
          color={T.amber}
          onChange={v => p.onZoomChange(Math.pow(2, v))}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* ── Track count ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: 'monospace' }}>{p.tracksCount}</span>
        <span style={{ fontSize: 9, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>tracks</span>
      </div>

      <Divider />

      {/* ── Keyboard shortcuts reminder ── */}
      <div style={{ fontSize: 9, color: T.text3, lineHeight: 1.6 }}>
        <div>Space Play/Pause</div>
        <div>⌘+Scroll Zoom</div>
      </div>
    </div>
  );
}

// ── Micro helpers ──────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ width: 1, height: 28, background: T.border, margin: '0 6px' }} />;
}

function TBtn({ onClick, title, active, color, glow, children }: {
  onClick: () => void; title?: string; active: boolean;
  color: string; glow?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 34, height: 34, borderRadius: 8,
        background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? color + '60' : T.border}`,
        color: active ? color : T.text3,
        fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'inherit',
        boxShadow: active && glow ? `0 0 12px ${color}44` : 'none',
        transition: 'all 0.15s',
      }}
    >{children}</button>
  );
}

const microBtn: React.CSSProperties = {
  height: 20, padding: '0 4px', borderRadius: 4,
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid ${T.border}`,
  color: T.text2, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
};

function KnobSlider({ value, min, max, step, color, onChange }: {
  value: number; min: number; max: number; step: number;
  color: string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ position: 'relative', height: 6, display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: color, opacity: 0.9 }} />
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'ew-resize', width: '100%' }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TRACK STRIP (left panel)
// ═══════════════════════════════════════════════════════════════════════════

interface TrackStripProps {
  track: TrackData;
  isSelected: boolean;
  height: number;
  onSelect: () => void;
  onVolumeChange: (v: number) => void;
  onPanChange: (p: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onArmToggle: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onHeightChange: (h: number) => void;
}

function TrackStrip(p: TrackStripProps) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(p.track.name);
  const { track } = p;

  const volPct = track.volume * 100;
  const panPct = ((track.pan + 1) / 2) * 100;

  return (
    <div
      onClick={p.onSelect}
      style={{
        height: p.height, boxSizing: 'border-box',
        background: p.isSelected ? 'rgba(139,92,246,0.08)' : 'transparent',
        borderBottom: `1px solid ${T.border}`,
        borderLeft: `3px solid ${p.isSelected ? track.color : 'transparent'}`,
        padding: '6px 10px',
        display: 'flex', flexDirection: 'column', gap: 4,
        cursor: 'pointer', transition: 'background 0.1s',
        position: 'relative',
      }}
    >
      {/* Row 1: icon + name + close */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 14 }}>{track.icon}</span>
        {editing ? (
          <input
            autoFocus
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={() => { p.onRename(nameVal); setEditing(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { p.onRename(nameVal); setEditing(false); } }}
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, background: 'rgba(0,0,0,0.5)', border: `1px solid ${T.borderMid}`,
              borderRadius: 4, color: T.text, fontSize: 11, padding: '2px 6px',
              fontFamily: 'inherit',
            }}
          />
        ) : (
          <span
            onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}
            style={{
              flex: 1, fontSize: 11, fontWeight: 600, color: T.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            title="Double-click to rename"
          >{track.name}</span>
        )}
        <button
          onClick={e => { e.stopPropagation(); p.onDelete(); }}
          style={{ ...iconBtn, color: T.text3 }}
          title="Remove track"
        >×</button>
      </div>

      {/* Row 2: M · S · R + instrument */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <PillBtn active={track.muted} color={T.amber} onClick={e => { e.stopPropagation(); p.onMuteToggle(); }}>M</PillBtn>
        <PillBtn active={track.solo} color={T.green} onClick={e => { e.stopPropagation(); p.onSoloToggle(); }}>S</PillBtn>
        <PillBtn active={track.armed} color={T.red} onClick={e => { e.stopPropagation(); p.onArmToggle(); }}>R</PillBtn>
        <span style={{ fontSize: 9, color: T.text3, marginLeft: 4 }}>{track.instrument.toUpperCase()}</span>
      </div>

      {/* Row 3: Vol slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 8, color: T.text3, width: 18, textAlign: 'right' }}>VOL</span>
        <div style={{ flex: 1, position: 'relative', height: 4, display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{ height: '100%', width: `${volPct}%`, borderRadius: 999, background: track.color + 'cc' }} />
          </div>
          <input
            type="range" min={0} max={1} step={0.01} value={track.volume}
            onChange={e => p.onVolumeChange(+e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'ew-resize', width: '100%' }}
          />
        </div>
        <span style={{ fontSize: 8, color: T.text3, width: 24, textAlign: 'right', fontFamily: 'monospace' }}>
          {Math.round(20 * Math.log10(Math.max(track.volume, 0.001)))}
        </span>
      </div>

      {/* Row 4: Pan slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 8, color: T.text3, width: 18, textAlign: 'right' }}>PAN</span>
        <div style={{ flex: 1, position: 'relative', height: 4, display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              height: '100%',
              left: track.pan < 0 ? `${panPct}%` : '50%',
              right: track.pan > 0 ? `${100 - panPct}%` : '50%',
              position: 'absolute', borderRadius: 999,
              background: track.color + 'aa',
            }} />
            {/* Center mark */}
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.15)' }} />
          </div>
          <input
            type="range" min={-1} max={1} step={0.01} value={track.pan}
            onChange={e => p.onPanChange(+e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'ew-resize', width: '100%' }}
          />
        </div>
        <span style={{ fontSize: 8, color: T.text3, width: 24, textAlign: 'right', fontFamily: 'monospace' }}>
          {track.pan === 0 ? 'C' : track.pan > 0 ? `R${Math.round(track.pan * 100)}` : `L${Math.round(-track.pan * 100)}`}
        </span>
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  width: 16, height: 16, padding: 0, borderRadius: 4,
  background: 'transparent', border: 'none',
  fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  lineHeight: 1,
};

function PillBtn({ active, color, onClick, children }: {
  active: boolean; color: string; onClick: React.MouseEventHandler;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 20, height: 16, padding: 0, borderRadius: 4, fontSize: 9, fontWeight: 700,
        background: active ? `${color}33` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? color + '80' : T.border}`,
        color: active ? color : T.text3, cursor: 'pointer', fontFamily: 'inherit',
        boxShadow: active ? `0 0 6px ${color}44` : 'none',
        transition: 'all 0.12s',
      }}
    >{children}</button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ProTimeline({ user, uploadedFiles, onBack, onNavigate, onLogout, onSwitchToMixer }: ProTimelineProps) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [tracks,         setTracks]         = useState<TrackData[]>([]);
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [isRecording]                       = useState(false);
  const [playheadTime,   setPlayheadTime]   = useState(0);
  const [zoom,           setZoom]           = useState(DEF_ZOOM);
  const [scrollX,        setScrollX]        = useState(0);
  const [scrollY,        setScrollY]        = useState(0);
  const [bpm,            setBpm]            = useState(120);
  const [timeSig]                           = useState<[number,number]>([4, 4]);
  const [masterVol,      setMasterVol]      = useState(0.8);
  const [loading,        setLoading]        = useState(false);
  const [loadProgress,   setLoadProgress]   = useState(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTrkId,  setSelectedTrkId]  = useState<string | null>(null);
  const [loopEnabled,    setLoopEnabled]    = useState(false);
  const [loopStart]                         = useState(0);
  const [loopEnd]                           = useState(8);
  const [showShortcuts,  setShowShortcuts]  = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const canvasRef              = useRef<HTMLCanvasElement>(null);
  const wrapRef                = useRef<HTMLDivElement>(null);
  const audioCtxRef            = useRef<AudioContext | null>(null);
  const masterGainRef          = useRef<GainNode | null>(null);
  const trackNodesRef          = useRef<Map<string, TrackNodes>>(new Map());
  const scheduledRef           = useRef<Map<string, AudioBufferSourceNode>>(new Map());

  // Playback timing (hot path — avoid state)
  const isPlayingRef           = useRef(false);
  const playheadRef            = useRef(0);
  const startCtxTimeRef        = useRef(0);
  const startTlTimeRef         = useRef(0);
  const tracksRef              = useRef<TrackData[]>([]);

  // Canvas interaction
  const zoomRef                = useRef(DEF_ZOOM);
  const scrollXRef             = useRef(0);
  const scrollYRef             = useRef(0);
  const bpmRef                 = useRef(120);
  const masterVolRef           = useRef(0.8);
  const dragRef                = useRef<{
    type: 'seek' | 'clip' | 'scroll';
    clipId?: string;
    startClientX: number;
    startClientY: number;
    origStart?: number;
    origScrollX?: number;
  } | null>(null);

  const rafRef                 = useRef(0);
  const schedulerRef           = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeSigRef             = useRef<[number, number]>([4, 4]);

  // ── Sync refs ─────────────────────────────────────────────────────────────
  useEffect(() => { tracksRef.current     = tracks;        }, [tracks]);
  useEffect(() => { zoomRef.current       = zoom;          }, [zoom]);
  useEffect(() => { scrollXRef.current    = scrollX;       }, [scrollX]);
  useEffect(() => { scrollYRef.current    = scrollY;       }, [scrollY]);
  useEffect(() => { bpmRef.current        = bpm;           }, [bpm]);
  useEffect(() => { timeSigRef.current    = timeSig;       }, [timeSig]);
  useEffect(() => {
    masterVolRef.current = masterVol;
    const mg = masterGainRef.current;
    const ctx = audioCtxRef.current;
    if (mg && ctx) mg.gain.setTargetAtTime(masterVol, ctx.currentTime, 0.02);
  }, [masterVol]);

  // ── Audio Init ────────────────────────────────────────────────────────────
  const initAudio = useCallback(async (): Promise<AudioContext> => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const ctx         = new AudioContext();
    const masterGain  = ctx.createGain();
    masterGain.gain.value = masterVolRef.current;
    const masterAn    = ctx.createAnalyser();
    masterAn.fftSize  = 2048;
    masterGain.connect(masterAn);
    masterAn.connect(ctx.destination);
    audioCtxRef.current  = ctx;
    masterGainRef.current = masterGain;
    return ctx;
  }, []);

  // ── Load Files ────────────────────────────────────────────────────────────
  const loadFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setLoading(true);
    setLoadProgress(0);

    const ctx = await initAudio();
    const newTracks: TrackData[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setLoadProgress(Math.round(((i + 0.5) / files.length) * 100));

      try {
        const ab     = await file.arrayBuffer();
        const buf    = await ctx.decodeAudioData(ab);
        const peaks  = genPeaks(buf, 1200);
        const { instrument, icon } = detectInst(file.name);
        const color   = TRACK_COLORS[i % TRACK_COLORS.length];
        const trackId = `trk-${Date.now()}-${i}`;
        const clipId  = `clip-${trackId}`;

        const clip: ClipData = {
          id: clipId, trackId, audioBuffer: buf, peaks,
          startTime: 0, trimStart: 0, trimEnd: 0, fadeIn: 0, fadeOut: 0.05,
          name: file.name.replace(/\.[^/.]+$/, ''), color,
        };

        const track: TrackData = {
          id: trackId, name: file.name.replace(/\.[^/.]+$/, ''),
          instrument, icon, color,
          volume: 0.8, pan: 0, muted: false, solo: false, armed: false,
          height: 80, clips: [clip],
        };

        // Audio nodes
        const gainNode    = ctx.createGain();
        gainNode.gain.value = 0.8;
        const panNode     = ctx.createStereoPanner();
        const analyserNode = ctx.createAnalyser();
        analyserNode.fftSize = 256;
        gainNode.connect(panNode);
        panNode.connect(analyserNode);
        analyserNode.connect(masterGainRef.current!);

        trackNodesRef.current.set(trackId, { gainNode, panNode, analyserNode });
        newTracks.push(track);
      } catch (err) {
        console.error(`Error loading ${file.name}:`, err);
      }
    }

    setTracks(newTracks);
    setLoading(false);
    setLoadProgress(100);
  }, [initAudio]);

  useEffect(() => {
    if (uploadedFiles.length > 0) loadFiles(uploadedFiles);
  }, [uploadedFiles, loadFiles]);

  // ── Scheduling ────────────────────────────────────────────────────────────
  const scheduleClips = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !isPlayingRef.current) return;

    const ctxNow   = ctx.currentTime;
    const tlNow    = startTlTimeRef.current + (ctxNow - startCtxTimeRef.current);
    const until    = tlNow + LOOKAHEAD;
    const hasSolo  = tracksRef.current.some(t => t.solo);

    for (const track of tracksRef.current) {
      if (track.muted || (hasSolo && !track.solo)) continue;
      const nodes = trackNodesRef.current.get(track.id);
      if (!nodes) continue;

      for (const clip of track.clips) {
        const key     = `${clip.id}`;
        if (scheduledRef.current.has(key)) continue;

        const dur     = clip.audioBuffer.duration - clip.trimStart - clip.trimEnd;
        const tlStart = clip.startTime + clip.trimStart;
        const tlEnd   = tlStart + dur;

        if (tlEnd <= tlNow || tlStart > until) continue;

        const ctxStart   = startCtxTimeRef.current + (tlStart - startTlTimeRef.current);
        const bufOffset  = clip.trimStart + Math.max(0, tlNow - tlStart);
        const remaining  = tlEnd - Math.max(tlNow, tlStart);
        if (remaining <= 0) continue;

        const src = ctx.createBufferSource();
        src.buffer = clip.audioBuffer;
        src.connect(nodes.gainNode);
        src.start(Math.max(ctxNow + 0.005, ctxStart), bufOffset, remaining);
        src.onended = () => { scheduledRef.current.delete(key); };
        scheduledRef.current.set(key, src);
      }
    }
  }, []);

  // ── Stop all sources ──────────────────────────────────────────────────────
  const stopAllSources = useCallback(() => {
    for (const src of scheduledRef.current.values()) {
      try { src.stop(); src.disconnect(); } catch {}
    }
    scheduledRef.current.clear();
  }, []);

  // ── Play ──────────────────────────────────────────────────────────────────
  const play = useCallback(async () => {
    const ctx = await initAudio();
    if (tracksRef.current.length === 0) return;
    if (ctx.state === 'suspended') await ctx.resume();

    stopAllSources();
    const now = ctx.currentTime;
    startCtxTimeRef.current = now + 0.05;
    startTlTimeRef.current  = playheadRef.current;
    isPlayingRef.current    = true;
    setIsPlaying(true);

    scheduleClips();
    schedulerRef.current = setInterval(scheduleClips, SCHED_MS);
  }, [initAudio, stopAllSources, scheduleClips]);

  // ── Pause ─────────────────────────────────────────────────────────────────
  const pause = useCallback(() => {
    if (!isPlayingRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx) {
      const tlNow = startTlTimeRef.current + (ctx.currentTime - startCtxTimeRef.current);
      playheadRef.current = tlNow;
      setPlayheadTime(tlNow);
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
    stopAllSources();
    if (schedulerRef.current) clearInterval(schedulerRef.current);
  }, [stopAllSources]);

  // ── Stop ──────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    stopAllSources();
    if (schedulerRef.current) clearInterval(schedulerRef.current);
    playheadRef.current = 0;
    setPlayheadTime(0);
    setScrollX(0);
    scrollXRef.current = 0;
  }, [stopAllSources]);

  // ── Seek ──────────────────────────────────────────────────────────────────
  const seek = useCallback((time: number) => {
    const t = Math.max(0, time);
    const wasPlaying = isPlayingRef.current;
    if (wasPlaying) {
      isPlayingRef.current = false;
      stopAllSources();
      if (schedulerRef.current) clearInterval(schedulerRef.current);
    }
    playheadRef.current = t;
    setPlayheadTime(t);
    if (wasPlaying) setTimeout(() => play(), 30);
  }, [stopAllSources, play]);

  // ── Track controls ────────────────────────────────────────────────────────
  const updateTrackVol = useCallback((id: string, vol: number) => {
    const nodes = trackNodesRef.current.get(id);
    const ctx   = audioCtxRef.current;
    if (nodes && ctx) nodes.gainNode.gain.setTargetAtTime(vol, ctx.currentTime, 0.02);
    setTracks(prev => prev.map(t => t.id === id ? { ...t, volume: vol } : t));
  }, []);

  const updateTrackPan = useCallback((id: string, pan: number) => {
    const nodes = trackNodesRef.current.get(id);
    const ctx   = audioCtxRef.current;
    if (nodes && ctx) nodes.panNode.pan.setTargetAtTime(pan, ctx.currentTime, 0.02);
    setTracks(prev => prev.map(t => t.id === id ? { ...t, pan } : t));
  }, []);

  const applySoloMute = useCallback((updated: TrackData[]) => {
    const ctx     = audioCtxRef.current;
    const hasSolo = updated.some(t => t.solo);
    if (!ctx) return;
    updated.forEach(t => {
      const nodes  = trackNodesRef.current.get(t.id);
      if (!nodes) return;
      const silent = t.muted || (hasSolo && !t.solo);
      nodes.gainNode.gain.setTargetAtTime(silent ? 0 : t.volume, ctx.currentTime, 0.02);
    });
  }, []);

  const toggleMute = useCallback((id: string) => {
    setTracks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, muted: !t.muted } : t);
      applySoloMute(next);
      return next;
    });
  }, [applySoloMute]);

  const toggleSolo = useCallback((id: string) => {
    setTracks(prev => {
      const next = prev.map(t => t.id === id ? { ...t, solo: !t.solo } : t);
      applySoloMute(next);
      return next;
    });
  }, [applySoloMute]);

  const toggleArm = useCallback((id: string) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, armed: !t.armed } : t));
  }, []);

  const deleteTrack = useCallback((id: string) => {
    const nodes = trackNodesRef.current.get(id);
    if (nodes) {
      try { nodes.gainNode.disconnect(); nodes.panNode.disconnect(); nodes.analyserNode.disconnect(); } catch {}
      trackNodesRef.current.delete(id);
    }
    setTracks(prev => prev.filter(t => t.id !== id));
  }, []);

  const renameTrack = useCallback((id: string, name: string) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, name } : t));
  }, []);

  const addEmptyTrack = useCallback(async () => {
    const ctx = await initAudio();
    const id  = `trk-${Date.now()}`;
    const color = TRACK_COLORS[tracksRef.current.length % TRACK_COLORS.length];

    const gainNode    = ctx.createGain(); gainNode.gain.value = 0.8;
    const panNode     = ctx.createStereoPanner();
    const analyserNode = ctx.createAnalyser(); analyserNode.fftSize = 256;
    gainNode.connect(panNode);
    panNode.connect(analyserNode);
    analyserNode.connect(masterGainRef.current!);
    trackNodesRef.current.set(id, { gainNode, panNode, analyserNode });

    setTracks(prev => [...prev, {
      id, name: `Track ${prev.length + 1}`, instrument: 'Track', icon: '🎵',
      color, volume: 0.8, pan: 0, muted: false, solo: false, armed: false, height: 80, clips: [],
    }]);
  }, [initAudio]);

  // ── Canvas drawing ────────────────────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const C   = canvas.getContext('2d');
    if (!C) return;
    const W   = canvas.width;
    const H   = canvas.height;
    const z   = zoomRef.current;
    const sx  = scrollXRef.current;
    const sy  = scrollYRef.current;
    const trks = tracksRef.current;
    const bpm_  = bpmRef.current;
    const [num] = timeSigRef.current;

    C.clearRect(0, 0, W, H);

    // Background
    C.fillStyle = '#090610';
    C.fillRect(0, 0, W, H);

    // ── Grid ────────────────────────────────────────────────────────────────
    const beat     = 60 / bpm_;
    const bar      = beat * num;
    const tLeft    = sx / z;
    const tRight   = (sx + W) / z;

    // Vertical beat/bar lines
    const firstBeat = Math.floor(tLeft / beat) * beat;
    for (let t = firstBeat; t < tRight + beat; t += beat) {
      const x      = Math.round(t * z - sx);
      const isBar  = (Math.abs(t % bar) < beat * 0.01) || (Math.abs(t % bar - bar) < beat * 0.01);
      C.strokeStyle = isBar ? 'rgba(139,92,246,0.14)' : 'rgba(139,92,246,0.05)';
      C.lineWidth   = isBar ? 1 : 0.5;
      C.beginPath();
      C.moveTo(x, RULER_H);
      C.lineTo(x, H);
      C.stroke();
    }

    // ── Ruler ────────────────────────────────────────────────────────────────
    C.fillStyle = T.ruler;
    C.fillRect(0, 0, W, RULER_H);
    // Ruler bottom border
    C.strokeStyle = 'rgba(139,92,246,0.25)';
    C.lineWidth = 1;
    C.beginPath(); C.moveTo(0, RULER_H); C.lineTo(W, RULER_H); C.stroke();

    // Ruler labels & ticks
    C.font = '10px -apple-system,"DM Sans",system-ui,monospace';

    let labelInterval: number;
    if      (z >= 600) labelInterval = beat / 4;
    else if (z >= 250) labelInterval = beat;
    else if (z >= 60)  labelInterval = bar;
    else if (z >= 20)  labelInterval = bar * 4;
    else               labelInterval = bar * 16;

    const firstLabel = Math.ceil(tLeft / labelInterval) * labelInterval;
    for (let t = firstLabel; t < tRight + labelInterval; t += labelInterval) {
      const x     = Math.round(t * z - sx);
      const isBar = (Math.abs(t % bar) < beat * 0.01) || (Math.abs(t % bar - bar) < beat * 0.01);

      C.strokeStyle = isBar ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)';
      C.lineWidth = 1;
      C.beginPath();
      C.moveTo(x, RULER_H - (isBar ? 12 : 5));
      C.lineTo(x, RULER_H);
      C.stroke();

      if (isBar || z > 150) {
        const bars  = Math.round(t / bar);
        const label = z >= 200 && !isBar
          ? `${Math.round(t / bar) + 1}:${Math.round((t % bar) / beat) + 1}`
          : `${bars + 1}`;
        C.fillStyle = isBar ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.28)';
        C.textAlign = 'left';
        C.fillText(label, x + 3, RULER_H - 16);
      }
    }

    // ── Loop region ──────────────────────────────────────────────────────────
    if (loopEnabled) {
      const lx1 = loopStart * z - sx;
      const lx2 = loopEnd   * z - sx;
      C.fillStyle = T.loopRgn;
      C.fillRect(lx1, 0, lx2 - lx1, H);
      C.strokeStyle = 'rgba(96,165,250,0.5)';
      C.lineWidth = 1;
      C.beginPath(); C.moveTo(lx1, 0); C.lineTo(lx1, H); C.stroke();
      C.beginPath(); C.moveTo(lx2, 0); C.lineTo(lx2, H); C.stroke();
    }

    // ── Tracks & Clips ────────────────────────────────────────────────────────
    let trackY = RULER_H - sy;

    for (const track of trks) {
      const ty = trackY;
      const th = track.height;

      // Track background (alternate)
      C.fillStyle = 'rgba(14,10,28,0.5)';
      C.fillRect(0, ty, W, th);

      // Track separator
      C.strokeStyle = 'rgba(139,92,246,0.07)';
      C.lineWidth = 1;
      C.beginPath(); C.moveTo(0, ty + th - 0.5); C.lineTo(W, ty + th - 0.5); C.stroke();

      // ── Clips ──────────────────────────────────────────────────────────────
      for (const clip of track.clips) {
        const clipDur = clip.audioBuffer.duration - clip.trimStart - clip.trimEnd;
        const cx      = clip.startTime * z - sx;
        const cw      = Math.max(clipDur * z, 2);

        // Cull
        if (cx + cw < 0 || cx > W) continue;

        // Visible portion
        const vx1 = Math.max(cx, 0);
        const vx2 = Math.min(cx + cw, W);
        const vw  = vx2 - vx1;
        if (vw < 1) continue;

        const isSel = clip.id === selectedClipId;

        // Clip body
        C.save();
        C.beginPath();
        if (C.roundRect) {
          C.roundRect(vx1, ty + 2, vw, th - 4, [4, Math.min(4, vw * 0.1), 4, 4]);
        } else {
          C.rect(vx1, ty + 2, vw, th - 4);
        }
        C.clip();

        // Gradient fill
        const grad = C.createLinearGradient(vx1, ty, vx1, ty + th);
        grad.addColorStop(0, track.color + '50');
        grad.addColorStop(0.5, track.color + '28');
        grad.addColorStop(1, track.color + '14');
        C.fillStyle = grad;
        C.fillRect(vx1, ty + 2, vw, th - 4);

        // Waveform
        if (clip.peaks.length > 0 && vw > 3) {
          const wY    = ty + th * 0.5;
          const maxAm = (th - 20) * 0.5;
          C.globalAlpha = track.muted ? 0.25 : 0.9;
          C.strokeStyle = track.color;
          C.lineWidth   = 1;
          C.beginPath();

          const pixStep = Math.max(1, Math.floor(vw / clip.peaks.length));
          for (let px = Math.floor(vx1); px < vx2; px += pixStep) {
            const pct = (px - cx) / cw;
            const pi  = Math.max(0, Math.min(clip.peaks.length - 1, Math.floor(pct * clip.peaks.length)));
            const amp = clip.peaks[pi] * maxAm;
            C.moveTo(px, wY - amp);
            C.lineTo(px, wY + amp);
          }
          C.stroke();
          C.globalAlpha = 1;

          // Fade-in overlay
          if (clip.fadeIn > 0 && cw > 10) {
            const fiW = clip.fadeIn * z;
            const fiGrad = C.createLinearGradient(cx, 0, cx + fiW, 0);
            fiGrad.addColorStop(0, 'rgba(0,0,0,0.7)');
            fiGrad.addColorStop(1, 'rgba(0,0,0,0)');
            C.fillStyle = fiGrad;
            C.fillRect(vx1, ty + 2, Math.min(fiW, vw), th - 4);
          }

          // Fade-out overlay
          if (clip.fadeOut > 0 && cw > 10) {
            const foW   = clip.fadeOut * z;
            const foX   = cx + cw - foW;
            const foGrad = C.createLinearGradient(foX, 0, foX + foW, 0);
            foGrad.addColorStop(0, 'rgba(0,0,0,0)');
            foGrad.addColorStop(1, 'rgba(0,0,0,0.7)');
            C.fillStyle = foGrad;
            C.fillRect(Math.max(vx1, foX), ty + 2, Math.min(foW, vw), th - 4);
          }
        }

        // Clip name label
        if (vw > 30) {
          C.font = 'bold 10px -apple-system,"DM Sans",system-ui';
          C.fillStyle = 'rgba(255,255,255,0.88)';
          C.textAlign = 'left';
          C.fillText(clip.name, vx1 + 6, ty + 15);
        }

        // Clip duration label
        if (vw > 60) {
          C.font = '9px monospace';
          C.fillStyle = 'rgba(255,255,255,0.35)';
          C.textAlign = 'left';
          C.fillText(fmtSec(clipDur), vx1 + 6, ty + 26);
        }

        C.restore();

        // Selection border
        if (isSel) {
          C.strokeStyle = 'rgba(255,255,255,0.9)';
          C.lineWidth = 1.5;
          C.beginPath();
          if (C.roundRect) {
            C.roundRect(vx1 + 0.75, ty + 2.75, vw - 1.5, th - 5.5, 4);
          } else {
            C.rect(vx1 + 0.75, ty + 2.75, vw - 1.5, th - 5.5);
          }
          C.stroke();
        }

        // Muted indicator
        if (track.muted) {
          C.font = 'bold 9px system-ui';
          C.fillStyle = T.amber;
          C.textAlign = 'right';
          C.fillText('MUTED', vx2 - 6, ty + 15);
        }
      }

      trackY += th;
    }

    // ── Playhead ──────────────────────────────────────────────────────────────
    let currentTl: number;
    if (isPlayingRef.current && audioCtxRef.current) {
      currentTl = startTlTimeRef.current + (audioCtxRef.current.currentTime - startCtxTimeRef.current);
      // Auto-scroll to follow playhead
      const phCanvasX = currentTl * z - sx;
      if (phCanvasX > W * 0.75) {
        const newSX = currentTl * z - W * 0.25;
        scrollXRef.current = newSX;
        setScrollX(newSX);
      }
    } else {
      currentTl = playheadRef.current;
    }

    const phX = Math.round(currentTl * z - sx);

    if (phX >= -2 && phX <= W + 2) {
      // Shadow/glow
      C.save();
      C.shadowColor = T.playhead;
      C.shadowBlur  = 10;
      C.strokeStyle = T.playhead;
      C.lineWidth   = 1.5;
      C.beginPath();
      C.moveTo(phX, 0);
      C.lineTo(phX, H);
      C.stroke();
      C.restore();

      // Arrow head
      C.fillStyle = T.playhead;
      C.beginPath();
      C.moveTo(phX - 7, 0);
      C.lineTo(phX + 7, 0);
      C.lineTo(phX + 7, 10);
      C.lineTo(phX, 20);
      C.lineTo(phX - 7, 10);
      C.closePath();
      C.fill();
    }

    // Sync playhead state
    if (isPlayingRef.current) {
      playheadRef.current = currentTl;
      setPlayheadTime(currentTl);
    }
  }, [selectedClipId, loopEnabled, loopStart, loopEnd]);

  // ── Animation loop ────────────────────────────────────────────────────────
  useEffect(() => {
    const loop = () => {
      drawCanvas();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [drawCanvas]);

  // ── Resize observer ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;

    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        canvas.width  = e.contentRect.width;
        canvas.height = e.contentRect.height;
      }
    });
    ro.observe(wrap);

    // Initial size
    const rect = wrap.getBoundingClientRect();
    canvas.width  = rect.width;
    canvas.height = rect.height;

    return () => ro.disconnect();
  }, []);

  // ── Canvas hit testing ────────────────────────────────────────────────────
  const getTimeFromClientX = useCallback((clientX: number): number => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return ((clientX - rect.left) + scrollXRef.current) / zoomRef.current;
  }, []);

  const getTrackAtClientY = useCallback((clientY: number): TrackData | null => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const relY = (clientY - rect.top) - RULER_H + scrollYRef.current;
    let cumY = 0;
    for (const track of tracksRef.current) {
      if (relY >= cumY && relY < cumY + track.height) return track;
      cumY += track.height;
    }
    return null;
  }, []);

  const getClipAt = useCallback((time: number, track: TrackData): ClipData | null => {
    for (const clip of track.clips) {
      const end = clip.startTime + clip.audioBuffer.duration - clip.trimEnd;
      if (time >= clip.startTime && time <= end) return clip;
    }
    return null;
  }, []);

  // ── Mouse events ──────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relY = e.clientY - rect.top;

    // Ruler click → seek
    if (relY <= RULER_H) {
      const t = getTimeFromClientX(e.clientX);
      seek(t);
      dragRef.current = { type: 'seek', startClientX: e.clientX, startClientY: e.clientY };
      return;
    }

    // Middle mouse / space+drag → scroll
    if (e.button === 1 || e.altKey) {
      dragRef.current = {
        type: 'scroll', startClientX: e.clientX, startClientY: e.clientY,
        origScrollX: scrollXRef.current,
      };
      return;
    }

    const time  = getTimeFromClientX(e.clientX);
    const track = getTrackAtClientY(e.clientY);
    if (!track) return;

    const clip = getClipAt(time, track);
    if (clip) {
      setSelectedClipId(clip.id);
      setSelectedTrkId(track.id);
      dragRef.current = {
        type: 'clip', clipId: clip.id,
        startClientX: e.clientX, startClientY: e.clientY,
        origStart: clip.startTime,
      };
    } else {
      setSelectedClipId(null);
      setSelectedTrkId(track.id);
    }
  }, [getTimeFromClientX, getTrackAtClientY, getClipAt, seek]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;

    if (drag.type === 'seek') {
      seek(getTimeFromClientX(e.clientX));
    } else if (drag.type === 'clip' && drag.clipId && drag.origStart !== undefined) {
      const dt       = dx / zoomRef.current;
      const newStart = Math.max(0, drag.origStart + dt);
      setTracks(prev => prev.map(t => ({
        ...t,
        clips: t.clips.map(c => c.id === drag.clipId ? { ...c, startTime: newStart } : c),
      })));
    } else if (drag.type === 'scroll' && drag.origScrollX !== undefined) {
      const newSX = Math.max(0, drag.origScrollX - dx);
      setScrollX(newSX);
      scrollXRef.current = newSX;
      const newSY = Math.max(0, scrollYRef.current - dy * 0.2);
      setScrollY(newSY);
      scrollYRef.current = newSY;
    }
  }, [getTimeFromClientX, seek]);

  const handleMouseUp = useCallback(() => { dragRef.current = null; }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Zoom centred on mouse
      const rect   = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const tAtM   = (mouseX + scrollXRef.current) / zoomRef.current;
      const factor = e.deltaY > 0 ? 0.82 : 1.22;
      const newZ   = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current * factor));
      const newSX  = Math.max(0, tAtM * newZ - mouseX);
      setZoom(newZ);     zoomRef.current   = newZ;
      setScrollX(newSX); scrollXRef.current = newSX;
    } else if (e.shiftKey) {
      // Vertical scroll
      const nsy = Math.max(0, scrollYRef.current + e.deltaY);
      setScrollY(nsy); scrollYRef.current = nsy;
    } else {
      // Horizontal scroll
      const nsx = Math.max(0, scrollXRef.current + e.deltaX + e.deltaY * 0.5);
      setScrollX(nsx); scrollXRef.current = nsx;
    }
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.code) {
        case 'Space': e.preventDefault(); isPlayingRef.current ? pause() : play(); break;
        case 'Home':  e.preventDefault(); stop(); break;
        case 'Delete':
        case 'Backspace':
          if (selectedClipId) {
            e.preventDefault();
            setTracks(prev => prev.map(t => ({
              ...t, clips: t.clips.filter(c => c.id !== selectedClipId),
            })));
            setSelectedClipId(null);
          }
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [play, pause, stop, selectedClipId]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (schedulerRef.current) clearInterval(schedulerRef.current);
      stopAllSources();
      audioCtxRef.current?.close();
    };
  }, [stopAllSources]);

  // ── File drop on canvas ───────────────────────────────────────────────────
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(
      f => f.type.startsWith('audio/') || /\.(wav|mp3|flac|aac|ogg|m4a)$/i.test(f.name)
    );
    if (files.length > 0) {
      const ctx  = await initAudio();
      const color = TRACK_COLORS[tracksRef.current.length % TRACK_COLORS.length];
      const newTracks: TrackData[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const ab    = await file.arrayBuffer();
          const buf   = await ctx.decodeAudioData(ab);
          const peaks = genPeaks(buf, 1200);
          const { instrument, icon } = detectInst(file.name);
          const c     = TRACK_COLORS[(tracksRef.current.length + i) % TRACK_COLORS.length];
          const tId   = `trk-${Date.now()}-${i}`;
          const cId   = `clip-${tId}`;

          const clip: ClipData = {
            id: cId, trackId: tId, audioBuffer: buf, peaks,
            startTime: 0, trimStart: 0, trimEnd: 0, fadeIn: 0, fadeOut: 0.05,
            name: file.name.replace(/\.[^/.]+$/, ''), color: c,
          };

          const track: TrackData = {
            id: tId, name: file.name.replace(/\.[^/.]+$/, ''),
            instrument, icon, color: c,
            volume: 0.8, pan: 0, muted: false, solo: false, armed: false, height: 80, clips: [clip],
          };

          const gainNode    = ctx.createGain(); gainNode.gain.value = 0.8;
          const panNode     = ctx.createStereoPanner();
          const analyserNode = ctx.createAnalyser(); analyserNode.fftSize = 256;
          gainNode.connect(panNode); panNode.connect(analyserNode); analyserNode.connect(masterGainRef.current!);
          trackNodesRef.current.set(tId, { gainNode, panNode, analyserNode });
          newTracks.push(track);
        } catch {}
      }
      setTracks(prev => [...prev, ...newTracks]);
      void color;
    }
  }, [initAudio]);

  // ── Total tracks height (for scroll) ─────────────────────────────────────
  const totalH = tracks.reduce((s, t) => s + t.height, 0);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      width: '100%', height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: T.bg, color: T.text, overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "DM Sans", system-ui, sans-serif',
    }}>

      {/* ── App Header ──────────────────────────────────────────────────── */}
      <div style={{
        height: 40, minHeight: 40,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 14px',
        background: 'linear-gradient(180deg,#0d0a1f 0%,#0a0818 100%)',
        borderBottom: `1px solid ${T.border}`,
        zIndex: 200,
      }}>
        <button onClick={onBack} style={hdrBtn}>
          ← Back
        </button>
        <div style={{ width: 1, height: 18, background: T.border }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: `linear-gradient(135deg, ${T.violet}, ${T.pink})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800,
          }}>M</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>
            MixingMusic.AI
          </span>
          <span style={{ fontSize: 11, color: T.text3 }}>/ Timeline</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Switch views */}
        {onSwitchToMixer && (
          <button onClick={onSwitchToMixer} style={hdrBtn}>
            ⚡ Mixer
          </button>
        )}

        {/* Shortcuts toggle */}
        <button
          onClick={() => setShowShortcuts(v => !v)}
          style={{ ...hdrBtn, background: showShortcuts ? 'rgba(139,92,246,0.15)' : undefined }}
        >
          ? Shortcuts
        </button>

        {user && (
          <span style={{ fontSize: 11, color: T.text3 }}>
            {user.firstName}
          </span>
        )}
      </div>

      {/* ── Shortcuts panel ─────────────────────────────────────────────── */}
      {showShortcuts && (
        <div style={{
          background: T.surface, borderBottom: `1px solid ${T.border}`,
          padding: '8px 20px', display: 'flex', gap: 32, flexWrap: 'wrap',
        }}>
          {[
            ['Space', 'Play / Pause'],
            ['Home', 'Stop & Return'],
            ['Del / ⌫', 'Delete clip'],
            ['⌘+Scroll', 'Zoom in/out'],
            ['Scroll', 'Scroll right/left'],
            ['Shift+Scroll', 'Scroll up/down'],
            ['Click ruler', 'Seek'],
            ['Drag clip', 'Move clip'],
            ['Double-click name', 'Rename track'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <kbd style={{
                background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.borderMid}`,
                borderRadius: 4, padding: '1px 7px', fontSize: 10, fontFamily: 'monospace',
                color: T.text2,
              }}>{k}</kbd>
              <span style={{ fontSize: 10, color: T.text3 }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Transport Bar ────────────────────────────────────────────────── */}
      <TransportBar
        isPlaying={isPlaying}
        isRecording={isRecording}
        playheadTime={playheadTime}
        bpm={bpm}
        timeSig={timeSig}
        masterVol={masterVol}
        zoom={zoom}
        tracksCount={tracks.length}
        loopEnabled={loopEnabled}
        onPlay={play}
        onPause={pause}
        onStop={stop}
        onRecord={() => {}}
        onBpmChange={setBpm}
        onMasterVolChange={setMasterVol}
        onZoomChange={z => { setZoom(z); zoomRef.current = z; }}
        onLoopToggle={() => setLoopEnabled(v => !v)}
      />

      {/* ── Main Area ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Track Panel (left) ─────────────────────────────────────────── */}
        <div style={{
          width: PANEL_W, minWidth: PANEL_W,
          background: T.panel,
          borderRight: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Panel header */}
          <div style={{
            height: RULER_H, minHeight: RULER_H,
            display: 'flex', alignItems: 'center', padding: '0 10px',
            background: T.ruler, borderBottom: `1px solid ${T.border}`,
            gap: 8,
          }}>
            <span style={{ fontSize: 10, color: T.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, flex: 1 }}>
              Tracks
            </span>
            <button
              onClick={addEmptyTrack}
              style={{
                padding: '3px 10px', borderRadius: 6,
                background: 'rgba(139,92,246,0.12)', border: `1px solid ${T.borderMid}`,
                color: T.text2, fontSize: 10, cursor: 'pointer', fontWeight: 700,
                letterSpacing: 0.3,
              }}
            >+ Add</button>
          </div>

          {/* Loading indicator */}
          {loading && (
            <div style={{ padding: '20px 16px' }}>
              <div style={{ color: T.violet, fontSize: 12, marginBottom: 8, textAlign: 'center' }}>
                Loading audio… {loadProgress}%
              </div>
              <div style={{ height: 3, background: 'rgba(139,92,246,0.1)', borderRadius: 999 }}>
                <div style={{
                  height: '100%', width: `${loadProgress}%`,
                  background: `linear-gradient(90deg,${T.violet},${T.pink})`,
                  borderRadius: 999, transition: 'width 0.2s',
                }} />
              </div>
            </div>
          )}

          {/* Empty state */}
          {tracks.length === 0 && !loading && (
            <div style={{ padding: 24, textAlign: 'center', color: T.text3, fontSize: 11, lineHeight: 1.7 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🎵</div>
              No tracks yet.<br />
              Upload files or drag audio<br />onto the timeline.
            </div>
          )}

          {/* Track strips */}
          <div style={{
            flex: 1, overflowY: 'auto', overflowX: 'hidden',
            scrollbarWidth: 'none',
            // Mirror scroll from canvas scrollY
            transform: `translateY(-${scrollY}px)`,
          }}>
            {tracks.map(track => (
              <TrackStrip
                key={track.id}
                track={track}
                isSelected={track.id === selectedTrkId}
                height={track.height}
                onSelect={() => setSelectedTrkId(track.id)}
                onVolumeChange={v => updateTrackVol(track.id, v)}
                onPanChange={p => updateTrackPan(track.id, p)}
                onMuteToggle={() => toggleMute(track.id)}
                onSoloToggle={() => toggleSolo(track.id)}
                onArmToggle={() => toggleArm(track.id)}
                onDelete={() => deleteTrack(track.id)}
                onRename={n => renameTrack(track.id, n)}
                onHeightChange={h => setTracks(prev => prev.map(t => t.id === track.id ? { ...t, height: h } : t))}
              />
            ))}
            {/* Bottom padding */}
            {tracks.length > 0 && <div style={{ height: 80 }} />}
          </div>
        </div>

        {/* ── Arrangement Canvas ─────────────────────────────────────────── */}
        <div
          ref={wrapRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />

          {/* Empty canvas overlay */}
          {tracks.length === 0 && !loading && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{ fontSize: 52, marginBottom: 20, opacity: 0.4 }}>🎛️</div>
              <div style={{ color: T.text2, fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                Drop audio files here to start
              </div>
              <div style={{ color: T.text3, fontSize: 12, lineHeight: 1.8, textAlign: 'center' }}>
                Supports WAV · MP3 · FLAC · AAC · OGG<br />
                ⌘+Scroll to zoom · Scroll to pan · Space to play
              </div>
            </div>
          )}

          {/* Vertical scrollbar for tracks */}
          {totalH > 400 && (
            <div style={{
              position: 'absolute', right: 2, top: RULER_H, bottom: 0,
              width: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 3,
            }}>
              <div
                style={{
                  position: 'absolute',
                  top: `${(scrollY / totalH) * 100}%`,
                  height: `${Math.min(100, (400 / totalH) * 100)}%`,
                  left: 1, right: 1,
                  background: 'rgba(139,92,246,0.4)', borderRadius: 3,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <div style={{
        height: 22, display: 'flex', alignItems: 'center', gap: 14, padding: '0 14px',
        background: T.panel, borderTop: `1px solid ${T.border}`,
        fontSize: 10, color: T.text3,
      }}>
        <span style={{ color: isPlaying ? T.green : T.text3, fontWeight: isPlaying ? 700 : 400 }}>
          {isPlaying ? '▶ PLAYING' : '■ STOPPED'}
        </span>
        <span>·</span>
        <span>{tracks.length} track{tracks.length !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>{tracks.reduce((s, t) => s + t.clips.length, 0)} clip{tracks.reduce((s, t) => s + t.clips.length, 0) !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>Zoom {Math.round(zoom)}px/s</span>
        {selectedClipId && (
          <>
            <span>·</span>
            <span style={{ color: T.violet }}>Clip selected — Del to remove</span>
          </>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ color: T.text3 }}>
          {fmtPos(playheadTime, bpm, timeSig[0])} · {fmtSec(playheadTime)}
        </span>
      </div>
    </div>
  );
}

// ── Shared button style ───────────────────────────────────────────────────
const hdrBtn: React.CSSProperties = {
  padding: '4px 12px', borderRadius: 6,
  background: 'rgba(255,255,255,0.05)',
  border: `1px solid rgba(255,255,255,0.08)`,
  color: '#9b8fc0', fontSize: 11, cursor: 'pointer',
  fontWeight: 500, fontFamily: 'inherit',
  transition: 'all 0.15s',
};
