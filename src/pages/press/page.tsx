import { Link } from 'react-router-dom';
import { awardFacts, pressMentions } from '../../content/pressMentions';
import { usePageSeo } from '../../utils/usePageSeo';
import './press.css';

export default function PressPage() {
  usePageSeo({
    title: 'MixingMusic.AI en prensa y Global Recognition Award 2026',
    description: 'Noticias, entrevistas y reconocimiento internacional de MixingMusic.AI y Daniel Palacio por innovación en producción musical con inteligencia artificial.',
    canonical: 'https://mixingmusic.ai/prensa',
    lang: 'es',
    schema: {
      '@context': 'https://schema.org', '@type': 'Organization', name: 'MixingMusic.AI', url: 'https://mixingmusic.ai',
      founder: { '@type': 'Person', name: 'Daniel Palacio' }, award: awardFacts.name,
      subjectOf: pressMentions.map((mention) => ({ '@type': 'CreativeWork', name: mention.title, publisher: mention.outlet, url: mention.url })),
    },
  });

  return <main className="press-v3-page">
    <nav><Link to="/"><img src="/logo-brand.png" alt="MixingMusic.AI" /><span>V3</span></Link><Link to="/blog">Blog</Link></nav>
    <header><span>PRENSA Y RECONOCIMIENTOS</span><h1>Una innovación colombiana<strong>que ya está haciendo ruido.</strong></h1><p>Medios nacionales y un panel internacional han destacado el trabajo de MixingMusic.AI para democratizar la producción musical profesional.</p></header>
    <section className="press-v3-award">
      <div><span>GLOBAL RECOGNITION AWARDS</span><h2>{awardFacts.name}</h2><p>{awardFacts.description}</p><p>{awardFacts.selection}</p><div><b>5,8%</b><small>de los participantes recibe reconocimiento</small></div></div>
      <img src="/winner3.png" alt="MixingMusic.AI ganador del 2026 Global Recognition Award" />
    </section>
    <section className="press-v3-mentions"><div><span>COBERTURA EDITORIAL</span><h2>MixingMusic.AI en los medios</h2></div><div className="press-v3-grid">{pressMentions.map((mention)=><article key={mention.url} style={{'--press-color':mention.color} as React.CSSProperties}><span>{mention.type}</span><small>{mention.date}</small><h3>{mention.outlet}</h3><h4>{mention.title}</h4><p>{mention.description}</p><div><a href={mention.url} target="_blank" rel="noreferrer">Ver publicación original ↗</a>{'secondaryUrl' in mention && mention.secondaryUrl && <a href={mention.secondaryUrl} target="_blank" rel="noreferrer">Ver en X ↗</a>}</div></article>)}</div></section>
    <section className="press-v3-founder"><span>FUNDADOR</span><h2>Daniel Palacio</h2><p>Emprendedor y estratega colombiano de inteligencia artificial, marketing digital y producción musical. Fundó MixingMusic.AI con la misión de acercar herramientas profesionales de mezcla y mastering a artistas independientes.</p><Link to="/auth/register?mode=master">Probar MixingMusic.AI →</Link></section>
  </main>;
}
