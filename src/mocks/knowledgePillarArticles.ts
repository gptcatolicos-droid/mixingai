import type { BlogArticle } from './blogArticles';

type Localized = { en: string; es: string };
type Pillar = {
  slug: string;
  title: Localized;
  summary: Localized;
  diagnosis: Localized;
  principles: { en: string[]; es: string[] };
  workflow: { en: string[]; es: string[] };
  questions: { q: Localized; a: Localized }[];
  keywords: { en: string[]; es: string[] };
  cluster: 'engineering' | 'voice' | 'instruments' | 'ai';
  sources?: { label: string; url: string }[];
};

const googleAi = { label: 'Google Search: AI features and your website', url: 'https://developers.google.com/search/docs/fundamentals/ai-optimization-guide' };
const spotifyLoudness = { label: 'Spotify: Loudness normalization', url: 'https://support.spotify.com/us/artists/article/loudness-normalization/' };
const spotifyFiles = { label: 'Spotify: Audio file formats', url: 'https://support.spotify.com/us/artists/article/audio-file-formats/' };
const shureVocals = { label: 'Shure: How to record and mix vocals', url: 'https://www.shure.com/en-us/insights/how-to-record-and-mix-vocals' };
const shureMic = { label: 'Shure: Why microphone placement matters', url: 'https://www.shure.com/en-us/insights/three-reasons-why-mic-placement-matters' };
const copyrightAi = { label: 'U.S. Copyright Office: Copyright and Artificial Intelligence', url: 'https://www.copyright.gov/ai/' };
const author = {
  name: 'MixingMusic.AI Editorial Team',
  avatar: '/favicon-192.png',
  bio: 'Editorial team focused on practical, source-backed music production, mixing and mastering education.',
  bioEs: 'Equipo editorial enfocado en educación práctica y documentada sobre producción, mezcla y mastering.',
};

const pillars: Pillar[] = [
  {
    slug: 'compresion-audio-guia-completa',
    title: { en: 'Audio Compression: A Complete Practical Guide', es: 'Compresión de audio: guía práctica completa' },
    summary: { en: 'Learn what threshold, ratio, attack, release, knee and makeup gain actually change, then use compression by listening instead of copying presets.', es: 'Entiende qué cambian threshold, ratio, ataque, release, knee y makeup gain, y comprime escuchando en vez de copiar presets.' },
    diagnosis: { en: 'Compression is not simply a loudness tool. It reshapes the envelope: the relationship between the transient, body and decay. Before inserting one, name the problem—uneven phrases, sharp peaks, weak sustain or missing groove.', es: 'La compresión no es solo una herramienta de volumen. Rediseña la envolvente: la relación entre transitorio, cuerpo y caída. Antes de insertarla, nombra el problema: frases inestables, picos agresivos, poco sustain o falta de groove.' },
    principles: { en: ['Lower the threshold until only the intended moments trigger gain reduction.', 'Use slower attack to preserve impact and faster attack to soften it.', 'Time release to recover before the next important event.', 'Level-match bypass; louder is easily mistaken for better.'], es: ['Baja el threshold hasta que solo actúen los momentos deseados.', 'Usa ataque lento para conservar impacto y rápido para suavizarlo.', 'Ajusta el release para recuperar antes del siguiente evento importante.', 'Iguala el volumen al comparar; más fuerte suele parecer mejor.'] },
    workflow: { en: ['Set ratio near 2:1 and find the threshold.', 'Shape the attack while listening to the front edge.', 'Set release from the musical pulse, not a chart.', 'Add makeup gain only after the movement feels right.', 'Check quiet and loud sections in context.'], es: ['Empieza cerca de 2:1 y encuentra el threshold.', 'Moldea el ataque escuchando el borde inicial.', 'Ajusta release desde el pulso musical, no desde una tabla.', 'Añade makeup gain solo cuando el movimiento funcione.', 'Comprueba secciones suaves y fuertes dentro de la mezcla.'] },
    questions: [
      { q: { en: 'How much gain reduction is correct?', es: '¿Cuánta reducción de ganancia es correcta?' }, a: { en: 'There is no universal number. Use the smallest movement that solves the named problem without flattening expression.', es: 'No existe un número universal. Usa el movimiento mínimo que resuelva el problema sin aplastar la expresión.' } },
      { q: { en: 'Should every track be compressed?', es: '¿Hay que comprimir todas las pistas?' }, a: { en: 'No. Stable performances and already processed samples may need no additional dynamics control.', es: 'No. Interpretaciones estables y samples ya procesados pueden no necesitar más control dinámico.' } },
    ], keywords: { en: ['audio compression guide', 'compressor attack release', 'how to compress music'], es: ['compresión de audio', 'ataque y release compresor', 'cómo comprimir música'] }, cluster: 'engineering',
  },
  {
    slug: 'ecualizacion-audio-guia-completa',
    title: { en: 'Audio EQ: Frequencies, Masking and Better Decisions', es: 'Ecualización de audio: frecuencias, enmascaramiento y mejores decisiones' },
    summary: { en: 'Use EQ to create contrast, remove specific problems and give important elements space without turning frequency charts into rigid recipes.', es: 'Usa EQ para crear contraste, corregir problemas concretos y dar espacio a lo importante sin convertir las tablas de frecuencia en recetas rígidas.' },
    diagnosis: { en: 'A frequency is not automatically bad. The same low-mid energy can be warmth in a sparse arrangement and masking in a dense one. Decide which source owns the range before boosting or cutting.', es: 'Una frecuencia no es mala por sí sola. El mismo contenido grave-medio puede ser calidez en un arreglo vacío y enmascaramiento en uno denso. Decide qué fuente debe dominar la zona antes de cortar o realzar.' },
    principles: { en: ['Filter only when unwanted energy is actually present.', 'Make broad tonal moves before narrow corrective moves.', 'EQ competing sources in relation to one another.', 'Judge changes at matched loudness and inside the full mix.'], es: ['Filtra solo cuando realmente exista energía no deseada.', 'Haz movimientos tonales amplios antes de correcciones estrechas.', 'Ecualiza fuentes que compiten en relación entre sí.', 'Evalúa a igual volumen y dentro de la mezcla completa.'] },
    workflow: { en: ['Identify the masking pair.', 'Choose the element that carries the musical message.', 'Try a small subtractive move on its competitor.', 'Automate if the conflict appears only in one section.', 'Check on speakers, headphones and low volume.'], es: ['Identifica el par que se enmascara.', 'Elige el elemento que lleva el mensaje musical.', 'Prueba una reducción pequeña en su competidor.', 'Automatiza si el conflicto aparece solo en una sección.', 'Comprueba en altavoces, audífonos y volumen bajo.'] },
    questions: [
      { q: { en: 'Is subtractive EQ always better?', es: '¿La EQ sustractiva siempre es mejor?' }, a: { en: 'No. Cuts and boosts are both valid; the audible result, headroom and context matter more than the direction.', es: 'No. Cortes y realces son válidos; importan más el resultado, el headroom y el contexto.' } },
      { q: { en: 'Should I sweep a narrow boost to find problems?', es: '¿Debo barrer un realce estrecho para encontrar problemas?' }, a: { en: 'Use that method carefully because extreme boosts make almost every frequency sound unpleasant.', es: 'Úsalo con cautela porque los realces extremos hacen desagradable casi cualquier frecuencia.' } },
    ], keywords: { en: ['audio EQ guide', 'frequency masking mix', 'how to EQ instruments'], es: ['guía ecualización audio', 'enmascaramiento frecuencias', 'cómo ecualizar instrumentos'] }, cluster: 'engineering',
  },
  {
    slug: 'produccion-vocal-grabacion-edicion-mezcla',
    title: { en: 'Vocal Production: Recording, Editing and Mixing', es: 'Producción vocal: grabación, edición y mezcla' },
    summary: { en: 'A complete vocal workflow from room and microphone position through comping, tuning, dynamics, effects and final automation.', es: 'Un flujo vocal completo desde sala y posición del micrófono hasta comping, afinación, dinámica, efectos y automatización final.' },
    diagnosis: { en: 'The most expensive vocal chain cannot rescue a tense performance recorded in a reflective room. Fix monitoring, distance, angle and interpretation first; processing should support a believable voice.', es: 'La cadena vocal más costosa no rescata una interpretación tensa grabada en una sala reflectiva. Corrige monitoreo, distancia, ángulo e interpretación primero; el proceso debe sostener una voz creíble.' },
    principles: { en: ['Choose takes for emotion before microscopic perfection.', 'Edit breaths and consonants without removing human phrasing.', 'Use serial gentle control when one compressor sounds obvious.', 'Automate words after compression instead of forcing one setting.'], es: ['Elige tomas por emoción antes que por perfección microscópica.', 'Edita respiraciones y consonantes sin borrar el fraseo humano.', 'Usa control suave en serie si un solo compresor se vuelve evidente.', 'Automatiza palabras después de comprimir en vez de forzar un ajuste.'] },
    workflow: { en: ['Reduce room reflections and set a repeatable mic position.', 'Record several complete takes plus targeted repairs.', 'Build a clean comp with natural transitions.', 'Correct timing and pitch only where they distract.', 'Balance EQ, compression, de-essing, ambience and automation.'], es: ['Reduce reflexiones y fija una posición repetible.', 'Graba varias tomas completas y reparaciones puntuales.', 'Construye un comp limpio con transiciones naturales.', 'Corrige tiempo y afinación solo donde distraigan.', 'Equilibra EQ, compresión, de-essing, ambiente y automatización.'] },
    questions: [
      { q: { en: 'How far should the singer be from the microphone?', es: '¿A qué distancia debe cantar del micrófono?' }, a: { en: 'Start around a hand span with a pop filter, then adjust for proximity effect, room tone, level and performance.', es: 'Empieza cerca de una mano con filtro antipop y ajusta según proximidad, sala, nivel e interpretación.' } },
      { q: { en: 'Do vocals need to be perfectly tuned?', es: '¿La voz debe quedar perfectamente afinada?' }, a: { en: 'Only if the aesthetic requires it. Preserve purposeful scoops, vibrato and transitions that carry identity.', es: 'Solo si la estética lo exige. Conserva portamentos, vibrato y transiciones que aportan identidad.' } },
    ], keywords: { en: ['vocal production guide', 'record edit mix vocals', 'vocal mixing workflow'], es: ['producción vocal', 'grabar editar mezclar voz', 'flujo mezcla vocal'] }, cluster: 'voice', sources: [shureVocals, shureMic],
  },
  {
    slug: 'imagen-estereo-fase-y-compatibilidad-mono',
    title: { en: 'Stereo Image, Phase and Mono Compatibility', es: 'Imagen estéreo, fase y compatibilidad mono' },
    summary: { en: 'Build width that survives mono by understanding polarity, timing, correlation, panning and the difference between real space and artificial widening.', es: 'Construye amplitud que sobreviva en mono entendiendo polaridad, tiempo, correlación, panorama y la diferencia entre espacio real y apertura artificial.' },
    diagnosis: { en: 'Width created by tiny delays can disappear or change tone when channels combine. A wide meter is not proof of a stable image; the center, low end and musical priorities must remain clear.', es: 'La amplitud creada con retardos mínimos puede desaparecer o cambiar de tono al sumar canales. Un medidor ancho no demuestra estabilidad; el centro, el grave y las prioridades musicales deben seguir claros.' },
    principles: { en: ['Resolve multi-microphone timing before creative widening.', 'Keep critical low-frequency anchors stable.', 'Use arrangement and panning before phase-based tricks.', 'Check mono, correlation and several playback positions.'], es: ['Resuelve el tiempo entre micrófonos antes de abrir creativamente.', 'Mantén estables los anclajes graves importantes.', 'Usa arreglo y panorama antes de trucos basados en fase.', 'Comprueba mono, correlación y varias posiciones de escucha.'] },
    workflow: { en: ['Listen in mono and identify cancellations.', 'Inspect polarity and sample alignment where appropriate.', 'Establish center and side priorities.', 'Add ambience or width in controlled amounts.', 'Recheck headphones, speakers and phone playback.'], es: ['Escucha en mono e identifica cancelaciones.', 'Revisa polaridad y alineación de muestras cuando corresponda.', 'Define prioridades de centro y lados.', 'Añade ambiente o amplitud con control.', 'Revisa en audífonos, altavoces y teléfono.'] },
    questions: [
      { q: { en: 'Does negative correlation always mean failure?', es: '¿La correlación negativa siempre significa un fallo?' }, a: { en: 'It is a warning, not a verdict. Listen to what disappears or changes and decide whether it harms the music.', es: 'Es una alerta, no un veredicto. Escucha qué desaparece o cambia y decide si perjudica la música.' } },
      { q: { en: 'Should bass always be mono?', es: '¿El bajo siempre debe ser mono?' }, a: { en: 'Not always, but the deepest and most important energy generally benefits from a stable center.', es: 'No siempre, pero la energía más profunda e importante suele beneficiarse de un centro estable.' } },
    ], keywords: { en: ['stereo imaging guide', 'phase mono compatibility', 'mix width without phase'], es: ['imagen estéreo', 'fase compatibilidad mono', 'amplitud mezcla sin fase'] }, cluster: 'engineering',
  },
  {
    slug: 'mezcla-instrumentos-bateria-bajo-guitarras-teclados',
    title: { en: 'Mixing Instruments: Drums, Bass, Guitars and Keys', es: 'Mezcla de instrumentos: batería, bajo, guitarras y teclados' },
    summary: { en: 'Mix a rhythm section and harmonic instruments as one arrangement, with priorities, contrast and frequency ownership.', es: 'Mezcla la sección rítmica y los instrumentos armónicos como un solo arreglo, con prioridades, contraste y propiedad de frecuencias.' },
    diagnosis: { en: 'Most crowded mixes are arrangement problems expressed as processing problems. If every instrument is bright, wide and sustained, EQ alone cannot create hierarchy.', es: 'Muchas mezclas congestionadas son problemas de arreglo expresados como problemas de proceso. Si todo es brillante, ancho y sostenido, la EQ no puede crear jerarquía por sí sola.' },
    principles: { en: ['Choose the rhythmic anchor for each section.', 'Let kick and bass divide weight by tone or timing.', 'Use guitar and keyboard voicings to reduce overlap.', 'Automate density as the arrangement grows.'], es: ['Elige el ancla rítmica de cada sección.', 'Separa el peso de bombo y bajo por tono o tiempo.', 'Usa voicings de guitarra y teclas para reducir solapamiento.', 'Automatiza la densidad cuando crece el arreglo.'] },
    workflow: { en: ['Build a static balance without plugins.', 'Balance kick and bass at low monitoring level.', 'Place harmonic instruments around the vocal.', 'Control resonances and dynamics only where needed.', 'Automate entrances, fills and transitions.'], es: ['Construye un balance estático sin plugins.', 'Equilibra bombo y bajo a volumen bajo.', 'Ubica instrumentos armónicos alrededor de la voz.', 'Controla resonancias y dinámica solo donde sea necesario.', 'Automatiza entradas, fills y transiciones.'] },
    questions: [
      { q: { en: 'Which instrument should be loudest?', es: '¿Qué instrumento debe sonar más fuerte?' }, a: { en: 'The answer changes by section. The lead message usually wins, while the rhythm section defines scale and movement.', es: 'La respuesta cambia por sección. El mensaje principal suele ganar y la base rítmica define escala y movimiento.' } },
      { q: { en: 'Can sidechain solve kick and bass masking?', es: '¿El sidechain resuelve el enmascaramiento de bombo y bajo?' }, a: { en: 'It can create time separation, but tuning, envelopes, notes and arrangement may be the more direct fix.', es: 'Puede crear separación temporal, pero afinación, envolventes, notas y arreglo pueden ser la solución directa.' } },
    ], keywords: { en: ['mix drums bass guitars keys', 'instrument mixing guide', 'mix arrangement'], es: ['mezclar batería bajo guitarras teclados', 'guía mezcla instrumentos', 'arreglo para mezcla'] }, cluster: 'instruments',
  },
  {
    slug: 'monitoreo-y-acustica-para-mezclar-en-casa',
    title: { en: 'Home-Studio Monitoring and Acoustics for Reliable Mixes', es: 'Monitoreo y acústica de home studio para mezclas confiables' },
    summary: { en: 'Improve translation with speaker placement, listening level, room control, references and disciplined checks before buying more plugins.', es: 'Mejora la traducción con ubicación de altavoces, nivel de escucha, control de sala, referencias y verificaciones disciplinadas antes de comprar más plugins.' },
    diagnosis: { en: 'A room can exaggerate or cancel bass at the listening position. Mixing against that error creates the opposite error in the file, so repeated low-end problems may come from monitoring rather than technique.', es: 'Una sala puede exagerar o cancelar graves en la posición de escucha. Mezclar contra ese error crea el error opuesto en el archivo; los problemas repetidos de grave pueden venir del monitoreo y no de la técnica.' },
    principles: { en: ['Start with symmetrical placement and an equilateral listening triangle.', 'Treat early reflections before chasing complete isolation.', 'Work at repeatable moderate levels.', 'Use familiar references and multiple playback systems.'], es: ['Empieza con ubicación simétrica y triángulo equilátero.', 'Controla reflexiones tempranas antes de buscar aislamiento total.', 'Trabaja a niveles moderados y repetibles.', 'Usa referencias conocidas y varios sistemas.'] },
    workflow: { en: ['Measure the room and listening position.', 'Move speakers and seat before applying correction.', 'Add broadband absorption at critical points.', 'Calibrate a comfortable reference level.', 'Keep translation notes across completed mixes.'], es: ['Mide sala y posición de escucha.', 'Mueve altavoces y asiento antes de corregir.', 'Añade absorción de banda ancha en puntos críticos.', 'Calibra un nivel de referencia cómodo.', 'Conserva notas de traducción entre mezclas.'] },
    questions: [
      { q: { en: 'Are headphones enough to mix?', es: '¿Bastan los audífonos para mezclar?' }, a: { en: 'They can work well when you know them, but cross-check stereo perspective and low end on speakers or trusted references.', es: 'Pueden funcionar si los conoces, pero verifica perspectiva estéreo y graves en altavoces o referencias confiables.' } },
      { q: { en: 'Does room correction replace acoustic treatment?', es: '¿La corrección de sala reemplaza el tratamiento?' }, a: { en: 'No. Correction cannot remove long decay or fix every spatial null; placement and treatment come first.', es: 'No. No elimina decaimientos largos ni corrige todos los nulos espaciales; ubicación y tratamiento van primero.' } },
    ], keywords: { en: ['home studio acoustics mixing', 'monitor placement guide', 'mix translation'], es: ['acústica home studio mezcla', 'ubicación monitores', 'traducción de mezcla'] }, cluster: 'engineering',
  },
  {
    slug: 'exportar-stems-y-premaster-guia',
    title: { en: 'How to Export Stems and a Premaster Correctly', es: 'Cómo exportar stems y un premaster correctamente' },
    summary: { en: 'Prepare aligned, clearly named, high-resolution files that another mixer or mastering engineer can open without guessing.', es: 'Prepara archivos alineados, bien nombrados y de alta resolución que otra persona pueda abrir sin adivinar.' },
    diagnosis: { en: 'Broken handoffs usually come from mismatched start times, clipped buses, missing effects or undocumented sample rates—not from subtle sonic choices.', es: 'Las entregas fallan por tiempos de inicio distintos, buses saturados, efectos faltantes o sample rates no documentados, no por decisiones sonoras sutiles.' },
    principles: { en: ['Export every stem from the same start and end point.', 'Preserve the native sample rate and adequate bit depth.', 'Print intentional effects or provide wet and dry versions.', 'Include tempo, key, notes and a reference bounce.'], es: ['Exporta cada stem desde el mismo inicio y final.', 'Conserva el sample rate nativo y una profundidad adecuada.', 'Imprime efectos intencionales o entrega versiones wet y dry.', 'Incluye tempo, tonalidad, notas y una referencia.'] },
    workflow: { en: ['Remove accidental master limiting.', 'Consolidate and label every source.', 'Export lossless interleaved files.', 'Reimport all files into an empty session.', 'Compare the reconstruction with the reference mix.'], es: ['Retira la limitación accidental del master.', 'Consolida y etiqueta cada fuente.', 'Exporta archivos lossless interleaved.', 'Reimporta todo en una sesión vacía.', 'Compara la reconstrucción con la referencia.'] },
    questions: [
      { q: { en: 'How much premaster headroom is required?', es: '¿Cuánto headroom necesita el premaster?' }, a: { en: 'Avoid clipping and leave workable peak margin; a specific negative peak number is less important than an unclipped, unlimited file.', es: 'Evita clipping y deja margen útil; un número negativo específico importa menos que un archivo sin recorte ni limitación.' } },
      { q: { en: 'Should stems sum exactly to the mix?', es: '¿Los stems deben sumar exactamente la mezcla?' }, a: { en: 'Ideally yes. Verify by importing them together and accounting for bus processing or external effects.', es: 'Idealmente sí. Verifica importándolos juntos y contemplando procesos de bus o efectos externos.' } },
    ], keywords: { en: ['export stems for mixing', 'premaster export settings', 'audio file handoff'], es: ['exportar stems mezcla', 'ajustes exportación premaster', 'entrega archivos audio'] }, cluster: 'engineering', sources: [spotifyFiles],
  },
  {
    slug: 'mastering-para-streaming-guia-completa',
    title: { en: 'Mastering for Streaming: Loudness, True Peak and Translation', es: 'Mastering para streaming: loudness, true peak y traducción' },
    summary: { en: 'Master for musical impact and robust encoding while understanding normalization, true peak, lossless delivery and platform variability.', es: 'Masteriza para impacto musical y codificación robusta entendiendo normalización, true peak, entrega lossless y variaciones entre plataformas.' },
    diagnosis: { en: 'Normalization changes playback gain; it does not make every master equally dynamic or equally clean. Chasing one LUFS number can damage transients without improving the listener’s experience.', es: 'La normalización cambia la ganancia de reproducción; no vuelve todos los masters igual de dinámicos ni limpios. Perseguir un solo número LUFS puede dañar transitorios sin mejorar la experiencia.' },
    principles: { en: ['Choose loudness for the song before the platform.', 'Monitor true-peak behavior and codec stress.', 'Deliver the highest accepted lossless source.', 'Compare normalized playback at matched level.'], es: ['Elige loudness para la canción antes que para la plataforma.', 'Vigila true peak y estrés de codificación.', 'Entrega la fuente lossless de mayor calidad aceptada.', 'Compara reproducción normalizada al mismo nivel.'] },
    workflow: { en: ['Finish tonal and dynamic balance.', 'Raise level while checking transient loss.', 'Measure integrated loudness and true peak.', 'Audition an encoded preview when possible.', 'Export, tag and archive the lossless master.'], es: ['Termina el balance tonal y dinámico.', 'Eleva nivel controlando pérdida de transitorios.', 'Mide loudness integrado y true peak.', 'Escucha una previsualización codificada cuando sea posible.', 'Exporta, etiqueta y archiva el master lossless.'] },
    questions: [
      { q: { en: 'Must a master hit -14 LUFS?', es: '¿El master debe llegar a -14 LUFS?' }, a: { en: 'No. That figure is often confused with a creative target. Platforms can normalize playback; master for quality and genre context.', es: 'No. Esa cifra suele confundirse con un objetivo creativo. Las plataformas pueden normalizar; masteriza por calidad y contexto.' } },
      { q: { en: 'Why does a normalized track still sound quieter?', es: '¿Por qué una pista normalizada aún parece más baja?' }, a: { en: 'Perceived loudness also depends on spectrum, crest factor, density, arrangement and the selected comparison section.', es: 'El volumen percibido también depende de espectro, crest factor, densidad, arreglo y sección comparada.' } },
    ], keywords: { en: ['mastering for streaming', 'LUFS true peak', 'Spotify mastering guide'], es: ['mastering para streaming', 'LUFS true peak', 'mastering Spotify'] }, cluster: 'engineering', sources: [spotifyLoudness, spotifyFiles],
  },
  {
    slug: 'edicion-restauracion-y-control-de-calidad-audio',
    title: { en: 'Audio Editing, Restoration and Final Quality Control', es: 'Edición, restauración y control de calidad de audio' },
    summary: { en: 'Repair clicks, noise, clipping risks and edit discontinuities conservatively, then run a repeatable release checklist.', es: 'Repara clicks, ruido, riesgos de clipping y discontinuidades con prudencia, y aplica una lista repetible antes de publicar.' },
    diagnosis: { en: 'Restoration is a tradeoff: every aggressive process can remove wanted harmonics or create watery artifacts. Work from an untouched copy and solve only audible defects.', es: 'La restauración implica compromisos: un proceso agresivo puede eliminar armónicos útiles o crear artefactos acuosos. Trabaja desde una copia intacta y corrige solo defectos audibles.' },
    principles: { en: ['Edit at zero crossings or use short crossfades.', 'Capture representative noise before reduction.', 'Repair locally before processing the whole file.', 'Audit beginnings, transitions, loudest moments and endings.'], es: ['Edita en cruces por cero o usa crossfades cortos.', 'Captura ruido representativo antes de reducirlo.', 'Repara localmente antes de procesar todo el archivo.', 'Audita inicios, transiciones, momentos fuertes y finales.'] },
    workflow: { en: ['Duplicate and checksum the source.', 'Mark defects with timecodes.', 'Apply the least invasive repair.', 'Check at normal and revealing levels.', 'Verify channel count, duration, fades, peaks and metadata.'], es: ['Duplica y verifica la fuente.', 'Marca defectos con timecodes.', 'Aplica la reparación menos invasiva.', 'Comprueba a nivel normal y de diagnóstico.', 'Verifica canales, duración, fades, picos y metadatos.'] },
    questions: [
      { q: { en: 'Can clipped audio be fully restored?', es: '¿Puede restaurarse por completo un audio recortado?' }, a: { en: 'De-clipping may estimate missing shapes, but cannot recover the exact information that was never captured.', es: 'El de-clipping puede estimar formas faltantes, pero no recupera la información exacta que nunca se capturó.' } },
      { q: { en: 'Should silence be completely silent?', es: '¿El silencio debe ser totalmente silencioso?' }, a: { en: 'Not always. Abruptly removing room tone can be more distracting than a stable, controlled background.', es: 'No siempre. Eliminar bruscamente el room tone puede distraer más que un fondo estable y controlado.' } },
    ], keywords: { en: ['audio restoration guide', 'music quality control checklist', 'remove clicks audio'], es: ['restauración de audio', 'control calidad música', 'eliminar clicks audio'] }, cluster: 'engineering',
  },
  {
    slug: 'mastering-por-genero-sin-recetas-fijas',
    title: { en: 'Mastering by Genre Without Rigid Recipes', es: 'Mastering por género sin recetas rígidas' },
    summary: { en: 'Use genre references as context for dynamics, spectrum and presentation while letting the arrangement and artistic intent lead.', es: 'Usa referencias de género como contexto para dinámica, espectro y presentación, dejando que el arreglo y la intención artística decidan.' },
    diagnosis: { en: 'Genres contain wide internal variation. A loud urban single, intimate folk recording and orchestral score demand different priorities, but none can be reduced to a preset curve.', es: 'Los géneros tienen enorme variación interna. Un single urbano fuerte, un folk íntimo y una obra orquestal exigen prioridades distintas, pero ninguno se reduce a una curva preset.' },
    principles: { en: ['Select references from the same release context.', 'Compare sections with similar energy.', 'Separate commercial convention from artistic necessity.', 'Preserve the identity established in the mix.'], es: ['Elige referencias del mismo contexto de lanzamiento.', 'Compara secciones con energía similar.', 'Separa convención comercial de necesidad artística.', 'Conserva la identidad establecida en la mezcla.'] },
    workflow: { en: ['Define the release and audience.', 'Level-match two or three current references.', 'Map differences in tone, dynamics and width.', 'Choose only the differences that help the song.', 'Validate the full sequence and delivery formats.'], es: ['Define lanzamiento y audiencia.', 'Iguala dos o tres referencias actuales.', 'Mapea diferencias de tono, dinámica y amplitud.', 'Elige solo las diferencias que ayuden a la canción.', 'Valida secuencia completa y formatos.'] },
    questions: [
      { q: { en: 'Do genres have fixed LUFS targets?', es: '¿Los géneros tienen objetivos LUFS fijos?' }, a: { en: 'No. Releases show tendencies, not rules; arrangement, distortion tolerance and transient design matter.', es: 'No. Los lanzamientos muestran tendencias, no reglas; importan arreglo, tolerancia a distorsión y transitorios.' } },
      { q: { en: 'Can one preset master an entire genre?', es: '¿Un preset puede masterizar todo un género?' }, a: { en: 'A preset can be a starting point, but input level, balance and intent change from song to song.', es: 'Puede ser un punto de partida, pero nivel, balance e intención cambian en cada canción.' } },
    ], keywords: { en: ['mastering by genre', 'genre mastering guide', 'mastering references'], es: ['mastering por género', 'guía mastering géneros', 'referencias mastering'] }, cluster: 'engineering',
  },
  {
    slug: 'reverb-delay-guia-completa',
    title: { en: 'Reverb and Delay: Depth, Space and Clarity', es: 'Reverb y delay: profundidad, espacio y claridad' },
    summary: { en: 'Create front-to-back depth with predelay, decay, filtering, timing and automation instead of washing every source in the same space.', es: 'Crea profundidad con predelay, decay, filtrado, tiempo y automatización sin ahogar todas las fuentes en el mismo espacio.' },
    diagnosis: { en: 'Ambience changes distance and continuity. Too much low-mid decay masks lyrics and groove; too little connection can make overdubs feel pasted on.', es: 'El ambiente cambia distancia y continuidad. Demasiado decay grave-medio oculta letra y groove; muy poca conexión hace que los overdubs parezcan pegados.' },
    principles: { en: ['Use predelay to separate the dry source from the room.', 'Filter returns independently from the source.', 'Time delays to groove or purposeful contrast.', 'Automate sends by phrase and section.'], es: ['Usa predelay para separar fuente seca y sala.', 'Filtra retornos de forma independiente.', 'Sincroniza delays al groove o a un contraste intencional.', 'Automatiza envíos por frase y sección.'] },
    workflow: { en: ['Choose the depth role for each source.', 'Start with one short and one long space.', 'Set decay around arrangement density.', 'Duck or automate the return for clarity.', 'Check tails across transitions and the final ending.'], es: ['Elige la profundidad de cada fuente.', 'Empieza con un espacio corto y uno largo.', 'Ajusta decay según densidad del arreglo.', 'Reduce o automatiza el retorno para claridad.', 'Comprueba colas en transiciones y final.'] },
    questions: [
      { q: { en: 'Insert or send?', es: '¿Inserto o envío?' }, a: { en: 'Sends make shared spaces and return processing easy; inserts suit special effects or sources that should be fully transformed.', es: 'Los envíos facilitan espacios compartidos y proceso del retorno; los insertos sirven para efectos especiales o transformación total.' } },
      { q: { en: 'Why does reverb push a vocal back?', es: '¿Por qué la reverb aleja la voz?' }, a: { en: 'More early reflections and wet energy reduce directness; predelay and automation can restore foreground presence.', es: 'Más reflexiones tempranas y señal wet reducen cercanía; predelay y automatización pueden devolver presencia.' } },
    ], keywords: { en: ['reverb delay mixing guide', 'create depth in mix', 'vocal reverb clarity'], es: ['guía reverb delay', 'profundidad en mezcla', 'reverb vocal clara'] }, cluster: 'engineering',
  },
  {
    slug: 'grabar-voz-home-studio',
    title: { en: 'How to Record Vocals in a Home Studio', es: 'Cómo grabar voz en un home studio' },
    summary: { en: 'Choose a quiet position, control reflections, set gain safely and help the singer deliver consistent, expressive takes.', es: 'Elige una posición silenciosa, controla reflexiones, ajusta ganancia con margen y ayuda al cantante a lograr tomas expresivas.' },
    diagnosis: { en: 'Room position and performance usually matter more than microphone price. Corners, bare parallel walls and noisy computers become obvious after compression.', es: 'La posición en la sala y la interpretación suelen importar más que el precio del micrófono. Esquinas, paredes desnudas y computadores ruidosos se revelan al comprimir.' },
    principles: { en: ['Put absorption behind and around the singer where reflections originate.', 'Use a pop filter and consistent mouth-to-mic distance.', 'Record healthy peaks without approaching clipping.', 'Build a comfortable headphone mix with low latency.'], es: ['Ubica absorción detrás y alrededor del cantante donde nacen reflexiones.', 'Usa antipop y distancia constante.', 'Graba picos saludables sin acercarte al clipping.', 'Crea una mezcla cómoda de audífonos con baja latencia.'] },
    workflow: { en: ['Test several room positions.', 'Choose mic pattern and angle for voice and room.', 'Set input gain on the loudest passage.', 'Record full takes before punching details.', 'Label, back up and document the session.'], es: ['Prueba varias posiciones de sala.', 'Elige patrón y ángulo según voz y sala.', 'Ajusta ganancia con el fragmento más fuerte.', 'Graba tomas completas antes de reparar detalles.', 'Etiqueta, respalda y documenta la sesión.'] },
    questions: [
      { q: { en: 'Condenser or dynamic microphone?', es: '¿Micrófono condensador o dinámico?' }, a: { en: 'Choose the mic that suits voice, room and working level. A dynamic can be useful in difficult rooms; a condenser can capture more detail and room.', es: 'Elige según voz, sala y nivel de trabajo. Un dinámico puede ayudar en salas difíciles; un condensador capta más detalle y sala.' } },
      { q: { en: 'Should I record with compression?', es: '¿Debo grabar con compresión?' }, a: { en: 'Monitor through it if helpful, but print only gentle processing when you understand the irreversible risk.', es: 'Monitorea con ella si ayuda, pero imprime solo proceso suave cuando entiendas el riesgo irreversible.' } },
    ], keywords: { en: ['record vocals home studio', 'vocal microphone placement', 'home vocal recording'], es: ['grabar voz home studio', 'posición micrófono vocal', 'grabación vocal en casa'] }, cluster: 'voice', sources: [shureVocals, shureMic],
  },
  {
    slug: 'editar-voces-comping-respiraciones',
    title: { en: 'Vocal Editing: Comping, Breaths and Transparent Timing', es: 'Edición vocal: comping, respiraciones y timing transparente' },
    summary: { en: 'Assemble expressive takes, create invisible transitions and control breaths and timing without erasing the singer’s identity.', es: 'Une tomas expresivas, crea transiciones invisibles y controla respiraciones y tiempo sin borrar la identidad del cantante.' },
    diagnosis: { en: 'A technically perfect syllable can weaken a phrase if its emotion and room tone do not match. Comp in musical units and audition transitions before microscopic cleanup.', es: 'Una sílaba técnicamente perfecta puede debilitar una frase si emoción y room tone no coinciden. Haz comping en unidades musicales y escucha transiciones antes de limpiar microscópicamente.' },
    principles: { en: ['Prioritize complete emotional phrases.', 'Crossfade on stable vowels or quiet boundaries.', 'Reduce breaths selectively instead of deleting all of them.', 'Align doubles to the lead while preserving width and energy.'], es: ['Prioriza frases emocionales completas.', 'Haz crossfade en vocales estables o límites silenciosos.', 'Reduce respiraciones selectivamente en vez de borrarlas.', 'Alinea dobles con la voz principal conservando amplitud y energía.'] },
    workflow: { en: ['Create a take map and mark strongest phrases.', 'Assemble the comp without processing.', 'Repair clicks, tone jumps and word endings.', 'Adjust distracting timing in context.', 'Commit a clean edit and preserve originals.'], es: ['Crea un mapa de tomas y marca frases fuertes.', 'Arma el comp sin procesar.', 'Corrige clicks, saltos de tono y finales de palabra.', 'Ajusta timing que distraiga dentro del contexto.', 'Consolida edición limpia y conserva originales.'] },
    questions: [
      { q: { en: 'Should every breath remain?', es: '¿Deben quedar todas las respiraciones?' }, a: { en: 'Keep breaths that support phrasing; lower or shorten those that distract or trigger dynamics processing.', es: 'Conserva las que sostienen el fraseo; baja o acorta las que distraen o disparan el proceso dinámico.' } },
      { q: { en: 'How tight should vocal doubles be?', es: '¿Qué tan ajustados deben quedar los dobles?' }, a: { en: 'Tighter consonants improve clarity, while some vowel and ending variation can preserve size and humanity.', es: 'Consonantes ajustadas mejoran claridad; cierta variación de vocales y finales conserva tamaño y humanidad.' } },
    ], keywords: { en: ['vocal editing comping', 'edit vocal breaths', 'vocal timing correction'], es: ['edición vocal comping', 'editar respiraciones voz', 'corregir timing vocal'] }, cluster: 'voice',
  },
  {
    slug: 'correccion-afinacion-vocal-natural',
    title: { en: 'Natural Vocal Pitch Correction Without Losing Expression', es: 'Corrección de afinación vocal natural sin perder expresión' },
    summary: { en: 'Correct notes in musical context while preserving transitions, vibrato, formants and intentional pitch movement.', es: 'Corrige notas dentro del contexto musical conservando transiciones, vibrato, formantes y movimientos intencionales.' },
    diagnosis: { en: 'Pitch has a center, transition and motion. Forcing every part of a note to the grid creates robotic scoops and unstable formants even when the tuner says it is perfect.', es: 'La afinación tiene centro, transición y movimiento. Forzar toda la nota a la rejilla crea portamentos robóticos y formantes inestables aunque el afinador marque perfección.' },
    principles: { en: ['Confirm key and harmonic changes before editing.', 'Correct sustained centers more than expressive transitions.', 'Preserve natural vibrato unless it is the problem.', 'Compare with the full harmony, not solo.'], es: ['Confirma tonalidad y cambios armónicos antes de editar.', 'Corrige más los centros sostenidos que las transiciones expresivas.', 'Conserva vibrato natural salvo que sea el problema.', 'Compara con toda la armonía, no en solo.'] },
    workflow: { en: ['Comp and clean the vocal first.', 'Map the melody and intended blue notes.', 'Correct only audible distractions.', 'Check formants, consonants and phrase momentum.', 'Render a tuned copy while preserving the edit.'], es: ['Haz comping y limpieza primero.', 'Mapea melodía y notas expresivas.', 'Corrige solo distracciones audibles.', 'Comprueba formantes, consonantes e impulso de frase.', 'Renderiza una copia afinada conservando la edición.'] },
    questions: [
      { q: { en: 'Should retune speed be as fast as possible?', es: '¿El retune speed debe ser lo más rápido posible?' }, a: { en: 'Only for a deliberate hard-tuned effect. Natural correction needs enough time for transitions and vibrato.', es: 'Solo para un efecto intencional. La corrección natural necesita tiempo para transiciones y vibrato.' } },
      { q: { en: 'Can tuning fix a weak performance?', es: '¿Afinar corrige una mala interpretación?' }, a: { en: 'It can correct pitch, not emotion, diction, tone, timing or microphone technique. Re-record when the performance is the issue.', es: 'Corrige altura, no emoción, dicción, timbre, tiempo ni técnica de micrófono. Regraba si el problema es interpretativo.' } },
    ], keywords: { en: ['natural vocal pitch correction', 'tune vocals naturally', 'preserve vocal vibrato'], es: ['afinar voz natural', 'corrección afinación vocal', 'conservar vibrato voz'] }, cluster: 'voice',
  },
  {
    slug: 'mezclar-guitarra-electrica',
    title: { en: 'How to Mix Electric Guitars With Clarity and Weight', es: 'Cómo mezclar guitarras eléctricas con claridad y peso' },
    summary: { en: 'Balance tone at the source, complementary layers, cabinet resonances, dynamics and width around the vocal and rhythm section.', es: 'Equilibra tono de origen, capas complementarias, resonancias de gabinete, dinámica y amplitud alrededor de voz y base rítmica.' },
    diagnosis: { en: 'Distorted guitars already contain compression and dense harmonics. Adding more gain often makes them smaller in a mix by removing pick definition and occupying every midrange slot.', es: 'Las guitarras distorsionadas ya contienen compresión y armónicos densos. Más ganancia suele hacerlas pequeñas al borrar ataque y ocupar todo el rango medio.' },
    principles: { en: ['Use less distortion when layering parts.', 'Edit double tracks without making them identical.', 'Control cabinet fizz in context, not from a fixed frequency.', 'Choose which guitar owns the center in each section.'], es: ['Usa menos distorsión cuando apiles partes.', 'Edita dobles sin volverlos idénticos.', 'Controla fizz del gabinete en contexto, no con frecuencia fija.', 'Decide qué guitarra ocupa el centro por sección.'] },
    workflow: { en: ['Set amp and cabinet tone against drums and bass.', 'Build a static level and pan balance.', 'Remove only unnecessary lows and harsh resonances.', 'Use automation for riffs and transitions.', 'Check mono and small-speaker midrange.'], es: ['Ajusta amplificador y gabinete contra batería y bajo.', 'Construye balance estático de nivel y panorama.', 'Retira solo graves innecesarios y resonancias agresivas.', 'Automatiza riffs y transiciones.', 'Comprueba mono y medios en altavoz pequeño.'] },
    questions: [
      { q: { en: 'Should rhythm guitars be hard-panned?', es: '¿Las guitarras rítmicas deben ir totalmente abiertas?' }, a: { en: 'It is one useful arrangement, not a rule. Mono compatibility, number of takes and center activity determine the best width.', es: 'Es un arreglo útil, no una regla. Compatibilidad mono, número de tomas y centro determinan la amplitud.' } },
      { q: { en: 'Why do guitars sound thin in the mix?', es: '¿Por qué las guitarras suenan delgadas en mezcla?' }, a: { en: 'Excess gain, phase differences, over-filtering or competition with bass and cymbals can all reduce perceived weight.', es: 'Exceso de gain, diferencias de fase, filtrado excesivo o competencia con bajo y platos reducen el peso percibido.' } },
    ], keywords: { en: ['mix electric guitars', 'guitar mixing guide', 'distorted guitar EQ'], es: ['mezclar guitarra eléctrica', 'guía mezcla guitarras', 'EQ guitarra distorsionada'] }, cluster: 'instruments',
  },
  {
    slug: 'mezclar-piano-y-teclados',
    title: { en: 'How to Mix Piano and Keyboards in Dense Arrangements', es: 'Cómo mezclar piano y teclados en arreglos densos' },
    summary: { en: 'Give piano, electric keys and synths a defined register, depth and stereo role without masking vocals, guitars or bass.', es: 'Da a piano, teclas eléctricas y sintetizadores un registro, profundidad y rol estéreo definidos sin ocultar voz, guitarras o bajo.' },
    diagnosis: { en: 'Keyboard patches often sound impressive alone because they fill the spectrum and stereo field. In an arrangement, that completeness competes with almost everything.', es: 'Los patches de teclado impresionan solos porque llenan espectro y estéreo. En un arreglo, esa plenitud compite con casi todo.' },
    principles: { en: ['Edit voicings before carving extreme EQ.', 'Automate patch width and level by section.', 'Protect vocal intelligibility in the central midrange.', 'Manage sustain tails and low-register buildup.'], es: ['Edita voicings antes de ecualizar agresivamente.', 'Automatiza amplitud y nivel por sección.', 'Protege inteligibilidad vocal en medios centrales.', 'Controla colas de sustain y acumulación grave.'] },
    workflow: { en: ['Choose the keyboard’s musical role.', 'Narrow or simplify the source patch if needed.', 'Set level against the lead element.', 'Shape competing ranges with small moves.', 'Automate fills, pedal noise and reverb tails.'], es: ['Define el rol musical del teclado.', 'Estrecha o simplifica el patch si hace falta.', 'Ajusta nivel contra el elemento principal.', 'Moldea zonas competidoras con movimientos pequeños.', 'Automatiza fills, ruido de pedal y colas.'] },
    questions: [
      { q: { en: 'Should piano remain full stereo?', es: '¿El piano debe quedar estéreo completo?' }, a: { en: 'Not necessarily. Narrowing or rebalancing channels can create a more believable position and reduce phase issues.', es: 'No necesariamente. Estrechar o rebalancear canales crea una posición creíble y reduce problemas de fase.' } },
      { q: { en: 'How do piano and vocal share the mids?', es: '¿Cómo comparten medios el piano y la voz?' }, a: { en: 'Use arrangement, octave, dynamics and automation first, then apply complementary EQ only where the conflict remains.', es: 'Usa arreglo, octava, dinámica y automatización primero; después EQ complementaria donde persista el conflicto.' } },
    ], keywords: { en: ['mix piano keyboards', 'piano EQ vocal', 'synth mixing guide'], es: ['mezclar piano teclados', 'EQ piano voz', 'mezcla sintetizadores'] }, cluster: 'instruments',
  },
  {
    slug: 'mezclar-cuerdas-y-metales',
    title: { en: 'Mixing Strings and Brass: Realistic Depth and Impact', es: 'Mezcla de cuerdas y metales: profundidad e impacto realistas' },
    summary: { en: 'Balance orchestral or sampled sections using articulation, register, room perspective, dynamics and ensemble hierarchy.', es: 'Equilibra secciones orquestales o sampleadas usando articulación, registro, perspectiva de sala, dinámica y jerarquía del ensamble.' },
    diagnosis: { en: 'Orchestral realism comes from coordinated performance and perspective. Large boosts and a single long reverb cannot compensate for mismatched articulations or every section playing at maximum intensity.', es: 'El realismo orquestal nace de interpretación y perspectiva coordinadas. Grandes realces y una sola reverb larga no compensan articulaciones incompatibles ni todas las secciones al máximo.' },
    principles: { en: ['Shape expression with MIDI or performance before compression.', 'Use early reflections to place distance and tails for environment.', 'Respect register and orchestral hierarchy.', 'Control brass brightness dynamically when it becomes dominant.'], es: ['Moldea expresión con MIDI o interpretación antes de comprimir.', 'Usa reflexiones tempranas para distancia y colas para ambiente.', 'Respeta registro y jerarquía orquestal.', 'Controla brillo de metales dinámicamente cuando domine.'] },
    workflow: { en: ['Balance close, room and ambient microphones.', 'Align articulation and phrase dynamics.', 'Pan from a consistent audience or player perspective.', 'Use shared space plus selective depth sends.', 'Automate crescendos without crushing peaks.'], es: ['Equilibra micrófonos close, room y ambient.', 'Alinea articulación y dinámica de frase.', 'Panoramiza desde una perspectiva consistente.', 'Usa espacio compartido y envíos selectivos.', 'Automatiza crescendos sin aplastar picos.'] },
    questions: [
      { q: { en: 'Do orchestral samples need compression?', es: '¿Los samples orquestales necesitan compresión?' }, a: { en: 'Often less than pop sources. Use performance automation first and compression only for a specific envelope or control need.', es: 'Suelen necesitar menos que fuentes pop. Usa automatización interpretativa primero y compresión para una necesidad concreta.' } },
      { q: { en: 'How can sampled strings sound less synthetic?', es: '¿Cómo hacer menos sintéticas las cuerdas sampleadas?' }, a: { en: 'Vary articulation, timing, dynamics and voicing; realism is usually created before the mix bus.', es: 'Varía articulación, timing, dinámica y voicing; el realismo suele construirse antes del bus de mezcla.' } },
    ], keywords: { en: ['mix strings brass', 'orchestral mixing guide', 'sampled strings realism'], es: ['mezclar cuerdas metales', 'mezcla orquestal', 'cuerdas sampleadas realistas'] }, cluster: 'instruments',
  },
  {
    slug: 'mezclar-percusion-acustica-latina',
    title: { en: 'Mixing Acoustic and Latin Percussion Without Losing Groove', es: 'Mezcla de percusión acústica y latina sin perder el groove' },
    summary: { en: 'Organize transients, tuning, mic bleed, stereo position and rhythmic hierarchy across congas, timbales, shakers and hand percussion.', es: 'Organiza transitorios, afinación, bleed, posición estéreo y jerarquía rítmica entre congas, timbales, shakers y percusión menor.' },
    diagnosis: { en: 'Percussion becomes harsh when every transient is equally forward. The listener needs a rhythmic hierarchy: primary pulse, conversational answers and texture.', es: 'La percusión se vuelve agresiva cuando todos los transitorios están al frente. El oyente necesita jerarquía: pulso principal, respuestas y textura.' },
    principles: { en: ['Tune and choose parts before processing.', 'Preserve complementary mic bleed when it supports the ensemble.', 'Share the high-frequency spotlight among instruments.', 'Use automation for calls, fills and sectional energy.'], es: ['Afina y elige partes antes de procesar.', 'Conserva bleed complementario cuando sostiene el ensamble.', 'Reparte el protagonismo agudo entre instrumentos.', 'Automatiza llamadas, fills y energía de sección.'] },
    workflow: { en: ['Establish the main pulse with the rhythm section.', 'Check polarity and timing between microphones.', 'Place instruments as a believable ensemble.', 'Control only dominant resonances and peaks.', 'Automate transitions and confirm mono groove.'], es: ['Establece pulso principal con la base.', 'Comprueba polaridad y tiempo entre micrófonos.', 'Ubica instrumentos como ensamble creíble.', 'Controla solo resonancias y picos dominantes.', 'Automatiza transiciones y confirma groove en mono.'] },
    questions: [
      { q: { en: 'Should percussion be heavily quantized?', es: '¿La percusión debe cuantizarse mucho?' }, a: { en: 'Only when the style demands it. Microtiming between parts often creates the groove that strict alignment removes.', es: 'Solo si el estilo lo exige. El microtiming entre partes suele crear el groove que la alineación estricta elimina.' } },
      { q: { en: 'How do I reduce harsh shakers?', es: '¿Cómo reduzco shakers agresivos?' }, a: { en: 'Lower level first, then consider angle, transient shape, dynamic EQ or automation rather than a permanent broad cut.', es: 'Baja nivel primero; luego considera ángulo, transitorio, EQ dinámica o automatización, no un corte amplio permanente.' } },
    ], keywords: { en: ['mix Latin percussion', 'conga timbale mixing', 'acoustic percussion mix'], es: ['mezclar percusión latina', 'mezcla congas timbales', 'percusión acústica mezcla'] }, cluster: 'instruments',
  },
  {
    slug: 'editar-bateria-tiempo-y-fase',
    title: { en: 'Drum Editing: Timing, Phase and Natural Feel', es: 'Edición de batería: tiempo, fase y sensación natural' },
    summary: { en: 'Tighten a multitrack drum performance while protecting phase relationships, fills, cymbal sustain and the player’s pocket.', es: 'Ajusta una batería multipista protegiendo relaciones de fase, fills, sustain de platos y el pocket del baterista.' },
    diagnosis: { en: 'Moving close microphones independently from overheads changes phase and ambience. Edits that look aligned can sound thinner than the original performance.', es: 'Mover micrófonos cercanos independientemente de overheads cambia fase y ambiente. Ediciones que se ven alineadas pueden sonar más delgadas que la interpretación original.' },
    principles: { en: ['Edit grouped microphones together.', 'Choose a timing reference appropriate to the section.', 'Preserve intentional pushes and pulls.', 'Crossfade before transients and monitor cymbal tails.'], es: ['Edita micrófonos agrupados.', 'Elige referencia temporal adecuada a la sección.', 'Conserva anticipaciones y retrasos intencionales.', 'Haz crossfade antes de transitorios y vigila colas de platos.'] },
    workflow: { en: ['Create a protected playlist of the original.', 'Map downbeats and problem moments.', 'Move the smallest useful musical regions.', 'Check polarity and low-end weight after edits.', 'Audition fills and transitions without the grid.'], es: ['Crea playlist protegida del original.', 'Mapea downbeats y momentos problemáticos.', 'Mueve las regiones musicales mínimas.', 'Comprueba polaridad y peso grave tras editar.', 'Escucha fills y transiciones sin mirar la rejilla.'] },
    questions: [
      { q: { en: 'Which drum track should drive the edit?', es: '¿Qué pista debe guiar la edición?' }, a: { en: 'Use the musical anchor—often kick, snare or overhead picture—then move all phase-related microphones together.', es: 'Usa el ancla musical —bombo, caja o imagen de overheads— y mueve juntos los micrófonos relacionados.' } },
      { q: { en: 'Should every hit land on the grid?', es: '¿Cada golpe debe caer en la rejilla?' }, a: { en: 'No. Correct inconsistency that distracts; keep stable microtiming that defines the player and style.', es: 'No. Corrige inconsistencias que distraen; conserva microtiming estable que define intérprete y estilo.' } },
    ], keywords: { en: ['edit drums phase timing', 'multitrack drum editing', 'natural drum quantization'], es: ['editar batería fase tiempo', 'edición batería multipista', 'cuantizar batería natural'] }, cluster: 'instruments',
  },
  {
    slug: 'microfonos-patrones-polares-colocacion',
    title: { en: 'Microphones: Polar Patterns, Placement and Room Sound', es: 'Micrófonos: patrones polares, colocación y sonido de sala' },
    summary: { en: 'Choose and place microphones by source, room, rejection and desired perspective rather than price or brand reputation.', es: 'Elige y coloca micrófonos según fuente, sala, rechazo y perspectiva deseada, no por precio o reputación de marca.' },
    diagnosis: { en: 'Moving a microphone a few centimeters can change direct sound, reflections, proximity effect and phase more than changing preamps. Placement is the first EQ.', es: 'Mover un micrófono pocos centímetros cambia sonido directo, reflexiones, efecto proximidad y fase más que cambiar preamplificadores. La colocación es la primera EQ.' },
    principles: { en: ['Aim the null toward unwanted sound.', 'Balance direct sound against room contribution.', 'Use proximity effect deliberately with directional patterns.', 'Check phase when combining multiple microphones.'], es: ['Apunta el nulo hacia el sonido no deseado.', 'Equilibra sonido directo y contribución de sala.', 'Usa efecto proximidad de forma deliberada.', 'Comprueba fase al combinar micrófonos.'] },
    workflow: { en: ['Listen to the source around the room.', 'Choose pattern for pickup and rejection.', 'Place by ear before reaching for EQ.', 'Record a labeled comparison at matched gain.', 'Lock the position and document distance and angle.'], es: ['Escucha la fuente en distintos puntos.', 'Elige patrón por captación y rechazo.', 'Coloca de oído antes de ecualizar.', 'Graba comparación etiquetada a igual ganancia.', 'Fija y documenta distancia y ángulo.'] },
    questions: [
      { q: { en: 'What is the best microphone?', es: '¿Cuál es el mejor micrófono?' }, a: { en: 'The one whose pattern, sensitivity, tone and handling suit the source, room and performance at hand.', es: 'El cuyo patrón, sensibilidad, tono y manejo se adapten a la fuente, sala e interpretación.' } },
      { q: { en: 'Does an omnidirectional mic capture everything equally?', es: '¿Un omnidireccional capta todo por igual?' }, a: { en: 'Its polar response is broadly nondirectional, but room boundaries, body design and high frequencies still influence capture.', es: 'Su respuesta es ampliamente no direccional, pero límites de sala, diseño y agudos influyen en la captura.' } },
    ], keywords: { en: ['microphone polar patterns', 'microphone placement guide', 'recording room sound'], es: ['patrones polares micrófono', 'colocación micrófonos', 'grabar sonido sala'] }, cluster: 'instruments', sources: [shureMic],
  },
];

const aiPillars: Pillar[] = [
  {
    slug: 'que-es-musica-generada-ia',
    title: { en: 'What Is AI-Generated Music? A Practical Guide', es: '¿Qué es la música generada con IA? Guía práctica' },
    summary: { en: 'Understand generation, assistance, separation, mixing and mastering as different uses of AI—and where human decisions still determine the result.', es: 'Distingue generación, asistencia, separación, mezcla y mastering con IA, y dónde las decisiones humanas siguen definiendo el resultado.' },
    diagnosis: { en: '“AI music” is an umbrella term. A text-to-song model, a stem separator and an intelligent equalizer solve different problems and create different rights, quality and provenance questions.', es: '“Música con IA” es un término amplio. Un modelo texto-a-canción, un separador de stems y un ecualizador inteligente resuelven problemas distintos y generan preguntas distintas de derechos, calidad y procedencia.' },
    principles: { en: ['Identify which stage actually uses AI.', 'Keep human creative decisions and source records.', 'Evaluate outputs for artifacts and bias.', 'Read current terms before commercial release.'], es: ['Identifica en qué etapa se usa IA.', 'Conserva decisiones humanas y registros de fuentes.', 'Evalúa artefactos y sesgos.', 'Lee términos vigentes antes de publicar comercialmente.'] },
    workflow: { en: ['Define the creative purpose.', 'Choose generation or assistance accordingly.', 'Save prompts, versions and source files.', 'Edit, arrange and post-produce deliberately.', 'Verify rights and platform disclosure requirements.'], es: ['Define propósito creativo.', 'Elige generación o asistencia según el caso.', 'Guarda prompts, versiones y fuentes.', 'Edita, arregla y posproduce con intención.', 'Verifica derechos y requisitos de declaración.'] },
    questions: [
      { q: { en: 'Is all music made with AI fully AI-generated?', es: '¿Toda música hecha con IA es totalmente generada?' }, a: { en: 'No. AI may assist one narrow task while the composition, performance and production remain human-authored.', es: 'No. La IA puede ayudar en una tarea pequeña mientras composición, interpretación y producción siguen siendo humanas.' } },
      { q: { en: 'Does MixingMusic generate songs?', es: '¿MixingMusic genera canciones?' }, a: { en: 'MixingMusic focuses on post-production: balancing stems and mastering audio supplied by the user.', es: 'MixingMusic se enfoca en posproducción: balancear stems y masterizar audio suministrado por el usuario.' } },
    ], keywords: { en: ['what is AI music', 'AI-generated music explained', 'AI music production'], es: ['qué es música IA', 'música generada con IA', 'producción musical IA'] }, cluster: 'ai', sources: [googleAi, copyrightAi],
  },
  {
    slug: 'como-crear-cancion-con-ia-flujo-humano',
    title: { en: 'How to Create an AI-Assisted Song With a Human Workflow', es: 'Cómo crear una canción con IA mediante un flujo humano' },
    summary: { en: 'Move from intention and prompting to selection, rewriting, arrangement, recording, mixing and documentation without surrendering authorship decisions.', es: 'Pasa de intención y prompt a selección, reescritura, arreglo, grabación, mezcla y documentación sin ceder decisiones autorales.' },
    diagnosis: { en: 'The first generated output is a draft, not a finished record. Distinctive results come from selection, revision, performance, structure and production choices that can be explained and repeated.', es: 'El primer resultado generado es un borrador, no un disco terminado. Los resultados distintivos nacen de selección, revisión, interpretación, estructura y decisiones que pueden explicarse y repetirse.' },
    principles: { en: ['Begin with a musical brief, not an artist name.', 'Generate alternatives for sections rather than accepting one pass.', 'Rewrite lyrics and structure with human intent.', 'Document contributions and licenses.'], es: ['Empieza con un brief musical, no con nombre de artista.', 'Genera alternativas por secciones.', 'Reescribe letra y estructura con intención humana.', 'Documenta contribuciones y licencias.'] },
    workflow: { en: ['Write theme, audience, emotion and constraints.', 'Prompt for original musical attributes.', 'Select and reconstruct the strongest sections.', 'Record or edit meaningful human contributions.', 'Export lossless stems, mix, master and archive evidence.'], es: ['Escribe tema, audiencia, emoción y límites.', 'Pide atributos musicales originales.', 'Selecciona y reconstruye mejores secciones.', 'Graba o edita aportes humanos significativos.', 'Exporta stems lossless, mezcla, masteriza y archiva evidencia.'] },
    questions: [
      { q: { en: 'Should I name an artist in the prompt?', es: '¿Debo nombrar un artista en el prompt?' }, a: { en: 'Describe tempo, instrumentation, form, texture and mood instead. That gives control without requesting imitation.', es: 'Describe tempo, instrumentación, forma, textura y ánimo. Da control sin pedir imitación.' } },
      { q: { en: 'Why keep project records?', es: '¿Por qué guardar registros del proyecto?' }, a: { en: 'They help document human decisions, permissions, versions and the origin of material used in a release.', es: 'Ayudan a documentar decisiones humanas, permisos, versiones y origen del material publicado.' } },
    ], keywords: { en: ['how to make AI music', 'AI song workflow', 'human AI music production'], es: ['cómo crear música con IA', 'flujo canción IA', 'producción musical humana IA'] }, cluster: 'ai', sources: [copyrightAi],
  },
  {
    slug: 'herramientas-musica-ia-como-elegir',
    title: { en: 'How to Choose AI Music Tools for Your Workflow', es: 'Cómo elegir herramientas de música con IA para tu flujo' },
    summary: { en: 'Compare AI tools by task, input, export quality, control, rights, privacy and repeatability instead of choosing from hype.', es: 'Compara herramientas por tarea, entrada, calidad de exportación, control, derechos, privacidad y repetibilidad, no por publicidad.' },
    diagnosis: { en: 'A strong generator may be a poor stem editor; a good mastering service may not compose. Start from the bottleneck in your workflow and the file you need to deliver.', es: 'Un buen generador puede ser mal editor de stems; un servicio de mastering no necesariamente compone. Parte del cuello de botella y del archivo que necesitas entregar.' },
    principles: { en: ['Define the task before comparing products.', 'Test export resolution and editability.', 'Read licensing and data-use terms.', 'Measure the time from idea to usable file.'], es: ['Define la tarea antes de comparar productos.', 'Prueba resolución y capacidad de edición.', 'Lee licencias y uso de datos.', 'Mide tiempo desde idea hasta archivo útil.'] },
    workflow: { en: ['List required inputs and outputs.', 'Shortlist tools by function.', 'Run the same controlled test.', 'Inspect artifacts, controls and metadata.', 'Record cost, rights and failure modes.'], es: ['Lista entradas y salidas necesarias.', 'Filtra herramientas por función.', 'Ejecuta la misma prueba controlada.', 'Inspecciona artefactos, controles y metadatos.', 'Registra costo, derechos y fallos.'] },
    questions: [
      { q: { en: 'Is the most popular tool always best?', es: '¿La herramienta más popular siempre es mejor?' }, a: { en: 'No. Fit depends on task, language, genre, control, rights, exports and the rest of your production chain.', es: 'No. Depende de tarea, idioma, género, control, derechos, exportación y cadena de producción.' } },
      { q: { en: 'Free or paid?', es: '¿Gratis o de pago?' }, a: { en: 'Test with free access when available, but verify whether commercial rights and lossless exports require a paid plan.', es: 'Prueba gratis cuando exista, pero verifica si derechos comerciales y exportación lossless requieren pago.' } },
    ], keywords: { en: ['AI music tools', 'choose AI music platform', 'AI music software guide'], es: ['herramientas música IA', 'elegir plataforma música IA', 'software música IA'] }, cluster: 'ai',
  },
  {
    slug: 'voces-ia-consentimiento-identidad',
    title: { en: 'AI Voices: Consent, Identity and Responsible Production', es: 'Voces con IA: consentimiento, identidad y producción responsable' },
    summary: { en: 'Use synthetic or transformed voices without impersonation by documenting consent, scope, credits, revisions and release permissions.', es: 'Usa voces sintéticas o transformadas sin suplantación documentando consentimiento, alcance, créditos, revisiones y permisos.' },
    diagnosis: { en: 'A convincing voice can affect identity, publicity and trust even when no recording was copied directly. Technical possibility is not the same as permission.', es: 'Una voz convincente puede afectar identidad, imagen y confianza aunque no se copie directamente una grabación. Posibilidad técnica no equivale a permiso.' },
    principles: { en: ['Use voices you own or have explicit permission to use.', 'Define media, territory, duration and revocation terms.', 'Avoid misleading attribution or impersonation.', 'Keep consent and model-source records.'], es: ['Usa voces propias o con permiso explícito.', 'Define medios, territorio, duración y revocación.', 'Evita atribución engañosa o suplantación.', 'Guarda consentimiento y origen del modelo.'] },
    workflow: { en: ['Identify every person whose voice or identity may be implicated.', 'Obtain written authorization before training or release.', 'Generate and edit within the approved scope.', 'Review lyrics and context with the performer.', 'Credit and disclose where policy or context requires.'], es: ['Identifica a toda persona cuya voz o identidad esté implicada.', 'Obtén autorización escrita antes de entrenar o publicar.', 'Genera y edita dentro del alcance aprobado.', 'Revisa letra y contexto con el intérprete.', 'Acredita y declara cuando política o contexto lo exijan.'] },
    questions: [
      { q: { en: 'Can I clone a famous singer for a demo?', es: '¿Puedo clonar a un cantante famoso para un demo?' }, a: { en: 'Do not assume that a private demo removes identity, contract or platform risks. Use a neutral licensed voice or your own.', es: 'No asumas que un demo privado elimina riesgos de identidad, contrato o plataforma. Usa voz neutral licenciada o propia.' } },
      { q: { en: 'Does mixing make an unauthorized voice acceptable?', es: '¿La mezcla vuelve aceptable una voz no autorizada?' }, a: { en: 'No. Processing changes sound, not the underlying permission or representation issue.', es: 'No. El proceso cambia sonido, no el problema de permiso o representación.' } },
    ], keywords: { en: ['AI voice consent music', 'ethical AI vocals', 'voice cloning music rights'], es: ['consentimiento voz IA música', 'voces IA responsables', 'derechos clonación voz'] }, cluster: 'ai', sources: [copyrightAi],
  },
  {
    slug: 'stems-musica-ia-separacion',
    title: { en: 'AI Music Stems: Separation, Artifacts and Better Exports', es: 'Stems de música con IA: separación, artefactos y mejores exportaciones' },
    summary: { en: 'Understand why separated stems contain bleed and missing information, then prepare them for editing and mixing without overprocessing artifacts.', es: 'Entiende por qué los stems separados contienen bleed e información faltante y prepáralos para edición y mezcla sin exagerar artefactos.' },
    diagnosis: { en: 'Source separation estimates components from a finished mixture; it does not recover the original multitrack session. Cymbals, reverbs and overlapping harmonics are common failure areas.', es: 'La separación estima componentes desde una mezcla terminada; no recupera la sesión multipista original. Platos, reverbs y armónicos superpuestos suelen fallar.' },
    principles: { en: ['Export original stems from the generator when available.', 'Judge artifacts in the full arrangement.', 'Avoid solo-based overcleaning.', 'Keep every stem aligned and lossless.'], es: ['Exporta stems originales del generador cuando existan.', 'Evalúa artefactos en el arreglo completo.', 'Evita limpiar en exceso escuchando en solo.', 'Mantén cada stem alineado y lossless.'] },
    workflow: { en: ['Compare generated and separated exports.', 'Choose the version with least damaging artifacts.', 'Edit clicks and obvious leakage locally.', 'Balance before adding heavy processing.', 'Reconstruct and null-check against the reference where useful.'], es: ['Compara exportación generada y separada.', 'Elige la versión con artefactos menos dañinos.', 'Edita clicks y filtraciones evidentes localmente.', 'Balancea antes de procesar fuerte.', 'Reconstruye y compara con la referencia cuando sea útil.'] },
    questions: [
      { q: { en: 'Can separated stems sound identical to originals?', es: '¿Los stems separados pueden sonar idénticos a los originales?' }, a: { en: 'Usually not. They are estimates constrained by overlapping information in the stereo source.', es: 'Generalmente no. Son estimaciones limitadas por información superpuesta en la fuente estéreo.' } },
      { q: { en: 'Should I gate every stem?', es: '¿Debo poner gate a cada stem?' }, a: { en: 'No. Gating can expose pumping and remove tails; automate or repair only audible problems.', es: 'No. Puede revelar bombeo y cortar colas; automatiza o repara solo problemas audibles.' } },
    ], keywords: { en: ['AI music stems', 'stem separation artifacts', 'mix separated stems'], es: ['stems música IA', 'artefactos separación stems', 'mezclar stems separados'] }, cluster: 'ai',
  },
  {
    slug: 'mezclar-musica-generada-ia',
    title: { en: 'How to Mix AI-Generated Music Without Hiding Its Problems', es: 'Cómo mezclar música generada con IA sin ocultar sus problemas' },
    summary: { en: 'Turn a generated draft into a controlled mix by fixing arrangement, artifacts, stem balance, vocal clarity, dynamics and transitions.', es: 'Convierte un borrador generado en mezcla controlada corrigiendo arreglo, artefactos, balance de stems, claridad vocal, dinámica y transiciones.' },
    diagnosis: { en: 'Generated tracks may arrive loud, spectrally dense and already limited. Mixing cannot recover missing source information, but it can improve hierarchy when clean stems and deliberate edits are available.', es: 'Las pistas generadas pueden llegar fuertes, densas y limitadas. La mezcla no recupera información ausente, pero mejora jerarquía cuando hay stems limpios y edición deliberada.' },
    principles: { en: ['Choose the best generation before processing.', 'Edit structural problems before tonal ones.', 'Preserve headroom and avoid stacking limiters.', 'Treat artifacts locally and accept irreparable limits.'], es: ['Elige la mejor generación antes de procesar.', 'Corrige estructura antes que tono.', 'Conserva headroom y evita apilar limitadores.', 'Trata artefactos localmente y acepta límites irreparables.'] },
    workflow: { en: ['Export lossless stems and a reference.', 'Map weak transitions and repeated sections.', 'Build a new static balance.', 'Control masking, vocal focus and low end.', 'Automate energy before final mastering.'], es: ['Exporta stems lossless y referencia.', 'Mapea transiciones débiles y repeticiones.', 'Construye un nuevo balance estático.', 'Controla enmascaramiento, foco vocal y grave.', 'Automatiza energía antes del mastering.'] },
    questions: [
      { q: { en: 'Can MixingMusic remove every AI artifact?', es: '¿MixingMusic elimina todos los artefactos de IA?' }, a: { en: 'No. It can rebalance and master the supplied audio, but missing or distorted source information may require regeneration or replacement.', es: 'No. Puede balancear y masterizar lo suministrado, pero información ausente o distorsionada puede exigir regenerar o reemplazar.' } },
      { q: { en: 'Should I upload MP3 or WAV?', es: '¿Debo subir MP3 o WAV?' }, a: { en: 'Use the highest-quality lossless export available so later processing does not magnify lossy artifacts.', es: 'Usa la exportación lossless de mayor calidad para no amplificar artefactos con pérdida.' } },
    ], keywords: { en: ['mix AI-generated music', 'AI song mixing', 'improve AI music stems'], es: ['mezclar música generada IA', 'mezcla canción IA', 'mejorar stems IA'] }, cluster: 'ai',
  },
  {
    slug: 'masterizar-musica-generada-ia',
    title: { en: 'How to Master AI-Generated Music for Release', es: 'Cómo masterizar música generada con IA para publicar' },
    summary: { en: 'Prepare generated music for release by auditing artifacts, dynamics, true peak, sequence consistency and lossless delivery.', es: 'Prepara música generada para publicación auditando artefactos, dinámica, true peak, consistencia de secuencia y entrega lossless.' },
    diagnosis: { en: 'Mastering is final quality control, not artifact camouflage. A distorted vocal, unstable ambience or broken transition should return to generation, editing or mixing before limiting.', es: 'El mastering es control final, no camuflaje de artefactos. Voz distorsionada, ambiente inestable o transición rota deben volver a generación, edición o mezcla antes de limitar.' },
    principles: { en: ['Reject or repair flawed sources before loudness work.', 'Do not assume a generated file has safe true peaks.', 'Use references at matched playback level.', 'Keep an untouched high-resolution archive.'], es: ['Rechaza o repara fuentes defectuosas antes del loudness.', 'No asumas que un archivo generado tiene true peaks seguros.', 'Usa referencias al mismo nivel.', 'Conserva archivo original de alta resolución.'] },
    workflow: { en: ['Run technical and musical quality control.', 'Correct broad tonal balance conservatively.', 'Shape dynamics without exposing artifacts.', 'Set release level and true-peak margin.', 'Test encoding and export lossless deliverables.'], es: ['Haz control técnico y musical.', 'Corrige balance tonal amplio con prudencia.', 'Moldea dinámica sin revelar artefactos.', 'Define nivel y margen true peak.', 'Prueba codificación y exporta lossless.'] },
    questions: [
      { q: { en: 'Does mastering prove the music is human-made?', es: '¿Masterizar demuestra que la música es humana?' }, a: { en: 'No. Mastering changes presentation, not origin, provenance or authorship.', es: 'No. Cambia presentación, no origen, procedencia ni autoría.' } },
      { q: { en: 'Will mastering guarantee platform acceptance?', es: '¿El mastering garantiza aceptación en plataformas?' }, a: { en: 'No. Technical quality is only one factor; distributors and services apply their own current rights and content policies.', es: 'No. La calidad técnica es solo un factor; distribuidores y servicios aplican políticas propias.' } },
    ], keywords: { en: ['master AI-generated music', 'AI music mastering', 'release AI song'], es: ['masterizar música generada IA', 'mastering música IA', 'publicar canción IA'] }, cluster: 'ai', sources: [spotifyLoudness, spotifyFiles],
  },
  {
    slug: 'derechos-distribucion-musica-ia',
    title: { en: 'AI Music Rights and Distribution: A Release Checklist', es: 'Derechos y distribución de música con IA: lista de publicación' },
    summary: { en: 'Check tool licenses, human contributions, samples, voices, collaborators, platform disclosure and evidence before distributing AI-assisted music.', es: 'Revisa licencias, aportes humanos, samples, voces, colaboradores, declaraciones y evidencia antes de distribuir música asistida por IA.' },
    diagnosis: { en: 'Permission to use a service is not automatically copyright ownership, sample clearance or approval from every distributor. Rights depend on inputs, plan terms, human authorship, jurisdiction and release context.', es: 'Permiso para usar un servicio no equivale automáticamente a titularidad, autorización de samples o aprobación de distribuidores. Depende de entradas, plan, autoría humana, jurisdicción y contexto.' },
    principles: { en: ['Save the terms that applied when content was created.', 'Clear samples, lyrics and identifiable voices separately.', 'Document human-authored expression and collaborators.', 'Review each distributor’s current rules before upload.'], es: ['Guarda los términos vigentes al crear.', 'Aclara samples, letras y voces identificables por separado.', 'Documenta expresión humana y colaboradores.', 'Revisa reglas actuales de cada distribuidor.'] },
    workflow: { en: ['Create a source and rights ledger.', 'Verify the account plan and commercial license.', 'Obtain releases from contributors and voice owners.', 'Prepare required AI disclosures and credits.', 'Archive contracts, prompts, sessions and final files.'], es: ['Crea registro de fuentes y derechos.', 'Verifica plan y licencia comercial.', 'Obtén autorizaciones de colaboradores y voces.', 'Prepara declaraciones y créditos.', 'Archiva contratos, prompts, sesiones y finales.'] },
    questions: [
      { q: { en: 'Is AI music automatically copyright-free?', es: '¿La música IA queda automáticamente sin copyright?' }, a: { en: 'No. Inputs, human-authored elements, contracts and jurisdiction can produce different answers. Obtain legal advice for consequential releases.', es: 'No. Entradas, aportes humanos, contratos y jurisdicción producen respuestas distintas. Busca asesoría legal en lanzamientos importantes.' } },
      { q: { en: 'Can I distribute a free-plan generation?', es: '¿Puedo distribuir una generación de plan gratis?' }, a: { en: 'Do not assume so. Check the exact service terms and plan that applied when the output was generated.', es: 'No lo asumas. Revisa términos exactos y plan vigente cuando se generó.' } },
    ], keywords: { en: ['AI music copyright', 'distribute AI music', 'AI song commercial rights'], es: ['derechos música IA', 'distribuir música IA', 'uso comercial canción IA'] }, cluster: 'ai', sources: [copyrightAi],
  },
  {
    slug: 'detectar-musica-ia-marcas-procedencia',
    title: { en: 'AI Music Detection, Watermarks and Content Provenance', es: 'Detección de música IA, marcas de agua y procedencia' },
    summary: { en: 'Understand metadata, fingerprints, embedded watermarks and provenance records—and why ordinary mixing is not a reliable or appropriate removal method.', es: 'Entiende metadatos, huellas, marcas integradas y registros de procedencia, y por qué mezclar no es un método confiable ni apropiado para eliminarlas.' },
    diagnosis: { en: 'Detection is not one universal signal. Services may use metadata, acoustic fingerprints, embedded watermarks, account records or model-specific classifiers, each with different error rates and resilience.', es: 'La detección no es una señal universal. Los servicios pueden usar metadatos, huellas acústicas, marcas integradas, registros de cuenta o clasificadores, cada uno con errores y resistencia distintos.' },
    principles: { en: ['Preserve legitimate provenance and project records.', 'Do not market normal processing as watermark removal.', 'Expect resampling or mastering to be unreliable against robust signals.', 'Disclose origin when a platform or context requires it.'], es: ['Conserva procedencia legítima y registros.', 'No promociones proceso normal como eliminación de marcas.', 'No confíes en remuestreo o mastering contra señales robustas.', 'Declara origen cuando plataforma o contexto lo exijan.'] },
    workflow: { en: ['Inventory metadata and source documentation.', 'Keep the original generated files.', 'Post-produce for sound quality only.', 'Do not attempt to evade provenance systems.', 'Provide accurate credits and disclosures at release.'], es: ['Inventaría metadatos y documentos de origen.', 'Conserva archivos generados originales.', 'Posproduce solo por calidad sonora.', 'No intentes evadir sistemas de procedencia.', 'Entrega créditos y declaraciones precisas.'] },
    questions: [
      { q: { en: 'Can mastering remove an AI watermark?', es: '¿El mastering puede borrar una marca de IA?' }, a: { en: 'It may alter audio, but cannot guarantee removal of an embedded signal. Designing processing to evade detection is risky and not a MixingMusic feature.', es: 'Puede alterar audio, pero no garantiza borrar una señal integrada. Diseñar proceso para evadir detección es riesgoso y no es una función de MixingMusic.' } },
      { q: { en: 'Does detection prove infringement?', es: '¿La detección demuestra infracción?' }, a: { en: 'No. Origin, permission and infringement are different questions; detectors can also make mistakes.', es: 'No. Origen, permiso e infracción son preguntas distintas; los detectores también pueden equivocarse.' } },
    ], keywords: { en: ['AI music detection', 'AI audio watermark', 'music provenance'], es: ['detectar música IA', 'marca de agua audio IA', 'procedencia música'] }, cluster: 'ai',
  },
];

const bullets = (items: string[]) => items.map(item => `- ${item}`).join('\n');
const numbered = (items: string[]) => items.map((item, index) => `${index + 1}. ${item}`).join('\n');
const faqs = (items: Pillar['questions'], lang: 'en' | 'es') => items.map(item => `### ${item.q[lang]}\n\n${item.a[lang]}`).join('\n\n');

function articleContent(pillar: Pillar, lang: 'en' | 'es') {
  const en = lang === 'en';
  const related = (pillar.cluster === 'ai'
    ? [['/blog/que-es-musica-generada-ia', en ? 'What AI-generated music is' : 'Qué es la música generada con IA'], ['/blog/mezclar-musica-generada-ia', en ? 'Mixing AI-generated music' : 'Mezclar música generada con IA'], ['/blog/masterizar-musica-generada-ia', en ? 'Mastering AI-generated music' : 'Masterizar música generada con IA']]
    : [['/blog/como-mezclar-una-cancion-paso-a-paso', en ? 'How to mix a song step by step' : 'Cómo mezclar una canción paso a paso'], ['/blog/lufs-mastering-streaming-guia', en ? 'LUFS and streaming mastering' : 'LUFS y mastering para streaming'], ['/blog/exportar-stems-y-premaster-guia', en ? 'Export stems and premaster' : 'Exportar stems y premaster']])
    .filter(([href]) => !href.endsWith(pillar.slug));
  const sources = pillar.sources?.length ? `\n\n## ${en ? 'Sources and further reading' : 'Fuentes y lectura adicional'}\n\n${pillar.sources.map(source => `- [${source.label}](${source.url})`).join('\n')}` : '';
  const frameworkNote = en
    ? 'These are decision frameworks, not fixed presets. Source quality, arrangement, performance and monitoring determine how far any process should go. Always compare at matched loudness and preserve an untouched version of the source.'
    : 'Estos son marcos de decisión, no presets fijos. La calidad de origen, el arreglo, la interpretación y el monitoreo determinan hasta dónde procesar. Compara siempre a igual volumen y conserva una versión intacta.';
  return `# ${pillar.title[lang]}

${pillar.summary[lang]}

## ${en ? 'Start with the real problem' : 'Empieza por el problema real'}

${pillar.diagnosis[lang]}

## ${en ? 'Principles that transfer between projects' : 'Principios que funcionan entre proyectos'}

${bullets(pillar.principles[lang])}

${frameworkNote}

## ${en ? 'Step-by-step workflow' : 'Flujo paso a paso'}

${numbered(pillar.workflow[lang])}

## ${en ? 'How MixingMusic fits' : 'Cómo encaja MixingMusic'}

${en
    ? 'MixingMusic can help balance user-supplied stems and master a finished mix. It does not replace source selection, permission, arrangement or critical listening. Export the cleanest lossless files available, keep a reference, and evaluate the result as one stage in a documented production workflow.'
    : 'MixingMusic puede ayudar a balancear stems suministrados por el usuario y masterizar una mezcla terminada. No reemplaza selección de fuente, permisos, arreglo ni escucha crítica. Exporta los archivos lossless más limpios, conserva una referencia y evalúa el resultado como una etapa de un flujo documentado.'}

## ${en ? 'Common questions' : 'Preguntas frecuentes'}

${faqs(pillar.questions, lang)}

## ${en ? 'Related practical guides' : 'Guías prácticas relacionadas'}

${related.map(([href, label]) => `- [${label}](${href})`).join('\n')}${sources}

${en ? '**Editorial note:** This guide is educational, avoids universal settings and is reviewed when cited platform policies change.' : '**Nota editorial:** Esta guía es educativa, evita ajustes universales y se revisa cuando cambian las políticas citadas.'}`;
}

export const knowledgePillarArticles: BlogArticle[] = [...pillars, ...aiPillars].map((pillar, index) => ({
  id: `knowledge-pillar-${index + 1}`,
  slug: pillar.slug,
  title: pillar.title.en,
  titleEs: pillar.title.es,
  excerpt: pillar.summary.en,
  excerptEs: pillar.summary.es,
  content: articleContent(pillar, 'en'),
  contentEs: articleContent(pillar, 'es'),
  category: pillar.cluster === 'ai' ? 'ai' : pillar.cluster,
  categoryName: pillar.cluster === 'ai' ? 'AI Music' : pillar.cluster === 'voice' ? 'Vocal Production' : pillar.cluster === 'instruments' ? 'Instrument Mixing' : 'Mixing and Mastering',
  categoryNameEs: pillar.cluster === 'ai' ? 'Música con IA' : pillar.cluster === 'voice' ? 'Producción vocal' : pillar.cluster === 'instruments' ? 'Mezcla de instrumentos' : 'Mezcla y mastering',
  image: '/studio-bg.png',
  author,
  publishDate: `September ${3 - Math.min(2, Math.floor(index / 10))}, 2026`,
  readTime: 8,
  tags: [pillar.cluster === 'ai' ? 'AI Music' : 'Audio Engineering', 'Mixing', 'Mastering', 'MixingMusic.AI'],
  tagsEs: [pillar.cluster === 'ai' ? 'Música con IA' : 'Ingeniería de audio', 'Mezcla', 'Mastering', 'MixingMusic.AI'],
  seoKeywords: pillar.keywords,
  metaDescription: pillar.summary.en.slice(0, 158),
  metaDescriptionEs: pillar.summary.es.slice(0, 158),
  showComparison: false,
}));
