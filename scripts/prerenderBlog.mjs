import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const source = readFileSync('src/mocks/masteringStandardsArticles.ts', 'utf8');
const entries = [...source.matchAll(/^  \['([^']+)', '([^']+)', '([^']+)', '([^']+)'/gm)];

for (const [, slug, titleEs, titleEn, excerptEs] of entries) {
  const canonical = `https://mixingmusic.ai/blog/${slug}`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(titleEs)} | MixingMusic.AI</title><meta name="description" content="${escape(excerptEs)}"><link rel="canonical" href="${canonical}"><link rel="alternate" hreflang="es" href="${canonical}"><meta property="og:type" content="article"><meta property="og:title" content="${escape(titleEs)}"><meta property="og:description" content="${escape(excerptEs)}"><script type="application/ld+json">{"@context":"https://schema.org","@type":"BlogPosting","headline":"${escape(titleEs)}","description":"${escape(excerptEs)}","inLanguage":"es","mainEntityOfPage":"${canonical}","publisher":{"@type":"Organization","name":"MixingMusic.AI"}}</script></head><body><main><article><p>GUÍAS MIXINGMUSIC.AI</p><h1>${escape(titleEs)}</h1><p>${escape(excerptEs)}</p><h2>Estándares de mezcla y mastering</h2><p>Aprende a preparar una mezcla, evaluar loudness, picos y dinámica, y comprobar el resultado antes de distribuir tu música.</p><p><a href="/auth/register?mode=master">Probar MixingMusic</a> · <a href="/pricing">Ver precios</a></p></article></main></body></html>`;
  const folder = join('out', 'blog', slug);
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'index.html'), html);
  // English title is retained in source data for the future /en editorial edition.
  void titleEn;
}
