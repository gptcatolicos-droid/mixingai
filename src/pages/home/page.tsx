import { useState } from 'react';
import { Link } from 'react-router-dom';
import ProjectDashboard from './components/ProjectDashboard';
import FAQ from '../../components/feature/FAQ';
import { blogArticles } from '../../mocks/blogArticles';

const getLatestArticles = () =>
  blogArticles.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()).slice(0, 6);

const detectLang = (): 'en' | 'es' => navigator.language?.startsWith('es') ? 'es' : 'en';

const S = {
  page: {minHeight:'100vh',background:'#0F0A1A',fontFamily:"'DM Sans',system-ui,sans-serif",color:'#F8F0FF'},
  nav: {background:'rgba(26,16,40,0.97)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(192,38,211,0.15)',position:'sticky' as const,top:0,zIndex:100},
  navInner: {maxWidth:'1200px',margin:'0 auto',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:'60px'},
  logoIcon: {width:'32px',height:'32px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'9px',display:'flex',alignItems:'center',justifyContent:'center'},
  gradText: {background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'},
  glowBtn: {background:'linear-gradient(135deg,#EC4899,#C026D3)',color:'#fff',padding:'12px 28px',borderRadius:'980px',fontSize:'15px',fontWeight:600,textDecoration:'none',boxShadow:'0 0 24px rgba(192,38,211,0.5)',display:'inline-block'},
  ghostBtn: {background:'transparent',border:'1px solid rgba(192,38,211,0.3)',color:'#C026D3',padding:'12px 28px',borderRadius:'980px',fontSize:'15px',fontWeight:600,textDecoration:'none',display:'inline-block'},
  card: {background:'#1A1028',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'18px',padding:'28px'},
  featureIcon: {width:'52px',height:'52px',background:'linear-gradient(135deg,#EC4899,#C026D3)',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'16px',boxShadow:'0 0 20px rgba(192,38,211,0.3)'},
};

export default function HomePage() {
  const [user] = useState(() => {
    try { const s = localStorage.getItem('audioMixerUser'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [lang] = useState(detectLang);
  const [mobileOpen, setMobileOpen] = useState(false);
  const es = lang === 'es';

  if (user) return <ProjectDashboard />;

  const features = [
    { icon:'ri-music-2-line', title: es?'IA Avanzada':'Advanced AI', desc: es?'Algoritmos entrenados con miles de mezclas profesionales para resultados de estudio.':'Algorithms trained on thousands of professional mixes for studio-quality results.' },
    { icon:'ri-timer-line', title: es?'Resultados Rápidos':'Fast Results', desc: es?'En minutos obtén una mezcla que normalmente tomaría horas de trabajo manual.':'Get in minutes a mix that would normally take hours of manual work.' },
    { icon:'ri-equalizer-line', title: es?'Control Total':'Total Control', desc: es?'Ajusta cada parámetro. La IA sugiere, tú decides el sonido final.':'Adjust every parameter. AI suggests, you decide the final sound.' },
  ];

  return (
    <div style={S.page}>
      {/* NAV */}
      <nav style={S.nav}>
        <div style={S.navInner}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={S.logoIcon}><i className="ri-equalizer-fill" style={{color:'#fff',fontSize:'16px'}}></i></div>
            <span style={{...S.gradText,fontWeight:600,fontSize:'15px',letterSpacing:'-0.3px'}}>mixingmusic.ai</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}} className="hide-mobile">
            <Link to="/blog" style={{color:'#9B7EC8',padding:'8px 14px',fontSize:'13px',textDecoration:'none'}}>Blog</Link>
            <Link to="/auth/login" style={{color:'#9B7EC8',padding:'8px 14px',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'980px',fontSize:'13px',textDecoration:'none'}}>
              {es?'Iniciar Sesión':'Sign In'}
            </Link>
            <Link to="/auth/register" style={{background:'linear-gradient(135deg,#EC4899,#C026D3)',color:'#fff',padding:'8px 18px',borderRadius:'980px',fontSize:'13px',fontWeight:600,textDecoration:'none',boxShadow:'0 0 16px rgba(192,38,211,0.3)'}}>
              {es?'Crear Cuenta':'Create Account'}
            </Link>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} style={{background:'none',border:'none',color:'#9B7EC8',cursor:'pointer',fontSize:'22px'}} className="show-mobile">
            <i className={mobileOpen?'ri-close-line':'ri-menu-line'}></i>
          </button>
        </div>
        {mobileOpen && (
          <div style={{background:'#1A1028',padding:'16px 24px',display:'flex',flexDirection:'column',gap:'8px',borderTop:'1px solid rgba(192,38,211,0.1)'}}>
            <Link to="/blog" style={{color:'#9B7EC8',padding:'10px',textDecoration:'none'}} onClick={() => setMobileOpen(false)}>Blog</Link>
            <Link to="/auth/login" style={{color:'#9B7EC8',padding:'10px',textDecoration:'none'}} onClick={() => setMobileOpen(false)}>{es?'Iniciar Sesión':'Sign In'}</Link>
            <Link to="/auth/register" style={{background:'linear-gradient(135deg,#EC4899,#C026D3)',color:'#fff',padding:'12px',borderRadius:'980px',fontSize:'14px',fontWeight:600,textDecoration:'none',textAlign:'center'}} onClick={() => setMobileOpen(false)}>
              {es?'Crear Cuenta — Gratis':'Create Account — Free'}
            </Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section style={{maxWidth:'1000px',margin:'0 auto',padding:'80px 24px 60px',textAlign:'center'}}>
        {/* Badge */}
        <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'rgba(192,38,211,0.1)',border:'1px solid rgba(192,38,211,0.25)',borderRadius:'980px',padding:'6px 16px',marginBottom:'32px'}}>
          <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#4ade80'}}></div>
          <span style={{fontSize:'13px',color:'#C026D3',fontWeight:600}}>{es?'Mezclas Ilimitadas — Completamente Gratis':'Unlimited Mixes — Completely Free'}</span>
        </div>

        <h1 style={{fontSize:'clamp(36px,6vw,72px)',fontWeight:700,letterSpacing:'-2px',lineHeight:1.05,marginBottom:'24px'}}>
          {es ? (
            <><span style={S.gradText}>Mezcla tu música</span><br/>como un profesional</>
          ) : (
            <><span style={S.gradText}>Mix your music</span><br/>like a professional</>
          )}
        </h1>

        <p style={{fontSize:'18px',color:'#9B7EC8',marginBottom:'40px',lineHeight:1.7,maxWidth:'600px',margin:'0 auto 40px'}}>
          {es
            ? 'Sube tus stems, nuestra IA los mezcla con calidad de estudio. Sin límites, sin costo, sin complicaciones.'
            : 'Upload your stems, our AI mixes them with studio quality. No limits, no cost, no complications.'}
        </p>

        <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap',marginBottom:'60px'}}>
          <Link to="/auth/register" style={S.glowBtn}>
            {es?'Comenzar Gratis':'Start Free'}
          </Link>
          <Link to="/auth/login" style={S.ghostBtn}>
            {es?'Ya tengo cuenta':'I have an account'}
          </Link>
        </div>

        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px',maxWidth:'600px',margin:'0 auto'}}>
          {[
            {val:'∞', label: es?'Mezclas ilimitadas':'Unlimited mixes'},
            {val:'100%', label: es?'Completamente gratis':'Completely free'},
            {val:'-14', label:'LUFS Streaming'},
          ].map(s => (
            <div key={s.label} style={{background:'#1A1028',border:'1px solid rgba(192,38,211,0.12)',borderRadius:'14px',padding:'20px 12px',textAlign:'center'}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:'28px',fontWeight:600,...S.gradText}}>{s.val}</div>
              <div style={{fontSize:'12px',color:'#9B7EC8',marginTop:'4px'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{maxWidth:'1100px',margin:'0 auto',padding:'40px 24px 80px'}}>
        <h2 style={{textAlign:'center',fontSize:'32px',fontWeight:700,letterSpacing:'-1px',marginBottom:'40px'}}>
          {es?'Todo lo que necesitas':'Everything you need'}
        </h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'16px'}}>
          {features.map(f => (
            <div key={f.title} style={S.card}>
              <div style={S.featureIcon}><i className={f.icon} style={{color:'#fff',fontSize:'22px'}}></i></div>
              <h3 style={{fontSize:'18px',fontWeight:600,marginBottom:'10px'}}>{f.title}</h3>
              <p style={{color:'#9B7EC8',fontSize:'14px',lineHeight:1.7}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BLOG */}
      <section style={{background:'#1A1028',borderTop:'1px solid rgba(192,38,211,0.1)',borderBottom:'1px solid rgba(192,38,211,0.1)',padding:'60px 24px'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <h2 style={{textAlign:'center',fontSize:'28px',fontWeight:700,letterSpacing:'-0.5px',marginBottom:'8px'}}>
            {es?'Aprende más':'Learn more'}
          </h2>
          <p style={{textAlign:'center',color:'#9B7EC8',marginBottom:'32px',fontSize:'14px'}}>
            {es?'Técnicas y consejos del blog':'Techniques and tips from the blog'}
          </p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'12px'}}>
            {[
              {slug:'ai-music-mixing-guide',icon:'ri-brain-line',title:es?'Guía de Mezcla con IA':'AI Mixing Guide',desc:es?'Todo sobre la mezcla con inteligencia artificial':'Everything about AI music mixing'},
              {slug:'professional-mixing-techniques',icon:'ri-equalizer-line',title:es?'Técnicas Profesionales':'Professional Techniques',desc:es?'Los secretos de los ingenieros de audio':'Audio engineer secrets'},
              {slug:'stem-separation-guide',icon:'ri-file-music-line',title:es?'Separación de Stems':'Stem Separation',desc:es?'Cómo separar instrumentos con IA':'How to separate instruments with AI'},
            ].map(a => (
              <Link key={a.slug} to={`/blog/${a.slug}`} style={{...S.card,textDecoration:'none',display:'block',transition:'border-color 0.2s'}}>
                <div style={{width:'40px',height:'40px',background:'rgba(192,38,211,0.1)',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'12px'}}>
                  <i className={a.icon} style={{color:'#C026D3',fontSize:'18px'}}></i>
                </div>
                <div style={{fontSize:'14px',fontWeight:600,color:'#F8F0FF',marginBottom:'6px'}}>{a.title}</div>
                <div style={{fontSize:'13px',color:'#9B7EC8'}}>{a.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{maxWidth:'900px',margin:'0 auto',padding:'60px 24px'}}>
        <FAQ language={lang} />
      </section>

      {/* CTA */}
      <section style={{background:'linear-gradient(135deg,rgba(236,72,153,0.08),rgba(124,58,237,0.08))',borderTop:'1px solid rgba(192,38,211,0.1)',padding:'80px 24px',textAlign:'center'}}>
        <h2 style={{fontSize:'36px',fontWeight:700,letterSpacing:'-1px',marginBottom:'16px'}}>
          {es?'Empieza a mezclar hoy':'Start mixing today'}
        </h2>
        <p style={{color:'#9B7EC8',fontSize:'16px',marginBottom:'32px'}}>
          {es?'Completamente gratis. Sin límites.':'Completely free. No limits.'}
        </p>
        <Link to="/auth/register" style={S.glowBtn}>
          {es?'Crear Cuenta Gratis':'Create Free Account'}
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{background:'#0A0612',borderTop:'1px solid rgba(192,38,211,0.1)',padding:'40px 24px'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'32px',marginBottom:'32px'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
              <div style={S.logoIcon}><i className="ri-equalizer-fill" style={{color:'#fff',fontSize:'14px'}}></i></div>
              <span style={{...S.gradText,fontWeight:600,fontSize:'14px'}}>mixingmusic.ai</span>
            </div>
            <p style={{color:'#9B7EC8',fontSize:'13px',lineHeight:1.7}}>
              {es?'La plataforma de IA más avanzada para mezcla musical profesional.':'The most advanced AI platform for professional music mixing.'}
            </p>
            <div style={{marginTop:'12px',fontSize:'13px',color:'#9B7EC8'}}>support@mixingmusic.co</div>
          </div>
          <div>
            <div style={{fontSize:'12px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',color:'#9B7EC8',marginBottom:'14px'}}>{es?'Navegación':'Navigation'}</div>
            {[
              {to:'/',label:es?'Inicio':'Home'},
              {to:'/blog',label:'Blog'},
              {to:'/auth/register',label:es?'Crear Cuenta':'Create Account'},
              {to:'/terms',label:es?'Términos':'Terms'},
              {to:'/privacy',label:es?'Privacidad':'Privacy'},
            ].map(l => (
              <div key={l.to} style={{marginBottom:'8px'}}>
                <Link to={l.to} style={{color:'#9B7EC8',fontSize:'13px',textDecoration:'none'}}>{l.label}</Link>
              </div>
            ))}
          </div>
          <div>
            <div style={{fontSize:'12px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',color:'#9B7EC8',marginBottom:'14px'}}>{es?'Últimos artículos':'Latest articles'}</div>
            {getLatestArticles().slice(0,5).map(a => (
              <div key={a.id} style={{marginBottom:'8px'}}>
                <Link to={`/blog/${a.slug}`} style={{color:'#9B7EC8',fontSize:'12px',textDecoration:'none',lineHeight:1.5,display:'block'}}>
                  → {lang==='es'?a.titleEs:a.title}
                </Link>
              </div>
            ))}
          </div>
        </div>
        <div style={{borderTop:'1px solid rgba(192,38,211,0.08)',paddingTop:'20px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px'}}>
          <span style={{fontSize:'12px',color:'rgba(155,126,200,0.5)'}}>© 2025 MixingMusic.ai. {es?'Todos los derechos reservados.':'All rights reserved.'}</span>
          <div style={{display:'flex',gap:'16px'}}>
            <Link to="/terms" style={{fontSize:'12px',color:'rgba(155,126,200,0.5)',textDecoration:'none'}}>{es?'Términos':'Terms'}</Link>
            <Link to="/privacy" style={{fontSize:'12px',color:'rgba(155,126,200,0.5)',textDecoration:'none'}}>{es?'Privacidad':'Privacy'}</Link>
          </div>
        </div>
      </footer>

      <style>{`
        @media(max-width:768px){.hide-mobile{display:none!important;}}
        @media(min-width:769px){.show-mobile{display:none!important;}}
      `}</style>
    </div>
  );
}
