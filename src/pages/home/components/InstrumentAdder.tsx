import { useState } from 'react';

interface User { id: string; firstName: string; credits: number; }

interface InstrumentAdderProps {
  user: User;
  onBack: () => void;
  onCreditsUpdate: (n: number) => void;
  onInstrumentReady?: (file: File, name: string) => void;
}

const T = {
  surface: 'rgba(26,16,40,0.82)',
  surface2: 'rgba(35,20,55,0.5)',
  text: '#F8F0FF',
  text2: 'rgba(248,240,255,0.65)',
  text3: 'rgba(248,240,255,0.38)',
  pink: '#EC4899',
  fuchsia: '#C026D3',
  violet: '#7C3AED',
  border: 'rgba(192,38,211,0.18)',
  green: '#4ade80',
};

const INSTRUMENTS = [
  { id:'drums',   icon:'🥁', label:'Batería',      color:'#10B981', desc:'Kick, snare, hi-hats, percusión',    gradient:'linear-gradient(135deg,#065F46,#10B981)' },
  { id:'bass',    icon:'🎸', label:'Bajo',          color:'#F97316', desc:'Bajo eléctrico, 808, sub bass',      gradient:'linear-gradient(135deg,#7C2D12,#F97316)' },
  { id:'piano',   icon:'🎹', label:'Piano',         color:'#3B82F6', desc:'Acústico, eléctrico, Rhodes',        gradient:'linear-gradient(135deg,#1E3A8A,#3B82F6)' },
  { id:'guitar',  icon:'🎸', label:'Guitarra',      color:'#FBBF24', desc:'Eléctrica, acústica, distorsión',    gradient:'linear-gradient(135deg,#78350F,#FBBF24)' },
  { id:'strings', icon:'🎻', label:'Cuerdas',       color:'#A78BFA', desc:'Violín, viola, cello, orquesta',     gradient:'linear-gradient(135deg,#4C1D95,#A78BFA)' },
  { id:'brass',   icon:'🎺', label:'Vientos',       color:'#F472B6', desc:'Trompeta, saxo, trombón',            gradient:'linear-gradient(135deg,#831843,#F472B6)' },
  { id:'synth',   icon:'🎛️', label:'Sintetizador',  color:'#6366F1', desc:'Lead synth, pad, arpeggio',          gradient:'linear-gradient(135deg,#312E81,#6366F1)' },
  { id:'choir',   icon:'🎤', label:'Coro / Voz',    color:'#EC4899', desc:'Voces de fondo, harmonías',          gradient:'linear-gradient(135deg,#9D174D,#EC4899)' },
  { id:'organ',   icon:'🎹', label:'Órgano',        color:'#8B5CF6', desc:'Hammond, iglesia, jazz',             gradient:'linear-gradient(135deg,#4C1D95,#8B5CF6)' },
  { id:'marimba', icon:'🪘', label:'Percusión',     color:'#14B8A6', desc:'Marimba, xilófono, timbal',          gradient:'linear-gradient(135deg,#134E4A,#14B8A6)' },
  { id:'fx',      icon:'✦',  label:'FX / Texturas', color:'#94A3B8', desc:'Efectos, ambientes, transiciones',   gradient:'linear-gradient(135deg,#1E293B,#94A3B8)' },
  { id:'flute',   icon:'🎷', label:'Flauta / Saxo', color:'#34D399', desc:'Flauta travesera, saxofón, clarinete',gradient:'linear-gradient(135deg,#064E3B,#34D399)' },
];

const STYLE_PRESETS = [
  'Suave y melódico', 'Agresivo y distorsionado', 'Minimalista',
  'Funk y groove', 'Jazz y swing', 'Clásico y orquestal',
  'Electrónico y sintético', 'Acústico y natural', 'Reggaetón y urbano',
];

export default function InstrumentAdder({ user, onBack, onCreditsUpdate, onInstrumentReady }: InstrumentAdderProps) {
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null);
  const [stylePrompt, setStylePrompt] = useState('');
  const [stylePreset, setStylePreset] = useState('');
  const [duration, setDuration] = useState(60);
  const [bpm, setBpm] = useState(120);
  const [key, setKey] = useState('C');
  const [phase, setPhase] = useState<'idle'|'generating'|'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [resultName, setResultName] = useState('');
  const [error, setError] = useState('');

  const instr = INSTRUMENTS.find(i => i.id === selectedInstrument);

  const handleGenerate = () => {
    if (!selectedInstrument) { setError('Selecciona un instrumento primero'); return; }
    if (!stylePrompt.trim() && !stylePreset) { setError('Describe el estilo o elige un preset'); return; }
    if (user.credits < 5) { setError(`Necesitas 5 créditos. Tienes ${user.credits}.`); return; }
    setError('');

    const name = `${instr!.label} · ${(stylePrompt || stylePreset).slice(0,30)}`;
    setResultName(name);

    const steps = [
      { pct:15,  text:`Configurando ${instr!.label}…`,      delay:600 },
      { pct:35,  text:'Generando notas y ritmo…',            delay:1200 },
      { pct:60,  text:'Sintetizando timbre y textura…',      delay:1400 },
      { pct:80,  text:'Aplicando dinámica y efectos…',       delay:900 },
      { pct:95,  text:'Exportando stem WAV…',                delay:700 },
      { pct:100, text:'¡Instrumento listo!',                 delay:300 },
    ];

    setPhase('generating');
    let i = 0;
    const run = () => {
      if (i >= steps.length) {
        setPhase('done');
        onCreditsUpdate(user.credits - 5);
        return;
      }
      setProgress(steps[i].pct);
      setProgressText(steps[i].text);
      setTimeout(run, steps[i].delay);
      i++;
    };
    run();
  };

  const S = {
    page: { minHeight:'100vh', background:'transparent', fontFamily:"'DM Sans',system-ui,sans-serif", color:T.text, paddingBottom:'60px' } as React.CSSProperties,
    card: { background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'24px' } as React.CSSProperties,
    label: { fontSize:'10px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase' as const, color:'#9B7EC8', marginBottom:'10px', display:'block' } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ background:'rgba(10,6,18,0.85)', borderBottom:`0.5px solid ${T.border}`, padding:'0 24px', height:'52px', display:'flex', alignItems:'center', gap:'16px', backdropFilter:'blur(20px)' }}>
        <button onClick={onBack} style={{ background:'none', border:`0.5px solid ${T.border}`, color:T.text2, padding:'6px 14px', borderRadius:'8px', cursor:'pointer', fontFamily:'inherit', fontSize:'13px' }}>
          ← Volver
        </button>
        <div style={{ fontSize:'14px', fontWeight:600, color:T.text }}>Agregar instrumento con IA</div>
        <div style={{ marginLeft:'auto', background:'rgba(192,38,211,0.1)', border:`1px solid ${T.border}`, borderRadius:'8px', padding:'4px 12px', fontSize:'12px', color:'#9B7EC8' }}>
          <span style={{ color:T.pink, fontWeight:700 }}>{user.credits}</span> créditos · 5 por instrumento
        </div>
      </div>

      <div style={{ maxWidth:'760px', margin:'0 auto', padding:'40px 20px' }}>

        <div style={{ textAlign:'center', marginBottom:'36px' }}>
          <div style={{ fontSize:'36px', marginBottom:'8px' }}>🎹</div>
          <h1 style={{ fontSize:'clamp(24px,4vw,36px)', fontWeight:800, letterSpacing:'-0.8px', marginBottom:'10px', lineHeight:1.1 }}>
            Agregar instrumentos con IA
          </h1>
          <p style={{ color:T.text2, fontSize:'15px', lineHeight:1.6 }}>
            Elige el instrumento, describe el estilo y la IA genera<br/>
            el stem listo para agregar a tu proyecto en el DAW.
          </p>
        </div>

        {phase === 'idle' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

            {/* Instrument grid */}
            <div style={S.card}>
              <span style={S.label}>Elige el instrumento</span>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:'10px' }}>
                {INSTRUMENTS.map(inst => (
                  <button key={inst.id} onClick={() => { setSelectedInstrument(inst.id); setError(''); }}
                    style={{ background: selectedInstrument===inst.id ? `${inst.color}20` : 'rgba(255,255,255,0.03)', border: `1.5px solid ${selectedInstrument===inst.id ? inst.color : T.border}`, borderRadius:'14px', padding:'18px 12px', cursor:'pointer', textAlign:'center', fontFamily:'inherit', transition:'all 0.18s', position:'relative', overflow:'hidden' }}
                    onMouseEnter={e => { if(selectedInstrument!==inst.id){(e.currentTarget as HTMLElement).style.borderColor=inst.color+'66';(e.currentTarget as HTMLElement).style.background=inst.color+'10';} }}
                    onMouseLeave={e => { if(selectedInstrument!==inst.id){(e.currentTarget as HTMLElement).style.borderColor=T.border;(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)';} }}>
                    {selectedInstrument===inst.id && (
                      <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:inst.gradient }}></div>
                    )}
                    {/* Icono con fondo de color */}
                    <div style={{ width:'44px', height:'44px', borderRadius:'12px', background: selectedInstrument===inst.id ? inst.gradient : `${inst.color}18`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px', fontSize:'20px', transition:'all 0.18s' }}>
                      {inst.icon}
                    </div>
                    <div style={{ fontSize:'12px', fontWeight:700, color: selectedInstrument===inst.id ? inst.color : T.text, marginBottom:'3px' }}>{inst.label}</div>
                    <div style={{ fontSize:'10px', color: selectedInstrument===inst.id ? inst.color+'99' : T.text3, lineHeight:1.4 }}>{inst.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div style={S.card}>
              <span style={S.label}>Describe el estilo</span>
              <textarea
                value={stylePrompt}
                onChange={e => setStylePrompt(e.target.value)}
                placeholder={instr ? `Describe cómo quieres que suene el ${instr.label}. Ej: "${instr.label} suave con mucho sustain, estilo pop balada, notas largas"` : 'Primero elige un instrumento arriba…'}
                rows={3}
                disabled={!selectedInstrument}
                style={{ width:'100%', background:'rgba(8,4,16,0.6)', border:`1px solid ${T.border}`, borderRadius:'10px', padding:'12px 14px', color:T.text, fontSize:'14px', fontFamily:'inherit', outline:'none', lineHeight:1.5, resize:'vertical', opacity: selectedInstrument ? 1 : 0.4 }}
              />
              {/* Style presets */}
              {selectedInstrument && (
                <div style={{ marginTop:'10px' }}>
                  <div style={{ fontSize:'11px', color:T.text3, marginBottom:'6px' }}>O elige un estilo rápido:</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                    {STYLE_PRESETS.map(sp => (
                      <button key={sp} onClick={() => { setStylePreset(sp); if(!stylePrompt) setStylePrompt(sp); }}
                        style={{ padding:'5px 12px', borderRadius:'980px', fontSize:'11px', fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                          background: stylePreset===sp ? 'rgba(192,38,211,0.2)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${stylePreset===sp ? T.fuchsia : 'rgba(255,255,255,0.08)'}`,
                          color: stylePreset===sp ? T.pink : T.text2,
                        }}>
                        {sp}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Technical params */}
            {selectedInstrument && (
              <div style={{ ...S.card }}>
                <span style={S.label}>Parámetros técnicos</span>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px' }}>
                  {/* Duration */}
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:T.text2, marginBottom:'8px' }}>
                      <span>Duración</span>
                      <span style={{ color:T.pink, fontWeight:700, fontFamily:'monospace' }}>{duration}s</span>
                    </div>
                    <input type="range" min={15} max={300} step={15} value={duration} onChange={e=>setDuration(Number(e.target.value))}
                      style={{ width:'100%', accentColor:T.fuchsia, cursor:'pointer' }} />
                  </div>
                  {/* BPM */}
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:T.text2, marginBottom:'8px' }}>
                      <span>BPM</span>
                      <span style={{ color:T.pink, fontWeight:700, fontFamily:'monospace' }}>{bpm}</span>
                    </div>
                    <input type="range" min={60} max={200} step={1} value={bpm} onChange={e=>setBpm(Number(e.target.value))}
                      style={{ width:'100%', accentColor:T.fuchsia, cursor:'pointer' }} />
                  </div>
                  {/* Key */}
                  <div>
                    <div style={{ fontSize:'12px', color:T.text2, marginBottom:'8px' }}>Tonalidad</div>
                    <select value={key} onChange={e=>setKey(e.target.value)}
                      style={{ width:'100%', background:'rgba(8,4,16,0.6)', border:`1px solid ${T.border}`, borderRadius:'8px', padding:'8px 10px', color:T.text, fontSize:'13px', fontFamily:'inherit', cursor:'pointer', outline:'none' }}>
                      {['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].map(k => (
                        <option key={k} value={k}>{k} Mayor</option>
                      ))}
                      {['Cm','C#m','Dm','D#m','Em','Fm','F#m','Gm','G#m','Am','A#m','Bm'].map(k => (
                        <option key={k} value={k}>{k.replace('m',' Menor')}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:'10px', padding:'12px 16px', fontSize:'13px', color:'#f87171' }}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={handleGenerate} disabled={!selectedInstrument}
              style={{ width:'100%', background: selectedInstrument ? 'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)' : 'rgba(255,255,255,0.05)', border:'none', color:'#fff', padding:'18px', borderRadius:'14px', fontSize:'16px', fontWeight:800, cursor: selectedInstrument ? 'pointer' : 'not-allowed', fontFamily:'inherit', boxShadow: selectedInstrument ? '0 0 32px rgba(192,38,211,0.5)' : 'none', opacity: selectedInstrument ? 1 : 0.4 }}>
              🎹 Generar {instr?.label || 'instrumento'} — 5 créditos
            </button>
          </div>
        )}

        {/* Generating */}
        {phase === 'generating' && (
          <div style={{ ...S.card, textAlign:'center', padding:'56px 32px', maxWidth:'460px', margin:'0 auto' }}>
            <div style={{ width:'80px', height:'80px', margin:'0 auto 24px', background:`linear-gradient(135deg,${instr?.color||'#EC4899'},${instr?.color||'#C026D3'}88)`, borderRadius:'22px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'36px', boxShadow:`0 0 40px ${instr?.color||'#C026D3'}44` }}>
              {instr?.icon || '🎹'}
            </div>
            <h3 style={{ fontSize:'22px', fontWeight:800, color:T.text, marginBottom:'8px' }}>
              Generando {instr?.label}…
            </h3>
            <p style={{ fontSize:'13px', color:T.text2, marginBottom:'28px' }}>{progressText}</p>
            <div style={{ background:'rgba(8,4,16,0.6)', borderRadius:'10px', height:'8px', overflow:'hidden', marginBottom:'10px' }}>
              <div style={{ height:'100%', background:`linear-gradient(90deg,${instr?.color||'#EC4899'},#C026D3)`, borderRadius:'10px', width:`${progress}%`, transition:'width 0.5s ease' }}></div>
            </div>
            <div style={{ fontFamily:"'DM Mono',monospace", color:instr?.color||T.fuchsia, fontWeight:700, fontSize:'16px' }}>{progress}%</div>
          </div>
        )}

        {/* Done */}
        {phase === 'done' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <div style={{ ...S.card, borderColor:`${instr?.color||T.fuchsia}44`, textAlign:'center', padding:'32px' }}>
              <div style={{ fontSize:'32px', marginBottom:'10px' }}>✅</div>
              <h3 style={{ fontSize:'20px', fontWeight:800, color:T.text, marginBottom:'6px' }}>¡{instr?.label} listo!</h3>
              <p style={{ fontSize:'13px', color:T.text2, marginBottom:'20px' }}>"{resultName}"</p>

              {/* Mini waveform */}
              <div style={{ height:'48px', display:'flex', alignItems:'center', gap:'2px', justifyContent:'center', marginBottom:'20px' }}>
                {Array.from({length:32}).map((_,j) => (
                  <div key={j} style={{ width:'4px', borderRadius:'2px', background:instr?.color||T.pink, height:`${20+Math.sin(j*0.4)*40+Math.random()*30}%`, opacity:0.7 }}></div>
                ))}
              </div>

              <div style={{ display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap' }}>
                <button style={{ background:`${instr?.color||T.fuchsia}22`, border:`1px solid ${instr?.color||T.border}44`, color:instr?.color||T.pink, borderRadius:'10px', padding:'10px 20px', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  ▶ Escuchar preview
                </button>
                {onInstrumentReady && (
                  <button onClick={() => onInstrumentReady(new File([], `${instr?.label}.wav`), instr?.label||'Instrumento')}
                    style={{ background:'linear-gradient(135deg,#EC4899,#C026D3)', border:'none', color:'#fff', borderRadius:'10px', padding:'10px 20px', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                    🎛️ Agregar al DAW
                  </button>
                )}
                <button style={{ background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.2)', color:T.green, borderRadius:'10px', padding:'10px 20px', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  ⬇ Descargar WAV
                </button>
              </div>
            </div>

            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => { setPhase('idle'); setSelectedInstrument(null); setStylePrompt(''); setStylePreset(''); }}
                style={{ flex:1, background:'transparent', border:`1px solid ${T.border}`, color:T.text2, padding:'14px', borderRadius:'14px', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Agregar otro instrumento
              </button>
              <button onClick={onBack}
                style={{ flex:1, background:'linear-gradient(135deg,#EC4899,#C026D3)', border:'none', color:'#fff', padding:'14px', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Volver al menú
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
