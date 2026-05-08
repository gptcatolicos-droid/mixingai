/**
 * FlowCreate.tsx v21 — Todo en una pantalla, sin pasos
 */
import { getValidToken } from '@/utils/auth';
import { useState, useRef, useEffect } from 'react';
import FlowNav from '@/components/flow/FlowNav';

const SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

const GENRES = [
  { id:'pop', name:'Pop', color:'#e879f9' },
  { id:'rock', name:'Rock', color:'#f87171' },
  { id:'hiphop', name:'Hip Hop', color:'#fbbf24' },
  { id:'electronic', name:'Electrónico', color:'#60a5fa' },
  { id:'latin', name:'Latin', color:'#34d399' },
  { id:'rnb', name:'R&B', color:'#c084fc' },
  { id:'acoustic', name:'Acústico', color:'#fb923c' },
  { id:'gospel', name:'Gospel', color:'#facc15' },
];

const QUICK_PROMPTS = [
  'Pop electrónico motivacional con beats modernos',
  'Balada romántica en español con guitarra',
  'Trap melancólico con 808 profundo',
  'EDM para fiesta con drop potente',
  'Rock alternativo con riff de guitarra',
];

interface User { id:string; firstName:string; credits:number; is_pro?:boolean; plan?:string; }
interface Props {
  user: User | null;
  onNavigate: (id:string) => void;
  onTrackReady?: (url:string, title:string) => void;
  onCreditsUpdate?: (n:number) => void;
}

export default function FlowCreate({ user, onNavigate, onTrackReady, onCreditsUpdate }: Props) {
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('');
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [showLyrics, setShowLyrics] = useState(false);
  const [refFile, setRefFile] = useState<File|null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState('');
  const refInputRef = useRef<HTMLInputElement>(null);
  const progRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => { setError(''); }, []);

  const isPro = user?.is_pro || user?.plan === 'unlimited';
  const canGenerate = prompt.trim().length >= 5;

  const stopProg = () => { if (progRef.current) { clearInterval(progRef.current); progRef.current = null; } };

  const handleGenerate = async () => {
    if (!canGenerate || generating) return;
    if (!user) { onNavigate('login'); return; }
    if (!isPro && user.credits < 10) { setError(`Necesitas 10 créditos. Tienes ${user.credits}.`); return; }

    const token = await getValidToken();
    if (!token || token === '__SUPER_USER__') { setError('Sesión expirada. Recarga la página.'); return; }

    setError(''); setGenerating(true); setProgress(5);
    setProgressMsg('Enviando a MiniMax Music IA…');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON,
    };

    try {
      const genreObj = GENRES.find(g => g.id === genre);
      const stylePrompt = [genreObj?.name, prompt.trim()].filter(Boolean).join(', ');

      // PASO 1: Submit — solo inicia la generacion, responde rapido
      const submitResp = await fetch(`${SUPABASE_URL}/functions/v1/acestep-generate`, {
        method: 'POST', headers,
        body: JSON.stringify({
          prompt: stylePrompt,
          lyrics: (!isInstrumental && lyrics.trim()) ? lyrics.trim() : undefined,
          genres: genreObj ? [genreObj.name] : undefined,
          selectedStyle: isInstrumental ? 'instrumental' : 'vocals',
        }),
      });

      const submitData = await submitResp.json();
      if (!submitResp.ok || !submitData.success) {
        setError(submitData.error ?? `Error ${submitResp.status}`);
        setGenerating(false); return;
      }

      const { request_id } = submitData;
      if (!request_id) { setError('No se obtuvo ID de proceso'); setGenerating(false); return; }

      setProgress(15); setProgressMsg('MiniMax componiendo tu canción…');

      // PASO 2: Polling desde el frontend — cada 8 seg, max 8 min
      const msgs = ['Componiendo melodía…','Generando armonías…','Añadiendo voces…','Mezclando pistas…','Masterizando…','Casi lista…'];
      let mi = 0; let attempts = 0; const maxAttempts = 60;

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 8000));
        attempts++;
        const prog = Math.min(15 + (attempts / maxAttempts) * 80, 92);
        setProgress(Math.round(prog));
        setProgressMsg(msgs[mi % msgs.length]); mi++;

        const pollResp = await fetch(`${SUPABASE_URL}/functions/v1/acestep-generate`, {
          method: 'POST', headers,
          body: JSON.stringify({ action: 'poll', request_id, prompt: stylePrompt, genres: genreObj ? [genreObj.name] : undefined }),
        });
        const pollData = await pollResp.json();

        if (pollData.status === 'COMPLETED' && pollData.audioUrl) {
          setProgress(100); setProgressMsg('¡Lista! Abriendo en el DAW…');
          onCreditsUpdate?.(pollData.creditsRemaining ?? (user?.credits ?? 0) - 10);
          if (onTrackReady) onTrackReady(pollData.audioUrl, prompt.slice(0, 40));
          setTimeout(() => onNavigate('studio'), 1000);
          return;
        }

        if (pollData.status === 'FAILED') {
          setError(pollData.error ?? 'La generación falló en MiniMax');
          setGenerating(false); return;
        }
      }

      setError('Tardó demasiado (más de 8 minutos). Intenta de nuevo.');
      setGenerating(false);

    } catch (err: any) {
      setError(err?.message ?? 'Error desconocido');
      setGenerating(false);
    }
  };

  const T = {
    bg:'#09090f', surface:'rgba(255,255,255,0.04)', surface2:'rgba(255,255,255,0.07)',
    border:'rgba(255,255,255,0.08)', text:'#f1f0f5', text2:'#a89bc0', text3:'#6b5f80',
    purple:'#a855f7', green:'#34d399', red:'#f87171',
  };

  return (
    <div style={{ width:'100%', minHeight:'100vh', background:T.bg, color:T.text, fontFamily:'-apple-system,BlinkMacSystemFont,"DM Sans",system-ui,sans-serif' }}>
      <FlowNav active="create" onNavigate={onNavigate} user={user} />

      <div style={{ maxWidth:1000, margin:'0 auto', padding:'32px 20px 80px' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'linear-gradient(135deg,#7c3aed,#a855f7)', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:14, boxShadow:'0 0 40px rgba(168,85,247,0.4)' }}>
            <span style={{ fontSize:22 }}>✦</span>
          </div>
          <h1 style={{ fontSize:30, fontWeight:700, margin:'0 0 8px', letterSpacing:-0.5 }}>Crear canciones con IA</h1>
          <p style={{ color:T.text2, fontSize:15, margin:0 }}>Describe tu idea y la IA creará una canción completa y profesional.</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'start' }}>

          {/* Columna izquierda */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Prompt principal */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20 }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.text2, marginBottom:10, textTransform:'uppercase', letterSpacing:0.5 }}>Describe tu canción</div>
              <textarea
                value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={500}
                placeholder="Ej: Balada romántica en español con guitarra acústica y piano, letra sobre el amor a distancia..."
                style={{ width:'100%', minHeight:100, padding:14, borderRadius:10, background:'rgba(0,0,0,0.3)', border:`1px solid ${prompt.length >= 5 ? 'rgba(168,85,247,0.5)' : T.border}`, color:T.text, fontSize:14, lineHeight:1.6, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box' }}
              />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {QUICK_PROMPTS.map(q => (
                    <button key={q} onClick={() => setPrompt(q)}
                      style={{ padding:'4px 10px', borderRadius:999, background:T.surface2, border:`1px solid ${T.border}`, color:T.text2, fontSize:11.5, cursor:'pointer', fontFamily:'inherit' }}>
                      {q.slice(0,28)}…
                    </button>
                  ))}
                </div>
                <span style={{ fontSize:12, color:T.text3, flexShrink:0, marginLeft:8 }}>{prompt.length}/500</span>
              </div>
            </div>

            {/* Género + Vocal en fila */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

              {/* Géneros */}
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:18 }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.text2, marginBottom:12, textTransform:'uppercase', letterSpacing:0.5 }}>Género</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                  {GENRES.map(g => (
                    <button key={g.id} onClick={() => setGenre(genre === g.id ? '' : g.id)}
                      style={{ padding:'8px 6px', borderRadius:8, background: genre === g.id ? `${g.color}18` : T.surface2, border:`1px solid ${genre === g.id ? g.color+'66' : T.border}`, cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:600, color: genre === g.id ? g.color : T.text2, transition:'all 0.15s' }}>
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vocal + Letra */}
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:18 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.text2, marginBottom:12, textTransform:'uppercase', letterSpacing:0.5 }}>Tipo</div>
                  <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                    <button onClick={() => setIsInstrumental(false)}
                      style={{ flex:1, padding:'10px 6px', borderRadius:10, background: !isInstrumental ? 'rgba(168,85,247,0.2)' : T.surface2, border:`1px solid ${!isInstrumental ? T.purple : T.border}`, cursor:'pointer', color: !isInstrumental ? T.text : T.text2, fontSize:12, fontFamily:'inherit', fontWeight: !isInstrumental ? 600 : 400 }}>
                      🎤 Con voz
                    </button>
                    <button onClick={() => setIsInstrumental(true)}
                      style={{ flex:1, padding:'10px 6px', borderRadius:10, background: isInstrumental ? 'rgba(168,85,247,0.2)' : T.surface2, border:`1px solid ${isInstrumental ? T.purple : T.border}`, cursor:'pointer', color: isInstrumental ? T.text : T.text2, fontSize:12, fontFamily:'inherit', fontWeight: isInstrumental ? 600 : 400 }}>
                      🎹 Instrumental
                    </button>
                  </div>
                  {!isInstrumental && (
                    <button onClick={() => setShowLyrics(!showLyrics)}
                      style={{ width:'100%', padding:'8px', borderRadius:8, background: showLyrics ? 'rgba(168,85,247,0.1)' : T.surface2, border:`1px solid ${showLyrics ? T.purple : T.border}`, cursor:'pointer', color: showLyrics ? T.purple : T.text2, fontSize:12, fontFamily:'inherit' }}>
                      {showLyrics ? '✕ Ocultar letra' : '+ Agregar letra (opcional)'}
                    </button>
                  )}
                </div>

                {/* Referencia */}
                <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:18 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:T.text2, marginBottom:10, textTransform:'uppercase', letterSpacing:0.5 }}>Referencia (opcional)</div>
                  {refFile ? (
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'rgba(0,0,0,0.3)', borderRadius:8 }}>
                      <span style={{ fontSize:16 }}>🎵</span>
                      <span style={{ flex:1, fontSize:12, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{refFile.name}</span>
                      <button onClick={() => setRefFile(null)} style={{ background:'none', border:'none', color:T.red, cursor:'pointer', fontSize:14, padding:'0 4px' }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => refInputRef.current?.click()}
                      style={{ width:'100%', padding:'14px', borderRadius:10, border:`2px dashed ${T.border}`, background:'transparent', color:T.text2, fontSize:12, cursor:'pointer', fontFamily:'inherit', textAlign:'center' }}>
                      ☁️ Subir canción de referencia<br/>
                      <span style={{ fontSize:11, color:T.text3 }}>MP3, WAV hasta 50MB</span>
                    </button>
                  )}
                  <input type="file" ref={refInputRef} accept="audio/*" onChange={e => { const f=e.target.files?.[0]; if(f) setRefFile(f); e.target.value=''; }} style={{ display:'none' }} />
                </div>
              </div>
            </div>

            {/* Letra expandible */}
            {showLyrics && !isInstrumental && (
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20 }}>
                <div style={{ fontSize:13, fontWeight:600, color:T.text2, marginBottom:10, textTransform:'uppercase', letterSpacing:0.5 }}>Letra de la canción</div>
                <textarea
                  value={lyrics} onChange={e => setLyrics(e.target.value)} maxLength={2000}
                  placeholder="[Verse]&#10;Escribe aquí tu letra...&#10;&#10;[Chorus]&#10;...&#10;&#10;Si dejas esto vacío, la IA generará la letra automáticamente."
                  style={{ width:'100%', minHeight:160, padding:14, borderRadius:10, background:'rgba(0,0,0,0.3)', border:`1px solid ${T.border}`, color:T.text, fontSize:13, lineHeight:1.7, fontFamily:'inherit', resize:'vertical', outline:'none', boxSizing:'border-box' }}
                />
                <div style={{ fontSize:11, color:T.text3, marginTop:6 }}>{lyrics.length}/2000 · Si dejas vacío, la IA genera la letra basada en tu descripción</div>
              </div>
            )}
          </div>

          {/* Columna derecha — Generar */}
          <div style={{ position:'sticky', top:20, display:'flex', flexDirection:'column', gap:14 }}>

            {/* Resumen */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>Resumen</div>
              {[
                ['Género', GENRES.find(g=>g.id===genre)?.name || '—'],
                ['Tipo', isInstrumental ? 'Instrumental' : 'Con voz'],
                ['Letra', isInstrumental ? 'N/A' : (showLyrics && lyrics.trim()) ? 'Personalizada' : 'Generada por IA'],
                ['Referencia', refFile ? '✓ ' + refFile.name.slice(0,20) : 'Sin referencia'],
                ['Costo', '10 créditos'],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                  <span style={{ color:T.text2 }}>{k}</span>
                  <span style={{ color:T.text, fontWeight:500, maxWidth:160, textAlign:'right', wordBreak:'break-word', fontSize:12 }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop:12, fontSize:12, color: isPro ? T.green : T.text2 }}>
                {isPro ? '∞ créditos disponibles' : `${user?.credits ?? 0} créditos disponibles`}
              </div>
            </div>

            {/* Progreso */}
            {generating && (
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:18 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13 }}>
                  <span style={{ color:T.text2 }}>{progressMsg}</span>
                  <span style={{ fontWeight:700, color:T.purple }}>{progress}%</span>
                </div>
                <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${progress}%`, background:'linear-gradient(90deg,#7c3aed,#a855f7)', borderRadius:3, transition:'width 3s ease', boxShadow:'0 0 12px rgba(168,85,247,0.6)' }} />
                </div>
                <div style={{ fontSize:11, color:T.text3, textAlign:'center', marginTop:8 }}>Esto puede tomar 1-3 minutos · No cierres esta ventana</div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ padding:12, borderRadius:10, background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', fontSize:13, color:T.red }}>
                ⚠️ {error}
              </div>
            )}

            {/* Botón generar */}
            <button onClick={handleGenerate} disabled={!canGenerate || generating}
              style={{ width:'100%', height:56, borderRadius:14, border:'none', background: canGenerate && !generating ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.06)', color:'#fff', fontSize:16, fontWeight:700, cursor: canGenerate && !generating ? 'pointer' : 'not-allowed', fontFamily:'inherit', boxShadow: canGenerate && !generating ? '0 0 40px rgba(168,85,247,0.5)' : 'none', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all 0.2s', opacity: canGenerate ? 1 : 0.4 }}>
              {generating ? (
                <><span style={{ display:'inline-block', animation:'spin 1s linear infinite' }}>⟳</span> Generando…</>
              ) : '✦ Generar mi canción'}
            </button>

            {!canGenerate && !generating && (
              <div style={{ fontSize:12, color:T.text3, textAlign:'center' }}>Escribe al menos 5 caracteres para continuar</div>
            )}

            <div style={{ padding:12, borderRadius:10, background:'rgba(0,0,0,0.3)', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:14 }}>🔒</span>
              <span style={{ fontSize:11, color:T.text3 }}>Tu privacidad es importante. Tus datos y canciones están seguros.</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
    </div>
  );
}
