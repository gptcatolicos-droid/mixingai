/**
 * FlowCreate.tsx v21 — Crear canción con IA
 * Rediseño completo estilo wizard paso a paso
 * Conectado a MiniMax Music 2.5 via FAL.AI
 */
import { getValidToken } from '@/utils/auth';
import { useState, useRef, useEffect } from 'react';
import FlowNav from '@/components/flow/FlowNav';

const SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

const T = {
  bg: '#09090f',
  surface: 'rgba(255,255,255,0.04)',
  surface2: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.08)',
  borderActive: 'rgba(168,85,247,0.6)',
  text: '#f1f0f5',
  text2: '#a89bc0',
  text3: '#6b5f80',
  pink: '#e879f9',
  purple: '#a855f7',
  green: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
};

const QUICK_PROMPTS = [
  'Pop electrónico motivacional',
  'Balada romántica en español',
  'Trap melancólico',
  'EDM para fiesta',
  'Rock alternativo',
];

const GENRES = [
  { id:'pop', name:'Pop', bpm:'120 BPM', color:'#e879f9' },
  { id:'rock', name:'Rock', bpm:'140 BPM', color:'#f87171' },
  { id:'hiphop', name:'Hip Hop', bpm:'90 BPM', color:'#fbbf24' },
  { id:'electronic', name:'Electrónico', bpm:'128 BPM', color:'#60a5fa' },
  { id:'latin', name:'Latin', bpm:'100 BPM', color:'#34d399' },
  { id:'rnb', name:'R&B', bpm:'80 BPM', color:'#c084fc' },
  { id:'acoustic', name:'Acústico', bpm:'70 BPM', color:'#fb923c' },
  { id:'gospel', name:'Gospel', bpm:'110 BPM', color:'#facc15' },
];

const MOODS = [
  { id:'energetic', name:'Energético', icon:'⚡' },
  { id:'melancholic', name:'Melancólico', icon:'🌧️' },
  { id:'romantic', name:'Romántico', icon:'❤️' },
  { id:'happy', name:'Alegre', icon:'☀️' },
  { id:'dark', name:'Oscuro', icon:'🌑' },
  { id:'chill', name:'Relajado', icon:'🌊' },
];

interface User { id:string; firstName:string; credits:number; is_pro?:boolean; plan?:string; }
interface Props {
  user: User | null;
  onNavigate: (id:string) => void;
  onTrackReady?: (url:string, title:string) => void;
  onCreditsUpdate?: (n:number) => void;
}

type Step = 1|2|3|4;

export default function FlowCreate({ user, onNavigate, onTrackReady, onCreditsUpdate }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [bpm, setBpm] = useState(120);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [autoLyrics, setAutoLyrics] = useState(true);
  const [refFile, setRefFile] = useState<File|null>(null);
  const [refUrl, setRefUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const refInputRef = useRef<HTMLInputElement>(null);
  const progRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => { setError(''); }, []);

  const isPro = user?.is_pro || user?.plan === 'unlimited';
  const canAdvance1 = prompt.trim().length >= 5;
  const canAdvance2 = true;
  const canGenerate = canAdvance1;

  const stopProg = () => { if (progRef.current) { clearInterval(progRef.current); progRef.current = null; } };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    if (!user) { onNavigate('login'); return; }
    if (!isPro && user.credits < 10) { setError(`Necesitas 10 créditos. Tienes ${user.credits}.`); return; }

    const token = await getValidToken();
    if (!token || token === '__SUPER_USER__') { setError('Sesión expirada. Recarga la página.'); return; }

    setError(''); setGenerating(true); setProgress(3);

    // Progreso simulado
    const targets = [8, 18, 30, 45, 60, 72, 82, 90, 95];
    let ti = 0;
    progRef.current = setInterval(() => {
      if (ti < targets.length) { setProgress(targets[ti]); ti++; }
    }, 18000);

    try {
      const genreObj = GENRES.find(g => g.id === genre);
      const moodObj = MOODS.find(m => m.id === mood);
      const stylePrompt = [
        genreObj?.name,
        moodObj?.name,
        `${bpm} BPM`,
        prompt.trim(),
      ].filter(Boolean).join(', ');

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/acestep-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON,
        },
        body: JSON.stringify({
          prompt: stylePrompt,
          lyrics: (!isInstrumental && !autoLyrics && lyrics.trim()) ? lyrics.trim() : undefined,
          genres: genreObj ? [genreObj.name] : undefined,
          selectedStyle: isInstrumental ? 'instrumental' : 'vocals',
          seed: -1,
        }),
        signal: (() => { const ac = new AbortController(); setTimeout(() => ac.abort(), 420_000); return ac.signal; })(),
      });

      stopProg();

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        setError(err.error ?? `Error ${resp.status}`);
        setGenerating(false);
        return;
      }

      const data = await resp.json();
      if (!data.audioUrl) throw new Error('No se recibió audio');

      setProgress(100);
      setDone(true);
      onCreditsUpdate?.(data.creditsRemaining ?? (user?.credits ?? 0) - 10);
      if (onTrackReady) onTrackReady(data.audioUrl, prompt.slice(0, 40));
      setTimeout(() => onNavigate('studio'), 1200);

    } catch (err: any) {
      stopProg();
      setError(err?.name === 'AbortError' ? 'Tardó demasiado. Intenta de nuevo.' : err?.message ?? 'Error desconocido');
      setGenerating(false);
    }
  };

  const STEPS = [
    { n: 1 as Step, label: 'Describir canción' },
    { n: 2 as Step, label: 'Letra (opcional)' },
    { n: 3 as Step, label: 'Subir referencia (opcional)' },
    { n: 4 as Step, label: 'Generar canción' },
  ];

  return (
    <div style={{ width:'100%', minHeight:'100vh', background:T.bg, fontFamily:'-apple-system,BlinkMacSystemFont,"DM Sans",system-ui,sans-serif', color:T.text }}>
      <FlowNav active="create" onNavigate={onNavigate} user={user} />

      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px 80px' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ width:44, height:44, borderRadius:14, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:16, boxShadow:'0 0 32px rgba(168,85,247,0.4)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.8 7H21l-5.9 4.3 2.2 6.7L12 17.2l-5.3 3.8 2.2-6.7L3 11h7.2z" fill="#fff"/></svg>
          </div>
          <h1 style={{ fontSize:32, fontWeight:700, margin:'0 0 8px', letterSpacing:-0.5 }}>Crear canciones con IA</h1>
          <p style={{ color:T.text2, fontSize:15, margin:0 }}>Describe tu idea y la IA creará una canción completa y profesional para ti.</p>
        </div>

        {/* Stepper */}
        <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:40, overflowX:'auto', padding:'0 4px' }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ display:'flex', alignItems:'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
              <button
                onClick={() => { if (s.n <= step || (s.n === step + 1 && canAdvance1)) setStep(s.n); }}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderRadius:8, background: step === s.n ? 'rgba(168,85,247,0.15)' : 'transparent', border: step === s.n ? '1px solid rgba(168,85,247,0.4)' : '1px solid transparent', cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background: step > s.n ? T.green : step === s.n ? T.purple : T.border, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', flexShrink:0 }}>
                  {step > s.n ? '✓' : s.n}
                </div>
                <span style={{ fontSize:13, fontWeight:500, color: step === s.n ? T.text : T.text2 }}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div style={{ flex:1, height:1, background: step > s.n ? T.green : T.border, minWidth:20, margin:'0 4px' }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — Describir canción */}
        {step === 1 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:24 }}>
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

              {/* Prompt */}
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:24 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>① Describe tu canción</div>
                    <div style={{ fontSize:13, color:T.text2 }}>Cuéntanos qué tipo de canción quieres crear</div>
                  </div>
                  <span style={{ fontSize:12, color:T.purple, padding:'4px 10px', borderRadius:6, background:'rgba(168,85,247,0.1)', border:'1px solid rgba(168,85,247,0.2)' }}>💡 Sé específico para mejores resultados</span>
                </div>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  maxLength={500}
                  placeholder="Ej: Una canción pop electrónico sobre nuevos comienzos, con letras sobre dejar atrás el pasado y mirar hacia el futuro con esperanza..."
                  style={{ width:'100%', minHeight:120, padding:14, borderRadius:10, background:'rgba(0,0,0,0.3)', border:`1px solid ${prompt.length > 0 ? T.borderActive : T.border}`, color:T.text, fontSize:14, lineHeight:1.6, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box', transition:'border-color 0.2s' }}
                />
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:6 }}>
                  <span style={{ fontSize:12, color:T.text3 }}>{prompt.length}/500</span>
                </div>
                <div style={{ marginTop:12 }}>
                  <div style={{ fontSize:12, color:T.text3, marginBottom:8 }}>Sugerencias rápidas:</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {QUICK_PROMPTS.map(q => (
                      <button key={q} onClick={() => setPrompt(q)} style={{ padding:'6px 14px', borderRadius:999, background:T.surface2, border:`1px solid ${T.border}`, color:T.text2, fontSize:12.5, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Género + Mood */}
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:24 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4, cursor:'pointer' }} onClick={() => {}}>
                  <div style={{ fontSize:14, fontWeight:600 }}>⚙️ Configuración básica</div>
                </div>
                <div style={{ fontSize:13, color:T.text2, marginBottom:16 }}>Género, mood y tempo</div>

                {/* Géneros */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:12, color:T.text3, marginBottom:10, textTransform:'uppercase', letterSpacing:0.5 }}>Género musical</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                    {GENRES.map(g => (
                      <button key={g.id} onClick={() => setGenre(genre === g.id ? '' : g.id)}
                        style={{ padding:'10px 8px', borderRadius:10, background: genre === g.id ? `${g.color}18` : T.surface2, border:`1px solid ${genre === g.id ? g.color + '66' : T.border}`, cursor:'pointer', fontFamily:'inherit', textAlign:'center', transition:'all 0.15s' }}>
                        <div style={{ fontSize:13, fontWeight:600, color: genre === g.id ? g.color : T.text, marginBottom:2 }}>{g.name}</div>
                        <div style={{ fontSize:10, color:T.text3 }}>{g.bpm}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mood */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:12, color:T.text3, marginBottom:10, textTransform:'uppercase', letterSpacing:0.5 }}>Estado de ánimo</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {MOODS.map(m => (
                      <button key={m.id} onClick={() => setMood(mood === m.id ? '' : m.id)}
                        style={{ padding:'8px 14px', borderRadius:999, background: mood === m.id ? 'rgba(168,85,247,0.2)' : T.surface2, border:`1px solid ${mood === m.id ? T.purple : T.border}`, cursor:'pointer', fontFamily:'inherit', color: mood === m.id ? T.text : T.text2, fontSize:13, display:'flex', alignItems:'center', gap:6, transition:'all 0.15s' }}>
                        {m.icon} {m.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* BPM + Instrumental */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  <div>
                    <div style={{ fontSize:12, color:T.text3, marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>Tempo (BPM)</div>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <input type="range" min={60} max={200} value={bpm} onChange={e => setBpm(+e.target.value)}
                        style={{ flex:1, accentColor:T.purple }} />
                      <span style={{ fontSize:14, fontWeight:600, color:T.purple, fontFamily:'monospace', minWidth:36, textAlign:'right' }}>{bpm}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:T.text3, marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>Vocal</div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => setIsInstrumental(false)} style={{ flex:1, padding:'8px', borderRadius:8, background: !isInstrumental ? 'rgba(168,85,247,0.2)' : T.surface2, border:`1px solid ${!isInstrumental ? T.purple : T.border}`, cursor:'pointer', color: !isInstrumental ? T.text : T.text2, fontSize:12, fontFamily:'inherit' }}>🎤 Con voz</button>
                      <button onClick={() => setIsInstrumental(true)} style={{ flex:1, padding:'8px', borderRadius:8, background: isInstrumental ? 'rgba(168,85,247,0.2)' : T.surface2, border:`1px solid ${isInstrumental ? T.purple : T.border}`, cursor:'pointer', color: isInstrumental ? T.text : T.text2, fontSize:12, fontFamily:'inherit' }}>🎹 Instrumental</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vista previa de estilo */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20 }}>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:16 }}>Vista previa de estilo</div>
                {/* Waveform visual */}
                <div style={{ height:60, display:'flex', alignItems:'flex-end', gap:2, marginBottom:16 }}>
                  {Array.from({length:20}).map((_,i) => {
                    const h = Math.sin(i * 0.8) * 0.3 + 0.5 + Math.random() * 0.2;
                    const g = GENRES.find(g => g.id === genre);
                    return <div key={i} style={{ flex:1, height:`${h*100}%`, borderRadius:2, background: g ? g.color : T.purple, opacity:0.7 }} />;
                  })}
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {genre && <span style={{ padding:'4px 10px', borderRadius:999, background:'rgba(168,85,247,0.15)', border:'1px solid rgba(168,85,247,0.3)', fontSize:12, color:T.purple }}>{GENRES.find(g=>g.id===genre)?.name}</span>}
                  <span style={{ padding:'4px 10px', borderRadius:999, background:'rgba(168,85,247,0.15)', border:'1px solid rgba(168,85,247,0.3)', fontSize:12, color:T.purple }}>{bpm} BPM</span>
                  {mood && <span style={{ padding:'4px 10px', borderRadius:999, background:'rgba(168,85,247,0.15)', border:'1px solid rgba(168,85,247,0.3)', fontSize:12, color:T.purple }}>{MOODS.find(m=>m.id===mood)?.name}</span>}
                  <span style={{ padding:'4px 10px', borderRadius:999, background:'rgba(168,85,247,0.15)', border:'1px solid rgba(168,85,247,0.3)', fontSize:12, color:T.purple }}>{isInstrumental ? 'Instrumental' : 'Con voz'}</span>
                </div>
              </div>

              {/* Botón siguiente */}
              <button onClick={() => canAdvance1 && setStep(2)} disabled={!canAdvance1}
                style={{ width:'100%', height:48, borderRadius:12, border:'none', background: canAdvance1 ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : T.surface2, color:'#fff', fontSize:15, fontWeight:600, cursor: canAdvance1 ? 'pointer' : 'not-allowed', opacity: canAdvance1 ? 1 : 0.4, fontFamily:'inherit', boxShadow: canAdvance1 ? '0 0 32px rgba(168,85,247,0.4)' : 'none', transition:'all 0.2s' }}>
                Siguiente →
              </button>
              {!canAdvance1 && <div style={{ fontSize:12, color:T.text3, textAlign:'center' }}>Escribe al menos 5 caracteres para continuar</div>}
            </div>
          </div>
        )}

        {/* Step 2 — Letra */}
        {step === 2 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:24 }}>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:24 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>② Letra de la canción (opcional)</div>
                  <div style={{ fontSize:13, color:T.text2 }}>Escribe tu letra o déjalo en blanco para que la IA la genere</div>
                </div>
                <button onClick={() => setAutoLyrics(!autoLyrics)} style={{ padding:'8px 14px', borderRadius:8, background: autoLyrics ? 'rgba(168,85,247,0.15)' : T.surface2, border:`1px solid ${autoLyrics ? T.purple : T.border}`, color: autoLyrics ? T.purple : T.text2, fontSize:12, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
                  ✨ {autoLyrics ? 'IA generará letra' : 'Escribir manualmente'}
                </button>
              </div>

              {!isInstrumental && !autoLyrics ? (
                <textarea value={lyrics} onChange={e => setLyrics(e.target.value)} maxLength={3000}
                  placeholder="Escribe aquí tu letra..."
                  style={{ width:'100%', minHeight:240, padding:14, borderRadius:10, background:'rgba(0,0,0,0.3)', border:`1px solid ${T.border}`, color:T.text, fontSize:14, lineHeight:1.7, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box' }} />
              ) : (
                <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:10, border:`2px dashed ${T.border}`, flexDirection:'column', gap:8 }}>
                  {isInstrumental ? (
                    <>
                      <div style={{ fontSize:24 }}>🎹</div>
                      <div style={{ fontSize:14, color:T.text2 }}>Modo instrumental — sin letra</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:24 }}>✨</div>
                      <div style={{ fontSize:14, color:T.text2 }}>La IA generará la letra automáticamente</div>
                      <div style={{ fontSize:12, color:T.text3 }}>Basada en tu descripción: "{prompt.slice(0,60)}..."</div>
                    </>
                  )}
                </div>
              )}

              {!isInstrumental && !autoLyrics && (
                <div style={{ marginTop:16, padding:14, borderRadius:10, background:'rgba(168,85,247,0.05)', border:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:12, color:T.purple, fontWeight:600, marginBottom:6 }}>💡 Tips para letras geniales</div>
                  {['Cuenta una historia', 'Usa emociones específicas', 'Sé descriptivo pero conciso', 'Incluye un mensaje central'].map(t => (
                    <div key={t} style={{ fontSize:12, color:T.text2, padding:'2px 0' }}>✓ {t}</div>
                  ))}
                  <div style={{ fontSize:12, color:T.text3, marginTop:10, fontWeight:600 }}>Ejemplo de estructura</div>
                  <div style={{ fontSize:12, color:T.text3 }}>Verso - Coro - Verso - Coro - Puente - Coro final</div>
                </div>
              )}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <button onClick={() => setStep(3)} style={{ width:'100%', height:48, borderRadius:12, border:'none', background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 0 32px rgba(168,85,247,0.4)' }}>
                Siguiente →
              </button>
              <button onClick={() => setStep(1)} style={{ width:'100%', height:40, borderRadius:12, border:`1px solid ${T.border}`, background:'transparent', color:T.text2, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                ← Atrás
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Referencia */}
        {step === 3 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:24 }}>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:24 }}>
              <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>③ Sube tu canción de referencia (opcional)</div>
              <div style={{ fontSize:13, color:T.text2, marginBottom:24 }}>Sube una canción que te guste para que la IA tome inspiración del estilo</div>

              <div onClick={() => refInputRef.current?.click()}
                style={{ border:`2px dashed ${refFile ? T.purple : T.border}`, borderRadius:14, padding:'40px 24px', textAlign:'center', cursor:'pointer', background: refFile ? 'rgba(168,85,247,0.05)' : 'transparent', transition:'all 0.2s', marginBottom:20 }}>
                <div style={{ fontSize:32, marginBottom:12 }}>{refFile ? '🎵' : '☁️'}</div>
                <div style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>{refFile ? refFile.name : 'Arrastra tu archivo aquí'}</div>
                <div style={{ fontSize:13, color:T.text3 }}>{refFile ? `${(refFile.size/1024/1024).toFixed(1)} MB` : 'o haz clic para seleccionar · MP3, WAV, M4A hasta 50MB'}</div>
              </div>
              <input type="file" ref={refInputRef} accept="audio/*" onChange={e => { const f=e.target.files?.[0]; if(f) setRefFile(f); e.target.value=''; }} style={{ display:'none' }} />

              {refFile && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'rgba(0,0,0,0.3)', borderRadius:10, border:`1px solid ${T.border}` }}>
                  <button onClick={() => {}} style={{ width:32, height:32, borderRadius:'50%', background:'rgba(168,85,247,0.2)', border:'none', cursor:'pointer', color:T.purple, fontSize:14 }}>▶</button>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{refFile.name.replace(/\.[^.]+$/, '')}</div>
                    <div style={{ fontSize:11, color:T.text3 }}>00:00 / 00:00</div>
                  </div>
                  <button onClick={() => setRefFile(null)} style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', color:T.red, borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
                </div>
              )}

              <div style={{ marginTop:20, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {[
                  { icon:'🎯', title:'Mejor calidad de producción', desc:'La IA entenderá el estilo que te gusta' },
                  { icon:'🎨', title:'Estilo más preciso', desc:'Capturamos la esencia de tu referencia' },
                  { icon:'✨', title:'Resultados más personalizados', desc:'Canciones que realmente te encantarán' },
                  { icon:'🔒', title:'La IA usará tu referencia solo como inspiración', desc:'Tu canción será 100% única' },
                ].map(item => (
                  <div key={item.title} style={{ padding:12, borderRadius:10, background:'rgba(168,85,247,0.04)', border:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:20, marginBottom:6 }}>{item.icon}</div>
                    <div style={{ fontSize:12, fontWeight:600, marginBottom:4, color:T.text }}>{item.title}</div>
                    <div style={{ fontSize:11, color:T.text3 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <button onClick={() => setStep(4)} style={{ width:'100%', height:48, borderRadius:12, border:'none', background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 0 32px rgba(168,85,247,0.4)' }}>
                Siguiente →
              </button>
              <button onClick={() => setStep(2)} style={{ width:'100%', height:40, borderRadius:12, border:`1px solid ${T.border}`, background:'transparent', color:T.text2, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                ← Atrás
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Generar */}
        {step === 4 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:24 }}>
            {/* Resumen */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:24 }}>
              <div style={{ fontSize:16, fontWeight:600, marginBottom:20 }}>④ Resumen de tu canción</div>

              <div style={{ display:'flex', flexDirection:'column', gap:3, marginBottom:24 }}>
                {[
                  ['Descripción', prompt.slice(0,80) + (prompt.length > 80 ? '…' : '')],
                  ['Género', GENRES.find(g=>g.id===genre)?.name || '—'],
                  ['Mood', MOODS.find(m=>m.id===mood)?.name || '—'],
                  ['Tempo', `${bpm} BPM`],
                  ['Vocal', isInstrumental ? 'Instrumental' : 'Con voz'],
                  ['Letra', isInstrumental ? 'N/A' : autoLyrics ? 'Generada por IA' : 'Personalizada'],
                  ['Referencia', refFile ? refFile.name : 'Sin referencia'],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${T.border}`, fontSize:14 }}>
                    <span style={{ color:T.text2 }}>{k}</span>
                    <span style={{ color:T.text, fontWeight:500, maxWidth:200, textAlign:'right', wordBreak:'break-word' }}>{v}</span>
                  </div>
                ))}
              </div>

              {generating && (
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontSize:13, color:T.text2 }}>Generando tu canción…</span>
                    <span style={{ fontSize:13, fontWeight:600, color:T.purple }}>{progress}%</span>
                  </div>
                  <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden', marginBottom:20 }}>
                    <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#7c3aed,#a855f7)', borderRadius:3, transition:'width 2s ease', boxShadow:'0 0 12px rgba(168,85,247,0.6)' }} />
                  </div>
                  <div style={{ fontSize:13, color:T.text3, textAlign:'center' }}>Esto puede tomar 1-3 minutos · No cierres esta ventana</div>
                </div>
              )}

              {done && (
                <div style={{ textAlign:'center', padding:20 }}>
                  <div style={{ fontSize:40, marginBottom:8 }}>🎉</div>
                  <div style={{ fontSize:16, fontWeight:700 }}>¡Canción lista! Abriendo en el DAW…</div>
                </div>
              )}

              {error && (
                <div style={{ padding:12, borderRadius:10, background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', fontSize:13, color:T.red, marginTop:12 }}>
                  ⚠️ {error}
                </div>
              )}
            </div>

            {/* Panel generar */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:13 }}>
                  <span style={{ color:T.text2 }}>Créditos disponibles</span>
                  <span style={{ color:T.green, fontWeight:600 }}>{isPro ? '∞' : user?.credits ?? 0} créditos</span>
                </div>
                <div style={{ fontSize:12, color:T.text3 }}>10 créditos por canción</div>
                <div style={{ height:1, background:T.border, margin:'14px 0' }} />
                <div style={{ fontSize:12, color:T.text3, marginBottom:4 }}>¿Qué incluye?</div>
                {['Canción completa (3-5 min)', 'Producción profesional', 'Lista para usar'].map(item => (
                  <div key={item} style={{ fontSize:13, color:T.text, padding:'3px 0' }}>✓ {item}</div>
                ))}
              </div>

              <button onClick={handleGenerate} disabled={generating || done || !canGenerate}
                style={{ width:'100%', height:56, borderRadius:14, border:'none', background: (!generating && !done) ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : T.surface2, color:'#fff', fontSize:16, fontWeight:700, cursor: (!generating && !done) ? 'pointer' : 'not-allowed', fontFamily:'inherit', boxShadow: (!generating && !done) ? '0 0 40px rgba(168,85,247,0.5)' : 'none', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.2s' }}>
                {generating ? (
                  <><span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>⟳</span> Generando…</>
                ) : done ? '✅ Listo' : (
                  <><span>✦</span> Generar mi canción</>
                )}
              </button>
              <div style={{ fontSize:12, color:T.text3, textAlign:'center' }}>Se generará una canción completa y profesional</div>

              <button onClick={() => setStep(3)} style={{ width:'100%', height:40, borderRadius:12, border:`1px solid ${T.border}`, background:'transparent', color:T.text2, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                ← Atrás
              </button>

              <div style={{ padding:12, borderRadius:10, background:'rgba(0,0,0,0.3)', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:16 }}>🔒</span>
                <span style={{ fontSize:12, color:T.text3 }}>Tu privacidad es importante. Tus datos y canciones están seguros con nosotros.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input[type=range] { accent-color: #a855f7; }
      `}</style>
    </div>
  );
}
