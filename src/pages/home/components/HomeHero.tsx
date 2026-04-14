import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MixPreset, PRESETS } from './PresetScreen';
import { blogArticles } from '../../../mocks/blogArticles';

interface HomeHeroProps { onStartMixer: (preset: MixPreset, files: File[]) => void; }

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

const TESTIMONIALS = [
  { name:'Carlos M.', role:'Productor Gospel', country:'🇨🇴', text:'Subí 10 stems de mi coro y en 3 minutos tenía una mezcla lista para radio. Increíble.', stars:5 },
  { name:'Valeria R.', role:'Cantautora', country:'🇲🇽', text:'Nunca pensé que podría tener calidad de estudio sin pagar miles de dólares. MixingMusic.AI cambió todo.', stars:5 },
  { name:'DJ Fontana', role:'DJ / Productor EDM', country:'🇦🇷', text:'El preset Dance/EDM está brutal. Los -10 LUFS suenan perfecto en Spotify desde el primer intento.', stars:5 },
  { name:'Pastor Reyes', role:'Director Musical', country:'🇵🇪', text:'Lo uso cada domingo para mezclar el ensayo del coro. La reverb de gospel es exactamente lo que necesitaba.', stars:5 },
  { name:'Ana Sofía T.', role:'Artista Indie', country:'🇨🇱', text:'El IA EQ me dejó escuchar cómo suena mi mezcla en cada dispositivo antes de descargar. Genial.', stars:5 },
  { name:'Marcos L.', role:'Ingeniero de Audio', country:'🇧🇷', text:'Los LUFS integrados son reales. El limiter hace su trabajo. Para una herramienta gratuita es sorprendente.', stars:5 },
];

const FAQ_ITEMS = [
  { q:'¿Por qué mezclar con IA en lugar de un ingeniero humano?', a:'Un ingeniero profesional cobra entre $500 y $3,000 por mezcla. Nuestra IA aplica las mismas técnicas en 3 minutos, completamente gratis. Para demos, proyectos independientes y música para streaming, la diferencia es indetectable.' },
  { q:'¿Qué formatos de audio acepta MixingMusic.AI?', a:'Acepta WAV, MP3, FLAC, AAC y M4A. Puedes subir hasta 12 stems simultáneamente. Recomendamos WAV 24-bit para mejor calidad en la exportación final.' },
  { q:'¿Qué significa -10 LUFS y por qué importa?', a:'LUFS es el estándar de volumen para plataformas de streaming. Spotify normaliza a -10 LUFS, YouTube a -13 LUFS. Si tu canción supera ese nivel, la plataforma la baja automáticamente y suena peor. Nuestra IA exporta siempre en el rango correcto.' },
  { q:'¿Cómo funciona el IA EQ?', a:'El IA EQ tiene 12 bandas (30Hz a 16kHz) con presets optimizados para cada dispositivo: Car, iPhone, MacBook, Headphones, TV, Home Theater, Bluetooth Speaker, Studio Monitors, Gaming Headset y Tablet. Escuchas el cambio en tiempo real y la exportación incluye el EQ aplicado a -10 LUFS.' },
  { q:'¿Cuánto cuesta?', a:'La primera mezcla es 100% gratis al registrarte. Después puedes obtener mezclas ilimitadas por $3.99. Puedes pagar con PayPal o Mercado Pago.' },
  { q:'¿Qué es el Mix Bus Master?', a:'Es el canal master donde se aplican todos los efectos finales: EQ, compresión, reverb, delay, IA EQ y el limiter anti-clipping. Es la misma arquitectura que usan los DAW profesionales como Pro Tools y Logic Pro.' },
];

const STATS = [
  { num:'47,832', label:'Mezclas generadas', icon:'🎛️' },
  { num:'-10 LUFS', label:'Estándar Spotify garantizado', icon:'🎵' },
  { num:'10', label:'Presets IA EQ por dispositivo', icon:'🎚️' },
  { num:'$3.99', label:'Mezclas ilimitadas', icon:'∞' },
];

// Pricing features list
const PRICING_FEATURES = [
  '✦ Mezclas ilimitadas sin restricciones',
  '🎚️ IA EQ 12 bandas · Car, iPhone, TV, Studio y más',
  '🎛️ 9 presets de género (Pop, Rock, Gospel, EDM…)',
  '📁 Descarga WAV 24-bit + MP3',
  '⚡ Exportación a -10 LUFS (listo para Spotify)',
  '🔇 Reducción de ruido + Compresor IA',
  '🎵 Hasta 12 stems simultáneos',
];

export default function HomeHero({ onStartMixer }: HomeHeroProps) {
  const [openFaq, setOpenFaq] = useState<number|null>(null);
  const navigate = useNavigate();
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [demoPreset, setDemoPreset] = useState(IAEQ_PRESETS_DEMO[0]);
  const recentArticles = blogArticles.slice(0,3);

  useEffect(() => {
    document.body.classList.add('page-home');
    return () => document.body.classList.remove('page-home');
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if(e.isIntersecting) setStatsVisible(true); }, {threshold:0.3});
    if(statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  // ALL CTAs → /auth/register
  const goRegister = () => navigate('/auth/register');

  const S = {
    section: {padding:'80px 20px',maxWidth:'1100px',margin:'0 auto'} as React.CSSProperties,
    sectionTitle: {fontSize:'clamp(28px,4vw,42px)',fontWeight:800,color:'#F8F0FF',letterSpacing:'-1px',marginBottom:'12px',lineHeight:1.15} as React.CSSProperties,
    sectionSub: {fontSize:'17px',color:'rgba(248,240,255,0.6)',marginBottom:'48px',lineHeight:1.6} as React.CSSProperties,
    grad: {background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'} as React.CSSProperties,
    card: {background:'rgba(26,16,40,0.82)',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'16px',padding:'24px'} as React.CSSProperties,
    ctaBtn: {background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',border:'none',color:'#fff',borderRadius:'980px',fontWeight:900,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 0 40px rgba(192,38,211,0.55)',display:'inline-flex',alignItems:'center',gap:'10px'} as React.CSSProperties,
  };

  return (
    <div style={{minHeight:'100vh',color:'#F8F0FF',fontFamily:"'Outfit',system-ui,sans-serif"}}>

      {/* ───── HERO ───── */}
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'100px 20px 60px',textAlign:'center',position:'relative'}}>
        <div style={{marginBottom:'32px'}}>
          <img src="/logo-brand.png" alt="mixingmusic.ai" style={{height:'clamp(44px,6vw,72px)',width:'auto',maxWidth:'480px'}}/>
        </div>
        <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.25)',borderRadius:'980px',padding:'6px 16px',fontSize:'13px',color:'#4ade80',fontWeight:700,marginBottom:'24px',letterSpacing:'0.3px'}}>
          <span style={{width:'7px',height:'7px',borderRadius:'50%',background:'#4ade80',display:'inline-block',animation:'pulse 2s infinite'}}></span>
          ✅ Listo para Spotify · Apple Music · YouTube Music
        </div>
        <h1 style={{fontSize:'clamp(36px,6.5vw,76px)',fontWeight:900,lineHeight:1.05,letterSpacing:'-2px',marginBottom:'16px',maxWidth:'920px'}}>
          Tu próxima mezcla<br/>
          <span style={S.grad}>con IA Mixing + EQ</span>
          <span style={{color:'#F8F0FF'}}>, lista en</span>{' '}
          <span style={{color:'#F59E0B'}}>3 minutos</span>
        </h1>
        <p style={{fontSize:'clamp(16px,2.2vw,19px)',color:'rgba(248,240,255,0.6)',maxWidth:'580px',lineHeight:1.7,marginBottom:'40px'}}>
          Regístrate, sube tus stems y nuestra IA los mezcla con calidad de estudio.<br/>
          Sin instalar nada · 1 mezcla gratis · $3.99 ilimitadas
        </p>
        <div style={{display:'flex',gap:'14px',flexWrap:'wrap',justifyContent:'center',marginBottom:'60px'}}>
          {/* PRIMARY CTA → register */}
          <button onClick={goRegister}
            style={{...S.ctaBtn,padding:'20px 52px',fontSize:'20px',letterSpacing:'-0.3px'}}>
            🎛️ Comenzar gratis
          </button>
          <a href="#como-funciona" style={{background:'transparent',border:'1px solid rgba(192,38,211,0.3)',color:'#9B7EC8',padding:'16px 32px',borderRadius:'980px',fontSize:'16px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',textDecoration:'none',display:'flex',alignItems:'center'}}>
            Ver cómo funciona ↓
          </a>
        </div>

        {/* Mixer preview */}
        <div style={{width:'100%',maxWidth:'780px',background:'rgba(15,10,26,0.8)',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'20px',overflow:'hidden',boxShadow:'0 40px 80px rgba(0,0,0,0.6)'}}>
          <div style={{background:'rgba(26,16,40,0.9)',padding:'10px 16px',borderBottom:'1px solid rgba(192,38,211,0.1)',display:'flex',alignItems:'center',gap:'6px'}}>
            {['#EF4444','#FBBF24','#4ade80'].map(c=><div key={c} style={{width:'10px',height:'10px',borderRadius:'50%',background:c}}></div>)}
            <span style={{marginLeft:'8px',fontSize:'12px',color:'#9B7EC8'}}>Mezclador AI Pro — mixingmusic.ai</span>
          </div>
          <div style={{padding:'20px',display:'grid',gridTemplateColumns:'repeat(9,1fr)',gap:'6px'}}>
            {PRESETS.map(p=>(
              <div key={p.id} style={{background:`${p.color}18`,border:`1px solid ${p.color}44`,borderRadius:'8px',padding:'8px 4px',textAlign:'center',cursor:'pointer'}} onClick={goRegister}>
                <div style={{height:'20px',display:'flex',alignItems:'flex-end',gap:'1px',marginBottom:'5px'}}>
                  {p.wavePattern.slice(0,6).map((h,i)=><div key={i} style={{flex:1,height:`${h*100}%`,background:p.color,borderRadius:'1px'}}></div>)}
                </div>
                <div style={{fontSize:'9px',color:'#F8F0FF',fontWeight:700}}>{p.name}</div>
              </div>
            ))}
          </div>
          <div style={{padding:'12px 20px',background:'rgba(8,4,16,0.5)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:'11px',color:'#9B7EC8'}}>✦ Gospel activo · -10 LUFS · Safe ✓</span>
            <button onClick={goRegister} style={{background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'7px 16px',borderRadius:'980px',fontSize:'11px',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>Usar gratis →</button>
          </div>
        </div>
      </div>

      {/* ───── STATS ───── */}
      <div ref={statsRef} style={{background:'rgba(26,16,40,0.6)',borderTop:'1px solid rgba(192,38,211,0.1)',borderBottom:'1px solid rgba(192,38,211,0.1)',padding:'40px 20px'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'32px'}}>
          {STATS.map((s,i)=>(
            <div key={i} style={{textAlign:'center',opacity:statsVisible?1:0,transform:statsVisible?'translateY(0)':'translateY(20px)',transition:`all 0.6s ease ${i*0.1}s`}}>
              <div style={{fontSize:'36px',marginBottom:'4px'}}>{s.icon}</div>
              <div style={{fontSize:'clamp(22px,3vw,32px)',fontWeight:800,...S.grad}}>{s.num}</div>
              <div style={{fontSize:'13px',color:'rgba(248,240,255,0.5)',marginTop:'4px'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ───── PRICING — justo debajo del hero ───── */}
      <div style={{padding:'80px 20px',background:'linear-gradient(135deg,rgba(26,12,46,0.97),rgba(36,18,58,0.95))'}}>
        <div style={{maxWidth:'900px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <h2 style={{...S.sectionTitle}}>Simple, sin sorpresas. <span style={S.grad}>Un solo precio.</span></h2>
            <p style={{...S.sectionSub,marginBottom:0}}>Empieza gratis, paga solo cuando quieras más.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'24px',alignItems:'start'}}>

            {/* FREE */}
            <div style={{background:'rgba(26,16,40,0.8)',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'24px',padding:'32px',textAlign:'center'}}>
              <div style={{fontSize:'13px',fontWeight:700,letterSpacing:'1px',color:'#9B7EC8',textTransform:'uppercase',marginBottom:'12px'}}>Gratis</div>
              <div style={{fontSize:'48px',fontWeight:900,color:'#F8F0FF',lineHeight:1,marginBottom:'6px'}}>$0</div>
              <div style={{fontSize:'13px',color:'rgba(155,126,200,0.6)',marginBottom:'28px'}}>para siempre</div>
              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'28px',textAlign:'left'}}>
                {['✓ 1 mezcla completa gratis','✓ WAV 24-bit + MP3','✓ Todos los presets de género','✓ IA EQ preview (sin exportar)'].map(f=>(
                  <div key={f} style={{fontSize:'13px',color:'rgba(248,240,255,0.7)',display:'flex',alignItems:'center',gap:'8px'}}>{f}</div>
                ))}
              </div>
              <button onClick={goRegister}
                style={{width:'100%',background:'transparent',border:'1px solid rgba(192,38,211,0.35)',color:'#C026D3',padding:'14px',borderRadius:'14px',fontSize:'14px',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                Crear cuenta gratis
              </button>
            </div>

            {/* PRO — destacado */}
            <div style={{background:'linear-gradient(135deg,rgba(36,18,58,0.98),rgba(20,10,36,0.98))',border:'2px solid #C026D3',borderRadius:'24px',padding:'32px',textAlign:'center',position:'relative',boxShadow:'0 0 48px rgba(192,38,211,0.25)'}}>
              <div style={{position:'absolute',top:'-14px',left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#EC4899,#C026D3)',borderRadius:'980px',padding:'4px 18px',fontSize:'11px',fontWeight:800,color:'#fff',whiteSpace:'nowrap'}}>
                ✦ MÁS POPULAR
              </div>
              <div style={{fontSize:'13px',fontWeight:700,letterSpacing:'1px',color:'#EC4899',textTransform:'uppercase',marginBottom:'12px'}}>Ilimitado</div>
              <div style={{fontSize:'48px',fontWeight:900,color:'#F8F0FF',lineHeight:1,marginBottom:'4px'}}>$3.99</div>
              <div style={{fontSize:'13px',color:'rgba(155,126,200,0.6)',marginBottom:'28px'}}>pago único · acceso permanente</div>
              <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'28px',textAlign:'left'}}>
                {PRICING_FEATURES.map(f=>(
                  <div key={f} style={{fontSize:'13px',color:'rgba(248,240,255,0.85)',display:'flex',alignItems:'flex-start',gap:'8px'}}>{f}</div>
                ))}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                <button onClick={goRegister}
                  style={{width:'100%',background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'16px',borderRadius:'14px',fontSize:'15px',fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 0 24px rgba(192,38,211,0.4)'}}>
                  🎛️ Empezar — $3.99
                </button>
                <div style={{display:'flex',gap:'8px',justifyContent:'center'}}>
                  <div style={{background:'#0070BA',borderRadius:'8px',padding:'5px 12px',fontSize:'11px',fontWeight:700,color:'#fff',display:'flex',alignItems:'center',gap:'5px'}}>
                    <span>P</span> PayPal
                  </div>
                  <div style={{background:'linear-gradient(135deg,#009EE3,#00B1EA)',borderRadius:'8px',padding:'5px 12px',fontSize:'11px',fontWeight:700,color:'#fff'}}>
                    💳 Mercado Pago
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{textAlign:'center',marginTop:'24px',fontSize:'12px',color:'rgba(155,126,200,0.4)'}}>
            Sin suscripción mensual · Pago único · Acceso permanente · SSL seguro
          </div>
        </div>
      </div>

      {/* ───── CÓMO FUNCIONA ───── */}
      <div id="como-funciona" style={{padding:'80px 20px',background:'rgba(15,10,26,0.7)'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <h2 style={{fontSize:'clamp(30px,5vw,54px)',fontWeight:900,lineHeight:1.05,letterSpacing:'-1.5px',marginBottom:'16px'}}>
              Sube tus stems,{' '}<span style={S.grad}>mezcla con IA.</span><br/>
              <span style={{color:'#F8F0FF'}}>¡Así de fácil!</span>
            </h2>
            <p style={{fontSize:'17px',color:'rgba(248,240,255,0.5)',maxWidth:'480px',margin:'0 auto',lineHeight:1.6}}>Sin instalar nada · 1 mezcla gratis · $3.99 ilimitadas</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'20px'}}>
            {[
              {num:'1',icon:'🎵',color:'#EC4899',title:'Regístrate y sube tus stems',sub:'WAV · MP3 · FLAC · hasta 12 pistas',desc:'Crea tu cuenta gratis. La IA detecta cada instrumento — voz, batería, bajo, guitarra, piano — y los organiza automáticamente.',badge:'Auto-detección IA'},
              {num:'2',icon:'🎛️',color:'#C026D3',title:'Mezcla con IA',sub:'EQ · Compresor · Reverb · -10 LUFS',desc:'9 presets de género calibrados profesionalmente. Ajusta faders, mute por pista y edición manual de dB en tiempo real.',badge:'9 presets de género'},
              {num:'3',icon:'🎚️',color:'#7C3AED',title:'IA EQ por dispositivo',sub:'Car · iPhone · Headphones · Studio · +7 más',desc:'Escucha tu mezcla tal como sonaría en cada dispositivo. Descarga con el EQ aplicado a -10 LUFS WAV 24-bit.',badge:'IA EQ 12 bandas'},
            ].map((step,i)=>(
              <div key={i} style={{background:'rgba(26,16,40,0.9)',border:`1px solid ${step.color}22`,borderRadius:'20px',padding:'28px',borderTop:`3px solid ${step.color}`,position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:'-20px',right:'-10px',fontSize:'100px',fontWeight:900,color:`${step.color}06`,lineHeight:1,userSelect:'none'}}>{step.num}</div>
                <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px'}}>
                  <div style={{width:'52px',height:'52px',borderRadius:'14px',background:`linear-gradient(135deg,${step.color}30,${step.color}15)`,border:`1px solid ${step.color}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',flexShrink:0}}>{step.icon}</div>
                  <div>
                    <h3 style={{fontSize:'18px',fontWeight:800,color:'#F8F0FF',marginBottom:'2px'}}>{step.title}</h3>
                    <div style={{fontSize:'10px',fontWeight:700,color:step.color,fontFamily:'monospace',letterSpacing:'0.3px'}}>{step.sub}</div>
                  </div>
                </div>
                <p style={{fontSize:'13px',color:'rgba(248,240,255,0.62)',lineHeight:1.75,marginBottom:'16px'}}>{step.desc}</p>
                <span style={{background:`${step.color}15`,border:`1px solid ${step.color}30`,borderRadius:'980px',padding:'4px 12px',fontSize:'11px',fontWeight:700,color:step.color}}>{step.badge}</span>
              </div>
            ))}
          </div>
          <div style={{textAlign:'center',marginTop:'48px'}}>
            <button onClick={goRegister}
              style={{...S.ctaBtn,padding:'18px 48px',fontSize:'17px'}}>
              🎛️ Empezar gratis ahora
            </button>
            <div style={{marginTop:'12px',fontSize:'12px',color:'rgba(248,240,255,0.3)'}}>1 mezcla gratis al registrarte · $3.99 ilimitadas · PayPal & Mercado Pago</div>
          </div>
        </div>
      </div>

      {/* ───── IA EQ DEMO ───── */}
      <div style={{background:'rgba(15,10,26,0.8)',borderTop:'1px solid rgba(192,38,211,0.1)',padding:'80px 20px'}}>
        <div style={{maxWidth:'900px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'36px'}}>
            <h2 style={{...S.sectionTitle}}>IA EQ — escucha tu mezcla <span style={S.grad}>en cualquier dispositivo</span></h2>
            <p style={{...S.sectionSub,marginBottom:'0'}}>12 bandas · presets por dispositivo · se exporta con tu mezcla a -10 LUFS</p>
          </div>
          <div style={{background:'rgba(13,8,22,0.95)',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'20px',padding:'24px',overflow:'hidden'}}>
            <div style={{display:'flex',flexWrap:'wrap',gap:'7px',marginBottom:'20px'}}>
              {IAEQ_PRESETS_DEMO.map(p=>(
                <button key={p.id} onClick={()=>setDemoPreset(p)}
                  style={{padding:'7px 16px',borderRadius:'980px',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all 0.12s',
                    background:demoPreset.id===p.id?'rgba(192,38,211,0.2)':'rgba(255,255,255,0.04)',
                    border:`1px solid ${demoPreset.id===p.id?'#C026D3':'rgba(255,255,255,0.08)'}`,
                    color:demoPreset.id===p.id?'#EC4899':'rgba(155,126,200,0.7)',
                    boxShadow:demoPreset.id===p.id?'0 0 10px rgba(192,38,211,0.2)':'none'}}>
                  {p.name}
                </button>
              ))}
            </div>
            <div style={{display:'flex',gap:'4px',alignItems:'flex-end',overflowX:'auto',padding:'4px 0 10px'}}>
              {IAEQ_PRESETS_DEMO[0].bands.map((_,i)=>{
                const val = demoPreset.bands[i] ?? 0;
                const pct = Math.round(((val+12)/24)*100);
                return(
                  <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',flex:1,minWidth:'36px'}}>
                    <span style={{fontSize:'9px',color:val>0?'#4ade80':val<0?'#EC4899':'rgba(155,126,200,0.4)',fontFamily:'monospace'}}>{val>0?'+':''}{val}</span>
                    <div style={{width:'100%',height:'72px',background:'rgba(8,4,16,0.8)',borderRadius:'4px',border:'1px solid rgba(192,38,211,0.12)',position:'relative',overflow:'hidden'}}>
                      <div style={{position:'absolute',top:'50%',left:0,right:0,height:'1px',background:'rgba(192,38,211,0.2)'}}></div>
                      <div style={{position:'absolute',background:val>0?'linear-gradient(to top,#C026D3,#EC4899)':'linear-gradient(to bottom,#EC4899,#7C3AED)',borderRadius:'3px',left:'20%',right:'20%',
                        ...(val>=0?{bottom:'50%',height:`${Math.abs(val)/12*50}%`}:{top:'50%',height:`${Math.abs(val)/12*50}%`}),
                        transition:'height 0.25s ease,top 0.25s ease,bottom 0.25s ease'}}></div>
                      <div style={{position:'absolute',left:'50%',transform:'translate(-50%,-50%)',top:`${100-pct}%`,width:'10px',height:'10px',borderRadius:'50%',background:val===0?'rgba(155,126,200,0.5)':val>0?'#C026D3':'#EC4899',border:'2px solid rgba(255,255,255,0.2)',transition:'top 0.25s ease'}}></div>
                    </div>
                    <span style={{fontSize:'8px',color:'rgba(155,126,200,0.5)',textAlign:'center'}}>{EQ_LABELS[i]}</span>
                  </div>
                );
              })}
            </div>
            <div style={{display:'flex',gap:'5px',marginTop:'4px',flexWrap:'wrap'}}>
              {[{l:'Preamp',flex:'0 0 auto'},{l:'Bass: 30Hz–170Hz',flex:'1'},{l:'Mid: 310Hz–3kHz',flex:'1'},{l:'High: 6kHz–16kHz',flex:'1'}].map(({l,flex})=>(
                <div key={l} style={{background:'rgba(192,38,211,0.06)',border:'1px solid rgba(192,38,211,0.12)',borderRadius:'6px',padding:'3px 10px',fontSize:'9px',fontWeight:700,color:'rgba(155,126,200,0.6)',flex,textAlign:'center',whiteSpace:'nowrap'}}>{l}</div>
              ))}
            </div>
            <div style={{textAlign:'center',marginTop:'20px'}}>
              <button onClick={goRegister}
                style={{background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'14px 32px',borderRadius:'980px',fontSize:'14px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 0 24px rgba(192,38,211,0.4)'}}>
                🎚️ Usar IA EQ gratis →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ───── PRESETS ───── */}
      <div style={{background:'rgba(15,10,26,0.5)',padding:'80px 20px'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'48px'}}>
            <h2 style={S.sectionTitle}>9 presets de género, <span style={S.grad}>calibrados profesionalmente</span></h2>
            <p style={S.sectionSub}>Cada preset tiene su propio EQ, compresión, reverb y delay. Cambia en tiempo real y escucha la diferencia.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'14px'}}>
            {PRESETS.map(p=>(
              <div key={p.id} onClick={goRegister} style={{background:`linear-gradient(135deg,${p.color}18,${p.color}08)`,border:`1px solid ${p.color}33`,borderRadius:'14px',padding:'18px',cursor:'pointer',transition:'transform 0.15s',display:'flex',flexDirection:'column',gap:'10px'}}
                onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.03)')}
                onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}>
                <div style={{height:'28px',display:'flex',alignItems:'flex-end',gap:'2px'}}>
                  {p.wavePattern.map((h,i)=><div key={i} style={{flex:1,height:`${h*100}%`,background:p.color,borderRadius:'2px',opacity:0.8}}></div>)}
                </div>
                <div>
                  <div style={{fontSize:'15px',fontWeight:700,color:'#F8F0FF'}}>{p.name}</div>
                  <div style={{fontSize:'12px',color:'rgba(248,240,255,0.5)',marginTop:'3px'}}>{p.desc.split(',')[0]}</div>
                </div>
                <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                  <span style={{fontSize:'10px',padding:'2px 8px',borderRadius:'980px',background:`${p.color}22`,color:p.color}}>B:{p.bass>0?'+':''}{p.bass}</span>
                  <span style={{fontSize:'10px',padding:'2px 8px',borderRadius:'980px',background:`${p.color}22`,color:p.color}}>R:{Math.round(p.reverbWet*100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ───── TESTIMONIALS ───── */}
      <div style={{...S.section}}>
        <div style={{textAlign:'center',marginBottom:'48px'}}>
          <h2 style={S.sectionTitle}>Lo que dicen los <span style={S.grad}>músicos reales</span></h2>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'20px'}}>
          {TESTIMONIALS.map((t,i)=>(
            <div key={i} style={{...S.card}}>
              <div style={{display:'flex',gap:'4px',marginBottom:'12px'}}>
                {'★★★★★'.split('').map((s,j)=><span key={j} style={{color:'#FBBF24',fontSize:'14px'}}>{s}</span>)}
              </div>
              <p style={{fontSize:'14px',color:'rgba(248,240,255,0.8)',lineHeight:1.7,marginBottom:'16px',fontStyle:'italic'}}>"{t.text}"</p>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <div style={{width:'38px',height:'38px',borderRadius:'50%',background:'linear-gradient(135deg,#EC4899,#7C3AED)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:700}}>{t.name[0]}</div>
                <div>
                  <div style={{fontSize:'13px',fontWeight:700,color:'#F8F0FF'}}>{t.name} {t.country}</div>
                  <div style={{fontSize:'11px',color:'#9B7EC8'}}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ───── BLOG ───── */}
      <div style={{background:'rgba(15,10,26,0.5)',padding:'80px 20px'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:'40px',flexWrap:'wrap',gap:'16px'}}>
            <div>
              <h2 style={{...S.sectionTitle,marginBottom:'8px'}}>Aprende con nuestro <span style={S.grad}>blog de mezcla</span></h2>
              <p style={{fontSize:'15px',color:'rgba(248,240,255,0.5)'}}>Guías, tutoriales y noticias del mundo del audio profesional</p>
            </div>
            <button onClick={()=>navigate('/blog')} style={{color:'#C026D3',fontSize:'14px',fontWeight:600,textDecoration:'none',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Ver todos los artículos →</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'20px'}}>
            {recentArticles.map((article,i)=>(
              <div key={i} onClick={()=>navigate(`/blog/${article.slug}`)} style={{...S.card,textDecoration:'none',display:'block',transition:'transform 0.15s',cursor:'pointer'}}
                onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-4px)')}
                onMouseLeave={e=>(e.currentTarget.style.transform='translateY(0)')}>
                <div style={{fontSize:'11px',fontWeight:700,letterSpacing:'0.8px',textTransform:'uppercase',color:'#C026D3',marginBottom:'10px'}}>{article.categoryNameEs||article.categoryName}</div>
                <h3 style={{fontSize:'16px',fontWeight:700,color:'#F8F0FF',lineHeight:1.4,marginBottom:'10px'}}>{article.titleEs||article.title}</h3>
                <p style={{fontSize:'13px',color:'rgba(248,240,255,0.55)',lineHeight:1.6,marginBottom:'16px'}}>{(article.excerptEs||article.excerpt).slice(0,110)}...</p>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:'12px',color:'#9B7EC8'}}>
                  <span>⏱ {article.readTime} min lectura</span>
                  <span style={{color:'#C026D3',fontWeight:600}}>Leer →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ───── FAQ ───── */}
      <div style={{...S.section}}>
        <div style={{textAlign:'center',marginBottom:'48px'}}>
          <h2 style={S.sectionTitle}>¿Por qué mezclar con <span style={S.grad}>Inteligencia Artificial?</span></h2>
          <p style={S.sectionSub}>Todo lo que necesitas saber antes de tu primera mezcla</p>
        </div>
        <div style={{maxWidth:'720px',margin:'0 auto',display:'flex',flexDirection:'column',gap:'12px'}}>
          {FAQ_ITEMS.map((item,i)=>(
            <div key={i} style={{...S.card,padding:'0',overflow:'hidden'}}>
              <button onClick={()=>setOpenFaq(openFaq===i?null:i)}
                style={{width:'100%',background:'none',border:'none',padding:'20px 24px',textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px',fontFamily:'inherit'}}>
                <span style={{fontSize:'15px',fontWeight:600,color:'#F8F0FF',lineHeight:1.4}}>{item.q}</span>
                <span style={{color:'#C026D3',fontSize:'20px',flexShrink:0,transition:'transform 0.2s',transform:openFaq===i?'rotate(45deg)':'rotate(0)'}}>+</span>
              </button>
              {openFaq===i&&(
                <div style={{padding:'0 24px 20px',fontSize:'14px',color:'rgba(248,240,255,0.65)',lineHeight:1.8,borderTop:'1px solid rgba(192,38,211,0.1)'}}>
                  <p style={{marginTop:'16px'}}>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ───── CTA FINAL ───── */}
      <div style={{background:'linear-gradient(135deg,rgba(36,22,54,0.9),rgba(124,58,237,0.15))',borderTop:'1px solid rgba(192,38,211,0.2)',padding:'100px 20px',textAlign:'center'}}>
        <h2 style={{fontSize:'clamp(28px,5vw,52px)',fontWeight:900,letterSpacing:'-1px',marginBottom:'16px',lineHeight:1.1}}>
          Tu próxima mezcla,<br/><span style={S.grad}>lista en 3 minutos</span>
        </h2>
        <p style={{fontSize:'17px',color:'rgba(248,240,255,0.6)',marginBottom:'36px',maxWidth:'500px',margin:'0 auto 36px'}}>
          Únete a más de 47,000 músicos que ya mezclan con IA profesional.<br/>1 mezcla gratis · $3.99 ilimitadas.
        </p>
        <button onClick={goRegister}
          style={{...S.ctaBtn,padding:'18px 48px',fontSize:'18px'}}>
          🎛️ Empezar gratis ahora
        </button>
      </div>

      {/* ───── FOOTER ───── */}
      <div style={{background:'rgba(8,4,16,0.9)',borderTop:'1px solid rgba(192,38,211,0.1)',padding:'40px 20px'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'20px'}}>
          <div>
            <div style={{fontSize:'18px',fontWeight:800,...S.grad}}>mixingmusic.ai</div>
            <div style={{fontSize:'12px',color:'rgba(248,240,255,0.4)',marginTop:'4px'}}>Mezcla profesional con IA · 1 gratis · $3.99 ilimitadas</div>
          </div>
          <div style={{display:'flex',gap:'24px',flexWrap:'wrap'}}>
            {[['Blog','/blog'],['Privacidad','/privacy'],['Términos','/terms']].map(([label,href])=>(
              <a key={href} href={href} style={{color:'rgba(248,240,255,0.45)',fontSize:'13px',textDecoration:'none'}}>{label}</a>
            ))}
          </div>
          <div style={{fontSize:'12px',color:'rgba(248,240,255,0.3)'}}>© 2026 MixingMusic.AI</div>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
