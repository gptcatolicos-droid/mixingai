import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './concepts.css';

const concepts = [
  { term: 'LUFS', simple: 'Qué tan fuerte se siente toda la canción.', detail: 'El valor momentáneo cambia segundo a segundo. El integrado resume la canción completa. Por eso pueden mostrar números diferentes sin que exista un error.' },
  { term: 'VU meter', simple: 'Una guía visual del nivel mientras suena la música.', detail: 'Las barras suben y bajan con la energía del audio. Sirven para detectar partes demasiado suaves o demasiado fuertes.' },
  { term: 'dBFS y pico', simple: 'El punto más alto que alcanza el audio digital.', detail: '0 dBFS es el límite. Dejamos el master cerca de −1.2 dBFS para reducir el riesgo de distorsión al publicarlo.' },
  { term: 'Rango dinámico', simple: 'La diferencia entre las partes suaves y fuertes.', detail: 'Más rango suele sentirse natural y expresivo; menos rango puede sentirse más compacto y potente.' },
  { term: 'Headroom', simple: 'El espacio libre antes de llegar al límite digital.', detail: 'Una premezcla con margen permite que el mastering trabaje sin forzar ni distorsionar el audio.' },
  { term: 'Amplitud estéreo', simple: 'Qué tan ancho se percibe el sonido entre izquierda y derecha.', detail: 'Más ancho no siempre significa mejor. MixingMusic protege el centro para conservar voz, bajo y compatibilidad en mono.' },
  { term: 'Preset', simple: 'Un punto de partida musical preparado para un tipo de sonido.', detail: 'Combina decisiones de tono, dinámica, espacio y estéreo. La IA recomienda uno y tú puedes cambiarlo.' },
  { term: 'Mezcla vs. master', simple: 'La mezcla combina pistas; el master termina una mezcla estéreo.', detail: 'Si tienes voz, guitarra, batería y bajo separados, necesitas mezclar. Si ya tienes una sola canción estéreo, puedes mejorarla y masterizarla.' },
];

export default function AudioConceptsPage() {
  const navigate = useNavigate();
  useEffect(() => { document.body.classList.add('concepts-page'); return () => document.body.classList.remove('concepts-page'); }, []);
  return <main className="concepts-v3">
    <nav><button onClick={() => navigate('/')}><img src="/logo-brand.png" alt="MixingMusic.AI" /><span>V3</span></button><button onClick={() => navigate(-1)}>← Volver</button></nav>
    <header><span>GUÍA SIN TECNICISMOS</span><h1>Entiende lo que ves.<strong>Decide por lo que escuchas.</strong></h1><p>No necesitas ser ingeniero de audio. Estas explicaciones te ayudan a interpretar las mediciones de MixingMusic.</p></header>
    <section className="concept-grid">{concepts.map((concept, index) => <article id={concept.term.toLowerCase().replace(/[^a-z]+/g, '-')} key={concept.term}><i>{String(index + 1).padStart(2, '0')}</i><h2>{concept.term}</h2><strong>{concept.simple}</strong><p>{concept.detail}</p></article>)}</section>
    <section className="concept-cta"><div><span>¿LISTO PARA PROBARLO?</span><h2>La IA recomienda. Tú escuchas y eliges.</h2></div><button onClick={() => navigate('/mastering')}>Masterizar una mezcla →</button></section>
  </main>;
}
