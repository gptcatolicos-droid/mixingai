import React, { useState, useEffect } from 'react';

interface MixEditorProps {
  stems?: any[];
  user?: any;
  onBack: () => void;
  onExport?: () => void;
}

const COLORS = ['#B07CF0','#E08254','#D9C566','#4FD4D4','#6DCE7A','#5B9BF4','#E07AB6'];
const TRACKS = [
  { id: 1, name: '1 - Intro Left', vol: -6.0, pan: -10 },
  { id: 2, name: '2 - Intro Right', vol: -3.2, pan: -10 },
  { id: 3, name: '3 - Guitar Left', vol: -8.1, pan: 0 },
  { id: 4, name: '4 - Guitar Right', vol: -1.8, pan: 0 },
  { id: 5, name: '5 - Armonico', vol: -4.8, pan: 30 },
];

export default function MixEditor({ onBack, onExport }: MixEditorProps) {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(46.03);
  const [selected, setSelected] = useState(2);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setTime(t => t + 1/60);
    }, 16);
    return () => clearInterval(interval);
  }, [playing]);

  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);

  return (
    <div style={{ background: '#0a0612', color: '#F8F0FF', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>
      {/* Top Bar */}
      <div style={{ background: 'rgba(8,4,16,0.9)', borderBottom: '1px solid rgba(192,38,211,0.1)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#F5F7FA', fontSize: '18px', cursor: 'pointer' }}>←</button>
          <div style={{ fontSize: '14px', fontWeight: 600 }}>MixingStudio AI</div>
        </div>
        <button onClick={onExport} style={{ padding: '8px 20px', background: 'linear-gradient(135deg,#EC4899,#C026D3)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>✦ Exportar</button>
      </div>

      {/* Transport */}
      <div style={{ background: 'rgba(8,4,16,0.8)', borderBottom: '1px solid rgba(192,38,211,0.1)', padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <button onClick={() => setPlaying(!playing)} style={{ background: 'rgba(192,38,211,0.2)', border: '1px solid rgba(192,38,211,0.4)', borderRadius: '6px', padding: '8px 16px', color: '#EC4899', cursor: 'pointer', fontSize: '13px' }}>
          {playing ? '⏸' : '▶'} {playing ? 'Pausa' : 'Play'}
        </button>
        <div style={{ fontSize: '13px', color: '#9B7EC8', fontFamily: 'monospace' }}>{mins}:{secs.toString().padStart(2, '0')}</div>
        <div style={{ flex: 1, height: '4px', background: 'rgba(192,38,211,0.1)', borderRadius: '2px', position: 'relative' }}>
          <div style={{ height: '100%', width: `${(time / 120) * 100}%`, background: 'linear-gradient(90deg,#EC4899,#C026D3)', borderRadius: '2px' }} />
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', overflow: 'hidden' }}>
        {/* Workspace */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'auto', background: 'rgba(8,4,16,0.3)' }}>
          {/* Presets */}
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(192,38,211,0.1)', background: 'rgba(8,4,16,0.6)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9B7EC8', marginBottom: '12px' }}>PRESETS — TOCA PARA APLICAR</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(90px,1fr))', gap: '10px' }}>
              {['Pop', 'Rock', 'Hip Hop', 'Reggaeton', 'Dance/EDM', 'Clásica', 'Balada', 'Acústico', 'Gospel'].map((preset, i) => (
                <button key={preset} style={{ padding: '12px 8px', background: i === 0 ? 'rgba(192,38,211,0.25)' : 'rgba(26,16,40,0.8)', border: `1px solid ${i === 0 ? 'rgba(192,38,211,0.5)' : 'rgba(192,38,211,0.2)'}`, borderRadius: '8px', color: i === 0 ? '#EC4899' : '#9B7EC8', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '100%', height: '28px', background: `linear-gradient(180deg, ${COLORS[i % COLORS.length]}, transparent)`, borderRadius: '3px' }} />
                  <span>{preset}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mix Bus Master */}
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(192,38,211,0.1)', background: 'rgba(26,16,40,0.4)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#F5F7FA', marginBottom: '16px' }}>🎛️ MIX BUS MASTER</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              {[
                { label: 'Bass', band: 'Bass' },
                { label: 'Mid', band: 'Mid' },
                { label: 'High', band: 'High' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '10px', color: '#9B7EC8', marginBottom: '8px' }}>{item.label}</div>
                  <div style={{ height: '60px', background: 'rgba(192,38,211,0.1)', borderRadius: '4px' }} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: '10px', color: '#9B7EC8', marginBottom: '8px' }}>LUFS</div>
                <div style={{ background: 'rgba(192,38,211,0.1)', borderRadius: '4px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#4ade80' }}>-16.0</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tracks */}
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '16px' }}>
              {TRACKS.map((track, idx) => (
                <div key={track.id} onClick={() => setSelected(idx)} style={{ background: idx === selected ? 'rgba(192,38,211,0.15)' : 'rgba(26,16,40,0.7)', border: `2px solid ${idx === selected ? 'rgba(192,38,211,0.5)' : 'rgba(192,38,211,0.2)'}`, borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: COLORS[idx % COLORS.length] }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#F5F7FA' }}>{track.name}</div>
                      <div style={{ fontSize: '11px', color: '#9B7EC8' }}>WAV · 24bit</div>
                    </div>
                  </div>
                  <div style={{ height: '40px', background: 'rgba(192,38,211,0.1)', borderRadius: '4px', marginBottom: '12px' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px' }}>
                    <div>
                      <div style={{ color: '#9B7EC8', marginBottom: '4px' }}>Vol</div>
                      <div style={{ color: COLORS[idx % COLORS.length], fontWeight: 600 }}>{track.vol} dB</div>
                    </div>
                    <div>
                      <div style={{ color: '#9B7EC8', marginBottom: '4px' }}>Pan</div>
                      <div style={{ color: '#9B7EC8', fontWeight: 600 }}>{track.pan > 0 ? 'R' : track.pan < 0 ? 'L' : 'C'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ background: 'rgba(8,4,16,0.8)', borderLeft: '1px solid rgba(192,38,211,0.1)', padding: '20px', overflowY: 'auto' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#9B7EC8', marginBottom: '16px' }}>CONTROL RÁPIDO</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {['EQ', 'Reverb', 'Delay', 'Master'].map(item => (
              <button key={item} style={{ padding: '10px 12px', background: 'rgba(192,38,211,0.15)', border: '1px solid rgba(192,38,211,0.3)', borderRadius: '8px', color: '#EC4899', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
