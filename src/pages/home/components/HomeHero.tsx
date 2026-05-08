import { useState, useRef } from 'react';
import { MixPreset, PRESETS } from './PresetScreen';

interface HomeHeroProps { onStartMixer: (preset: MixPreset, files: File[]) => void; }

const T = {
  bg: '#09090f', surface: 'rgba(255,255,255,0.04)', surface2: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.08)', text: '#f1f0f5', text2: '#a89bc0', text3: '#6b5f80',
  pink: '#e879f9', purple: '#a855f7', green: '#34d399',
};

export default function HomeHero({ onStartMixer }: HomeHeroProps) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const audio = Array.from(incoming).filter(f =>
      f.type.startsWith('audio/') || /\.(wav|mp3|flac|aac|ogg|m4a)$/i.test(f.name)
    );
    if (audio.length > 0) setFiles(prev => [...prev, ...audio].slice(0, 12));
  };

  const handleStart = () => onStartMixer(selectedPreset, files);

  return (
    <div style={{ width:'100%', minHeight:'100vh', background:T.bg, color:T.text, fontFamily:'-apple-system,BlinkMacSystemFont,"DM Sans",system-ui,sans-serif' }}>

      {/* Nav */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 32px', borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#7c3aed,#e879f9)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>M</div>
          <span style={{ fontWeight:700, fontSize:16 }}>mixingmusic.ai</span>
        </div>
        <div style={{ display:'flex', gap:12 }}>
          <a href="/auth/login" style={{ padding:'8px 18px', borderRadius:8, border:`1px solid ${T.border}`, color:T.text2, fontSize:13, textDecoration:'none', background:'transparent' }}>Iniciar sesión</a>
          <a href="/auth/register" style={{ padding:'8px 18px', borderRadius:8, background:'linear-gradient(135deg,#7c3aed,#a855f7)', color:'#fff', fontSize:13, fontWeight:600, textDecoration:'none', boxShadow:'0 0 20px rgba(168,85,247,0.4)' }}>Empezar gratis</a>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'52px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign:'center', marginBottom:52 }}>
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
        <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:24, alignItems:'start' }}>

          {/* Izquierda */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => fileInputRef.current?.click()}
              style={{ border:`2px dashed ${dragging ? T.purple : files.length > 0 ? T.pink : T.border}`, borderRadius:20, padding:'48px 24px', textAlign:'center', cursor:'pointer', background: dragging ? 'rgba(168,85,247,0.06)' : files.length > 0 ? 'rgba(232,121,249,0.04)' : T.surface, transition:'all 0.2s' }}>
              {files.length === 0 ? (
                <>
                  <div style={{ fontSize:48, marginBottom:16 }}>🎚️</div>
                  <div style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Arrastra tus stems aquí</div>
                  <div style={{ color:T.text2, fontSize:14, marginBottom:16 }}>o haz clic para seleccionar archivos</div>
                  <div style={{ color:T.text3, fontSize:12 }}>WAV · MP3 · FLAC · hasta 12 stems</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize:32, marginBottom:12 }}>✅</div>
                  <div style={{ fontSize:18, fontWeight:700, marginBottom:12 }}>{files.length} {files.length === 1 ? 'stem cargado' : 'stems cargados'}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginBottom:16 }}>
                    {files.map((f,i) => (
                      <div key={i} style={{ padding:'4px 12px', borderRadius:999, background:'rgba(232,121,249,0.12)', border:'1px solid rgba(232,121,249,0.25)', fontSize:12, color:T.pink, display:'flex', alignItems:'center', gap:6 }}>
                        🎵 {f.name.replace(/\.[^.]+$/,'').slice(0,24)}
                        <button onClick={e=>{ e.stopPropagation(); setFiles(p=>p.filter((_,j)=>j!==i)); }} style={{ background:'none', border:'none', color:'rgba(248,113,113,0.7)', cursor:'pointer', fontSize:12, padding:0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div style={{ color:T.text3, fontSize:12 }}>Clic para agregar más stems</div>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="audio/*" multiple onChange={e => handleFiles(e.target.files)} style={{ display:'none' }} />

            {/* Presets */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20 }}>
              <div style={{ fontSize:12, fontWeight:600, color:T.text2, marginBottom:14, textTransform:'uppercase', letterSpacing:0.5 }}>Preset de mezcla — elige tu género</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {PRESETS.map(p => (
                  <button key={p.id} onClick={() => setSelectedPreset(p)}
                    style={{ padding:'10px 8px', borderRadius:10, background: selectedPreset.id === p.id ? `${p.color}18` : T.surface2, border:`1px solid ${selectedPreset.id === p.id ? p.color+'55' : T.border}`, cursor:'pointer', fontFamily:'inherit', textAlign:'center', transition:'all 0.15s' }}>
                    {/* Mini waveform */}
                    <div style={{ display:'flex', alignItems:'flex-end', gap:1, height:18, justifyContent:'center', marginBottom:5 }}>
                      {[6,9,7,11,8,13,10,14,9,12].map((h,i) => (
                        <div key={i} style={{ width:3, height:`${(h/14)*100}%`, borderRadius:1, background: selectedPreset.id === p.id ? p.color : T.text3, opacity: selectedPreset.id === p.id ? 0.9 : 0.35 }} />
                      ))}
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color: selectedPreset.id === p.id ? p.color : T.text2 }}>{p.name}</div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop:12, padding:'8px 12px', borderRadius:8, background:'rgba(168,85,247,0.06)', border:'1px solid rgba(168,85,247,0.12)', fontSize:12, color:T.text2 }}>
                <span style={{ color:selectedPreset.color, fontWeight:600 }}>{selectedPreset.name}</span> — {selectedPreset.desc}
              </div>
            </div>
          </div>

          {/* Derecha */}
          <div style={{ display:'flex', flexDirection:'column', gap:16, position:'sticky', top:20 }}>

            {/* Preview preset */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20 }}>
              <div style={{ fontSize:11, color:T.text3, textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>Preview — {selectedPreset.name}</div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:56, marginBottom:14 }}>
                {[6,9,7,11,8,13,10,14,9,12,8,11,7,10,9].map((h,i) => (
                  <div key={i} style={{ flex:1, height:`${(h/14)*100}%`, borderRadius:2, background:`linear-gradient(to top,${selectedPreset.color}88,${selectedPreset.color})` }} />
                ))}
              </div>
              {[
                ['EQ Bass', `+${selectedPreset.bassGain ?? 2} dB`],
                ['Reverb', `${Math.round((selectedPreset.reverbWet ?? 0.15)*100)}%`],
                ['Target', '-14 LUFS (Spotify)'],
              ].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'5px 0', borderBottom:`1px solid ${T.border}` }}>
                  <span style={{ color:T.text3 }}>{k}</span>
                  <span style={{ color:T.text, fontWeight:500 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Features */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:20 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>¿Qué incluye?</div>
              {[['🎚️','Mezcla hasta 12 stems'],['🎛️','EQ de 3 bandas por stem'],['✨','Reverb, Delay y Widener'],['📊','VU Meter LUFS en tiempo real'],['💾','Exporta WAV 24-bit']].map(([icon,text]) => (
                <div key={text as string} style={{ display:'flex', alignItems:'center', gap:10, padding:'4px 0', fontSize:13, color:T.text2 }}>
                  <span>{icon}</span>{text}
                </div>
              ))}
            </div>

            {/* CTA */}
            <button onClick={handleStart}
              style={{ width:'100%', height:56, borderRadius:14, border:'none', background:'linear-gradient(135deg,#7c3aed,#a855f7,#e879f9)', color:'#fff', fontSize:17, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 0 40px rgba(168,85,247,0.5)' }}>
              {files.length > 0 ? `🎚️ Abrir en MixingStudio AI` : '🎚️ Abrir MixingStudio AI'}
            </button>
            <div style={{ textAlign:'center', fontSize:12, color:T.text3 }}>
              {files.length > 0 ? `${files.length} stem${files.length>1?'s':''} listo${files.length>1?'s':''} · Preset: ${selectedPreset.name}` : 'Puedes cargar stems dentro del DAW también'}
            </div>

            <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.2)', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20 }}>🎁</span>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:T.green }}>100% Gratis</div>
                <div style={{ fontSize:11, color:T.text3 }}>Sin límites · Sin registro · Sin tarjeta</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
