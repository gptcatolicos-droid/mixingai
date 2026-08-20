import type { SeoLanding } from './seoLandingData';

type Tip = { title: string; text: string };
type GenreCopy = {
  name: string;
  seoName?: string;
  promise: string;
  intro: string;
  challenge: string;
  direction: string;
  recording: Tip[];
  microphones: Tip[];
  compression: Tip[];
  mixing: Tip[];
  faq: { q: string; a: string }[];
  notes: { label: string; value: string }[];
};
type GenreProfile = { slug: string; enSlug?: string; presetSlug: string; presetEnSlug?: string; es: GenreCopy; en: GenreCopy };

const genres: GenreProfile[] = [
  {
    slug: 'rock', presetSlug: 'rock',
    es: {
      name: 'Rock', promise: 'cómo grabar, mezclar y masterizar una banda con pegada.',
      intro: 'Una producción de rock necesita impacto, pero también separación entre batería, bajo, guitarras y voz. La energía nace de la interpretación y de una captura que conserve transitorios.',
      challenge: 'Las capas de guitarra, platos brillantes y graves densos pueden competir en el mismo espacio y convertir fuerza en fatiga.',
      direction: 'Construye primero la relación batería-bajo, decide el lugar de las guitarras y deja un centro estable para voz, kick, caja y bajo.',
      recording: [
        { title: 'Afina y controla la sala', text: 'Usa cuerdas recientes, revisa afinación entre tomas y coloca absorción detrás del cantante o frente a amplificadores si la habitación es pequeña.' },
        { title: 'Graba menos ganancia', text: 'Deja picos entre −18 y −10 dBFS. El carácter debe venir del amplificador y la ejecución, no del clipping del convertidor.' },
      ],
      microphones: [
        { title: 'Guitarras eléctricas', text: 'Un dinámico tipo Shure SM57 o Sennheiser e906 cerca del cono aporta ataque; un ribbon a mayor distancia puede sumar cuerpo. Verifica fase antes de combinar.' },
        { title: 'Batería y voz', text: 'Usa un dinámico de baja frecuencia tipo Beta 52A o D112 en kick, dinámicos en caja y toms, condensadores de diafragma pequeño como overheads y un SM7B o condensador de diafragma grande según la sala para voz.' },
      ],
      compression: [
        { title: 'Control sin borrar ataque', text: 'En voz o room, un compresor tipo 1176 puede controlar picos. En kick, caja o bajo, un VCA tipo dbx 160 conserva pegada si el ataque no es demasiado rápido.' },
        { title: 'Bus de mezcla', text: 'Prueba un compresor tipo SSL con ratio 2:1, ataque de 10–30 ms y solo 1–2 dB de reducción. Si la mezcla se encoge, retíralo.' },
      ],
      mixing: [
        { title: 'Haz sitio en medios', text: 'No subas todas las guitarras. Automatiza arreglos, filtra graves innecesarios y decide cuál guitarra domina en cada sección.' },
        { title: 'Mastering', text: 'Protege el golpe de batería, compara con referencias al mismo volumen y evita perseguir loudness si aparecen platos duros o graves borrosos.' },
      ],
      notes: [{ label: 'Picos al grabar', value: '−18 a −10 dBFS' }, { label: 'Bus compression', value: '1–2 dB GR' }, { label: 'Prioridad', value: 'Ataque y relación kick/bajo' }],
      faq: [
        { q: '¿Cuántas guitarras debo grabar?', a: 'Las que el arreglo necesite. Dos tomas diferentes paneadas suelen funcionar mejor que duplicar artificialmente una sola toma.' },
        { q: '¿Debo comprimir la batería al grabar?', a: 'No es obligatorio. Si no puedes monitorear con confianza, graba limpia y conserva margen para decidir después.' },
        { q: '¿Qué preset usar en MixingMusic?', a: 'Rock es el punto de partida directo. Si la mezcla ya llega procesada, compara también con Neutro.' },
      ],
    },
    en: {
      name: 'Rock', promise: 'how to record, mix and master a band with impact.',
      intro: 'A rock production needs impact and separation between drums, bass, guitars and vocals. Energy begins with the performance and a capture that preserves transients.',
      challenge: 'Layered guitars, bright cymbals and dense lows can fight for space and turn power into fatigue.',
      direction: 'Build the drum-and-bass relationship first, choose where guitars live and keep a stable center for vocal, kick, snare and bass.',
      recording: [
        { title: 'Tune and control the room', text: 'Use fresh strings, check tuning between takes and place absorption behind the singer or opposite amplifiers in a small room.' },
        { title: 'Record with less gain', text: 'Aim for peaks between −18 and −10 dBFS. Character should come from the amplifier and performance, not converter clipping.' },
      ],
      microphones: [
        { title: 'Electric guitars', text: 'A dynamic such as a Shure SM57 or Sennheiser e906 near the cone adds attack; a ribbon farther back can add body. Check phase before blending.' },
        { title: 'Drums and vocals', text: 'Try a low-frequency dynamic such as a Beta 52A or D112 on kick, dynamics on snare and toms, small-diaphragm condensers overhead, and an SM7B or large-diaphragm condenser for vocals depending on the room.' },
      ],
      compression: [
        { title: 'Control without erasing attack', text: 'An 1176-style compressor can catch vocal or room peaks. A dbx 160-style VCA can retain punch on kick, snare or bass when attack is not too fast.' },
        { title: 'Mix bus', text: 'Try an SSL-style compressor at 2:1, 10–30 ms attack and only 1–2 dB of gain reduction. Remove it if the mix becomes smaller.' },
      ],
      mixing: [
        { title: 'Create midrange space', text: 'Do not simply turn up every guitar. Automate the arrangement, filter unnecessary lows and decide which guitar leads each section.' },
        { title: 'Mastering', text: 'Protect drum impact, compare references at matched level and stop chasing loudness if cymbals turn hard or lows become blurry.' },
      ],
      notes: [{ label: 'Recording peaks', value: '−18 to −10 dBFS' }, { label: 'Bus compression', value: '1–2 dB GR' }, { label: 'Priority', value: 'Attack and kick/bass relationship' }],
      faq: [
        { q: 'How many guitars should I record?', a: 'As many as the arrangement needs. Two different performances panned apart usually work better than artificially duplicating one take.' },
        { q: 'Should I compress drums while recording?', a: 'Not necessarily. If monitoring is uncertain, record clean and leave enough headroom to decide later.' },
        { q: 'Which MixingMusic preset should I use?', a: 'Rock is the direct starting point. If the mix already arrives processed, compare it with Neutral as well.' },
      ],
    },
  },
  {
    slug: 'acustico', enSlug: 'acoustic', presetSlug: 'acustico', presetEnSlug: 'acoustic',
    es: {
      name: 'Música acústica', seoName: 'Acústica', promise: 'captura natural para guitarra, voz y ensambles pequeños.',
      intro: 'En una producción acústica, los dedos, la respiración, la madera y la sala forman parte del arreglo. Una buena toma reduce la necesidad de procesamiento posterior.',
      challenge: 'La cercanía excesiva produce graves inflados y ruido mecánico; demasiada distancia hace que una sala mediocre domine la grabación.',
      direction: 'Encuentra primero el punto donde el instrumento suena equilibrado, mueve el micrófono antes de ecualizar y protege la dinámica de la interpretación.',
      recording: [
        { title: 'Posición antes que plugins', text: 'En guitarra, comienza entre el traste 12 y la unión del mástil, a 20–40 cm. Evita apuntar directamente a la boca si aparece exceso de grave.' },
        { title: 'Controla ruido y tempo', text: 'Apaga ventiladores, revisa ropa y silla, graba 10 segundos de room tone y usa claqueta solo si no compromete la interpretación.' },
      ],
      microphones: [
        { title: 'Guitarra y cuerdas', text: 'Un condensador de diafragma pequeño tipo KM 184 o AT4041 ofrece detalle; un ribbon suaviza púas brillantes. Para estéreo, prueba XY u ORTF con pareja coincidente.' },
        { title: 'Voz', text: 'Un condensador de diafragma grande tipo AT4050, C414 o TLM 103 funciona en una sala controlada; un SM7B puede ser más seguro si hay reflexiones o ruido.' },
      ],
      compression: [
        { title: 'Compresión suave', text: 'Un óptico tipo LA-2A con 1–3 dB de reducción puede estabilizar la voz o guitarra sin aplastar el ataque.' },
        { title: 'Picos rápidos', text: 'Si hay rasgueos o consonantes muy fuertes, coloca antes un 1176 lento de ataque y rápido de release, reduciendo solo los picos.' },
      ],
      mixing: [
        { title: 'Respeta el centro', text: 'Con voz y guitarra, no abras artificialmente todo. Mantén la voz estable y usa paneo o estéreo solo cuando la grabación lo justifique.' },
        { title: 'Mastering', text: 'Conserva microdinámica, revisa resonancias de madera y evita que la normalización vuelva audible el ruido de sala.' },
      ],
      notes: [{ label: 'Distancia inicial', value: '20–40 cm' }, { label: 'Compresión', value: '1–3 dB GR' }, { label: 'Prioridad', value: 'Naturalidad y bajo ruido' }],
      faq: [
        { q: '¿Puedo grabar guitarra y voz al tiempo?', a: 'Sí, si la interpretación mejora. Usa patrones polares y posición para controlar el bleed, y acepta que no tendrás aislamiento total.' },
        { q: '¿Necesito grabar la guitarra en estéreo?', a: 'No. Una toma mono bien posicionada suele ser más sólida; usa estéreo cuando la sala y el arreglo realmente lo aporten.' },
        { q: '¿Qué preset usar?', a: 'Acústico es el punto de partida. Neutro es mejor cuando ya imprimiste compresión, EQ y ambiente durante la grabación.' },
      ],
    },
    en: {
      name: 'Acoustic music', seoName: 'Acoustic music', promise: 'natural capture for guitar, vocals and small ensembles.',
      intro: 'In acoustic production, fingers, breath, wood and room are part of the arrangement. A strong take reduces the need for processing later.',
      challenge: 'Excessive proximity creates inflated lows and mechanical noise; too much distance lets a mediocre room dominate the recording.',
      direction: 'Find the point where the instrument sounds balanced, move the microphone before reaching for EQ and protect performance dynamics.',
      recording: [
        { title: 'Position before plugins', text: 'For guitar, start between the 12th fret and neck joint, 20–40 cm away. Avoid pointing at the sound hole when lows become excessive.' },
        { title: 'Control noise and tempo', text: 'Turn off fans, check clothing and chair noise, record ten seconds of room tone and use a click only when it does not compromise the performance.' },
      ],
      microphones: [
        { title: 'Guitar and strings', text: 'A small-diaphragm condenser such as a KM 184 or AT4041 provides detail; a ribbon softens bright picks. For stereo, try XY or ORTF with a matched pair.' },
        { title: 'Vocals', text: 'A large-diaphragm condenser such as an AT4050, C414 or TLM 103 works in a controlled room; an SM7B may be safer around reflections or noise.' },
      ],
      compression: [
        { title: 'Gentle compression', text: 'An LA-2A-style optical compressor with 1–3 dB of reduction can stabilize vocal or guitar without flattening the attack.' },
        { title: 'Fast peaks', text: 'For hard strums or consonants, place an 1176 first with a slower attack and fast release, reducing peaks only.' },
      ],
      mixing: [
        { title: 'Respect the center', text: 'With guitar and vocal, do not widen everything artificially. Keep the vocal stable and use panning or stereo only when the recording supports it.' },
        { title: 'Mastering', text: 'Keep microdynamics, inspect wood resonances and avoid making room noise obvious through excessive normalization.' },
      ],
      notes: [{ label: 'Starting distance', value: '20–40 cm' }, { label: 'Compression', value: '1–3 dB GR' }, { label: 'Priority', value: 'Natural tone and low noise' }],
      faq: [
        { q: 'Can I record guitar and vocals together?', a: 'Yes, especially when the performance improves. Use polar patterns and placement to control bleed, while accepting that isolation will not be complete.' },
        { q: 'Do I need to record guitar in stereo?', a: 'No. A well-positioned mono take is often more solid; use stereo when the room and arrangement truly benefit.' },
        { q: 'Which preset should I use?', a: 'Acoustic is the starting point. Neutral is better when compression, EQ and ambience were already printed during recording.' },
      ],
    },
  },
  {
    slug: 'pop', presetSlug: 'pop',
    es: {
      name: 'Pop', promise: 'voces protagonistas, producción limpia y traducción moderna.',
      intro: 'El pop depende de una jerarquía clara: una voz memorable, un ritmo estable y detalles que aparecen sin competir con el gancho principal.',
      challenge: 'Muchas capas, afinación agresiva y exceso de brillo pueden producir una mezcla grande pero cansada y sin profundidad.',
      direction: 'Define la voz y el groove desde el inicio, edita silencios y dobles con precisión y reserva automatización para construir cada sección.',
      recording: [
        { title: 'Captura una voz flexible', text: 'Graba a 15–25 cm con filtro antipop, ajusta la distancia en notas fuertes y conserva varias tomas completas antes de editar comping.' },
        { title: 'Capas con propósito', text: 'Dobles, armonías y stacks deben cumplir una función. Cambia distancia o micrófono para crear contraste en lugar de copiar el mismo timbre.' },
      ],
      microphones: [
        { title: 'Voz principal', text: 'Un condensador grande tipo C414, AT4050 o TLM 103 captura detalle en sala controlada. Un SM7B o RE20 reduce reflexiones en espacios difíciles.' },
        { title: 'Instrumentos', text: 'Usa DI limpia para bajo y sintes, condensadores pequeños para guitarra acústica y dinámicos o ribbons para amplificadores brillantes.' },
      ],
      compression: [
        { title: 'Cadena vocal', text: 'Un 1176 controlando picos seguido de un óptico tipo LA-2A puede dar estabilidad sin exigir demasiada reducción a un solo procesador.' },
        { title: 'Groove', text: 'Usa sidechain solo cuando kick y bajo realmente compitan. Ajusta release al tempo para evitar bombeo accidental.' },
      ],
      mixing: [
        { title: 'Automatiza la atención', text: 'Mueve voz, efectos y elementos secundarios entre verso, pre-coro y coro; una mezcla pop no debe mantener la misma densidad todo el tiempo.' },
        { title: 'Mastering', text: 'Busca claridad y consistencia sin volver ásperas las eses. Compara el estribillo y el verso al mismo volumen percibido.' },
      ],
      notes: [{ label: 'Distancia vocal', value: '15–25 cm' }, { label: 'Cadena común', value: 'FET + óptico' }, { label: 'Prioridad', value: 'Voz y gancho' }],
      faq: [
        { q: '¿Debo grabar muchos dobles vocales?', a: 'Solo si el arreglo los necesita. Mantén la voz principal definida y usa dobles como tamaño, textura o énfasis.' },
        { q: '¿Cuánta afinación debo aplicar?', a: 'Depende del estilo. Corrige sin borrar transiciones y respiraciones que sostienen la identidad del cantante.' },
        { q: '¿Qué preset usar?', a: 'Pop entrega claridad y brillo. Si la producción ya está muy brillante, compara con Neutro antes de decidir.' },
      ],
    },
    en: {
      name: 'Pop', promise: 'lead vocals, clean production and modern translation.',
      intro: 'Pop depends on a clear hierarchy: a memorable vocal, a stable groove and details that appear without competing with the main hook.',
      challenge: 'Many layers, aggressive tuning and excess brightness can produce a large mix that feels tiring and flat.',
      direction: 'Define vocal and groove early, edit silence and doubles precisely, and use automation to build each section.',
      recording: [
        { title: 'Capture a flexible vocal', text: 'Record 15–25 cm from the mic with a pop filter, change distance on loud notes and keep several full performances before comping.' },
        { title: 'Layer with purpose', text: 'Doubles, harmonies and stacks need a function. Change distance or microphone to create contrast instead of copying the same tone.' },
      ],
      microphones: [
        { title: 'Lead vocal', text: 'A large condenser such as a C414, AT4050 or TLM 103 captures detail in a controlled room. An SM7B or RE20 reduces room reflections in difficult spaces.' },
        { title: 'Instruments', text: 'Use clean DI for bass and synths, small condensers for acoustic guitar, and dynamics or ribbons for bright amplifiers.' },
      ],
      compression: [
        { title: 'Vocal chain', text: 'An 1176 catching peaks followed by an LA-2A-style optical compressor can add stability without forcing one processor to do all the work.' },
        { title: 'Groove', text: 'Use sidechain only when kick and bass truly compete. Time release to the song so pumping remains intentional.' },
      ],
      mixing: [
        { title: 'Automate attention', text: 'Move vocals, effects and secondary elements across verse, pre-chorus and chorus; a pop mix should not keep the same density throughout.' },
        { title: 'Mastering', text: 'Aim for clarity and consistency without making sibilance harsh. Compare chorus and verse at matched perceived level.' },
      ],
      notes: [{ label: 'Vocal distance', value: '15–25 cm' }, { label: 'Common chain', value: 'FET + optical' }, { label: 'Priority', value: 'Vocal and hook' }],
      faq: [
        { q: 'Should I record many vocal doubles?', a: 'Only when the arrangement needs them. Keep the lead defined and use doubles for size, texture or emphasis.' },
        { q: 'How much tuning should I apply?', a: 'It depends on the style. Correct pitch without erasing transitions and breaths that carry the singer’s identity.' },
        { q: 'Which preset should I use?', a: 'Pop provides clarity and shine. If the production is already bright, compare it with Neutral before deciding.' },
      ],
    },
  },
  {
    slug: 'reggaeton', presetSlug: 'reggaeton',
    es: {
      name: 'Reggaeton', promise: 'dembow sólido, subgrave controlado y voces cercanas.',
      intro: 'El reggaeton debe sentirse estable tanto en un teléfono como en un sistema de club. Kick, bajo, caja y voz necesitan espacios definidos.',
      challenge: 'Un 808 largo puede ocultar el kick; voces con demasiados efectos pierden dicción y una percusión brillante fatiga rápido.',
      direction: 'Diseña kick y bajo como un solo sistema, mantén el centro firme y usa delays y ambientes como movimientos automatizados.',
      recording: [
        { title: 'Voz seca y consistente', text: 'Graba cerca del micrófono con filtro antipop, controla la sala y conserva ad-libs y dobles en pistas separadas para tratarlos distinto.' },
        { title: 'Documenta el beat', text: 'Exporta stems desde el mismo punto, sin limitador en el master, e identifica kick, snare, percusión, bajo, instrumentos y efectos.' },
      ],
      microphones: [
        { title: 'Voz urbana', text: 'Un SM7B o RE20 funciona bien en habitaciones no tratadas; un C414, AT4050 o condensador similar aporta aire cuando la acústica está controlada.' },
        { title: 'Elementos acústicos', text: 'Para guitarras o percusión real, usa condensadores pequeños en detalle y dinámicos cercanos cuando necesites aislamiento y ataque.' },
      ],
      compression: [
        { title: 'Vocal firme', text: 'Un FET tipo 1176 con reducción moderada controla consonantes y picos; un de-esser posterior evita que el brillo se vuelva agresivo.' },
        { title: 'Kick y bajo', text: 'Un VCA tipo dbx 160 puede dar forma al kick. Usa sidechain o automatización de volumen para crear espacio sin adelgazar todo el bajo.' },
      ],
      mixing: [
        { title: 'Subgrave en mono', text: 'Mantén la información más baja estable en el centro y revisa fase en mono antes de abrir percusiones y efectos.' },
        { title: 'Mastering', text: 'Controla picos del kick antes de limitar. Si el bajo pierde movimiento o la voz se hunde, el master está demasiado denso.' },
      ],
      notes: [{ label: 'Centro', value: 'Kick, bajo y voz' }, { label: 'Revisión', value: 'Mono + teléfono + subwoofer' }, { label: 'Prioridad', value: 'Dembow y dicción' }],
      faq: [
        { q: '¿Debo masterizar muy fuerte?', a: 'No existe un número único. El nivel útil es el que conserva el dembow, la dicción y el bajo sin distorsión.' },
        { q: '¿Cómo evito que kick y bajo choquen?', a: 'Elige roles distintos, ajusta envolventes y usa sidechain o automatización solo en los momentos necesarios.' },
        { q: '¿Qué preset usar?', a: 'Reggaeton está diseñado como punto de partida para dembow, bajo redondo y voz directa.' },
      ],
    },
    en: {
      name: 'Reggaeton', promise: 'solid dembow, controlled sub bass and close vocals.',
      intro: 'Reggaeton must feel stable on both a phone and a club system. Kick, bass, snare and vocal need clearly defined spaces.',
      challenge: 'A long 808 can hide the kick; effect-heavy vocals lose diction and bright percussion becomes tiring quickly.',
      direction: 'Design kick and bass as one system, keep the center firm and use delays and ambience as automated movements.',
      recording: [
        { title: 'Dry, consistent vocal', text: 'Record close with a pop filter, control the room and keep ad-libs and doubles on separate tracks so they can be treated differently.' },
        { title: 'Document the beat', text: 'Export stems from the same start point, remove the master limiter, and label kick, snare, percussion, bass, instruments and effects.' },
      ],
      microphones: [
        { title: 'Urban vocal', text: 'An SM7B or RE20 works well in untreated rooms; a C414, AT4050 or similar condenser adds air when acoustics are controlled.' },
        { title: 'Acoustic elements', text: 'For guitars or live percussion, use small condensers for detail and close dynamics when isolation and attack matter.' },
      ],
      compression: [
        { title: 'Firm vocal', text: 'An 1176-style FET with moderate reduction controls consonants and peaks; a de-esser afterwards keeps brightness from becoming aggressive.' },
        { title: 'Kick and bass', text: 'A dbx 160-style VCA can shape the kick. Use sidechain or volume automation to create space without thinning the entire bass line.' },
      ],
      mixing: [
        { title: 'Mono sub bass', text: 'Keep the deepest information stable in the center and check phase in mono before widening percussion and effects.' },
        { title: 'Mastering', text: 'Control kick peaks before limiting. If bass stops moving or the vocal sinks, the master is too dense.' },
      ],
      notes: [{ label: 'Center', value: 'Kick, bass and vocal' }, { label: 'Check on', value: 'Mono + phone + subwoofer' }, { label: 'Priority', value: 'Dembow and diction' }],
      faq: [
        { q: 'Should I master very loud?', a: 'There is no single number. The useful level is the one that preserves dembow, diction and bass without distortion.' },
        { q: 'How do I stop kick and bass from fighting?', a: 'Give them different roles, adjust envelopes and use sidechain or automation only where needed.' },
        { q: 'Which preset should I use?', a: 'Reggaeton is designed as a starting point for dembow, rounded bass and direct vocals.' },
      ],
    },
  },
  {
    slug: 'clasica', enSlug: 'classical', presetSlug: 'clasica', presetEnSlug: 'classical',
    es: {
      name: 'Música clásica', seoName: 'Clásica', promise: 'perspectiva, sala y dinámica sin procesamiento evidente.',
      intro: 'En música clásica, la ubicación del ensamble y la acústica cuentan la historia. El objetivo técnico es transportar esa perspectiva, no reconstruirla con plugins.',
      challenge: 'Una mala sala, ruido de fondo o spots fuera de fase pueden destruir profundidad; la compresión excesiva borra fraseo y escala.',
      direction: 'Elige primero el par principal, escucha desde la posición del público y añade spots solo cuando resuelvan una necesidad concreta.',
      recording: [
        { title: 'Captura una perspectiva', text: 'Prueba configuraciones AB, ORTF o Decca Tree según tamaño y sala. Ajusta altura y distancia antes de añadir micrófonos cercanos.' },
        { title: 'Protege el silencio', text: 'Registra room tone, evita ventilación y movimientos, y deja margen amplio para crescendos inesperados.' },
      ],
      microphones: [
        { title: 'Par principal', text: 'Condensadores omnidireccionales ofrecen grave y sala; cardioides de diafragma pequeño mejoran enfoque. Usa una pareja coincidente cuando la imagen sea crítica.' },
        { title: 'Spots', text: 'Añade condensadores o ribbons con discreción para solistas, maderas, metales o secciones débiles. Mide retardos y escucha en mono.' },
      ],
      compression: [
        { title: 'Mínima intervención', text: 'Evita compresión si no es necesaria. Para seguridad, usa ratio 1.2:1–2:1, ataque lento y reducción ocasional.' },
        { title: 'No comprimas la sala', text: 'La compresión de ambientes puede levantar ruido, respiraciones y reverberación de forma antinatural.' },
      ],
      mixing: [
        { title: 'Balance por profundidad', text: 'Usa el par principal como obra completa y suma spots debajo, no al revés. Conserva la relación acústica entre secciones.' },
        { title: 'Mastering', text: 'Corrige problemas amplios con movimientos pequeños, conserva crescendos y deja picos compatibles con la entrega sin perseguir volumen comercial.' },
      ],
      notes: [{ label: 'Compresión', value: 'Ninguna o mínima' }, { label: 'Captura', value: 'Par principal + spots' }, { label: 'Prioridad', value: 'Sala, perspectiva y dinámica' }],
      faq: [
        { q: '¿Qué técnica estéreo debo usar?', a: 'Depende de la sala y el ensamble. ORTF ofrece ubicación precisa; AB aporta amplitud y grave; Decca Tree funciona en conjuntos grandes con espacio suficiente.' },
        { q: '¿Debo normalizar a −14 LUFS?', a: 'No como obligación. La música clásica suele necesitar más rango dinámico; la entrega debe respetar la obra y evitar clipping.' },
        { q: '¿Qué preset usar?', a: 'Clásica prioriza dinámica y sala. Neutro es preferible cuando la captura ya contiene la acústica final.' },
      ],
    },
    en: {
      name: 'Classical music', seoName: 'Classical music', promise: 'perspective, room and dynamics without obvious processing.',
      intro: 'In classical music, ensemble placement and acoustics tell the story. The technical goal is to transport that perspective, not rebuild it with plugins.',
      challenge: 'A poor room, background noise or out-of-phase spots can destroy depth; excessive compression erases phrasing and scale.',
      direction: 'Choose the main pair first, listen from the audience perspective and add spots only when they solve a specific need.',
      recording: [
        { title: 'Capture perspective', text: 'Try AB, ORTF or a Decca Tree according to ensemble size and room. Adjust height and distance before adding close microphones.' },
        { title: 'Protect silence', text: 'Record room tone, avoid ventilation and movement noise, and leave ample headroom for unexpected crescendos.' },
      ],
      microphones: [
        { title: 'Main pair', text: 'Omnidirectional condensers provide low end and room; small-diaphragm cardioids improve focus. Use a matched pair when imaging is critical.' },
        { title: 'Spots', text: 'Add condensers or ribbons discreetly for soloists, woodwinds, brass or weak sections. Measure delay and check mono compatibility.' },
      ],
      compression: [
        { title: 'Minimal intervention', text: 'Avoid compression when it is not needed. For safety, use a 1.2:1–2:1 ratio, slow attack and occasional reduction.' },
        { title: 'Do not compress the room', text: 'Compressing ambience can raise noise, breathing and reverberation in an unnatural way.' },
      ],
      mixing: [
        { title: 'Balance through depth', text: 'Treat the main pair as the complete work and add spots underneath, not the reverse. Preserve the acoustic relationship between sections.' },
        { title: 'Mastering', text: 'Correct broad problems with small moves, preserve crescendos and leave delivery-safe peaks without chasing commercial loudness.' },
      ],
      notes: [{ label: 'Compression', value: 'None or minimal' }, { label: 'Capture', value: 'Main pair + spots' }, { label: 'Priority', value: 'Room, perspective and dynamics' }],
      faq: [
        { q: 'Which stereo technique should I use?', a: 'It depends on room and ensemble. ORTF gives precise placement, AB adds width and bass, and a Decca Tree suits large ensembles in enough space.' },
        { q: 'Should I normalize to −14 LUFS?', a: 'Not as a rule. Classical music often needs more dynamic range; delivery should respect the work and avoid clipping.' },
        { q: 'Which preset should I use?', a: 'Classical prioritizes dynamics and room. Neutral is preferable when the capture already contains the final acoustic space.' },
      ],
    },
  },
  {
    slug: 'fusion', presetSlug: 'neutro', presetEnSlug: 'neutral',
    es: {
      name: 'Fusión', promise: 'cómo unir instrumentos, ritmos y lenguajes sin perder identidad.',
      intro: 'La música fusión exige que elementos de tradiciones distintas convivan sin que uno parezca pegado encima del otro. El arreglo y la captura deben definir qué lidera cada sección.',
      challenge: 'Percusión acústica, batería, bajo eléctrico, sintetizadores, metales y cuerdas pueden acumularse en medios y competir rítmicamente.',
      direction: 'Define una jerarquía por sección, conserva el carácter de cada fuente y crea una acústica común con profundidad, paneo y ambientes coherentes.',
      recording: [
        { title: 'Planea la sesión por familias', text: 'Agrupa base rítmica, instrumentos armónicos, solistas y texturas. Graba una guía que comunique cambios de métrica y dinámica.' },
        { title: 'Conserva opciones', text: 'Registra DI y amplificador cuando sea útil, separa micrófonos cercanos y de sala y documenta afinaciones o instrumentos tradicionales.' },
      ],
      microphones: [
        { title: 'Metales y percusión', text: 'Ribbons suavizan metales agresivos; dinámicos soportan fuentes fuertes; condensadores pequeños capturan transitorios de percusión y cuerdas pulsadas.' },
        { title: 'Bajo y teclados', text: 'Combina DI limpia con amplificador si necesitas textura. En piano o ensambles acústicos, un par estéreo ayuda a mantener una imagen creíble.' },
      ],
      compression: [
        { title: 'Procesa por función', text: 'Un VCA puede ordenar batería y bajo; un FET controla solistas; un óptico sostiene voces o instrumentos melódicos sin uniformar todo el ensamble.' },
        { title: 'Paralelo con moderación', text: 'La compresión paralela puede unir la base rítmica, pero filtra el retorno y evita que aplaste instrumentos acústicos.' },
      ],
      mixing: [
        { title: 'Automatiza la jerarquía', text: 'El instrumento principal puede cambiar. Usa automatización y muteo creativo en lugar de buscar un único balance para toda la canción.' },
        { title: 'Mastering', text: 'Comprueba que las secciones contrasten sin parecer canciones distintas. Conserva transitorios y revisa compatibilidad mono de capas estéreo.' },
      ],
      notes: [{ label: 'Organización', value: 'Familias y secciones' }, { label: 'Compresión', value: 'Según función' }, { label: 'Prioridad', value: 'Identidad + cohesión' }],
      faq: [
        { q: '¿Existe un preset universal para fusión?', a: 'No. Comienza con Neutro y decide qué carácter necesita la base, el solista y la acústica común.' },
        { q: '¿Cómo evito una mezcla congestionada?', a: 'Reduce duplicaciones de arreglo, automatiza protagonismo y usa paneo, profundidad y EQ para separar funciones.' },
        { q: '¿Debo masterizar todas las secciones igual?', a: 'El master debe mantener continuidad, pero no borrar los contrastes que hacen funcionar la composición.' },
      ],
    },
    en: {
      name: 'Fusion', promise: 'how to combine instruments, rhythms and traditions without losing identity.',
      intro: 'Fusion music asks elements from different traditions to coexist without one feeling pasted on top. Arrangement and capture must define what leads each section.',
      challenge: 'Acoustic percussion, drums, electric bass, synthesizers, horns and strings can build up in the mids and compete rhythmically.',
      direction: 'Set a hierarchy for each section, preserve the character of every source and create one acoustic world through depth, panning and coherent ambience.',
      recording: [
        { title: 'Plan by instrument family', text: 'Group rhythm section, harmonic instruments, soloists and textures. Record a guide that communicates meter and dynamic changes.' },
        { title: 'Keep options', text: 'Capture DI and amplifier when useful, separate close and room microphones, and document tunings or traditional instruments.' },
      ],
      microphones: [
        { title: 'Horns and percussion', text: 'Ribbons soften aggressive brass, dynamics handle loud sources, and small condensers capture percussion and plucked-string transients.' },
        { title: 'Bass and keyboards', text: 'Blend clean DI with an amplifier for texture. On piano or acoustic ensembles, a stereo pair helps retain a believable image.' },
      ],
      compression: [
        { title: 'Process by function', text: 'A VCA can organize drums and bass, a FET controls soloists, and an optical compressor supports vocals or melodic instruments without flattening the entire ensemble.' },
        { title: 'Parallel in moderation', text: 'Parallel compression can bind the rhythm section, but filter the return and keep it from crushing acoustic instruments.' },
      ],
      mixing: [
        { title: 'Automate hierarchy', text: 'The lead instrument can change. Use automation and creative muting instead of forcing one static balance across the song.' },
        { title: 'Mastering', text: 'Check that sections contrast without sounding like different songs. Preserve transients and inspect mono compatibility of stereo layers.' },
      ],
      notes: [{ label: 'Organization', value: 'Families and sections' }, { label: 'Compression', value: 'By function' }, { label: 'Priority', value: 'Identity + cohesion' }],
      faq: [
        { q: 'Is there one universal fusion preset?', a: 'No. Start with Neutral and decide what character the rhythm section, soloist and shared acoustic space need.' },
        { q: 'How do I avoid a congested mix?', a: 'Remove arrangement duplication, automate focus and use panning, depth and EQ to separate functions.' },
        { q: 'Should every section be mastered the same way?', a: 'The master should maintain continuity without erasing the contrasts that make the composition work.' },
      ],
    },
  },
  {
    slug: 'jazz', presetSlug: 'clasica', presetEnSlug: 'classical',
    es: {
      name: 'Jazz', promise: 'naturalidad, interacción y dinámica de ensamble.',
      intro: 'El jazz vive en la conversación entre músicos. La captura debe permitir que el balance de la sala y la ejecución sobrevivan a la edición y al mastering.',
      challenge: 'Demasiado aislamiento elimina cohesión; demasiados micrófonos abiertos generan fase y una compresión pesada reduce el movimiento del ensamble.',
      direction: 'Construye una imagen principal creíble, usa spots para definición y deja que la automatización acompañe solos y cambios de intensidad.',
      recording: [
        { title: 'Graba interacción real', text: 'Siempre que sea posible, ubica al ensamble para tocar junto. Usa paneles y patrones polares para controlar bleed sin eliminarlo.' },
        { title: 'Tomas completas', text: 'Prioriza interpretaciones completas y edita entre tomas compatibles. Los microcortes pueden romper ambiente, platos y colas de notas.' },
      ],
      microphones: [
        { title: 'Ensamble y metales', text: 'Un par estéreo define la sala. Ribbons funcionan bien en trompeta y saxofón; dinámicos ayudan con aislamiento y condensadores ofrecen detalle en piano y overheads.' },
        { title: 'Contrabajo', text: 'Combina un micrófono cerca del puente o f-hole con DI/pickup si existe. Revisa fase y usa el micrófono como fuente principal cuando la sala lo permita.' },
      ],
      compression: [
        { title: 'Movimiento primero', text: 'Usa ratios bajos y ataques lentos. Un vari-mu u óptico con 1–2 dB puede sostener sin fijar la interpretación.' },
        { title: 'Solos por automatización', text: 'Antes de comprimir más, automatiza el instrumento solista y conserva el cambio natural de dinámica del grupo.' },
      ],
      mixing: [
        { title: 'Acepta bleed útil', text: 'No ecualices cada canal en solo. Escucha cómo el bleed completa el timbre y evita puertas agresivas en batería.' },
        { title: 'Mastering', text: 'Conserva transitorios, profundidad y contraste. El master debe traducir el ensamble, no hacerlo sonar como una producción pop densa.' },
      ],
      notes: [{ label: 'Reducción', value: '1–2 dB GR' }, { label: 'Edición', value: 'Tomas completas' }, { label: 'Prioridad', value: 'Interacción y dinámica' }],
      faq: [
        { q: '¿El bleed es siempre un problema?', a: 'No. Bien controlado puede dar cohesión y profundidad. El problema aparece cuando la fase o el balance impiden tomar decisiones.' },
        { q: '¿Debo usar claqueta?', a: 'Solo si sirve al arreglo. Muchos ensambles de jazz funcionan mejor con respiración temporal compartida.' },
        { q: '¿Qué preset usar?', a: 'Clásica puede preservar dinámica; Acústico añade cercanía. Compara ambos con Neutro según la captura.' },
      ],
    },
    en: {
      name: 'Jazz', promise: 'natural ensemble interaction and dynamics.',
      intro: 'Jazz lives in the conversation between musicians. Capture should allow room balance and performance to survive editing and mastering.',
      challenge: 'Too much isolation removes cohesion, too many open microphones create phase problems, and heavy compression reduces ensemble movement.',
      direction: 'Build a believable main image, use spots for definition and let automation follow solos and dynamic changes.',
      recording: [
        { title: 'Record real interaction', text: 'Whenever possible, position the ensemble to play together. Use gobos and polar patterns to control bleed without eliminating it.' },
        { title: 'Complete takes', text: 'Prioritize full performances and edit between compatible takes. Tiny cuts can break ambience, cymbals and note tails.' },
      ],
      microphones: [
        { title: 'Ensemble and horns', text: 'A stereo pair defines the room. Ribbons work well on trumpet and saxophone, dynamics help isolation, and condensers add detail to piano and overheads.' },
        { title: 'Double bass', text: 'Blend a microphone near the bridge or f-hole with DI/pickup when available. Check phase and favor the microphone when the room allows it.' },
      ],
      compression: [
        { title: 'Movement first', text: 'Use low ratios and slow attacks. A vari-mu or optical compressor at 1–2 dB can support the performance without pinning it down.' },
        { title: 'Automate solos', text: 'Before adding more compression, automate the solo instrument and preserve the group’s natural dynamic shift.' },
      ],
      mixing: [
        { title: 'Accept useful bleed', text: 'Do not EQ every channel in solo. Hear how bleed completes the tone and avoid aggressive drum gates.' },
        { title: 'Mastering', text: 'Keep transients, depth and contrast. The master should translate the ensemble, not turn it into a dense pop production.' },
      ],
      notes: [{ label: 'Reduction', value: '1–2 dB GR' }, { label: 'Editing', value: 'Complete takes' }, { label: 'Priority', value: 'Interaction and dynamics' }],
      faq: [
        { q: 'Is bleed always a problem?', a: 'No. Controlled bleed can add cohesion and depth. It becomes a problem when phase or balance prevents useful decisions.' },
        { q: 'Should I use a click?', a: 'Only when it serves the arrangement. Many jazz ensembles work better with shared temporal breathing.' },
        { q: 'Which preset should I use?', a: 'Classical can preserve dynamics and Acoustic adds intimacy. Compare both with Neutral according to the capture.' },
      ],
    },
  },
  {
    slug: 'metal', presetSlug: 'rock',
    es: {
      name: 'Metal', promise: 'peso extremo con definición, velocidad y control.',
      intro: 'El metal necesita densidad sin perder lectura. Guitarras, doble kick, bajo y voces agresivas deben golpear juntos sin ocupar exactamente las mismas frecuencias.',
      challenge: 'Demasiadas capas y ganancia crean ruido y medios borrosos; limitar de más elimina el ataque que hace que una mezcla parezca pesada.',
      direction: 'Edita con intención, reduce ganancia en amplificadores, divide funciones de kick y bajo y construye anchura con interpretaciones reales.',
      recording: [
        { title: 'Menos gain, más capas definidas', text: 'Ajusta la distorsión escuchando las guitarras dobles juntas. Cuerdas nuevas, afinación estable y palm mutes consistentes importan más que otro plugin.' },
        { title: 'Captura DI', text: 'Graba DI limpia de guitarras y bajo junto al amplificador. Permite reamp, edición precisa y refuerzo de ataque sin reemplazar la interpretación.' },
      ],
      microphones: [
        { title: 'Gabinetes', text: 'Combina un SM57 o e906 cerca del cono con un ribbon para cuerpo. Mueve milímetros, escucha fase y evita sumar micrófonos por costumbre.' },
        { title: 'Batería y voz', text: 'Un boundary tipo Beta 91A más un Beta 52A/D112 separa click y cuerpo del kick. Para voz agresiva, SM7B o RE20 soportan proximidad y controlan sala.' },
      ],
      compression: [
        { title: 'Ataque de batería', text: 'Un dbx 160 o VCA controla kick y caja; ajusta ataque para no borrar el golpe. La compresión paralela puede añadir masa sin sacrificar transitorios.' },
        { title: 'Voces y bajo', text: 'Un 1176 rápido estabiliza screams; divide bajo en clean low y distorted mid si necesitas peso y lectura independientes.' },
      ],
      mixing: [
        { title: 'Guitarras grandes, no infinitas', text: 'Dobles bien tocados suelen superar cuatro capas imprecisas. Filtra solo lo necesario y deja al bajo conectar kick y guitarras.' },
        { title: 'Mastering', text: 'Controla dureza en 2–5 kHz, conserva kick y caja y comprueba que la distorsión no aumente al codificar o normalizar.' },
      ],
      notes: [{ label: 'Guitarras', value: 'Dobles reales + DI' }, { label: 'Kick', value: 'Click y cuerpo separados' }, { label: 'Prioridad', value: 'Peso con definición' }],
      faq: [
        { q: '¿Debo grabar cuatro guitarras rítmicas?', a: 'No necesariamente. Dos interpretaciones sólidas y diferentes suelen ofrecer más claridad y anchura que cuatro tomas imprecisas.' },
        { q: '¿Cuánta distorsión necesito?', a: 'Menos de la que parece en solo. Bajo, batería y guitarras suman densidad cuando se escuchan juntos.' },
        { q: '¿Qué preset usar?', a: 'Rock aporta ataque y peso. Para material ya muy comprimido, empieza con Neutro y ajusta de forma manual.' },
      ],
    },
    en: {
      name: 'Metal', promise: 'extreme weight with definition, speed and control.',
      intro: 'Metal needs density without losing readability. Guitars, double kick, bass and aggressive vocals must hit together without occupying exactly the same frequencies.',
      challenge: 'Too many layers and too much gain create noise and blurry mids; over-limiting removes the attack that makes a mix feel heavy.',
      direction: 'Edit with intent, reduce amplifier gain, separate kick and bass roles and build width from real performances.',
      recording: [
        { title: 'Less gain, clearer layers', text: 'Set distortion while hearing doubled guitars together. Fresh strings, stable tuning and consistent palm mutes matter more than another plugin.' },
        { title: 'Capture DI', text: 'Record clean guitar and bass DI alongside the amplifier. It enables reamping, precise editing and attack reinforcement without replacing the performance.' },
      ],
      microphones: [
        { title: 'Cabinets', text: 'Blend an SM57 or e906 near the cone with a ribbon for body. Move by millimeters, check phase and do not add microphones by habit.' },
        { title: 'Drums and vocals', text: 'A Beta 91A-style boundary plus Beta 52A/D112 separates kick click and body. For aggressive vocals, SM7B or RE20 handles proximity and controls the room.' },
      ],
      compression: [
        { title: 'Drum attack', text: 'A dbx 160-style VCA controls kick and snare; set attack so the hit survives. Parallel compression can add mass without sacrificing transients.' },
        { title: 'Vocals and bass', text: 'A fast 1176 stabilizes screams; split bass into clean low and distorted mid bands when weight and definition need independent control.' },
      ],
      mixing: [
        { title: 'Big guitars, not infinite guitars', text: 'Tight doubles often beat four imprecise layers. Filter only what is necessary and let bass connect kick and guitars.' },
        { title: 'Mastering', text: 'Control hardness around 2–5 kHz, keep kick and snare alive and check that distortion does not increase after encoding or normalization.' },
      ],
      notes: [{ label: 'Guitars', value: 'Real doubles + DI' }, { label: 'Kick', value: 'Separate click and body' }, { label: 'Priority', value: 'Weight with definition' }],
      faq: [
        { q: 'Should I record four rhythm guitars?', a: 'Not necessarily. Two solid, different performances often provide more clarity and width than four imprecise takes.' },
        { q: 'How much distortion do I need?', a: 'Less than it seems in solo. Bass, drums and guitars add density when heard together.' },
        { q: 'Which preset should I use?', a: 'Rock provides attack and weight. For already compressed material, begin with Neutral and adjust manually.' },
      ],
    },
  },
  {
    slug: 'folclor', enSlug: 'folk', presetSlug: 'acustico', presetEnSlug: 'acoustic',
    es: {
      name: 'Música de folclor', seoName: 'Folclor', promise: 'instrumentos tradicionales con presencia y raíz.',
      intro: 'Una grabación folclórica debe conservar articulación, afinación, respuesta de la sala y la relación humana entre instrumentos tradicionales.',
      challenge: 'Cuerdas brillantes, percusión transitoria, vientos y voces colectivas pueden perder identidad si se ecualizan y comprimen como una producción genérica.',
      direction: 'Aprende cómo proyecta cada instrumento, captura una imagen de conjunto y usa micrófonos cercanos como apoyo, no como sustituto de la interacción.',
      recording: [
        { title: 'Respeta el instrumento', text: 'Escucha a un metro y mueve el micrófono hasta encontrar balance entre ataque y cuerpo. Documenta afinaciones de tiple, cuatro, charango u otras cuerdas.' },
        { title: 'Graba ambiente útil', text: 'Si la sala favorece el ensamble, captura un par estéreo y room tone. Controla pasos, sillas y ruido antes de grabar.' },
      ],
      microphones: [
        { title: 'Cuerdas y vientos', text: 'Condensadores pequeños ofrecen detalle en cuerdas pulsadas; ribbons suavizan vientos o instrumentos brillantes; un condensador grande puede capturar cuerpo a mayor distancia.' },
        { title: 'Percusión y voces', text: 'Dinámicos cercanos controlan golpes fuertes; condensadores a distancia integran el instrumento. Para grupos vocales, prueba un par estéreo antes de microfonear cada persona.' },
      ],
      compression: [
        { title: 'Conserva transitorios', text: 'Usa óptico o vari-mu con ratios bajos y 1–3 dB de reducción. Percusión puede requerir un VCA, pero evita nivelar todos los golpes.' },
        { title: 'Automatiza antes', text: 'Sube frases o instrumentos importantes con volumen antes de usar más compresión. Así mantienes articulación y respiración.' },
      ],
      mixing: [
        { title: 'Profundidad culturalmente creíble', text: 'Panea según la disposición del ensamble y conserva contraste entre acompañamiento, canto, percusión y solistas.' },
        { title: 'Mastering', text: 'Evita endurecer instrumentos agudos y conserva el movimiento rítmico. Revisa en mono y altavoces pequeños sin adelgazar la raíz acústica.' },
      ],
      notes: [{ label: 'Captura', value: 'Ensamble + apoyo cercano' }, { label: 'Compresión', value: '1–3 dB GR' }, { label: 'Prioridad', value: 'Identidad y articulación' }],
      faq: [
        { q: '¿Debo grabar cada instrumento por separado?', a: 'No siempre. Si la interacción es esencial, graba el ensamble y usa spots para definición o seguridad.' },
        { q: '¿Cómo manejo instrumentos muy brillantes?', a: 'Cambia ángulo y distancia, prueba un ribbon y reduce reflexiones antes de aplicar ecualización profunda.' },
        { q: '¿Qué preset usar?', a: 'Acústico suele ser un buen inicio. Neutro es mejor cuando la sala y el balance ya quedaron definidos durante la grabación.' },
      ],
    },
    en: {
      name: 'Folk and traditional music', seoName: 'Folk music', promise: 'traditional instruments with presence and roots intact.',
      intro: 'A traditional music recording should preserve articulation, tuning, room response and the human relationship between instruments.',
      challenge: 'Bright strings, transient percussion, winds and group vocals can lose identity when EQ and compression follow a generic production recipe.',
      direction: 'Learn how each instrument projects, capture an ensemble image and use close microphones as support rather than a replacement for interaction.',
      recording: [
        { title: 'Respect the instrument', text: 'Listen from one meter away and move the microphone until attack and body balance. Document tunings for tiple, cuatro, charango or other strings.' },
        { title: 'Record useful ambience', text: 'When the room supports the ensemble, capture a stereo pair and room tone. Control footsteps, chairs and noise before recording.' },
      ],
      microphones: [
        { title: 'Strings and winds', text: 'Small condensers provide detail on plucked strings, ribbons soften winds or bright instruments, and a large condenser can capture body from farther away.' },
        { title: 'Percussion and vocals', text: 'Close dynamics control loud hits while distant condensers integrate the instrument. For vocal groups, try a stereo pair before miking every singer.' },
      ],
      compression: [
        { title: 'Preserve transients', text: 'Use optical or vari-mu compression at low ratios and 1–3 dB reduction. Percussion may need a VCA, but avoid flattening every hit.' },
        { title: 'Automate first', text: 'Raise important phrases or instruments with volume before adding more compression. This keeps articulation and breathing intact.' },
      ],
      mixing: [
        { title: 'Culturally believable depth', text: 'Pan according to ensemble layout and preserve contrast between accompaniment, singing, percussion and soloists.' },
        { title: 'Mastering', text: 'Avoid hardening bright instruments and keep rhythmic movement. Check mono and small speakers without thinning the acoustic foundation.' },
      ],
      notes: [{ label: 'Capture', value: 'Ensemble + close support' }, { label: 'Compression', value: '1–3 dB GR' }, { label: 'Priority', value: 'Identity and articulation' }],
      faq: [
        { q: 'Should every instrument be recorded separately?', a: 'Not always. If interaction is essential, record the ensemble and use spots for definition or safety.' },
        { q: 'How do I handle very bright instruments?', a: 'Change angle and distance, try a ribbon and reduce reflections before applying deep EQ.' },
        { q: 'Which preset should I use?', a: 'Acoustic is often a useful start. Neutral is better when room and balance were already defined during recording.' },
      ],
    },
  },
];

function section(lang: 'es' | 'en', key: 'recording' | 'microphones' | 'compression' | 'mixing', copy: GenreCopy) {
  const headings = lang === 'es' ? {
    recording: ['GRABACIÓN', 'Cómo preparar y capturar la interpretación', 'Las decisiones antes de grabar determinan cuánto procesamiento necesitarás después.'],
    microphones: ['MICRÓFONOS', 'Micrófonos y colocación recomendada', 'Los modelos son referencias de carácter; la sala, la fuente y la posición importan más que la marca.'],
    compression: ['DINÁMICA', 'Compresores y control de picos', 'Usa compresión con una intención audible y compara siempre al mismo volumen.'],
    mixing: ['MEZCLA Y MASTERING', 'Del balance inicial a la entrega final', 'La técnica debe apoyar el arreglo y la emoción, no imponer una receta fija.'],
  } : {
    recording: ['RECORDING', 'How to prepare and capture the performance', 'Decisions made before recording determine how much processing you will need later.'],
    microphones: ['MICROPHONES', 'Recommended microphones and placement', 'Models are tonal references; the room, source and position matter more than the brand.'],
    compression: ['DYNAMICS', 'Compressors and peak control', 'Use compression with an audible purpose and always compare at matched level.'],
    mixing: ['MIXING AND MASTERING', 'From initial balance to final delivery', 'Technique should support arrangement and emotion rather than impose a fixed recipe.'],
  };
  return { eyebrow: headings[key][0], title: headings[key][1], intro: headings[key][2], tips: copy[key] };
}

function buildGenreLanding(profile: GenreProfile, lang: 'es' | 'en'): SeoLanding {
  const copy = profile[lang];
  const isEs = lang === 'es';
  const enSlug = profile.enSlug ?? profile.slug;
  const path = isEs ? `/generos/${profile.slug}` : `/en/genres/${enSlug}`;
  const alternatePath = isEs ? `/en/genres/${enSlug}` : `/generos/${profile.slug}`;
  const presetPath = isEs ? `/presets/${profile.presetSlug}` : `/en/presets/${profile.presetEnSlug ?? profile.presetSlug}`;
  return {
    path,
    alternatePath,
    lang,
    kind: 'genre',
    parentPath: isEs ? '/generos' : '/en/genres',
    relatedPaths: [presetPath],
    eyebrow: isEs ? 'GUÍA DE PRODUCCIÓN POR GÉNERO' : 'GENRE PRODUCTION GUIDE',
    title: copy.name,
    accent: copy.promise,
    metaTitle: isEs ? `Guía de ${copy.seoName ?? copy.name}: grabación y mezcla | MixingMusic.AI` : `${copy.seoName ?? copy.name} recording and mixing guide | MixingMusic.AI`,
    metaDescription: isEs ? `Guía práctica de ${copy.name}: grabación, micrófonos, compresores, mezcla, dinámica y mastering con consejos aplicables.` : `Practical ${copy.name} guide covering recording, microphones, compressors, mixing, dynamics and mastering.`,
    intro: copy.intro,
    problem: copy.challenge,
    solution: copy.direction,
    cta: isEs ? `Mezclar ${copy.name} con IA` : `Mix ${copy.name} with AI`,
    mode: 'mix',
    steps: isEs ? [
      { title: 'Prepara la sesión', text: 'Define intención, referencias, afinación, tempo, sala y una estructura clara de archivos.' },
      { title: 'Captura con margen', text: 'Elige micrófonos por fuente y sala, controla fase y conserva picos limpios.' },
      { title: 'Mezcla con contexto', text: 'Balancea, automatiza y compara antes de masterizar o aplicar un preset.' },
    ] : [
      { title: 'Prepare the session', text: 'Define intent, references, tuning, tempo, room and a clear file structure.' },
      { title: 'Capture with headroom', text: 'Choose microphones for source and room, control phase and preserve clean peaks.' },
      { title: 'Mix in context', text: 'Balance, automate and compare before mastering or applying a preset.' },
    ],
    benefits: isEs ? ['Consejos de grabación aplicables', 'Micrófonos por tipo de fuente', 'Compresión con propósito', 'Mezcla y mastering sin recetas rígidas'] : ['Actionable recording guidance', 'Microphones by source type', 'Purposeful compression', 'Mixing and mastering without rigid recipes'],
    guideSections: (['recording', 'microphones', 'compression', 'mixing'] as const).map((key) => section(lang, key, copy)),
    technicalNotes: copy.notes,
    faq: copy.faq,
    keywords: isEs ? [`cómo grabar ${copy.name.toLowerCase()}`, `mezclar ${copy.name.toLowerCase()}`, `mastering ${copy.name.toLowerCase()}`, `micrófonos para ${copy.name.toLowerCase()}`, `compresión ${copy.name.toLowerCase()}`] : [`how to record ${copy.name.toLowerCase()}`, `mixing ${copy.name.toLowerCase()}`, `${copy.name.toLowerCase()} mastering`, `microphones for ${copy.name.toLowerCase()}`, `${copy.name.toLowerCase()} compression`],
  };
}

export const genreSeoLandings: SeoLanding[] = genres.flatMap((profile) => [buildGenreLanding(profile, 'es'), buildGenreLanding(profile, 'en')]);
