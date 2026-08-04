import { useEffect } from 'react';
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

const albumFeatures = [
  'Hasta 12 canciones por proyecto',
  'Volumen percibido consistente',
  'Balance tonal y rango dinámico coherentes',
  'Ajustes individuales antes de exportar',
];

export default function HomeHeroV3() {
  const navigate = useNavigate();

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
          <a href="#planes">Planes</a>
          <button className="v3-nav-login" onClick={() => navigate('/auth/login')}>Ingresar</button>
          <button className="v3-button v3-button-small" onClick={() => begin('master')}>Probar gratis</button>
        </div>
      </nav>

      <section className="v3-hero" id="inicio">
        <div className="v3-hero-glow v3-hero-glow-one" />
        <div className="v3-hero-glow v3-hero-glow-two" />
        <div className="v3-eyebrow">
          <span /> Mezcla y mastering en una sola plataforma
        </div>
        <h1>
          De tus pistas a un sonido
          <strong> listo para publicar.</strong>
        </h1>
        <p className="v3-hero-copy">
          Mezcla stems o mejora una mezcla estéreo con los presets de MixingMusic.
          Sin suscripciones y sin instalar nada.
        </p>

        <div className="v3-mode-grid" aria-label="Selecciona un flujo de trabajo">
          <article className="v3-mode-card v3-mode-mix">
            <div className="v3-mode-topline">
              <span className="v3-mode-icon" aria-hidden="true">≋</span>
              <span className="v3-mode-label">MIXING</span>
            </div>
            <h2>Mezclar mis stems</h2>
            <p>Sube voz, batería, bajo, guitarras y demás pistas. La IA prepara el balance y tú conservas el control.</p>
            <ul>
              <li>Hasta 12 stems</li>
              <li>9 presets de género</li>
              <li>Editor multipista</li>
            </ul>
            <button className="v3-button v3-button-primary" onClick={() => begin('mix')}>
              Comenzar una mezcla <span>→</span>
            </button>
          </article>

          <article className="v3-mode-card v3-mode-master">
            <div className="v3-popular">NUEVO EN V3</div>
            <div className="v3-mode-topline">
              <span className="v3-mode-icon" aria-hidden="true">◇</span>
              <span className="v3-mode-label">MASTERING</span>
            </div>
            <h2>Mejorar mi mezcla</h2>
            <p>Sube tu premezcla y obtén claridad, fuerza, dinámica y volumen competitivo sin perder su carácter.</p>
            <ul>
              <li>Análisis técnico automático</li>
              <li>Presets MixingMusic</li>
              <li>MP3 y WAV 24 bits</li>
            </ul>
            <button className="v3-button v3-button-accent" onClick={() => begin('master')}>
              Masterizar una canción <span>→</span>
            </button>
          </article>
        </div>

        <p className="v3-free-note">
          <span>Gratis:</span> mezcla 3 canciones y descarga 1 master en MP3. No necesitas tarjeta.
        </p>
      </section>

      <section className="v3-trust" aria-label="Beneficios principales">
        <div><strong>12</strong><span>stems por mezcla</span></div>
        <div><strong>24-bit</strong><span>WAV profesional</span></div>
        <div><strong>12</strong><span>canciones por álbum</span></div>
        <div><strong>1 pago</strong><span>sin suscripción</span></div>
      </section>

      <section className="v3-section v3-workflow" id="funciones">
        <div className="v3-section-heading">
          <span className="v3-kicker">UN FLUJO, DOS PUNTOS DE PARTIDA</span>
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
            <div className="v3-plan-name">UNLIMITED</div>
            <div className="v3-price"><sup>$</sup>14.99</div>
            <p>Pago único · acceso permanente.</p>
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

      <footer className="v3-footer">
        <img src="/logo-brand.png" alt="MixingMusic.AI" />
        <p>Mezcla y mastering para artistas independientes.</p>
        <div>
          <a href="/terms">Términos</a>
          <a href="/privacy">Privacidad</a>
          <a href="/blog">Blog</a>
        </div>
      </footer>
    </main>
  );
}
