import { Link } from 'react-router-dom';

const rows = [
  ['Análisis antes de procesar', 'Análisis de mezcla, nivel y picos antes del mastering', 'El flujo y la información visible varían según el servicio'],
  ['Resultado para streaming', 'Objetivo de loudness y protección de pico para distribución', 'Puede depender del estilo, crédito o configuración elegida'],
  ['Comparación A/B', 'Original y resultado con volumen igualado', 'No siempre está disponible o puede ser limitada'],
  ['Formatos de entrega', 'MP3 y WAV de 24 bits según el plan', 'Puede estar condicionado al plan o a créditos'],
  ['Trabajo de álbum', 'Cohesión de volumen, dinámica y tono entre canciones', 'Con frecuencia se trata como canciones individuales'],
];

export default function ArticleComparison() {
  return (
    <section className="mt-12 overflow-hidden rounded-2xl border border-violet-200 bg-violet-50" aria-labelledby="comparison-title">
      <div className="border-b border-violet-200 bg-violet-100 px-6 py-5">
        <p className="text-xs font-bold tracking-[0.18em] text-violet-700">COMPARACIÓN PRÁCTICA</p>
        <h2 id="comparison-title" className="mt-2 text-2xl font-bold text-slate-900">MixingMusic frente a otras plataformas</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Comparación general del flujo de trabajo. Las funciones de otras plataformas y soluciones tradicionales varían según su plan y configuración.</p>
      </div>
      <div className="overflow-x-auto bg-white">
        <div className="min-w-[620px]">
          <div className="grid grid-cols-[1.1fr_1.25fr_1.25fr] border-b border-slate-200 bg-slate-50 text-sm font-bold text-slate-700">
            <span className="p-4">Funcionalidad</span><span className="p-4 text-violet-700">MixingMusic</span><span className="p-4">Otras plataformas</span>
          </div>
          {rows.map(([feature, mixingMusic, alternatives]) => (
            <div key={feature} className="grid grid-cols-[1.1fr_1.25fr_1.25fr] border-b border-slate-100 text-sm last:border-0">
              <strong className="p-4 text-slate-800">{feature}</strong><span className="p-4 text-slate-700">{mixingMusic}</span><span className="p-4 text-slate-600">{alternatives}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 px-6 py-6 sm:flex-row">
        <Link to="/auth/register?mode=master" className="inline-flex items-center justify-center rounded-xl bg-violet-600 px-5 py-3 font-bold text-white transition hover:bg-violet-700">Probar MixingMusic gratis →</Link>
        <Link to="/pricing" className="inline-flex items-center justify-center rounded-xl border border-violet-300 bg-white px-5 py-3 font-bold text-violet-700 transition hover:bg-violet-50">Ver precios y planes →</Link>
      </div>
    </section>
  );
}
