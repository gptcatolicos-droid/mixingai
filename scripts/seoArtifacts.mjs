import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = resolve(import.meta.dirname, '..');
const ssrBundle = resolve(projectRoot, '.seo-prerender/seoPrerenderEntry.js');
const { renderSeoRoute, seoRoutes } = await import(pathToFileURL(ssrBundle).href);
const ORIGIN = 'https://mixingmusic.ai';

const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const escapeHtml = escapeXml;

function buildSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const staticPages = [
    ['/', '1.0', 'weekly'], ['/blog', '0.9', 'weekly'], ['/pricing', '0.9', 'monthly'], ['/capacidades', '0.8', 'monthly'],
    ['/conceptos-audio', '0.8', 'monthly'], ['/prensa', '0.8', 'monthly'], ['/terms', '0.3', 'yearly'], ['/privacy', '0.3', 'yearly'],
  ];
  const staticEntries = staticPages.map(([path, priority, frequency]) => `  <url><loc>${ORIGIN}${path}</loc><lastmod>${today}</lastmod><changefreq>${frequency}</changefreq><priority>${priority}</priority></url>`);
  const seoEntries = seoRoutes.map((path) => {
    const { landing } = renderSeoRoute(path);
    const priority = landing.kind === 'genre' || landing.kind === 'preset' ? '0.85' : landing.kind === 'plugin-directory' ? '0.88' : '0.9';
    const esHref = landing.lang === 'es' ? `${ORIGIN}${landing.path}` : `${ORIGIN}${landing.alternatePath}`;
    const enHref = landing.lang === 'en' ? `${ORIGIN}${landing.path}` : `${ORIGIN}${landing.alternatePath}`;
    return `  <url><loc>${escapeXml(`${ORIGIN}${landing.path}`)}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>${priority}</priority><xhtml:link rel="alternate" hreflang="es" href="${escapeXml(esHref)}"/><xhtml:link rel="alternate" hreflang="en" href="${escapeXml(enHref)}"/><xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(enHref)}"/></url>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${[...staticEntries, ...seoEntries].join('\n')}\n</urlset>\n`;
  writeFileSync(resolve(projectRoot, 'public/sitemap-pages.xml'), xml);
  console.log(`Generated sitemap-pages.xml with ${staticEntries.length + seoEntries.length} URLs.`);
}

function replaceMeta(html, attribute, key, content) {
  const expression = new RegExp(`<meta\\s+${attribute}=["']${key}["'][^>]*>`, 'i');
  const replacement = `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;
  return expression.test(html) ? html.replace(expression, replacement) : html.replace('</head>', `  ${replacement}\n</head>`);
}

function renderPages() {
  const outputRoot = resolve(projectRoot, 'out');
  const template = readFileSync(resolve(outputRoot, 'index.html'), 'utf8');

  for (const path of seoRoutes) {
    const { landing, schema, html: body } = renderSeoRoute(path);
    let html = template;
    html = html.replace(/<html\s+lang=["'][^"']+["']/, `<html lang="${landing.lang}"`);
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(landing.metaTitle)}</title>`);
    html = replaceMeta(html, 'name', 'description', landing.metaDescription);
    html = replaceMeta(html, 'property', 'og:title', landing.metaTitle);
    html = replaceMeta(html, 'property', 'og:description', landing.metaDescription);
    html = replaceMeta(html, 'property', 'og:url', `${ORIGIN}${landing.path}`);
    html = replaceMeta(html, 'name', 'twitter:title', landing.metaTitle);
    html = replaceMeta(html, 'name', 'twitter:description', landing.metaDescription);
    html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${ORIGIN}${landing.path}" />`);
    html = html.replace(/\s*<link\s+rel=["']alternate["'][^>]*>\s*/gi, '\n');
    html = html.replace(/\s*<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, '\n');
    const alternates = `  <link rel="alternate" hreflang="${landing.lang}" href="${ORIGIN}${landing.path}" />\n  <link rel="alternate" hreflang="${landing.lang === 'es' ? 'en' : 'es'}" href="${ORIGIN}${landing.alternatePath}" />\n  <link rel="alternate" hreflang="x-default" href="${ORIGIN}${landing.lang === 'en' ? landing.path : landing.alternatePath}" />`;
    const schemas = schema.map((item) => `  <script type="application/ld+json">${JSON.stringify(item).replaceAll('<', '\\u003c')}</script>`).join('\n');
    html = html.replace('</head>', `${alternates}\n${schemas}\n</head>`);
    html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
    const destination = resolve(outputRoot, path.replace(/^\//, ''), 'index.html');
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, html);
  }

  rmSync(resolve(projectRoot, '.seo-prerender'), { recursive: true, force: true });
  console.log(`Prerendered ${seoRoutes.length} bilingual SEO pages.`);
}

const command = process.argv[2];
if (command === 'sitemap') buildSitemap();
else if (command === 'render') renderPages();
else throw new Error('Use "sitemap" or "render".');
