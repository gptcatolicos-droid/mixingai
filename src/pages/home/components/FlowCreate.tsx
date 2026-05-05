/**
 * FlowCreate.tsx — Crear canción con IA
 * Diseño idéntico al de Claude Design (flow-screens.jsx → FlowCreate)
 * Conectado al Edge Function real de Supabase → ACE-Step en RunPod
 */
import { useState, useRef } from 'react';
import FlowNav from '@/components/flow/FlowNav';

const SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

const T = {
  bgDeep: '#0F0A1A', surface: 'rgba(26,16,40,0.62)',
  text: '#F8F0FF', text2: '#b8a8d0', text3: '#7a6a90',
  pink: '#ec4899', fuchsia: '#C026D3', violet: '#a259ff',
  green: '#10b981', amber: '#fbbf24',
  border: 'rgba(192,38,211,0.18)', borderStrong: 'rgba(192,38,211,0.45)',
};

const GENRES = ['Pop','Electrónica','R&B','Rock','Hip Hop','Jazz','Lo-fi','Reggaetón','Trap','Gospel','Balada','Acústico','EDM','Clásica'];
const EXAMPLES = [
  'Pop electrónico con voz femenina melancólica, 120 BPM, estilo Billie Eilish…',
  'Gospel poderoso con coro, órgano y batería, estilo de iglesia urbana…',
  'Trap suave con 808 profundo, hi-hats rápidos y melodía de sintetizador…',
  'Balada romántica en español con guitarra acústica y piano…',
  'EDM para club con drop potente, kick duro y sintetizadores amplios…',
];

type GenStep = 'idle'|'parsing'|'structuring'|'synthesizing'|'mastering'|'done';

function getUserToken(): string | null {
  try {
    const stored = localStorage.getItem('audioMixerUser');
    if (stored) { const u = JSON.parse(stored); if (u?.accessToken) return u.accessToken; }
    const keys = Object.keys(localStorage).filter(k => k.includes('-auth-token'));
    for (const key of keys) {
      const val = localStorage.getItem(key);
      if (val) { const p = JSON.parse(val); return p?.access_token ?? null; }
    }
    return null;
  } catch { return null; }
}

function fmtDur(s: number) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }

interface User { id:string; firstName:string; credits:number; is_pro?:boolean; plan?:string; }
interface FlowCreateProps {
  user: User | null;
  onNavigate: (id: string) => void;
  onTrackReady?: (url: string, title: string) => void;
  onCreditsUpdate?: (n: number) => void;
}

// Mini waveform canvas
function MiniWave({ seed }: { seed: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const draw = (c: HTMLCanvasElement) => {
    const dpr = window.devicePixelRatio || 1;
    const w = c.offsetWidth, h = c.offsetHeight;
    c.width = w * dpr; c.height = h * dpr;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.scale(dpr, dpr);
    let hv = 0;
    for (let i = 0; i < seed.length; i++) hv = (hv * 31 + seed.charCodeAt(i)) & 0xffffffff;
    const peaks = Array.from({length: w}, (_, i) => { hv = (hv*1664525+1013904223)&0xffffffff; return 0.2 + (Math.abs(hv&0xffff)/65535)*0.75; });
    const cy = h / 2, playX = w * 0.22;
    const grad = ctx.createLinearGradient(0,0,playX,0);
    grad.addColorStop(0, T.pink); grad.addColorStop(1, T.fuchsia);
    ctx.strokeStyle = grad; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < playX; i++) { const a = peaks[i]*(h/2-1); ctx.moveTo(i,cy-a); ctx.lineTo(i,cy+a); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(192,38,211,0.25)'; ctx.beginPath();
    for (let i = playX; i < w; i++) { const a = peaks[i]*(h/2-1); ctx.moveTo(i,cy-a); ctx.lineTo(i,cy+a); }
    ctx.stroke();
  };
  return <canvas ref={c => { if (c) { setTimeout(() => draw(c), 50); } }} style={{ width:'100%', height:26, display:'block' }} />;
}

const neonRange = {
  width:'100%', height:6, appearance:'none' as const, WebkitAppearance:'none' as const,
  background:`linear-gradient(90deg,${T.fuchsia},${T.pink})`, borderRadius:999, outline:'none', cursor:'pointer',
  boxShadow:`0 0 10px ${T.fuchsia}55`,
};

const STEPS: [string, boolean, boolean][] = [
  ['Procesando prompt', true, false],
  ['Generando estructura', true, false],
  ['Sintetizando audio', false, true],
  ['Masterizando', false, false],
];

export default function FlowCreate({ user, onNavigate, onTrackReady, onCreditsUpdate }: FlowCreateProps) {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(180);
  const [bpm, setBpm] = useState(120);
  const [genres, setGenres] = useState<string[]>([]);
  const [lyrics, setLyrics] = useState('');
  const [showLyrics, setShowLyrics] = useState(false);
  const [hasRef, setHasRef] = useState(false);
  const [refFile, setRefFile] = useState<File|null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [genStep, setGenStep] = useState<GenStep>('idle');
  const [error, setError] = useState('');
  const [serverActive] = useState(true);
  const refInputRef = useRef<HTMLInputElement>(null);
  const progIntervalRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const isPro = user?.is_pro || user?.plan === 'unlimited';
  const toggleGenre = (g: string) => setGenres(cur => cur.includes(g) ? cur.filter(x=>x!==g) : [...cur,g]);

  const stopProgress = () => { if (progIntervalRef.current) { clearInterval(progIntervalRef.current); progIntervalRef.current = null; } };

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.length < 5) { setError('Describe tu canción (mínimo 5 caracteres)'); return; }
    if (!user) { onNavigate('login'); return; }
    const credits = user.credits;
    if (!isPro && credits < 10) { setError(`Necesitas 10 créditos. Tienes ${credits}.`); return; }

    const token = getUserToken();
    if (!token) { setError('Sesión expirada. Recarga la página.'); return; }

    setError(''); setGenerating(true); setProgress(2);
    setGenStep('parsing');

    // Simular progreso mientras ACE-Step trabaja
    const stepMs = (duration * 400) / 7;
    const progressSteps = [
      {pct:8,  step:'parsing'    as GenStep, text:'Procesando prompt…'},
      {pct:22, step:'structuring'as GenStep, text:'Generando estructura…'},
      {pct:38, step:'synthesizing'as GenStep, text:'Sintetizando audio…'},
      {pct:55, step:'synthesizing'as GenStep, text:'Sintetizando instrumentos…'},
      {pct:70, step:'synthesizing'as GenStep, text:'Mezclando stems…'},
      {pct:82, step:'mastering'  as GenStep, text:'Aplicando master -14 LUFS…'},
      {pct:90, step:'mastering'  as GenStep, text:'Finalizando…'},
    ];
    let sIdx = 0;
    progIntervalRef.current = setInterval(() => {
      if (sIdx < progressSteps.length) { setProgress(progressSteps[sIdx].pct); setGenStep(progressSteps[sIdx].step); sIdx++; }
    }, stepMs);

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/acestep-generate`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}`, 'apikey':SUPABASE_ANON },
        body: JSON.stringify({ prompt: prompt.trim(), lyrics: lyrics.trim()||undefined, audioDuration:duration, bpm, genres: genres.length ? genres : undefined, seed:-1 }),
        signal: AbortSignal.timeout(360_000),
      });

      stopProgress();

      if (!resp.ok) {
        const err = await resp.json().catch(()=>({}));
        if (resp.status === 503) setError('Servidor RunPod no activo. Actívalo desde el panel.');
        else if (resp.status === 402) setError(`Sin créditos (tienes ${err.creditsRemaining ?? 0})`);
        else setError(err.error ?? `Error ${resp.status}`);
        setGenerating(false); setGenStep('idle');
        return;
      }

      const data = await resp.json();
      if (!data.audioBase64) throw new Error('No se recibió audio');

      // Convertir base64 → Blob → URL
      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: data.mimeType ?? 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const title = prompt.slice(0,40).trim() + (prompt.length>40?'…':'');

      setProgress(100); setGenStep('done');
      onCreditsUpdate?.(data.creditsRemaining ?? credits - 10);

      // Abrir en el DAW
      if (onTrackReady) { onTrackReady(url, title); }
      setTimeout(() => onNavigate('studio'), 800);

    } catch (err: any) {
      stopProgress();
      const isTimeout = err?.name === 'TimeoutError';
      setError(isTimeout ? 'La generación tardó demasiado. Intenta con menor duración.' : err?.message ?? 'Error desconocido');
      setGenerating(false); setGenStep('idle');
    }
  };

  const surface: React.CSSProperties = { background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:14, padding:18, backdropFilter:'blur(8px)' };

  return (
    <div style={{ width:'100%', minHeight:'100vh', background:`radial-gradient(ellipse at 80% -10%,rgba(192,38,211,0.18),transparent 50%),radial-gradient(ellipse at 0% 110%,rgba(162,89,255,0.14),transparent 50%),${T.bgDeep}`, fontFamily:'-apple-system,BlinkMacSystemFont,"DM Sans",system-ui,sans-serif', color:T.text }}>
      <FlowNav active="create" onNavigate={onNavigate} user={user} />

      <div style={{ padding:'24px 32px 60px', maxWidth:1080, margin:'0 auto' }}>
        {/* Top bar */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <button onClick={() => onNavigate('home')} style={{ background:'transparent', border:'none', color:T.text2, fontSize:12.5, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:5 }}>← Volver</button>
          <span style={{ width:0.5, height:14, background:T.border }} />
          <span style={{ fontSize:13, fontWeight:500 }}>Crear canción con IA</span>
          <span style={{ padding:'3px 10px', borderRadius:999, background:'rgba(16,185,129,0.12)', color:T.green, fontSize:10.5, fontWeight:500, border:`0.5px solid rgba(16,185,129,0.35)`, display:'inline-flex', alignItems:'center', gap:5 }}>
            <span style={{ width:5, height:5, borderRadius:999, background:T.green, boxShadow:`0 0 6px ${T.green}` }} />
            {serverActive ? 'Servidor activo' : 'Verificando...'}
          </span>
        </div>

        {/* Hero */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`, display:'inline-flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 20px ${T.fuchsia}66`, marginBottom:14 }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 3 L13.6 9.4 L20 11 L13.6 12.6 L12 19 L10.4 12.6 L4 11 L10.4 9.4 Z" fill="#fff" /></svg>
          </div>
          <h1 style={{ fontSize:30, fontWeight:600, margin:0, background:`linear-gradient(90deg,${T.text},${T.pink})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:-0.5 }}>
            Crear canciones con IA
          </h1>
          <p style={{ color:T.text3, fontSize:13, marginTop:8, lineHeight:1.5 }}>
            ACE-Step 1.5 genera música completa desde tu descripción.<br />
            Letra opcional · audio de referencia · BPM y duración configurables.
          </p>
        </div>

        {/* Main grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:14, marginBottom:14 }}>
          {/* Prompt */}
          <div style={surface}>
            <div style={{ fontSize:10.5, color:T.text3, letterSpacing:0.4, textTransform:'uppercase', marginBottom:10 }}>Describe tu canción</div>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ej: Pop electrónico con voz femenina melancólica, 120 BPM, estilo Billie Eilish…"
              style={{ width:'100%', minHeight:100, padding:14, borderRadius:10, background:'rgba(10,6,18,0.6)', border:`0.5px solid ${T.border}`, color:T.text, fontSize:13, lineHeight:1.5, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box' }} />
            <div style={{ fontSize:10.5, color:T.text3, marginTop:14, marginBottom:8 }}>Ejemplos</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {EXAMPLES.map(ex => (
                <span key={ex} onClick={() => setPrompt(ex)} style={{ padding:'6px 11px', borderRadius:999, background:'rgba(255,255,255,0.03)', border:`0.5px solid ${T.border}`, fontSize:11, color:T.text2, cursor:'pointer', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ex}</span>
              ))}
            </div>

            {/* Letra opcional */}
            <div style={{ marginTop:16, borderTop:`0.5px solid ${T.border}`, paddingTop:14 }}>
              <button onClick={() => setShowLyrics(!showLyrics)} style={{ background:'transparent', border:'none', color:T.text3, fontSize:11, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ color: showLyrics ? T.pink : T.text3 }}>♪</span>
                Letra (opcional) <span style={{ color:T.text3 }}>{showLyrics ? '▲' : '▼'}</span>
              </button>
              {showLyrics && (
                <textarea value={lyrics} onChange={e => setLyrics(e.target.value)} placeholder="Pega aquí la letra de tu canción. ACE-Step la usará como guía lírica…"
                  style={{ width:'100%', minHeight:80, padding:12, borderRadius:10, background:'rgba(10,6,18,0.6)', border:`0.5px solid ${T.border}`, color:T.text, fontSize:12, lineHeight:1.5, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box', marginTop:10 }} />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {/* Duración */}
            <div style={{ ...surface, borderRadius:12, padding:14 }}>
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
            <div style={{ ...surface, borderRadius:12, padding:14 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:10.5, color:T.text3, letterSpacing:0.4, textTransform:'uppercase' }}>BPM</span>
                <span style={{ fontSize:18, fontWeight:600, color:T.pink, fontFamily:'ui-monospace,monospace' }}>{bpm}</span>
              </div>
              <input type="range" min={60} max={200} step={1} value={bpm} onChange={e => setBpm(+e.target.value)} style={neonRange} />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:9.5, color:T.text3, marginTop:4 }}>
                <span>60 lento</span><span>200 rápido</span>
              </div>
            </div>
            {/* Resumen + CTA */}
            <div style={{ ...surface, borderRadius:12, padding:14 }}>
              <div style={{ fontSize:10.5, color:T.text3, letterSpacing:0.4, textTransform:'uppercase', marginBottom:10 }}>Resumen</div>
              {[
                ['Costo', '10 créditos', T.pink],
                ['Duración', fmtDur(duration), T.text],
                ['BPM aprox.', `${bpm}`, T.text],
                ['Géneros', genres.join(', ') || '—', T.text],
                ['Con letra', lyrics.trim() ? 'Sí' : 'No', T.text3],
                ['Referencia', refFile ? refFile.name.slice(0,12)+'…' : 'No', T.text3],
              ].map(([k,v,c]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:11.5 }}>
                  <span style={{ color:T.text3 }}>{k}</span>
                  <span style={{ color:c as string, fontWeight:500 }}>{v}</span>
                </div>
              ))}

              {error && <div style={{ marginTop:10, padding:'8px 10px', borderRadius:8, background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', fontSize:11, color:'#f87171', lineHeight:1.5 }}>⚠️ {error}</div>}

              <button onClick={handleGenerate} disabled={generating || !prompt.trim()}
                style={{ width:'100%', height:44, marginTop:12, borderRadius:999, border:'none', background: generating || !prompt.trim() ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${T.fuchsia},${T.pink})`, color:'#fff', fontSize:13.5, fontWeight:600, cursor: generating || !prompt.trim() ? 'not-allowed' : 'pointer', boxShadow: !generating && prompt.trim() ? `0 0 24px ${T.fuchsia}66` : 'none', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'inherit', opacity: !prompt.trim() ? 0.4 : 1 }}>
                <svg width="13" height="13" viewBox="0 0 24 24"><path d="M12 3 L13.6 9.4 L20 11 L13.6 12.6 L12 19 L10.4 12.6 L4 11 L10.4 9.4 Z" fill="#fff" /></svg>
                {generating ? 'Generando…' : 'Generar canción'}
              </button>
              <div style={{ fontSize:9.5, color:T.text3, textAlign:'center', marginTop:8 }}>
                10 créditos · te quedan {isPro ? '∞' : (user?.credits ?? 0)}<br />Powered by ACE-Step 1.5 · RunPod GPU
              </div>
            </div>
          </div>
        </div>

        {/* Géneros */}
        <div style={{ ...surface, marginBottom:14 }}>
          <div style={{ fontSize:10.5, color:T.text3, letterSpacing:0.4, textTransform:'uppercase', marginBottom:10 }}>Géneros (opcional · multi-selección)</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {GENRES.map(g => {
              const on = genres.includes(g);
              return (
                <button key={g} onClick={() => toggleGenre(g)} style={{ height:32, padding:'0 14px', borderRadius:999, border:`0.5px solid ${on ? T.borderStrong : T.border}`, background: on ? `linear-gradient(135deg,${T.fuchsia},${T.pink})` : 'rgba(255,255,255,0.03)', color: on ? '#fff' : T.text2, fontSize:11.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit', boxShadow: on ? `0 0 14px ${T.fuchsia}55` : 'none' }}>
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audio de referencia */}
        <div style={{ ...surface, marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:10.5, color:T.text3, letterSpacing:0.4, textTransform:'uppercase' }}>Audio de referencia (opcional)</span>
            <button onClick={() => { if (hasRef) { setHasRef(false); setRefFile(null); } else refInputRef.current?.click(); }} style={{ fontSize:10.5, color:T.pink, background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
              {hasRef ? 'Quitar' : 'Subir archivo'}
            </button>
          </div>
          <input type="file" ref={refInputRef} accept="audio/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setRefFile(f); setHasRef(true); } e.target.value=''; }} style={{ display:'none' }} />
          {!hasRef ? (
            <div onClick={() => refInputRef.current?.click()} style={{ border:`1px dashed ${T.borderStrong}`, borderRadius:12, padding:'24px 18px', textAlign:'center', cursor:'pointer', background:'rgba(192,38,211,0.04)' }}>
              <div style={{ fontSize:22, marginBottom:6 }}>♫</div>
              <div style={{ fontSize:13, fontWeight:500, color:T.text }}>Subir referencia de estilo</div>
              <div style={{ fontSize:11, color:T.text3, marginTop:4 }}>La IA imitará el estilo tonal y rítmico · WAV, MP3, FLAC</div>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:999, background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`, border:'none', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 14px ${T.fuchsia}66` }}>
                <svg width="12" height="12" viewBox="0 0 24 24"><polygon points="8,5 19,12 8,19" fill="#fff" /></svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500, marginBottom:4, color:T.text }}>{refFile?.name || 'referencia.mp3'}</div>
                <MiniWave seed={refFile?.name || 'ref'} />
              </div>
              <span style={{ fontSize:11, color:T.text3, fontFamily:'ui-monospace,monospace' }}>0:00 / {fmtDur(duration)}</span>
            </div>
          )}
        </div>

        {/* Progress en página — sin modal */}
        {generating && (
          <div style={{ background:'rgba(192,38,211,0.08)', border:`0.5px solid ${T.borderStrong}`, borderRadius:14, padding:18, boxShadow:`0 0 32px ${T.fuchsia}33` }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <div style={{ width:24, height:24, borderRadius:7, background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 12px ${T.fuchsia}`, animation:'flowpulse 1.4s infinite' }}>
                <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 3 L13.6 9.4 L20 11 L13.6 12.6 L12 19 L10.4 12.6 L4 11 L10.4 9.4 Z" fill="#fff" /></svg>
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
                const isDone = ['parsing','structuring','synthesizing','mastering'].indexOf(genStep) > i;
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
            <button onClick={() => onNavigate('studio')} style={{ marginTop:14, width:'100%', height:38, borderRadius:8, background:'rgba(255,255,255,0.04)', border:`0.5px solid ${T.border}`, color:T.text2, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
              Abrir DAW mientras generamos →
            </button>
          </div>
        )}

        {genStep === 'done' && (
          <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:14, padding:20, textAlign:'center' }}>
            <div style={{ fontSize:28, marginBottom:8 }}>✅</div>
            <div style={{ fontSize:16, fontWeight:700, color:T.text, marginBottom:4 }}>¡Canción lista!</div>
            <div style={{ fontSize:13, color:T.text2, marginBottom:16 }}>Abriendo en el DAW…</div>
            <button onClick={() => onNavigate('studio')} style={{ background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`, border:'none', color:'#fff', padding:'12px 28px', borderRadius:980, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
              Abrir MixingStudio AI →
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes flowpulse { 0%,100%{opacity:1} 50%{opacity:.55} }`}</style>
    </div>
  );
}
