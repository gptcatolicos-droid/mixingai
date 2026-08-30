import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'cheerio';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'out');
const ORIGIN = 'https://mixingmusic.ai';
const manifest = JSON.parse(readFileSync(resolve(out, 'seo-route-manifest.json'), 'utf8'));
const errors = [], warnings = new Set();
function check(condition, message) { if (!condition) errors.push(message); }
const htmlAt = path => resolve(out, path.replace(/^\//, ''), 'index.html');
const publicPaths = new Set(manifest.public), privatePaths = new Set(manifest.private);
check(publicPaths.size === manifest.public.length, 'Duplicate public route');
const pages = new Map();
const sitemapPaths = new Set();
const index = load(readFileSync(resolve(out, 'sitemap.xml'), 'utf8'), { xml: true });
for (const loc of index('sitemap > loc').toArray()) {
  const sitemap = new URL(index(loc).text());
  check(sitemap.origin === ORIGIN, 'Noncanonical sitemap host');
  const $ = load(readFileSync(resolve(out, sitemap.pathname.slice(1)), 'utf8'), { xml: true });
  for (const item of $('url').toArray()) {
    const url = new URL($(item).find('loc').text());
    check(url.origin === ORIGIN && !url.search, `Invalid sitemap URL: ${url}`);
    check(!sitemapPaths.has(url.pathname), `Duplicate sitemap URL: ${url}`);
    sitemapPaths.add(url.pathname);
    const expected = JSON.parse(readFileSync(resolve(out, 'seo-meta', url.pathname.slice(1), 'index.json'), 'utf8'));
    const annotations = Object.fromEntries($(item).children().toArray().filter(node => node.name === 'xhtml:link').map(node => [$(node).attr('hreflang'), $(node).attr('href')]));
    check(JSON.stringify(annotations) === JSON.stringify(Object.fromEntries(Object.entries(expected.alternates || {}).map(([lang,path]) => [lang, ORIGIN+path]))), `Sitemap alternates differ: ${url.pathname}`);
  }
}
check(sitemapPaths.size === publicPaths.size && [...publicPaths].every(path => sitemapPaths.has(path)), 'Sitemaps do not match all public routes');
const titles = new Set();
const descriptions = new Set();
for (const path of publicPaths) {
  check(existsSync(htmlAt(path)), `Missing static HTML: ${path}`);
  if (!existsSync(htmlAt(path))) continue;
  const $ = load(readFileSync(htmlAt(path), 'utf8')); pages.set(path, $);
  const meta = JSON.parse(readFileSync(resolve(out, 'seo-meta', path.slice(1), 'index.json'), 'utf8'));
  check($('html').attr('lang') === meta.lang && $('html').attr('data-page-language') === meta.lang, `Incorrect initial language: ${path}`);
  check($('title').length === 1 && $('title').text() === meta.title, `Incorrect title: ${path}`);
  check(!titles.has(meta.title), `Duplicate title: ${path}`); titles.add(meta.title);
  check($('meta[name="description"]').length === 1 && $('meta[name="description"]').attr('content') === meta.description, `Incorrect description: ${path}`);
  if (descriptions.has(meta.description)) warnings.add('Some existing descriptions are shared by related pages; editorial differentiation remains possible.');
  descriptions.add(meta.description);
  check($('link[rel="canonical"]').length === 1 && $('link[rel="canonical"]').attr('href') === ORIGIN + path, `Incorrect canonical: ${path}`);
  check(!$('meta[name="robots"]').attr('content')?.includes('noindex'), `Public page is noindex: ${path}`);
  check($('#root').text().trim().length > 200 && $('h1').length === 1, `Content missing or H1 count ${$('h1').length}: ${path}`);
  check($('.public-header').length === 1 && $('.site-v3-footer').length === 1, `Global navigation missing: ${path}`);
  check($('link[rel="stylesheet"]').length >= 3, `Initial route CSS missing: ${path}`);
  check($('meta[property="og:url"]').attr('content') === ORIGIN + path && $('meta[property="og:title"]').attr('content') === meta.title, `Wrong social metadata: ${path}`);
  check($('meta[property="og:type"]').attr('content') === (meta.type || 'website'), `Stale article OG type: ${path}`);
  const schemas = $('script[type="application/ld+json"]').toArray().map(node => JSON.parse($(node).text()));
  check(JSON.stringify(schemas) === JSON.stringify(meta.schema), `Schema differs from route catalog: ${path}`);
  const links = Object.fromEntries($('link[hreflang]').toArray().map(node => [$(node).attr('hreflang'), $(node).attr('href')]));
  check(Object.keys(links).length === $('link[hreflang]').length, `Duplicate hreflang: ${path}`);
  for (const [lang, alternatePath] of Object.entries(meta.alternates || {})) {
    check(links[lang] === ORIGIN + alternatePath && publicPaths.has(alternatePath), `Invalid alternate ${lang}: ${path}`);
    const other = JSON.parse(readFileSync(resolve(out, 'seo-meta', alternatePath.slice(1), 'index.json'), 'utf8'));
    check(other.alternates?.[meta.lang] === path, `Nonreciprocal alternate: ${path}`);
    if (lang !== 'x-default') check(other.lang === lang, `Wrong alternate language: ${path}`);
  }
  for (const node of $('a[href], link[rel="stylesheet"], link[rel="icon"], link[rel="apple-touch-icon"], img[src], script[src]').toArray()) {
    const href = $(node).attr('href') || $(node).attr('src');
    if (!href || /^(mailto:|tel:|data:|blob:)/.test(href)) continue;
    const url = new URL(href, ORIGIN + path);
    if (url.origin !== ORIGIN) continue;
    const target = decodeURIComponent(url.pathname).replace(/\/$/, '') || '/';
    const resource = resolve(out, target.slice(1));
    if (existsSync(resource) && statSync(resource).isFile()) check(statSync(resource).size > 0, `Empty asset ${target} on ${path}`);
    if (!publicPaths.has(target) && !privatePaths.has(target) && !existsSync(resolve(out, target.slice(1)))) errors.push(`Broken local resource/link ${href} on ${path}`);
  }
}
for (const path of privatePaths) {
  const $ = load(readFileSync(htmlAt(path), 'utf8'));
  check($('meta[name="robots"]').attr('content')?.includes('noindex') && !$('link[rel="canonical"]').length && !$('script[type="application/ld+json"]').length, `Private route leaks public metadata: ${path}`);
  check($('script[type="module"][src]').length > 0 && !publicPaths.has(path), `Private application entry missing: ${path}`);
}
const notFound = load(readFileSync(resolve(out, '404.html'), 'utf8'));
check(notFound('meta[name="robots"]').attr('content')?.includes('noindex') && !notFound('link[rel="canonical"]').length && notFound('h1').text().includes('no encontrada'), '404 must be distinct, noindex and not canonicalize to home');
for (const [name, size] of [...[16,32,48,96,192,512].map(size => [`favicon-${size}.png`,size]), ['apple-touch-icon.png',180], ['og-mixingmusic.png',512]]) {
  const file = readFileSync(resolve(out, name));
  check(file.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && file.readUInt32BE(16) === size && file.readUInt32BE(20) === size, `Invalid PNG ${name}`);
}
check(readFileSync(resolve(out,'favicon.ico')).subarray(0,4).equals(Buffer.from([0,0,1,0])), 'Invalid ICO signature');
const appManifest = JSON.parse(readFileSync(resolve(out,'site.webmanifest'),'utf8'));
check(appManifest.icons.every(icon => existsSync(resolve(out, icon.src.slice(1)))), 'Manifest references missing icons');
check(pages.get('/')('.v3-hero').next().hasClass('v3-pricing'), 'Home pricing must follow hero in the DOM');
for (const path of ['/blog', '/en/blog']) {
  const $ = pages.get(path);
  const articleLinks = new Set($('a[href]').toArray().map(node => $(node).attr('href')).filter(href => href?.startsWith(path + '/')));
  const expected = [...publicPaths].filter(route => route.startsWith(path + '/'));
  check(expected.every(route => articleLinks.has(route)), `Blog index does not link all articles: ${path}`);
}
const routerSource = readFileSync(resolve(root, 'src/router/config.tsx'), 'utf8');
for (const [, path] of routerSource.matchAll(/path: '([^']+)'/g)) if (!path.includes(':') && path !== '*') check(publicPaths.has(path) || privatePaths.has(path), `Router path has no static entry: ${path}`);
if (errors.length) { console.error([...new Set(errors)].join('\n')); throw new Error(`${errors.length} SEO validation failures`); }
for (const warning of warnings) console.warn(warning);
console.log(`Validated ${publicPaths.size} public pages (${[...pages.values()].filter($ => $('html').attr('lang') === 'es').length} ES), ${privatePaths.size} private entries, reciprocal languages, links, schema, favicon and 404.`);

// Optional verification against an actual static server / deployed production.
const flag = process.argv.indexOf('--origin');
if (flag !== -1) {
  const target = new URL(process.argv[flag + 1]).origin;
  const queue = [...publicPaths];
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const path = queue.shift();
      const response = await fetch(target + path, { signal: AbortSignal.timeout(30000) });
      assert.equal(response.status, 200, `HTTP status ${path}`);
      const $ = load(await response.text());
      assert.equal($('link[rel="canonical"]').attr('href'), ORIGIN + path, `Served canonical ${path}`);
      assert.equal($('h1').length, 1, `Served content ${path}`);
    }
  }));
  for (const path of ['/favicon.ico','/favicon-96.png','/apple-touch-icon.png','/og-mixingmusic.png','/robots.txt','/sitemap.xml',...privatePaths]) assert.equal((await fetch(target + path)).status, 200, `HTTP status ${path}`);
  const missing = await fetch(target + '/seo-check-not-a-real-page-439e');
  assert.equal(missing.status, 404, 'Unknown URL must return a real HTTP 404; remove hosting catch-all rewrite');
  console.log(`HTTP verification passed for ${target}: all public pages, assets, private entries and real 404.`);
}
