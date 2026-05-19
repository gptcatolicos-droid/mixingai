/* global React, ReactDOM */
const { useState, useEffect, useRef, useMemo } = React;

/* ═══════════════════════════════════════════════════════════════════════
   Icons
   ═══════════════════════════════════════════════════════════════════════ */
const SVG = ({ children, size = 16, stroke = 1.7 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

const I = {
  spark:  <SVG>{<><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></>}</SVG>,
  arrow:  <SVG><path d="M15 18l-6-6 6-6"/></SVG>,
  list:   <SVG><path d="M4 6h16M4 12h16M4 18h16"/></SVG>,
  guitar: <SVG><path d="M14 3l7 7-3 3-1-1-2 2 1 1-3 3a4 4 0 11-4-4l3-3 1 1 2-2-1-1z"/></SVG>,
  bass:   <SVG>{<><path d="M14 3l7 7-3 3-1-1-2 2 1 1-3 3a4 4 0 11-4-4l3-3 1 1 2-2-1-1z"/><circle cx="9" cy="15" r="0.8" fill="currentColor"/></>}</SVG>,
  mic:    <SVG>{<><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></>}</SVG>,
  note:   <SVG>{<><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>}</SVG>,
  eq:     <SVG>{<><path d="M4 14v6M4 4v6"/><path d="M12 18v2M12 4v8"/><path d="M20 10v10M20 4v2"/><circle cx="4" cy="12" r="1.5"/><circle cx="12" cy="16" r="1.5"/><circle cx="20" cy="8" r="1.5"/></>}</SVG>,
  plug:   <SVG>{<><path d="M9 3v4M15 3v4M5 7h14v6a5 5 0 01-5 5h-4a5 5 0 01-5-5V7z"/></>}</SVG>,
  x:      <SVG><path d="M18 6L6 18M6 6l12 12"/></SVG>,
  check:  <SVG><polyline points="4 12 10 18 20 6"/></SVG>,
  reverb: <SVG>{<><circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="6" opacity="0.4"/><circle cx="12" cy="12" r="10" opacity="0.2"/></>}</SVG>,
  comp:   <SVG><path d="M3 12h4l3-9 4 18 3-9h4"/></SVG>,
  delay:  <SVG>{<><path d="M12 8v8M8 12h8"/><circle cx="12" cy="12" r="9"/></>}</SVG>,
  dist:   <SVG><path d="M3 12h2l1-3 2 6 2-6 1 3h2M15 9l3 3-3 3M21 12h-3"/></SVG>,
  chorus: <SVG>{<><path d="M4 12c0-2 1-4 3-4s3 2 3 4-1 4-3 4-3-2-3-4z"/><path d="M14 12c0-2 1-4 3-4s3 2 3 4-1 4-3 4-3-2-3-4z"/></>}</SVG>,
};

/* ═══════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════ */
function seeded(seed) { 
  let s = seed; 
  return () => { s = (s*9301+49297)%233280; return s/233280; }; 
}

function makeWave(seed, n=400, density=0.6) {
  const rnd = seeded(seed); 
  const out = new Array(n); 
  let env=0;
  for (let i=0;i<n;i++) {
    const t = (Math.sin(i/9+seed)*0.4+0.6)*density;
    env += (t-env)*0.18;
    const v = Math.abs(env + (rnd()-0.5)*0.9*env);
    out[i] = Math.max(0.04, Math.min(1, v));
  }
  for (let i=0;i<10;i++) { 
    out[i]*=i/10; 
    out[n-1-i]*=i/10; 
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════
   Header
   ═══════════════════════════════════════════════════════════════════════ */
function Header() {
  return (
    <header className="studio-header">
      <div className="brand">
        <div className="brand-mark">{I.spark}</div>
        <div className="brand-text">
          <div className="brand-name">MixingStudio AI</div>
          <div className="brand-sub">
            <span>14 stems</span>
            <span className="dot"/>
            <span>5:38</span>
            <span className="pill">{I.spark}Pop</span>
          </div>
        </div>
      </div>
      <div className="row gap-2 center">
        <button className="btn-primary btn">{I.spark}Exportar Mezcla con IA</button>
        <button className="btn btn-ghost">{I.arrow}Volver</button>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Plugin Selection Modal
   ═══════════════════════════════════════════════════════════════════════ */
const PLUGINS = [
  { id: 'reverb', name: 'Reverb', desc: 'Espacio y profundidad', icon: I.reverb },
  { id: 'delay', name: 'Delay', desc: 'Eco y repetición', icon: I.delay },
  { id: 'comp', name: 'Compressor', desc: 'Control de dinámica', icon: I.comp },
  { id: 'eq', name: 'EQ Paramétrico', desc: 'Ecualizador avanzado', icon: I.eq },
  { id: 'dist', name: 'Distortion', desc: 'Saturación y calidez', icon: I.dist },
  { id: 'chorus', name: 'Chorus', desc: 'Modulación stereo', icon: I.chorus },
];

function PluginModal({ show, onClose, stemName, selectedPlugins, onToggle }) {
  if (!show) return null;

  const count = selectedPlugins.length;

  return (
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {I.plug}
            <span>Plugins para: <strong style={{color:'var(--accent)'}}>{stemName}</strong></span>
          </div>
          <button className="modal-close" onClick={onClose}>
            {I.x}
          </button>
        </div>
        
        <div className="modal-body">
          <div className="plugin-grid">
            {PLUGINS.map(plugin => {
              const isSelected = selectedPlugins.includes(plugin.id);
              return (
                <button 
                  key={plugin.id}
                  className={`plugin-card${isSelected ? ' selected' : ''}`}
                  onClick={() => onToggle(plugin.id)}
                >
                  <div className="plugin-icon">{plugin.icon}</div>
                  <div className="plugin-info">
                    <div className="plugin-name">{plugin.name}</div>
                    <div className="plugin-desc">{plugin.desc}</div>
                  </div>
                  <div className="plugin-check">
                    {isSelected && I.check}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          {count > 0 && (
            <div className="selected-count">
              {count} plugin{count !== 1 ? 's' : ''} seleccionado{count !== 1 ? 's' : ''}
            </div>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={onClose}>Aplicar</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Stem Components
   ═══════════════════════════════════════════════════════════════════════ */
function StemWave({ color, seed, density, played }) {
  const wave = useMemo(() => makeWave(seed, 300, density), [seed, density]);
  const w=900, h=64, mid=h/2, step=w/wave.length;
  
  let path='';
  for (let i=0; i<wave.length; i++) {
    const x=i*step, y=mid-wave[i]*(mid-3);
    path += (i===0?'M':'L') + x.toFixed(1)+' '+y.toFixed(1)+' ';
  }
  for (let i=wave.length-1; i>=0; i--) {
    const x=i*step, y=mid+wave[i]*(mid-3);
    path += 'L'+x.toFixed(1)+' '+y.toFixed(1)+' ';
  }
  path += 'Z';
  
  const playedW = (played/100) * w;
  
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sw-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.95"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.65"/>
        </linearGradient>
        <clipPath id={`sw-pl-${seed}`}><rect x="0" y="0" width={playedW} height={h}/></clipPath>
        <clipPath id={`sw-rs-${seed}`}><rect x={playedW} y="0" width={w-playedW} height={h}/></clipPath>
      </defs>
      <path d={path} fill="rgba(255,255,255,0.18)" clipPath={`url(#sw-rs-${seed})`}/>
      <path d={path} fill={`url(#sw-${seed})`} clipPath={`url(#sw-pl-${seed})`}/>
    </svg>
  );
}

function StemRow({ stem, selected, onSelect, played, onPluginClick, hasEQ }) {
  const [muted, setMuted] = useState(false);
  
  return (
    <div className={`stem${selected ? ' selected' : ''}`} onClick={onSelect}>
      <div className="stem-color" style={{background: stem.color, boxShadow:`0 0 10px ${stem.color}66`}}/>
      
      <div className="stem-meta">
        <div className="stem-icon" style={{color: stem.color, background: `${stem.color}1A`}}>
          {I[stem.icon] || I.note}
        </div>
        <div className="stem-info">
          <div className="stem-name">{stem.name}</div>
          <div className="stem-kind">{stem.kind}</div>
        </div>
        <button 
          className={`stem-m${muted?' on':''}`} 
          onClick={(e)=>{e.stopPropagation();setMuted(!muted);}}
        >
          M
        </button>
      </div>
      
      <div className="stem-wave">
        <span className="stem-time left">0:00</span>
        <span className="stem-time right">5:38</span>
        <StemWave color={stem.color} seed={stem.seed} density={stem.density} played={played}/>
      </div>
      
      <div className="stem-ctrl">
        <div className="stem-ctrl-row">
          <span className="stem-ctrl-lbl">Vol</span>
          <div className="stem-ctrl-slider">
            <div className="stem-ctrl-fill" style={{width:'58%', background: stem.color}}/>
            <div className="stem-ctrl-thumb" style={{left:'58%', color: stem.color}}/>
          </div>
          <span className="stem-ctrl-val">0.0 dB</span>
        </div>
        <div className="stem-ctrl-row">
          <span className="stem-ctrl-lbl">Pan</span>
          <div className="stem-ctrl-slider">
            <div className="stem-ctrl-fill" style={{width:'50%', background:'transparent'}}/>
            <div className="stem-ctrl-thumb" style={{left:'50%', color: stem.color}}/>
          </div>
          <span className="stem-ctrl-val">C</span>
        </div>
        <div className="stem-actions">
          <button className={`stem-act-btn${hasEQ?' active':''}`}>
            {I.eq}EQ
          </button>
          <button 
            className="stem-act-btn" 
            onClick={(e) => {e.stopPropagation(); onPluginClick();}}
          >
            {I.plug}+ Plugins
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Stems Section
   ═══════════════════════════════════════════════════════════════════════ */
const STEMS = [
  { id:1, name:'O5 DIAS INICIO - 1', kind:'Guitarra', color:'#E36AB0', icon:'guitar', seed:101, density:0.62 },
  { id:2, name:'O5 DIAS INICIO - 2', kind:'Guitarra', color:'#6DCE7A', icon:'guitar', seed:202, density:0.58 },
  { id:3, name:'O5 DIAS INICIO - 3', kind:'Guitarra', color:'#E08254', icon:'guitar', seed:303, density:0.66 },
  { id:4, name:'O5 DIAS INICIO - 4', kind:'Pista',    color:'#5B9BF4', icon:'note',   seed:404, density:0.55 },
  { id:5, name:'O5 DIAS INICIO - 5', kind:'Bajo',     color:'#D9C566', icon:'bass',   seed:505, density:0.72 },
  { id:6, name:'O5 DIAS INICIO - 6', kind:'Pista',    color:'#B07CF0', icon:'note',   seed:606, density:0.50 },
  { id:7, name:'O5 DIAS INICIO - 7', kind:'Pista',    color:'#4FD4D4', icon:'note',   seed:707, density:0.62 },
  { id:8, name:'O5 DIAS INICIO - 8', kind:'Voz',      color:'#E36AB0', icon:'mic',    seed:808, density:0.78 },
  { id:9, name:'O5 DIAS INICIO - 9', kind:'Guitarra', color:'#E08254', icon:'guitar', seed:909, density:0.60 },
  { id:10,name:'O5 DIAS INICIO - 10',kind:'Guitarra', color:'#9B7AE8', icon:'guitar', seed:110, density:0.58 },
  { id:11,name:'O5 DIAS INICIO - 11',kind:'Pista',    color:'#6DCE7A', icon:'note',   seed:111, density:0.55 },
  { id:12,name:'O5 DIAS INICIO - 12',kind:'Pista',    color:'#5B9BF4', icon:'note',   seed:112, density:0.62 },
  { id:13,name:'O5 DIAS INICIO - 13',kind:'Bajo',     color:'#D9C566', icon:'bass',   seed:113, density:0.70 },
  { id:14,name:'O5 DIAS INICIO - 14',kind:'Voz',      color:'#E36AB0', icon:'mic',    seed:114, density:0.74 },
];

function Stems({ selected, setSelected, played }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStem, setModalStem] = useState(null);
  const [stemPlugins, setStemPlugins] = useState({});
  
  const handlePluginClick = (stem) => {
    setModalStem(stem);
    setModalOpen(true);
  };
  
  const handlePluginToggle = (pluginId) => {
    setStemPlugins(prev => {
      const stemId = modalStem.id;
      const current = prev[stemId] || [];
      const updated = current.includes(pluginId)
        ? current.filter(id => id !== pluginId)
        : [...current, pluginId];
      return { ...prev, [stemId]: updated };
    });
  };
  
  return (
    <section>
      <div className="stems-toolbar">
        <button className="filter-chip">
          {I.list}Todos ({STEMS.length})
        </button>
      </div>
      
      <div className="stem-list">
        {STEMS.map(s => (
          <StemRow 
            key={s.id} 
            stem={s}
            selected={selected === s.id}
            onSelect={()=>setSelected(s.id)}
            played={played}
            onPluginClick={() => handlePluginClick(s)}
            hasEQ={false}
          />
        ))}
      </div>
      
      <PluginModal
        show={modalOpen}
        onClose={() => setModalOpen(false)}
        stemName={modalStem?.name || ''}
        selectedPlugins={modalStem ? (stemPlugins[modalStem.id] || []) : []}
        onToggle={handlePluginToggle}
      />
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   App
   ═══════════════════════════════════════════════════════════════════════ */
function App() {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedStem, setSelectedStem] = useState(null);

  useEffect(() => {
    if (!playing) return;
    let raf;
    const tick = () => {
      setProgress(p => p > 99.5 ? 0 : p + 0.05);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  return (
    <div className="studio">
      <Header/>
      <Stems selected={selectedStem} setSelected={setSelectedStem} played={progress}/>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
