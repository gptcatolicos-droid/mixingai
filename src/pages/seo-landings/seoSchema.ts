import type { SeoLanding } from './seoLandingData';

const ORIGIN = 'https://mixingmusic.ai';

export function buildSeoSchema(landing: SeoLanding) {
  return [
    landing.kind === 'genre' ? {
      '@context': 'https://schema.org', '@type': 'Article', headline: landing.metaTitle, description: landing.metaDescription,
      inLanguage: landing.lang, mainEntityOfPage: `${ORIGIN}${landing.path}`, author: { '@type': 'Organization', name: 'MixingMusic.AI' },
      publisher: { '@type': 'Organization', name: 'MixingMusic.AI', logo: { '@type': 'ImageObject', url: `${ORIGIN}/logo-brand.png` } },
    } : {
      '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'MixingMusic.AI', applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web', url: `${ORIGIN}${landing.path}`, description: landing.metaDescription,
      offers: [{ '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free' }, { '@type': 'Offer', price: '14.99', priceCurrency: 'USD', name: 'Unlimited lifetime' }],
    },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'MixingMusic.AI', item: `${ORIGIN}/` },
      ...(landing.parentPath ? [{ '@type': 'ListItem', position: 2, name: landing.kind === 'preset' ? 'Presets' : (landing.lang === 'es' ? 'Géneros' : 'Genres'), item: `${ORIGIN}${landing.parentPath}` }] : []),
      { '@type': 'ListItem', position: landing.parentPath ? 3 : 2, name: landing.title, item: `${ORIGIN}${landing.path}` },
    ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: landing.faq.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })) },
  ];
}
