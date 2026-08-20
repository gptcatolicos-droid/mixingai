import { renderToStaticMarkup } from 'react-dom/server';
import { SeoLandingContent } from '../src/pages/seo-landings/page';
import { seoLandingByPath, seoLandings } from '../src/pages/seo-landings/seoLandingData';
import { buildSeoSchema } from '../src/pages/seo-landings/seoSchema';
import { PluginDirectoryContent, buildPluginSchema, pluginViewMeta, resolvePluginView } from '../src/pages/plugin-directory/page';
import { pluginDirectoryRoutes } from '../src/pages/plugin-directory/pluginData';

export const seoRoutes = [...seoLandings.map((landing) => landing.path), ...pluginDirectoryRoutes];

export function renderSeoRoute(path: string) {
  const landing = seoLandingByPath[path];
  if (landing) return { landing, schema: buildSeoSchema(landing), html: renderToStaticMarkup(<SeoLandingContent landing={landing} />) };
  const view = resolvePluginView(path);
  if (!view) throw new Error(`Unknown SEO route: ${path}`);
  const meta = pluginViewMeta(view);
  return { landing: { metaTitle: meta.title, metaDescription: meta.description, path: meta.path, alternatePath: meta.alternatePath, lang: view.lang, kind: 'plugin-directory' }, schema: buildPluginSchema(path), html: renderToStaticMarkup(<PluginDirectoryContent path={path} />) };
}
