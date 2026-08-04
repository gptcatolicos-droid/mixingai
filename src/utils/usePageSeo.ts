import { useEffect } from 'react';

type SeoOptions = {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  lang?: 'es' | 'en';
  alternate?: { lang: 'es' | 'en'; href: string };
  schema?: Record<string, unknown> | Record<string, unknown>[];
};

function setMeta(selector: string, attribute: 'name' | 'property', key: string, value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = value;
}

export function usePageSeo({ title, description, canonical, image = 'https://mixingmusic.ai/og-mixingmusic.png', lang = 'es', alternate, schema }: SeoOptions) {
  useEffect(() => {
    document.title = title;
    document.documentElement.lang = lang;
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
    setMeta('meta[property="og:image"]', 'property', 'og:image', image);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);

    let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonical;

    document.head.querySelectorAll('link[data-v3-hreflang]').forEach((node) => node.remove());
    if (alternate) {
      for (const item of [{ lang, href: canonical }, alternate]) {
        const link = document.createElement('link');
        link.rel = 'alternate';
        link.hreflang = item.lang;
        link.href = item.href;
        link.dataset.v3Hreflang = 'true';
        document.head.appendChild(link);
      }
    }

    document.head.querySelectorAll('script[data-v3-schema]').forEach((node) => node.remove());
    for (const item of schema ? (Array.isArray(schema) ? schema : [schema]) : []) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.dataset.v3Schema = 'true';
      script.textContent = JSON.stringify(item);
      document.head.appendChild(script);
    }
  }, [title, description, canonical, image, lang, alternate, schema]);
}
