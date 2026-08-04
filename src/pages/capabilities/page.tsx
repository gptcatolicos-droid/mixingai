import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './capabilities.css';

const rows = [
  ['Crear mezclas desde stems', '3 canciones', 'Ilimitadas'],
  ['Stems por canción', 'Hasta 12', 'Hasta 12'],
  ['Mejorar una mezcla estéreo', 'Incluido', 'Ilimitado'],
  ['Mastering automático', '1 canción', 'Ilimitado'],
  ['Presets propios de MixingMusic', 'Incluidos', 'Incluidos'],
  ['Control de mastering', 'Esencial', 'Avanzado y editable'],
  ['Comparación original / resultado', 'Incluida', 'Incluida'],
  ['Protección true peak y clipping', 'Incluida', 'Incluida'],
  ['Descarga MP3', '1 master', 'Ilimitada'],
  ['Descarga WAV real de 24 bits', '—', 'Incluida'],
  ['Guardar y reutilizar configuración', '—', 'Incluido'],
  ['Modo álbum', '—', 'Hasta 12 canciones'],
  ['Cohesión tonal, dinámica y de volumen', '—', 'Incluida'],
  ['Procesamiento y descarga por lote', '—', 'Incluido'],
  ['Modelo de acceso', 'Gratis', 'Un solo pago'],
];

export default function CapabilitiesPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('capabilities-page');
    return () => document.body.classList.remove('capabilities-page');
  }, []);

  return (
    <main className="cap-v3">
      <nav className="cap-nav">
        <button onClick={() => navigate('/')} className="cap-brand"><img src="/logo-brand.png" alt="MixingMusic.AI" /><span>V3</span></button>
        <button className="cap-back" onClick={() => navigate('/')}>← Volver al inicio</button>
      </nav>

      <header className="cap-hero">
        <span className="cap-kicker">CAPACIDADES MIXINGMUSIC V3</span>
        <h1>De los stems al master.<br /><strong>De una canción a un álbum.</strong></h1>
        <p>Una vista clara de las herramientas disponibles para crear mezclas, mejorarlas y masterizarlas.</p>
        <div className="cap-actions">
          <button onClick={() => navigate('/auth/register?mode=mix')}>Crear una mezcla →</button>
          <button onClick={() => navigate('/auth/register?mode=master')}>Masterizar una mezcla →</button>
        </div>
      </header>

      <section className="cap-highlights">
        <article><strong>3</strong><span>flujos conectados</span><small>Mezcla · Mejora · Mastering</small></article>
        <article><strong>24-bit</strong><span>exportación profesional</span><small>WAV PCM real en Unlimited</small></article>
        <article><strong>12</strong><span>canciones por álbum</span><small>Una identidad sonora</small></article>
      </section>

      <section className="cap-table-wrap" aria-label="Comparación de planes MixingMusic">
        <div className="cap-table-head"><span>Funcionalidad</span><strong>Gratis</strong><strong>Unlimited</strong></div>
        {rows.map(([feature, free, unlimited]) => (
          <div className="cap-row" key={feature}>
            <span>{feature}</span>
            <span className={free === '—' ? 'cap-no' : ''}><small>GRATIS</small>{free}</span>
            <strong><small>UNLIMITED</small>{unlimited}</strong>
          </div>
        ))}
      </section>

      <section className="cap-album">
        <div><span className="cap-kicker">DIFERENCIAL UNLIMITED</span><h2>Un álbum no es una fila de singles.</h2></div>
        <p>El modo álbum analiza hasta 12 mezclas como una obra completa para compartir identidad tonal, rango dinámico y volumen percibido sin borrar el carácter de cada canción.</p>
        <button onClick={() => navigate('/mastering/album')}>Explorar modo álbum →</button>
      </section>
    </main>
  );
}
