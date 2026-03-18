import { useState, useEffect, useRef } from 'react';
import { MixPreset, PRESETS } from './PresetScreen';
import { blogArticles } from '../../../mocks/blogArticles';
import AIChat from './AIChat';
import { Lang, t, detectLang } from '../../../i18n/translations';

interface HomeHeroProps { onStartMixer: (preset: MixPreset, files: File[]) => void; }

const TESTIMONIALS = [
  { name: 'Carlos M.', role: { es:'Productor Gospel', en:'Gospel Producer' }, country: '🇨🇴', text: { es:'Subí 10 stems de mi coro y en 3 minutos tenía una mezcla lista para radio. Increíble.', en:'I uploaded 10 choir stems and in 3 minutes had a radio-ready mix. Incredible.' } },
  { name: 'Valeria R.', role: { es:'Cantautora', en:'Singer-Songwriter' }, country: '🇲🇽', text: { es:'Nunca pensé que podría tener calidad de estudio sin pagar miles de dólares. Cambió todo.', en:'I never thought I could have studio quality without paying thousands. It changed everything.' } },
  { name: 'DJ Fontana', role: { es:'DJ / Productor EDM', en:'DJ / EDM Producer' }, country: '🇦🇷', text: { es:'El preset Dance/EDM está brutal. Los -14 LUFS suenan perfecto en Spotify desde el primer intento.', en:'The Dance/EDM preset is incredible. The -14 LUFS sounds perfect on Spotify from the first try.' } },
  { name: 'Pastor Reyes', role: { es:'Director Musical', en:'Music Director' }, country: '🇵🇪', text: { es:'Lo uso cada domingo para mezclar el ensayo del coro. La reverb de gospel es exactamente lo que necesitaba.', en:'I use it every Sunday to mix choir rehearsal. The gospel reverb is exactly what I needed.' } },
  { name: 'Ana Sofía T.', role: { es:'Artista Indie', en:'Indie Artist' }, country: '🇨🇱', text: { es:'El mixer pro me dejó ajustar el EQ en tiempo real. Profesional y gratuito.', en:'The pro mixer let me adjust the EQ in real time. Professional and free.' } },
  { name: 'James W.', role: { es:'Productor Hip Hop', en:'Hip Hop Producer' }, country: '🇺🇸', text: { es:'Best free AI mixing tool I\'ve tried. The 808 preset hits hard.', en:'Best free AI mixing tool I\'ve tried. The 808 preset hits hard.' } },
];

const getFAQ = (lang: Lang) => [
  {
    q: lang==='es' ? '¿Por qué mezclar con IA en lugar de un ingeniero humano?' : 'Why mix with AI instead of a human engineer?',
    a: lang==='es' ? 'Un ingeniero profesional cobra entre $500 y $3,000 por mezcla. Nuestra IA aplica las mismas técnicas en 3 minutos, completamente gratis. Para demos, proyectos independientes y música para streaming, la diferencia es indetectable.' : 'A professional engineer charges $500–$3,000 per mix. Our AI applies the same techniques in 3 minutes, completely free. For demos, indie projects and streaming music, the difference is undetectable.'
  },
  {
    q: lang==='es' ? '¿Qué formatos de audio acepta MixingMusic.AI?' : 'What audio formats does MixingMusic.AI accept?',
    a: lang==='es' ? 'Acepta WAV, MP3, FLAC, AAC y M4A. Puedes subir hasta 12 stems simultáneamente. Recomendamos WAV 24-bit para mejor calidad.' : 'Accepts WAV, MP3, FLAC, AAC and M4A. You can upload up to 12 stems simultaneously. We recommend WAV 24-bit for best quality.'
  },
  {
    q: lang==='es' ? '¿Qué significa -14 LUFS y por qué importa?' : 'What does -14 LUFS mean and why does it matter?',
    a: lang==='es' ? 'LUFS es el estándar de volumen para plataformas de streaming. Spotify normaliza a -14 LUFS. Si tu canción supera ese nivel, la plataforma la baja automáticamente y suena peor. Nuestra IA exporta siempre en el rango correcto.' : 'LUFS is the volume standard for streaming platforms. Spotify normalizes to -14 LUFS. If your song exceeds that level, the platform automatically lowers it and it sounds worse. Our AI always exports in the correct range.'
  },
  {
    q: lang==='es' ? '¿Cómo funcionan los presets de género?' : 'How do genre presets work?',
    a: lang==='es' ? 'Cada preset tiene configuraciones específicas de EQ, compresión, reverb y delay calibradas para ese género. Gospel tiene más reverb de sala. Reggaeton tiene más bass y delay rítmico. Puedes ajustar todo en tiempo real en el Mezclador Pro.' : 'Each preset has specific EQ, compression, reverb and delay settings calibrated for that genre. Gospel has more room reverb. Reggaeton has more bass and rhythmic delay. You can adjust everything in real time in the Pro Mixer.'
  },
  {
    q: lang==='es' ? '¿Es realmente gratis? ¿Hay límites?' : 'Is it really free? Are there limits?',
    a: lang==='es' ? 'Sí, completamente gratis sin límites de mezclas. No necesitas tarjeta de crédito. Puedes mezclar y descargar en WAV 24-bit y MP3 ilimitadamente.' : 'Yes, completely free with no mixing limits. No credit card needed. You can mix and download in WAV 24-bit and MP3 unlimited times.'
  },
  {
    q: lang==='es' ? '¿Funciona para música en inglés también?' : 'Does it work for music in other languages too?',
    a: lang==='es' ? 'Sí. MixingMusic.AI procesa el audio sin importar el idioma de la letra. Funciona igual de bien para inglés, portugués, francés, y cualquier otro idioma.' : 'Yes. MixingMusic.AI processes audio regardless of the lyrics\' language. It works equally well for Spanish, Portuguese, French, and any other language.'
  },
];

export default function HomeHero({ onStartMixer }: HomeHeroProps) {
  const [showChat, setShowChat] = useState(false);
  const [openFaq, setOpenFaq] = useState<number|null>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [lang, setLang] = useState<Lang>('es');
  const statsRef = useRef<HTMLDivElement>(null);
  const recentArticles = blogArticles.slice(0, 3);

  useEffect(() => {
    document.body.classList.add('page-home');
    detectLang().then(l => setLang(l));
    return () => document.body.classList.remove('page-home');
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const switchLang = (l: Lang) => { setLang(l); localStorage.setItem('lang', l); };

  if (showChat) return <AIChat user={null} onStartMixer={onStartMixer} onCreditsUpdate={() => {}} lang={lang} />;

  const S = {
    grad: { background: 'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as React.CSSProperties,
    card: { background: 'rgba(26,16,40,0.82)', border: '1px solid rgba(192,38,211,0.15)', borderRadius: '16px', padding: '24px' } as React.CSSProperties,
    sec: { padding: '80px 20px', maxWidth: '1100px', margin: '0 auto' } as React.CSSProperties,
    h2: { fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, color: '#F8F0FF', letterSpacing: '-1px', marginBottom: '12px', lineHeight: 1.15 } as React.CSSProperties,
    sub: { fontSize: '17px', color: 'rgba(248,240,255,0.6)', marginBottom: '48px', lineHeight: 1.6 } as React.CSSProperties,
  };

  const STATS = [
    { num: '47,832', label: t('stat_mixes', lang), icon: '🎛️' },
    { num: '-14 LUFS', label: t('stat_lufs', lang), icon: '🎵' },
    { num: '9', label: t('stat_presets', lang), icon: '🎸' },
    { num: '100%', label: t('stat_free', lang), icon: '∞' },
  ];

  return (
    <div style={{ minHeight: '100vh', color: '#F8F0FF', fontFamily: "'Outfit', system-ui, sans-serif" }}>

      {/* NAVBAR */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(8,4,16,0.75)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(192,38,211,0.12)', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo oficial */}
        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>
          <img src="/logo-transparent.png" alt="MixingMusic.AI" style={{ height: '36px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
        </div>
        {/* Nav links + lang switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a href="/blog" style={{ color: 'rgba(248,240,255,0.6)', fontSize: '13px', fontWeight: 500, textDecoration: 'none', padding: '6px 12px' }}>Blog</a>
          <a href="/pricing" style={{ color: 'rgba(248,240,255,0.6)', fontSize: '13px', fontWeight: 500, textDecoration: 'none', padding: '6px 12px' }}>Pricing</a>
          <div style={{ width: '1px', height: '20px', background: 'rgba(192,38,211,0.2)', margin: '0 4px' }}></div>
          {(['es','en'] as Lang[]).map(l => (
            <button key={l} onClick={() => switchLang(l)}
              style={{ padding: '5px 12px', borderRadius: '980px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit', background: lang===l ? 'linear-gradient(135deg,#EC4899,#C026D3)' : 'transparent', color: lang===l ? '#fff' : '#9B7EC8', transition: 'all 0.2s' }}>
              {l === 'es' ? '🇪🇸 ES' : '🇺🇸 EN'}
            </button>
          ))}
          <button onClick={() => setShowChat(true)} style={{ marginLeft: '8px', background: 'linear-gradient(135deg,#EC4899,#C026D3)', border: 'none', color: '#fff', padding: '8px 18px', borderRadius: '980px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {lang === 'es' ? 'Mezclar gratis' : 'Mix free'}
          </button>
        </div>
      </nav>

      {/* Language switcher — eliminado, movido al navbar */}
      <div style={{ display: 'none', position: 'fixed', top: '16px', right: '16px', zIndex: 100, display: 'flex', gap: '6px', background: 'rgba(15,10,26,0.85)', border: '1px solid rgba(192,38,211,0.2)', borderRadius: '980px', padding: '4px 6px' }}>
        {(['es','en'] as Lang[]).map(l => (
          <button key={l} onClick={() => switchLang(l)}
            style={{ padding: '5px 14px', borderRadius: '980px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit', background: lang===l ? 'linear-gradient(135deg,#EC4899,#C026D3)' : 'transparent', color: lang===l ? '#fff' : '#9B7EC8', transition: 'all 0.2s' }}>
            {l === 'es' ? '🇪🇸 ES' : '🇺🇸 EN'}
          </button>
        ))}
      </div>

      {/* HERO */}
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(192,38,211,0.1)', border: '1px solid rgba(192,38,211,0.3)', borderRadius: '980px', padding: '6px 16px', fontSize: '13px', color: '#C026D3', fontWeight: 600, marginBottom: '28px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
          {t('hero_badge', lang)}
        </div>
        {/* Logo oficial grande en el hero */}
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'center' }}>
          <img src="/logo-transparent.png" alt="MixingMusic.AI"
            style={{ height: 'clamp(48px, 8vw, 80px)', width: 'auto', filter: 'brightness(0) invert(1)', maxWidth: '400px' }} />
        </div>

        <h1 style={{ fontSize: 'clamp(38px,7vw,80px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: '20px', maxWidth: '900px' }}>
          <span style={S.grad}>{t('hero_h1a', lang)}</span><br />
          <span style={{ color: '#F8F0FF' }}>{t('hero_h1b', lang)}</span>
        </h1>
        <p style={{ fontSize: 'clamp(16px,2.5vw,20px)', color: 'rgba(248,240,255,0.65)', maxWidth: '600px', lineHeight: 1.7, marginBottom: '40px', whiteSpace: 'pre-line' }}>
          {t('hero_sub', lang)}
        </p>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '60px' }}>
          <button onClick={() => setShowChat(true)}
            style={{ background: 'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)', border: 'none', color: '#fff', padding: '16px 36px', borderRadius: '980px', fontSize: '17px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 32px rgba(192,38,211,0.5)' }}>
            {t('hero_cta', lang)}
          </button>
          <a href="#como-funciona" style={{ background: 'transparent', border: '1px solid rgba(192,38,211,0.3)', color: '#9B7EC8', padding: '16px 32px', borderRadius: '980px', fontSize: '16px', fontWeight: 600, textDecoration: 'none' }}>
            {t('hero_how', lang)}
          </a>
        </div>

        {/* Preview mixer */}
        <div style={{ width: '100%', maxWidth: '780px', background: 'rgba(15,10,26,0.8)', border: '1px solid rgba(192,38,211,0.2)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
          <div style={{ background: 'rgba(26,16,40,0.9)', padding: '10px 16px', borderBottom: '1px solid rgba(192,38,211,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {['#EF4444','#FBBF24','#4ade80'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }}></div>)}
            <img src="/logo.png" alt="MixingMusic.AI" style={{ height: '16px', width: 'auto', marginLeft: '8px', filter: 'brightness(0.7) sepia(1) hue-rotate(250deg) saturate(2)', opacity: 0.7 }} />
          </div>
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(9,1fr)', gap: '6px' }}>
            {PRESETS.map(p => (
              <div key={p.id} onClick={() => setShowChat(true)} style={{ background: `${p.color}18`, border: `1px solid ${p.color}44`, borderRadius: '8px', padding: '8px 4px', textAlign: 'center', cursor: 'pointer' }}>
                <div style={{ height: '20px', display: 'flex', alignItems: 'flex-end', gap: '1px', marginBottom: '5px' }}>
                  {p.wavePattern.slice(0,6).map((h,i) => <div key={i} style={{ flex: 1, height: `${h*100}%`, background: p.color, borderRadius: '1px' }}></div>)}
                </div>
                <div style={{ fontSize: '9px', color: '#F8F0FF', fontWeight: 700 }}>{p.name}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 20px', background: 'rgba(8,4,16,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#9B7EC8' }}>{t('hero_preview_active', lang)}</span>
            <button onClick={() => setShowChat(true)} style={{ background: 'linear-gradient(135deg,#EC4899,#C026D3)', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: '980px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t('hero_preview_btn', lang)}
            </button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div ref={statsRef} style={{ background: 'rgba(26,16,40,0.6)', borderTop: '1px solid rgba(192,38,211,0.1)', borderBottom: '1px solid rgba(192,38,211,0.1)', padding: '48px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '32px' }}>
          {STATS.map((s,i) => (
            <div key={i} style={{ textAlign: 'center', opacity: statsVisible?1:0, transform: statsVisible?'translateY(0)':'translateY(20px)', transition: `all 0.6s ease ${i*0.1}s` }}>
              <div style={{ fontSize: '36px', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 800, ...S.grad }}>{s.num}</div>
              <div style={{ fontSize: '13px', color: 'rgba(248,240,255,0.5)', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div id="como-funciona" style={{ ...S.sec }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h2 style={S.h2}>{t('how_title', lang)} <span style={S.grad}>{t('how_title2', lang)}</span></h2>
          <p style={S.sub}>{t('how_sub', lang)}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '24px' }}>
          {[
            { num:'01', icon:'💬', title: t('how_1_title',lang), desc: t('how_1_desc',lang) },
            { num:'02', icon:'🎵', title: t('how_2_title',lang), desc: t('how_2_desc',lang) },
            { num:'03', icon:'🚀', title: t('how_3_title',lang), desc: t('how_3_desc',lang) },
          ].map((step,i) => (
            <div key={i} style={{ ...S.card, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '80px', fontWeight: 900, color: 'rgba(192,38,211,0.04)', lineHeight: 1 }}>{step.num}</div>
              <div style={{ fontSize: '36px', marginBottom: '16px' }}>{step.icon}</div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#F8F0FF', marginBottom: '10px' }}>{step.title}</h3>
              <p style={{ fontSize: '14px', color: 'rgba(248,240,255,0.6)', lineHeight: 1.7 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PRESETS */}
      <div style={{ background: 'rgba(15,10,26,0.5)', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={S.h2}>{t('presets_title',lang)} <span style={S.grad}>{t('presets_title2',lang)}</span></h2>
            <p style={S.sub}>{t('presets_sub',lang)}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '14px' }}>
            {PRESETS.map(p => (
              <div key={p.id} onClick={() => setShowChat(true)} style={{ background: `linear-gradient(135deg,${p.color}18,${p.color}08)`, border: `1px solid ${p.color}33`, borderRadius: '14px', padding: '18px', cursor: 'pointer', transition: 'transform 0.15s' }}
                onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.03)')}
                onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}>
                <div style={{ height: '28px', display: 'flex', alignItems: 'flex-end', gap: '2px', marginBottom: '10px' }}>
                  {p.wavePattern.map((h,i) => <div key={i} style={{ flex: 1, height: `${h*100}%`, background: p.color, borderRadius: '2px', opacity: 0.8 }}></div>)}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#F8F0FF', marginBottom: '4px' }}>{p.name}</div>
                <div style={{ fontSize: '12px', color: 'rgba(248,240,255,0.5)', marginBottom: '10px' }}>{p.desc.split(',')[0]}</div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '980px', background: `${p.color}22`, color: p.color }}>B:{p.bass>0?'+':''}{p.bass}</span>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '980px', background: `${p.color}22`, color: p.color }}>R:{Math.round(p.reverbWet*100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TESTIMONIALS */}
      <div style={{ ...S.sec }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={S.h2}>{t('test_title',lang)} <span style={S.grad}>{t('test_title2',lang)}</span></h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '20px' }}>
          {TESTIMONIALS.map((test,i) => (
            <div key={i} style={S.card}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                {'★★★★★'.split('').map((_,j) => <span key={j} style={{ color: '#FBBF24', fontSize: '14px' }}>★</span>)}
              </div>
              <p style={{ fontSize: '14px', color: 'rgba(248,240,255,0.8)', lineHeight: 1.7, marginBottom: '16px', fontStyle: 'italic' }}>"{test.text[lang] || test.text.es}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,#EC4899,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>{test.name[0]}</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8F0FF' }}>{test.name} {test.country}</div>
                  <div style={{ fontSize: '11px', color: '#9B7EC8' }}>{test.role[lang] || test.role.es}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BLOG */}
      <div style={{ background: 'rgba(15,10,26,0.5)', padding: '80px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ ...S.h2, marginBottom: '8px' }}>{t('blog_title',lang)} <span style={S.grad}>{t('blog_title2',lang)}</span></h2>
              <p style={{ fontSize: '15px', color: 'rgba(248,240,255,0.5)' }}>{t('blog_sub',lang)}</p>
            </div>
            <a href="/blog" style={{ color: '#C026D3', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>{t('blog_all',lang)}</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '20px' }}>
            {recentArticles.map((article,i) => (
              <a key={i} href={`/blog/${article.slug}`} style={{ ...S.card, textDecoration: 'none', display: 'block', transition: 'transform 0.15s' }}
                onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-4px)')}
                onMouseLeave={e=>(e.currentTarget.style.transform='translateY(0)')}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#C026D3', marginBottom: '10px' }}>{lang==='es' ? article.categoryNameEs||article.categoryName : article.categoryName}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8F0FF', lineHeight: 1.4, marginBottom: '10px' }}>{lang==='es' ? article.titleEs||article.title : article.title}</h3>
                <p style={{ fontSize: '13px', color: 'rgba(248,240,255,0.55)', lineHeight: 1.6, marginBottom: '16px' }}>{(lang==='es' ? article.excerptEs||article.excerpt : article.excerpt).slice(0,110)}...</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9B7EC8' }}>
                  <span>⏱ {article.readTime} {t('blog_min',lang)}</span>
                  <span style={{ color: '#C026D3', fontWeight: 600 }}>{t('blog_read',lang)}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ ...S.sec }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={S.h2}>{t('faq_title',lang)} <span style={S.grad}>{t('faq_title2',lang)}</span></h2>
          <p style={S.sub}>{t('faq_sub',lang)}</p>
        </div>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {getFAQ(lang).map((item,i) => (
            <div key={i} style={{ ...S.card, padding: '0', overflow: 'hidden' }}>
              <button onClick={() => setOpenFaq(openFaq===i?null:i)}
                style={{ width: '100%', background: 'none', border: 'none', padding: '20px 24px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', fontFamily: 'inherit' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#F8F0FF', lineHeight: 1.4 }}>{item.q}</span>
                <span style={{ color: '#C026D3', fontSize: '20px', flexShrink: 0, transition: 'transform 0.2s', transform: openFaq===i?'rotate(45deg)':'rotate(0)' }}>+</span>
              </button>
              {openFaq===i && (
                <div style={{ padding: '0 24px 20px', fontSize: '14px', color: 'rgba(248,240,255,0.65)', lineHeight: 1.8, borderTop: '1px solid rgba(192,38,211,0.1)' }}>
                  <p style={{ marginTop: '16px' }}>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: 'linear-gradient(135deg,rgba(36,22,54,0.9),rgba(124,58,237,0.15))', borderTop: '1px solid rgba(192,38,211,0.2)', padding: '100px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: '16px', lineHeight: 1.1 }}>
          {t('cta_title',lang)}<br /><span style={S.grad}>{t('cta_title2',lang)}</span>
        </h2>
        <p style={{ fontSize: '17px', color: 'rgba(248,240,255,0.6)', marginBottom: '36px', maxWidth: '500px', margin: '0 auto 36px' }}>{t('cta_sub',lang)}</p>
        <button onClick={() => setShowChat(true)} style={{ background: 'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)', border: 'none', color: '#fff', padding: '18px 48px', borderRadius: '980px', fontSize: '18px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 40px rgba(192,38,211,0.6)' }}>
          {t('cta_btn',lang)}
        </button>
      </div>

      {/* FOOTER */}
      <div style={{ background: 'rgba(8,4,16,0.9)', borderTop: '1px solid rgba(192,38,211,0.1)', padding: '40px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <img src="/logo-transparent.png" alt="MixingMusic.AI" style={{ height: '40px', width: 'auto', filter: 'brightness(0) invert(1)', maxWidth: '220px' }} />
            <div style={{ fontSize: '12px', color: 'rgba(248,240,255,0.4)' }}>{t('footer_sub',lang)}</div>
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {[['Blog','/blog'],['Pricing','/pricing'],['Privacy','/privacy'],['Terms','/terms']].map(([label,href]) => (
              <a key={href} href={href} style={{ color: 'rgba(248,240,255,0.45)', fontSize: '13px', textDecoration: 'none' }}>{label}</a>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(248,240,255,0.3)' }}>© 2026 MixingMusic.AI</div>
        </div>
      </div>
    </div>
  );
}
