import { Link } from 'react-router-dom';

const rows = [
  ['Análisis antes de procesar', 'Análisis de mezcla, nivel y picos antes del mastering', 'El flujo y la información visible varían según el servicio'],
  ['Resultado para streaming', 'Objetivo de loudness y protección de pico para distribución', 'Puede depender del estilo, crédito o configuración elegida'],
  ['Comparación A/B', 'Original y resultado con volumen igualado', 'No siempre está disponible o puede ser limitada'],
  ['Formatos de entrega', 'MP3 y WAV de 24 bits según el plan', 'Puede estar condicionado al plan o a créditos'],
  ['Trabajo de álbum', 'Cohesión de volumen, dinámica y tono entre canciones', 'Con frecuencia se trata como canciones individuales'],
];

const englishRows = [
  ['Analysis before processing', 'Mix, level and peak analysis before mastering', 'Workflow and visible information vary by service'],
  ['Streaming delivery', 'Loudness target and peak protection for distribution', 'May depend on the style, credits or settings'],
  ['A/B comparison', 'Original and processed audio at matched loudness', 'Not always available or may be limited'],
  ['Delivery formats', 'MP3 and 24-bit WAV depending on the plan', 'May depend on the plan or credits'],
  ['Album workflow', 'Consistent volume, dynamics and tone across songs', 'Songs are often processed individually'],
];

export default function ArticleComparison({ english = false }: { english?: boolean }) {
  return (
    <section className="mt-12 overflow-hidden rounded-2xl border border-violet-200 bg-violet-50" aria-labelledby="comparison-title">
      <div className="border-b border-violet-200 bg-violet-100 px-6 py-5">
        <p className="text-xs font-bold tracking-[0.18em] text-violet-700">{english ? 'WORKFLOW COMPARISON' : 'COMPARACIÓN PRÁCTICA'}</p>
        <h2 id="comparison-title" className="mt-2 text-2xl font-bold text-slate-900">{english ? 'MixingMusic and other platforms' : 'MixingMusic frente a otras plataformas'}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{english ? 'A general workflow comparison. Features of other platforms and traditional tools vary by plan and configuration.' : 'Comparación general del flujo de trabajo. Las funciones de otras plataformas y soluciones tradicionales varían según su plan y configuración.'}</p>
      </div>
      <div className="overflow-x-auto bg-white">
        <div className="min-w-[620px]">
          <div className="grid grid-cols-[1.1fr_1.25fr_1.25fr] border-b border-slate-200 bg-slate-50 text-sm font-bold text-slate-700">
            <span className="p-4">{english ? 'Feature' : 'Funcionalidad'}</span><span className="p-4 text-violet-700">MixingMusic</span><span className="p-4">{english ? 'Other platforms' : 'Otras plataformas'}</span>
          </div>
          {(english ? englishRows : rows).map(([feature, mixingMusic, alternatives]) => (
            <div key={feature} className="grid grid-cols-[1.1fr_1.25fr_1.25fr] border-b border-slate-100 text-sm last:border-0">
              <strong className="p-4 text-slate-800">{feature}</strong><span className="p-4 text-slate-700">{mixingMusic}</span><span className="p-4 text-slate-600">{alternatives}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 px-6 py-6 sm:flex-row">
        <Link to="/auth/register?mode=master" className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-3 font-bold text-white transition hover:bg-violet-700">{english ? 'Try MixingMusic free →' : 'Probar MixingMusic gratis →'}</Link>
        <Link to="/pricing" className="inline-flex items-center justify-center rounded-xl border border-violet-300 bg-white px-5 py-3 font-bold text-violet-700 transition hover:bg-violet-50">{english ? 'View pricing and plans →' : 'Ver precios y planes →'}</Link>
      </div>
    </section>
  );
}
