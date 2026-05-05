import { useState, useCallback, useRef } from 'react';

/**
 * StemSeparator.tsx
 * Separación real con Demucs ONNX via Web Worker + onnxruntime-web
 * Coloca en: src/pages/home/components/StemSeparator.tsx
 * Requiere: src/workers/stemsWorker.ts  +  npm install onnxruntime-web
 */

interface User { id: string; firstName: string; credits: number; }

interface StemResult {
  key: string;
  label: string;
  color: string;
  icon: string;
  blob: Blob;
  url: string;
  duration: string;
}

interface StemSeparatorProps {
  user: User;
  onBack: () => void;
  onCreditsUpdate: (n: number) => void;
  onStemsReady?: (files: File[]) => void;
}

const SAMPLE_RATE = 44100;

const STEM_META = [
  { key: 'vocals', label: 'Vocals', color: '#EC4899', icon: '🎤' },
  { key: 'drums',  label: 'Drums',  color: '#10B981', icon: '🥁' },
  { key: 'bass',   label: 'Bass',   color: '#F97316', icon: '🎸' },
  { key: 'other',  label: 'Other',  color: '#6366F1', icon: '🎹' },
];

const QUALITY_OPTIONS = [
  { id: 'fast', label: 'Rápido',   time: '~30 seg', desc: 'Chunks grandes · buena calidad' },
  { id: 'std',  label: 'Estándar', time: '~90 seg', desc: 'Recomendado · balance perfecto' },
  { id: 'hd',   label: 'HD',       time: '~3 min',  desc: 'Máxima precisión · stems limpios' },
];

const T = {
  surface: 'rgba(26,16,40,0.82)', surface2: 'rgba(35,20,55,0.5)',
  text: '#F8F0FF', text2: 'rgba(248,240,255,0.65)', text3: 'rgba(248,240,255,0.38)',
  pink: '#EC4899', fuchsia: '#C026D3', violet: '#7C3AED',
  border: 'rgba(192,38,211,0.18)', green: '#4ade80',
};

// ─── Float32Array → WAV Blob ──────────────────────────────────────────────────
function float32ToWav(samples: Float32Array, sr: number): Blob {
  const numCh = 1, bps = 16, bpSample = bps / 8, blockAlign = numCh * bpSample;
  const dataLen = samples.length * bpSample;
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);
  const wr = (off: number, s: string) => s.split('').forEach((c, i) => v.setUint8(off + i, c.charCodeAt(0)));
  wr(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true); wr(8, 'WAVE'); wr(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, numCh, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * blockAlign, true);
  v.setUint16(32, blockAlign, true); v.setUint16(34, bps, true);
  wr(36, 'data'); v.setUint32(40, dataLen, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++, off += 2)
    v.setInt16(off, Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), true);
  return new Blob([buf], { type: 'audio/wav' });
}

// ─── Decodificar archivo con Web Audio API ────────────────────────────────────
async function decodeAudioFile(file: File): Promise<{ data: Float32Array; sampleRate: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE });
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  await ctx.close();
  const mono = new Float32Array(audioBuffer.length);
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    const chData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < mono.length; i++) mono[i] += chData[i];
  }
  for (let i = 0; i < mono.length; i++) mono[i] /= audioBuffer.numberOfChannels;
  return { data: mono, sampleRate: audioBuffer.sampleRate };
}

function formatDuration(samples: number, sr: number) {
  const s = Math.round(samples / sr);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function formatSize(b: number) {
  return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function StemSeparator({ user, onBack, onCreditsUpdate, onStemsReady }: StemSeparatorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [quality, setQuality] = useState<'fast' | 'std' | 'hd'>('std');
  const [phase, setPhase] = useState<'idle' | 'decoding' | 'processing' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [modelCached, setModelCached] = useState<boolean | null>(null);
  const [stems, setStems] = useState<StemResult[]>([]);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [error, setError] = useState('');
  const workerRef = useRef<Worker | null>(null);
  const audioElemsRef = useRef<HTMLAudioElement[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = '';
  };

  const handleSeparate = async () => {
    if (!file || user.credits < 3) return;
    setError(''); setPhase('decoding'); setProgress(2); setProgressText('Decodificando audio…');
    try {
      const { data, sampleRate } = await decodeAudioFile(file);
      setPhase('processing'); setProgress(8); setProgressText('Iniciando motor Demucs…');

      const worker = new Worker(
        new URL('../../../workers/stemsWorker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      worker.onmessage = async (evt) => {
        const msg = evt.data;
        if (msg.type === 'model-loading') setModelCached(msg.cached);
        if (msg.type === 'progress') { setProgress(msg.pct); setProgressText(msg.text); }
        if (msg.type === 'done') {
          setProgress(99); setProgressText('Exportando stems WAV…');
          const stemResults: StemResult[] = await Promise.all(
            STEM_META.map(async (meta) => {
              const pcm = msg.stems[meta.key] as Float32Array;
              const blob = float32ToWav(pcm, msg.sampleRate);
              const url = URL.createObjectURL(blob);
              return { ...meta, blob, url, duration: formatDuration(pcm.length, msg.sampleRate) };
            })
          );
          setStems(stemResults); setPhase('done'); setProgress(100);
          onCreditsUpdate(user.credits - 3);
          worker.terminate(); workerRef.current = null;
        }
        if (msg.type === 'error') {
          setError(`Error: ${msg.message}`); setPhase('idle');
          worker.terminate(); workerRef.current = null;
        }
      };
      worker.onerror = (err) => { setError(`Worker error: ${err.message}`); setPhase('idle'); };
      worker.postMessage({ type: 'separate', audioData: data, sampleRate, quality }, [data.buffer]);
    } catch (err: any) {
      setError(`Error decodificando: ${err?.message}`); setPhase('idle');
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

  const handleLoadAll = () => {
    if (!onStemsReady) return;
    const files = stems.map(s => new File([s.blob], `stem_${s.key}.wav`, { type: 'audio/wav' }));
    onStemsReady(files);
  };

  const resetAll = () => {
    workerRef.current?.terminate();
    audioElemsRef.current.forEach(a => { a.pause(); a.src = ''; });
    audioElemsRef.current = [];
    stems.forEach(s => URL.revokeObjectURL(s.url));
    setFile(null); setStems([]); setPhase('idle');
    setProgress(0); setProgressText(''); setError(''); setPlayingIdx(null);
  };

  const S = {
    page: { minHeight: '100vh', background: 'transparent', fontFamily: "'DM Sans',system-ui,sans-serif", color: T.text, paddingBottom: '60px' } as React.CSSProperties,
    card: { background: T.surface, border: `1px solid ${T.border}`, borderRadius: '16px', padding: '24px' } as React.CSSProperties,
    label: { fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#9B7EC8', marginBottom: '10px', display: 'block' } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ background: 'rgba(10,6,18,0.9)', borderBottom: `0.5px solid ${T.border}`, padding: '0 24px', height: '52px', display: 'flex', alignItems: 'center', gap: '16px', backdropFilter: 'blur(20px)' }}>
        <button onClick={onBack} style={{ background: 'none', border: `0.5px solid ${T.border}`, color: T.text2, padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px' }}>← Volver</button>
        <div style={{ fontSize: '14px', fontWeight: 600, color: T.text }}>Separar Stems — Demucs ONNX</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: T.green }}></div>
          <span style={{ fontSize: '11px', color: T.green }}>100% en tu dispositivo</span>
        </div>
        <div style={{ marginLeft: 'auto', background: 'rgba(192,38,211,0.1)', border: `1px solid ${T.border}`, borderRadius: '8px', padding: '4px 12px', fontSize: '12px', color: '#9B7EC8' }}>
          <span style={{ color: T.pink, fontWeight: 700 }}>{user.credits}</span> créditos · 3 por separación
        </div>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Título */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎚️</div>
          <h1 style={{ fontSize: 'clamp(24px,4vw,34px)', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '10px' }}>Separar stems con Demucs</h1>
          <p style={{ color: T.text2, fontSize: '15px', lineHeight: 1.6 }}>Tecnología open-source de Meta · 4 stems · Calidad profesional</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '980px', padding: '5px 14px', fontSize: '12px', color: T.green, fontWeight: 600, marginTop: '10px' }}>
            🔒 Tu audio nunca sale de este dispositivo
          </div>
          {modelCached === false && <div style={{ marginTop: '8px', fontSize: '12px', color: T.text3 }}>Primera vez: descarga modelo ~170MB → queda en caché para siempre</div>}
          {modelCached === true && <div style={{ marginTop: '8px', fontSize: '12px', color: T.green }}>✓ Modelo en caché · carga instantánea</div>}
        </div>

        {/* ─── IDLE ─── */}
        {phase === 'idle' && (
          <>
            <input type="file" id="sep-upload" accept="audio/*,.wav,.mp3,.flac,.aac,.m4a,.ogg" onChange={handleFileSelect} style={{ display: 'none' }} />
            <div style={{ ...S.card, padding: 0, marginBottom: '14px', overflow: 'hidden' }}>
              {!file ? (
                <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                  onClick={() => document.getElementById('sep-upload')?.click()}
                  style={{ padding: '52px 24px', textAlign: 'center', cursor: 'pointer', border: `2px dashed ${isDragging ? T.fuchsia : 'rgba(192,38,211,0.25)'}`, borderRadius: '16px', background: isDragging ? 'rgba(192,38,211,0.05)' : 'transparent', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎵</div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: T.text, marginBottom: '6px' }}>Arrastra tu canción aquí</div>
                  <div style={{ fontSize: '13px', color: T.text3, marginBottom: '16px' }}>o haz clic para seleccionar</div>
                  <div style={{ display: 'flex', gap: '7px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {['WAV', 'MP3', 'FLAC', 'AAC', 'M4A'].map(f => (
                      <span key={f} style={{ background: 'rgba(192,38,211,0.1)', border: `1px solid ${T.border}`, borderRadius: '6px', padding: '3px 10px', fontSize: '11px', color: '#9B7EC8', fontWeight: 600 }}>{f}</span>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '12px', color: T.text3 }}>Hasta 500MB · 20 min máximo</div>
                </div>
              ) : (
                <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg,#EC4899,#C026D3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>🎵</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                    <div style={{ fontSize: '12px', color: T.text3, marginTop: '2px' }}>{formatSize(file.size)}</div>
                  </div>
                  <button onClick={resetAll} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                </div>
              )}
            </div>

            {error && (
              <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', fontSize: '13px', color: '#f87171' }}>⚠️ {error}</div>
            )}

            {file && (
              <>
                <div style={{ ...S.card, marginBottom: '14px' }}>
                  <span style={S.label}>Calidad de separación</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                    {QUALITY_OPTIONS.map(q => (
                      <button key={q.id} onClick={() => setQuality(q.id as any)}
                        style={{ background: quality === q.id ? 'rgba(192,38,211,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${quality === q.id ? T.fuchsia : T.border}`, borderRadius: '12px', padding: '14px 8px', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit', transition: 'all 0.12s' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: quality === q.id ? T.pink : T.text, marginBottom: '4px' }}>{q.label}</div>
                        <div style={{ fontSize: '12px', color: quality === q.id ? T.fuchsia : '#9B7EC8', fontWeight: 600, marginBottom: '4px' }}>{q.time}</div>
                        <div style={{ fontSize: '11px', color: T.text3, lineHeight: 1.3 }}>{q.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ ...S.card, marginBottom: '18px' }}>
                  <span style={S.label}>Recibirás estas 4 pistas (WAV 44.1kHz)</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {STEM_META.map(s => (
                      <div key={s.key} style={{ background: T.surface2, borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', border: `1px solid ${s.color}22` }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }}></div>
                        <span style={{ fontSize: '16px' }}>{s.icon}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: T.text, flex: 1 }}>{s.label}</span>
                        <span style={{ fontSize: '10px', color: T.text3 }}>stem.wav</span>
                      </div>
                    ))}
                  </div>
                </div>

                {user.credits < 3 ? (
                  <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '12px', padding: '16px', textAlign: 'center', fontSize: '14px', color: '#f87171' }}>
                    ⚠️ Necesitas 3 créditos. Tienes {user.credits}.
                  </div>
                ) : (
                  <button onClick={handleSeparate}
                    style={{ width: '100%', background: 'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)', border: 'none', color: '#fff', padding: '18px', borderRadius: '14px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 32px rgba(192,38,211,0.5)' }}>
                    🎚️ Separar stems — 3 créditos
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* ─── PROCESANDO ─── */}
        {(phase === 'decoding' || phase === 'processing') && (
          <div style={{ ...S.card, textAlign: 'center', padding: '52px 32px' }}>
            <div style={{ width: '76px', height: '76px', margin: '0 auto 22px', background: 'linear-gradient(135deg,#EC4899,#C026D3)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', boxShadow: '0 0 36px rgba(192,38,211,0.4)' }}>
              {phase === 'decoding' ? '🎵' : '🎚️'}
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: T.text, marginBottom: '6px' }}>
              {phase === 'decoding' ? 'Decodificando audio…' : 'Separando con Demucs…'}
            </h3>
            <p style={{ fontSize: '13px', color: T.text3, marginBottom: '28px', lineHeight: 1.6 }}>
              {progressText}<br />
              <span style={{ color: T.green, fontSize: '12px' }}>🔒 Procesando en tu dispositivo · cero servidores</span>
            </p>
            <div style={{ background: 'rgba(8,4,16,0.7)', borderRadius: '10px', height: '8px', overflow: 'hidden', marginBottom: '10px' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)', borderRadius: '10px', width: `${progress}%`, transition: 'width 0.5s ease' }}></div>
            </div>
            <div style={{ fontFamily: "'DM Mono',monospace", color: T.fuchsia, fontWeight: 700, fontSize: '16px', marginBottom: '24px' }}>{progress}%</div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              {STEM_META.map((s, i) => (
                <div key={s.key} style={{ textAlign: 'center' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: progress > 35 + i * 15 ? `${s.color}33` : 'rgba(255,255,255,0.03)', border: `1px solid ${progress > 35 + i * 15 ? s.color + '66' : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', margin: '0 auto 5px', transition: 'all 0.4s' }}>
                    {s.icon}
                  </div>
                  <div style={{ fontSize: '9px', color: progress > 35 + i * 15 ? s.color : T.text3, fontWeight: 600, transition: 'color 0.4s' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── DONE ─── */}
        {phase === 'done' && stems.length > 0 && (
          <div>
            <div style={{ ...S.card, textAlign: 'center', padding: '26px', marginBottom: '16px', borderColor: 'rgba(74,222,128,0.3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: T.text, marginBottom: '4px' }}>¡4 stems listos!</h3>
              <p style={{ fontSize: '13px', color: T.text2 }}>{file?.name} · Calidad {quality === 'fast' ? 'Rápida' : quality === 'std' ? 'Estándar' : 'HD'} · Demucs htdemucs</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {stems.map((stem, i) => (
                <div key={stem.key} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderColor: `${stem.color}33` }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: stem.color, flexShrink: 0 }}></div>
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>{stem.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: T.text }}>{stem.label}</div>
                    <div style={{ fontSize: '11px', color: T.text3, marginTop: '2px' }}>stem_{stem.key}.wav · WAV 44.1kHz · {stem.duration}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center', height: '26px', flexShrink: 0 }}>
                    {Array.from({ length: 14 }).map((_, j) => (
                      <div key={j} style={{ width: '3px', borderRadius: '1px', background: stem.color, height: `${25 + Math.sin(j * 0.6 + i) * 35 + 20}%`, opacity: 0.7 }}></div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => handlePlay(i)}
                      style={{ background: playingIdx === i ? `${stem.color}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${playingIdx === i ? stem.color : T.border}`, color: playingIdx === i ? stem.color : T.text2, borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {playingIdx === i ? '⏸' : '▶'}
                    </button>
                    <a href={stem.url} download={`stem_${stem.key}.wav`}
                      style={{ background: 'rgba(192,38,211,0.1)', border: `1px solid ${T.border}`, color: T.pink, borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                      ⬇
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {onStemsReady && (
                <button onClick={handleLoadAll}
                  style={{ width: '100%', background: 'linear-gradient(135deg,#EC4899,#C026D3)', border: 'none', color: '#fff', padding: '16px', borderRadius: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 24px rgba(192,38,211,0.4)' }}>
                  🎛️ Abrir los 4 stems en el Mezclador
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
