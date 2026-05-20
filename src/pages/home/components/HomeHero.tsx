import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MixPreset, PRESETS } from './PresetScreen';
import { blogArticles } from '../../../mocks/blogArticles';
import { blogArticles2026 } from '../../../mocks/blogArticles2026';

interface HomeHeroProps { onStartMixer: (preset: MixPreset, files: File[], mode?: 'mixer'|'daw') => void; }

// ─── Design tokens (dark studio look) ─────────────────────────────────────
const T = {
  bg: '#0a0612',
  bgDeep: '#0F0A1A',
  surface: 'rgba(26,16,40,0.82)',
  surface2: 'rgba(35,20,55,0.5)',
  text: '#F8F0FF',
  text2: 'rgba(248,240,255,0.65)',
  text3: 'rgba(248,240,255,0.38)',
  pink: '#ec4899',
  fuchsia: '#C026D3',
  violet: '#7C3AED',
  border: 'rgba(192,38,211,0.18)',
  borderStrong: 'rgba(192,38,211,0.45)',
  green: '#4ade80',
  amber: '#F59E0B',
};

const GRAD: React.CSSProperties = {
  background: 'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

// ─── IA EQ presets ────────────────────────────────────────────────────────
const IAEQ_PRESETS_DEMO = [
  {id:'default',name:'Default',bands:[0,0,0,0,0,0,0,0,0,0,0,0]},
  {id:'car',name:'Car',bands:[0,3,4,2,1,0,-1,0,1,2,2,1]},
  {id:'iphone',name:'iPhone',bands:[0,-2,-1,0,1,2,2,1,0,-1,-2,-3]},
  {id:'headphones',name:'Headphones',bands:[0,2,3,1,0,-1,0,1,2,3,3,2]},
  {id:'tv',name:'TV',bands:[0,-4,-3,-1,0,2,3,2,1,0,-1,-2]},
  {id:'theater',name:'Home Theater',bands:[0,5,4,3,1,0,-1,0,1,3,2,1]},
  {id:'bt',name:'Bluetooth',bands:[0,4,5,3,1,-1,-2,-1,0,1,1,0]},
  {id:'studio',name:'Studio Monitors',bands:[0,0,0,0,0,0,0,0,0,0,0,0]},
  {id:'gaming',name:'Gaming Headset',bands:[0,3,2,1,0,0,1,2,3,4,3,2]},
  {id:'tablet',name:'Tablet',bands:[0,-2,-2,0,1,2,2,1,0,-1,-2,-3]},
];
const EQ_LABELS=['Pre','30Hz','60Hz','170Hz','310Hz','600Hz','1kHz','3kHz','6kHz','12kHz','14kHz','16kHz'];

// ─── Modo de mezcla ──────────────────────────────────────────────────────────
const MODES = [
  {
    id: 'mixer',
    icon: '🎚️',
    color: '#C026D3',
    title: 'Mixer Profesional con IA',
    sub: 'Presets de género · EQ master · LUFS meter',
    desc: 'Para mezclas rápidas y profesionales. Elige un preset de género (Pop, Rock, Gospel, Reggaeton...), ajusta el master EQ y exporta en segundos. Perfecto para resultados profesionales sin complejidad.',
    badge: 'Gratis',
    free: true,
    preview: [0.9,0.7,0.8,0.9,0.7,0.8,0.9,0.7,0.8,0.9,0.7,0.8,0.9,0.7,0.8,0.9],
  },
];

// ─── Credits model ─────────────────────────────────────────────────────────
const CREDIT_ACTIONS = [
  { icon: '🎚️', action: 'Mixer Profesional con IA', cost: 0, color: '#C026D3' },
  { icon: '💾', action: 'Exportar WAV 24-bit', cost: 0,  color: '#7C3AED' },
  { icon: '🎯', action: '9 Presets de género profesionales', cost: 0,  color: '#a259ff' },
  { icon: '⬇️', action: 'Descargas ilimitadas', cost: 0,  color: '#4ade80' },
];

// ─── Pricing features ─────────────────────────────────────────────────────
const FREE_FEATURES = [
  '✓ Mezclas profesionales ilimitadas',
  '✓ Mixer profesional con IA',
  '✓ Exporta WAV 24-bit',
  '✓ Todos los presets de género',
  '✓ IA EQ preview por dispositivo',
];
const PRO_FEATURES = [
  '✦ Sin límites · Para siempre',
  '🎛️ Mezclar stems — 1 crédito c/u',
  '✦ Generar canciones IA — 10 créditos c/u',
  '🎚️ Mixer Profesional — mezcla en segundos',
  '⬇️ Exportar WAV 24-bit — 1 crédito c/u',
  '📵 Sin marca de agua',
];

// ─── Other data ───────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name:'Carlos M.', role:'Productor Gospel', country:'🇨🇴', text:'Subí 10 stems de mi coro y en 3 minutos tenía una mezcla lista para radio. Increíble.', stars:5 },
  { name:'Valeria R.', role:'Cantautora', country:'🇲🇽', text:'Con el generador de IA escribí el prompt y me salió una base completa. Nunca pensé que sería tan fácil.', stars:5 },
  { name:'DJ Fontana', role:'DJ / Productor EDM', country:'🇦🇷', text:'El preset Dance/EDM está brutal. Los -10 LUFS suenan perfecto en Spotify desde el primer intento.', stars:5 },
  { name:'Pastor Reyes', role:'Director Musical', country:'🇵🇪', text:'Separé el coro de la música con un clic. La calidad de Demucs es increíble para una herramienta web.', stars:5 },
  { name:'Ana Sofía T.', role:'Artista Indie', country:'🇨🇱', text:'Agregué un piano a mi canción con IA. Elegí el estilo, lo generó y quedó perfectamente integrado.', stars:5 },
  { name:'Marcos L.', role:'Ingeniero de Audio', country:'🇧🇷', text:'Los LUFS integrados son reales. El limiter hace su trabajo. Para una herramienta gratuita es sorprendente.', stars:5 },
];

const STATS = [
  { num:'47,832', label:'Canciones producidas', icon:'🎵' },
  { num:'-10 LUFS', label:'Estándar Spotify garantizado', icon:'🎛️' },
  { num:'4', label:'Modos de producción con IA', icon:'✦' },
  { num:'Gratis', label:'Sin límites ni registro', icon:'🎁' },
];

const FAQ_ITEMS = [
  { q:'¿Qué puedo hacer con las 2 canciones gratis?', a:'Con el plan gratuito puedes usar los 4 modos — mezclar, generar, separar stems y agregar instrumentos — para producir hasta 2 canciones completas. Cada canción puede incluir mezcla, exportación WAV 24-bit y ajustes de EQ. No necesitas tarjeta de crédito.' },
  { q:'¿Es completamente gratis?', a:'Sí. MixingMusic.AI es 100% gratis. Sube tus stems, mezcla con presets profesionales de género, aplica EQ y efectos, y exporta en WAV 24-bit listo para Spotify. Sin registro, sin tarjeta de crédito, sin límites.' },
  { q:'¿Qué es ACE-Step y cómo genera música?', a:'ACE-Step es un modelo de IA open-source de Meta especializado en generación de audio musical. Corre en GPU propia de MixingMusic.AI (no dependemos de Suno ni de APIs externas). Puedes darle un prompt de texto, subir una letra o un audio de referencia para que imite el estilo.' },
  { q:'¿La separación de stems es privada?', a:'Sí, 100%. La separación usa Demucs de Meta, que corre directamente en tu navegador con WebAssembly. Tu audio nunca sale de tu dispositivo — no se envía a ningún servidor.' },
  { q:'¿Qué formatos acepta?', a:'WAV, MP3, FLAC, AAC y M4A. Hasta 12 stems simultáneos para mezclar. Para generación y separación, cualquier canción de hasta 20 minutos.' },
  { q:'¿Qué significa -10 LUFS?', a:'LUFS es el estándar de volumen para streaming. Spotify normaliza a -10 LUFS, YouTube a -13 LUFS. Nuestra IA exporta siempre en el rango correcto para que tu canción no pierda volumen al subirse a plataformas.' },
];

// ─── Component ────────────────────────────────────────────────────────────
export default function HomeHero({ onStartMixer }: HomeHeroProps) {
  const [openFaq, setOpenFaq] = useState<number|null>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [demoPreset, setDemoPreset] = useState(IAEQ_PRESETS_DEMO[0]);
  const [activeMode, setActiveMode] = useState(0);
  const statsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('page-home');
    return () => document.body.classList.remove('page-home');
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if(e.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if(statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const goRegister = () => navigate('/auth/register');
  const goUpload = () => onStartMixer(PRESETS[0], [], 'mixer');

  const S = {
    section: { padding:'80px 20px', maxWidth:'1100px', margin:'0 auto' } as React.CSSProperties,
    sectionTitle: { fontSize:'clamp(28px,4vw,42px)', fontWeight:800, color:T.text, letterSpacing:'-1px', marginBottom:'12px', lineHeight:1.15 } as React.CSSProperties,
    sectionSub: { fontSize:'17px', color:T.text2, marginBottom:'48px', lineHeight:1.6 } as React.CSSProperties,
    card: { background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'24px' } as React.CSSProperties,
    ctaBtn: { background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)', border:'none', color:'#fff', borderRadius:'980px', fontWeight:900, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 0 40px rgba(192,38,211,0.55)', display:'inline-flex', alignItems:'center', gap:'10px' } as React.CSSProperties,
  };

  return (
    <div style={{ minHeight:'100vh', color:T.text, fontFamily:"'Outfit',system-ui,sans-serif" }}>

      {/* ───── HERO ───── */}
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'100px 20px 60px', textAlign:'center', position:'relative' }}>

        {/* Logo */}
        <div style={{ marginBottom:'32px' }}>
          <img src="/logo-brand.png" alt="mixingmusic.ai" style={{ height:'clamp(44px,6vw,72px)', width:'auto', maxWidth:'480px' }}/>
        </div>

        {/* Live badge */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:'980px', padding:'6px 16px', fontSize:'13px', color:T.green, fontWeight:700, marginBottom:'24px' }}>
          <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:T.green, display:'inline-block', animation:'pulse 2s infinite' }}></span>
          ✅ Mezcla · Genera · Separa · Instrumentos — todo con IA
        </div>

        {/* H1 */}
        <h1 style={{ fontSize:'clamp(36px,6.5vw,76px)', fontWeight:900, lineHeight:1.05, letterSpacing:'-2px', marginBottom:'16px', maxWidth:'960px' }}>
          El estudio de música<br/>
          <span style={GRAD}>con IA más completo.</span><br/>
          <span style={{ color:T.amber }}>Gratis para empezar.</span>
        </h1>

        <p style={{ fontSize:'clamp(16px,2.2vw,19px)', color:T.text2, maxWidth:'600px', lineHeight:1.7, marginBottom:'16px' }}>
          Mezcla stems, genera canciones desde un prompt, separa pistas de cualquier canción<br/>y agrega instrumentos con IA — todo en un solo lugar.
        </p>

        {/* 4 mode pills */}
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', justifyContent:'center', marginBottom:'40px' }}>
          {MODES.map((m,i) => (
            <div key={m.id} style={{ background:`${m.color}18`, border:`1px solid ${m.color}44`, borderRadius:'980px', padding:'6px 16px', fontSize:'12px', fontWeight:700, color:m.color }}>
              {m.icon} {m.title.split(' ').slice(0,2).join(' ')}
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display:'flex', gap:'14px', flexWrap:'wrap', justifyContent:'center', marginBottom:'60px' }}>
          <button onClick={goUpload} style={{ ...S.ctaBtn, padding:'20px 52px', fontSize:'20px', letterSpacing:'-0.3px' }}>
            🎚️ Abrir MixingMusic Mixer — Gratis
          </button>
          <a href="#modos" style={{ background:'transparent', border:'1px solid rgba(192,38,211,0.3)', color:'#9B7EC8', padding:'16px 32px', borderRadius:'980px', fontSize:'16px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', textDecoration:'none', display:'flex', alignItems:'center' }}>
            Más funciones ↓
          </a>
        </div>

        {/* Mixer preview */}
        <div style={{ width:'100%', maxWidth:'780px', background:'rgba(15,10,26,0.8)', border:`1px solid ${T.border}`, borderRadius:'20px', overflow:'hidden', boxShadow:'0 40px 80px rgba(0,0,0,0.6)' }}>
          <div style={{ background:'rgba(26,16,40,0.9)', padding:'10px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:'6px' }}>
            {['#EF4444','#FBBF24','#4ade80'].map(c => <div key={c} style={{ width:'10px', height:'10px', borderRadius:'50%', background:c }}></div>)}
            <span style={{ marginLeft:'8px', fontSize:'12px', color:'#9B7EC8' }}>Mezclador AI Pro — mixingmusic.ai</span>
          </div>
          <div style={{ padding:'20px', display:'grid', gridTemplateColumns:'repeat(9,1fr)', gap:'6px' }}>
            {PRESETS.map(p => (
              <div key={p.id} style={{ background:`${p.color}18`, border:`1px solid ${p.color}44`, borderRadius:'8px', padding:'8px 4px', textAlign:'center', cursor:'pointer' }} onClick={goRegister}>
                <div style={{ height:'20px', display:'flex', alignItems:'flex-end', gap:'1px', marginBottom:'5px' }}>
                  {p.wavePattern.slice(0,6).map((h,i) => <div key={i} style={{ flex:1, height:`${h*100}%`, background:p.color, borderRadius:'1px' }}></div>)}
                </div>
                <div style={{ fontSize:'9px', color:T.text, fontWeight:700 }}>{p.name}</div>
              </div>
            ))}
          </div>
          <div style={{ padding:'12px 20px', background:'rgba(8,4,16,0.5)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:'11px', color:'#9B7EC8' }}>✦ Gospel activo · -10 LUFS · Safe ✓</span>
            <button onClick={goRegister} style={{ background:'linear-gradient(135deg,#EC4899,#C026D3)', border:'none', color:'#fff', padding:'7px 16px', borderRadius:'980px', fontSize:'11px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Usar gratis →</button>
          </div>
        </div>
      </div>

      {/* ───── STATS ───── */}
      <div ref={statsRef} style={{ background:'rgba(26,16,40,0.6)', borderTop:`1px solid ${T.border}`, borderBottom:`1px solid ${T.border}`, padding:'40px 20px' }}>
        <div style={{ maxWidth:'1100px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'32px' }}>
          {STATS.map((s,i) => (
            <div key={i} style={{ textAlign:'center', opacity:statsVisible?1:0, transform:statsVisible?'translateY(0)':'translateY(20px)', transition:`all 0.6s ease ${i*0.1}s` }}>
              <div style={{ fontSize:'36px', marginBottom:'4px' }}>{s.icon}</div>
              <div style={{ fontSize:'clamp(22px,3vw,32px)', fontWeight:800, ...GRAD }}>{s.num}</div>
              <div style={{ fontSize:'13px', color:T.text3, marginTop:'4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ───── 4 MODOS ───── */}
      <div id="modos" style={{ padding:'100px 20px', background:'rgba(15,10,26,0.7)' }}>
        <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'60px' }}>
            <h2 style={{ fontSize:'clamp(30px,5vw,54px)', fontWeight:900, lineHeight:1.05, letterSpacing:'-1.5px', marginBottom:'16px' }}>
              Tu mezcla profesional<br/><span style={GRAD}>en el navegador</span>
            </h2>
            <p style={{ fontSize:'17px', color:T.text2, maxWidth:'520px', margin:'0 auto', lineHeight:1.6 }}>
              Mixer profesional con EQ, efectos, LUFS en tiempo real y 9 presets de género. Exporta WAV 24-bit a -14 LUFS sin marca de agua.
            </p>
          </div>

          {/* Mode tabs */}
          <div style={{ display:'flex', gap:'8px', marginBottom:'32px', flexWrap:'wrap', justifyContent:'center' }}>
            {MODES.map((m,i) => (
              <button key={m.id} onClick={() => setActiveMode(i)}
                style={{ padding:'10px 22px', borderRadius:'980px', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s',
                  background: activeMode===i ? `linear-gradient(135deg,${m.color},${m.color}bb)` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${activeMode===i ? m.color : 'rgba(255,255,255,0.08)'}`,
                  color: activeMode===i ? '#fff' : T.text2,
                  boxShadow: activeMode===i ? `0 0 20px ${m.color}44` : 'none',
                }}>
                {m.icon} {m.title}
              </button>
            ))}
          </div>

          {/* Active mode card */}
          {MODES.map((m,i) => i !== activeMode ? null : (
            <div key={m.id} style={{ background:`linear-gradient(135deg,rgba(26,16,40,0.95),rgba(15,10,26,0.95))`, border:`1px solid ${m.color}44`, borderRadius:'24px', padding:'40px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'40px', alignItems:'center', borderTop:`3px solid ${m.color}` }}>
              <div>
                <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:`${m.color}18`, border:`1px solid ${m.color}33`, borderRadius:'980px', padding:'6px 16px', fontSize:'12px', fontWeight:700, color:m.color, marginBottom:'20px' }}>
                  {m.icon} {m.badge}
                </div>
                <h3 style={{ fontSize:'clamp(24px,3vw,36px)', fontWeight:900, color:T.text, letterSpacing:'-0.8px', marginBottom:'8px', lineHeight:1.15 }}>
                  {m.title}
                </h3>
                <div style={{ fontSize:'13px', fontWeight:700, color:m.color, fontFamily:'monospace', letterSpacing:'0.3px', marginBottom:'20px' }}>{m.sub}</div>
                <p style={{ fontSize:'16px', color:T.text2, lineHeight:1.8, marginBottom:'28px' }}>{m.desc}</p>
                <button onClick={goRegister} style={{ background:`linear-gradient(135deg,${m.color},${m.color}bb)`, border:'none', color:'#fff', padding:'14px 32px', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:`0 0 24px ${m.color}44` }}>
                  Probar gratis →
                </button>
              </div>
              {/* Wave preview */}
              <div style={{ background:'rgba(8,4,16,0.8)', borderRadius:'16px', padding:'24px', border:`1px solid ${m.color}22` }}>
                <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:m.color, marginBottom:'16px' }}>{m.title} — preview</div>
                <div style={{ display:'flex', gap:'3px', alignItems:'flex-end', height:'80px', marginBottom:'20px' }}>
                  {m.preview.map((h,j) => (
                    <div key={j} style={{ flex:1, background:m.color, borderRadius:'2px', height:`${h*100}%`, opacity: 0.6 + h*0.4, transition:'height 0.3s ease' }}></div>
                  ))}
                </div>
                {/* Mode-specific UI hints */}
                {m.id==='mix' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                    {['Vocals · -2dB · Reverb 15%','Drums · +1dB · Comp High','Bass · 0dB · EQ +4'].map((s,j) => (
                      <div key={j} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'11px', color:T.text2 }}>
                        <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:m.color, opacity:0.7 }}></div>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
                {m.id==='create' && (
                  <div style={{ background:'rgba(192,38,211,0.08)', border:'1px solid rgba(192,38,211,0.2)', borderRadius:'10px', padding:'12px', fontSize:'12px', color:T.text2, lineHeight:1.6, fontStyle:'italic' }}>
                    "Pop electrónico, voz femenina, 120 BPM, melancólico, estilo Billie Eilish"
                  </div>
                )}
                {m.id==='stems' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                    {[{l:'Vocals',c:'#EC4899'},{l:'Drums',c:'#10B981'},{l:'Bass',c:'#F97316'},{l:'Other',c:'#6366F1'}].map(s => (
                      <div key={s.l} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:s.c }}></div>
                        <div style={{ fontSize:'11px', color:T.text2, flex:1 }}>{s.l}</div>
                        <div style={{ fontSize:'11px', color:s.c, fontFamily:'monospace' }}>stem.wav ✓</div>
                      </div>
                    ))}
                  </div>
                )}
                {m.id==='instruments' && (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px' }}>
                    {['🥁 Drums','🎸 Guitar','🎹 Piano','🎺 Brass','🎻 Strings','🎷 Sax'].map(inst => (
                      <div key={inst} style={{ background:'rgba(162,89,255,0.1)', border:'1px solid rgba(162,89,255,0.25)', borderRadius:'8px', padding:'6px 10px', fontSize:'11px', color:T.text2, cursor:'pointer' }}>
                        {inst}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* All 4 in grid below */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:'16px', marginTop:'24px' }}>
            {MODES.map((m,i) => (
              <div key={m.id} onClick={() => setActiveMode(i)}
                style={{ background:activeMode===i?`${m.color}14`:'rgba(26,16,40,0.7)', border:`1px solid ${activeMode===i?m.color+'44':T.border}`, borderRadius:'16px', padding:'20px', cursor:'pointer', transition:'all 0.15s', borderTop:`2px solid ${m.color}` }}>
                <div style={{ fontSize:'24px', marginBottom:'10px' }}>{m.icon}</div>
                <div style={{ fontSize:'14px', fontWeight:700, color:T.text, marginBottom:'4px' }}>{m.title}</div>
                <div style={{ fontSize:'11px', color:m.color, fontWeight:600 }}>{m.badge}</div>
              </div>
            ))}
          </div>

          <div style={{ textAlign:'center', marginTop:'48px' }}>
            <button onClick={goRegister} style={{ ...S.ctaBtn, padding:'18px 48px', fontSize:'17px' }}>
              🎛️ Empezar gratis — 2 canciones incluidas
            </button>
            <div style={{ marginTop:'12px', fontSize:'12px', color:T.text3 }}>Sin instalar nada · Funciona en el navegador · Gratis para siempre</div>
          </div>
        </div>
      </div>


      {/* ───── MIXING STUDIO AI ───── */}
      <div style={{ padding:'100px 20px', background:'rgba(10,6,18,0.95)', borderTop:'1px solid rgba(192,38,211,0.15)' }}>
        <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'56px' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(236,72,153,0.1)', border:'1px solid rgba(236,72,153,0.3)', borderRadius:'980px', padding:'6px 18px', fontSize:'12px', fontWeight:700, color:'#EC4899', marginBottom:'20px' }}>
              ✦ NUEVO — MixingStudio AI
            </div>
            <h2 style={{ fontSize:'clamp(30px,5vw,54px)', fontWeight:900, lineHeight:1.05, letterSpacing:'-1.5px', marginBottom:'16px' }}>
              El mixer profesional<br/><span style={GRAD}>con IA más completo</span>
            </h2>
            <p style={{ fontSize:'17px', color:T.text2, maxWidth:'580px', margin:'0 auto', lineHeight:1.6 }}>
              Mezcla stems, aplica EQ profesional, añade efectos y exporta en WAV 24-bit a -14 LUFS. Todo en un solo lugar. Sin instalar nada.
            </p>
          </div>


          {/* Feature pills */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:'10px', justifyContent:'center', marginBottom:'40px' }}>
            {[
              '🎚️ Mezcla profesional',
              '🎛️ EQ de 3 bandas',
              '✨ Efectos (Reverb, Delay, Widener)',
              '📊 LUFS en tiempo real',
              '🎯 9 presets de género',
              '⬇️ Exporta WAV 24-bit',
              '📵 Sin marca de agua',
              '✦ Gratis para siempre',
            ].map(f => (
              <div key={f} style={{ background:'rgba(26,16,40,0.8)', border:'1px solid rgba(192,38,211,0.2)', borderRadius:'980px', padding:'8px 18px', fontSize:'13px', fontWeight:500, color:T.text2 }}>{f}</div>
            ))}
          </div>

          <div style={{ textAlign:'center' }}>
            <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap', marginBottom:'12px' }}>
              <button onClick={goUpload} style={{ background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)', border:'none', color:'#fff', padding:'18px 40px', borderRadius:'14px', fontSize:'17px', fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 0 40px rgba(192,38,211,0.5)', letterSpacing:'-0.3px' }}>
                🎚️ Abrir Mixer — Gratis
              </button>
            </div>
            <div style={{ fontSize:'12px', color:T.text3 }}>Sin instalar nada · Funciona en el navegador · Gratis para siempre</div>
          </div>
        </div>
      </div>

      {/* ───── PRICING ───── */}
      <div style={{ padding:'100px 20px', background:'linear-gradient(135deg,rgba(26,12,46,0.97),rgba(36,18,58,0.95))' }}>
        <div style={{ maxWidth:'960px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'56px' }}>
            <h2 style={S.sectionTitle}>Simple, sin sorpresas.<br/><span style={GRAD}>100% gratis para siempre.</span></h2>
            <p style={{ ...S.sectionSub, marginBottom:0 }}>Empieza gratis con 2 canciones. Paga solo cuando quieras más.</p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'24px', alignItems:'start' }}>

            {/* FREE */}
            <div style={{ background:'rgba(26,16,40,0.8)', border:`1px solid ${T.border}`, borderRadius:'24px', padding:'32px', textAlign:'center' }}>
              <div style={{ fontSize:'13px', fontWeight:700, letterSpacing:'1px', color:'#9B7EC8', textTransform:'uppercase', marginBottom:'12px' }}>Gratis</div>
              <div style={{ fontSize:'48px', fontWeight:900, color:T.text, lineHeight:1, marginBottom:'6px' }}>$0</div>
              <div style={{ fontSize:'13px', color:'rgba(155,126,200,0.6)', marginBottom:'8px' }}>para siempre</div>
              <div style={{ background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:'10px', padding:'8px 14px', fontSize:'12px', color:T.green, fontWeight:700, marginBottom:'24px' }}>
                🎵 2 canciones completas incluidas
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'28px', textAlign:'left' }}>
                {FREE_FEATURES.map(f => (
                  <div key={f} style={{ fontSize:'13px', color:'rgba(248,240,255,0.7)', display:'flex', alignItems:'center', gap:'8px' }}>{f}</div>
                ))}
              </div>
              <button onClick={goRegister}
                style={{ width:'100%', background:'transparent', border:'1px solid rgba(192,38,211,0.35)', color:'#C026D3', padding:'14px', borderRadius:'14px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Crear cuenta gratis
              </button>
            </div>

            {/* PRO */}
            <div style={{ background:'linear-gradient(135deg,rgba(36,18,58,0.98),rgba(20,10,36,0.98))', border:'2px solid #C026D3', borderRadius:'24px', padding:'32px', textAlign:'center', position:'relative', boxShadow:'0 0 48px rgba(192,38,211,0.25)' }}>
              <div style={{ position:'absolute', top:'-14px', left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#EC4899,#C026D3)', borderRadius:'980px', padding:'4px 18px', fontSize:'11px', fontWeight:800, color:'#fff', whiteSpace:'nowrap' }}>
                ✦ MÁS POPULAR
              </div>
              <div style={{ fontSize:'13px', fontWeight:700, letterSpacing:'1px', color:'#EC4899', textTransform:'uppercase', marginBottom:'12px' }}>Creador Pro</div>
              <div style={{ fontSize:'48px', fontWeight:900, color:T.green, lineHeight:1, marginBottom:'4px' }}>Gratis</div>
              <div style={{ fontSize:'13px', color:'rgba(74,222,128,0.8)', marginBottom:'8px' }}>para siempre</div>
              <div style={{ background:'rgba(192,38,211,0.1)', border:'1px solid rgba(192,38,211,0.3)', borderRadius:'10px', padding:'8px 14px', fontSize:'12px', color:'#EC4899', fontWeight:700, marginBottom:'24px' }}>
                ✦ Sin límites · Sin registro · Sin tarjeta
              </div>

              {/* Credit breakdown */}
              <div style={{ background:'rgba(8,4,16,0.5)', borderRadius:'12px', padding:'12px', marginBottom:'20px' }}>
                {CREDIT_ACTIONS.map(a => (
                  <div key={a.action} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(192,38,211,0.08)', fontSize:'12px' }}>
                    <span style={{ color:T.text2 }}>{a.icon} {a.action}</span>
                    <span style={{ color:a.color, fontWeight:700, fontFamily:'monospace' }}>{a.cost} cr.</span>
                  </div>
                ))}
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'24px', textAlign:'left' }}>
                {PRO_FEATURES.slice(0,4).map(f => (
                  <div key={f} style={{ fontSize:'12px', color:'rgba(248,240,255,0.75)', display:'flex', alignItems:'flex-start', gap:'8px' }}>{f}</div>
                ))}
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <button onClick={goRegister}
                  style={{ width:'100%', background:'linear-gradient(135deg,#EC4899,#C026D3)', border:'none', color:'#fff', padding:'16px', borderRadius:'14px', fontSize:'15px', fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 0 24px rgba(192,38,211,0.4)' }}>
                  🎚️ Abrir el DAW — Gratis
                </button>
                <div style={{ display:'flex', gap:'8px', justifyContent:'center' }}>
                  <div style={{ background:'#0070BA', borderRadius:'8px', padding:'5px 12px', fontSize:'11px', fontWeight:700, color:'#fff', display:'flex', alignItems:'center', gap:'5px' }}>
                    <span>✓</span> Sin registro
                  </div>
                  <div style={{ background:'linear-gradient(135deg,#009EE3,#00B1EA)', borderRadius:'8px', padding:'5px 12px', fontSize:'11px', fontWeight:700, color:'#fff' }}>
                    ✓ Sin tarjeta
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ textAlign:'center', marginTop:'24px', fontSize:'12px', color:T.text3 }}>
            Sin registro · Sin tarjeta · Gratis para siempre
          </div>
        </div>
      </div>

      {/* ───── CÓMO FUNCIONA ───── */}
      <div style={{ padding:'80px 20px', background:'rgba(15,10,26,0.7)' }}>
        <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'48px' }}>
            <h2 style={{ fontSize:'clamp(30px,5vw,54px)', fontWeight:900, lineHeight:1.05, letterSpacing:'-1.5px', marginBottom:'16px' }}>
              En 3 pasos,<span style={GRAD}> profesional.</span>
            </h2>
            <p style={{ fontSize:'17px', color:T.text2, maxWidth:'480px', margin:'0 auto', lineHeight:1.6 }}>Sin instalar nada · Gratis para siempre · Exporta WAV 24-bit</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'20px' }}>
            {[
              { num:'1', icon:'🎵', color:'#EC4899', title:'Sube tus stems', sub:'WAV · MP3 · FLAC · hasta 12 pistas', desc:'Arrastra tus stems al Mixer. Sin registro, sin tarjeta. Empieza a mezclar en segundos.', badge:'100% Gratis' },
              { num:'2', icon:'🎛️', color:'#C026D3', title:'Mezcla con presets', sub:'EQ · Efectos · 9 géneros', desc:'Elige un preset de género (Pop, Rock, Gospel, etc.), ajusta el EQ master, agrega reverb/delay. Todos los ajustes en tiempo real.', badge:'9 presets incluidos' },
              { num:'3', icon:'🎚️', color:'#7C3AED', title:'Exporta profesional', sub:'-14 LUFS · WAV 24-bit · Spotify ready', desc:'Exporta en WAV 24-bit normalizado a -14 LUFS, listo para Spotify, YouTube o Apple Music. Suena profesional en cualquier dispositivo.', badge:'WAV 24-bit' },
            ].map((step,i) => (
              <div key={i} style={{ background:'rgba(26,16,40,0.9)', border:`1px solid ${step.color}22`, borderRadius:'20px', padding:'28px', borderTop:`3px solid ${step.color}`, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:'-20px', right:'-10px', fontSize:'100px', fontWeight:900, color:`${step.color}06`, lineHeight:1, userSelect:'none' }}>{step.num}</div>
                <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
                  <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:`linear-gradient(135deg,${step.color}30,${step.color}15)`, border:`1px solid ${step.color}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', flexShrink:0 }}>{step.icon}</div>
                  <div>
                    <h3 style={{ fontSize:'18px', fontWeight:800, color:T.text, marginBottom:'2px' }}>{step.title}</h3>
                    <div style={{ fontSize:'10px', fontWeight:700, color:step.color, fontFamily:'monospace', letterSpacing:'0.3px' }}>{step.sub}</div>
                  </div>
                </div>
                <p style={{ fontSize:'13px', color:T.text2, lineHeight:1.75, marginBottom:'16px' }}>{step.desc}</p>
                <span style={{ background:`${step.color}15`, border:`1px solid ${step.color}30`, borderRadius:'980px', padding:'4px 12px', fontSize:'11px', fontWeight:700, color:step.color }}>{step.badge}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign:'center', marginTop:'48px' }}>
            <button onClick={goRegister} style={{ ...S.ctaBtn, padding:'18px 48px', fontSize:'17px' }}>
              🎛️ Empezar gratis ahora
            </button>
            <div style={{ marginTop:'12px', fontSize:'12px', color:T.text3 }}>Sin registro · Sin tarjeta · Gratis para siempre</div>
          </div>
        </div>
      </div>

      {/* ───── IA EQ DEMO ───── */}
      <div style={{ background:'rgba(15,10,26,0.8)', borderTop:`1px solid ${T.border}`, padding:'80px 20px' }}>
        <div style={{ maxWidth:'900px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'36px' }}>
            <h2 style={S.sectionTitle}>IA EQ — escucha tu mezcla <span style={GRAD}>en cualquier dispositivo</span></h2>
            <p style={{ ...S.sectionSub, marginBottom:0 }}>12 bandas · presets por dispositivo · se exporta con tu mezcla a -10 LUFS</p>
          </div>
          <div style={{ background:'rgba(13,8,22,0.95)', border:`1px solid rgba(192,38,211,0.2)`, borderRadius:'20px', padding:'24px', overflow:'hidden' }}>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'7px', marginBottom:'20px' }}>
              {IAEQ_PRESETS_DEMO.map(p => (
                <button key={p.id} onClick={() => setDemoPreset(p)}
                  style={{ padding:'7px 16px', borderRadius:'980px', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'all 0.12s',
                    background: demoPreset.id===p.id ? 'rgba(192,38,211,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${demoPreset.id===p.id ? '#C026D3' : 'rgba(255,255,255,0.08)'}`,
                    color: demoPreset.id===p.id ? '#EC4899' : 'rgba(155,126,200,0.7)',
                    boxShadow: demoPreset.id===p.id ? '0 0 10px rgba(192,38,211,0.2)' : 'none',
                  }}>
                  {p.name}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:'4px', alignItems:'flex-end', overflowX:'auto', padding:'4px 0 10px' }}>
              {IAEQ_PRESETS_DEMO[0].bands.map((_,i) => {
                const val = demoPreset.bands[i] ?? 0;
                const pct = Math.round(((val+12)/24)*100);
                return (
                  <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', flex:1, minWidth:'36px' }}>
                    <span style={{ fontSize:'9px', color:val>0?T.green:val<0?'#EC4899':'rgba(155,126,200,0.4)', fontFamily:'monospace' }}>{val>0?'+':''}{val}</span>
                    <div style={{ width:'100%', height:'72px', background:'rgba(8,4,16,0.8)', borderRadius:'4px', border:'1px solid rgba(192,38,211,0.12)', position:'relative', overflow:'hidden' }}>
                      <div style={{ position:'absolute', top:'50%', left:0, right:0, height:'1px', background:'rgba(192,38,211,0.2)' }}></div>
                      <div style={{ position:'absolute', background:val>0?'linear-gradient(to top,#C026D3,#EC4899)':'linear-gradient(to bottom,#EC4899,#7C3AED)', borderRadius:'3px', left:'20%', right:'20%',
                        ...(val>=0?{bottom:'50%',height:`${Math.abs(val)/12*50}%`}:{top:'50%',height:`${Math.abs(val)/12*50}%`}),
                        transition:'height 0.25s ease,top 0.25s ease,bottom 0.25s ease'
                      }}></div>
                      <div style={{ position:'absolute', left:'50%', transform:'translate(-50%,-50%)', top:`${100-pct}%`, width:'10px', height:'10px', borderRadius:'50%', background:val===0?'rgba(155,126,200,0.5)':val>0?'#C026D3':'#EC4899', border:'2px solid rgba(255,255,255,0.2)', transition:'top 0.25s ease' }}></div>
                    </div>
                    <span style={{ fontSize:'8px', color:'rgba(155,126,200,0.5)', textAlign:'center' }}>{EQ_LABELS[i]}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display:'flex', gap:'5px', marginTop:'4px', flexWrap:'wrap' }}>
              {[{l:'Preamp',flex:'0 0 auto'},{l:'Bass: 30Hz–170Hz',flex:'1'},{l:'Mid: 310Hz–3kHz',flex:'1'},{l:'High: 6kHz–16kHz',flex:'1'}].map(({l,flex}) => (
                <div key={l} style={{ background:'rgba(192,38,211,0.06)', border:'1px solid rgba(192,38,211,0.12)', borderRadius:'6px', padding:'3px 10px', fontSize:'9px', fontWeight:700, color:'rgba(155,126,200,0.6)', flex, textAlign:'center', whiteSpace:'nowrap' }}>{l}</div>
              ))}
            </div>
            <div style={{ textAlign:'center', marginTop:'20px' }}>
              <button onClick={goRegister}
                style={{ background:'linear-gradient(135deg,#EC4899,#C026D3)', border:'none', color:'#fff', padding:'14px 32px', borderRadius:'980px', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 0 24px rgba(192,38,211,0.4)' }}>
                🎚️ Usar IA EQ gratis →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ───── PRESETS ───── */}
      <div style={{ background:'rgba(15,10,26,0.5)', padding:'80px 20px' }}>
        <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'48px' }}>
            <h2 style={S.sectionTitle}>9 presets de género, <span style={GRAD}>calibrados profesionalmente</span></h2>
            <p style={S.sectionSub}>Cada preset tiene su propio EQ, compresión, reverb y delay. Cambia en tiempo real y escucha la diferencia.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'14px' }}>
            {PRESETS.map(p => (
              <div key={p.id} onClick={goRegister}
                style={{ background:`linear-gradient(135deg,${p.color}18,${p.color}08)`, border:`1px solid ${p.color}33`, borderRadius:'14px', padding:'18px', cursor:'pointer', transition:'transform 0.15s', display:'flex', flexDirection:'column', gap:'10px' }}
                onMouseEnter={e => (e.currentTarget.style.transform='scale(1.03)')}
                onMouseLeave={e => (e.currentTarget.style.transform='scale(1)')}>
                <div style={{ height:'28px', display:'flex', alignItems:'flex-end', gap:'2px' }}>
                  {p.wavePattern.map((h,i) => <div key={i} style={{ flex:1, height:`${h*100}%`, background:p.color, borderRadius:'2px', opacity:0.8 }}></div>)}
                </div>
                <div>
                  <div style={{ fontSize:'15px', fontWeight:700, color:T.text }}>{p.name}</div>
                  <div style={{ fontSize:'12px', color:T.text2, marginTop:'3px' }}>{p.desc.split(',')[0]}</div>
                </div>
                <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'980px', background:`${p.color}22`, color:p.color }}>B:{p.bass>0?'+':''}{p.bass}</span>
                  <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'980px', background:`${p.color}22`, color:p.color }}>R:{Math.round(p.reverbWet*100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ───── TESTIMONIALS ───── */}
      <div style={{ ...S.section }}>
        <div style={{ textAlign:'center', marginBottom:'48px' }}>
          <h2 style={S.sectionTitle}>Lo que dicen los <span style={GRAD}>músicos reales</span></h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'20px' }}>
          {TESTIMONIALS.map((t,i) => (
            <div key={i} style={S.card}>
              <div style={{ display:'flex', gap:'4px', marginBottom:'12px' }}>
                {'★★★★★'.split('').map((s,j) => <span key={j} style={{ color:'#FBBF24', fontSize:'14px' }}>{s}</span>)}
              </div>
              <p style={{ fontSize:'14px', color:'rgba(248,240,255,0.8)', lineHeight:1.7, marginBottom:'16px', fontStyle:'italic' }}>"{t.text}"</p>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ width:'38px', height:'38px', borderRadius:'50%', background:'linear-gradient(135deg,#EC4899,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:700 }}>{t.name[0]}</div>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:700, color:T.text }}>{t.name} {t.country}</div>
                  <div style={{ fontSize:'11px', color:'#9B7EC8' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ───── PREMIO GLOBAL RECOGNITION AWARD ───── */}
      <div style={{ background:'linear-gradient(135deg,rgba(36,22,54,0.95),rgba(124,58,237,0.2))', borderTop:`1px solid rgba(192,38,211,0.3)`, borderBottom:`1px solid rgba(192,38,211,0.3)`, padding:'80px 20px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'600px', height:'600px', background:'radial-gradient(circle, rgba(217,70,239,0.15) 0%, transparent 70%)', borderRadius:'50%', filter:'blur(60px)', pointerEvents:'none' }}/>
        
        <div style={{ maxWidth:'1100px', margin:'0 auto', position:'relative', zIndex:1 }}>
          <div style={{ textAlign:'center', marginBottom:'48px' }}>
            <div style={{ display:'inline-block', padding:'8px 20px', background:'rgba(217,70,239,0.15)', border:`1px solid rgba(217,70,239,0.3)`, borderRadius:'980px', marginBottom:'16px', fontSize:'12px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'#D946EF' }}>
              🏆 Premio Global 2026
            </div>
            <h2 style={{ fontSize:'clamp(32px,5vw,48px)', fontWeight:900, letterSpacing:'-1px', marginBottom:'16px', lineHeight:1.1 }}>
              Reconocidos con el <span style={GRAD}>Global Recognition Award</span>
            </h2>
            <p style={{ fontSize:'18px', color:T.text2, maxWidth:'700px', margin:'0 auto 40px', lineHeight:1.6 }}>
              MixingMusic.AI ha sido galardonado entre el top <strong style={{color:'#D946EF'}}>5.8%</strong> de 15,000 participantes globales por innovación en producción musical con inteligencia artificial
            </p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:'24px', marginBottom:'40px' }}>
            <img src="/awards/winner3.png" alt="Global Recognition Award 2026 Winner" style={{ width:'100%', height:'auto', borderRadius:'16px', boxShadow:'0 20px 60px rgba(0,0,0,0.4)', border:`1px solid rgba(217,70,239,0.2)` }} />
            <img src="/awards/winner2.jpg" alt="Global Recognition Award Certificate" style={{ width:'100%', height:'auto', borderRadius:'16px', boxShadow:'0 20px 60px rgba(0,0,0,0.4)', border:`1px solid rgba(217,70,239,0.2)` }} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))', gap:'20px', marginBottom:'40px' }}>
            {[
              { icon:'🌍', title:'Reconocimiento Internacional', desc:'Evaluación rigurosa por panel independiente de expertos' },
              { icon:'📊', title:'Top 5.8% Global', desc:'Solo 870 de 15,000 participantes recibieron este honor' },
              { icon:'✨', title:'Innovación + Impacto', desc:'Calificaciones perfectas 5/5 en todas las dimensiones evaluadas' },
              { icon:'🎯', title:'Modelo Rasch', desc:'Metodología científica de medición objetiva y comparación justa' }
            ].map((item,i) => (
              <div key={i} style={{ ...S.card, padding:'24px', textAlign:'center' }}>
                <div style={{ fontSize:'32px', marginBottom:'12px' }}>{item.icon}</div>
                <h3 style={{ fontSize:'16px', fontWeight:700, color:T.text, marginBottom:'8px' }}>{item.title}</h3>
                <p style={{ fontSize:'13px', color:T.text2, lineHeight:1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign:'center' }}>
            <button onClick={() => navigate('/blog/mixingmusic-ai-gana-premio-global-recognition-2026')} style={{ ...S.ctaBtn, padding:'16px 36px', fontSize:'16px', display:'inline-flex', alignItems:'center', gap:'8px' }}>
              📰 Leer el anuncio completo
            </button>
          </div>
        </div>
      </div>

      {/* ───── ÚLTIMAS NOTICIAS Y BLOG ───── */}
      <div style={{ background:'rgba(15,10,26,0.5)', padding:'80px 20px' }}>
        <div style={{ maxWidth:'1100px', margin:'0 auto' }}>
          
          {/* Destacado del Premio */}
          <div style={{ marginBottom:'60px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'24px' }}>
              <div style={{ width:'4px', height:'24px', background:'linear-gradient(135deg,#D946EF,#A855F7)', borderRadius:'980px' }}/>
              <h2 style={{ fontSize:'28px', fontWeight:800 }}>
                <span style={GRAD}>Última Noticia</span>
              </h2>
            </div>
            <div style={{ ...S.card, padding:'0', overflow:'hidden', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0', cursor:'pointer' }} onClick={() => navigate('/blog/mixingmusic-ai-gana-premio-global-recognition-2026')}>
              <img src="/awards/winner3.png" alt="Premio Global Recognition Award" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              <div style={{ padding:'32px' }}>
                <div style={{ display:'inline-block', padding:'6px 14px', background:'rgba(217,70,239,0.15)', border:`1px solid rgba(217,70,239,0.3)`, borderRadius:'980px', marginBottom:'16px', fontSize:'11px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'#D946EF' }}>
                  🏆 PREMIO GLOBAL
                </div>
                <h3 style={{ fontSize:'24px', fontWeight:800, color:T.text, lineHeight:1.3, marginBottom:'12px' }}>
                  MixingMusic.AI gana el Global Recognition Award 2026
                </h3>
                <p style={{ fontSize:'15px', color:T.text2, lineHeight:1.7, marginBottom:'20px' }}>
                  Reconocidos entre el top 5.8% de 15,000 participantes globales por nuestra innovación en producción musical con IA. Calificaciones perfectas en todas las dimensiones evaluadas.
                </p>
                <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                  <span style={{ fontSize:'13px', color:'#9B7EC8' }}>⏱ 8 min lectura</span>
                  <span style={{ fontSize:'13px', color:'#9B7EC8' }}>📅 19 mayo 2026</span>
                  <span style={{ color:'#D946EF', fontWeight:700, marginLeft:'auto' }}>Leer artículo →</span>
                </div>
              </div>
            </div>
          </div>

          {/* Artículos Recientes */}
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'32px', flexWrap:'wrap', gap:'16px' }}>
            <div>
              <h3 style={{ fontSize:'24px', fontWeight:800, color:T.text, marginBottom:'8px' }}>
                Artículos <span style={GRAD}>Recientes</span>
              </h3>
              <p style={{ fontSize:'15px', color:T.text2 }}>Guías, tutoriales y análisis del mundo del audio con IA</p>
            </div>
            <button onClick={() => navigate('/blog')} style={{ color:'#C026D3', fontSize:'14px', fontWeight:600, textDecoration:'none', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Ver todos los artículos →</button>
          </div>
          
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'20px' }}>
            {[...blogArticles2026, ...blogArticles].slice(1, 7).map((article,i) => (
              <div key={i} onClick={() => navigate(`/blog/${article.slug}`)}
                style={{ ...S.card, textDecoration:'none', display:'block', transition:'transform 0.15s', cursor:'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.transform='translateY(-4px)')}
                onMouseLeave={e => (e.currentTarget.style.transform='translateY(0)')}>
                <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'0.8px', textTransform:'uppercase', color:'#C026D3', marginBottom:'10px' }}>{article.categoryNameEs||article.categoryName}</div>
                <h3 style={{ fontSize:'16px', fontWeight:700, color:T.text, lineHeight:1.4, marginBottom:'10px' }}>{article.titleEs||article.title}</h3>
                <p style={{ fontSize:'13px', color:T.text2, lineHeight:1.6, marginBottom:'16px' }}>{(article.excerptEs||article.excerpt).slice(0,110)}...</p>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:'12px', color:'#9B7EC8' }}>
                  <span>⏱ {article.readTime} min lectura</span>
                  <span style={{ color:'#C026D3', fontWeight:600 }}>Leer →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ───── FAQ ───── */}
      <div style={{ ...S.section }}>
        <div style={{ textAlign:'center', marginBottom:'48px' }}>
          <h2 style={S.sectionTitle}>¿Por qué mezclar con <span style={GRAD}>Inteligencia Artificial?</span></h2>
          <p style={S.sectionSub}>Todo lo que necesitas saber antes de tu primera canción</p>
        </div>
        <div style={{ maxWidth:'720px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'12px' }}>
          {FAQ_ITEMS.map((item,i) => (
            <div key={i} style={{ ...S.card, padding:'0', overflow:'hidden' }}>
              <button onClick={() => setOpenFaq(openFaq===i?null:i)}
                style={{ width:'100%', background:'none', border:'none', padding:'20px 24px', textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px', fontFamily:'inherit' }}>
                <span style={{ fontSize:'15px', fontWeight:600, color:T.text, lineHeight:1.4 }}>{item.q}</span>
                <span style={{ color:'#C026D3', fontSize:'20px', flexShrink:0, transition:'transform 0.2s', transform:openFaq===i?'rotate(45deg)':'rotate(0)' }}>+</span>
              </button>
              {openFaq===i && (
                <div style={{ padding:'0 24px 20px', fontSize:'14px', color:T.text2, lineHeight:1.8, borderTop:`1px solid ${T.border}` }}>
                  <p style={{ marginTop:'16px' }}>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ───── CTA FINAL ───── */}
      <div style={{ background:'linear-gradient(135deg,rgba(36,22,54,0.9),rgba(124,58,237,0.15))', borderTop:`1px solid rgba(192,38,211,0.2)`, padding:'100px 20px', textAlign:'center' }}>
        <h2 style={{ fontSize:'clamp(28px,5vw,52px)', fontWeight:900, letterSpacing:'-1px', marginBottom:'16px', lineHeight:1.1 }}>
          Mezcla, genera, separa, crea.<br/><span style={GRAD}>Todo con IA. Gratis.</span>
        </h2>
        <p style={{ fontSize:'17px', color:T.text2, marginBottom:'36px', maxWidth:'500px', margin:'0 auto 36px' }}>
          Únete a más de 47,000 músicos que ya mezclan profesionalmente en el browser.<br/>Completamente gratis · Sin instalaciones.
        </p>
        <button onClick={goRegister} style={{ ...S.ctaBtn, padding:'18px 48px', fontSize:'18px' }}>
          🎛️ Empezar gratis ahora
        </button>
        <div style={{ marginTop:'16px', fontSize:'12px', color:T.text3 }}>Sin tarjeta · Sin registro · Sin límites</div>
      </div>

      {/* ───── FOOTER ───── */}
      <div style={{ background:'rgba(8,4,16,0.9)', borderTop:`1px solid ${T.border}`, padding:'40px 20px' }}>
        <div style={{ maxWidth:'1100px', margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'20px' }}>
          <div>
            <div style={{ fontSize:'18px', fontWeight:800, ...GRAD }}>mixingmusic.ai</div>
            <div style={{ fontSize:'12px', color:T.text3, marginTop:'4px' }}>Mezcla · Genera · Separa · Instrumentos — todo con IA</div>
          </div>
          <div style={{ display:'flex', gap:'24px', flexWrap:'wrap' }}>
            {[['Blog','/blog'],['Privacidad','/privacy'],['Términos','/terms']].map(([label,href]) => (
              <a key={href} href={href} style={{ color:'rgba(248,240,255,0.45)', fontSize:'13px', textDecoration:'none' }}>{label}</a>
            ))}
          </div>
          <div style={{ fontSize:'12px', color:T.text3 }}>© 2026 MixingMusic.AI</div>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
