import { Navigate, useLocation } from 'react-router-dom';
import { seoLandingByPath, seoLandings, type SeoLanding } from './seoLandingData';
import './seo-landings.css';

const ORIGIN = 'https://mixingmusic.ai';

function startHref(landing: SeoLanding) {
  return landing.mode === 'album' ? '/mastering/album' : `/auth/register?mode=${landing.mode}`;
}

export function SeoLandingContent({ landing }: { landing: SeoLanding }) {
  const isEs = landing.lang === 'es';
  const explicitRelated = (landing.relatedPaths ?? []).map((path) => seoLandingByPath[path]).filter((item): item is SeoLanding => Boolean(item));
  const fallbackRelated = seoLandings.filter((item) => item.lang === landing.lang && item.path !== landing.path && item.kind === landing.kind);
  const related = explicitRelated.length > 0 ? explicitRelated : fallbackRelated.slice(0, 4);
  const isDirectory = ['/presets', '/en/presets', '/generos', '/en/genres'].includes(landing.path);

  return <main className={`seo-v3-page seo-v3-${landing.kind ?? 'core'}`}>
    <nav><a href="/"><img src="/logo-brand.png" alt="MixingMusic.AI" /><span>V3</span></a><div><a href={landing.alternatePath}>{isEs ? 'English' : 'Español'}</a><a href={isEs ? '/presets' : '/en/presets'}>Presets</a><a href={isEs ? '/generos' : '/en/genres'}>{isEs ? 'Géneros' : 'Genres'}</a><a className="seo-v3-nav-cta" href={startHref(landing)}>{landing.cta}</a></div></nav>

    <header className="seo-v3-hero">
      <span>{landing.eyebrow}</span><h1>{landing.title}<strong>{landing.accent}</strong></h1><p>{landing.intro}</p><a className="seo-v3-primary-cta" href={startHref(landing)}>{landing.cta} →</a>
      <div className="seo-v3-wave" aria-hidden="true">{[26,55,82,42,68,94,48,73,35,88,58,31,76,98,45,64,29,86,52,38].map((height,index)=><i key={index} style={{height:`${height}%`}} />)}</div>
    </header>

    <section className="seo-v3-context"><article><span>{isEs ? 'EL RETO' : 'THE CHALLENGE'}</span><h2>{isEs ? 'Primero escucha el problema.' : 'Listen to the problem first.'}</h2><p>{landing.problem}</p></article><article><span>{isEs ? 'LA DIRECCIÓN' : 'THE DIRECTION'}</span><h2>{isEs ? 'Decisiones con intención.' : 'Decisions with intent.'}</h2><p>{landing.solution}</p></article></section>

    {landing.technicalNotes && <section className="seo-v3-tech" aria-label={isEs ? 'Referencia técnica' : 'Technical reference'}>{landing.technicalNotes.map((note) => <article key={note.label}><span>{note.label}</span><strong>{note.value}</strong></article>)}</section>}

    <section className="seo-v3-steps"><div><span>{isEs ? 'FLUJO RECOMENDADO' : 'RECOMMENDED FLOW'}</span><h2>{isEs ? 'Tres pasos. Tú conservas el control.' : 'Three steps. You keep control.'}</h2></div><div>{landing.steps.map((step,index)=><article key={step.title}><i>0{index+1}</i><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></section>

    {landing.guideSections?.map((section) => <section className="seo-v3-guide" key={section.eyebrow}><header><span>{section.eyebrow}</span><h2>{section.title}</h2><p>{section.intro}</p></header><div>{section.tips.map((tip) => <article key={tip.title}><h3>{tip.title}</h3><p>{tip.text}</p></article>)}</div></section>)}

    <section className="seo-v3-benefits"><div><span>{isEs ? 'EN ESTA GUÍA' : 'IN THIS GUIDE'}</span><h2>{isEs ? 'Información que puedes aplicar.' : 'Information you can apply.'}</h2></div><ul>{landing.benefits.map((benefit)=><li key={benefit}>✓ {benefit}</li>)}</ul></section>

    <section className="seo-v3-faq"><span>FAQ</span><h2>{isEs ? 'Preguntas frecuentes' : 'Frequently asked questions'}</h2>{landing.faq.map((item)=><details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</section>

    {related.length > 0 && <section className={`seo-v3-related${isDirectory ? ' seo-v3-directory' : ''}`}><span>{isDirectory ? (isEs ? 'EXPLORA LA COLECCIÓN' : 'EXPLORE THE COLLECTION') : (isEs ? 'CONTINÚA EXPLORANDO' : 'KEEP EXPLORING')}</span><h2>{isDirectory ? (isEs ? 'Elige una guía' : 'Choose a guide') : (isEs ? 'Siguiente paso recomendado' : 'Recommended next step')}</h2><div>{related.map((item)=><a key={item.path} href={item.path}><strong>{item.title}</strong><small>{item.metaDescription}</small><i>→</i></a>)}</div></section>}

    <section className="seo-v3-cta"><h2>{isEs ? 'Tu próxima canción puede empezar aquí.' : 'Your next release can start here.'}</h2><p>{isEs ? 'Tres mezclas y un master MP3 incluidos en Gratis. Sin tarjeta.' : 'Three mixes and one MP3 master included in Free. No card required.'}</p><a className="seo-v3-primary-cta" href={startHref(landing)}>{landing.cta} →</a></section>
  </main>;
}

export default function SeoLandingPage() {
  const location = useLocation();
  const landing = seoLandingByPath[location.pathname];
  if (!landing) return <Navigate to="/" replace />;
  return <SeoLandingContent landing={landing} />;
}
