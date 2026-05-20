import React, { useState, useEffect, useRef, useMemo } from 'react';

/* ─── TYPES ─── */
interface Track {
  id: number;
  name: string;
  type: string;
  pan: number;
  vol: number;
  kind: string;
  solo: boolean;
  mute: boolean;
  density: number;
}

interface MixEditorProps {
  stems: any[];
  user: any;
  onBack: () => void;
  onStartMix?: () => void;
  onExport?: () => void;
}

/* ─── CONSTANTS ─── */
const TRACK_COLORS = ['#B07CF0','#E08254','#D9C566','#4FD4D4','#6DCE7A','#5B9BF4','#E07AB6','#E08254','#D9C566'];

const DEMO_TRACKS: Track[] = [
  { id: 1, name: '1 - Intro Left',  type: 'WAV · 24bit', pan: -10, vol: -6.0, kind: 'note',   solo: false, mute: false, density: 0.55 },
  { id: 2, name: '2 - Intro Right', type: 'WAV · 24bit', pan: -10, vol: -3.2, kind: 'guitar', solo: false, mute: false, density: 0.60 },
  { id: 3, name: '3 - Guitar Left', type: 'WAV · 24bit', pan:   0, vol: -8.1, kind: 'guitar', solo: true,  mute: false, density: 0.72 },
  { id: 4, name: '4 - Guitar Right',type: 'WAV · 24bit', pan:   0, vol: -1.8, kind: 'note',   solo: false, mute: false, density: 0.68 },
  { id: 5, name: '5 - Armonico',    type: 'WAV · 24bit', pan: +30, vol: -4.8, kind: 'note',   solo: true,  mute: false, density: 0.58 },
];

/* ─── ICONS ─── */
const Icon = ({ d, size = 16 }: { d: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

const I = {
  play: <Icon d={<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" />} />,
  pause: <Icon d={<><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/></>} />,
  back: <Icon d={<polygon points="19 5 9 12 19 19 19 5" fill="currentColor" stroke="none" />} />,
  rec: <Icon d={<circle cx="12" cy="12" r="6" fill="currentColor" stroke="none" />} />,
  metro: <Icon d={<><path d="M8 4h8l3 16H5z"/><path d="M12 6v10"/></>} />,
  zoomIn: <Icon d={<><circle cx="11" cy="11" r="6"/><path d="M11 8v6M8 11h6M20 20l-3.5-3.5"/></>} />,
  panel: <Icon d={<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></>} />,
  mixer: <Icon d={<><path d="M6 3v8M6 15v6M12 3v4M12 11v10M18 3v12M18 19v2"/><circle cx="6" cy="13" r="2"/><circle cx="12" cy="9" r="2"/><circle cx="18" cy="17" r="2"/></>} />,
  master: <Icon d={<><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor"/></>} />,
  download: <Icon d={<><path d="M12 4v12M6 11l6 6 6-6M4 20h16"/></>} />,
  vol: <Icon d={<><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8a5 5 0 010 8"/></>} />,
};

/* ─── HELPERS ─── */
function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function makeWaveform(seed: number, samples = 380, density = 0.6): number[] {
  const rnd = seeded(seed);
  const arr = new Array(samples);
  let env = 0;
  for (let i = 0; i < samples; i++) {
    const target = (Math.sin(i / 9 + seed) * 0.4 + 0.6) * density;
    env += (target - env) * 0.18;
    const noise = (rnd() - 0.5) * 0.9;
    const v = Math.min(1, Math.max(0.05, Math.abs(env + noise * env)));
    arr[i] = v;
  }
  for (let i = 0; i < 8; i++) { arr[i] *= i/8; arr[samples-1-i] *= i/8; }
  return arr;
}

function WaveformCanvas({ track }: { track: Track }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveform = useMemo(() => makeWaveform(track.id, 380, track.density), [track.id, track.density]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    ctx.fillStyle = 'rgba(8,4,16,0.4)';
    ctx.fillRect(0, 0, w, h);

    const color = TRACK_COLORS[DEMO_TRACKS.indexOf(track) % TRACK_COLORS.length];
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, h/2);

    for (let i = 0; i < waveform.length; i++) {
      const x = (i / waveform.length) * w;
      const y = h/2 - (waveform[i] - 0.5) * h * 0.8;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [track, waveform]);

  return <canvas ref={canvasRef} width={340} height={48} style={{ width: '100%', height: 'auto' }} />;
}

function Fader({ value, color }: { value: number; color: string }) {
  const norm = Math.max(0, Math.min(1, (value + 60) / 66));
  const top = (1 - norm) * 100;

  return (
    <div className="fader">
      <div className="fader-track">
        <div className="fader-rail" />
        <div className="fader-cap" style={{ top: `${top}%`, borderColor: color }}>
          <div className="fader-grip" />
        </div>
      </div>
      <div className="fader-val">{value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1)}</div>
    </div>
  );
}

function TrackCard({ track, idx, selected, onSelect }: { track: Track; idx: number; selected: boolean; onSelect: () => void }) {
  const color = TRACK_COLORS[idx % TRACK_COLORS.length];

  return (
    <div className={`track-card ${selected ? 'selected' : ''}`} onClick={onSelect} style={{ borderLeftColor: color }}>
      <div className="track-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, flexShrink: 0 }} />
          <div>
            <div className="track-card-name">{track.name}</div>
            <div className="track-card-type">{track.type}</div>
          </div>
        </div>
        <div className="track-card-btns">
          <button className="track-btn mute">🔇</button>
          <button className="track-btn solo">S</button>
        </div>
      </div>

      <WaveformCanvas track={track} />

      <div className="track-card-controls">
        <div className="track-control">
          <label>Vol</label>
          <div style={{ fontSize: '12px', color: color }}>0.0 dB</div>
        </div>
        <div className="track-control">
          <label>Pan</label>
          <div style={{ fontSize: '12px', color: '#9B7EC8' }}>C</div>
        </div>
        <button className="track-preset-btn">+ Preset EQ</button>
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─── */
export default function MixEditor({ stems, user, onBack, onExport }: MixEditorProps) {
  const [tracks] = useState<Track[]>(DEMO_TRACKS);
  const [selected, setSelected] = useState(3);
  const [view, setView] = useState('mixer');
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(46.03);
  const [masterVol, setMasterVol] = useState(-1.2);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setTime(t => t + 1/60);
    }, 16);
    return () => clearInterval(interval);
  }, [playing]);

  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  const ms = Math.floor((time % 1) * 1000);

  return (
    <div className="app">
      {/* Top Bar */}
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} className="topnav-btn">←</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#EC4899,#C026D3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>M</div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#F5F7FA' }}>MixingStudio AI</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', padding: '6px 12px', background: 'rgba(192,38,211,0.15)', borderRadius: '6px', color: '#EC4899' }}>Plan Gratis</span>
          <button onClick={onExport} style={{ padding: '8px 20px', background: 'linear-gradient(135deg,#EC4899,#C026D3)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>✦ Exportar Mezcla con IA</button>
        </div>
      </div>

      {/* Transport Bar */}
      <div className="transport">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="t-btn" onClick={() => setPlaying(!playing)}>
            {playing ? I.pause : I.play}
          </button>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontFamily: 'monospace', fontSize: '13px', color: '#F5F7FA', background: 'rgba(8,4,16,0.5)', padding: '4px 12px', borderRadius: '6px' }}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}.{String(ms).padStart(3, '0')}
          </div>
          <div style={{ fontSize: '12px', color: '#9B7EC8' }}>120 BPM</div>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <button className={`view-btn ${view === 'mixer' ? 'active' : ''}`} onClick={() => setView('mixer')}>
            {I.mixer}<span>Mezclador</span>
          </button>
          <button className={`view-btn ${view === 'master' ? 'active' : ''}`} onClick={() => setView('master')}>
            {I.master}<span>Mastering</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="main">
        <div className="workspace">
          {/* Presets */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(192,38,211,0.1)', background: 'rgba(8,4,16,0.5)' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#9B7EC8', marginBottom: '8px' }}>PRESETS — TOCA PARA APLICAR</div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
              {['Pop', 'Rock', 'Hip Hop', 'Reggaeton', 'Clásica'].map(g => (
                <button key={g} style={{ padding: '8px 16px', background: 'rgba(192,38,211,0.15)', border: '1px solid rgba(192,38,211,0.3)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, color: '#EC4899', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  📊 {g}
                </button>
              ))}
            </div>
          </div>

          {/* Mix Bus Master */}
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(192,38,211,0.1)', background: 'rgba(26,16,40,0.5)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#F5F7FA', marginBottom: '12px' }}>🎛️ MIX BUS MASTER</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              {/* EQ */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#9B7EC8', marginBottom: '8px' }}>EQ — AJUSTA PARA ESCUCHAR</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Bass', 'Mid', 'High'].map(band => (
                    <div key={band} style={{ flex: 1 }}>
                      <div style={{ height: '80px', background: 'rgba(8,4,16,0.4)', borderRadius: '4px', border: '1px solid rgba(192,38,211,0.1)', marginBottom: '4px' }} />
                      <div style={{ fontSize: '10px', color: '#9B7EC8', textAlign: 'center' }}>{band}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Effects */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#9B7EC8', marginBottom: '8px' }}>EFECTOS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {['Reverb', 'Delay', 'Widener'].map(fx => (
                    <label key={fx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#F5F7FA' }}>
                      <input type="checkbox" defaultChecked style={{ cursor: 'pointer' }} />
                      {fx}
                    </label>
                  ))}
                </div>
              </div>

              {/* Compression */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#9B7EC8', marginBottom: '8px' }}>COMPRESIÓN</div>
                <div style={{ background: 'rgba(8,4,16,0.4)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(192,38,211,0.1)' }}>
                  <div style={{ fontSize: '11px', color: '#F5F7FA', marginBottom: '4px' }}>Medium</div>
                  <div style={{ fontSize: '10px', color: '#9B7EC8' }}>Thr: -18dB -6.1</div>
                </div>
              </div>

              {/* LUFS */}
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#9B7EC8', marginBottom: '8px' }}>LUFS</div>
                <div style={{ background: 'rgba(8,4,16,0.4)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(192,38,211,0.1)', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#4ade80', marginBottom: '2px' }}>-10.0</div>
                  <div style={{ fontSize: '9px', color: '#9B7EC8' }}>Spotify -10</div>
                </div>
              </div>
            </div>
          </div>

          {/* Track Cards */}
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1, background: 'rgba(8,4,16,0.3)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {tracks.map((track, idx) => (
                <TrackCard key={track.id} track={track} idx={idx} selected={selected === track.id} onSelect={() => setSelected(track.id)} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="statusbar">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9B7EC8' }}>44.1 kHz</span>
          <span style={{ fontSize: '11px', color: '#9B7EC8' }}>24-bit</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', alignItems: 'center' }}>
          <button style={{ padding: '6px 12px', background: 'rgba(192,38,211,0.15)', border: '1px solid rgba(192,38,211,0.3)', borderRadius: '6px', fontSize: '12px', color: '#EC4899', cursor: 'pointer', fontWeight: 600 }}>🔊 Vol</button>
          <div style={{ width: '80px', height: '4px', background: 'rgba(192,38,211,0.2)', borderRadius: '2px' }} />
        </div>
      </div>
    </div>
  );
}
