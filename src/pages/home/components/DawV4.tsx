import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface User { id: string; firstName: string; credits: number; is_pro?: boolean; plan?: string; }
interface DawV4Props {
  user: User | null;
  onBack: () => void;
  initialFiles?: File[];
  onCreditsUpdate?: (n: number) => void;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: '#0a0612', bgDeep: '#0F0A1A',
  surface: 'rgba(26,16,40,0.62)', surfaceSolid: '#1a1028', surface2: 'rgba(35,20,55,0.5)',
  text: '#F8F0FF', text2: '#b8a8d0', text3: '#7a6a90',
  pink: '#ec4899', fuchsia: '#C026D3', violet: '#a259ff',
  amber: '#fbbf24', green: '#10b981', red: '#ef4444',
  border: 'rgba(192,38,211,0.18)', borderStrong: 'rgba(192,38,211,0.45)',
};

const TC: Record<string, string> = {
  vocals: '#ec4899', drums: '#10b981', bass: '#f97316',
  synth: '#3b82f6', guitar: '#fbbf24', keys: '#a259ff', fx: '#94a3b8',
};

interface Clip { s: number; l: number; p: string; }
interface Track {
  id: string; n: string; k: string; c: string;
  vol: number; pan: number; m: boolean; s: boolean;
  clips: Clip[]; ai?: boolean;
}

const makePeaks = (seed: string, width: number, count: number): number[] => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return Array.from({ length: count }, (_, i) => {
    h = (h * 1664525 + 1013904223) & 0xffffffff;
    const base = Math.abs(h & 0xffff) / 65535;
    return 0.2 + base * 0.75;
  });
};

// ─── Mini components ─────────────────────────────────────────────────────────
const SliderH = ({ value }: { value: number }) => (
  <div style={{ position: 'relative', height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${value}%`, background: `linear-gradient(90deg,${T.fuchsia},${T.pink})`, borderRadius: 999, boxShadow: `0 0 8px ${T.fuchsia}66` }} />
    <div style={{ position: 'absolute', left: `calc(${value}% - 5px)`, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: 999, background: '#fff', boxShadow: `0 0 6px ${T.pink}` }} />
  </div>
);

const SmallBtn = ({ children, active, color }: { children: React.ReactNode; active?: boolean; color?: string }) => (
  <button style={{ width: 18, height: 18, padding: 0, borderRadius: 4, background: active ? (color || T.pink) : 'transparent', color: active ? '#fff' : T.text3, border: `0.5px solid ${active ? (color || T.pink) : T.border}`, fontSize: 9, fontWeight: 600, cursor: 'pointer', boxShadow: active ? `0 0 6px ${(color || T.pink)}66` : 'none' }}>{children}</button>
);

const MiniSlider = ({ value }: { value: number }) => (
  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 999, position: 'relative' }}>
    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${value}%`, background: `linear-gradient(90deg,${T.fuchsia},${T.pink})`, borderRadius: 999 }} />
  </div>
);

const TBtn = ({ children, glow, onClick }: { children: React.ReactNode; glow?: boolean; onClick?: () => void }) => (
  <button onClick={onClick} style={{ width: 30, height: 28, borderRadius: 7, background: glow ? `linear-gradient(135deg,${T.fuchsia},${T.pink})` : 'rgba(255,255,255,0.04)', border: glow ? 'none' : `0.5px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, boxShadow: glow ? `0 0 14px ${T.fuchsia}66` : 'none' }}>{children}</button>
);

// ─── Clip Waveform ────────────────────────────────────────────────────────────
const ClipWave = ({ color, seed, width, height, label, ai, muted }: { color: string; seed: string; width: number; height: number; label: string; ai?: boolean; muted?: boolean }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = width * dpr; c.height = height * dpr;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const peaks = makePeaks(seed, width, Math.max(40, Math.floor(width / 1.5)));
    const cy = height / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let i = 0; i < peaks.length; i++) {
      const x = (i / (peaks.length - 1)) * width;
      const a = peaks[i] * (height / 2 - 3);
      ctx.moveTo(x, cy - a); ctx.lineTo(x, cy + a);
    }
    ctx.stroke();
  }, [color, seed, width, height]);
  return (
    <div style={{ position: 'relative', width, height, borderRadius: 5, background: muted ? `${color}33` : `linear-gradient(180deg,${color}dd,${color}aa)`, overflow: 'hidden', border: `0.5px solid ${color}`, boxShadow: ai ? `0 0 12px ${color}55` : 'none', opacity: muted ? 0.45 : 1 }}>
      <canvas ref={ref} style={{ width, height, display: 'block', opacity: 0.55 }} />
      <div style={{ position: 'absolute', top: 4, left: 7, right: 7, fontSize: 10, fontWeight: 500, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {ai && <span style={{ color: T.pink }}>✦</span>}
        {label}
      </div>
    </div>
  );
};

// ─── AI Panel tabs ────────────────────────────────────────────────────────────
const MixChat = () => {
  const [input, setInput] = useState('');
  const msgs = [
    { who: 'mix', text: '¡Hola! Detecté que las voces están -5dB vs la guía de Spotify para Gospel.' },
    { who: 'mix', sug: 'Subir voces +2dB y aplicar Vocal Air preset', actions: ['Aplicar', 'A/B'] },
    { who: 'me',  text: 'añade reverb de iglesia a las voces' },
    { who: 'mix', text: 'Listo · Medium Hall 1.8s a 3 stems de voz. ¿Quieres compararlo con la versión seca?' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: m.who === 'me' ? 'row-reverse' : 'row', gap: 7 }}>
            {m.who === 'mix' && (
              <div style={{ width: 22, height: 22, borderRadius: 999, background: `linear-gradient(135deg,${T.fuchsia},${T.pink})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, boxShadow: `0 0 8px ${T.fuchsia}55` }}>
                <span style={{ fontSize: 10 }}>✦</span>
              </div>
            )}
            <div style={{ padding: '8px 11px', borderRadius: 12, borderTopLeftRadius: m.who === 'mix' ? 4 : 12, borderTopRightRadius: m.who === 'me' ? 4 : 12, background: m.who === 'me' ? 'rgba(192,38,211,0.18)' : 'rgba(255,255,255,0.04)', fontSize: 12, lineHeight: 1.45, maxWidth: 250, border: `0.5px solid ${m.who === 'me' ? T.borderStrong : T.border}`, color: T.text }}>
              {m.text && <div>{m.text}</div>}
              {'sug' in m && m.sug && (
                <div style={{ marginTop: 7, padding: 9, background: 'rgba(10,6,18,0.4)', borderRadius: 8, border: `0.5px solid ${T.border}` }}>
                  <div style={{ fontSize: 11.5, color: T.text, fontWeight: 500, marginBottom: 6 }}>{m.sug}</div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {(m.actions as string[]).map((a: string, j: number) => (
                      <button key={a} style={{ flex: 1, height: 24, fontSize: 10.5, fontWeight: 500, borderRadius: 6, border: j === 0 ? 'none' : `0.5px solid ${T.border}`, background: j === 0 ? `linear-gradient(135deg,${T.fuchsia},${T.pink})` : 'transparent', color: j === 0 ? '#fff' : T.text2, cursor: 'pointer', fontFamily: 'inherit' }}>{a}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: 10, borderTop: `0.5px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 6px 6px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: `0.5px solid ${T.border}` }}>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Pídele algo a Mix…" style={{ flex: 1, background: 'none', border: 'none', color: T.text, fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
          <button style={{ width: 26, height: 26, borderRadius: 999, background: `linear-gradient(135deg,${T.fuchsia},${T.pink})`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 10px ${T.fuchsia}66` }}>
            <svg width="12" height="12" viewBox="0 0 24 24"><g fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M5 12 H19"/><path d="M13 6 L19 12 L13 18"/></g></svg>
          </button>
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
          {['sube graves de drums','compress más las voces','−14 LUFS Spotify'].map(p => (
            <span key={p} onClick={() => setInput(p)} style={{ fontSize: 10, color: T.text3, padding: '3px 8px', borderRadius: 999, border: `0.5px solid ${T.border}`, cursor: 'pointer', whiteSpace: 'nowrap' }}>{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

const Generate = () => {
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState('Bajo');
  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 11, color: T.text2, lineHeight: 1.45 }}>Describe qué quieres generar. Aparecerá como pista nueva en el timeline.</div>
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ej: Línea de bajo gospel cálida, walking, acompañando los acordes en A min…" style={{ padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `0.5px solid ${T.borderStrong}`, minHeight: 80, fontSize: 12.5, color: T.text, lineHeight: 1.4, resize: 'vertical', fontFamily: 'inherit', outline: 'none' }} />
      <div>
        <div style={{ fontSize: 9.5, color: T.text3, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 }}>Tipo</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {['Bajo','Drums','Sintes','Coros','Guitarra','Pads','Canción completa'].map(g => (
            <span key={g} onClick={() => setType(g)} style={{ padding: '4px 10px', borderRadius: 999, background: type === g ? `linear-gradient(135deg,${T.fuchsia},${T.pink})` : 'rgba(255,255,255,0.04)', color: type === g ? '#fff' : T.text2, fontSize: 10.5, fontWeight: 500, cursor: 'pointer', border: type === g ? 'none' : `0.5px solid ${T.border}`, boxShadow: type === g ? `0 0 8px ${T.fuchsia}55` : 'none' }}>{g}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[{ l:'BPM',v:'88' },{ l:'Tonalidad',v:'A min' },{ l:'Duración',v:'2:30' },{ l:'Estilo',v:'Gospel' }].map(f => (
          <div key={f.l} style={{ padding: '7px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.03)', border: `0.5px solid ${T.border}` }}>
            <div style={{ fontSize: 9, color: T.text3, letterSpacing: 0.3, textTransform: 'uppercase' }}>{f.l}</div>
            <div style={{ fontSize: 12, color: T.text, fontWeight: 500, fontFamily: 'ui-monospace,monospace' }}>{f.v}</div>
          </div>
        ))}
      </div>
      <button style={{ height: 38, borderRadius: 10, background: `linear-gradient(135deg,${T.fuchsia},${T.pink})`, color: '#fff', fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: `0 0 18px ${T.fuchsia}55`, fontFamily: 'inherit' }}>
        <span>✦</span> Generar pista
      </button>
      <div style={{ fontSize: 10, color: T.text3, textAlign: 'center' }}>Ilimitado · servidor activo · ACE-Step</div>
    </div>
  );
};

const Stems = () => (
  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ fontSize: 11, color: T.text2, lineHeight: 1.45 }}>Sube una canción completa y la separamos en 4 stems · 100% en tu navegador.</div>
    <div style={{ padding: '24px 16px', borderRadius: 12, border: `1px dashed ${T.borderStrong}`, background: 'rgba(192,38,211,0.06)', textAlign: 'center', cursor: 'pointer' }}>
      <div style={{ width: 40, height: 40, borderRadius: 999, margin: '0 auto 10px', background: `linear-gradient(135deg,${T.fuchsia},${T.pink})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 14px ${T.fuchsia}55` }}>
        <svg width="18" height="18" viewBox="0 0 24 24"><g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16 V5"/><path d="M7 10 L12 5 L17 10"/><path d="M5 19 H19"/></g></svg>
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 500, color: T.text, marginBottom: 4 }}>Arrastra audio aquí</div>
      <div style={{ fontSize: 10, color: T.text3 }}>WAV · MP3 · FLAC · hasta 20 min</div>
    </div>
    {[{ l:'Rápido',t:'~30s',sel:false },{ l:'Estándar',t:'~90s',sel:true },{ l:'HD',t:'~3min',sel:false }].map(q => (
      <div key={q.l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: q.sel ? 'rgba(192,38,211,0.12)' : 'rgba(255,255,255,0.03)', border: `0.5px solid ${q.sel ? T.borderStrong : T.border}`, cursor: 'pointer' }}>
        <div style={{ width: 14, height: 14, borderRadius: 999, border: `1.5px solid ${q.sel ? T.pink : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {q.sel && <div style={{ width: 6, height: 6, borderRadius: 999, background: T.pink }} />}
        </div>
        <span style={{ fontSize: 11.5, color: T.text, fontWeight: 500, flex: 1 }}>{q.l}</span>
        <span style={{ fontSize: 10, color: T.text3, fontFamily: 'ui-monospace,monospace' }}>{q.t}</span>
      </div>
    ))}
    <button style={{ width: '100%', height: 36, borderRadius: 8, background: `linear-gradient(135deg,${T.fuchsia},${T.pink})`, color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
      Separar stems — 3 créditos
    </button>
  </div>
);

// ─── Main DAW ─────────────────────────────────────────────────────────────────
export default function DawV4({ user, onBack, initialFiles = [] }: DawV4Props) {
  const navigate = useNavigate();
  const PX = 4.2;
  const TOTAL = 145;
  const TRACK_H = 56;

  const [tracks, setTracks] = useState<Track[]>([
    { id:'t1', n:'5 — WOOD',    k:'guitar', c:TC.guitar, vol:-3, pan:0,   m:false, s:false, clips:[{ s:0,  l:145, p:'wood' }] },
    { id:'t2', n:'1 ACG LEFT',  k:'guitar', c:TC.guitar, vol:-4, pan:-22, m:false, s:false, clips:[{ s:8,  l:130, p:'acgL' }] },
    { id:'t3', n:'3 LV',        k:'vocals', c:TC.vocals, vol:-2, pan:0,   m:false, s:true,  clips:[{ s:16, l:120, p:'lead' }] },
    { id:'t4', n:'2 ACG RIGHT', k:'guitar', c:TC.guitar, vol:-4, pan:22,  m:false, s:false, clips:[{ s:8,  l:130, p:'acgR' }] },
    { id:'t5', n:'6 — NURO',    k:'keys',   c:TC.keys,   vol:-3, pan:-10, m:false, s:false, clips:[{ s:0,  l:145, p:'nuro' }] },
    { id:'t6', n:'7 — HARMONY', k:'vocals', c:TC.vocals, vol:-5, pan:14,  m:false, s:false, clips:[{ s:32, l:90,  p:'harm' }] },
    { id:'t7', n:'4 BGLV',      k:'vocals', c:TC.vocals, vol:-8, pan:0,   m:true,  s:false, clips:[{ s:24, l:110, p:'bglv' }] },
    { id:'t8', n:'Drums (IA)',  k:'drums',  c:TC.drums,  vol:-4, pan:0,   m:false, s:false, clips:[{ s:8,  l:137, p:'drumai' }], ai:true },
  ]);

  const [tab, setTab] = useState<'chat'|'gen'|'stems'>('chat');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPct, setPlayheadPct] = useState(28);
  const focused = tracks.find(t => t.s) || tracks[2];

  // Si hay archivos iniciales, agregar como tracks
  useEffect(() => {
    if (initialFiles.length > 0) {
      const kinds = ['vocals','drums','bass','guitar','keys','synth','fx'];
      const newTracks: Track[] = initialFiles.map((f, i) => ({
        id: `uploaded_${i}`,
        n: f.name.replace(/\.[^.]+$/, '').slice(0, 20),
        k: kinds[i % kinds.length],
        c: TC[kinds[i % kinds.length]],
        vol: 0, pan: 0, m: false, s: i === 0,
        clips: [{ s: 0, l: 130, p: `uploaded_${i}` }],
      }));
      setTracks(newTracks);
    }
  }, []);

  const toggleMute = (id: string) => setTracks(prev => prev.map(t => t.id === id ? {...t, m: !t.m} : t));
  const toggleSolo = (id: string) => setTracks(prev => prev.map(t => t.id === id ? {...t, s: !t.s} : t));

  const isPro = user?.is_pro || user?.plan === 'unlimited';

  return (
    <div style={{ width:'100%', height:'100vh', background:`radial-gradient(ellipse at 90% -10%,rgba(192,38,211,0.18),transparent 50%),radial-gradient(ellipse at 0% 110%,rgba(162,89,255,0.14),transparent 50%),${T.bgDeep}`, fontFamily:'-apple-system,BlinkMacSystemFont,"DM Sans",system-ui,sans-serif', color:T.text, display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* ── HEADER ── */}
      <div style={{ height:52, background:'rgba(10,6,18,0.85)', borderBottom:`0.5px solid ${T.border}`, display:'flex', alignItems:'center', padding:'0 22px', gap:16, flexShrink:0, backdropFilter:'blur(20px)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }} onClick={onBack}>
          <div style={{ width:26, height:26, borderRadius:7, background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 12px ${T.fuchsia}66` }}>
            <svg width="14" height="14" viewBox="0 0 24 24"><g fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M5 8 V16"/><path d="M9 5 V19"/><path d="M13 9 V15"/><path d="M17 6 V18"/><path d="M21 10 V14"/></g></svg>
          </div>
          <span style={{ fontSize:14, fontWeight:500 }}>mixingmusic.ai</span>
        </div>

        {/* Nav links */}
        <div style={{ display:'flex', gap:4, marginLeft:8 }}>
          {[
            { label:'Cargar Stems', to:'/?upload=1' },
            { label:'Separar Stems', to:'/?mode=separator' },
            { label:'Crear con IA', to:'/?mode=generator' },
          ].map(item => (
            <button key={item.label} onClick={() => { onBack(); }} style={{ padding:'6px 12px', fontSize:11.5, fontWeight:500, color:T.text3, background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit', borderRadius:7 }}>
              {item.label}
            </button>
          ))}
        </div>

        {/* Transport */}
        <div style={{ display:'flex', alignItems:'center', gap:5, marginLeft:8 }}>
          <TBtn><svg width="11" height="11" viewBox="0 0 24 24"><polygon points="18,5 18,19 8,12" fill={T.text2} /></svg></TBtn>
          <TBtn glow onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying
              ? <svg width="10" height="10" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="#fff"/><rect x="14" y="4" width="4" height="16" fill="#fff"/></svg>
              : <svg width="12" height="12" viewBox="0 0 24 24"><polygon points="8,5 19,12 8,19" fill="#fff" /></svg>
            }
          </TBtn>
          <TBtn onClick={() => { setIsPlaying(false); setPlayheadPct(0); }}>
            <svg width="10" height="10" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" fill={T.text2} /></svg>
          </TBtn>
          <TBtn><svg width="10" height="10" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill={T.red} /></svg></TBtn>
        </div>

        {/* Timecode */}
        <div style={{ marginLeft:8, fontFamily:'ui-monospace,"SF Mono",monospace' }}>
          <div style={{ fontSize:14, fontWeight:500, color:T.text, lineHeight:1.1 }}>00:42 <span style={{ color:T.text3 }}>/ 02:25</span></div>
          <div style={{ fontSize:9.5, color:T.text3 }}>Bar 9 · 88 BPM · A min</div>
        </div>

        <div style={{ flex:1 }} />

        {/* Command bar */}
        <div style={{ display:'flex', alignItems:'center', gap:10, height:34, padding:'0 14px', borderRadius:999, background:'rgba(192,38,211,0.08)', border:`0.5px solid ${T.borderStrong}`, minWidth:240, boxShadow:'inset 0 0 20px rgba(192,38,211,0.08)' }}>
          <span style={{ fontSize:12, color:T.pink }}>✦</span>
          <span style={{ fontSize:12, color:T.text2, flex:1 }}>Pídele a Mix</span>
          <span style={{ fontFamily:'ui-monospace,monospace', fontSize:10, padding:'2px 6px', borderRadius:4, background:'rgba(255,255,255,0.06)', color:T.text2 }}>⌘K</span>
        </div>

        {/* GPU status */}
        <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:999, background:'rgba(16,185,129,0.12)', color:T.green, fontSize:10.5, fontWeight:500, border:`0.5px solid rgba(16,185,129,0.3)` }}>
          <span style={{ width:5, height:5, borderRadius:999, background:T.green, boxShadow:`0 0 6px ${T.green}` }} />GPU activa
        </span>

        <span style={{ padding:'6px 14px', borderRadius:999, background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`, color:'#fff', fontSize:11, fontWeight:600, boxShadow:`0 0 16px ${T.fuchsia}55` }}>
          {isPro ? '∞ ILIMITADO' : `${user?.credits || 0} cr.`}
        </span>

        <div style={{ width:32, height:32, borderRadius:999, background:`linear-gradient(135deg,${T.fuchsia},${T.violet})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, color:'#fff', cursor:'pointer' }} onClick={onBack}>
          {user?.firstName?.[0] || 'D'}
        </div>
      </div>

      {/* ── TITLE BAR ── */}
      <div style={{ padding:'14px 22px 12px', display:'flex', alignItems:'center', gap:14, borderBottom:`0.5px solid ${T.border}`, flexShrink:0 }}>
        <span style={{ width:10, height:10, background:T.fuchsia, borderRadius:2, boxShadow:`0 0 12px ${T.fuchsia}` }} />
        <h1 style={{ fontSize:22, fontWeight:600, margin:0, background:`linear-gradient(90deg,${T.pink},${T.violet})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          MixingStudio AI
        </h1>
        <span style={{ fontSize:11.5, color:T.text3 }}>{tracks.length} stems · 2:25</span>
        <span style={{ padding:'3px 10px', borderRadius:999, background:'rgba(251,191,36,0.12)', color:T.amber, fontSize:10.5, fontWeight:500, border:`0.5px solid rgba(251,191,36,0.3)` }}>+ Gospel</span>
        <div style={{ flex:1 }} />
        {/* Action buttons */}
        {[
          { icon:'⬆', label:'Subir' },
          { icon:'🎤', label:'Grabar' },
          { icon:'✂️', label:'Separar stems' },
        ].map(btn => (
          <button key={btn.label} style={{ height:32, padding:'0 12px', borderRadius:8, background:'rgba(255,255,255,0.04)', color:T.text2, border:`0.5px solid ${T.border}`, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6, fontSize:11.5, fontWeight:500, fontFamily:'inherit' }}>
            <span>{btn.icon}</span>{btn.label}
          </button>
        ))}
        <button style={{ height:32, padding:'0 12px', borderRadius:8, background:'rgba(192,38,211,0.15)', color:T.pink, border:`0.5px solid ${T.borderStrong}`, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6, fontSize:11.5, fontWeight:500, fontFamily:'inherit' }}>
          <span>✦</span> Generar IA
        </button>
        <span style={{ width:.5, height:22, background:T.border }} />
        <button style={{ height:34, padding:'0 16px', borderRadius:999, background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`, color:'#fff', fontSize:12, fontWeight:600, border:'none', cursor:'pointer', boxShadow:`0 0 20px ${T.fuchsia}55`, display:'inline-flex', alignItems:'center', gap:6, fontFamily:'inherit' }}>
          ⬇ Exportar Mezcla
        </button>
      </div>

      {/* ── MAIN BODY ── */}
      <div style={{ flex:1, display:'flex', minHeight:0, overflow:'hidden' }}>

        {/* Inspector */}
        <div style={{ width:280, flexShrink:0, background:'rgba(15,10,26,0.7)', borderRight:`0.5px solid ${T.border}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:`0.5px solid ${T.border}` }}>
            <div style={{ fontSize:9.5, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:6 }}>Inspector</div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:4, height:24, borderRadius:2, background:focused.c, boxShadow:`0 0 8px ${focused.c}` }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{focused.n}</div>
                <div style={{ fontSize:10, color:T.text3, textTransform:'capitalize' }}>{focused.k} · 1 clip · 2:00</div>
              </div>
            </div>
          </div>
          <div style={{ flex:1, overflow:'auto', padding:16 }}>
            {[{ l:'Volume', v:'-2', u:'dB', w:44 },{ l:'Pan', v:'0', u:'C', w:50 }].map(k => (
              <div key={k.l} style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:10.5, color:T.text2 }}>{k.l}</span>
                  <span style={{ fontSize:10, color:T.pink, fontFamily:'ui-monospace,monospace' }}>{k.v} {k.u}</span>
                </div>
                <SliderH value={k.w} />
              </div>
            ))}
            <div style={{ fontSize:9.5, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:8, marginTop:4 }}>EQ — Stem</div>
            {[{ l:'Bass',v:'+1 dB',w:58 },{ l:'Mid',v:'+2 dB',w:64 },{ l:'High',v:'+3 dB',w:70 }].map(b => (
              <div key={b.l} style={{ marginBottom:9 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:10.5, color:T.text2 }}>{b.l}</span>
                  <span style={{ fontSize:10, color:T.pink, fontFamily:'ui-monospace,monospace' }}>{b.v}</span>
                </div>
                <SliderH value={b.w} />
              </div>
            ))}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10, padding:'6px 10px', borderRadius:7, background:'rgba(192,38,211,0.08)', border:`0.5px solid ${T.borderStrong}` }}>
              <span style={{ fontSize:10.5, color:T.text2 }}>Preset EQ</span>
              <span style={{ fontSize:10.5, color:T.pink, fontWeight:500 }}>Vocal Air ▾</span>
            </div>
            <div style={{ fontSize:9.5, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:8, marginTop:16 }}>Efectos</div>
            {[{ l:'Reverb',v:'45%',on:true },{ l:'Delay',v:'20%',on:true },{ l:'Widener',v:'70%',on:true }].map(fx => (
              <div key={fx.l} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0' }}>
                <div style={{ width:30, height:16, borderRadius:999, background:fx.on?`linear-gradient(135deg,${T.fuchsia},${T.pink})`:'rgba(255,255,255,0.08)', position:'relative', boxShadow:fx.on?`0 0 8px ${T.fuchsia}55`:'none' }}>
                  <div style={{ position:'absolute', top:2, left:fx.on?16:2, width:12, height:12, borderRadius:999, background:'#fff' }} />
                </div>
                <span style={{ fontSize:11, color:T.text, flex:1 }}>{fx.l}</span>
                <span style={{ fontSize:10, color:T.text3, fontFamily:'ui-monospace,monospace' }}>{fx.v}</span>
              </div>
            ))}
            <div style={{ fontSize:9.5, color:T.text3, letterSpacing:.5, textTransform:'uppercase', marginBottom:8, marginTop:16 }}>Output</div>
            <div style={{ fontSize:11, color:T.text2, padding:'6px 10px', borderRadius:6, background:'rgba(255,255,255,0.04)' }}>Mix Bus → Master</div>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
          {/* Sub-toolbar */}
          <div style={{ height:32, padding:'0 12px', borderBottom:`0.5px solid ${T.border}`, display:'flex', alignItems:'center', gap:8, background:'rgba(10,6,18,0.4)', flexShrink:0, fontSize:10.5, color:T.text3, fontFamily:'ui-monospace,monospace' }}>
            <span>Snap 1/4</span><span style={{ width:.5, height:12, background:T.border }} />
            <span>Zoom 100%</span><span style={{ width:.5, height:12, background:T.border }} />
            <span>Grid Bars</span>
            <div style={{ flex:1 }} />
            <span style={{ display:'flex', alignItems:'center', gap:5, color:T.green }}><span style={{ width:5, height:5, borderRadius:999, background:T.green }} />Spotify -14 ✓</span>
            <span style={{ width:.5, height:12, background:T.border }} />
            <span>YouTube -10 ✓</span>
          </div>
          <div style={{ flex:1, display:'flex', minHeight:0, overflow:'hidden' }}>
            {/* Track headers */}
            <div style={{ width:200, flexShrink:0, borderRight:`0.5px solid ${T.border}`, background:'rgba(15,10,26,0.85)', display:'flex', flexDirection:'column' }}>
              <div style={{ height:24, padding:'0 14px', display:'flex', alignItems:'center', fontSize:9.5, color:T.text3, letterSpacing:.5, textTransform:'uppercase', borderBottom:`0.5px solid ${T.border}`, flexShrink:0 }}>Tracks</div>
              <div style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
                {tracks.map(tk => (
                  <div key={tk.id} style={{ height:TRACK_H, padding:'6px 12px', borderBottom:`0.5px solid ${T.border}`, display:'flex', alignItems:'center', gap:8, background:tk.s?'rgba(192,38,211,0.06)':'transparent' }}>
                    <span style={{ width:3, height:30, borderRadius:2, background:tk.c, boxShadow:`0 0 8px ${tk.c}66` }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11.5, color:T.text, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:5 }}>
                        {tk.ai && <span style={{ color:T.pink, fontSize:9 }}>✦</span>}
                        {tk.n}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:3 }}>
                        <MiniSlider value={50 + tk.vol * 4} />
                        <span style={{ fontSize:9, color:T.text3, fontFamily:'ui-monospace,monospace', width:26, textAlign:'right' }}>{tk.vol}dB</span>
                      </div>
                    </div>
                    <SmallBtn active={tk.m} color={T.amber} onClick={() => toggleMute(tk.id)}>M</SmallBtn>
                    <SmallBtn active={tk.s} color={T.pink} onClick={() => toggleSolo(tk.id)}>S</SmallBtn>
                  </div>
                ))}
                <div style={{ height:TRACK_H, padding:'6px 12px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <button style={{ width:'100%', height:'100%', border:`1px dashed ${T.borderStrong}`, background:'rgba(192,38,211,0.06)', borderRadius:8, color:T.pink, fontSize:11, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'inherit' }}>
                    <span>✦</span> Nueva pista IA
                  </button>
                </div>
              </div>
            </div>

            {/* Timeline scroll area */}
            <div style={{ flex:1, overflow:'auto', position:'relative', background:'rgba(10,6,18,0.4)' }}>
              {/* Ruler */}
              <div style={{ height:24, position:'sticky', top:0, zIndex:2, background:'rgba(15,10,26,0.95)', borderBottom:`0.5px solid ${T.border}`, backdropFilter:'blur(6px)' }}>
                <div style={{ position:'relative', width:TOTAL*PX, height:'100%' }}>
                  {Array.from({ length: Math.ceil(TOTAL/4) }).map((_,i) => {
                    const x = i*4*PX; const major = i%4===0;
                    return (
                      <div key={i}>
                        <div style={{ position:'absolute', left:x, top:major?4:12, bottom:0, width:.5, background:major?T.borderStrong:T.border }} />
                        {major && <span style={{ position:'absolute', left:x+4, top:5, fontSize:9, color:T.text3, fontFamily:'ui-monospace,monospace' }}>{i+1}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ position:'relative', width:TOTAL*PX, minHeight:(tracks.length+1)*TRACK_H }}>
                {tracks.map((tk,i) => (
                  <div key={tk.id} style={{ height:TRACK_H, borderBottom:`0.5px solid ${T.border}`, background:i%2===0?'rgba(255,255,255,0.012)':'transparent', position:'relative' }}>
                    {tk.clips.map((c,j) => (
                      <div key={j} style={{ position:'absolute', left:c.s*PX, top:6, height:TRACK_H-14 }}>
                        <ClipWave color={tk.c} seed={c.p} width={c.l*PX} height={TRACK_H-14} label={tk.n} ai={tk.ai} muted={tk.m} />
                      </div>
                    ))}
                  </div>
                ))}
                {/* AI generate row */}
                <div style={{ height:TRACK_H, borderBottom:`0.5px solid ${T.border}`, display:'flex', alignItems:'center', padding:'0 12px' }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'8px 16px', border:`1px dashed ${T.borderStrong}`, borderRadius:8, color:T.pink, fontSize:11.5, fontWeight:500, background:'rgba(192,38,211,0.05)', cursor:'pointer' }}>
                    <span>✦</span> Genera bajo, drums, sintes con IA · escribe lo que quieras
                  </div>
                </div>
                {/* Playhead */}
                <div style={{ position:'absolute', top:0, bottom:0, left:`${playheadPct}%`, width:2, background:T.pink, pointerEvents:'none', boxShadow:`0 0 10px ${T.pink}` }}>
                  <div style={{ position:'absolute', top:-2, left:-6, width:14, height:8, background:T.pink, clipPath:'polygon(0 0,100% 0,50% 100%)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Panel */}
        <div style={{ width:340, flexShrink:0, background:'rgba(15,10,26,0.7)', borderLeft:`0.5px solid ${T.border}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ display:'flex', padding:6, gap:4, borderBottom:`0.5px solid ${T.border}` }}>
            {([['chat','Mix'],['gen','Generar'],['stems','Stems']] as const).map(([id,label]) => (
              <button key={id} onClick={() => setTab(id)} style={{ flex:1, height:30, padding:0, borderRadius:7, background:tab===id?'rgba(192,38,211,0.15)':'transparent', color:tab===id?T.pink:T.text2, border:tab===id?`0.5px solid ${T.borderStrong}`:'0.5px solid transparent', fontSize:11.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}>{label}</button>
            ))}
          </div>
          <div style={{ flex:1, overflow:'auto' }}>
            {tab==='chat' && <MixChat />}
            {tab==='gen' && <Generate />}
            {tab==='stems' && <Stems />}
          </div>
        </div>
      </div>

      {/* ── MASTER STRIP ── */}
      <div style={{ height:92, flexShrink:0, borderTop:`0.5px solid ${T.border}`, background:'rgba(15,10,26,0.85)', display:'grid', gridTemplateColumns:'180px 1fr 1fr 220px 200px' }}>
        {/* Master label */}
        <div style={{ padding:'12px 16px', borderRight:`0.5px solid ${T.border}`, display:'flex', flexDirection:'column', justifyContent:'center', gap:6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, fontWeight:600, color:T.text, letterSpacing:.4 }}>MIX BUS</span>
          </div>
          <SliderH value={68} />
          <span style={{ padding:'2px 8px', borderRadius:999, background:'rgba(251,191,36,0.12)', color:T.amber, fontSize:9.5, fontWeight:500, alignSelf:'flex-start', border:`0.5px solid rgba(251,191,36,0.3)` }}>+ Gospel</span>
        </div>
        {/* EQ */}
        <div style={{ padding:'10px 16px', borderRight:`0.5px solid ${T.border}` }}>
          <div style={{ fontSize:9, color:T.text3, letterSpacing:.4, textTransform:'uppercase', marginBottom:6 }}>EQ Master</div>
          <div style={{ display:'flex', gap:12 }}>
            {[{ l:'Bass',v:'+2',w:62 },{ l:'Mid',v:'+3',w:70 },{ l:'High',v:'+3',w:70 }].map(b => (
              <div key={b.l} style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                  <span style={{ fontSize:10, color:T.text2 }}>{b.l}</span>
                  <span style={{ fontSize:9, color:T.pink, fontFamily:'ui-monospace,monospace' }}>{b.v} dB</span>
                </div>
                <SliderH value={b.w} />
              </div>
            ))}
          </div>
        </div>
        {/* FX */}
        <div style={{ padding:'10px 16px', borderRight:`0.5px solid ${T.border}` }}>
          <div style={{ fontSize:9, color:T.text3, letterSpacing:.4, textTransform:'uppercase', marginBottom:6 }}>FX Master</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {['Reverb','Delay','Wide','Comp Med'].map(fx => (
              <span key={fx} style={{ padding:'4px 9px', borderRadius:999, background:`linear-gradient(135deg,${T.fuchsia}33,${T.pink}22)`, color:T.pink, fontSize:10, fontWeight:500, border:`0.5px solid ${T.borderStrong}`, cursor:'pointer' }}>{fx}</span>
            ))}
          </div>
        </div>
        {/* IA EQ */}
        <div style={{ padding:'10px 16px', borderRight:`0.5px solid ${T.border}` }}>
          <div style={{ fontSize:9, color:T.text3, letterSpacing:.4, textTransform:'uppercase', marginBottom:6, display:'flex', justifyContent:'space-between' }}>
            <span>IA EQ</span>
            <span style={{ color:T.green, display:'inline-flex', alignItems:'center', gap:4 }}><span style={{ width:4, height:4, borderRadius:999, background:T.green }} />Live</span>
          </div>
          <select style={{ width:'100%', padding:'6px 10px', borderRadius:7, background:'rgba(192,38,211,0.1)', color:T.pink, fontSize:11, fontWeight:500, border:`0.5px solid ${T.borderStrong}`, cursor:'pointer', fontFamily:'inherit' }}>
            <option>Default</option><option>Car</option><option>iPhone</option><option>Headphones</option><option>TV</option>
          </select>
        </div>
        {/* LUFS */}
        <div style={{ padding:'10px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ fontSize:9, color:T.text3, letterSpacing:.4, textTransform:'uppercase' }}>LUFS</span>
            <span style={{ padding:'1px 7px', borderRadius:999, background:'rgba(192,38,211,0.15)', color:T.pink, fontSize:9.5, fontWeight:500, border:`0.5px solid ${T.borderStrong}` }}>+ Safe</span>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {[{ v:'-12.4',l:'MOM' },{ v:'-13.6',l:'INT' }].map(m => (
              <div key={m.l} style={{ flex:1, padding:'5px 8px', borderRadius:7, background:'rgba(10,6,18,0.6)', border:`0.5px solid ${T.border}`, textAlign:'center' }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.pink, fontFamily:'ui-monospace,monospace' }}>{m.v}</div>
                <div style={{ fontSize:8.5, color:T.text3, letterSpacing:.3 }}>{m.l}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:9.5 }}>
            <span style={{ color:T.green, display:'flex', alignItems:'center', gap:4 }}><span style={{ width:4, height:4, borderRadius:999, background:T.green }} />Spotify ✓</span>
            <span style={{ color:T.text3, fontFamily:'ui-monospace,monospace' }}>-14</span>
          </div>
        </div>
      </div>
    </div>
  );
}
