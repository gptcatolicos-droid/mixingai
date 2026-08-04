import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { usePageSeo } from '../../utils/usePageSeo';
import { seoLandingByPath, seoLandings } from './seoLandingData';
import './seo-landings.css';

export default function SeoLandingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const landing = seoLandingByPath[location.pathname];
  const schema = useMemo(() => landing ? [
    {
      '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'MixingMusic.AI',
      applicationCategory: 'MultimediaApplication', operatingSystem: 'Web', url: `https://mixingmusic.ai${landing.path}`,
      description: landing.metaDescription,
      offers: [{ '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free' }, { '@type': 'Offer', price: '14.99', priceCurrency: 'USD', name: 'Unlimited lifetime' }],
    },
    {
      '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: landing.faq.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
    },
  ] : [], [landing]);

  usePageSeo(landing ? {
    title: landing.metaTitle,
    description: landing.metaDescription,
    canonical: `https://mixingmusic.ai${landing.path}`,
    lang: landing.lang,
    alternate: { lang: landing.lang === 'es' ? 'en' : 'es', href: `https://mixingmusic.ai${landing.alternatePath}` },
    schema,
  } : { title: 'MixingMusic.AI', description: 'AI music mixing and mastering.', canonical: 'https://mixingmusic.ai/' });

  if (!landing) return <Navigate to="/" replace />;
  const start = () => navigate(landing.mode === 'album' ? '/mastering/album' : `/auth/register?mode=${landing.mode}`);
  const related = seoLandings.filter((item) => item.lang === landing.lang && item.path !== landing.path).slice(0, 4);

  return <main className="seo-v3-page">
    <nav><Link to="/"><img src="/logo-brand.png" alt="MixingMusic.AI" /><span>V3</span></Link><div><Link to={landing.alternatePath}>{landing.lang === 'es' ? 'English' : 'Español'}</Link><Link to="/pricing">{landing.lang === 'es' ? 'Precios' : 'Pricing'}</Link><button onClick={start}>{landing.cta}</button></div></nav>
    <header className="seo-v3-hero">
      <span>{landing.eyebrow}</span><h1>{landing.title}<strong>{landing.accent}</strong></h1><p>{landing.intro}</p><button onClick={start}>{landing.cta} →</button>
      <div className="seo-v3-wave" aria-hidden="true">{[26,55,82,42,68,94,48,73,35,88,58,31,76,98,45,64,29,86,52,38].map((height,index)=><i key={index} style={{height:`${height}%`}} />)}</div>
    </header>
    <section className="seo-v3-context"><article><span>EL RETO</span><h2>{landing.lang === 'es' ? 'Una buena canción necesita balance.' : 'A good song needs balance.'}</h2><p>{landing.problem}</p></article><article><span>LA RESPUESTA</span><h2>MixingMusic.AI</h2><p>{landing.solution}</p></article></section>
    <section className="seo-v3-steps"><div><span>{landing.lang === 'es' ? 'CÓMO FUNCIONA' : 'HOW IT WORKS'}</span><h2>{landing.lang === 'es' ? 'Tres pasos. Tú conservas el control.' : 'Three steps. You keep control.'}</h2></div><div>{landing.steps.map((step,index)=><article key={step.title}><i>0{index+1}</i><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></section>
    <section className="seo-v3-benefits"><div><span>{landing.lang === 'es' ? 'INCLUIDO' : 'INCLUDED'}</span><h2>{landing.lang === 'es' ? 'Diseñado para terminar música.' : 'Built to finish music.'}</h2></div><ul>{landing.benefits.map((benefit)=><li key={benefit}>✓ {benefit}</li>)}</ul></section>
    <section className="seo-v3-faq"><span>FAQ</span><h2>{landing.lang === 'es' ? 'Preguntas frecuentes' : 'Frequently asked questions'}</h2>{landing.faq.map((item)=><details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</section>
    <section className="seo-v3-related"><span>{landing.lang === 'es' ? 'APRENDE Y PRODUCE' : 'LEARN AND CREATE'}</span><h2>{landing.lang === 'es' ? 'Explora otras herramientas' : 'Explore other tools'}</h2><div>{related.map((item)=><Link key={item.path} to={item.path}><strong>{item.title}</strong><small>{item.metaDescription}</small><i>→</i></Link>)}</div></section>
    <section className="seo-v3-cta"><h2>{landing.lang === 'es' ? 'Tu próxima canción puede empezar aquí.' : 'Your next release can start here.'}</h2><p>{landing.lang === 'es' ? 'Tres mezclas y un master MP3 incluidos en Gratis. Sin tarjeta.' : 'Three mixes and one MP3 master included in Free. No card required.'}</p><button onClick={start}>{landing.cta} →</button></section>
  </main>;
}
