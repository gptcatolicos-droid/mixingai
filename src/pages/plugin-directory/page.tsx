import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  audioPlugins, brandNames, brandPath, categoryNames, categoryPath, directoryPath, pluginBrands,
  pluginCategories, pluginImageUrl, pluginPath, VERIFIED_ON,
  type AudioPlugin, type DirectoryLanguage, type PluginCategory,
} from './pluginData';
import './plugin-directory.css';

const ORIGIN = 'https://mixingmusic.ai';

type DirectoryView =
  | { kind: 'directory'; lang: DirectoryLanguage }
  | { kind: 'brand'; lang: DirectoryLanguage; brand: AudioPlugin['brand'] }
  | { kind: 'category'; lang: DirectoryLanguage; category: PluginCategory }
  | { kind: 'plugin'; lang: DirectoryLanguage; plugin: AudioPlugin };

export function resolvePluginView(path: string): DirectoryView | undefined {
  const lang: DirectoryLanguage = path.startsWith('/en/') ? 'en' : 'es';
  if (path === directoryPath(lang)) return { kind: 'directory', lang };
  for (const brand of pluginBrands) if (path === brandPath(brand, lang)) return { kind: 'brand', lang, brand };
  for (const category of pluginCategories) if (path === categoryPath(category, lang)) return { kind: 'category', lang, category };
  for (const plugin of audioPlugins) if (path === pluginPath(plugin, lang)) return { kind: 'plugin', lang, plugin };
  return undefined;
}

export function pluginViewMeta(view: DirectoryView) {
  const es = view.lang === 'es';
  if (view.kind === 'plugin') return {
    title: es ? `${view.plugin.name}: guía, usos y consejos | MixingMusic.AI` : `${view.plugin.name}: Review, Uses & Tips | MixingMusic.AI`,
    description: es ? `Guía de ${view.plugin.name} de ${brandNames[view.plugin.brand]}: para qué sirve, usos recomendados, consejos y enlace oficial.` : `${view.plugin.name} by ${brandNames[view.plugin.brand]} explained: what it does, best uses, practical tips, and official source.`,
    path: pluginPath(view.plugin, view.lang), alternatePath: pluginPath(view.plugin, es ? 'en' : 'es'),
  };
  if (view.kind === 'brand') return {
    title: es ? `Mejores plugins de ${brandNames[view.brand]}: guía 2026` : `Best ${brandNames[view.brand]} Plugins: 2026 Guide`,
    description: es ? `Directorio independiente de plugins de ${brandNames[view.brand]} para mezcla, producción y mastering, con usos y fuentes oficiales.` : `Independent directory of ${brandNames[view.brand]} plugins for mixing, production, and mastering, with use cases and official sources.`,
    path: brandPath(view.brand, view.lang), alternatePath: brandPath(view.brand, es ? 'en' : 'es'),
  };
  if (view.kind === 'category') return {
    title: es ? `Mejores ${categoryNames[view.category].es.toLowerCase()} para producción musical` : `Best ${categoryNames[view.category].en} for Music Production`,
    description: es ? `Compara ${categoryNames[view.category].es.toLowerCase()} por función, aplicación y flujo de trabajo. Guía bilingüe con enlaces oficiales.` : `Compare ${categoryNames[view.category].en.toLowerCase()} by function, application, and workflow. Bilingual guide with official links.`,
    path: categoryPath(view.category, view.lang), alternatePath: categoryPath(view.category, es ? 'en' : 'es'),
  };
  return {
    title: es ? 'Mejores plugins de audio para mezcla y mastering | Directorio 2026' : 'Best Audio Plugins for Music Production, Mixing & Mastering',
    description: es ? 'Directorio bilingüe y actualizado de plugins de audio. Compara compresores, EQ, reverbs y herramientas de mastering por marca y uso.' : 'A current bilingual audio plugin directory. Compare compressors, EQs, reverbs, vocal tools, and mastering plugins by brand and use.',
    path: directoryPath(view.lang), alternatePath: directoryPath(es ? 'en' : 'es'),
  };
}

const copy = {
  es: {
    eyebrow:'DIRECTORIO EDITORIAL · EDICIÓN 2026', title:'Directorio de plugins de audio para producción musical',
    intro:'Encuentra la herramienta correcta por trabajo, no por publicidad. Guías claras, fuentes oficiales y consejos prácticos para mezclar, producir y masterizar mejor.',
    search:'Buscar plugin, marca o aplicación', allBrands:'Todas las marcas', allCategories:'Todas las categorías', results:'plugins',
    browseBrand:'Explorar por marca', browseCategory:'Explorar por función', verified:'Datos verificados', official:'Ver página oficial', guide:'Abrir guía',
    independent:'Directorio editorial independiente. MixingMusic.AI no está afiliado con las marcas listadas. Las marcas e imágenes pertenecen a sus respectivos propietarios.',
    bestFor:'Mejor para', how:'Cómo usarlo bien', chain:'Punto de partida', compare:'Plugins relacionados', source:'Fuente primaria',
    chainText:'Inserta el plugin con la señal a un nivel saludable, iguala el volumen de salida y compara en contexto. Ajusta una variable a la vez.',
    imageAlt:'Interfaz oficial de', imageFallback:'Vista del producto', back:'Volver al directorio', noResults:'No encontramos coincidencias. Prueba otra categoría o término.',
    methodology:'Cómo seleccionamos', methodText:'La selección prioriza utilidad real, relevancia en flujos modernos y diversidad de tareas. Las funciones se contrastan con la página oficial del fabricante; no publicamos precios porque cambian con frecuencia.',
    faqTitle:'Preguntas frecuentes', faq:[['¿Cuál es el mejor plugin de audio?','No existe uno universal. El mejor es el que resuelve una tarea concreta con el menor número de artefactos y el flujo más rápido para ti.'],['¿Necesito todos estos plugins?','No. Una colección pequeña con EQ, compresor, reverb, saturación, medición y limitador puede cubrir una mezcla completa.'],['¿Las imágenes y enlaces son oficiales?','Sí. Enlazamos a la página del fabricante y acreditamos los visuales oficiales. Comprueba allí requisitos, formatos y precio actual.']],
  },
  en: {
    eyebrow:'EDITORIAL DIRECTORY · 2026 EDITION', title:'Audio Plugin Directory for Music Production',
    intro:'Find the right tool for the job—not the loudest ad. Clear guides, official sources, and practical advice for better mixing, production, and mastering.',
    search:'Search plugin, brand, or application', allBrands:'All brands', allCategories:'All categories', results:'plugins',
    browseBrand:'Browse by brand', browseCategory:'Browse by function', verified:'Data verified', official:'Visit official page', guide:'Open guide',
    independent:'Independent editorial directory. MixingMusic.AI is not affiliated with the listed brands. Trademarks and images belong to their respective owners.',
    bestFor:'Best for', how:'How to use it well', chain:'Starting point', compare:'Related plugins', source:'Primary source',
    chainText:'Insert the plugin at a healthy signal level, match the output loudness, and compare in context. Change one variable at a time.',
    imageAlt:'Official interface of', imageFallback:'Product view', back:'Back to directory', noResults:'No matches found. Try another category or search term.',
    methodology:'How we select', methodText:'Selection prioritizes practical utility, relevance to modern workflows, and task diversity. Features are checked against official manufacturer pages; prices are omitted because they change frequently.',
    faqTitle:'Frequently asked questions', faq:[['What is the best audio plugin?','There is no universal winner. The best plugin solves a specific task with minimal artifacts and fits your workflow.'],['Do I need all of these plugins?','No. A small toolkit with EQ, compression, reverb, saturation, metering, and limiting can complete an entire mix.'],['Are the images and links official?','Yes. We link to each manufacturer page and credit official visuals. Check that source for current formats, requirements, and pricing.']],
  },
};

function PluginVisual({ plugin, lang, large = false }: { plugin: AudioPlugin; lang: DirectoryLanguage; large?: boolean }) {
  const officialImage = pluginImageUrl(plugin);
  return <div className={`pd-visual ${large ? 'pd-visual--large' : ''}`}>
    {officialImage ? <img src={officialImage} alt={`${copy[lang].imageAlt} ${plugin.name}`} loading={large ? 'eager' : 'lazy'} onError={(event) => event.currentTarget.remove()} /> : null}
    <div className="pd-visual-fallback" aria-hidden="true"><span>{brandNames[plugin.brand]}</span><strong>{plugin.name}</strong><small>{copy[lang].imageFallback}</small></div>
  </div>;
}

function PluginCard({ plugin, lang }: { plugin: AudioPlugin; lang: DirectoryLanguage }) {
  const t = copy[lang];
  return <article className="pd-card">
    <a href={pluginPath(plugin, lang)} aria-label={`${t.guide}: ${plugin.name}`}><PluginVisual plugin={plugin} lang={lang} /></a>
    <div className="pd-card-body">
      <div className="pd-card-meta"><a href={brandPath(plugin.brand, lang)}>{brandNames[plugin.brand]}</a><span>{categoryNames[plugin.category][lang]}</span></div>
      <h2><a href={pluginPath(plugin, lang)}>{plugin.name}</a></h2>
      <p>{plugin.summary[lang]}</p>
      <div className="pd-tags">{plugin.bestFor[lang].map((item) => <span key={item}>{item}</span>)}</div>
      <div className="pd-card-actions"><a className="pd-button pd-button--small" href={pluginPath(plugin, lang)}>{t.guide} →</a><a className="pd-source" href={plugin.officialUrl} target="_blank" rel="noopener noreferrer nofollow">{t.official} ↗</a></div>
    </div>
  </article>;
}

function DirectoryListing({ view }: { view: Exclude<DirectoryView, { kind: 'plugin' }> }) {
  const { lang } = view; const t = copy[lang];
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState(view.kind === 'brand' ? view.brand : 'all');
  const [category, setCategory] = useState(view.kind === 'category' ? view.category : 'all');
  const items = useMemo(() => audioPlugins.filter((plugin) => {
    const haystack = `${plugin.name} ${brandNames[plugin.brand]} ${plugin.summary[lang]} ${plugin.bestFor[lang].join(' ')}`.toLowerCase();
    return (brand === 'all' || plugin.brand === brand) && (category === 'all' || plugin.category === category) && haystack.includes(query.toLowerCase());
  }), [brand, category, lang, query]);
  const title = view.kind === 'brand' ? (lang === 'es' ? `Plugins de ${brandNames[view.brand]}` : `${brandNames[view.brand]} Plugins`) : view.kind === 'category' ? categoryNames[view.category][lang] : t.title;
  return <main className="pd-page">
    <section className="pd-hero"><div className="pd-shell">
      <div className="pd-lang"><a href={view.kind === 'directory' ? directoryPath(lang === 'es' ? 'en' : 'es') : view.kind === 'brand' ? brandPath(view.brand, lang === 'es' ? 'en' : 'es') : categoryPath(view.category, lang === 'es' ? 'en' : 'es')}>{lang === 'es' ? 'Read in English' : 'Leer en español'}</a></div>
      <p className="pd-eyebrow">{t.eyebrow}</p><h1>{title}</h1><p className="pd-lead">{t.intro}</p>
      <div className="pd-stats"><div><strong>{audioPlugins.length}</strong><span>{t.results}</span></div><div><strong>{pluginBrands.length}</strong><span>{lang === 'es' ? 'marcas' : 'brands'}</span></div><div><strong>{VERIFIED_ON}</strong><span>{t.verified}</span></div></div>
    </div></section>
    <section className="pd-shell pd-directory">
      <div className="pd-controls">
        <label className="pd-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></label>
        <select value={brand} onChange={(event) => setBrand(event.target.value as typeof brand)} aria-label={t.allBrands}><option value="all">{t.allBrands}</option>{pluginBrands.map((key) => <option key={key} value={key}>{brandNames[key]}</option>)}</select>
        <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} aria-label={t.allCategories}><option value="all">{t.allCategories}</option>{pluginCategories.map((key) => <option key={key} value={key}>{categoryNames[key][lang]}</option>)}</select>
      </div>
      <div className="pd-browse"><div><h2>{t.browseBrand}</h2><nav>{pluginBrands.map((key) => <a key={key} href={brandPath(key, lang)}>{brandNames[key]} <b>{audioPlugins.filter((p) => p.brand === key).length}</b></a>)}</nav></div><div><h2>{t.browseCategory}</h2><nav>{pluginCategories.map((key) => <a key={key} href={categoryPath(key, lang)}>{categoryNames[key][lang]} <b>{audioPlugins.filter((p) => p.category === key).length}</b></a>)}</nav></div></div>
      <div className="pd-result-line"><strong>{items.length}</strong> {t.results}</div>
      {items.length ? <div className="pd-grid">{items.map((plugin) => <PluginCard key={plugin.slug} plugin={plugin} lang={lang} />)}</div> : <p className="pd-empty">{t.noResults}</p>}
      <section className="pd-method"><div><span>01</span><h2>{t.methodology}</h2></div><p>{t.methodText}</p></section>
      <section className="pd-faq"><p className="pd-eyebrow">FAQ</p><h2>{t.faqTitle}</h2>{t.faq.map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section>
      <p className="pd-disclosure">{t.independent}</p>
    </section>
  </main>;
}

function PluginDetail({ view }: { view: Extract<DirectoryView, { kind: 'plugin' }> }) {
  const { plugin, lang } = view; const t = copy[lang];
  const related = audioPlugins.filter((item) => item.slug !== plugin.slug && (item.category === plugin.category || item.brand === plugin.brand)).slice(0, 4);
  return <main className="pd-page pd-detail">
    <div className="pd-shell">
      <nav className="pd-crumb"><a href={directoryPath(lang)}>{t.back}</a><span>/</span><a href={brandPath(plugin.brand, lang)}>{brandNames[plugin.brand]}</a><span>/</span><span>{plugin.name}</span></nav>
      <a className="pd-lang-link" href={pluginPath(plugin, lang === 'es' ? 'en' : 'es')}>{lang === 'es' ? 'Read in English' : 'Leer en español'}</a>
      <section className="pd-product-hero"><div className="pd-product-copy"><p className="pd-eyebrow">{brandNames[plugin.brand]} · {categoryNames[plugin.category][lang]}</p><h1>{plugin.name}</h1><p className="pd-lead">{plugin.summary[lang]}</p><div className="pd-tags">{plugin.bestFor[lang].map((item) => <span key={item}>{item}</span>)}</div><a className="pd-button" href={plugin.officialUrl} target="_blank" rel="noopener noreferrer nofollow">{t.official} ↗</a></div><figure><PluginVisual plugin={plugin} lang={lang} large /><figcaption>{lang === 'es' ? 'Imagen oficial del producto cuando está disponible.' : 'Official product image where available.'} <a href={plugin.imageCreditUrl || plugin.officialUrl}>{t.source}</a></figcaption></figure></section>
      <section className="pd-answer-grid"><article><span>01</span><h2>{t.bestFor}</h2><ul>{plugin.bestFor[lang].map((item) => <li key={item}>{item}</li>)}</ul></article><article><span>02</span><h2>{t.how}</h2><p>{plugin.note[lang]}</p></article><article><span>03</span><h2>{t.chain}</h2><p>{t.chainText}</p></article></section>
      <section className="pd-fact-block"><div><p className="pd-eyebrow">EDITORIAL NOTE</p><h2>{lang === 'es' ? `¿Cuándo elegir ${plugin.name}?` : `When should you choose ${plugin.name}?`}</h2></div><p>{lang === 'es' ? `${plugin.name} merece una prueba cuando necesitas ${plugin.summary.es.charAt(0).toLowerCase() + plugin.summary.es.slice(1)} La decisión final debe basarse en una comparación con el mismo volumen y dentro de la mezcla.` : `${plugin.name} is worth auditioning when you need ${plugin.summary.en.charAt(0).toLowerCase() + plugin.summary.en.slice(1)} Make the final decision with a level-matched comparison inside the mix.`}</p></section>
      <section className="pd-related"><p className="pd-eyebrow">{t.compare}</p><h2>{categoryNames[plugin.category][lang]}</h2><div className="pd-grid">{related.map((item) => <PluginCard key={item.slug} plugin={item} lang={lang} />)}</div></section>
      <section className="pd-source-box"><div><strong>{t.source}</strong><span>{lang === 'es' ? `Verificado el ${VERIFIED_ON}.` : `Verified ${VERIFIED_ON}.`}</span></div><a href={plugin.officialUrl} target="_blank" rel="noopener noreferrer nofollow">{plugin.officialUrl} ↗</a></section>
      <p className="pd-disclosure">{t.independent}</p>
    </div>
  </main>;
}

export function PluginDirectoryContent({ path }: { path: string }) {
  const view = resolvePluginView(path);
  if (!view) return null;
  return view.kind === 'plugin' ? <PluginDetail view={view} /> : <DirectoryListing view={view} />;
}

export default function PluginDirectoryPage() {
  const { pathname } = useLocation();
  return <PluginDirectoryContent path={pathname} />;
}

export function buildPluginSchema(path: string) {
  const view = resolvePluginView(path); if (!view) return [];
  const meta = pluginViewMeta(view); const es = view.lang === 'es';
  const breadcrumb = { '@context':'https://schema.org', '@type':'BreadcrumbList', itemListElement:[
    { '@type':'ListItem', position:1, name:'MixingMusic.AI', item:`${ORIGIN}/` },
    { '@type':'ListItem', position:2, name:es ? 'Plugins de audio' : 'Audio plugins', item:`${ORIGIN}${directoryPath(view.lang)}` },
    ...(view.kind === 'plugin' ? [{ '@type':'ListItem', position:3, name:view.plugin.name, item:`${ORIGIN}${meta.path}` }] : []),
  ] };
  if (view.kind === 'plugin') return [
    { '@context':'https://schema.org', '@type':'SoftwareApplication', name:view.plugin.name, applicationCategory:'MultimediaApplication', operatingSystem:'macOS, Windows', description:view.plugin.summary[view.lang], url:`${ORIGIN}${meta.path}`, sameAs:view.plugin.officialUrl, brand:{ '@type':'Brand', name:brandNames[view.plugin.brand] }, image:pluginImageUrl(view.plugin) }, breadcrumb,
    { '@context':'https://schema.org', '@type':'Article', headline:meta.title, description:meta.description, inLanguage:view.lang, dateModified:VERIFIED_ON, mainEntityOfPage:`${ORIGIN}${meta.path}`, author:{ '@type':'Organization', name:'MixingMusic.AI' } },
  ];
  const items = view.kind === 'brand' ? audioPlugins.filter((p) => p.brand === view.brand) : view.kind === 'category' ? audioPlugins.filter((p) => p.category === view.category) : audioPlugins;
  return [{ '@context':'https://schema.org', '@type':'CollectionPage', name:meta.title, description:meta.description, inLanguage:view.lang, url:`${ORIGIN}${meta.path}`, dateModified:VERIFIED_ON, mainEntity:{ '@type':'ItemList', numberOfItems:items.length, itemListElement:items.map((item,index) => ({ '@type':'ListItem', position:index+1, url:`${ORIGIN}${pluginPath(item,view.lang)}`, name:item.name })) } }, breadcrumb,
    ...(view.kind === 'directory' ? [{ '@context':'https://schema.org', '@type':'FAQPage', mainEntity:copy[view.lang].faq.map(([q,a]) => ({ '@type':'Question', name:q, acceptedAnswer:{ '@type':'Answer', text:a } })) }] : [])];
}
