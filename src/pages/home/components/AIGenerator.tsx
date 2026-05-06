import { useState, useRef } from 'react';

/**
 * AIGenerator.tsx
 * Generación de música con ACE-Step via Supabase Edge Function → RunPod
 * Coloca en: src/pages/home/components/AIGenerator.tsx
 *
 * Requiere:
 *   supabase/functions/acestep-generate/index.ts deployada
 *   Variable RUNPOD_ENDPOINT_URL configurada en Supabase secrets
 */

interface User {
  id: string; firstName: string; credits: number;
  email?: string; provider?: string;
}

interface GeneratedTrack {
  id: string;
  title: string;
  duration: string;
  blob: Blob;
  url: string;
  prompt: string;
  genre: string;
  createdAt: Date;
}

interface AIGeneratorProps {
  user: User;
  onBack: () => void;
  onCreditsUpdate: (n: number) => void;
  onTrackReady?: (url: string, title: string) => void;
}

const SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

const T = {
  surface: 'rgba(26,16,40,0.82)', surface2: 'rgba(35,20,55,0.5)',
  text: '#F8F0FF', text2: 'rgba(248,240,255,0.65)', text3: 'rgba(248,240,255,0.38)',
  pink: '#EC4899', fuchsia: '#C026D3', violet: '#7C3AED',
  border: 'rgba(192,38,211,0.18)', green: '#4ade80', amber: '#F59E0B',
};

const GENRES = ['Pop','Electrónica','R&B','Rock','Hip Hop','Jazz','Lo-fi','Reggaetón','Trap','Gospel','Balada','Acústico','EDM','Clásica'];

const PROMPT_EXAMPLES = [
  'Pop electrónico con voz femenina melancólica, 120 BPM, estilo Billie Eilish',
  'Gospel poderoso con coro, órgano y batería, estilo de iglesia urbana',
  'Trap suave con 808 profundo, hi-hats rápidos y melodía de sintetizador',
  'Balada romántica en español con guitarra acústica y piano',
  'EDM para club con drop potente, kick duro y sintetizadores amplios',
];

type ServerState = 'unknown' | 'checking' | 'active' | 'starting' | 'inactive' | 'error';

const SERVER_LABELS: Record<ServerState, { color: string; dot: string; label: string }> = {
  unknown:  { color: T.text3,  dot: '#6B7280', label: 'Verificando servidor…' },
  checking: { color: T.amber,  dot: T.amber,   label: 'Verificando servidor…' },
  active:   { color: T.green,  dot: T.green,   label: 'GPU activa · Listo para generar' },
  starting: { color: T.amber,  dot: T.amber,   label: 'Iniciando servidor GPU (~30 seg)…' },
  inactive: { color: '#6B7280',dot: '#6B7280', label: 'Servidor inactivo · Se activa al generar' },
  error:    { color: '#f87171',dot: '#f87171', label: 'Servidor no disponible · Reintentando…' },
};

// ─── Helper: base64 → Blob WAV ────────────────────────────────────────────────
function base64ToBlob(b64: string, mime = 'audio/wav'): Blob {
  const clean = b64.replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ─── Helper: obtener JWT del usuario desde localStorage ───────────────────────
function getUserToken(): string | null {
  try {
    // La app guarda el token en audioMixerUser.accessToken
    const stored = localStorage.getItem('audioMixerUser');
    if (stored) {
      const u = JSON.parse(stored);
      if (u?.accessToken) return u.accessToken;
    }
    // Fallback: buscar en claves de Supabase
    const keys = Object.keys(localStorage).filter(k => k.includes('-auth-token'));
    for (const key of keys) {
      const val = localStorage.getItem(key);
      if (val) {
        const parsed = JSON.parse(val);
        return parsed?.access_token ?? null;
      }
    }
    return null;
  } catch { return null; }
}

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AIGenerator({ user, onBack, onCreditsUpdate, onTrackReady }: AIGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [duration, setDuration] = useState(180);
  const [bpm, setBpm] = useState(120);
  const [lyrics, setLyrics] = useState('');
  const [showLyrics, setShowLyrics] = useState(false);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [serverState, setServerState] = useState<ServerState>('unknown');
  const [phase, setPhase] = useState<'idle' | 'generating' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [history, setHistory] = useState<GeneratedTrack[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const refInputRef = useRef<HTMLInputElement>(null);
  const audioElemsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleGenre = (g: string) =>
    setSelectedGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);

  // Verificar si el servidor está activo
  const checkServer = async () => {
    setServerState('checking');
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/acestep-generate`, {
        method: 'OPTIONS',
        headers: { 'apikey': SUPABASE_ANON },
        signal: AbortSignal.timeout(5000),
      });
      setServerState(resp.ok ? 'active' : 'inactive');
    } catch {
      setServerState('inactive');
    }
  };

  // Simular progreso visual mientras ACE-Step trabaja (la gen puede tardar 60-120s)
  const startProgressSimulation = (totalMs: number) => {
    const steps = [
      { pct: 8,  text: 'Conectando con servidor GPU…' },
      { pct: 18, text: 'Cargando modelo ACE-Step 1.5…' },
      { pct: 28, text: 'Interpretando tu prompt con LM…' },
      { pct: 42, text: 'Generando estructura musical…' },
      { pct: 58, text: 'Sintetizando instrumentos y timbre…' },
      { pct: 70, text: 'Añadiendo dinámica y efectos…' },
      { pct: 82, text: 'Mezclando stems generados…' },
      { pct: 90, text: 'Aplicando master -10 LUFS…' },
    ];

    let stepIdx = 0;
    const stepMs = totalMs / steps.length;

    progressIntervalRef.current = setInterval(() => {
      if (stepIdx < steps.length) {
        setProgress(steps[stepIdx].pct);
        setProgressText(steps[stepIdx].text);
        stepIdx++;
      }
    }, stepMs);
  };

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError('Describe tu canción primero'); return; }
    if (user.credits < 10) { setError(`Necesitas 10 créditos. Tienes ${user.credits}.`); return; }

    const token = getUserToken();
    if (!token) { setError('Sesión expirada. Recarga la página.'); return; }

    setError('');
    setPhase('generating');
    setProgress(2);
    setProgressText('Iniciando…');
    setServerState('starting');

    // Estimar duración de generación: ~1s por segundo de audio en RTX 3090
    const estimatedMs = duration * 1000 * 0.4; // ~0.4x real-time en RTX 3090
    startProgressSimulation(estimatedMs);

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/acestep-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          lyrics: lyrics.trim() || undefined,
          audioDuration: duration,
          bpm,
          genres: selectedGenres.length ? selectedGenres : undefined,
          seed: -1,
        }),
        signal: AbortSignal.timeout(360_000), // 6 min max
      });

      stopProgressSimulation();

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        const msg = errData.error ?? `Error ${resp.status}`;

        if (resp.status === 402) {
          setError(`Sin créditos suficientes (${errData.creditsRemaining ?? 0} restantes)`);
        } else if (resp.status === 503) {
          setError('El servidor de IA no está configurado aún. Activa RunPod primero.');
          setServerState('error');
        } else {
          setError(msg);
        }
        setPhase('idle');
        return;
      }

      const data = await resp.json();

      if (!data.audioBase64) {
        throw new Error('No se recibió audio del servidor');
      }

      // Convertir base64 → Blob → URL reproducible
      const blob = base64ToBlob(data.audioBase64, data.mimeType ?? 'audio/wav');
      const url = URL.createObjectURL(blob);

      const track: GeneratedTrack = {
        id: Date.now().toString(),
        title: prompt.slice(0, 45).trim() + (prompt.length > 45 ? '…' : ''),
        duration: formatDuration(duration),
        blob,
        url,
        prompt,
        genre: selectedGenres.join(', ') || 'Sin género',
        createdAt: new Date(),
      };

      setHistory(prev => [track, ...prev]);
      setServerState('active');
      setProgress(100);
      setProgressText('¡Canción lista!');
      setPhase('done');

      // Actualizar créditos en el UI
      onCreditsUpdate(data.creditsRemaining ?? user.credits - 10);

      if (onTrackReady) onTrackReady(url, track.title);

    } catch (err: any) {
      stopProgressSimulation();
      const isTimeout = err?.name === 'TimeoutError' || err?.message?.includes('timeout');
      setError(isTimeout
        ? 'La generación tardó demasiado. El servidor puede estar ocupado. Intenta de nuevo.'
        : err?.message ?? 'Error desconocido'
      );
      setServerState('error');
      setPhase('idle');
    }
  };

  const handlePlay = (track: GeneratedTrack) => {
    // Detener el que estaba sonando
    if (playingId && audioElemsRef.current.has(playingId)) {
      audioElemsRef.current.get(playingId)!.pause();
      audioElemsRef.current.get(playingId)!.currentTime = 0;
    }
    if (playingId === track.id) { setPlayingId(null); return; }

    if (!audioElemsRef.current.has(track.id)) {
      const audio = new Audio(track.url);
      audio.onended = () => setPlayingId(null);
      audioElemsRef.current.set(track.id, audio);
    }
    audioElemsRef.current.get(track.id)!.play();
    setPlayingId(track.id);
  };

  const resetForm = () => {
    setPhase('idle'); setPrompt(''); setSelectedGenres([]);
    setLyrics(''); setRefFile(null); setProgress(0); setProgressText('');
  };

  const sv = SERVER_LABELS[serverState];

  const S = {
    page: { minHeight: '100vh', background: 'transparent', fontFamily: "'DM Sans',system-ui,sans-serif", color: T.text, paddingBottom: '60px' } as React.CSSProperties,
    card: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: '16px', padding: '24px' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#9B7EC8', marginBottom: '10px', display: 'block' } as React.CSSProperties,
    input: { width: '100%', background: 'rgba(8,4,16,0.6)', border: `1px solid ${T.border}`, borderRadius: '10px', padding: '12px 14px', color: T.text, fontSize: '14px', fontFamily: 'inherit', outline: 'none', lineHeight: 1.5 } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ background: 'rgba(10,6,18,0.9)', borderBottom: `0.5px solid ${T.border}`, padding: '0 24px', height: '52px', display: 'flex', alignItems: 'center', gap: '14px', backdropFilter: 'blur(20px)' }}>
        <button onClick={onBack} style={{ background: 'none', border: `0.5px solid ${T.border}`, color: T.text2, padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>← Volver</button>
        <div style={{ fontSize: '14px', fontWeight: 600, color: T.text }}>Crear canción con IA</div>

        {/* Server status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(26,16,40,0.8)', border: `1px solid ${T.border}`, borderRadius: '8px', padding: '4px 12px', fontSize: '11px', color: sv.color, cursor: 'pointer' }}
          onClick={checkServer}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: sv.dot, flexShrink: 0, animation: serverState === 'checking' || serverState === 'starting' ? 'pulse 1s infinite' : 'none' }}></div>
          {sv.label}
        </div>

        <div style={{ marginLeft: 'auto', background: 'rgba(192,38,211,0.1)', border: `1px solid ${T.border}`, borderRadius: '8px', padding: '4px 12px', fontSize: '12px', color: '#9B7EC8' }}>
          <span style={{ color: T.pink, fontWeight: 700 }}>{user.credits}</span> créditos · 10 por canción
        </div>
      </div>

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Título */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>✦</div>
          <h1 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '10px' }}>
            Crear canciones con IA
          </h1>
          <p style={{ color: T.text2, fontSize: '15px', lineHeight: 1.6 }}>
            ACE-Step 1.5 genera música completa desde tu descripción.<br />
            Letra opcional · audio de referencia · BPM y duración configurables.
          </p>
        </div>

        {/* ─── IDLE: formulario ─── */}
        {phase === 'idle' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>

            {/* Izquierda */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Prompt */}
              <div style={S.card}>
                <span style={S.label}>Describe tu canción</span>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  placeholder="Ej: Pop electrónico con voz femenina melancólica, 120 BPM, estilo Billie Eilish, producción minimalista con sintetizadores y bajo profundo…"
                  rows={4} style={{ ...S.input, resize: 'vertical', minHeight: '100px' }} />
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '11px', color: T.text3, marginBottom: '6px' }}>Ejemplos:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {PROMPT_EXAMPLES.map((ex, i) => (
                      <button key={i} onClick={() => setPrompt(ex)}
                        style={{ background: 'rgba(192,38,211,0.06)', border: `1px solid ${T.border}`, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: T.text2, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                        {ex.slice(0, 38)}…
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Géneros */}
              <div style={S.card}>
                <span style={S.label}>Géneros (opcional)</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {GENRES.map(g => (
                    <button key={g} onClick={() => toggleGenre(g)}
                      style={{ padding: '6px 14px', borderRadius: '980px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                        background: selectedGenres.includes(g) ? 'rgba(192,38,211,0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${selectedGenres.includes(g) ? T.fuchsia : 'rgba(255,255,255,0.08)'}`,
                        color: selectedGenres.includes(g) ? T.pink : T.text2,
                      }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Letra */}
              <div style={S.card}>
                <button onClick={() => setShowLyrics(!showLyrics)}
                  style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'inherit', padding: 0 }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#9B7EC8' }}>Letra (opcional)</span>
                  <span style={{ color: T.fuchsia, fontSize: '13px', transform: showLyrics ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                </button>
                {showLyrics && (
                  <div style={{ marginTop: '14px' }}>
                    <textarea value={lyrics} onChange={e => setLyrics(e.target.value)}
                      placeholder="Pega aquí la letra de tu canción. ACE-Step la usará como guía lírica…"
                      rows={5} style={{ ...S.input, resize: 'vertical', minHeight: '100px' }} />
                    <div style={{ fontSize: '11px', color: T.text3, marginTop: '5px' }}>La IA intentará cantar esta letra o usarla como referencia temática</div>
                  </div>
                )}
              </div>

              {/* Referencia de audio */}
              <div style={S.card}>
                <span style={S.label}>Audio de referencia (opcional)</span>
                <input type="file" id="ref-upload" ref={refInputRef} accept="audio/*,.wav,.mp3,.flac" onChange={e => { const f = e.target.files?.[0]; if (f) setRefFile(f); e.target.value = ''; }} style={{ display: 'none' }} />
                {!refFile ? (
                  <div onClick={() => refInputRef.current?.click()}
                    style={{ background: 'rgba(8,4,16,0.4)', border: `1.5px dashed rgba(192,38,211,0.25)`, borderRadius: '10px', padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
                    <div style={{ fontSize: '22px', marginBottom: '6px' }}>🎵</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: T.text2, marginBottom: '3px' }}>Subir referencia de estilo</div>
                    <div style={{ fontSize: '11px', color: T.text3 }}>La IA imitará el estilo tonal y rítmico · WAV, MP3, FLAC</div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(192,38,211,0.08)', border: `1px solid rgba(192,38,211,0.25)`, borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px' }}>🎵</span>
                    <div style={{ flex: 1, fontSize: '13px', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{refFile.name}</div>
                    <button onClick={() => setRefFile(null)} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                  </div>
                )}
              </div>
            </div>

            {/* Derecha: controles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              <div style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#9B7EC8' }}>Duración</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", color: T.pink, fontWeight: 700, fontSize: '14px' }}>{formatDuration(duration)}</span>
                </div>
                <input type="range" min={30} max={300} step={15} value={duration} onChange={e => setDuration(Number(e.target.value))}
                  style={{ width: '100%', accentColor: T.fuchsia, cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: T.text3, marginTop: '4px' }}>
                  <span>0:30</span><span>5:00</span>
                </div>
              </div>

              <div style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#9B7EC8' }}>BPM</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", color: T.pink, fontWeight: 700, fontSize: '14px' }}>{bpm}</span>
                </div>
                <input type="range" min={60} max={200} step={1} value={bpm} onChange={e => setBpm(Number(e.target.value))}
                  style={{ width: '100%', accentColor: T.fuchsia, cursor: 'pointer' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: T.text3, marginTop: '4px' }}>
                  <span>60 lento</span><span>200 rápido</span>
                </div>
              </div>

              {/* Resumen */}
              <div style={{ background: 'rgba(8,4,16,0.5)', border: `1px solid ${T.border}`, borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#9B7EC8', marginBottom: '10px' }}>Resumen</div>
                {[
                  { label: 'Costo', val: '10 créditos' },
                  { label: 'Duración', val: formatDuration(duration) },
                  { label: 'BPM aprox.', val: `${bpm}` },
                  { label: 'Géneros', val: selectedGenres.length ? selectedGenres.slice(0, 2).join(', ') : '—' },
                  { label: 'Con letra', val: lyrics.trim() ? 'Sí' : 'No' },
                  { label: 'Referencia', val: refFile ? refFile.name.slice(0, 12) + '…' : 'No' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: T.text2, padding: '4px 0', borderBottom: `0.5px solid rgba(192,38,211,0.08)` }}>
                    <span>{r.label}</span>
                    <span style={{ color: T.text, fontWeight: 600 }}>{r.val}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', padding: '12px', fontSize: '13px', color: '#f87171', lineHeight: 1.5 }}>
                  ⚠️ {error}
                </div>
              )}

              <button onClick={handleGenerate}
                disabled={!prompt.trim() || user.credits < 10}
                style={{ width: '100%', background: prompt.trim() && user.credits >= 10 ? 'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)' : 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '18px', borderRadius: '14px', fontSize: '16px', fontWeight: 800, cursor: prompt.trim() && user.credits >= 10 ? 'pointer' : 'not-allowed', fontFamily: 'inherit', boxShadow: prompt.trim() && user.credits >= 10 ? '0 0 32px rgba(192,38,211,0.5)' : 'none', opacity: prompt.trim() && user.credits >= 10 ? 1 : 0.4 }}>
                ✦ Generar canción
              </button>
              <div style={{ fontSize: '11px', color: T.text3, textAlign: 'center' }}>
                10 créditos · te quedan {user.credits}<br />
                Powered by ACE-Step 1.5 · RunPod GPU
              </div>
            </div>
          </div>
        )}

        {/* ─── GENERANDO ─── */}
        {phase === 'generating' && (
          <div style={{ ...S.card, textAlign: 'center', padding: '56px 32px', maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ width: '80px', height: '80px', margin: '0 auto 24px', background: 'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', boxShadow: '0 0 40px rgba(192,38,211,0.4)' }}>
              ✦
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: T.text, marginBottom: '8px' }}>Generando tu canción…</h3>
            <p style={{ fontSize: '13px', color: T.text2, marginBottom: '28px', lineHeight: 1.6 }}>
              {progressText || 'Iniciando…'}<br />
              <span style={{ fontSize: '11px', color: T.text3 }}>Tiempo estimado: {Math.round(duration * 0.4)}–{Math.round(duration * 0.8)} segundos</span>
            </p>
            <div style={{ background: 'rgba(8,4,16,0.6)', borderRadius: '10px', height: '8px', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)', borderRadius: '10px', width: `${progress}%`, transition: 'width 1s ease' }}></div>
            </div>
            <div style={{ fontFamily: "'DM Mono',monospace", color: T.fuchsia, fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>{progress}%</div>
            <div style={{ fontSize: '11px', color: T.text3 }}>ACE-Step 1.5 · RunPod GPU · no cierres esta ventana</div>
          </div>
        )}

        {/* ─── DONE ─── */}
        {phase === 'done' && history.length > 0 && (
          <div>
            <div style={{ ...S.card, borderColor: 'rgba(74,222,128,0.3)', marginBottom: '20px', textAlign: 'center', padding: '28px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: T.text, marginBottom: '4px' }}>¡Canción generada!</h3>
              <p style={{ fontSize: '13px', color: T.text2 }}>"{history[0].title}"</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              {history.map(track => (
                <div key={track.id} style={{ ...S.card, display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg,#EC4899,#C026D3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>✦</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
                    <div style={{ fontSize: '11px', color: T.text3, marginTop: '2px' }}>{track.duration} · {track.genre} · {track.createdAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  {/* Waveform decorativa */}
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center', height: '26px', flexShrink: 0 }}>
                    {Array.from({ length: 18 }).map((_, j) => (
                      <div key={j} style={{ width: '3px', borderRadius: '1px', background: '#EC4899', height: `${25 + Math.sin(j * 0.5) * 35 + 20}%`, opacity: 0.7 }}></div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => handlePlay(track)}
                      style={{ background: playingId === track.id ? 'rgba(192,38,211,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${playingId === track.id ? T.fuchsia : T.border}`, color: playingId === track.id ? T.pink : T.text2, borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {playingId === track.id ? '⏸' : '▶'}
                    </button>
                    {onTrackReady && (
                      <button onClick={() => onTrackReady(track.url, track.title)}
                        style={{ background: 'rgba(192,38,211,0.15)', border: `1px solid ${T.border}`, color: T.pink, borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        🎛️
                      </button>
                    )}
                    <a href={track.url} download={`${track.title.replace(/[^a-z0-9]/gi, '_')}.wav`}
                      style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: T.green, borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                      ⬇
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={resetForm}
              style={{ width: '100%', background: 'linear-gradient(135deg,#EC4899,#C026D3)', border: 'none', color: '#fff', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              ✦ Generar otra canción
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}
