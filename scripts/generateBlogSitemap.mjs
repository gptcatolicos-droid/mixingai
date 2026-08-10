import { readFileSync, writeFileSync } from 'node:fs';

const existingSlugs = [
  'how-to-mix-music-with-ai-complete-guide', 'best-online-mixing-tools-2025', 'professional-mixing-techniques-2025',
  'como-usar-interfaces-focusrite-home-studio-2025', 'mixingmusic-global-recognition-award-2026',
  'como-mezclar-una-cancion-paso-a-paso', 'referencia-de-mezcla-como-elegir-usar', 'mezcla-vs-mastering-diferencias',
  'lufs-mastering-streaming-guia', 'headroom-premaster-antes-mastering', 'mastering-album-coherencia-volumen-eq',
  'mezclar-guitarra-acustica-nylon-y-voz',
];

const source = readFileSync('src/mocks/masteringStandardsArticles.ts', 'utf8');
const generatedSlugs = [...source.matchAll(/^  \['([^']+)'/gm)].map((match) => match[1]);
const urls = [...new Set([...existingSlugs, ...generatedSlugs])];
const entries = urls.map((slug) => `  <url><loc>https://mixingmusic.ai/blog/${slug}</loc><lastmod>2026-08-10</lastmod><changefreq>monthly</changefreq><priority>0.75</priority></url>`).join('\n');
writeFileSync('public/sitemap-blog.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`);
