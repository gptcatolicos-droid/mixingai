import { useMemo, useState } from 'react';
import { aiMusicPromptGenres, aiMusicPrompts } from '../../../content/aiMusicPrompts';

export default function AiMusicPromptLibrary({ english }: { english: boolean }) {
  const [genre, setGenre] = useState('all');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState<string>();
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(english ? 'en' : 'es');
    return aiMusicPrompts.filter(item => {
      const matchesGenre = genre === 'all' || item.genre === genre;
      const text = english ? `${item.title} ${item.prompt}` : `${item.titleEs} ${item.promptEs}`;
      return matchesGenre && (!needle || text.toLocaleLowerCase(english ? 'en' : 'es').includes(needle));
    });
  }, [english, genre, query]);

  const copy = async (id: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    window.setTimeout(() => setCopied(current => current === id ? undefined : current), 1800);
  };

  return <section className="mt-12 border-t border-slate-200 pt-10" aria-labelledby="prompt-library-title">
    <div className="mb-8">
      <p className="text-sm font-bold uppercase tracking-widest text-purple-700">{english ? 'Interactive library' : 'Biblioteca interactiva'}</p>
      <h2 id="prompt-library-title" className="mt-2 text-3xl font-bold text-slate-950">{english ? '100 free AI music prompts' : '100 prompts de música IA gratis'}</h2>
      <p className="mt-3 text-slate-600">{english ? 'Filter by genre or search for an instrument, arrangement or production direction.' : 'Filtra por género o busca un instrumento, arreglo o dirección de producción.'}</p>
    </div>

    <div className="sticky top-4 z-10 mb-8 rounded-2xl border border-purple-100 bg-white/95 p-4 shadow-lg backdrop-blur">
      <label htmlFor="prompt-search" className="mb-2 block text-sm font-semibold text-slate-800">{english ? 'Search prompts' : 'Buscar prompts'}</label>
      <input id="prompt-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={english ? 'Try: vocal, live, bass, cinematic…' : 'Prueba: voz, en vivo, bajo, cinemática…'} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-200" />
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label={english ? 'Filter prompts by genre' : 'Filtrar prompts por género'}>
        <button type="button" onClick={() => setGenre('all')} aria-pressed={genre === 'all'} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${genre === 'all' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-700'}`}>{english ? 'All genres' : 'Todos'}</button>
        {aiMusicPromptGenres.map(item => <button key={item.genre} type="button" onClick={() => setGenre(item.genre)} aria-pressed={genre === item.genre} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${genre === item.genre ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-700'}`}>{english ? item.genre : item.genreEs}</button>)}
      </div>
      <p className="mt-2 text-sm text-slate-500" aria-live="polite">{english ? `${filtered.length} prompts shown` : `${filtered.length} prompts visibles`}</p>
    </div>

    <div className="grid gap-5 md:grid-cols-2">
      {filtered.map((item, index) => {
        const prompt = english ? item.prompt : item.promptEs;
        return <article key={item.id} className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="mb-3 flex items-start justify-between gap-4">
            <h3 className="text-lg font-bold text-slate-950">{aiMusicPrompts.indexOf(item) + 1}. {english ? item.title : item.titleEs}</h3>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800">{english ? item.genre : item.genreEs}</span>
          </div>
          <p className="flex-1 text-sm leading-6 text-slate-700">{prompt}</p>
          <button type="button" onClick={() => copy(item.id, prompt)} className="mt-5 rounded-xl border border-purple-300 bg-white px-4 py-2 text-sm font-bold text-purple-800 hover:bg-purple-50">
            {copied === item.id ? (english ? 'Copied' : 'Copiado') : (english ? 'Copy prompt' : 'Copiar prompt')}
          </button>
        </article>;
      })}
    </div>
    {!filtered.length && <p className="rounded-xl bg-amber-50 p-5 text-amber-900">{english ? 'No prompts match those filters. Try another word or show all genres.' : 'Ningún prompt coincide. Prueba otra palabra o muestra todos los géneros.'}</p>}
  </section>;
}
