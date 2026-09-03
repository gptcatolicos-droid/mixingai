import { useMemo, useState } from 'react';
import { aiMusicPlatformCategories, aiMusicPlatforms } from '../../../content/aiMusicPlatforms';

const categoryEs: Record<string, string> = {
  'Mixing & mastering': 'Mezcla y mastering', 'Music generation': 'Generación musical',
  'Voice & vocals': 'Voz y canto', 'Stems & DJ': 'Stems y DJ',
  'Editing & restoration': 'Edición y restauración', 'Composition & analysis': 'Composición y análisis',
};

export default function AiMusicPlatformDirectory({ english }: { english: boolean }) {
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(english ? 'en' : 'es');
    return aiMusicPlatforms.filter(item => {
      const text = `${item.name} ${item.category} ${english ? item.description : item.descriptionEs}`.toLocaleLowerCase(english ? 'en' : 'es');
      return (category === 'all' || item.category === category) && (!needle || text.includes(needle));
    });
  }, [category, english, query]);

  return <section className="mt-12 border-t border-slate-200 pt-10" aria-labelledby="platform-directory-title">
    <div className="mb-8">
      <p className="text-sm font-bold uppercase tracking-widest text-purple-700">{english ? 'Curated directory' : 'Directorio editorial'}</p>
      <h2 id="platform-directory-title" className="mt-2 text-3xl font-bold text-slate-950">{english ? '100 AI music platforms and tools' : '100 plataformas y herramientas de música con IA'}</h2>
      <p className="mt-3 text-slate-600">{english ? 'Filter by production stage and visit each official website.' : 'Filtra por etapa de producción y visita el sitio oficial de cada herramienta.'}</p>
    </div>
    <div className="sticky top-4 z-10 mb-7 rounded-2xl border border-purple-100 bg-white/95 p-4 shadow-lg backdrop-blur">
      <label htmlFor="platform-search" className="mb-2 block text-sm font-semibold text-slate-800">{english ? 'Search the directory' : 'Buscar en el directorio'}</label>
      <input id="platform-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={english ? 'Try: mastering, stems, vocals…' : 'Prueba: mastering, stems, voces…'} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200" />
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        <button type="button" onClick={() => setCategory('all')} aria-pressed={category === 'all'} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${category === 'all' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-700'}`}>{english ? 'All tools' : 'Todas'}</button>
        {aiMusicPlatformCategories.map(item => <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${category === item ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-700'}`}>{english ? item : categoryEs[item]}</button>)}
      </div>
      <p className="mt-2 text-sm text-slate-500" aria-live="polite">{english ? `${filtered.length} entries shown` : `${filtered.length} entradas visibles`}</p>
    </div>
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="min-w-[760px] w-full border-collapse bg-white text-left">
        <caption className="sr-only">{english ? 'Directory of 100 AI music platforms and tools' : 'Directorio de 100 plataformas y herramientas de música con IA'}</caption>
        <thead className="bg-slate-950 text-white"><tr><th className="p-4">#</th><th className="p-4">{english ? 'Platform or tool' : 'Plataforma o herramienta'}</th><th className="p-4">{english ? 'Category' : 'Categoría'}</th><th className="p-4">{english ? 'What it does' : 'Qué hace'}</th></tr></thead>
        <tbody>{filtered.map(item => <tr key={item.rank} className={item.owned ? 'border-t border-purple-200 bg-purple-50' : 'border-t border-slate-200'}>
          <td className="p-4 align-top font-bold text-slate-700">{item.rank}</td>
          <td className="p-4 align-top"><a href={item.url} target="_blank" rel="noreferrer" className="font-bold text-purple-800 underline">{item.name}</a>{item.owned && <span className="ml-2 inline-block rounded-full bg-purple-700 px-2 py-1 text-xs font-bold text-white">{english ? 'Our product' : 'Producto propio'}</span>}</td>
          <td className="p-4 align-top text-sm font-semibold text-slate-700">{english ? item.category : categoryEs[item.category]}</td>
          <td className="p-4 align-top text-sm leading-6 text-slate-700">{english ? item.description : item.descriptionEs}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {!filtered.length && <p className="mt-4 rounded-xl bg-amber-50 p-5 text-amber-900">{english ? 'No entries match those filters.' : 'Ninguna entrada coincide con esos filtros.'}</p>}
  </section>;
}
