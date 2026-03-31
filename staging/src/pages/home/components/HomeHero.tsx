import { useState, useEffect, useRef } from 'react';
import { MixPreset, PRESETS } from './PresetScreen';
import { blogArticles } from '../../../mocks/blogArticles';
import AIChat from './AIChat';

interface HomeHeroProps {
  onStartMixer: (preset: MixPreset, files: File[]) => void;
}

const TESTIMONIALS = [
  { name: 'Carlos M.', role: 'Productor Gospel', country: '🇨🇴', text: 'Subí 10 stems de mi coro y en 3 minutos tenía una mezcla lista para radio. Increíble.', stars: 5 },
  { name: 'Valeria R.', role: 'Cantautora', country: '🇲🇽', text: 'Nunca pensé que podría tener calidad de estudio sin pagar miles de dólares. MixingMusic.AI cambió todo.', stars: 5 },
  { name: 'DJ Fontana', role: 'DJ / Productor EDM', country: '🇦🇷', text: 'El preset Dance/EDM está brutal. Los -14 LUFS suenan perfecto en Spotify desde el primer intento.', stars: 5 },
  { name: 'Pastor Reyes', role: 'Director Musical', country: '🇵🇪', text: 'Lo uso cada domingo para mezclar el ensayo del coro. La reverb de gospel es exactamente lo que necesitaba.', stars: 5 },
  { name: 'Ana Sofía T.', role: 'Artista Indie', country: '🇨🇱', text: 'El mixer pro me dejó ajustar el EQ en tiempo real mientras escuchaba. Profesional y gratuito.', stars: 5 },
  { name: 'Marcos L.', role: 'Ingeniero de Audio', country: '🇧🇷', text: 'Los LUFS integrados son reales. El limiter hace su trabajo. Para una herramienta gratuita es sorprendente.', stars: 5 },
];

const FAQ_ITEMS = [
  { q: '¿Por qué mezclar con IA en lugar de un ingeniero humano?', a: 'Un ingeniero profesional cobra entre $500 y $3,000 por mezcla. Nuestra IA aplica las mismas técnicas en 3 minutos, completamente gratis. Para demos, proyectos independientes y música para streaming, la diferencia es indetectable.' },
  { q: '¿Qué formatos de audio acepta MixingMusic.AI?', a: 'Acepta WAV, MP3, FLAC, AAC y M4A. Puedes subir hasta 12 stems simultáneamente. Recomendamos WAV 24-bit para mejor calidad en la exportación final.' },
  { q: '¿Qué significa -14 LUFS y por qué importa?', a: 'LUFS es el estándar de volumen para plataformas de streaming. Spotify normaliza a -14 LUFS, YouTube a -13 LUFS. Si tu canción supera ese nivel, la plataforma la baja automáticamente y suena peor. Nuestra IA exporta siempre en el rango correcto.' },
  { q: '¿Cómo funcionan los presets de género?', a: 'Cada preset tiene configuraciones específicas de EQ, compresión, reverb y delay calibradas para ese género. Gospel tiene más reverb de sala y mid frequencies realzadas para voces. Reggaeton tiene más bass y delay rítmico. Puedes ajustar todo en tiempo real en el Mezclador Pro.' },
  { q: '¿Es realmente gratis? ¿Hay límites?', a: 'Sí, completamente gratis sin límites de mezclas. No necesitas tarjeta de crédito. Puedes mezclar y descargar en WAV 24-bit y MP3 ilimitadamente.' },
  { q: '¿Qué es el Mix Bus Master?', a: 'Es el canal master donde se aplican todos los efectos finales: EQ, compresión, reverb, delay y el limiter anti-clipping. Es la misma arquitectura que usan los DAW profesionales como Pro Tools y Logic Pro.' },
];

const STATS = [
  { num: '47,832', label: 'Mezclas generadas', icon: '🎛️' },
  { num: '-14 LUFS', label: 'Estándar Spotify garantizado', icon: '🎵' },
  { num: '9', label: 'Presets de género', icon: '🎸' },
  { num: '100%', label: 'Gratis para siempre', icon: '∞' },
];

export default function HomeHero({ onStartMixer }: HomeHeroProps) {
  const [showChat, setShowChat] = useState(false);
  const [openFaq, setOpenFaq] = useState<number|null>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const recentArticles = blogArticles.slice(0, 3);

  useEffect(() => {
    document.body.classList.add('page-home');
    return () => document.body.classList.remove('page-home');
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  if (showChat) {
    return <AIChat user={null} onStartMixer={onStartMixer} onCreditsUpdate={() => {}} />;
  }

  const S = {
    section: { padding: '80px 20px', maxWidth: '1100px', margin: '0 auto' } as React.CSSProperties,
    sectionTitle: { fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, color: '#F8F0FF', letterSpacing: '-1px', marginBottom: '12px', lineHeight: 1.15 } as React.CSSProperties,
    sectionSub: { fontSize: '17px', color: 'rgba(248,240,255,0.6)', marginBottom: '48px', lineHeight: 1.6 } as React.CSSProperties,
    grad: { background: 'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } as React.CSSProperties,
    card: { background: 'rgba(26,16,40,0.82)', border: '1px solid rgba(192,38,211,0.15)', borderRadius: '16px', padding: '24px' } as React.CSSProperties,
  };

  return (
    <div style={{ minHeight: '100vh', color: '#F8F0FF', fontFamily: "'Outfit', system-ui, sans-serif" }}>

      {/* HERO */}
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px 60px', textAlign: 'center', position: 'relative' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(192,38,211,0.1)', border: '1px solid rgba(192,38,211,0.3)', borderRadius: '980px', padding: '6px 16px', fontSize: '13px', color: '#C026D3', fontWeight: 600, marginBottom: '28px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
          Mezclas Ilimitadas — Completamente Gratis
        </div>
        <h1 style={{ fontSize: 'clamp(38px,7vw,80px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: '20px', maxWidth: '900px' }}>
          <span style={S.grad}>Mezcla tu música</span><br />
          <span style={{ color: '#F8F0FF' }}>como un profesional</span>
        </h1>
        <p style={{ fontSize: 'clamp(16px,2.5vw,20px)', color: 'rgba(248,240,255,0.65)', maxWidth: '600px', lineHeight: 1.7, marginBottom: '40px' }}>
          Sube tus pistas, nuestra IA las mezcla con calidad de estudio.<br />Sin límites, sin costo, sin complicaciones.
        </p>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '60px' }}>
          <button onClick={() => setShowChat(true)}
            style={{ background: 'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)', border: 'none', color: '#fff', padding: '16px 36px', borderRadius: '980px', fontSize: '17px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 32px rgba(192,38,211,0.5)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🎛️ Mezclar gratis ahora
          </button>
          <a href="#como-funciona" style={{ background: 'transparent', border: '1px solid rgba(192,38,211,0.3)', color: '#9B7EC8', padding: '16px 32px', borderRadius: '980px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            Ver cómo funciona ↓
          </a>
        </div>

        {/* Preview del mixer */}
        <div style={{ width: '100%', maxWidth: '780px', background: 'rgba(15,10,26,0.8)', border: '1px solid rgba(192,38,211,0.2)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
          <div style={{ background: 'rgba(26,16,40,0.9)', padding: '10px 16px', borderBottom: '1px solid rgba(192,38,211,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {['#EF4444','#FBBF24','#4ade80'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }}></div>)}
            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#9B7EC8' }}>Mezclador AI Pro — mixingmusic.ai</span>
          </div>
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(9,1fr)', gap: '6px' }}>
            {PRESETS.map((p) => (
              <div key={p.id} style={{ background: `${p.color}18`, border: `1px solid ${p.color}44`, borderRadius: '8px', padding: '8px 4px', textAlign: 'center', cursor: 'pointer' }} onClick={() => setShowChat(true)}>
                <div style={{ height: '20px', display: 'flex', alignItems: 'flex-end', gap: '1px', marginBottom: '5px' }}>
                  {p.wavePattern.slice(0,6).map((h,i) => <div key={i} style={{ flex: 1, height: `${h*100}%`, background: p.color, borderRadius: '1px' }}></div>)}
                </div>
                <div style={{ fontSize: '9px', color: '#F8F0FF', fontWeight: 700 }}>{p.name}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 20px', background: 'rgba(8,4,16,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#9B7EC8' }}>✦ Gospel activo · -14.0 LUFS · Safe ✓</span>
            <button onClick={() => setShowChat(true)} style={{ background: 'linear-gradient(135deg,#EC4899,#C026D3)', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: '980px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Usar gratis →</button>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div ref={statsRef} style={{ background: 'rgba(26,16,40,0.6)', borderTop: '1px solid rgba(192,38,211,0.1)', borderBottom: '1px solid rgba(192,38,211,0.1)', padding: '40px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '32px' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: 'center', opacity: statsVisible ? 1 : 0, transform: statsVisible ? 'translateY(0)' : 'translateY(20px)', transition: `all 0.6s ease ${i*0.1}s` }}>
              <div style={{ fontSize: '36px', marginBottom: '4px' }}>{s.icon}</div>
              <div style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 800, ...S.grad }}>{s.num}</div>
              <div style={{ fontSize: '13px', color: 'rgba(248,240,255,0.5)', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CÓMO FUNCIONA */}
      <div id="como-funciona" style={{ ...S.section }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <h2 style={S.sectionTitle}>3 pasos para tu <span style={S.grad}>mezcla perfecta</span></h2>
          <p style={S.sectionSub}>Sin instalar nada. Sin tarjeta de crédito. Funciona en el navegador.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '24px' }}>
          {[
            { num: '01', icon: '💬', title: 'Cuéntale a la IA', desc: 'Describe tu canción: género, estilo, referencias. La IA selecciona el preset perfecto con EQ, compresión y reverb calibrados.' },
            { num: '02', icon: '🎵', title: 'Sube tus stems', desc: 'Arrastra tus pistas WAV, MP3 o FLAC. Hasta 12 stems simultáneos. La IA las detecta, organiza y balancea automáticamente.' },
            { num: '03', icon: '🚀', title: 'Descarga en calidad pro', desc: 'Exporta WAV 24-bit o MP3 normalizado a -14 LUFS. Listo para Spotify, YouTube y cualquier plataforma de streaming.' },
          ].map((step, i) => (
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
            <h2 style={S.sectionTitle}>9 presets de género, <span style={S.grad}>calibrados profesionalmente</span></h2>
            <p style={S.sectionSub}>Cada preset tiene su propio EQ, compresión, reverb y delay. Cambia en tiempo real y escucha la diferencia.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '14px' }}>
            {PRESETS.map(p => (
              <div key={p.id} onClick={() => setShowChat(true)} style={{ background: `linear-gradient(135deg,${p.color}18,${p.color}08)`, border: `1px solid ${p.color}33`, borderRadius: '14px', padding: '18px', cursor: 'pointer', transition: 'transform 0.15s', display: 'flex', flexDirection: 'column', gap: '10px' }}
                onMouseEnter={e => (e.currentTarget.style.transform='scale(1.03)')}
                onMouseLeave={e => (e.currentTarget.style.transform='scale(1)')}>
                <div style={{ height: '28px', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
                  {p.wavePattern.map((h,i) => <div key={i} style={{ flex: 1, height: `${h*100}%`, background: p.color, borderRadius: '2px', opacity: 0.8 }}></div>)}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#F8F0FF' }}>{p.name}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(248,240,255,0.5)', marginTop: '3px' }}>{p.desc.split(',')[0]}</div>
                </div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '980px', background: `${p.color}22`, color: p.color }}>B:{p.bass>0?'+':''}{p.bass}</span>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '980px', background: `${p.color}22`, color: p.color }}>R:{Math.round(p.reverbWet*100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TESTIMONIALS */}
      <div style={{ ...S.section }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={S.sectionTitle}>Lo que dicen los <span style={S.grad}>músicos reales</span></h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '20px' }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} style={{ ...S.card }}>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                {'★★★★★'.split('').map((s,j) => <span key={j} style={{ color: '#FBBF24', fontSize: '14px' }}>{s}</span>)}
              </div>
              <p style={{ fontSize: '14px', color: 'rgba(248,240,255,0.8)', lineHeight: 1.7, marginBottom: '16px', fontStyle: 'italic' }}>"{t.text}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,#EC4899,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>{t.name[0]}</div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8F0FF' }}>{t.name} {t.country}</div>
                  <div style={{ fontSize: '11px', color: '#9B7EC8' }}>{t.role}</div>
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
              <h2 style={{ ...S.sectionTitle, marginBottom: '8px' }}>Aprende con nuestro <span style={S.grad}>blog de mezcla</span></h2>
              <p style={{ fontSize: '15px', color: 'rgba(248,240,255,0.5)' }}>Guías, tutoriales y noticias del mundo del audio profesional</p>
            </div>
            <a href="/blog" style={{ color: '#C026D3', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Ver todos los artículos →</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '20px' }}>
            {recentArticles.map((article, i) => (
              <a key={i} href={`/blog/${article.slug}`} style={{ ...S.card, textDecoration: 'none', display: 'block', transition: 'transform 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.transform='translateY(-4px)')}
                onMouseLeave={e => (e.currentTarget.style.transform='translateY(0)')}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#C026D3', marginBottom: '10px' }}>{article.categoryNameEs || article.categoryName}</div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8F0FF', lineHeight: 1.4, marginBottom: '10px' }}>{article.titleEs || article.title}</h3>
                <p style={{ fontSize: '13px', color: 'rgba(248,240,255,0.55)', lineHeight: 1.6, marginBottom: '16px' }}>{(article.excerptEs || article.excerpt).slice(0, 110)}...</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#9B7EC8' }}>
                  <span>⏱ {article.readTime} min lectura</span>
                  <span style={{ color: '#C026D3', fontWeight: 600 }}>Leer →</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div style={{ ...S.section }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={S.sectionTitle}>¿Por qué mezclar con <span style={S.grad}>Inteligencia Artificial?</span></h2>
          <p style={S.sectionSub}>Todo lo que necesitas saber antes de tu primera mezcla</p>
        </div>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} style={{ ...S.card, padding: '0', overflow: 'hidden' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: '100%', background: 'none', border: 'none', padding: '20px 24px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', fontFamily: 'inherit' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#F8F0FF', lineHeight: 1.4 }}>{item.q}</span>
                <span style={{ color: '#C026D3', fontSize: '20px', flexShrink: 0, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)' }}>+</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 24px 20px', fontSize: '14px', color: 'rgba(248,240,255,0.65)', lineHeight: 1.8, borderTop: '1px solid rgba(192,38,211,0.1)' }}>
                  <p style={{ marginTop: '16px' }}>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA FINAL */}
      <div style={{ background: 'linear-gradient(135deg,rgba(36,22,54,0.9),rgba(124,58,237,0.15))', borderTop: '1px solid rgba(192,38,211,0.2)', padding: '100px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: '16px', lineHeight: 1.1 }}>
          Tu próxima mezcla,<br /><span style={S.grad}>lista en 3 minutos</span>
        </h2>
        <p style={{ fontSize: '17px', color: 'rgba(248,240,255,0.6)', marginBottom: '36px', maxWidth: '500px', margin: '0 auto 36px' }}>
          Únete a más de 47,000 músicos que ya mezclan con IA profesional. Sin costo, sin límites.
        </p>
        <button onClick={() => setShowChat(true)}
          style={{ background: 'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)', border: 'none', color: '#fff', padding: '18px 48px', borderRadius: '980px', fontSize: '18px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 40px rgba(192,38,211,0.6)' }}>
          🎛️ Empezar gratis ahora
        </button>
      </div>

      {/* FOOTER */}
      <div style={{ background: 'rgba(8,4,16,0.9)', borderTop: '1px solid rgba(192,38,211,0.1)', padding: '40px 20px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, ...S.grad }}>mixingmusic.ai</div>
            <div style={{ fontSize: '12px', color: 'rgba(248,240,255,0.4)', marginTop: '4px' }}>Mezcla profesional con IA — Gratis</div>
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {[['Blog','/blog'],['Precios','/pricing'],['Privacidad','/privacy'],['Términos','/terms']].map(([label,href]) => (
              <a key={href} href={href} style={{ color: 'rgba(248,240,255,0.45)', fontSize: '13px', textDecoration: 'none' }}>{label}</a>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(248,240,255,0.3)' }}>© 2026 MixingMusic.AI</div>
        </div>
      </div>
    </div>
  );
}
