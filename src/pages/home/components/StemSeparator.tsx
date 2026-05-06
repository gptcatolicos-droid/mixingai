import { getValidToken } from '@/utils/auth';
import { useState, useCallback, useRef } from 'react';

interface User { id: string; firstName: string; credits: number; is_pro?: boolean; plan?: string; }
interface StemResult { key: string; label: string; color: string; icon: string; blob: Blob; url: string; duration: string; }
interface StemSeparatorProps {
  user: User;
  onBack: () => void;
  onCreditsUpdate: (n: number) => void;
  onStemsReady?: (files: File[]) => void;
}

const SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;
const SAMPLE_RATE = 44100;

const T = {
  bgDeep: '#0F0A1A', surface: 'rgba(26,16,40,0.82)', surface2: 'rgba(35,20,55,0.5)',
  text: '#F8F0FF', text2: 'rgba(248,240,255,0.65)', text3: 'rgba(248,240,255,0.38)',
  pink: '#EC4899', fuchsia: '#C026D3', violet: '#7C3AED',
  border: 'rgba(192,38,211,0.18)', green: '#4ade80', amber: '#fbbf24',
};

const STEM_COLORS: Record<string, string> = {
  vocals: '#EC4899', drums: '#10B981', bass: '#F97316', other: '#6366F1',
  guitar: '#FBBF24', keys: '#3B82F6', piano: '#3B82F6', synth: '#A855F7',
  default0: '#EC4899', default1: '#10B981', default2: '#F97316', default3: '#6366F1',
  default4: '#FBBF24', default5: '#3B82F6',
};

const STEM_ICONS: Record<string, string> = {
  vocals: '🎤', drums: '🥁', bass: '🎸', other: '🎹',
  guitar: '🎸', keys: '🎹', piano: '🎹', synth: '🎛️',
};

function getStemColor(key: string, idx: number): string {
  return STEM_COLORS[key.toLowerCase()] || STEM_COLORS[`default${idx % 6}`] || '#EC4899';
}
function getStemIcon(key: string): string {
  return STEM_ICONS[key.toLowerCase()] || '🎵';
}


function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  const chunkSize = 4096; // Más pequeño para evitar stack overflow en archivos grandes
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      bin += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(bin);
}

function base64ToBlob(b64: string, mime = 'audio/mp3'): Blob {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function getAudioDuration(blob: Blob): Promise<string> {
  try {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await new Promise<void>((res, rej) => {
      audio.onloadedmetadata = () => res();
      audio.onerror = () => rej();
      setTimeout(() => res(), 3000);
    });
    URL.revokeObjectURL(url);
    const s = audio.duration || 0;
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  } catch { return '?:??'; }
}

function fmtSize(b: number) { return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`; }

export default function StemSeparator({ user, onBack, onCreditsUpdate, onStemsReady }: StemSeparatorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [model, setModel] = useState<'htdemucs' | 'htdemucs_6s'>('htdemucs');
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [stems, setStems] = useState<StemResult[]>([]);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [serverActive, setServerActive] = useState<boolean | null>(null);
  const audioElemsRef = useRef<HTMLAudioElement[]>([]);
  const isPro = user?.is_pro || user?.plan === 'unlimited';

  const processFile = (f: File) => {
    setError('');
    const ok = f.type.startsWith('audio/') || /\.(wav|mp3|flac|aac|m4a|ogg)$/i.test(f.name);
    if (!ok) { setError('Formato no soportado. Usa WAV, MP3, FLAC, AAC o M4A'); return; }
    if (f.size > 500 * 1024 * 1024) { setError('Archivo muy grande. Máximo 500MB.'); return; }
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) processFile(f);
  }, []);

  const handleSeparate = async () => {
    if (!file || (!isPro && user.credits < 3)) return;
    const token = await getValidToken();
    if (!token) { setError('Sesión expirada. Recarga la página.'); return; }

    setError(''); setPhase('uploading'); setProgress(5); setProgressText('Preparando audio…');

    try {
      // Convertir a base64
      const arrayBuffer = await file.arrayBuffer();
      setProgress(15); setProgressText('Enviando al servidor Demucs…');
      const audioBase64 = arrayBufferToBase64(arrayBuffer);

      setPhase('processing'); setProgress(20); setProgressText('Conectando con Demucs en RunPod…');

      // Llamar a la Edge Function
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/stems-separate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON,
        },
        body: JSON.stringify({
          audioBase64,
          mimeType: file.type || 'audio/wav',
          model,
        }),
        signal: (() => { const ac = new AbortController(); setTimeout(() => ac.abort(), 360_000); return ac.signal; })(),
      });

      // Simular progreso mientras espera
      const progInterval = setInterval(() => {
        setProgress(p => Math.min(p + 2, 85));
        setProgressText('Demucs separando instrumentos…');
      }, 3000);

      const data = await resp.json();
      clearInterval(progInterval);

      if (!resp.ok || !data.success) {
        if (data.needsServer) {
          setError('El servidor RunPod no está activo. Actívalo primero desde runpod.io.');
        } else {
          setError(data.error || `Error ${resp.status}`);
        }
        setPhase('idle');
        return;
      }

      setProgress(90); setProgressText('Procesando stems…');

      // Construir resultados desde la respuesta de Demucs
      const stemEntries = Object.entries(data.stems as Record<string, string>);
      const stemResults: StemResult[] = await Promise.all(
        stemEntries.map(async ([key, b64], idx) => {
          const blob = base64ToBlob(b64, 'audio/mp3');
          const url = URL.createObjectURL(blob);
          const duration = await getAudioDuration(blob);
          return {
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            color: getStemColor(key, idx),
            icon: getStemIcon(key),
            blob,
            url,
            duration,
          };
        })
      );

      setStems(stemResults);
      setPhase('done');
      setProgress(100);
      setServerActive(true);
      onCreditsUpdate(data.creditsRemaining ?? (isPro ? user.credits : user.credits - 3));

    } catch (err: any) {
      const isTimeout = err?.name === 'TimeoutError';
      setError(isTimeout
        ? 'La separación tardó demasiado. Intenta con un archivo más corto.'
        : err?.message ?? 'Error desconocido'
      );
      setPhase('idle');
    }
  };

  const handlePlay = (idx: number) => {
    if (playingIdx !== null && audioElemsRef.current[playingIdx]) {
      audioElemsRef.current[playingIdx].pause();
      audioElemsRef.current[playingIdx].currentTime = 0;
    }
    if (playingIdx === idx) { setPlayingIdx(null); return; }
    if (!audioElemsRef.current[idx]) {
      audioElemsRef.current[idx] = new Audio(stems[idx].url);
      audioElemsRef.current[idx].onended = () => setPlayingIdx(null);
    }
    audioElemsRef.current[idx].play();
    setPlayingIdx(idx);
  };

  const handleOpenInDAW = () => {
    if (!onStemsReady) return;
    const files = stems.map(s => new File([s.blob], `stem_${s.key}.mp3`, { type: 'audio/mp3' }));
    onStemsReady(files);
  };

  const resetAll = () => {
    audioElemsRef.current.forEach(a => { a.pause(); a.src = ''; });
    audioElemsRef.current = [];
    stems.forEach(s => URL.revokeObjectURL(s.url));
    setFile(null); setStems([]); setPhase('idle');
    setProgress(0); setProgressText(''); setError(''); setPlayingIdx(null);
  };

  const S = {
    page: { minHeight: '100vh', background: `radial-gradient(ellipse at 80% -10%,rgba(192,38,211,0.15),transparent 50%),${T.bgDeep}`, fontFamily: "'DM Sans',system-ui,sans-serif", color: T.text, paddingBottom: '60px' } as React.CSSProperties,
    card: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: '16px', padding: '22px' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#9B7EC8', marginBottom: '10px', display: 'block' } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ background: 'rgba(10,6,18,0.9)', borderBottom: `0.5px solid ${T.border}`, padding: '0 24px', height: '52px', display: 'flex', alignItems: 'center', gap: '16px', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={onBack} style={{ background: 'none', border: `0.5px solid ${T.border}`, color: T.text2, padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>← Volver</button>
        <div style={{ fontSize: '14px', fontWeight: 600, color: T.text }}>Separar Stems — Demucs</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: serverActive === true ? T.green : serverActive === false ? '#f87171' : T.amber }} />
          <span style={{ fontSize: '11px', color: serverActive === true ? T.green : T.text3 }}>
            {serverActive === true ? 'Demucs activo en RunPod' : 'Verificando servidor…'}
          </span>
        </div>
        <div style={{ marginLeft: 'auto', background: 'rgba(192,38,211,0.1)', border: `1px solid ${T.border}`, borderRadius: '8px', padding: '4px 12px', fontSize: '12px', color: '#9B7EC8' }}>
          <span style={{ color: T.pink, fontWeight: 700 }}>{isPro ? '∞' : user.credits}</span> créditos · 3 por separación
        </div>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '36px 20px' }}>
        {/* Título */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎚️</div>
          <h1 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '8px' }}>Separar stems con Demucs</h1>
          <p style={{ color: T.text2, fontSize: '14px', lineHeight: 1.6 }}>Meta AI separa cada instrumento y la voz en pistas individuales · Calidad profesional</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '980px', padding: '5px 14px', fontSize: '11px', color: T.green, fontWeight: 600, marginTop: '8px' }}>
            🔒 Audio procesado en servidor seguro · No se almacena
          </div>
        </div>

        {/* IDLE */}
        {phase === 'idle' && (
          <>
            <input type="file" id="sep-upload" accept="audio/*" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }} style={{ display: 'none' }} />

            <div style={{ ...S.card, padding: 0, marginBottom: '14px', overflow: 'hidden' }}>
              {!file ? (
                <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={e => { e.preventDefault(); setIsDragging(false); }} onDrop={handleDrop}
                  onClick={() => document.getElementById('sep-upload')?.click()}
                  style={{ padding: '52px 24px', textAlign: 'center', cursor: 'pointer', border: `2px dashed ${isDragging ? T.fuchsia : 'rgba(192,38,211,0.25)'}`, borderRadius: '16px', background: isDragging ? 'rgba(192,38,211,0.05)' : 'transparent', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎵</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: T.text, marginBottom: '5px' }}>Arrastra tu canción aquí</div>
                  <div style={{ fontSize: '12px', color: T.text3, marginBottom: '14px' }}>o haz clic para seleccionar</div>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {['WAV', 'MP3', 'FLAC', 'AAC', 'M4A'].map(f => (
                      <span key={f} style={{ background: 'rgba(192,38,211,0.1)', border: `1px solid ${T.border}`, borderRadius: '6px', padding: '3px 10px', fontSize: '11px', color: '#9B7EC8', fontWeight: 600 }}>{f}</span>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: T.text3 }}>Hasta 500MB · 20 min máximo</div>
                </div>
              ) : (
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg,#EC4899,#C026D3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🎵</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                    <div style={{ fontSize: '11px', color: T.text3, marginTop: '2px' }}>{fmtSize(file.size)}</div>
                  </div>
                  <button onClick={resetAll} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                </div>
              )}
            </div>

            {error && (
              <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', fontSize: '13px', color: '#f87171', lineHeight: 1.5 }}>
                ⚠️ {error}
                {error.includes('RunPod') && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#f87171' }}>
                    → Verifica que tu cuenta de Replicate tiene créditos en replicate.com/billing
                  </div>
                )}
              </div>
            )}

            {file && (
              <>
                {/* Modelo */}
                <div style={{ ...S.card, marginBottom: '14px' }}>
                  <span style={S.label}>Modelo de separación</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { id: 'htdemucs', label: 'HTDemucs', stems: '4 stems', desc: 'Vocals · Drums · Bass · Other', time: '~2 min' },
                      { id: 'htdemucs_6s', label: 'HTDemucs 6s', stems: '6 stems', desc: '+Guitar · +Piano', time: '~4 min' },
                    ].map(m => (
                      <button key={m.id} onClick={() => setModel(m.id as any)}
                        style={{ background: model === m.id ? 'rgba(192,38,211,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${model === m.id ? T.fuchsia : T.border}`, borderRadius: '12px', padding: '14px 12px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: model === m.id ? T.pink : T.text, marginBottom: '3px' }}>{m.label}</div>
                        <div style={{ fontSize: '11px', color: model === m.id ? T.fuchsia : '#9B7EC8', fontWeight: 600, marginBottom: '4px' }}>{m.stems}</div>
                        <div style={{ fontSize: '10px', color: T.text3 }}>{m.desc}</div>
                        <div style={{ fontSize: '10px', color: T.text3, marginTop: '3px' }}>{m.time}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {!isPro && user.credits < 3 ? (
                  <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '12px', padding: '16px', textAlign: 'center', fontSize: '14px', color: '#f87171' }}>
                    ⚠️ Necesitas 3 créditos. Tienes {user.credits}.
                  </div>
                ) : (
                  <button onClick={handleSeparate}
                    style={{ width: '100%', background: 'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)', border: 'none', color: '#fff', padding: '18px', borderRadius: '14px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 32px rgba(192,38,211,0.5)' }}>
                    🎚️ Separar stems con Demucs — {isPro ? 'Gratis' : '3 créditos'}
                  </button>
                )}
                <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: T.text3 }}>
                  Replicate · Demucs de Meta AI · Calidad profesional
                </div>
              </>
            )}
          </>
        )}

        {/* PROCESANDO */}
        {(phase === 'uploading' || phase === 'processing') && (
          <div style={{ ...S.card, textAlign: 'center', padding: '52px 32px' }}>
            <div style={{ width: '72px', height: '72px', margin: '0 auto 20px', background: 'linear-gradient(135deg,#EC4899,#C026D3)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', boxShadow: '0 0 36px rgba(192,38,211,0.4)' }}>🎚️</div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: T.text, marginBottom: '6px' }}>Separando con Demucs…</h3>
            <p style={{ fontSize: '13px', color: T.text3, marginBottom: '28px', lineHeight: 1.6 }}>
              {progressText}<br />
              <span style={{ fontSize: '11px', color: T.green }}>Demucs AI · RunPod GPU · separación real por instrumento</span>
            </p>
            <div style={{ background: 'rgba(8,4,16,0.7)', borderRadius: '10px', height: '8px', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)', borderRadius: '10px', width: `${progress}%`, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ fontFamily: "'DM Mono',monospace", color: T.fuchsia, fontWeight: 700, fontSize: '16px' }}>{progress}%</div>
          </div>
        )}

        {/* DONE */}
        {phase === 'done' && stems.length > 0 && (
          <div>
            <div style={{ ...S.card, textAlign: 'center', padding: '24px', marginBottom: '16px', borderColor: 'rgba(74,222,128,0.3)' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>✅</div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: T.text, marginBottom: '3px' }}>¡{stems.length} stems listos!</h3>
              <p style={{ fontSize: '12px', color: T.text2 }}>{file?.name} · Separado con Demucs en RunPod</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {stems.map((stem, i) => (
                <div key={stem.key} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderColor: `${stem.color}33` }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: stem.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '18px', flexShrink: 0 }}>{stem.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: T.text }}>{stem.label}</div>
                    <div style={{ fontSize: '11px', color: T.text3, marginTop: '2px' }}>stem_{stem.key} · {stem.duration}</div>
                  </div>
                  <button onClick={() => handlePlay(i)}
                    style={{ background: playingIdx === i ? `${stem.color}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${playingIdx === i ? stem.color : T.border}`, color: playingIdx === i ? stem.color : T.text2, borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {playingIdx === i ? '⏸' : '▶'}
                  </button>
                  <a href={stem.url} download={`stem_${stem.key}.mp3`}
                    style={{ background: 'rgba(192,38,211,0.1)', border: `1px solid ${T.border}`, color: T.pink, borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                    ⬇
                  </a>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {onStemsReady && (
                <button onClick={handleOpenInDAW}
                  style={{ width: '100%', background: 'linear-gradient(135deg,#EC4899,#C026D3)', border: 'none', color: '#fff', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 24px rgba(192,38,211,0.4)' }}>
                  🎛️ Abrir {stems.length} stems en MixingStudio AI
                </button>
              )}
              <button onClick={resetAll}
                style={{ width: '100%', background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, padding: '14px', borderRadius: '14px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Separar otra canción
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
