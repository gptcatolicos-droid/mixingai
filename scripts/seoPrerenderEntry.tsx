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
import { masteringStandardsSlugs } from '../src/mocks/masteringStandardsArticles';
import { awardFacts, pressMentions } from '../src/content/pressMentions';
import { SeoLandingContent } from '../src/pages/seo-landings/page';
import { seoLandings } from '../src/pages/seo-landings/seoLandingData';
import { buildSeoSchema } from '../src/pages/seo-landings/seoSchema';
import { PluginDirectoryContent, buildPluginSchema, pluginViewMeta, resolvePluginView } from '../src/pages/plugin-directory/page';
import { pluginDirectoryRoutes } from '../src/pages/plugin-directory/pluginData';
import { origin, privatePaths } from '../src/seo/routes';
import type { PageMetadata } from '../src/seo/routes';
import { aiMusicPrompts } from '../src/content/aiMusicPrompts';
import { aiMusicPlatforms } from '../src/content/aiMusicPlatforms';
import About from '../src/pages/about/page';
import DemoSongs from '../src/pages/demo-songs/page';

export { privatePaths };
const retainedArticleSlugs = new Set(blogArticles.map(article => article.slug));
function redirectTarget(slug: string) {
  if (/lufs|true-peak|dither|24-bit|44-1khz|mp3|aiff|codificacion/.test(slug)) return 'lufs-mastering-streaming-guia';
  if (/album|ep-|canciones|gapless/.test(slug)) return 'mastering-album-coherencia-volumen-eq';
  if (/vocal|voz|sibilancia|de-essing|canto|podcast/.test(slug)) return 'produccion-vocal-grabacion-edicion-mezcla';
  if (/compres|rango-dinamico|crest|limitador|transitorio/.test(slug)) return 'compresion-audio-guia-completa';
  if (/eq-|frecuencias|espectro|tonal/.test(slug)) return 'ecualizacion-audio-guia-completa';
  if (/fase|mono|estereo|correlacion|panoramizacion|anchura/.test(slug)) return 'imagen-estereo-fase-y-compatibilidad-mono';
  if (/bateria|bajo|kick|sintetizador/.test(slug)) return 'mezcla-instrumentos-bateria-bajo-guitarras-teclados';
  if (/auriculares|monitores|calibracion|home-studio/.test(slug)) return 'monitoreo-y-acustica-para-mezclar-en-casa';
  if (/exportar|pro-tools|logic|ableton|fl-studio|nombres-archivos/.test(slug)) return 'exportar-stems-y-premaster-guia';
  if (/spotify|youtube|apple|tidal|soundcloud|streaming|redes-sociales|video-musical/.test(slug)) return 'mastering-para-streaming-guia-completa';
  if (/mastering-ia|mezcla-ia|stems|presets|master-original|intensidad/.test(slug)) return 'mezclar-musica-generada-ia';
  if (/ruido|clicks|clipping|errores|checklist|metadata|isrc|version-instrumental/.test(slug)) return 'edicion-restauracion-y-control-de-calidad-audio';
  if (/mastering-(pop|rock|urbano|electronica|baladas|gospel|salsa|vallenato|cumbia|rap|indie|jazz|clasica|lofi)/.test(slug)) return 'mastering-por-genero-sin-recetas-fijas';
  return 'como-mezclar-una-cancion-paso-a-paso';
}
export const legacyRedirects = masteringStandardsSlugs
  .filter(slug => !retainedArticleSlugs.has(slug))
  .map(slug => ({ from: slug, to: redirectTarget(slug) }));
type PublicRoute = { meta: PageMetadata; element: ReactElement; pattern?: string };
const organization = {
  '@context': 'https://schema.org', '@type': 'Organization', '@id': `${origin}/#organization`,
  name: 'MixingMusic.AI', alternateName: 'MixingMusic', url: origin, logo: `${origin}/favicon-512.png`,
  founder: { '@type': 'Person', name: 'Daniel Palacio' }, areaServed: 'Worldwide', award: awardFacts.name,
  knowsAbout: ['Music mixing', 'Audio mastering', 'Audio engineering', 'AI-assisted music production'],
};
const alternates = (es: string, en: string) => ({ es, en, 'x-default': es });
const demoSongsSchema = (lang: 'es' | 'en', path: string) => {
  const name = lang === 'en' ? 'MixingMusic demo songs' : 'Canciones demo de MixingMusic';
  const description = lang === 'en'
    ? 'Songs mixed and mastered with MixingMusic.AI, available to hear on SoundCloud.'
    : 'Canciones mezcladas y masterizadas con MixingMusic.AI, disponibles para escuchar en SoundCloud.';
  return [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name, description, url: origin + path, inLanguage: lang, about: { '@id': `${origin}/#organization` } },
    {
      '@context': 'https://schema.org', '@type': 'ItemList', name, numberOfItems: 3,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Al Otro Lado del Silencio', url: 'https://soundcloud.com/danipalacio/al-otor-lado-del-silencio' },
        { '@type': 'ListItem', position: 2, name: 'Tormentos', url: 'https://soundcloud.com/danipalacio/tormentos' },
        { '@type': 'ListItem', position: 3, name: 'Igual Que Ayer', url: 'https://soundcloud.com/danipalacio/igual-que-ayer' },
      ],
    },
  ];
};
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
publicRoutes.push(
  { meta: { path: '/about', title: 'Acerca de MixingMusic.AI y metodología editorial', description: 'Conoce quién publica MixingMusic.AI, cómo verificamos las guías de mezcla, mastering y música con IA, nuestras fuentes, criterios y limitaciones.', lang: 'es', alternates: alternates('/about', '/en/about'), schema: [{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'Acerca de MixingMusic.AI', url: `${origin}/about`, inLanguage: 'es', about: { '@id': `${origin}/#organization` } }, organization] }, element: <About /> },
  { meta: { path: '/en/about', title: 'About MixingMusic.AI and our editorial methodology', description: 'Learn who publishes MixingMusic.AI and how we verify mixing, mastering and AI music guides, including sources, criteria, corrections and limits.', lang: 'en', alternates: alternates('/about', '/en/about'), schema: [{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'About MixingMusic.AI', url: `${origin}/en/about`, inLanguage: 'en', about: { '@id': `${origin}/#organization` } }, organization] }, element: <About /> },
  { meta: { path: '/canciones-demo-mixing-music', title: 'Canciones demo de mezcla y mastering | MixingMusic.AI', description: 'Escucha canciones mezcladas y masterizadas con MixingMusic.AI en SoundCloud. Ejemplos reales del sonido final de la plataforma.', lang: 'es', alternates: alternates('/canciones-demo-mixing-music', '/en/mixing-music-demo-songs'), schema: demoSongsSchema('es', '/canciones-demo-mixing-music') }, element: <DemoSongs /> },
  { meta: { path: '/en/mixing-music-demo-songs', title: 'MixingMusic demo songs: mixing and mastering examples', description: 'Listen to songs mixed and mastered with MixingMusic.AI on SoundCloud. Hear real examples of the platform’s finished results.', lang: 'en', alternates: alternates('/canciones-demo-mixing-music', '/en/mixing-music-demo-songs'), schema: demoSongsSchema('en', '/en/mixing-music-demo-songs') }, element: <DemoSongs /> },
);
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
    const schema: Record<string, unknown>[] = [
      { '@context': 'https://schema.org', '@type': 'BlogPosting', headline, description, image: article.image, datePublished: published, inLanguage: lang, mainEntityOfPage: origin + path, author: { '@type': /team|equipo|editorial/i.test(article.author.name) ? 'Organization' : 'Person', name: article.author.name }, publisher: organization },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'MixingMusic.AI', item: origin + '/' }, { '@type': 'ListItem', position: 2, name: 'Blog', item: origin + blogPath }, { '@type': 'ListItem', position: 3, name: headline, item: origin + path }] },
    ];
    if (article.slug === 'ai-music-prompts-free-100-prompts') schema.push({
      '@context': 'https://schema.org', '@type': 'ItemList', name: headline, numberOfItems: aiMusicPrompts.length,
      itemListElement: aiMusicPrompts.map((prompt, index) => ({ '@type': 'ListItem', position: index + 1, name: lang === 'en' ? prompt.title : prompt.titleEs })),
    });
    if (article.slug === 'top-100-ai-music-platforms-tools') schema.push({
      '@context': 'https://schema.org', '@type': 'ItemList', name: headline, numberOfItems: aiMusicPlatforms.length,
      itemListElement: aiMusicPlatforms.map(platform => ({ '@type': 'ListItem', position: platform.rank, name: platform.name, url: platform.url })),
    });
    publicRoutes.push({ meta: { path, title: `${headline} | MixingMusic.ai Blog`, description, lang, image: article.image, type: 'article', published, alternates: alternates(`/blog/${article.slug}`, `/en/blog/${article.slug}`), schema }, element: <Article />, pattern: `${blogPath}/:slug` });
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
