import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'out');
const sitemap = readFileSync(resolve(root, 'public/sitemap-pages.xml'), 'utf8');
const files = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name === 'index.html') files.push(path);
  }
}

if (!existsSync(output)) throw new Error('Missing out directory. Run the production build first.');
walk(output);

const pages = files.map((file) => ({ file, html: readFileSync(file, 'utf8') })).filter(({ html }) => html.includes('class="seo-v3-page') || html.includes('class="pd-page'));
if (pages.length !== 184) throw new Error(`Expected 184 prerendered SEO pages, found ${pages.length}.`);

const canonicals = new Set();
const titles = new Set();
let spanish = 0;
let english = 0;

for (const { file, html } of pages) {
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  const lang = html.match(/<html lang="([^"]+)"/i)?.[1];
  if (!canonical || !title || !lang) throw new Error(`Missing title, canonical or lang in ${file}.`);
  if (canonicals.has(canonical)) throw new Error(`Duplicate canonical: ${canonical}`);
  if (titles.has(title)) throw new Error(`Duplicate title: ${title}`);
  if (!sitemap.includes(`<loc>${canonical}</loc>`)) throw new Error(`Canonical absent from sitemap: ${canonical}`);
  if (!html.includes('hreflang="es"') || !html.includes('hreflang="en"') || !html.includes('application/ld+json')) throw new Error(`Missing bilingual annotations or schema in ${file}.`);
  canonicals.add(canonical);
  titles.add(title);
  if (lang === 'es') spanish += 1;
  else if (lang === 'en') english += 1;
}

if (spanish !== 92 || english !== 92) throw new Error(`Expected 92 ES and 92 EN pages, found ${spanish} ES and ${english} EN.`);
console.log(`Validated ${pages.length} SEO pages: ${spanish} ES, ${english} EN, unique titles and canonicals.`);
