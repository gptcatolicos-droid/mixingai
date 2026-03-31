import { useState, useEffect, useRef, useCallback } from 'react';
import { drawWaveform } from '../../../utils/drawWaveform';

interface MasterData {
  audioBuffer: AudioBuffer; audioUrl: string; waveformPeaks: Float32Array;
}
interface MixData {
  audioBuffer: AudioBuffer; audioUrl: string; waveformPeaks: Float32Array; finalLufs: number; presetName?: string;
}
interface MasterScreenProps {
  masterData: MasterData;
  mixData: MixData | null;
  onBack: () => void;
}

const CHAIN = [
  { icon: '🔇', label: 'Noise Reduction', val: 'Highpass 40Hz' },
  { icon: '📊', label: 'EQ Mastering', val: '+1.5dB Low · +0.8dB Pres · +1.2dB Air' },
  { icon: '🗜️', label: 'Compresión', val: 'Ratio 2:1 · Thr -18dB' },
  { icon: '⛔', label: 'True Peak Limiter', val: '-1.0 dBFS' },
  { icon: '✅', label: 'Output final', val: '-12 LUFS', success: true },
];

export default function MasterScreen({ masterData, mixData, onBack }: MasterScreenProps) {
  const [activeTab, setActiveTab] = useState<'master'|'mix'>('master');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioCtx, setAudioCtx] = useState<AudioContext|null>(null);
  const [sourceNode, setSourceNode] = useState<AudioBufferSourceNode|null>(null);

  const masterCanvasRef = useRef<HTMLCanvasElement>(null);
  const mixCanvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef<number>();
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);

  const activeBuffer = activeTab === 'master' ? masterData.audioBuffer : mixData?.audioBuffer;
  const activePeaks = activeTab === 'master' ? masterData.waveformPeaks : mixData?.waveformPeaks;
  const dur = activeBuffer?.duration ?? 0;

  const fmt = (s: number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;

  // Dibujar waveforms
  useEffect(() => {
    if (masterCanvasRef.current && masterData.waveformPeaks) {
      drawWaveform({ canvas: masterCanvasRef.current, waveformPeaks: masterData.waveformPeaks,
        currentTime: activeTab==='master' ? currentTime : 0, duration: masterData.audioBuffer.duration,
        style: 'soundcloud',
        colors: { played: '#F59E0B', unplayed: 'rgba(245,158,11,0.2)', playhead: '#EF6C00' }
      });
    }
  }, [masterData, currentTime, activeTab]);

  useEffect(() => {
    if (mixCanvasRef.current && mixData?.waveformPeaks) {
      drawWaveform({ canvas: mixCanvasRef.current, waveformPeaks: mixData.waveformPeaks,
        currentTime: activeTab==='mix' ? currentTime : 0, duration: mixData.audioBuffer.duration,
        style: 'soundcloud',
        colors: { played: '#C026D3', unplayed: 'rgba(192,38,211,0.2)', playhead: '#EC4899' }
      });
    }
  }, [mixData, currentTime, activeTab]);

  // Stop al cambiar de tab
  useEffect(() => {
    stopAudio();
    setCurrentTime(0);
    pausedAtRef.current = 0;
  }, [activeTab]);

  const stopAudio = useCallback(() => {
    if (sourceNode) { try { sourceNode.stop(); sourceNode.disconnect(); } catch(e){} setSourceNode(null); }
    if (timeRef.current) clearInterval(timeRef.current);
    setIsPlaying(false);
  }, [sourceNode]);

  const togglePlay = async () => {
    if (isPlaying) {
      pausedAtRef.current = currentTime;
      stopAudio();
      return;
    }
    if (!activeBuffer) return;
    const ctx = audioCtx || new AudioContext();
    if (!audioCtx) setAudioCtx(ctx);
    if (ctx.state === 'suspended') await ctx.resume();

    const src = ctx.createBufferSource();
    src.buffer = activeBuffer;
    src.connect(ctx.destination);
    const offset = pausedAtRef.current;
    src.start(0, offset);
    startTimeRef.current = ctx.currentTime - offset;
    setSourceNode(src);
    setIsPlaying(true);

    timeRef.current = window.setInterval(() => {
      const t = Math.min(ctx.currentTime - startTimeRef.current, dur);
      setCurrentTime(t);
      if (t >= dur - 0.05) {
        clearInterval(timeRef.current);
        setIsPlaying(false);
        setCurrentTime(0);
        pausedAtRef.current = 0;
        setSourceNode(null);
      }
    }, 80);

    src.onended = () => {
      clearInterval(timeRef.current);
      setIsPlaying(false);
      pausedAtRef.current = 0;
      setCurrentTime(0);
      setSourceNode(null);
    };
  };

  // Cleanup al salir
  const handleBack = () => {
    stopAudio();
    onBack();
  };

  // Click en waveform para seek
  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeBuffer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const seekTo = ratio * dur;
    pausedAtRef.current = seekTo;
    setCurrentTime(seekTo);
    if (isPlaying) {
      stopAudio();
      setTimeout(() => { pausedAtRef.current = seekTo; togglePlay(); }, 50);
    }
  };

  const S = {
    page: { minHeight: '100vh', background: '#0D0A14', color: '#F8F0FF', fontFamily: "'Outfit', system-ui, sans-serif" } as React.CSSProperties,
    card: { background: 'rgba(26,16,40,0.9)', border: '1px solid rgba(192,38,211,0.15)', borderRadius: '16px', padding: '20px' } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      {/* TOPBAR */}
      <div style={{ background: 'rgba(13,10,20,0.95)', borderBottom: '1px solid rgba(192,38,211,0.12)', padding: '0 20px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)' }}>
        <button onClick={handleBack} style={{ background: 'none', border: 'none', color: '#9B7EC8', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Volver a la Mezcla
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg,#F59E0B,#EF6C00)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✦</div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#F8F0FF' }}>Master Final</span>
          <span style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '980px', padding: '3px 10px', fontSize: '10px', fontWeight: 700, color: '#F59E0B' }}>✦ -12 LUFS</span>
        </div>
        <button onClick={() => {
          const a = document.createElement('a');
          a.href = masterData.audioUrl; a.download = 'master-mixingmusic.wav'; a.click();
        }} style={{ background: 'linear-gradient(135deg,#F59E0B,#EF6C00)', border: 'none', color: '#fff', padding: '8px 18px', borderRadius: '980px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          ⬇ Descargar Master
        </button>
      </div>

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '32px 20px' }}>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button onClick={() => setActiveTab('master')}
            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${activeTab==='master' ? '#F59E0B' : 'rgba(245,158,11,0.2)'}`, background: activeTab==='master' ? 'rgba(245,158,11,0.1)' : 'transparent', color: activeTab==='master' ? '#F59E0B' : '#9B7EC8', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
            ✦ Master · -12 LUFS
          </button>
          {mixData && (
            <button onClick={() => setActiveTab('mix')}
              style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${activeTab==='mix' ? '#C026D3' : 'rgba(192,38,211,0.2)'}`, background: activeTab==='mix' ? 'rgba(192,38,211,0.08)' : 'transparent', color: activeTab==='mix' ? '#EC4899' : '#9B7EC8', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              Mezcla · -20 LUFS
            </button>
          )}
        </div>

        {/* WAVEFORM + PLAYER */}
        <div style={{ ...S.card, marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#F8F0FF' }}>
                {activeTab === 'master' ? '✦ Master Final' : 'Mezcla Original'}
              </div>
              <div style={{ fontSize: '11px', color: '#9B7EC8', marginTop: '2px' }}>
                {activeTab === 'master' ? 'Procesado con IA · -12 LUFS · WAV 24-bit' : `${mixData?.presetName || 'Custom'} · -20 LUFS`}
              </div>
            </div>
            <span style={{ background: activeTab==='master' ? 'rgba(245,158,11,0.12)' : 'rgba(192,38,211,0.1)', border: `1px solid ${activeTab==='master' ? 'rgba(245,158,11,0.3)' : 'rgba(192,38,211,0.25)'}`, borderRadius: '980px', padding: '4px 12px', fontSize: '11px', fontWeight: 700, color: activeTab==='master' ? '#F59E0B' : '#C026D3' }}>
              {activeTab === 'master' ? '✦ MASTERIZADO' : '🎛️ MEZCLA'}
            </span>
          </div>

          {/* Waveform master */}
          <div style={{ display: activeTab==='master' ? 'block' : 'none', background: 'rgba(8,4,16,0.8)', borderRadius: '10px', padding: '12px', marginBottom: '14px', border: '1px solid rgba(245,158,11,0.12)', cursor: 'pointer' }}>
            <canvas ref={masterCanvasRef} width={1200} height={100}
              style={{ width: '100%', height: '80px', display: 'block', borderRadius: '6px' }}
              onClick={handleWaveformClick} />
          </div>

          {/* Waveform mix */}
          <div style={{ display: activeTab==='mix' ? 'block' : 'none', background: 'rgba(8,4,16,0.8)', borderRadius: '10px', padding: '12px', marginBottom: '14px', border: '1px solid rgba(192,38,211,0.12)', cursor: 'pointer' }}>
            <canvas ref={mixCanvasRef} width={1200} height={100}
              style={{ width: '100%', height: '80px', display: 'block', borderRadius: '6px' }}
              onClick={handleWaveformClick} />
          </div>

          {/* Controles de reproducción */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button onClick={togglePlay}
              style={{ width: '48px', height: '48px', borderRadius: '50%', background: activeTab==='master' ? 'linear-gradient(135deg,#F59E0B,#EF6C00)' : 'linear-gradient(135deg,#EC4899,#C026D3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0, boxShadow: activeTab==='master' ? '0 0 20px rgba(245,158,11,0.4)' : '0 0 20px rgba(192,38,211,0.4)' }}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginBottom: '6px', cursor: 'pointer' }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  const seekTo = ratio * dur;
                  pausedAtRef.current = seekTo;
                  setCurrentTime(seekTo);
                }}>
                <div style={{ height: '100%', width: `${dur > 0 ? (currentTime/dur)*100 : 0}%`, background: activeTab==='master' ? 'linear-gradient(90deg,#F59E0B,#EF6C00)' : 'linear-gradient(90deg,#EC4899,#C026D3)', borderRadius: '2px', transition: 'width 0.08s linear' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9B7EC8', fontFamily: 'monospace' }}>
                <span>{fmt(currentTime)}</span>
                <span>{fmt(dur)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* CADENA DE MASTERING — solo en tab master */}
        {activeTab === 'master' && (
          <div style={{ ...S.card, marginBottom: '20px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#9B7EC8', marginBottom: '12px' }}>Cadena de mastering aplicada</div>
            {CHAIN.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: item.success ? 'rgba(74,222,128,0.08)' : 'rgba(8,4,16,0.4)', borderRadius: '8px', marginBottom: '4px', border: item.success ? '1px solid rgba(74,222,128,0.2)' : '1px solid transparent' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: item.success ? '#4ade80' : '#C9B8F0', flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: '11px', color: item.success ? '#4ade80' : '#9B7EC8', fontFamily: 'monospace' }}>{item.val}</span>
              </div>
            ))}
          </div>
        )}

        {/* BOTÓN DESCARGA GRANDE */}
        <button onClick={() => {
          const a = document.createElement('a');
          a.href = masterData.audioUrl; a.download = 'master-mixingmusic.wav'; a.click();
        }} style={{ width: '100%', background: 'linear-gradient(135deg,#F59E0B,#EF6C00)', border: 'none', color: '#fff', padding: '18px', borderRadius: '16px', fontSize: '16px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 32px rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>⬇</span>
          Descargar Master .WAV — -12 LUFS
        </button>

        <div style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(248,240,255,0.35)', marginTop: '12px' }}>
          ✅ Listo para Spotify · Apple Music · YouTube Music
        </div>
      </div>
    </div>
  );
}
