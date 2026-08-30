import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isPrivatePath, origin } from './routes';
import type { PageMetadata } from './routes';

function setMeta(attribute: 'name' | 'property', key: string, value: string) {
  let node = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!node) { node = document.createElement('meta'); node.setAttribute(attribute, key); document.head.append(node); }
  node.content = value;
}

export function applyPageMetadata(page?: PageMetadata) {
  document.head.querySelectorAll('link[rel="canonical"], link[hreflang], script[type="application/ld+json"], meta[property^="article:"], meta[property^="og:locale"], meta[property^="og:image:"], meta[name="googlebot"]').forEach(node => node.remove());
  setMeta('name', 'robots', page ? 'index, follow, max-image-preview:large' : 'noindex, follow');
  if (!page) {
    document.title = 'MixingMusic.AI';
    document.head.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"], meta[name="description"]').forEach(node => node.remove());
    return;
  }
  document.title = page.title;
  document.documentElement.lang = page.lang;
  document.documentElement.dataset.pageLanguage = page.lang;
  const canonical = document.createElement('link'); canonical.rel = 'canonical'; canonical.href = origin + page.path; document.head.append(canonical);
  for (const [lang, path] of Object.entries(page.alternates || {})) {
    const node = document.createElement('link'); node.rel = 'alternate'; node.hreflang = lang; node.href = origin + path; document.head.append(node);
  }
  window.dispatchEvent(new window.Event('mixingmusic:seo'));
  const image = page.image || `${origin}/og-mixingmusic.png`;
  setMeta('name', 'description', page.description);
  for (const [key, value] of Object.entries({ title: page.title, description: page.description, url: origin + page.path, image, type: page.type || 'website', site_name: 'MixingMusic.AI', locale: page.lang === 'en' ? 'en_US' : 'es_ES' })) setMeta('property', `og:${key}`, value);
  for (const [key, value] of Object.entries({ title: page.title, description: page.description, image, card: page.image ? 'summary_large_image' : 'summary' })) setMeta('name', `twitter:${key}`, value);
  setMeta('name', 'twitter:image:alt', page.title);
  setMeta('property', 'og:image:alt', page.title);
  if (page.published) setMeta('property', 'article:published_time', page.published);
  for (const schema of page.schema) {
    const node = document.createElement('script'); node.type = 'application/ld+json'; node.textContent = JSON.stringify(schema); document.head.append(node);
  }
}

// Each route has a small metadata file generated from the same catalog as its HTML.
// This avoids bundling the full article library into the application's first load.
const cache = new Map<string, PageMetadata>();
export default function RouteSeo() {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  useEffect(() => {
    const path = pathname.replace(/\/+$/, '') || '/';
    if (isPrivatePath(path)) { delete document.documentElement.dataset.pageLanguage; applyPageMetadata(); return; }
    let cancelled = false;
    const apply = (page: PageMetadata) => {
      if (cancelled) return;
      const query = new URLSearchParams(search);
      const requested = query.get('lang');
      const destination = requested && page.alternates?.[requested];
      if (destination && (destination !== path || query.has('lang'))) {
        query.delete('lang'); navigate(`${destination}${query.size ? `?${query}` : ''}${hash}`, { replace: true }); return;
      }
      applyPageMetadata(page);
      if (i18n.resolvedLanguage !== page.lang) void i18n.changeLanguage(page.lang);
    };
    const cached = cache.get(path);
    if (cached) apply(cached);
    else fetch(`/seo-meta${path === '/' ? '' : path}/index.json`)
      .then(response => { if (!response.ok) throw new Error('No public metadata'); return response.json() as Promise<PageMetadata>; })
      .then(page => { if (page.path !== path) throw new Error('Incorrect metadata route'); cache.set(path, page); apply(page); })
      .catch(() => { if (!cancelled) applyPageMetadata(); });
    return () => { cancelled = true; };
  }, [pathname, search, hash, navigate, i18n]);
  return null;
}
