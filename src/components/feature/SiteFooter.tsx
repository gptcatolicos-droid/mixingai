import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import LanguageSelector from './LanguageSelector';
import RuntimeLocaleTranslator from './RuntimeLocaleTranslator';
import PublicPlanPrice from './PublicPlanPrice';
import './site-footer.css';
import RouteSeo from '../../seo/RouteSeo';
import { isPrivatePath } from '../../seo/routes';
import type { PageMetadata } from '../../seo/routes';

function PublicLanguages({ metadata }: { metadata?: PageMetadata }) {
  const { pathname } = useLocation();
  const [alternates, setAlternates] = useState(metadata?.alternates || {});
  useEffect(() => {
    const read = () => setAlternates(Object.fromEntries(Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[hreflang]')).filter(link => ['es', 'en'].includes(link.hreflang)).map(link => [link.hreflang, new URL(link.href).pathname])));
    read(); window.addEventListener('mixingmusic:seo', read);
    return () => window.removeEventListener('mixingmusic:seo', read);
  }, [pathname]);
  return <nav className="site-language" aria-label="Idioma / Language">{Object.entries(alternates).filter(([lang]) => ['es','en'].includes(lang)).map(([lang, href]) => <Link key={lang} to={href} lang={lang} hrefLang={lang} aria-current={pathname === href ? 'page' : undefined} style={{ padding: '4px 8px', fontWeight: pathname === href ? 800 : 400 }}>{lang.toUpperCase()}</Link>)}</nav>;
}

function PublicHeader({ english }: { english: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const labels = english
    ? { functions: 'Features', capabilities: 'Capabilities', concepts: 'Concepts', press: 'Press', plans: 'Pricing', blog: 'Blog', login: 'Log in', trial: 'Try free', menu: 'Main menu' }
    : { functions: 'Funciones', capabilities: 'Capacidades', concepts: 'Conceptos', press: 'Prensa', plans: 'Planes', blog: 'Blog', login: 'Ingresar', trial: 'Probar gratis', menu: 'Menú principal' };

  return (
    <header className="public-header">
      <div className="public-header-inner">
        <Link className="public-header-brand" to="/" onClick={close} aria-label="MixingMusic.AI inicio">
          <img src="/logo-brand.png" alt="MixingMusic.AI" width={1260} height={323} />
          <span>V3</span>
        </Link>
        <button className="public-header-toggle" type="button" aria-label={labels.menu} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <i /><i /><i />
        </button>
        <nav className={open ? 'is-open' : ''} aria-label={labels.menu}>
          <a href="/#funciones" onClick={close}>{labels.functions}</a>
          <Link to="/capacidades" onClick={close}>{labels.capabilities}</Link>
          <Link to="/conceptos-audio" onClick={close}>{labels.concepts}</Link>
          <Link to="/prensa" onClick={close}>{labels.press}</Link>
          <Link to="/pricing" onClick={close}>{labels.plans}</Link>
          <Link to={english ? '/en/blog' : '/blog'} onClick={close}>{labels.blog}</Link>
          <Link className="public-header-login" to="/auth/login" onClick={close}>{labels.login}</Link>
          <Link className="public-header-cta" to="/auth/register?mode=master" onClick={close}>{labels.trial}</Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicPricing({ english }: { english: boolean }) {
  const copy = english
    ? {
        kicker: 'SIMPLE PRICING',
        title: 'Start free. Pay only once.',
        subtitle: 'No monthly renewal, confusing credits, or annual contracts.',
        free: 'FREE',
        freeDescription: 'Experience the complete workflow.',
        freeItems: ['3 mixes from stems', '1 downloadable master', 'Master download in MP3', 'MixingMusic presets'],
        freeCta: 'Create a free account',
        unlimited: 'UNLIMITED FOREVER',
        founder: 'FOUNDING PRICE',
        unlimitedDescription: 'One payment · no subscription · permanent access.',
        unlimitedItems: ['Unlimited mixes and masters', 'MP3 + true 24-bit WAV', 'Saved settings', 'Album mode up to 12 songs'],
        unlimitedCta: 'Activate Unlimited',
        regular: 'Future regular price: US$29.99',
      }
    : {
        kicker: 'PRECIO SIMPLE',
        title: 'Empieza gratis. Paga una sola vez.',
        subtitle: 'Sin renovación mensual, créditos confusos ni contratos anuales.',
        free: 'GRATIS',
        freeDescription: 'Para conocer el flujo completo.',
        freeItems: ['3 mezclas desde stems', '1 master descargable', 'Descarga master en MP3', 'Presets MixingMusic'],
        freeCta: 'Crear cuenta gratis',
        unlimited: 'ILIMITADO PARA SIEMPRE',
        founder: 'PRECIO FUNDADOR',
        unlimitedDescription: 'Un solo pago · no es suscripción · acceso permanente.',
        unlimitedItems: ['Mezclas y masters ilimitados', 'MP3 + WAV real de 24 bits', 'Configuraciones guardadas', 'Modo álbum hasta 12 canciones'],
        unlimitedCta: 'Activar Unlimited',
        regular: 'Precio regular posterior: US$29.99',
      };

  return (
    <section className="public-pricing" aria-labelledby="public-pricing-title">
      <div className="public-pricing-heading">
        <span>{copy.kicker}</span>
        <h2 id="public-pricing-title">{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </div>
      <div className="public-pricing-grid">
        <article className="public-price-card">
          <div className="public-plan-name">{copy.free}</div>
          <div className="public-price"><sup>$</sup>0</div>
          <p>{copy.freeDescription}</p>
          <ul>{copy.freeItems.map((item) => <li key={item}>{item}</li>)}</ul>
          <Link className="public-price-button public-price-button-outline" to="/auth/register?mode=mix">{copy.freeCta}</Link>
        </article>
        <article className="public-price-card public-price-featured">
          <div className="public-price-founder">{copy.founder}</div>
          <div className="public-plan-name">{copy.unlimited}</div>
          <div className="public-price"><PublicPlanPrice /></div>
          <p>{copy.unlimitedDescription}</p>
          <ul>{copy.unlimitedItems.map((item) => <li key={item}>{item}</li>)}</ul>
          <Link className="public-price-button public-price-button-accent" to="/checkout-v3">{copy.unlimitedCta}</Link>
          <small>{copy.regular}</small>
        </article>
      </div>
    </section>
  );
}

export default function SiteLayout({ metadata }: { metadata?: PageMetadata } = {}) {
  const { pathname } = useLocation();
  const publicPage = !isPrivatePath(pathname);
  const english = pathname.startsWith('/en/');
  const showGlobalPricing = publicPage && pathname !== '/' && pathname !== '/pricing';

  return <div className="site-v3-layout">
    <RouteSeo />
    <div className="site-locale-float">{publicPage ? <PublicLanguages metadata={metadata} /> : <LanguageSelector />}</div>
    {!publicPage && <RuntimeLocaleTranslator />}
    {publicPage && <PublicHeader english={english} />}
    <div className={publicPage ? 'site-public-content' : undefined}><Outlet /></div>
    {showGlobalPricing && <PublicPricing english={english} />}
    <footer className="site-v3-footer">
      <div className="site-v3-footer-main">
        <Link reloadDocument to="/" className="site-v3-footer-brand"><img src="/logo-brand.png" alt="MixingMusic.AI" width={1260} height={323} /><span>V3</span></Link>
        <p>{english ? 'AI mixing and mastering, original presets and creative control for artists.' : 'Mezcla y mastering con inteligencia artificial, presets propios y control para el artista.'}</p>
        <nav aria-label="Enlaces del pie de página">
          {/* Public destinations are prerendered. Native navigation starts at the
              top and lets the browser restore scroll on Back/Forward. */}
          <Link reloadDocument to="/pricing">{english ? 'Pricing' : 'Precios'}</Link>
          <Link reloadDocument to="/capacidades">{english ? 'Features' : 'Funciones'}</Link>
          <Link reloadDocument to={english ? '/en/presets' : '/presets'}>Presets</Link>
          <Link reloadDocument to={english ? '/en/genres' : '/generos'}>{english ? 'Genre guides' : 'Guías por género'}</Link>
          <Link reloadDocument to={english ? '/en/audio-plugins' : '/plugins-audio'}>{english ? 'Audio plugins' : 'Plugins de audio'}</Link>
          <Link reloadDocument to={english ? '/en/blog' : '/blog'}>Blog</Link>
          <Link reloadDocument to={english ? '/en/about' : '/about'}>{english ? 'About' : 'Acerca de'}</Link>
          <Link reloadDocument to="/prensa">{english ? 'Press' : 'Prensa'}</Link>
          <Link reloadDocument to="/cookies">Cookies</Link>
          <Link reloadDocument to="/conceptos-audio">{english ? 'Concepts' : 'Conceptos'}</Link>
          <Link reloadDocument to="/terms">{english ? 'Terms' : 'Términos'}</Link>
          <Link reloadDocument to="/privacy">{english ? 'Privacy' : 'Privacidad'}</Link>
        </nav>
      </div>
      <div className="site-v3-network">
        <span>OTROS PROYECTOS DE IA</span>
        <a href="https://www.guitarraia.com" target="_blank" rel="noreferrer"><strong>GuitarraIA</strong><small>Tu asistente para tocar más →</small></a>
        <a href="https://www.catolicosgpt.com" target="_blank" rel="noreferrer"><strong>CatólicosGPT</strong><small>Inteligencia artificial católica →</small></a>
      </div>
      <div className="site-v3-footer-bottom"><span>© 2026 MixingMusic.AI</span><span>Global Recognition Award 2026 · Innovación en IA</span></div>
    </footer>
  </div>;
}
