import React, { useState, useEffect, useRef } from 'react';
import { MixerHeader } from './MixerHeader';
import { MixPreset, PRESETS } from './PresetScreen';

interface Track {
  id: number;
  name: string;
  volume: number;
  pan: number;
  solo: boolean;
  mute: boolean;
  color: string;
  waveformData: number[];
}

interface MixerClaudeDesignProps {
  projectId: string;
  uploadedFiles: File[];
  onBack: () => void;
  onExport: (data: any) => void;
  initialPreset: MixPreset;
}

const TRACK_COLORS = [
  '#E36AB0', '#6DCE7A', '#E08254', '#5B9BF4',
  '#D9C566', '#B07CF0', '#4FD4D4', '#7C3AED'
];

const PRESETS_VISUAL = PRESETS.map((p, i) => ({
  ...p,
  color: TRACK_COLORS[i % TRACK_COLORS.length],
  icon: ['🎵', '🎸', '🔊', '🎤', '🎹', '🥁', '🎷', '🎺', '✨'][i % 9]
}));

// Generate pseudo-random waveform for visualization
function generateWaveform(seed: number, length = 100): number[] {
  const data: number[] = [];
  for (let i = 0; i < length; i++) {
    const x = i / length;
    const wave = Math.sin(x * Math.PI * 2 * 3 + seed) * 0.4 +
                 Math.sin(x * Math.PI * 5 + seed * 2) * 0.3 +
                 Math.random() * 0.3;
    data.push(Math.abs(wave));
  }
  return data;
}

function Waveform({ data, color, height = 60 }: any) {
  const svg = useRef<SVGSVGElement>(null);

  return (
    <svg
      ref={svg}
      width="100%"
      height={height}
      viewBox={`0 0 ${data.length} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="0.1" />
        </linearGradient>
      </defs>
      
      <path
        d={`M 0 ${height / 2} ${data
          .map((v: number, i: number) => `L ${i} ${(height / 2) - v * (height / 2)}`)
          .join(' ')}`}
        stroke={color}
        strokeWidth="0.5"
        fill="none"
      />
      
      <path
        d={`M 0 ${height / 2} ${data
          .map((v: number, i: number) => `L ${i} ${(height / 2) + v * (height / 2)}`)
          .join(' ')} L ${data.length} ${height / 2} Z`}
        fill={`url(#grad-${color})`}
      />
    </svg>
  );
}

function TrackStrip({ track, isSelected, onSelect, onVolumeChange, onPanChange }: any) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: '12px',
        background: isSelected ? 'rgba(217,70,239,0.2)' : 'rgba(26,16,40,0.5)',
        border: isSelected ? '2px solid #D946EF' : '1px solid rgba(192,38,211,0.15)',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        minHeight: '180px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{
        height: '80px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '8px',
        border: `2px solid ${track.color}`,
        overflow: 'hidden',
      }}>
        <Waveform data={track.waveformData} color={track.color} height={80} />
      </div>

      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#F8F0FF', marginBottom: '4px' }}>
          {track.name}
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', color: '#9B7EC8', marginBottom: '4px' }}>VOLUME</div>
          <input
            type="range"
            min="-48"
            max="12"
            value={track.volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: '4px',
              background: 'linear-gradient(90deg, #D946EF, #A855F7)',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
          />
          <div style={{ fontSize: '10px', color: '#9B7EC8', marginTop: '2px' }}>
            {track.volume.toFixed(1)} dB
          </div>
        </div>

        <div>
          <div style={{ fontSize: '10px', color: '#9B7EC8', marginBottom: '4px' }}>PAN</div>
          <input
            type="range"
            min="-100"
            max="100"
            value={track.pan}
            onChange={(e) => onPanChange(parseFloat(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: '4px',
              background: 'linear-gradient(90deg, #A855F7, #D946EF)',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
          />
          <div style={{ fontSize: '10px', color: '#9B7EC8', marginTop: '2px' }}>
            {track.pan > 0 ? `R ${track.pan}` : track.pan < 0 ? `L ${Math.abs(track.pan)}` : 'C'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
        <button
          onClick={(e) => { e.stopPropagation(); }}
          style={{
            flex: 1,
            padding: '6px',
            background: track.solo ? '#D9C566' : 'rgba(217,70,239,0.1)',
            color: track.solo ? '#000' : '#9B7EC8',
            border: 'none',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          S
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); }}
          style={{
            flex: 1,
            padding: '6px',
            background: track.mute ? '#F4564B' : 'rgba(217,70,239,0.1)',
            color: track.mute ? '#fff' : '#9B7EC8',
            border: 'none',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          M
        </button>
      </div>
    </div>
  );
}

function PresetGrid({ selectedPreset, onSelectPreset }: any) {
  return (
    <div style={{
      background: 'rgba(26,16,40,0.5)',
      border: '1px solid rgba(192,38,211,0.15)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
    }}>
      <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#F8F0FF', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Presets de Género
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '8px',
      }}>
        {PRESETS_VISUAL.map((preset, i) => (
          <button
            key={preset.id}
            onClick={() => onSelectPreset(preset)}
            style={{
              padding: '12px 8px',
              background: selectedPreset?.id === preset.id ? 'linear-gradient(135deg, #D946EF, #A855F7)' : 'rgba(217,70,239,0.1)',
              border: selectedPreset?.id === preset.id ? '2px solid #D946EF' : '1px solid rgba(192,38,211,0.2)',
              borderRadius: '10px',
              color: selectedPreset?.id === preset.id ? '#fff' : '#F8F0FF',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '18px' }}>{preset.icon}</span>
            <span>{preset.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EQSection({ selectedPreset }: any) {
  const [eqBands] = useState([
    { freq: '60Hz', label: 'Bass', value: 0 },
    { freq: '1kHz', label: 'Mid', value: 0 },
    { freq: '12kHz', label: 'Treble', value: 0 },
  ]);

  return (
    <div style={{
      background: 'rgba(26,16,40,0.5)',
      border: '1px solid rgba(192,38,211,0.15)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
    }}>
      <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#F8F0FF', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Master EQ - {selectedPreset?.name || 'Pop'}
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
      }}>
        {eqBands.map((band, i) => (
          <div key={i}>
            <div style={{ fontSize: '10px', color: '#9B7EC8', marginBottom: '8px' }}>
              {band.label} ({band.freq})
            </div>
            <input
              type="range"
              min="-12"
              max="12"
              defaultValue="0"
              style={{
                width: '100%',
                height: '4px',
                background: 'linear-gradient(90deg, #D946EF, #A855F7)',
                borderRadius: '2px',
                cursor: 'pointer',
              }}
            />
            <div style={{ fontSize: '10px', color: '#9B7EC8', marginTop: '4px', textAlign: 'center' }}>
              0 dB
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LUFSMeter({ value = -14 }: any) {
  return (
    <div style={{
      background: 'rgba(26,16,40,0.5)',
      border: '1px solid rgba(192,38,211,0.15)',
      borderRadius: '12px',
      padding: '16px',
    }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#F8F0FF', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        Loudness Meter
      </div>
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, rgba(217,70,239,0.1), rgba(168,85,247,0.1))',
        borderRadius: '10px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '32px', fontWeight: 900, color: '#D946EF', marginBottom: '8px' }}>
          {value} LUFS
        </div>
        <div style={{ fontSize: '12px', color: '#9B7EC8' }}>
          Spotify: -10 LUFS · YouTube: -13 LUFS
        </div>
      </div>
    </div>
  );
}

export default function MixerClaudeDesign(props: MixerClaudeDesignProps) {
  const [tracks, setTracks] = useState<Track[]>(
    props.uploadedFiles.map((file, i) => ({
      id: i,
      name: file.name.replace(/\.[^/.]+$/, ''),
      volume: -6,
      pan: 0,
      solo: false,
      mute: false,
      color: TRACK_COLORS[i % TRACK_COLORS.length],
      waveformData: generateWaveform(i),
    }))
  );

  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(0);
  const [selectedPreset, setSelectedPreset] = useState(props.initialPreset);

  const handleTrackVolumeChange = (id: number, volume: number) => {
    setTracks(tracks.map(t => t.id === id ? { ...t, volume } : t));
  };

  const handleTrackPanChange = (id: number, pan: number) => {
    setTracks(tracks.map(t => t.id === id ? { ...t, pan } : t));
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0612 0%, #0F0A1A 100%)',
      padding: '20px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#F8F0FF',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <MixerHeader
          stems={tracks.length}
          duration="0:00"
          preset={selectedPreset.name}
          onExport={() => props.onExport({ audioUrl: '', audioBuffer: null, waveformPeaks: new Float32Array(), finalLufs: -14, presetName: selectedPreset.name })}
          onBack={props.onBack}
          disabled={tracks.length === 0}
        />

        <PresetGrid selectedPreset={selectedPreset} onSelectPreset={setSelectedPreset} />
        
        <EQSection selectedPreset={selectedPreset} />
        
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#F8F0FF', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Stems ({tracks.length} / 12)
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px',
          }}>
            {tracks.map(track => (
              <TrackStrip
                key={track.id}
                track={track}
                isSelected={selectedTrackId === track.id}
                onSelect={() => setSelectedTrackId(track.id)}
                onVolumeChange={(v: number) => handleTrackVolumeChange(track.id, v)}
                onPanChange={(p: number) => handleTrackPanChange(track.id, p)}
              />
            ))}
          </div>
        </div>

        <LUFSMeter value={-14} />
      </div>
    </div>
  );
}
