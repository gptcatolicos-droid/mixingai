import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSync } from 'esbuild';
import { JSDOM } from 'jsdom';
const root = resolve(import.meta.dirname, '..');
const temp = mkdtempSync(resolve(root, '.seo-test-'));
try {
  buildSync({ entryPoints: [resolve(root, 'src/seo/RouteSeo.tsx')], outfile: resolve(temp, 'metadata.mjs'), bundle: true, platform: 'node', format: 'esm', packages: 'external' });
  const { applyPageMetadata } = await import(pathToFileURL(resolve(temp, 'metadata.mjs')).href);
  const dom = new JSDOM(readFileSync(resolve(root, 'out/index.html'), 'utf8'), { url: 'https://mixingmusic.ai/' });
  globalThis.window = dom.window; globalThis.document = dom.window.document;
  const meta = path => JSON.parse(readFileSync(resolve(root, 'out/seo-meta', path.replace(/^\//, ''), 'index.json'), 'utf8'));
  const articlePath = '/en/blog/how-to-mix-music-with-ai-complete-guide';
  applyPageMetadata(meta(articlePath));
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(document.querySelector('link[rel="canonical"]').href, 'https://mixingmusic.ai' + articlePath);
  assert.equal(document.querySelectorAll('link[hreflang]').length, 3);
  assert.equal(document.querySelector('meta[property="og:type"]').content, 'article');
  assert.equal(document.querySelectorAll('meta[property="article:published_time"]').length, 1);
  assert.ok([...document.querySelectorAll('script[type="application/ld+json"]')].some(node => JSON.parse(node.textContent)['@type'] === 'BlogPosting'));
  // Article -> Spanish pricing: remove article-only metadata and old language pairs.
  applyPageMetadata(meta('/pricing'));
  assert.equal(document.documentElement.lang, 'es');
  assert.equal(document.querySelectorAll('link[hreflang], meta[property^="article:"]').length, 0);
  assert.equal(document.querySelector('meta[property="og:type"]').content, 'website');
  assert.equal(document.querySelector('meta[name="twitter:card"]').content, 'summary');
  // Public -> private/unknown -> public: noindex must neither leak nor be lost.
  applyPageMetadata();
  assert.match(document.querySelector('meta[name="robots"]').content, /noindex/);
  assert.equal(document.querySelectorAll('link[rel="canonical"], script[type="application/ld+json"], meta[property^="og:"]').length, 0);
  applyPageMetadata(meta('/'));
  assert.doesNotMatch(document.querySelector('meta[name="robots"]').content, /noindex/);
  assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1);
  applyPageMetadata(meta('/')); // Repeat visits must not accumulate schemas or tags.
  assert.equal(document.querySelectorAll('script[type="application/ld+json"]').length, 3);
  assert.equal(document.querySelectorAll('meta[property="og:title"]').length, 1);
  dom.window.close();
  console.log('SEO navigation passed: article → pricing → private/404 → home, language changes and duplicate cleanup.');
} finally { rmSync(temp, { recursive: true, force: true }); }
