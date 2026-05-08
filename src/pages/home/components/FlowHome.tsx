/**
 * FlowHome.tsx v21 — Home simplificado: solo DAW, gratis, sin precios
 */
import { useState, useRef } from 'react';
import FlowNav from '@/components/flow/FlowNav';

const T = {
  bg: '#09090f',
  surface: 'rgba(255,255,255,0.04)',
  surface2: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.15)',
  text: '#f1f0f5',
  text2: '#a89bc0',
  text3: '#6b5f80',
  pink: '#e879f9',
  fuchsia: '#d946ef',
  purple: '#a855f7',
  green: '#34d399',
};

const PRESETS = [
  { id:'pop', name:'Pop', desc:'Brillante y comercial', color:'#e879f9', bars:[6,9,7,11,8,13,10,14,9,12,8,11,7,10,9] },
  { id:'rock', name:'Rock', desc:'Potente y agresivo', color:'#f87171', bars:[11,8,13,10,14,9,12,8,11,13,10,9,12,8,14] },
  { id:'hiphop', name:'Hip Hop', desc:'808 profundo, voces adelante', color:'#fbbf24', bars:[14,6,12,5,14,6,11,5,13,6,12,5,14,6,11] },
  { id:'gospel', name:'Gospel', desc:'Coro potente, warmth', color:'#facc15', bars:[8,11,9,13,10,14,11,12,9,13,10,11,8,12,9] },
  { id:'dance', name:'Dance/EDM', desc:'Sub bass, hi-hats', color:'#60a5fa', bars:[13,5,14,5,13,5,14,6,13,5,14,5,13,5,14] },
  { id:'balada', name:'Balada', desc:'Suave, emocional', color:'#c084fc', bars:[6,8,7,9,8,10,9,11,10,9,8,10,7,9,8] },
  { id:'acustico', name:'Acústico', desc:'Natural, sin compresión', color:'#fb923c', bars:[7,9,8,10,9,8,10,9,8,10,9,8,7,9,8] },
  { id:'reggaeton', name:'Reggaeton', desc:'Dembow, perreo', color:'#34d399', bars:[12,5,13,5,12,5,13,5,12,5,13,5,12,5,13] },
];

interface User { id:string; firstName:string; credits:number; is_pro?:boolean; plan?:string; }
interface Props {
  user: User | null;
  onNavigate: (id: string, files?: File[], preset?: string, mode?: 'mixer'|'daw') => void;
  onLogout?: () => void;
}

export default function FlowHome({ user, onNavigate, onLogout }: Props) {
  const [dragging, setDragging] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('pop');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const audio = Array.from(incoming).filter(f => f.type.startsWith('audio/') || /\.(wav|mp3|flac|aac|ogg|m4a)$/i.test(f.name));
    if (audio.length > 0) {
      setFiles(prev => [...prev, ...audio].slice(0, 12));
    }
  };

  const handleOpenDAW = () => {
    onNavigate('studio', files.length > 0 ? files : undefined, selectedPreset, 'daw');
  };
  const handleOpenMixer = () => {
    onNavigate('studio', files.length > 0 ? files : undefined, selectedPreset, 'mixer');
  };

  const preset = PRESETS.find(p => p.id === selectedPreset) ?? PRESETS[0];

  return (
    <div style={{ width:'100%', minHeight:'100vh', background:T.bg, color:T.text, fontFamily:'-apple-system,BlinkMacSystemFont,"DM Sans",system-ui,sans-serif' }}>
      <FlowNav active="home" onNavigate={onNavigate} user={user} onLogout={onLogout} />

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'48px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 16px', borderRadius:999, background:'rgba(168,85,247,0.1)', border:'1px solid rgba(168,85,247,0.25)', marginBottom:20 }}>
            <span style={{ fontSize:12, color:T.purple, fontWeight:600 }}>✦ Completamente gratis · Sin tarjeta de crédito</span>
          </div>
          <h1 style={{ fontSize:52, fontWeight:800, margin:'0 0 16px', letterSpacing:-1.5, lineHeight:1.1 }}>
            Tu estudio de mezcla<br/>
            <span style={{ background:'linear-gradient(135deg,#e879f9,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>profesional en el browser</span>
          </h1>
          <p style={{ color:T.text2, fontSize:18, margin:'0 0 8px', maxWidth:520, marginLeft:'auto', marginRight:'auto', lineHeight:1.6 }}>
            Sube tus stems, aplica EQ, efectos y exporta en WAV 24-bit listo para Spotify.
          </p>
          <p style={{ color:T.text3, fontSize:14, margin:0 }}>Sin instalaciones · Funciona en tu navegador · Gratis para siempre</p>
        </div>

        {/* Panel principal */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:24, alignItems:'start' }}>

          {/* Zona de carga */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? T.purple : files.length > 0 ? T.pink : T.border}`,
                borderRadius: 20, padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
                background: dragging ? 'rgba(168,85,247,0.06)' : files.length > 0 ? 'rgba(232,121,249,0.04)' : T.surface,
                transition: 'all 0.2s',
              }}
            >
              {files.length === 0 ? (
                <>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🎚️</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Arrastra tus stems aquí</div>
                  <div style={{ color: T.text2, fontSize: 14, marginBottom: 16 }}>o haz clic para seleccionar archivos</div>
                  <div style={{ color: T.text3, fontSize: 12 }}>WAV · MP3 · FLAC · hasta 12 stems</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
                    {files.length} {files.length === 1 ? 'stem cargado' : 'stems cargados'}
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginBottom:16 }}>
                    {files.map((f, i) => (
                      <div key={i} style={{ padding:'4px 12px', borderRadius:999, background:'rgba(232,121,249,0.12)', border:'1px solid rgba(232,121,249,0.25)', fontSize:12, color:T.pink, display:'flex', alignItems:'center', gap:6 }}>
                        🎵 {f.name.replace(/\.[^.]+$/, '').slice(0, 24)}
                        <button onClick={e => { e.stopPropagation(); setFiles(prev => prev.filter((_,j)=>j!==i)); }}
                          style={{ background:'none', border:'none', color:'rgba(248,113,113,0.7)', cursor:'pointer', fontSize:12, padding:0, lineHeight:1 }}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ color:T.text3, fontSize:12 }}>Clic para agregar más stems</div>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={e => handleFiles(e.target.files)} style={{ display:'none' }} />

            {/* Presets de género */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20 }}>
              <div style={{ fontSize:12, fontWeight:600, color:T.text2, marginBottom:14, textTransform:'uppercase', letterSpacing:0.5 }}>
                Preset de mezcla — elige tu género
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {PRESETS.map(p => (
                  <button key={p.id} onClick={() => setSelectedPreset(p.id)}
                    style={{ padding:'10px 8px', borderRadius:10, background: selectedPreset === p.id ? `${p.color}15` : T.surface2, border:`1px solid ${selectedPreset === p.id ? p.color + '55' : T.border}`, cursor:'pointer', fontFamily:'inherit', textAlign:'center', transition:'all 0.15s' }}>
                    {/* Mini waveform */}
                    <div style={{ display:'flex', alignItems:'flex-end', gap:1, height:20, justifyContent:'center', marginBottom:6 }}>
                      {p.bars.slice(0,8).map((h,i) => (
                        <div key={i} style={{ width:3, height:`${(h/14)*100}%`, borderRadius:1, background: selectedPreset === p.id ? p.color : T.text3, opacity: selectedPreset === p.id ? 0.8 : 0.4 }} />
                      ))}
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color: selectedPreset === p.id ? p.color : T.text2 }}>{p.name}</div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop:12, padding:'8px 12px', borderRadius:8, background:'rgba(168,85,247,0.06)', border:'1px solid rgba(168,85,247,0.12)', fontSize:12, color:T.text2 }}>
                <span style={{ color:preset.color, fontWeight:600 }}>{preset.name}</span> — {preset.desc}
              </div>
            </div>
          </div>

          {/* Panel derecho */}
          <div style={{ display:'flex', flexDirection:'column', gap:16, position:'sticky', top:20 }}>

            {/* Preview del preset */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20 }}>
              <div style={{ fontSize:11, color:T.text3, textTransform:'uppercase', letterSpacing:0.5, marginBottom:14 }}>Preview — {preset.name}</div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:60, marginBottom:16 }}>
                {preset.bars.map((h,i) => (
                  <div key={i} style={{ flex:1, height:`${(h/14)*100}%`, borderRadius:2, background:`linear-gradient(to top, ${preset.color}99, ${preset.color})`, opacity:0.8 }} />
                ))}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  ['EQ Bass', preset.id === 'hiphop' || preset.id === 'reggaeton' ? '+6 dB' : preset.id === 'rock' ? '+4 dB' : '+2 dB'],
                  ['Compresor', preset.id === 'rock' ? 'Agresivo' : preset.id === 'gospel' ? 'Medio' : 'Suave'],
                  ['Reverb', preset.id === 'gospel' ? '45%' : preset.id === 'balada' ? '35%' : '15%'],
                  ['Target LUFS', '-14 LUFS (Spotify)'],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'4px 0', borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ color:T.text3 }}>{k}</span>
                    <span style={{ color:T.text, fontWeight:500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Qué incluye */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>¿Qué incluye el DAW?</div>
              {[
                ['🎚️', 'Mezcla hasta 12 stems en paralelo'],
                ['🎛️', 'EQ de 3 bandas por stem'],
                ['✨', 'Reverb, Delay y Widener'],
                ['📊', 'VU Meter LUFS en tiempo real'],
                ['🎯', 'Presets de género con 1 clic'],
                ['💾', 'Exporta WAV 24-bit sin pérdida'],
              ].map(([icon, text]) => (
                <div key={text as string} style={{ display:'flex', alignItems:'center', gap:10, padding:'5px 0', fontSize:13, color:T.text2 }}>
                  <span style={{ fontSize:16 }}>{icon}</span> {text}
                </div>
              ))}
            </div>

            {/* CTA */}
            <button onClick={handleOpenDAW}
              style={{ width:'100%', height:56, borderRadius:14, border:'none', background:'linear-gradient(135deg,#7c3aed,#a855f7,#e879f9)', color:'#fff', fontSize:17, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 0 40px rgba(168,85,247,0.5)', letterSpacing:-0.3 }}>
              🎛️ Abrir en DAW Profesional
            </button>
            {files.length > 0 && (
              <button onClick={handleOpenMixer}
                style={{ width:'100%', height:44, borderRadius:12, border:'1px solid rgba(232,121,249,0.35)', background:'rgba(232,121,249,0.06)', color:'#e879f9', fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                🎚️ Abrir en Mixer Rápido
              </button>
            )}
            <div style={{ textAlign:'center', fontSize:12, color:T.text3 }}>
              {files.length > 0 ? `${files.length} stem${files.length > 1 ? 's' : ''} listo${files.length > 1 ? 's' : ''} · Preset: ${preset.name}` : 'Puedes cargar stems dentro del DAW también'}
            </div>

            {/* Gratis badge */}
            <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.2)', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20 }}>🎁</span>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:T.green }}>100% Gratis</div>
                <div style={{ fontSize:11, color:T.text3 }}>Sin límites · Sin registro requerido · Sin tarjeta</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
