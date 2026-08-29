import { useNavigate } from 'react-router-dom';
import './pricing-v3.css';

const rows = [
  ['Mezcla automática desde stems', '3 canciones', 'Ilimitada'],
  ['Stems por canción', 'Hasta 12', 'Hasta 12'],
  ['Mastering de mezcla estéreo', '1 canción', 'Ilimitado'],
  ['Recomendación de preset con IA', 'Incluida', 'Incluida'],
  ['Presets propios MixingMusic', 'Incluidos', 'Incluidos'],
  ['Comparación original/master A/B', 'Incluida', 'Incluida'],
  ['Protección de pico y objetivo LUFS', 'Automático', 'Editable'],
  ['Descarga MP3 320 kbps', '1 master', 'Ilimitada'],
  ['Descarga WAV PCM 24 bits', '—', 'Ilimitada'],
  ['Guardar y reutilizar configuración', '—', 'Incluido'],
  ['Modo álbum', '—', 'Hasta 12 canciones'],
  ['Cohesión de volumen, EQ y dinámica', '—', 'Incluida'],
];

export default function PricingPage() {
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('audioMixerUser') || 'null'); } catch { return null; } })();
  return <main className="pricing-v3-page">
    <header className="pricing-v3-nav"><button onClick={() => navigate('/')}><img src="/logo-brand.png" alt="MixingMusic.AI" /><span>V3</span></button><button onClick={() => navigate(user ? '/' : '/auth/login')}>{user ? 'Ir a mi estudio' : 'Ingresar'}</button></header>
    <section className="pricing-v3-hero"><span>PRECIOS CLAROS · SIN SUSCRIPCIÓN</span><h1>Empieza gratis.<strong>Desbloquea todo para siempre.</strong></h1><p>Solo dos modalidades. Sin créditos confusos, mensualidades ni renovaciones automáticas.</p></section>
    <section className="pricing-v3-plans">
      <article>
        <span>GRATIS</span><h2>Conoce MixingMusic</h2><div className="pricing-v3-price">US$0</div><p>Sin tarjeta y sin vencimiento.</p>
        <ul><li>✓ 3 mezclas desde stems</li><li>✓ 1 master descargable en MP3</li><li>✓ Hasta 12 stems por canción</li><li>✓ Presets y recomendación IA</li></ul>
        <button onClick={() => navigate(user ? '/' : '/auth/register')}>Empezar gratis →</button>
      </article>
      <article className="featured"><b>PRECIO FUNDADOR</b><span>UNLIMITED PARA SIEMPRE</span><h2>Todo el estudio, sin límites</h2><div className="pricing-v3-price"><sup>COP $</sup>49.900</div><p>Un solo pago con Mercado Pago o PayPal.</p>
        <ul><li>✓ Mezclas y masters ilimitados</li><li>✓ WAV PCM real de 24 bits</li><li>✓ Guardar configuraciones</li><li>✓ Modo álbum de hasta 12 canciones</li></ul>
        <button onClick={() => navigate(user ? '/checkout-v3' : '/auth/register?mode=checkout')}>Elegir método de pago →</button>
      </article>
    </section>
    <section className="pricing-v3-table-section"><div><span>COMPARACIÓN COMPLETA</span><h2>Sabes exactamente qué recibes.</h2><p>Unlimited es una compra permanente para la cuenta, no una suscripción.</p></div><div className="pricing-v3-table"><div className="head"><strong>Funcionalidad</strong><strong>Gratis</strong><strong>Unlimited</strong></div>{rows.map(([name,free,unlimited])=><div key={name}><strong>{name}</strong><span>{free}</span><b>{unlimited}</b></div>)}</div></section>
    <section className="pricing-v3-faq"><h2>Antes de comprar</h2><div><article><strong>¿Me cobrarán otra vez?</strong><p>No. COP $49.900 es un pago único y no existe renovación automática. En PayPal se cobra el equivalente publicado de US$14.99.</p></article><article><strong>¿Cómo se activa?</strong><p>Mercado Pago o PayPal confirma el pago y Unlimited queda asociado permanentemente a tu cuenta.</p></article><article><strong>¿Qué pasa con mis archivos?</strong><p>El audio original permanece intacto. Solo procesamos una copia para generar la mezcla o el master.</p></article></div></section>
  </main>;
}
