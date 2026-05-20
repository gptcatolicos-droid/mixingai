import React from 'react';

interface MixerHeaderProps {
  stems: number;
  duration: string;
  preset: string;
  onExport: () => void;
  onBack: () => void;
  disabled?: boolean;
}

export function MixerHeader({ stems, duration, preset, onExport, onBack, disabled }: MixerHeaderProps) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      background: 'rgba(26,16,40,0.82)',
      borderBottom: '1px solid rgba(192,38,211,0.18)',
      borderRadius: '12px',
      marginBottom: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #D946EF, #A855F7)',
          boxShadow: '0 8px 24px rgba(217,70,239,0.35)',
        }}>
          <span style={{ fontSize: '20px' }}>✨</span>
        </div>
        
        <div>
          <h1 style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#F8F0FF',
            background: 'linear-gradient(135deg, #D946EF, #A855F7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0 0 4px 0',
          }}>
            MixingStudio AI
          </h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#9B7EC8',
          }}>
            <span>📦 {stems} stems</span>
            <span>•</span>
            <span>⏱️ {duration}</span>
            <span>•</span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '999px',
              border: '1px solid rgba(217,70,239,0.3)',
              background: 'rgba(217,70,239,0.14)',
              color: '#F0C8FB',
              fontSize: '11px',
              fontWeight: 600,
            }}>
              ✨ {preset}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onExport}
          disabled={disabled}
          style={{
            padding: '10px 20px',
            background: disabled ? '#241636' : 'linear-gradient(135deg, #EC4899, #C026D3)',
            border: 'none',
            color: '#fff',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxShadow: disabled ? 'none' : '0 0 28px rgba(192,38,211,0.6)',
            opacity: disabled ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>✦</span> Exportar con IA
        </button>

        <button
          onClick={onBack}
          style={{
            padding: '10px 16px',
            background: 'rgba(192,38,211,0.1)',
            border: '1px solid rgba(192,38,211,0.25)',
            color: '#9B7EC8',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>←</span> Volver
        </button>
      </div>
    </header>
  );
}
