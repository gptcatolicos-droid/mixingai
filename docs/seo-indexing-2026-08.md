# MixingMusic SEO correction — 30 August 2026

## Problem and evidence

Production already appears for the exact brand; absence from a generic query does not demonstrate deindexing. The public crawl found a concrete technical problem: 138 of 323 sitemap URLs returned HTTP 404. These were the 131 unique blog articles and seven public pages. React displayed their content after loading, but the original response was an empty root with home metadata. Home itself also had no initial content. The favicon, Apple icon and social image URLs returned 404.

The previous build only checked 184 landing/directory pages. It did not test articles, other public pages, icons or actual HTTP responses. Blog languages shared a canonical and query parameter, and article schemas/alternate links could persist after client navigation.

## Changes

- Generate real static HTML for all 456 public routes: 232 Spanish and 224 English. Keep all previously published URLs; add 131 English article paths, the English blog index and the cookie policy to the sitemaps.
- Render the actual React content, global header, prices and footer. Include route CSS immediately using the Vite manifest. Home prices follow the hero in the DOM as well as visually.
- Use one metadata catalog for static documents and client navigation: self canonical, title, description, Open Graph, Twitter, language and relevant structured data. Remove stale article/schema/language metadata on navigation and noindex account/application paths.
- Give the existing English articles `/en/blog/...` URLs with reciprocal ES/EN and x-default links. Preserve legacy `?lang=en` and `?lang=es` blog links via an early client redirect, including other parameters and fragments. This is not an HTTP 301 rule. Single-language public pages no longer advertise a nonexistent translation. Private application language preferences are unchanged.
- Generate both sitemaps from the same route catalog. Omit lastmod rather than invent build dates or repeat inaccurate historical values. Future content dates can be added when maintained reliably.
- Preserve the first existing article for the duplicated `mezcla-vs-mastering-diferencias` slug, matching the old route's `find()` behavior. Keep the unused source entry, but exclude it from public indexes and metadata.
- Render article Markdown safely with real lists, tables and clickable sources. Keep one H1, correct three obsolete internal target URLs and remove invitations to four guides that do not exist. English internal article links stay in English.
- Package the approved favicon as ICO, PNG 16/32/48/96/192/512, and Apple 180. Use its square image for the default social preview with truthful dimensions; articles retain their own preview images.
- Consolidate crawler rules, leave public content/assets crawlable and let bots read noindex on account pages. Robots.txt is not an access-control mechanism.
- Generate 14 noindex private app shells so login, verification, checkout, mastering and other existing deep links still load without a global home rewrite. Generate a distinct noindex 404.
- Remove the Blueprint catch-all rewrite. Existing Render dashboard rules must be checked at deployment: changing a repository Blueprint does not prove an existing service adopted it.

No audio processing, presets, payment processing, databases, secrets or account permissions changed. Pricing values and checkout handlers were preserved.

## Validation

Run:

```sh
npm ci
npm run build
npm run test:seo
node scripts/validateSeoArtifacts.mjs --origin https://mixingmusic.ai
```

The build checks all public HTML, sitemap membership, unique titles/canonicals, language reciprocity, source links/local assets, one H1, navigation, initial CSS, metadata/schema agreement, favicon signatures/dimensions, private shells and 404 markup. The DOM navigation test exercises article → pricing → private/unknown → home to catch stale tags and noindex leakage. The HTTP command checks every public route, private entries, assets and a random nonexistent URL. Run that command against the deployed commit, not just a local server.

Scoped SEO TypeScript validation passes. The pre-existing global TypeScript check fails in the unused legacy `src/pages/home/components/MasterScreen.tsx` at lines 373–374. This file was not changed; do not describe the whole repository's typecheck as passing. Production compilation passes. Existing audio chunk size warnings remain outside this SEO patch.

## Deployment and remaining external checks

1. Confirm the Render workspace, review the PR and deploy the exact approved commit to the existing service. Do not create another site.
2. Inspect effective Redirects/Rewrites. Keep existing www → apex and HTTPS redirects. Remove a global `/* → /index.html` if present, because all supported entry points now have files and unknown URLs need HTTP 404.
3. Run the full HTTP validation against production. Visually inspect home, a landing, both blog languages, an article and mobile navigation. Verify the favicon response is an image, not fallback HTML.
4. In the verified Google Search Console domain property, submit `https://mixingmusic.ai/sitemap.xml`. Inspect home, blog and representative corrected articles using the live test; request indexing for the important URLs.
5. Monitor Page Indexing and Search Performance. Do not equate a successful technical fix with guaranteed indexing, position or immediate favicon display. Google controls recrawling and inclusion.
6. Measure field Core Web Vitals / PageSpeed after deployment; no performance score or ranking improvement has been claimed. Content quality, verifiable editorial sourcing and organic mentions still require ongoing work.

Search Console was not authenticated during the audit. No sitemap submission or indexing request has been claimed. The browser environment could not open the local preview; local HTML/HTTP/DOM checks do not replace the final production visual check.

## Official references

- https://developers.google.com/search/docs/appearance/favicon-in-search
- https://developers.google.com/search/docs/specialty/international/localized-versions
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://render.com/docs/static-sites
