import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRESETS } from './mixTypes';
import './home-v3.css';

const benefits = [
  {
    number: '01',
    title: 'Elige tu punto de partida',
    text: 'Sube hasta 12 stems para mezclarlos o carga una premezcla estéreo lista para mastering.',
  },
  {
    number: '02',
    title: 'Define tu sonido',
    text: 'Usa los presets de MixingMusic y controla intensidad, dinámica, color, estéreo y loudness.',
  },
  {
    number: '03',
    title: 'Compara y descarga',
    text: 'Escucha original y resultado con volumen igualado. Exporta MP3 o WAV real de 24 bits.',
  },
];

const coreFunctions = [
  { number: '01', title: 'Crear una mezcla', text: 'Sube los stems separados y construye una mezcla completa con IA.', preset: PRESETS.find((preset) => preset.id === 'reggaeton')! },
  { number: '02', title: 'Mejorar una mezcla', text: 'Corrige balance, claridad, amplitud y dinámica de tu premezcla.', preset: PRESETS.find((preset) => preset.id === 'dance')! },
  { number: '03', title: 'Masterizar una mezcla', text: 'Lleva el resultado al nivel final de loudness y exportación profesional.', preset: PRESETS.find((preset) => preset.id === 'pop')! },
];

const albumFeatures = [
  'Hasta 12 canciones por proyecto',
  'Volumen percibido consistente',
  'Balance tonal y rango dinámico coherentes',
  'Ajustes individuales antes de exportar',
];

const reasons = [
  { icon: '◇', title: 'Decisiones más rápidas', text: 'La IA analiza balance, dinámica y tono en segundos para que dediques el tiempo a la música.' },
  { icon: '≋', title: 'Consistencia técnica', text: 'Cada resultado revisa loudness, true peak, claridad y compatibilidad antes de exportar.' },
  { icon: '⌘', title: 'Tú conservas el control', text: 'Elige presets, compara el antes y después y ajusta el carácter final sin perder tu intención.' },
];

const testimonials = [
  { quote: 'La voz y el coro quedaron claros sin perder la emoción. Pude terminar una canción que llevaba semanas detenida.', name: 'Carlos M.', role: 'Productor gospel · Colombia' },
  { quote: 'Subí mi mezcla, elegí el carácter y el master salió con más fuerza y amplitud, pero seguía sonando a mí.', name: 'Valeria R.', role: 'Cantautora · México' },
  { quote: 'La rapidez ayuda muchísimo y todavía puedo tomar decisiones. No se siente como una caja negra.', name: 'DJ Fontana', role: 'DJ y productor · Argentina' },
];

const faqs = [
  { question: '¿Cuál es la diferencia entre mezclar y masterizar?', answer: 'Mezclar combina tus stems separados y define el balance de la canción. Masterizar trabaja sobre una mezcla estéreo terminada para mejorar tono, dinámica, amplitud y nivel final.' },
  { question: '¿Qué incluye el plan gratis?', answer: 'Puedes crear tres mezclas desde stems y masterizar una canción, con descarga del master en MP3. No necesitas tarjeta.' },
  { question: '¿El WAV Unlimited es realmente de 24 bits?', answer: 'Sí. En Unlimited la exportación se codifica como WAV PCM real de 24 bits; no es un archivo de 16 bits renombrado.' },
  { question: '¿Qué hace el modo álbum?', answer: 'Procesa hasta 12 mezclas como un conjunto para mantener volumen percibido, balance tonal y rango dinámico coherentes, conservando ajustes individuales por canción.' },
  { question: '¿MixingMusic reemplaza mis decisiones?', answer: 'No. La IA propone un punto de partida técnico y musical basado en nuestros presets; tú comparas, ajustas y eliges el resultado final.' },
];

export default function HomeHeroV3() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    document.body.classList.add('page-home', 'page-home-v3');
    return () => document.body.classList.remove('page-home', 'page-home-v3');
  }, []);

  const begin = (mode: 'mix' | 'master') => {
    navigate(`/auth/register?mode=${mode}`);
  };

  return (
    <main className="v3-home">
      <nav className="v3-nav" aria-label="Navegación principal">
        <a className="v3-brand" href="#inicio" aria-label="MixingMusic inicio">
          <img src="/logo-brand.png" alt="MixingMusic.AI" />
          <span className="v3-badge">V3</span>
        </a>
        <div className="v3-nav-actions">
          <a href="#funciones">Funciones</a>
          <button className="v3-nav-link" onClick={() => navigate('/capacidades')}>Capacidades</button>
          <button className="v3-nav-link" onClick={() => navigate('/conceptos-audio')}>Conceptos</button>
          <a href="/pricing">Planes</a>
          <button className="v3-nav-login" onClick={() => navigate('/auth/login')}>Ingresar</button>
          <button className="v3-button v3-button-small" onClick={() => begin('master')}>Probar gratis</button>
        </div>
      </nav>

      <section className="v3-hero" id="inicio">
        <div className="v3-hero-glow v3-hero-glow-one" />
        <div className="v3-hero-glow v3-hero-glow-two" />
        <div className="v3-eyebrow"><span /> Tres funciones profesionales · dos caminos simples</div>
        <h1>
          Crea una mezcla.
          <strong> O masteriza una mezcla.</strong>
        </h1>
        <p className="v3-hero-copy">
          Si tienes pistas separadas, crea la mezcla completa. Si ya tienes una mezcla estéreo,
          mejórala y masterízala para dejarla lista para publicar.
        </p>

        <div className="v3-function-strip" aria-label="Las tres funciones de MixingMusic">
          {coreFunctions.map((item) => (
            <div key={item.number} style={{ '--function-color': item.preset.color } as React.CSSProperties}>
              <div className="v3-function-wave" aria-hidden="true">
                {item.preset.wavePattern.slice(0, 12).map((height, index) => <i key={index} style={{ height: `${Math.max(16, height * 100)}%` }} />)}
              </div>
              <span>{item.number}</span><strong>{item.title}</strong><small>{item.text}</small>
            </div>
          ))}
        </div>

        <div className="v3-mode-grid" aria-label="Selecciona un flujo de trabajo">
          <article className="v3-mode-card v3-mode-mix">
            <div className="v3-mode-topline">
              <span className="v3-mode-icon" aria-hidden="true">≋</span>
              <span className="v3-mode-label">MIXING</span>
            </div>
            <h2>Crear una mezcla</h2>
            <p>Sube voz, batería, bajo, guitarras y demás pistas. La IA prepara el balance y tú conservas el control.</p>
            <ul>
              <li>Hasta 12 stems</li>
              <li>9 presets de género</li>
              <li>Editor multipista</li>
            </ul>
            <button className="v3-button v3-button-primary" onClick={() => begin('mix')}>
              Crear una mezcla <span>→</span>
            </button>
          </article>

          <article className="v3-mode-card v3-mode-master">
            <div className="v3-popular">NUEVO EN V3</div>
            <div className="v3-mode-topline">
              <span className="v3-mode-icon" aria-hidden="true">◇</span>
              <span className="v3-mode-label">MASTERING</span>
            </div>
            <h2>Masterizar una mezcla</h2>
            <p>Sube tu premezcla, mejora claridad, fuerza y dinámica, y llévala al volumen final sin perder su carácter.</p>
            <ul>
              <li>Mejora tonal y dinámica</li>
              <li>Presets MixingMusic</li>
              <li>MP3 y WAV 24 bits</li>
            </ul>
            <button className="v3-button v3-button-accent" onClick={() => begin('master')}>
              Masterizar una mezcla <span>→</span>
            </button>
          </article>
        </div>

        <p className="v3-free-note">
          <span>Gratis:</span> mezcla 3 canciones y descarga 1 master en MP3. No necesitas tarjeta.
        </p>
        <button className="v3-album-hero" onClick={() => navigate('/mastering/album')}>
          <span>MODO ÁLBUM</span>
          <strong>Masteriza hasta 12 canciones con una identidad sonora coherente</strong>
          <i>Explorar →</i>
        </button>
      </section>

      <section className="v3-trust" aria-label="Beneficios principales">
        <div><strong>12</strong><span>stems por mezcla</span></div>
        <div><strong>24-bit</strong><span>WAV profesional</span></div>
        <div><strong>12</strong><span>canciones por álbum</span></div>
        <div><strong>1 pago</strong><span>sin suscripción</span></div>
      </section>

      <section className="v3-award" aria-label="Global Recognition Award 2026">
        <div className="v3-award-copy">
          <span className="v3-kicker">RECONOCIMIENTO INTERNACIONAL</span>
          <h2>Ganadores del 2026 Global Recognition Award.</h2>
          <p>
            MixingMusic.AI fue reconocida globalmente por innovación en inteligencia artificial
            aplicada a la producción musical. Tecnología creada para democratizar resultados profesionales.
          </p>
          <div className="v3-award-seal"><span>GRA</span><strong>WINNER 2026</strong></div>
        </div>
        <div className="v3-award-image">
          <img src="/winner3.png" alt="MixingMusic.AI, ganador del 2026 Global Recognition Award por innovación en inteligencia artificial aplicada a la producción musical" />
        </div>
      </section>

      <section className="v3-section v3-workflow" id="funciones">
        <div className="v3-section-heading">
          <span className="v3-kicker">DOS CAMINOS, TRES FUNCIONES</span>
          <h2>Menos técnica. Más decisiones musicales.</h2>
          <p>MixingMusic analiza el audio y propone un resultado; tú eliges el carácter final.</p>
        </div>
        <div className="v3-steps">
          {benefits.map((item) => (
            <article key={item.number}>
              <span>{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="v3-presets-section">
        <div className="v3-presets-copy">
          <span className="v3-kicker">NUESTRO DIFERENCIAL</span>
          <h2>Tu sonido empieza con nuestros presets.</h2>
          <p>
            Los mismos perfiles que ya conoces ahora podrán guiar tanto la mezcla como el mastering.
            No reemplazamos su carácter: lo llevamos al resultado final.
          </p>
          <button className="v3-text-button" onClick={() => begin('master')}>Probar un preset <span>→</span></button>
        </div>
        <div className="v3-presets-grid">
          {PRESETS.map((preset) => (
            <div className="v3-preset" key={preset.id} style={{ '--preset-color': preset.color } as React.CSSProperties}>
              <div className="v3-preset-wave">
                {preset.wavePattern.slice(0, 8).map((height, index) => (
                  <i key={index} style={{ height: `${Math.max(18, height * 100)}%` }} />
                ))}
              </div>
              <span>{preset.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="v3-album">
        <div className="v3-album-visual" aria-hidden="true">
          {[72, 48, 88, 60, 38, 78, 52, 92, 65, 44, 82, 56].map((height, index) => (
            <div key={index} style={{ height: `${height}%` }} />
          ))}
          <span>ALBUM / 12 TRACKS</span>
        </div>
        <div className="v3-album-copy">
          <span className="v3-kicker">MODO ÁLBUM</span>
          <h2>Doce canciones. Una misma identidad sonora.</h2>
          <p>
            Procesa un álbum completo como un conjunto y conserva la intención particular de cada canción.
          </p>
          <ul>
            {albumFeatures.map((feature) => <li key={feature}>{feature}</li>)}
          </ul>
          <button className="v3-button v3-button-accent" onClick={() => navigate('/mastering/album')}>Crear master de álbum <span>→</span></button>
        </div>
      </section>

      <section className="v3-section v3-capabilities-teaser">
        <div>
          <span className="v3-kicker">UNA PLATAFORMA COMPLETA</span>
          <h2>Todo lo que necesitas, desde los stems hasta el álbum.</h2>
          <p>Consulta en una sola vista qué puedes hacer gratis y qué desbloqueas con Unlimited.</p>
        </div>
        <button className="v3-button v3-button-accent" onClick={() => navigate('/capacidades')}>Ver Funciones MixingMusic <span>→</span></button>
      </section>

      <section className="v3-section v3-why">
        <div className="v3-section-heading">
          <span className="v3-kicker">POR QUÉ USAR IA</span>
          <h2>La tecnología se ocupa de lo repetitivo. Tú decides cómo debe sentirse.</h2>
        </div>
        <div className="v3-reason-grid">
          {reasons.map((reason) => (
            <article key={reason.title}><span>{reason.icon}</span><h3>{reason.title}</h3><p>{reason.text}</p></article>
          ))}
        </div>
      </section>

      <section className="v3-section v3-testimonials">
        <div className="v3-section-heading">
          <span className="v3-kicker">ARTISTAS Y PRODUCTORES</span>
          <h2>Resultados que ayudan a terminar y publicar música.</h2>
        </div>
        <div className="v3-testimonial-grid">
          {testimonials.map((item) => (
            <figure key={item.name}><blockquote>“{item.quote}”</blockquote><figcaption><strong>{item.name}</strong><span>{item.role}</span></figcaption></figure>
          ))}
        </div>
      </section>

      <section className="v3-section v3-faq">
        <div className="v3-section-heading">
          <span className="v3-kicker">PREGUNTAS FRECUENTES</span>
          <h2>Antes de subir tu música.</h2>
        </div>
        <div className="v3-faq-list">
          {faqs.map((item, index) => (
            <article className={openFaq === index ? 'is-open' : ''} key={item.question}>
              <button onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}>
                <span>{item.question}</span><i>{openFaq === index ? '−' : '+'}</i>
              </button>
              {openFaq === index && <p>{item.answer}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="v3-section v3-pricing" id="planes">
        <div className="v3-section-heading">
          <span className="v3-kicker">PRECIO SIMPLE</span>
          <h2>Empieza gratis. Paga una sola vez.</h2>
          <p>Sin renovación mensual, créditos confusos ni contratos anuales.</p>
        </div>
        <div className="v3-price-grid">
          <article className="v3-price-card">
            <div className="v3-plan-name">GRATIS</div>
            <div className="v3-price"><sup>$</sup>0</div>
            <p>Para conocer el flujo completo.</p>
            <ul>
              <li>3 mezclas desde stems</li>
              <li>1 master descargable</li>
              <li>Descarga master en MP3</li>
              <li>Presets MixingMusic</li>
            </ul>
            <button className="v3-button v3-button-outline" onClick={() => begin('mix')}>Crear cuenta gratis</button>
          </article>
          <article className="v3-price-card v3-price-featured">
            <div className="v3-founders">PRECIO FUNDADOR</div>
            <div className="v3-plan-name">ILIMITADO PARA SIEMPRE</div>
            <div className="v3-price"><sup>$</sup>14.99</div>
            <p>Un solo pago · no es suscripción · acceso permanente.</p>
            <ul>
              <li>Mezclas y masters ilimitados</li>
              <li>MP3 + WAV real de 24 bits</li>
              <li>Configuraciones guardadas</li>
              <li>Modo álbum hasta 12 canciones</li>
            </ul>
            <button className="v3-button v3-button-accent" onClick={() => navigate('/checkout-v3')}>Activar Unlimited</button>
            <small>Precio regular posterior: US$29.99</small>
          </article>
        </div>
      </section>

      <section className="v3-guitarraia" aria-label="GuitarraIA">
        <div className="v3-guitarraia-copy">
          <span className="v3-kicker">OTRA EXPERIENCIA MUSICAL CON IA</span>
          <h2>¿También tocas guitarra?</h2>
          <p>Descubre acordes, canciones, tablaturas y afinación con inteligencia artificial en GuitarraIA.</p>
          <a href="https://www.guitarraia.com" target="_blank" rel="noreferrer">Conocer GuitarraIA <span>↗</span></a>
        </div>
        <a className="v3-guitarraia-image" href="https://www.guitarraia.com" target="_blank" rel="noreferrer" aria-label="Visitar GuitarraIA">
          <img src="/guitarraia-promo.jpeg" alt="GuitarraIA, la IA que te hace tocar más" />
        </a>
      </section>

    </main>
  );
}
