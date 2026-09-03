import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { load } from 'cheerio';

const root = resolve(import.meta.dirname, '..');
const { publicRoutes, privatePaths, legacyRedirects, renderPublicRoute, renderNotFound } = await import(pathToFileURL(resolve(root, '.seo-prerender/seoPrerenderEntry.js')).href);
const ORIGIN = 'https://mixingmusic.ai';
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function write(path, text) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); }
const urlset = entries => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`;
function sitemap() {
  const entries = route => {
    const { meta } = route;
    const alternate = Object.entries(meta.alternates || {}).map(([lang, path]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${escape(ORIGIN + path)}"/>`).join('');
    // Do not invent a modification date from the build time or a fixed historical date.
    return `  <url><loc>${escape(ORIGIN + meta.path)}</loc>${alternate}</url>`;
  };
  write(resolve(root, 'public/sitemap-pages.xml'), urlset(publicRoutes.filter(route => route.meta.type !== 'article').map(entries)));
  write(resolve(root, 'public/sitemap-blog.xml'), urlset(publicRoutes.filter(route => route.meta.type === 'article').map(entries)));
  write(resolve(root, 'public/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${ORIGIN}/sitemap-pages.xml</loc></sitemap><sitemap><loc>${ORIGIN}/sitemap-blog.xml</loc></sitemap></sitemapindex>\n`);
  const articles = publicRoutes.filter(route => route.meta.type === 'article').sort((a, b) => new Date(b.meta.published || 0) - new Date(a.meta.published || 0));
  const items = articles.slice(0, 100).map(({ meta }) => `<item><title>${escape(meta.title)}</title><link>${escape(ORIGIN + meta.path)}</link><guid isPermaLink="true">${escape(ORIGIN + meta.path)}</guid><description>${escape(meta.description)}</description>${meta.published ? `<pubDate>${new Date(meta.published).toUTCString()}</pubDate>` : ''}</item>`).join('');
  write(resolve(root, 'public/feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>MixingMusic.AI Blog</title><link>${ORIGIN}/blog</link><description>Bilingual mixing, mastering and AI music guides.</description><language>es</language>${items}</channel></rss>\n`);
  const redirects = legacyRedirects.flatMap(({ from, to }) => [
    `/blog/${from} /blog/${to} 301`,
    `/en/blog/${from} /en/blog/${to} 301`,
  ]);
  write(resolve(root, 'public/_redirects'), `${redirects.join('\n')}\n`);
  console.log(`Sitemaps: ${publicRoutes.length} public URLs generated from the render catalog.`);
}
function render() {
  const out = resolve(root, 'out');
  const template = readFileSync(resolve(out, 'index.html'), 'utf8');
  const manifest = JSON.parse(readFileSync(resolve(out, '.vite/manifest.json'), 'utf8'));
  function styles(path) {
    const pages = { '/': 'home', '/pricing': 'pricing', '/capacidades': 'capabilities', '/conceptos-audio': 'concepts', '/prensa': 'press', '/terms': 'terms', '/privacy': 'privacy', '/cookies': 'cookies', '/about': 'about', '/en/about': 'about', '/blog': 'blog', '/en/blog': 'blog' };
    const page = pages[path] || (/^\/(en\/)?blog\//.test(path) ? 'blog/article' : /plugins|plugin/.test(path) ? 'plugin-directory' : 'seo-landings');
    const css = new Set(), seen = new Set();
    function collect(key) {
      if (seen.has(key)) return; seen.add(key);
      const entry = manifest[key];
      if (!entry) throw new Error(`Missing Vite manifest entry: ${key}`);
      for (const file of entry.css || []) css.add('/' + file);
      for (const key of entry.imports || []) collect(key);
    }
    collect(`src/pages/${page}/page.tsx`);
    return css;
  }
  function document(meta, content) {
    const $ = load(template);
    $('link[rel="canonical"], link[hreflang], script[type="application/ld+json"], meta[name="googlebot"], meta[property^="og:"], meta[name^="twitter:"], meta[property^="article:"]').remove();
    const tag = (attribute, name, value) => {
      $(`meta[${attribute}="${name}"]`).remove();
      $('<meta>').attr(attribute, name).attr('content', value).appendTo('head');
    };
    tag('name', 'robots', meta ? 'index, follow, max-image-preview:large' : 'noindex, follow');
    $('title').text(meta?.title || 'Página no encontrada | MixingMusic.AI');
    $('html').attr('lang', meta?.lang || 'es').removeAttr('data-page-language');
    if (meta) {
      $('html').attr('data-page-language', meta.lang);
      tag('name', 'description', meta.description);
      $('<link>').attr({ rel: 'canonical', href: ORIGIN + meta.path }).appendTo('head');
      $('<link>').attr({ rel: 'alternate', type: 'application/rss+xml', title: 'MixingMusic.AI Blog', href: `${ORIGIN}/feed.xml` }).appendTo('head');
      for (const [lang, path] of Object.entries(meta.alternates || {})) $('<link>').attr({ rel: 'alternate', hreflang: lang, href: ORIGIN + path }).appendTo('head');
      const image = meta.image || `${ORIGIN}/og-mixingmusic.png`;
      for (const [key, value] of Object.entries({ title: meta.title, description: meta.description, url: ORIGIN + meta.path, type: meta.type || 'website', image, site_name: 'MixingMusic.AI', locale: meta.lang === 'en' ? 'en_US' : 'es_ES' })) tag('property', `og:${key}`, value);
      if (!meta.image) { tag('property', 'og:image:width', '512'); tag('property', 'og:image:height', '512'); }
      for (const [key, value] of Object.entries({ title: meta.title, description: meta.description, image, card: meta.image ? 'summary_large_image' : 'summary' })) tag('name', `twitter:${key}`, value);
      if (meta.published) tag('property', 'article:published_time', meta.published);
      for (const schema of meta.schema) $('<script>').attr('type', 'application/ld+json').text(JSON.stringify(schema).replaceAll('<', '\\u003c')).appendTo('head');
    } else $('meta[name="description"]').remove();
    if (meta) {
      for (const href of styles(meta.path)) if (!$(`link[rel="stylesheet"][href="${href}"]`).length) $('<link>').attr({ rel: 'stylesheet', href }).appendTo('head');
      const classes = { '/': 'page-home page-home-v3', '/capacidades': 'capabilities-page', '/conceptos-audio': 'concepts-page' };
      if (classes[meta.path]) $('body').attr('class', classes[meta.path]);
    }
    $('#root').html(content);
    return $.html();
  }
  for (const route of publicRoutes) {
    const path = route.meta.path.replace(/^\//, '');
    write(resolve(out, path, 'index.html'), document(route.meta, renderPublicRoute(route)));
    write(resolve(out, 'seo-meta', path, 'index.json'), JSON.stringify(route.meta));
  }
  // Private deep links remain valid without a catch-all rewrite or marketing metadata.
  const shell = load(document(undefined, ''));
  shell('title').text('MixingMusic.AI');
  for (const path of privatePaths) write(resolve(out, path.slice(1), 'index.html'), shell.html());
  write(resolve(out, '404.html'), document(undefined, renderNotFound()));
  write(resolve(out, 'seo-route-manifest.json'), JSON.stringify({ public: publicRoutes.map(route => route.meta.path), private: privatePaths }, null, 2));
  rmSync(resolve(root, '.seo-prerender'), { recursive: true, force: true });
  console.log(`Rendered ${publicRoutes.length} public pages, ${privatePaths.length} private shells and a noindex 404.`);
}
if (process.argv[2] === 'sitemap') sitemap();
else if (process.argv[2] === 'render') render();
else throw new Error('Use sitemap or render');
