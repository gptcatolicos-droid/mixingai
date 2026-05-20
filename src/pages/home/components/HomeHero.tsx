import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MixPreset, PRESETS } from './PresetScreen';
import { blogArticles } from '../../../mocks/blogArticles';

interface HomeHeroProps { 
  onStartMixer: (preset: MixPreset, files: File[]) => void;
  freeSongsRemaining: number;
}

// ─── Design tokens ─────────────────────────────────────
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

const TESTIMONIALS = [
  { name:'Carlos M.', role:'Productor Gospel', country:'🇨🇴', text:'Subí 10 stems de mi coro y en 3 minutos tenía una mezcla lista para radio.', stars:5 },
  { name:'Valeria R.', role:'Cantautora', country:'🇲🇽', text:'El mixer está increíble. Elegí el preset Pop y sonó profesional al instante.', stars:5 },
  { name:'DJ Fontana', role:'DJ / Productor EDM', country:'🇦🇷', text:'El preset Dance/EDM está brutal. Los -10 LUFS suenan perfecto en Spotify.', stars:5 },
];

const STATS = [
  { num:'47,832', label:'Canciones producidas', icon:'🎵' },
  { num:'-10 LUFS', label:'Estándar Spotify', icon:'🎛️' },
  { num:'100%', label:'Privado & Gratis', icon:'🔒' },
];

const FAQ_ITEMS = [
  { q:'¿Cuántas canciones puedo mezclar gratis?', a:'Hasta 2 canciones completas sin registrarte. Luego crea una cuenta para acceso ilimitado.' },
  { q:'¿Es seguro? ¿Mis archivos son privados?', a:'100% seguro. Todo se procesa en tu navegador. Tus archivos nunca dejan tu computadora.' },
  { q:'¿Qué formatos acepta?', a:'WAV, MP3, FLAC, AAC, M4A. Hasta 12 stems simultáneamente para mezclar.' },
  { q:'¿Qué es -10 LUFS?', a:'El estándar de volumen para Spotify. Exportamos siempre en el rango correcto.' },
];

// ─── Component ────────────────────────────────────────
export default function HomeHero({ onStartMixer, freeSongsRemaining }: HomeHeroProps) {
  const [openFaq, setOpenFaq] = useState<number|null>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<MixPreset>(PRESETS[0]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    onStartMixer(selectedPreset, fileArray);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const S = {
    section: { padding:'clamp(40px, 8vw, 80px) 20px', maxWidth:'1100px', margin:'0 auto' } as React.CSSProperties,
    sectionTitle: { fontSize:'clamp(28px, 5vw, 42px)', fontWeight:800, color:T.text, letterSpacing:'-1px', marginBottom:'12px', lineHeight:1.15 } as React.CSSProperties,
    sectionSub: { fontSize:'clamp(15px, 2vw, 17px)', color:T.text2, marginBottom:'40px', lineHeight:1.6 } as React.CSSProperties,
    card: { background:T.surface, border:`1px solid ${T.border}`, borderRadius:'16px', padding:'clamp(16px, 4vw, 24px)' } as React.CSSProperties,
    ctaBtn: { background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)', border:'none', color:'#fff', borderRadius:'980px', fontWeight:900, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 0 40px rgba(192,38,211,0.55)', display:'inline-flex', alignItems:'center', gap:'10px' } as React.CSSProperties,
  };

  return (
    <div style={{ minHeight:'100vh', color:T.text, fontFamily:"'Outfit',system-ui,sans-serif", background:T.bg }}>

      {/* ─── HERO ─── */}
      <div style={{ minHeight:'clamp(80vh, 100vh, 120vh)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'clamp(40px, 8vw, 100px) 20px clamp(40px, 8vw, 60px)', textAlign:'center', position:'relative' }}>

        {/* Logo */}
        <div style={{ marginBottom:'clamp(20px, 4vw, 32px)' }}>
          <img src="/logo-brand.png" alt="mixingmusic.ai" style={{ height:'clamp(40px, 8vw, 72px)', width:'auto', maxWidth:'480px' }}/>
        </div>

        {/* Badge */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:'980px', padding:'6px 14px', fontSize:'clamp(11px, 2vw, 13px)', color:T.green, fontWeight:700, marginBottom:'clamp(16px, 3vw, 24px)' }}>
          <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:T.green, display:'inline-block', animation:'pulse 2s infinite' }}></span>
          ✅ Mezcla Profesional
        </div>

        {/* H1 */}
        <h1 style={{ fontSize:'clamp(32px, 7vw, 68px)', fontWeight:900, lineHeight:1.1, letterSpacing:'-1px', marginBottom:'clamp(12px, 2vw, 20px)', maxWidth:'960px' }}>
          El mixer de música<br/>
          <span style={GRAD}>más simple</span><br/>
          <span style={{ color:T.amber }}>Gratis.</span>
        </h1>

        <p style={{ fontSize:'clamp(15px, 2vw, 19px)', color:T.text2, maxWidth:'600px', lineHeight:1.7, marginBottom:'clamp(20px, 4vw, 32px)' }}>
          Sube tus stems, elige un preset de género y exporta en WAV 24-bit listo para Spotify.
        </p>

        {/* Free songs counter */}
        <div style={{ marginBottom:'clamp(24px, 4vw, 32px)', padding:'12px 20px', background:`rgba(76,205,157,0.12)`, border:`1px solid rgba(76,205,157,0.3)`, borderRadius:'12px', fontSize:'clamp(12px, 2vw, 14px)', color:'#4ccf9d', fontWeight:600 }}>
          🎁 {freeSongsRemaining} canciones gratis disponibles
        </div>

        {/* Drag & Drop + CTA */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding:'clamp(40px, 8vw, 60px)',
            border:`2px dashed ${dragActive ? T.pink : T.border}`,
            borderRadius:'20px',
            background: dragActive ? `rgba(236,72,153,0.1)` : `rgba(26,16,40,0.4)`,
            cursor:'pointer',
            transition:'all 0.3s ease',
            marginBottom:'clamp(20px, 4vw, 32px)',
            maxWidth:'500px',
            width:'100%'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*"
            onChange={(e) => handleFiles(e.target.files)}
            style={{ display:'none' }}
          />
          <div style={{ fontSize:'clamp(32px, 6vw, 48px)', marginBottom:'12px' }}>🎵</div>
          <div style={{ fontSize:'clamp(14px, 2vw, 16px)', fontWeight:600, color:T.text, marginBottom:'6px' }}>
            Arrastra tus stems o haz clic
          </div>
          <div style={{ fontSize:'12px', color:T.text2 }}>
            WAV, MP3, FLAC — Hasta 12 archivos
          </div>
        </div>

        <p style={{ fontSize:'clamp(12px, 2vw, 13px)', color:T.text3, maxWidth:'500px' }}>
          Sin registro. Sin tarjeta. Procesa todo en tu navegador.
        </p>
      </div>

      {/* ─── TESTIMONIALS ─── */}
      <section style={S.section}>
        <h2 style={S.sectionTitle}>Usado por música makers</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap:'clamp(16px, 3vw, 20px)' }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} style={S.card}>
              <div style={{ marginBottom:'12px' }}>{'⭐'.repeat(t.stars)}</div>
              <p style={{ color:T.text, marginBottom:'clamp(12px, 2vw, 16px)', lineHeight:1.6, fontSize:'clamp(14px, 2vw, 15px)' }}>{t.text}</p>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'clamp(11px, 2vw, 13px)', color:T.text2 }}>
                <div><strong>{t.name}</strong><br/>{t.role}</div>
                <span style={{ fontSize:'18px' }}>{t.country}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section style={{ ...S.section, background:`rgba(192,38,211,0.05)`, borderRadius:'clamp(16px, 4vw, 24px)', marginBottom:'clamp(40px, 8vw, 80px)' }} ref={statsRef}>
        <h2 style={S.sectionTitle}>Confiado por miles</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap:'clamp(24px, 4vw, 40px)', marginTop:'clamp(24px, 4vw, 40px)' }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign:'center' }}>
              <div style={{ fontSize:'clamp(32px, 6vw, 48px)', marginBottom:'12px' }}>{s.icon}</div>
              <div style={{ fontSize:'clamp(24px, 5vw, 32px)', fontWeight:900, color:T.text, marginBottom:'8px' }}>
                {statsVisible ? s.num : '0'}
              </div>
              <div style={{ fontSize:'clamp(12px, 2vw, 14px)', color:T.text2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section style={S.section}>
        <h2 style={S.sectionTitle}>Preguntas frecuentes</h2>
        <div style={{ maxWidth:'700px', margin:'0 auto' }}>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} style={{ marginBottom:'clamp(12px, 2vw, 16px)', border:`1px solid ${T.border}`, borderRadius:'12px', overflow:'hidden' }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width:'100%', padding:'clamp(14px, 3vw, 20px)', background:T.surface, color:T.text, border:'none', fontSize:'clamp(14px, 2vw, 16px)', fontWeight:600, cursor:'pointer', textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:'inherit' }}
              >
                {item.q}
                <span style={{ fontSize:'18px', flexShrink:0 }}>{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && (
                <div style={{ padding:'clamp(14px, 3vw, 20px)', background:T.bgDeep, color:T.text2, fontSize:'clamp(13px, 2vw, 15px)', lineHeight:1.6, borderTop:`1px solid ${T.border}` }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{ ...S.section, textAlign:'center', marginBottom:'clamp(40px, 8vw, 80px)' }}>
        <h2 style={S.sectionTitle}>Comienza ahora</h2>
        <p style={S.sectionSub}>2 canciones gratis. Sin tarjeta. Sin registro.</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ ...S.ctaBtn, padding:'clamp(16px, 3vw, 24px) clamp(32px, 6vw, 52px)', fontSize:'clamp(15px, 2vw, 18px)' }}
        >
          🎚️ Abrir Mixer
        </button>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ padding:'clamp(24px, 4vw, 40px) 20px', textAlign:'center', borderTop:`1px solid ${T.border}`, color:T.text3, fontSize:'clamp(11px, 2vw, 13px)' }}>
        <p style={{ marginBottom:'12px' }}>© 2026 MixingMusic.AI. Hecho con ❤️</p>
        <div style={{ display:'flex', gap:'clamp(12px, 3vw, 20px)', justifyContent:'center', flexWrap:'wrap' }}>
          <a href="/terms" style={{ color:T.pink, textDecoration:'none' }}>Términos</a>
          <a href="/privacy" style={{ color:T.pink, textDecoration:'none' }}>Privacidad</a>
          <a href="/cookies" style={{ color:T.pink, textDecoration:'none' }}>Cookies</a>
        </div>
      </footer>
    </div>
  );
}
