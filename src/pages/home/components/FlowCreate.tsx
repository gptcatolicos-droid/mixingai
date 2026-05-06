/**
 * FlowCreate.tsx — Crear canción con IA
 * Diseño con grid de presets de género (igual que el mezclador)
 * Conectado al Edge Function real → ACE-Step en RunPod
 */
import { getValidToken } from '@/utils/auth';
import { useState, useRef } from 'react';
import FlowNav from '@/components/flow/FlowNav';
import { PRESETS, MixPreset } from './PresetScreen';

const SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

const T = {
  bgDeep: '#0F0A1A', surface: 'rgba(26,16,40,0.62)', surface2: 'rgba(35,20,55,0.5)',
  text: '#F8F0FF', text2: '#b8a8d0', text3: '#7a6a90',
  pink: '#ec4899', fuchsia: '#C026D3', violet: '#a259ff',
  green: '#10b981', amber: '#fbbf24',
  border: 'rgba(192,38,211,0.18)', borderStrong: 'rgba(192,38,211,0.45)',
};

const EXAMPLES = [
  'Pop electrónico con voz femenina melancólica, estilo Billie Eilish',
  'Gospel poderoso con coro, órgano y batería de iglesia',
  'Trap suave con 808 profundo, hi-hats rápidos y melodía de synth',
  'Balada romántica en español con guitarra acústica y piano',
  'EDM para club con drop potente, kick duro y wide synths',
];

const STYLES = [
  { id:'instrumental', label:'Instrumental', icon:'🎹', desc:'Sin voz, solo música' },
  { id:'vocals', label:'Con voz', icon:'🎤', desc:'Voz generada por IA' },
  { id:'lofi', label:'Lo-fi', icon:'☕', desc:'Suave, relajado, chillout' },
  { id:'energetic', label:'Energético', icon:'⚡', desc:'Rápido, intenso, potente' },
];

type GenStep = 'idle'|'parsing'|'structuring'|'synthesizing'|'mastering'|'done';


function fmtDur(s: number) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }

interface User { id:string; firstName:string; credits:number; is_pro?:boolean; plan?:string; }
interface FlowCreateProps {
  user: User | null;
  onNavigate: (id: string) => void;
  onTrackReady?: (url: string, title: string) => void;
  onCreditsUpdate?: (n: number) => void;
}

const neonRange: React.CSSProperties = {
  width:'100%', height:6, appearance:'none', WebkitAppearance:'none',
  background:`linear-gradient(90deg,${T.fuchsia},${T.pink})`, borderRadius:999, outline:'none', cursor:'pointer',
  boxShadow:`0 0 10px ${T.fuchsia}55`,
};

export default function FlowCreate({ user, onNavigate, onTrackReady, onCreditsUpdate }: FlowCreateProps) {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(180);
  const [bpm, setBpm] = useState(120);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<MixPreset | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>('instrumental');
  const [lyrics, setLyrics] = useState('');
  const [showLyrics, setShowLyrics] = useState(false);
  const [refFile, setRefFile] = useState<File|null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [genStep, setGenStep] = useState<GenStep>('idle');
  const [error, setError] = useState('');

  // Limpiar error al montar el componente
  useEffect(() => { setError(''); }, []);
  const refInputRef = useRef<HTMLInputElement>(null);
  const progRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const isPro = user?.is_pro || user?.plan === 'unlimited';
  const toggleGenre = (p: MixPreset) => {
    setSelectedPreset(prev => prev?.id === p.id ? null : p);
    if (!selectedGenres.includes(p.name)) setSelectedGenres([p.name]);
    else setSelectedGenres([]);
  };

  const stopProg = () => { if (progRef.current) { clearInterval(progRef.current); progRef.current = null; } };

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.length < 5) { setError('Describe tu canción (mínimo 5 caracteres)'); return; }
    if (!user) { onNavigate('login'); return; }
    if (!isPro && user.credits < 10) { setError(`Necesitas 10 créditos. Tienes ${user.credits}.`); return; }

    const token = await getValidToken();
    if (!token) { setError('Sesión expirada. Recarga la página e intenta de nuevo.'); return; }
    // Super users sin token real no pueden usar las Edge Functions
    if (token === '__SUPER_USER__') { setError('Tu cuenta de administrador no puede generar canciones desde aquí. Usa una cuenta normal.'); return; }

    setError(''); setGenerating(true); setProgress(2); setGenStep('parsing');

    const stepMs = (duration * 400) / 7;
    const steps = [
      {pct:8,step:'parsing'},{pct:22,step:'structuring'},{pct:40,step:'synthesizing'},
      {pct:58,step:'synthesizing'},{pct:72,step:'synthesizing'},{pct:85,step:'mastering'},{pct:92,step:'mastering'},
    ];
    let si = 0;
    progRef.current = setInterval(() => {
      if (si < steps.length) { setProgress(steps[si].pct); setGenStep(steps[si].step as GenStep); si++; }
    }, stepMs);

    try {
      const genres = selectedGenres.length ? selectedGenres : selectedPreset ? [selectedPreset.name] : [];
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/acestep-generate`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}`, 'apikey':SUPABASE_ANON },
        body: JSON.stringify({
          prompt: `${prompt.trim()}${selectedStyle ? `, ${selectedStyle === 'instrumental' ? 'instrumental sin voz' : selectedStyle === 'vocals' ? 'con voz cantada' : selectedStyle === 'lofi' ? 'estilo lo-fi chill' : 'energético y potente'}` : ''}`,
          lyrics: lyrics.trim() || undefined,
          audioDuration: duration,
          bpm,
          genres: genres.length ? genres : undefined,
          seed: -1,
        }),
        signal: (() => { const ac = new AbortController(); setTimeout(() => ac.abort(), 360_000); return ac.signal; })(),
      });

      stopProg();

      if (!resp.ok) {
        const err = await resp.json().catch(()=>({}));
        if (resp.status === 503) setError('Servidor no disponible. Verifica tu cuenta en replicate.com/billing');
        else if (resp.status === 402) setError(`Sin créditos (tienes ${err.creditsRemaining ?? 0})`);
        else if (resp.status === 401) setError('Sesión expirada. Recarga la página.');
        else setError(err.error ?? `Error ${resp.status}`);
        setGenerating(false); setGenStep('idle');
        return;
      }

      const data = await resp.json();
      if (!data.audioBase64) throw new Error('No se recibió audio del servidor');

      const cleanBase64 = data.audioBase64.replace(/\s/g, "");
      const binary = atob(cleanBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: data.mimeType ?? 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const title = prompt.slice(0,40).trim() + (prompt.length>40?'…':'');

      setProgress(100); setGenStep('done');
      onCreditsUpdate?.(data.creditsRemaining ?? (user?.credits ?? 0) - 10);
      if (onTrackReady) onTrackReady(url, title);
      setTimeout(() => onNavigate('studio'), 1000);

    } catch (err: any) {
      stopProg();
      setError(err?.name === 'TimeoutError' ? 'Tardó demasiado. Intenta con menor duración.' : err?.message ?? 'Error desconocido');
      setGenerating(false); setGenStep('idle');
    }
  };

  const surf: React.CSSProperties = { background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:14, padding:18, backdropFilter:'blur(8px)' };

  return (
    <div style={{ width:'100%', minHeight:'100vh', background:`radial-gradient(ellipse at 80% -10%,rgba(192,38,211,0.18),transparent 50%),radial-gradient(ellipse at 0% 110%,rgba(162,89,255,0.14),transparent 50%),${T.bgDeep}`, fontFamily:'-apple-system,BlinkMacSystemFont,"DM Sans",system-ui,sans-serif', color:T.text }}>
      <FlowNav active="create" onNavigate={onNavigate} user={user} />

      <div style={{ padding:'24px 32px 60px', maxWidth:1100, margin:'0 auto' }}>
        {/* Top bar */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <button onClick={() => onNavigate('home')} style={{ background:'transparent', border:'none', color:T.text2, fontSize:12.5, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:5 }}>← Volver</button>
          <span style={{ width:0.5, height:14, background:T.border }} />
          <span style={{ fontSize:13, fontWeight:500 }}>Crear canción con IA</span>
          <span style={{ padding:'3px 10px', borderRadius:999, background:'rgba(16,185,129,0.12)', color:T.green, fontSize:10.5, fontWeight:500, border:`0.5px solid rgba(16,185,129,0.35)`, display:'inline-flex', alignItems:'center', gap:5 }}>
            <span style={{ width:5, height:5, borderRadius:999, background:T.green, boxShadow:`0 0 6px ${T.green}` }} />
            Servidor activo
          </span>
        </div>

        {/* Hero */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`, display:'inline-flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 20px ${T.fuchsia}66`, marginBottom:12 }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 3 L13.6 9.4 L20 11 L13.6 12.6 L12 19 L10.4 12.6 L4 11 L10.4 9.4 Z" fill="#fff"/></svg>
          </div>
          <h1 style={{ fontSize:28, fontWeight:600, margin:0, background:`linear-gradient(90deg,${T.text},${T.pink})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:-0.5 }}>
            Crear canciones con IA
          </h1>
          <p style={{ color:T.text3, fontSize:13, marginTop:8 }}>
            ACE-Step 1.5 genera música completa · La canción se abre en el MixingStudio AI
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:14, marginBottom:14 }}>
          {/* Izquierda */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* Prompt */}
            <div style={surf}>
              <div style={{ fontSize:10.5, color:T.text3, letterSpacing:0.4, textTransform:'uppercase', marginBottom:10 }}>Describe tu canción</div>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                placeholder="Ej: Pop electrónico con voz femenina melancólica, 120 BPM, producción minimalista…"
                style={{ width:'100%', minHeight:90, padding:12, borderRadius:10, background:'rgba(10,6,18,0.6)', border:`0.5px solid ${T.border}`, color:T.text, fontSize:13, lineHeight:1.5, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box' }} />
              <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:10 }}>
                {EXAMPLES.map(ex => (
                  <span key={ex} onClick={() => setPrompt(ex)} style={{ padding:'5px 10px', borderRadius:999, background:'rgba(255,255,255,0.03)', border:`0.5px solid ${T.border}`, fontSize:11, color:T.text2, cursor:'pointer', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {ex}
                  </span>
                ))}
              </div>
            </div>

            {/* Presets de género — exactamente como en el mezclador */}
            <div style={surf}>
              <div style={{ fontSize:10.5, color:T.text3, letterSpacing:0.4, textTransform:'uppercase', marginBottom:12 }}>
                Preset de género — elige el estilo de tu canción
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))', gap:7 }}>
                {PRESETS.map(p => {
                  const isSel = selectedPreset?.id === p.id;
                  return (
                    <button key={p.id} onClick={() => toggleGenre(p)}
                      style={{ background: isSel ? `linear-gradient(135deg,${p.color}22,${p.color}11)` : 'rgba(8,4,16,0.5)', border:`1.5px solid ${isSel ? p.color : 'rgba(192,38,211,0.1)'}`, borderRadius:11, padding:'9px 8px', cursor:'pointer', textAlign:'left', transition:'all 0.15s', boxShadow: isSel ? `0 0 12px ${p.color}44` : 'none', position:'relative' }}>
                      {isSel && <div style={{ position:'absolute', top:5, right:5, width:14, height:14, borderRadius:'50%', background:p.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, color:'#fff', fontWeight:700 }}>✓</div>}
                      <div style={{ height:20, display:'flex', alignItems:'flex-end', gap:'1px', marginBottom:6, background:'rgba(8,4,16,0.6)', borderRadius:4, padding:'2px 3px' }}>
                        {p.wavePattern.map((h,i) => <div key={i} style={{ flex:1, borderRadius:'2px 2px 0 0', height:`${h*100}%`, background: isSel ? p.color : 'rgba(155,126,200,0.2)', transition:'background 0.2s' }} />)}
                      </div>
                      <div style={{ fontSize:11, fontWeight:700, color:'#F8F0FF', marginBottom:2 }}>{p.name}</div>
                      <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                        <span style={{ fontSize:9, padding:'1px 5px', borderRadius:980, background:`${p.color}22`, color:p.color, border:`1px solid ${p.color}33` }}>B:{p.bass>0?'+':''}{p.bass}</span>
                        <span style={{ fontSize:9, padding:'1px 5px', borderRadius:980, background:`${p.color}22`, color:p.color, border:`1px solid ${p.color}33` }}>R:{Math.round(p.reverbWet*100)}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Estilos */}
            <div style={surf}>
              <div style={{ fontSize:10.5, color:T.text3, letterSpacing:0.4, textTransform:'uppercase', marginBottom:12 }}>Estilo de producción</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {STYLES.map(s => {
                  const isSel = selectedStyle === s.id;
                  return (
                    <button key={s.id} onClick={() => setSelectedStyle(s.id)}
                      style={{ background: isSel ? 'rgba(192,38,211,0.15)' : 'rgba(255,255,255,0.03)', border:`1px solid ${isSel ? T.fuchsia : T.border}`, borderRadius:10, padding:'10px 8px', cursor:'pointer', textAlign:'center', fontFamily:'inherit' }}>
                      <div style={{ fontSize:20, marginBottom:5 }}>{s.icon}</div>
                      <div style={{ fontSize:11, fontWeight:600, color: isSel ? T.pink : T.text, marginBottom:2 }}>{s.label}</div>
                      <div style={{ fontSize:9.5, color:T.text3 }}>{s.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Letra */}
            <div style={{ ...surf }}>
              <button onClick={() => setShowLyrics(!showLyrics)} style={{ background:'transparent', border:'none', color:T.text3, fontSize:11, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6, width:'100%', textAlign:'left' }}>
                <span style={{ color: showLyrics ? T.pink : T.text3, fontSize:14 }}>♪</span>
                <span>Letra (opcional)</span>
                <span style={{ marginLeft:'auto', fontSize:10, color:T.text3 }}>{showLyrics ? '▲' : '▼'}</span>
              </button>
              {showLyrics && (
                <textarea value={lyrics} onChange={e => setLyrics(e.target.value)}
                  placeholder="Pega aquí la letra. ACE-Step la usará como guía lírica…"
                  style={{ width:'100%', minHeight:80, padding:12, borderRadius:10, background:'rgba(10,6,18,0.6)', border:`0.5px solid ${T.border}`, color:T.text, fontSize:12, lineHeight:1.5, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box', marginTop:12 }} />
              )}
            </div>

            {/* Audio de referencia */}
            <div style={surf}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span style={{ fontSize:10.5, color:T.text3, letterSpacing:0.4, textTransform:'uppercase' }}>Audio de referencia (opcional)</span>
                <button onClick={() => refFile ? setRefFile(null) : refInputRef.current?.click()} style={{ fontSize:10.5, color:T.pink, background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                  {refFile ? 'Quitar' : 'Subir archivo'}
                </button>
              </div>
              <input type="file" ref={refInputRef} accept="audio/*" onChange={e => { const f=e.target.files?.[0]; if(f) setRefFile(f); e.target.value=''; }} style={{ display:'none' }} />
              {!refFile ? (
                <div onClick={() => refInputRef.current?.click()} style={{ border:`1px dashed ${T.borderStrong}`, borderRadius:10, padding:'18px', textAlign:'center', cursor:'pointer', background:'rgba(192,38,211,0.04)' }}>
                  <div style={{ fontSize:20, marginBottom:4 }}>♫</div>
                  <div style={{ fontSize:12, fontWeight:500, color:T.text }}>Subir referencia de estilo</div>
                  <div style={{ fontSize:10.5, color:T.text3, marginTop:3 }}>La IA imitará el estilo · WAV, MP3, FLAC</div>
                </div>
              ) : (
                <div style={{ padding:'10px 12px', background:'rgba(192,38,211,0.08)', borderRadius:10, border:`0.5px solid ${T.borderStrong}`, display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:18 }}>🎵</span>
                  <span style={{ fontSize:12, color:T.text, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{refFile.name}</span>
                  <button onClick={() => setRefFile(null)} style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', color:'#f87171', borderRadius:6, padding:'3px 8px', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {/* Duración */}
            <div style={{ ...surf, borderRadius:12, padding:14 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:10.5, color:T.text3, letterSpacing:0.4, textTransform:'uppercase' }}>Duración</span>
                <span style={{ fontSize:18, fontWeight:600, color:T.pink, fontFamily:'ui-monospace,monospace' }}>{fmtDur(duration)}</span>
              </div>
              <input type="range" min={30} max={300} step={15} value={duration} onChange={e => setDuration(+e.target.value)} style={neonRange} />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:9.5, color:T.text3, marginTop:4 }}>
                <span>0:30</span><span>5:00</span>
              </div>
            </div>

            {/* BPM */}
            <div style={{ ...surf, borderRadius:12, padding:14 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:10.5, color:T.text3, letterSpacing:0.4, textTransform:'uppercase' }}>BPM</span>
                <span style={{ fontSize:18, fontWeight:600, color:T.pink, fontFamily:'ui-monospace,monospace' }}>{bpm}</span>
              </div>
              <input type="range" min={60} max={200} step={1} value={bpm} onChange={e => setBpm(+e.target.value)} style={neonRange} />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:9.5, color:T.text3, marginTop:4 }}>
                <span>60 lento</span><span>200 rápido</span>
              </div>
            </div>

            {/* Preset seleccionado */}
            {selectedPreset && (
              <div style={{ ...surf, borderRadius:12, padding:14, background:`linear-gradient(135deg,${selectedPreset.color}18,${selectedPreset.color}08)`, border:`1px solid ${selectedPreset.color}44` }}>
                <div style={{ fontSize:10.5, color:T.text3, letterSpacing:0.4, textTransform:'uppercase', marginBottom:8 }}>Preset seleccionado</div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ height:28, display:'flex', alignItems:'flex-end', gap:'1.5px', flex:1 }}>
                    {selectedPreset.wavePattern.map((h,i) => <div key={i} style={{ flex:1, height:`${h*100}%`, background:selectedPreset.color, borderRadius:'2px 2px 0 0', opacity:0.85 }} />)}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#F8F0FF' }}>{selectedPreset.name}</div>
                    <div style={{ fontSize:10, color:selectedPreset.color }}>B:{selectedPreset.bass>0?'+':''}{selectedPreset.bass} · R:{Math.round(selectedPreset.reverbWet*100)}%</div>
                  </div>
                </div>
                <div style={{ fontSize:11, color:T.text2, marginTop:8, lineHeight:1.4 }}>{selectedPreset.desc}</div>
              </div>
            )}

            {/* Resumen */}
            <div style={{ ...surf, borderRadius:12, padding:14 }}>
              <div style={{ fontSize:10.5, color:T.text3, letterSpacing:0.4, textTransform:'uppercase', marginBottom:10 }}>Resumen</div>
              {[
                ['Costo', '10 créditos', T.pink],
                ['Duración', fmtDur(duration), T.text],
                ['BPM', `${bpm}`, T.text],
                ['Género', selectedPreset?.name || '—', T.text],
                ['Estilo', STYLES.find(s=>s.id===selectedStyle)?.label || '—', T.text],
                ['Con letra', lyrics.trim() ? 'Sí' : 'No', T.text3],
                ['Referencia', refFile ? '✓' : 'No', refFile ? T.green : T.text3],
              ].map(([k,v,c]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:11.5, borderBottom:`0.5px solid rgba(192,38,211,0.06)` }}>
                  <span style={{ color:T.text3 }}>{k}</span>
                  <span style={{ color:c as string, fontWeight:500 }}>{v}</span>
                </div>
              ))}

              {error && (
                <div style={{ marginTop:10, padding:'8px 10px', borderRadius:8, background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', fontSize:11, color:'#f87171', lineHeight:1.5 }}>
                  ⚠️ {error}
                </div>
              )}

              <button onClick={handleGenerate} disabled={generating || !prompt.trim()}
                style={{ width:'100%', height:44, marginTop:12, borderRadius:999, border:'none', background: !generating && prompt.trim() ? `linear-gradient(135deg,${T.fuchsia},${T.pink})` : 'rgba(255,255,255,0.05)', color:'#fff', fontSize:13.5, fontWeight:600, cursor: !generating && prompt.trim() ? 'pointer' : 'not-allowed', boxShadow: !generating && prompt.trim() ? `0 0 24px ${T.fuchsia}66` : 'none', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'inherit', opacity: !prompt.trim() ? 0.4 : 1 }}>
                <svg width="13" height="13" viewBox="0 0 24 24"><path d="M12 3 L13.6 9.4 L20 11 L13.6 12.6 L12 19 L10.4 12.6 L4 11 L10.4 9.4 Z" fill="#fff"/></svg>
                {generating ? 'Generando…' : 'Generar canción'}
              </button>
              <div style={{ fontSize:9.5, color:T.text3, textAlign:'center', marginTop:8 }}>
                10 créditos · te quedan {isPro ? '∞' : (user?.credits ?? 0)}<br/>
                ACE-Step 1.5 · Replicate → se abre en el DAW
              </div>
            </div>
          </div>
        </div>

        {/* Progress en página */}
        {generating && (
          <div style={{ background:'rgba(192,38,211,0.08)', border:`0.5px solid ${T.borderStrong}`, borderRadius:14, padding:18, boxShadow:`0 0 32px ${T.fuchsia}33` }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ width:24, height:24, borderRadius:7, background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`, display:'flex', alignItems:'center', justifyContent:'center', animation:'flowpulse 1.4s infinite', boxShadow:`0 0 12px ${T.fuchsia}` }}>
                <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 3 L13.6 9.4 L20 11 L13.6 12.6 L12 19 L10.4 12.6 L4 11 L10.4 9.4 Z" fill="#fff"/></svg>
              </div>
              <span style={{ fontSize:13, fontWeight:600 }}>Generando tu canción…</span>
              <div style={{ flex:1 }} />
              <span style={{ fontSize:11, color:T.text3, fontFamily:'ui-monospace,monospace' }}>{progress}%</span>
            </div>
            <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden', marginBottom:14 }}>
              <div style={{ height:'100%', width:`${progress}%`, background:`linear-gradient(90deg,${T.fuchsia},${T.pink})`, boxShadow:`0 0 8px ${T.fuchsia}`, transition:'width 1s ease', borderRadius:2 }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {(['parsing','structuring','synthesizing','mastering'] as GenStep[]).map((step, i) => {
                const labels = ['Procesando prompt','Generando estructura','Sintetizando audio','Masterizando'];
                const steps = ['parsing','structuring','synthesizing','mastering'];
                const isDone = steps.indexOf(genStep) > i;
                const isActive = genStep === step;
                return (
                  <div key={step} style={{ padding:'8px 10px', borderRadius:8, background: isActive ? 'rgba(192,38,211,0.14)' : 'rgba(255,255,255,0.02)', border:`0.5px solid ${isActive ? T.borderStrong : T.border}` }}>
                    <div style={{ fontSize:10.5, color: isDone ? T.green : isActive ? T.pink : T.text3, fontWeight:500 }}>
                      {isDone ? '✓' : isActive ? '●' : '○'} {labels[i]}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => onNavigate('studio')} style={{ marginTop:14, width:'100%', height:36, borderRadius:8, background:'rgba(255,255,255,0.04)', border:`0.5px solid ${T.border}`, color:T.text2, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
              Abrir MixingStudio AI mientras generamos →
            </button>
          </div>
        )}

        {genStep === 'done' && (
          <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:14, padding:20, textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
            <div style={{ fontSize:16, fontWeight:700, color:T.text }}>¡Canción lista! Abriendo en el DAW…</div>
          </div>
        )}
      </div>
      <style>{`@keyframes flowpulse { 0%,100%{opacity:1} 50%{opacity:.55} }`}</style>
    </div>
  );
}
