import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter, Routes, Route } from 'react-router-dom';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import SiteLayout from '../src/components/feature/SiteFooter';
import HomeHero from '../src/pages/home/components/HomeHeroV3';
import Pricing from '../src/pages/pricing/page';
import Capabilities from '../src/pages/capabilities/page';
import Concepts from '../src/pages/concepts/page';
import Press from '../src/pages/press/page';
import Terms from '../src/pages/terms/page';
import Privacy from '../src/pages/privacy/page';
import Cookies from '../src/pages/cookies/page';
import Blog from '../src/pages/blog/page';
import Article from '../src/pages/blog/article/page';
import NotFound from '../src/pages/NotFound';
import { blogArticles } from '../src/mocks/blogArticles';
import { awardFacts, pressMentions } from '../src/content/pressMentions';
import { SeoLandingContent } from '../src/pages/seo-landings/page';
import { seoLandings } from '../src/pages/seo-landings/seoLandingData';
import { buildSeoSchema } from '../src/pages/seo-landings/seoSchema';
import { PluginDirectoryContent, buildPluginSchema, pluginViewMeta, resolvePluginView } from '../src/pages/plugin-directory/page';
import { pluginDirectoryRoutes } from '../src/pages/plugin-directory/pluginData';
import { origin, privatePaths } from '../src/seo/routes';
import type { PageMetadata } from '../src/seo/routes';

export { privatePaths };
type PublicRoute = { meta: PageMetadata; element: ReactElement; pattern?: string };
const organization = { '@context': 'https://schema.org', '@type': 'Organization', '@id': `${origin}/#organization`, name: 'MixingMusic.AI', url: origin, logo: `${origin}/favicon-512.png` };
const alternates = (es: string, en: string) => ({ es, en, 'x-default': es });
const regular: Array<[string, string, string, ReactElement]> = [
  ['/', 'Mezcla y mastering con IA | MixingMusic.AI', 'Mezcla hasta 12 stems, masteriza canciones y da coherencia a tus álbumes con IA. Incluye 3 mezclas y 1 master MP3 gratis; Unlimited por pago único.', <HomeHero />],
  ['/pricing', 'Precios de mezcla y mastering con IA | MixingMusic.AI', 'Compara Gratis y Unlimited: mezclas desde stems, mastering, MP3, WAV de 24 bits y modo álbum. Conoce los precios y opciones de pago único.', <Pricing />],
  ['/capacidades', 'Funciones de mezcla y mastering con IA | MixingMusic.AI', 'Conoce las funciones de MixingMusic: mezcla de stems, mastering estéreo, comparación A/B, presets, mediciones y coherencia sonora de álbumes.', <Capabilities />],
  ['/conceptos-audio', 'Conceptos de audio: LUFS, picos y dinámica | MixingMusic.AI', 'Entiende las mediciones de tu mezcla: LUFS, picos, clipping, dinámica y balance tonal. Una guía para interpretar el análisis y decidir por lo que escuchas.', <Concepts />],
  ['/prensa', 'MixingMusic.AI en prensa y Global Recognition Award 2026', 'Noticias, entrevistas y reconocimiento internacional de MixingMusic.AI y Daniel Palacio por innovación en producción musical con inteligencia artificial.', <Press />],
  ['/terms', 'Términos y condiciones | MixingMusic.AI', 'Consulta las condiciones de uso de MixingMusic.AI, las modalidades Gratis y Unlimited, los derechos sobre el audio y las responsabilidades del usuario.', <Terms />],
  ['/privacy', 'Política de privacidad | MixingMusic.AI', 'Consulta cómo MixingMusic.AI trata la información personal, protege tus datos y describe tus derechos y opciones de privacidad al utilizar la plataforma.', <Privacy />],
  ['/cookies', 'Política de cookies | MixingMusic.AI', 'Información sobre las cookies utilizadas por MixingMusic.AI, sus finalidades y las opciones para administrar tus preferencias de navegación.', <Cookies />],
];
export const publicRoutes: PublicRoute[] = regular.map(([path, title, description, element]) => ({
  meta: { path, title, description, lang: 'es', schema: [{ '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: origin + path, inLanguage: 'es' }] }, element,
}));
publicRoutes[0].meta.schema = [organization,
  { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${origin}/#website`, name: 'MixingMusic.AI', alternateName: 'MixingMusic', url: origin, publisher: { '@id': `${origin}/#organization` } },
  { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'MixingMusic.AI', applicationCategory: 'MultimediaApplication', operatingSystem: 'Web browser', url: origin, description: publicRoutes[0].meta.description, offers: [{ '@type': 'Offer', name: 'Gratis', price: '0', priceCurrency: 'USD' }, { '@type': 'Offer', name: 'Unlimited', price: '14.99', priceCurrency: 'USD' }] },
];
publicRoutes.find(route => route.meta.path === '/prensa')!.meta.schema.push({
  ...organization, founder: { '@type': 'Person', name: 'Daniel Palacio' }, award: awardFacts.name,
  subjectOf: pressMentions.map(mention => 'videoId' in mention && mention.videoId
    ? { '@type': 'VideoObject', name: mention.title, description: mention.description, uploadDate: '2026-08-18', publisher: { '@type': 'Organization', name: mention.outlet }, thumbnailUrl: `https://i.ytimg.com/vi/${mention.videoId}/hqdefault.jpg`, embedUrl: `https://www.youtube-nocookie.com/embed/${mention.videoId}`, contentUrl: mention.url }
    : { '@type': 'CreativeWork', name: mention.title, publisher: { '@type': 'Organization', name: mention.outlet }, url: mention.url }),
});
for (const lang of ['es', 'en'] as const) {
  const blogPath = lang === 'en' ? '/en/blog' : '/blog';
  const title = lang === 'en' ? 'AI mixing and mastering blog | MixingMusic.AI' : 'Blog de mezcla y mastering con IA | MixingMusic.AI';
  const description = lang === 'en' ? 'Explore music mixing, AI mastering, LUFS, vocal production and historic album techniques. Practical guides and MixingMusic.AI news.' : 'Guías de mezcla musical, mastering con IA, LUFS, referencias de mezcla, producción de voz e instrumentos y noticias de MixingMusic.AI.';
  publicRoutes.push({ meta: { path: blogPath, title, description, lang, alternates: alternates('/blog', '/en/blog'), schema: [{ '@context': 'https://schema.org', '@type': 'Blog', name: title, description, url: origin + blogPath, inLanguage: lang }] }, element: <Blog /> });
  for (const article of blogArticles) {
    const path = `${blogPath}/${article.slug}`;
    const headline = lang === 'en' ? article.title : article.titleEs;
    const description = lang === 'en' ? article.metaDescription : article.metaDescriptionEs;
    const published = new Date(article.publishDate).toISOString();
    publicRoutes.push({ meta: { path, title: `${headline} | MixingMusic.ai Blog`, description, lang, image: article.image, type: 'article', published, alternates: alternates(`/blog/${article.slug}`, `/en/blog/${article.slug}`), schema: [
      { '@context': 'https://schema.org', '@type': 'BlogPosting', headline, description, image: article.image, datePublished: published, inLanguage: lang, mainEntityOfPage: origin + path, author: { '@type': /team|equipo|editorial/i.test(article.author.name) ? 'Organization' : 'Person', name: article.author.name }, publisher: organization },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'MixingMusic.AI', item: origin + '/' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: origin + blogPath }, { '@type': 'ListItem', position: 3, name: headline, item: origin + path }] },
    ] }, element: <Article />, pattern: `${blogPath}/:slug` });
  }
}
for (const landing of seoLandings) {
  publicRoutes.push({ meta: { path: landing.path, title: landing.metaTitle, description: landing.metaDescription, lang: landing.lang, alternates: landing.lang === 'es' ? alternates(landing.path, landing.alternatePath) : alternates(landing.alternatePath, landing.path), schema: buildSeoSchema(landing) }, element: <SeoLandingContent landing={landing} /> });
}
for (const path of pluginDirectoryRoutes) {
  const view = resolvePluginView(path)!;
  const meta = pluginViewMeta(view);
  publicRoutes.push({ meta: { path, title: meta.title, description: meta.description, lang: view.lang, alternates: view.lang === 'es' ? alternates(path, meta.alternatePath) : alternates(meta.alternatePath, path), schema: buildPluginSchema(path) }, element: <PluginDirectoryContent path={path} /> });
}
const instances = Object.fromEntries(await Promise.all(['es', 'en'].map(async lang => {
  const instance = createInstance(); await instance.init({ lng: lang, fallbackLng: lang, resources: { [lang]: { translation: { language: lang === 'es' ? 'Idioma' : 'Language' } } }, interpolation: { escapeValue: false } }); return [lang, instance];
})));
export function renderPublicRoute(route: PublicRoute) {
  return renderToStaticMarkup(<I18nextProvider i18n={instances[route.meta.lang]}><StaticRouter location={route.meta.path}><Routes><Route element={<SiteLayout metadata={route.meta} />}><Route path={route.pattern || route.meta.path} element={route.element} /></Route></Routes></StaticRouter></I18nextProvider>);
}
export function renderNotFound() { return renderToStaticMarkup(<StaticRouter location="/404"><NotFound /></StaticRouter>); }
