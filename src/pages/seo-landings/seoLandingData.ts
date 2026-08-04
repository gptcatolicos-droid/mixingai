export type SeoLanding = {
  path: string;
  alternatePath: string;
  lang: 'es' | 'en';
  eyebrow: string;
  title: string;
  accent: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  problem: string;
  solution: string;
  cta: string;
  mode: 'mix' | 'master' | 'album';
  steps: { title: string; text: string }[];
  benefits: string[];
  faq: { q: string; a: string }[];
  keywords: string[];
};

const sharedEs = {
  mixSteps: [
    { title: 'Sube tus stems', text: 'Carga voz, batería, bajo, guitarras y demás pistas por separado.' },
    { title: 'Recibe una recomendación', text: 'La IA analiza el material y propone el preset más adecuado.' },
    { title: 'Escucha y ajusta', text: 'Compara el resultado, conserva el control y exporta cuando estés conforme.' },
  ],
  masterSteps: [
    { title: 'Carga tu mezcla estéreo', text: 'Usa un WAV o archivo de alta calidad con margen suficiente.' },
    { title: 'Define el carácter', text: 'Elige o acepta el preset recomendado y ajusta intensidad, amplitud y loudness.' },
    { title: 'Compara y descarga', text: 'Escucha original y master con volumen igualado y descarga MP3 o WAV 24 bits.' },
  ],
};

const sharedEn = {
  mixSteps: [
    { title: 'Upload your stems', text: 'Add vocals, drums, bass, guitars and other tracks as separate audio files.' },
    { title: 'Get an AI recommendation', text: 'The platform analyzes the material and recommends a suitable sound preset.' },
    { title: 'Listen and refine', text: 'Compare the result, keep creative control and export when the mix feels right.' },
  ],
  masterSteps: [
    { title: 'Upload a stereo mix', text: 'Start with a high-quality WAV or audio file with enough headroom.' },
    { title: 'Define the character', text: 'Use the recommended preset and adjust intensity, stereo width and loudness.' },
    { title: 'Compare and download', text: 'A/B the original and master at matched volume, then export MP3 or 24-bit WAV.' },
  ],
};

export const seoLandings: SeoLanding[] = [
  {
    path: '/mezcla-con-ia', alternatePath: '/ai-music-mixing', lang: 'es', eyebrow: 'MEZCLA MUSICAL CON INTELIGENCIA ARTIFICIAL',
    title: 'Mezcla con IA', accent: 'sin perder tu intención musical.', metaTitle: 'Mezcla con IA: mezcla stems online | MixingMusic.AI',
    metaDescription: 'Mezcla música con IA a partir de hasta 12 stems. Presets propios, recomendación automática y control del resultado. Empieza gratis en MixingMusic.AI.',
    intro: 'La mezcla con IA analiza cada pista, detecta relaciones de volumen, frecuencia y dinámica, y construye un punto de partida coherente para tu canción.',
    problem: 'Mezclar voz, batería, bajo e instrumentos puede exigir experiencia, monitores y muchas horas de prueba. Un mal balance oculta detalles y reduce el impacto de la canción.',
    solution: 'MixingMusic.AI combina tus stems con presets de género desarrollados para música real. La tecnología acelera las decisiones técnicas; tú sigues decidiendo cómo debe sentirse.',
    cta: 'Crear una mezcla con IA', mode: 'mix', steps: sharedEs.mixSteps,
    benefits: ['Hasta 12 stems por canción', 'Presets para nueve géneros', 'Recomendación de sonido con IA', 'Comparación y ajustes antes de exportar'],
    faq: [
      { q: '¿Qué es una mezcla con IA?', a: 'Es un proceso asistido que analiza pistas separadas y propone balance, ecualización, dinámica y espacio según el material musical.' },
      { q: '¿La IA reemplaza al productor?', a: 'No. Ofrece un punto de partida técnico y rápido; el artista conserva la selección de preset, la comparación y el resultado final.' },
      { q: '¿Puedo mezclar gratis?', a: 'Sí. El plan Gratis permite crear tres mezclas desde stems sin tarjeta.' },
    ], keywords: ['mezcla con IA', 'mix IA', 'IA mixing', 'mezclar música con inteligencia artificial', 'mezclar stems online'],
  },
  {
    path: '/mezclador-musica-online', alternatePath: '/online-music-mixer', lang: 'es', eyebrow: 'MEZCLADOR DE MÚSICA ONLINE',
    title: 'Mezclador online', accent: 'para tus pistas separadas.', metaTitle: 'Mezclador de música online con IA | MixingMusic.AI',
    metaDescription: 'Mezclador de música online para voz, instrumentos y stems. Trabaja desde el navegador con IA, presets y exportación profesional.',
    intro: 'Un mezclador de música online permite reunir tus pistas desde el navegador sin instalar un estudio complejo. MixingMusic añade análisis y decisiones asistidas por IA.',
    problem: 'Los mezcladores tradicionales presentan decenas de controles antes de que el músico pueda escuchar un resultado útil.',
    solution: 'Aquí comienzas con una intención musical y un preset. Después puedes revisar el balance y escuchar el resultado antes de avanzar al mastering.',
    cta: 'Abrir el mezclador online', mode: 'mix', steps: sharedEs.mixSteps,
    benefits: ['Funciona en navegador', 'Voz e instrumentos por separado', 'Editor multipista', 'Flujo directo hacia mastering'],
    faq: [
      { q: '¿Necesito instalar un programa?', a: 'No. El flujo funciona directamente en un navegador moderno.' },
      { q: '¿Qué archivos puedo subir?', a: 'Puedes cargar formatos de audio comunes como WAV y MP3, idealmente exportados desde el mismo punto de inicio.' },
      { q: '¿Cuántas pistas admite?', a: 'Puedes trabajar con hasta 12 stems por canción.' },
    ], keywords: ['mezclador online', 'mixer IA', 'mezclador música online', 'mix online', 'mezclar pistas online'],
  },
  {
    path: '/mastering-con-ia', alternatePath: '/ai-mastering', lang: 'es', eyebrow: 'MASTERING AUTOMÁTICO CON CONTROL',
    title: 'Mastering con IA', accent: 'listo para publicar.', metaTitle: 'Mastering con IA online: masteriza tu canción | MixingMusic.AI',
    metaDescription: 'Mastering con IA para mejorar claridad, dinámica, amplitud y loudness. Compara original/master y descarga MP3 o WAV 24 bits.',
    intro: 'El mastering con IA trabaja sobre tu mezcla estéreo terminada para preparar el balance tonal, la dinámica, la amplitud y el nivel final de publicación.',
    problem: 'Subir volumen no es masterizar. Sin control de picos, tono y dinámica, una canción puede sonar fuerte pero fatigante, pequeña o distorsionada.',
    solution: 'MixingMusic analiza la mezcla, recomienda un preset y permite seleccionar el objetivo de loudness. La comparación A/B igualada evita confundir “más fuerte” con “mejor”.',
    cta: 'Masterizar con IA', mode: 'master', steps: sharedEs.masterSteps,
    benefits: ['Objetivos de loudness seleccionables', 'Protección de pico digital', 'Comparación A/B igualada', 'WAV PCM real de 24 bits en Unlimited'],
    faq: [
      { q: '¿Cuál es el objetivo de LUFS?', a: 'El modo Balanceado busca aproximadamente −14 LUFS; Streaming conserva más dinámica y Competitivo ofrece mayor intensidad.' },
      { q: '¿Qué archivo debo subir?', a: 'Preferiblemente una mezcla estéreo WAV sin clipping y con margen antes del pico máximo.' },
      { q: '¿Puedo probarlo gratis?', a: 'Sí. El plan Gratis incluye un master descargable en MP3.' },
    ], keywords: ['mastering con IA', 'masterizar con inteligencia artificial', 'mastering online', 'IA mastering', 'master automático'],
  },
  {
    path: '/masterizar-cancion-online', alternatePath: '/master-song-online', lang: 'es', eyebrow: 'TU CANCIÓN, TERMINADA EN EL NAVEGADOR',
    title: 'Masteriza una canción online', accent: 'con claridad y fuerza.', metaTitle: 'Masterizar canción online: MP3 y WAV 24 bits | MixingMusic.AI',
    metaDescription: 'Masteriza una canción online. Analiza loudness y picos, compara original y master y descarga el resultado listo para streaming.',
    intro: 'Masterizar una canción online es el último paso entre la mezcla y la distribución. Debe mejorar la traducción sin borrar el carácter de la interpretación.',
    problem: 'Una mezcla puede sonar bien en el estudio y perder claridad en audífonos, teléfono, carro o plataformas de streaming.',
    solution: 'El flujo de MixingMusic revisa nivel, pico y balance; aplica el carácter elegido y entrega un master que puedes comparar antes de descargar.',
    cta: 'Subir mi canción', mode: 'master', steps: sharedEs.masterSteps,
    benefits: ['Análisis de archivo', 'Lectura de LUFS y pico', 'Presets de mastering', 'Descarga MP3 320 kbps o WAV 24 bits'],
    faq: [
      { q: '¿Mastering y mezcla son lo mismo?', a: 'No. La mezcla combina pistas separadas; el mastering procesa la mezcla estéreo final.' },
      { q: '¿El archivo original cambia?', a: 'No. Se procesa una copia y tu archivo original permanece intacto.' },
      { q: '¿Está listo para Spotify?', a: 'El master ofrece objetivos controlados y protección de picos adecuados para distribución digital.' },
    ], keywords: ['masterizar canción online', 'masterizar música online', 'master online', 'masterizar MP3', 'masterizar WAV'],
  },
  {
    path: '/mastering-albumes', alternatePath: '/album-mastering', lang: 'es', eyebrow: 'HASTA 12 CANCIONES · UNA IDENTIDAD',
    title: 'Mastering de álbumes', accent: 'con sonido coherente.', metaTitle: 'Mastering de álbumes con IA: hasta 12 canciones | MixingMusic.AI',
    metaDescription: 'Masteriza hasta 12 canciones como un álbum: volumen percibido, EQ y dinámica coherentes con ajustes por pista. Modo álbum MixingMusic.AI.',
    intro: 'El mastering de un álbum no consiste en procesar canciones aisladas con el mismo preset. El objetivo es que convivan como una obra sin perder sus diferencias.',
    problem: 'Cuando cada canción se masteriza por separado, pueden aparecer saltos de volumen, brillo, graves o densidad que rompen la experiencia del álbum.',
    solution: 'El modo álbum analiza hasta 12 mezclas como un conjunto, propone una dirección común y conserva ajustes individuales antes de la exportación.',
    cta: 'Crear master de álbum', mode: 'album',
    steps: [
      { title: 'Sube hasta 12 mezclas', text: 'Organiza las canciones en el orden previsto del álbum.' },
      { title: 'Define la identidad', text: 'La IA analiza relaciones de volumen, tono y dinámica entre canciones.' },
      { title: 'Ajusta y exporta', text: 'Revisa cada pista dentro del conjunto y descarga los masters finales.' },
    ],
    benefits: ['Hasta 12 canciones', 'Volumen percibido consistente', 'Cohesión tonal y dinámica', 'Ajustes individuales antes de exportar'],
    faq: [
      { q: '¿Qué hace diferente al modo álbum?', a: 'Evalúa las canciones como un conjunto y busca continuidad de volumen, balance tonal y dinámica.' },
      { q: '¿Todas las canciones quedan iguales?', a: 'No. Conservan su personalidad, pero se corrigen diferencias que interrumpirían la escucha del álbum.' },
      { q: '¿Está incluido en Gratis?', a: 'El modo álbum es una función Unlimited.' },
    ], keywords: ['mastering álbum', 'masterizar álbum con IA', 'mastering varias canciones', 'album mastering online', 'cohesión de álbum'],
  },
  {
    path: '/ai-music-mixing', alternatePath: '/mezcla-con-ia', lang: 'en', eyebrow: 'AI MUSIC MIXING FOR INDEPENDENT ARTISTS',
    title: 'AI music mixing', accent: 'that keeps your musical intent.', metaTitle: 'AI Music Mixing: mix stems online | MixingMusic.AI',
    metaDescription: 'Mix up to 12 stems with AI, original genre presets and smart sound recommendations. Start free with MixingMusic.AI.',
    intro: 'AI music mixing analyzes separate tracks and builds a balanced starting point for level, frequency, dynamics and space.',
    problem: 'Balancing vocals, drums, bass and instruments can require trained ears, monitoring and many hours of revisions.',
    solution: 'MixingMusic.AI combines your stems through original genre presets. AI accelerates technical decisions while you keep control of the musical direction.',
    cta: 'Mix music with AI', mode: 'mix', steps: sharedEn.mixSteps,
    benefits: ['Up to 12 stems per song', 'Nine genre presets', 'AI sound recommendation', 'Review and refine before export'],
    faq: [
      { q: 'What is AI music mixing?', a: 'It is an assisted process that analyzes separate tracks and proposes balance, EQ, dynamics and space for a song.' },
      { q: 'Does AI replace the producer?', a: 'No. It provides a fast technical starting point while the artist chooses the preset, compares the result and makes the final decision.' },
      { q: 'Can I try it for free?', a: 'Yes. The Free plan includes three stem mixes with no card required.' },
    ], keywords: ['AI music mixing', 'mixing AI', 'AI mixer', 'mix music with AI', 'online stem mixing'],
  },
  {
    path: '/online-music-mixer', alternatePath: '/mezclador-musica-online', lang: 'en', eyebrow: 'ONLINE MUSIC MIXER',
    title: 'An online music mixer', accent: 'built around your stems.', metaTitle: 'Online Music Mixer with AI for stems | MixingMusic.AI',
    metaDescription: 'Online music mixer for vocals, instruments and stems. Work in your browser with AI recommendations, presets and a mix-to-master workflow.',
    intro: 'An online music mixer brings separate tracks together in the browser. MixingMusic adds AI analysis and a guided decision process.',
    problem: 'Traditional mixers often expose dozens of controls before a musician can hear a useful result.',
    solution: 'Start with musical intent and a genre preset, then review the balance and move directly into mastering when the mix is ready.',
    cta: 'Open the online mixer', mode: 'mix', steps: sharedEn.mixSteps,
    benefits: ['Browser-based workflow', 'Separate vocals and instruments', 'Multitrack editor', 'Direct path into mastering'],
    faq: [
      { q: 'Do I need to install software?', a: 'No. The workflow runs in a modern web browser.' },
      { q: 'What can I upload?', a: 'You can use common audio formats such as WAV and MP3, ideally exported from the same starting point.' },
      { q: 'How many tracks can I mix?', a: 'A project can contain up to 12 stems.' },
    ], keywords: ['online music mixer', 'AI mixer online', 'mix stems online', 'music mixing website', 'browser mixer'],
  },
  {
    path: '/ai-mastering', alternatePath: '/mastering-con-ia', lang: 'en', eyebrow: 'AI MASTERING WITH ARTIST CONTROL',
    title: 'AI mastering', accent: 'ready for release.', metaTitle: 'AI Mastering Online: master your song | MixingMusic.AI',
    metaDescription: 'AI mastering for tonal balance, dynamics, stereo width and loudness. Compare original and master, then export MP3 or 24-bit WAV.',
    intro: 'AI mastering works on a finished stereo mix to prepare tonal balance, dynamics, stereo presentation and release loudness.',
    problem: 'Making a track louder is not the same as mastering. Without peak, tonal and dynamic control, loud audio can become harsh or distorted.',
    solution: 'MixingMusic analyzes the mix, recommends a preset and lets you select a loudness profile. Loudness-matched A/B comparison keeps “louder” from being mistaken for “better”.',
    cta: 'Master with AI', mode: 'master', steps: sharedEn.masterSteps,
    benefits: ['Selectable loudness profiles', 'Digital peak protection', 'Loudness-matched A/B', 'True 24-bit PCM WAV with Unlimited'],
    faq: [
      { q: 'What LUFS target does it use?', a: 'Balanced targets approximately −14 LUFS, Streaming preserves more dynamics and Competitive provides greater intensity.' },
      { q: 'What file should I upload?', a: 'Prefer a stereo WAV without clipping and with enough peak headroom.' },
      { q: 'Can I master a song free?', a: 'Yes. Free includes one downloadable MP3 master.' },
    ], keywords: ['AI mastering', 'mastering AI', 'online mastering', 'AI audio mastering', 'automatic mastering'],
  },
  {
    path: '/master-song-online', alternatePath: '/masterizar-cancion-online', lang: 'en', eyebrow: 'FINISH YOUR SONG IN THE BROWSER',
    title: 'Master a song online', accent: 'with clarity and impact.', metaTitle: 'Master a song online: MP3 and 24-bit WAV | MixingMusic.AI',
    metaDescription: 'Master a song online, measure loudness and peaks, compare original and master, and download a streaming-ready result.',
    intro: 'Online song mastering is the final step between mixing and distribution. It should improve translation without removing the character of the performance.',
    problem: 'A mix can work in the studio yet lose clarity on headphones, phones, cars or streaming services.',
    solution: 'MixingMusic reviews level, peak and tonal balance, applies the selected character and provides a master you can compare before downloading.',
    cta: 'Upload my song', mode: 'master', steps: sharedEn.masterSteps,
    benefits: ['Audio file analysis', 'LUFS and peak measurement', 'Mastering presets', 'MP3 320 kbps or 24-bit WAV'],
    faq: [
      { q: 'Are mixing and mastering the same?', a: 'No. Mixing combines separate tracks; mastering processes the final stereo mix.' },
      { q: 'Does my original file change?', a: 'No. MixingMusic processes a copy and keeps the original intact.' },
      { q: 'Is it ready for streaming?', a: 'The master uses controlled loudness profiles and peak protection suitable for digital distribution.' },
    ], keywords: ['master song online', 'online music mastering', 'master audio online', 'master MP3 online', 'master WAV online'],
  },
  {
    path: '/album-mastering', alternatePath: '/mastering-albumes', lang: 'en', eyebrow: 'UP TO 12 SONGS · ONE IDENTITY',
    title: 'Album mastering', accent: 'with a coherent sound.', metaTitle: 'AI Album Mastering: up to 12 songs | MixingMusic.AI',
    metaDescription: 'Master up to 12 songs as one album with consistent perceived loudness, tone and dynamics plus individual track adjustments.',
    intro: 'Album mastering is not simply applying the same preset to isolated songs. The goal is to make every track belong to one body of work.',
    problem: 'Songs mastered independently can jump in level, brightness, low end or density and interrupt the album experience.',
    solution: 'Album Mode analyzes up to 12 mixes as a group, proposes a shared direction and preserves individual adjustments before export.',
    cta: 'Master an album', mode: 'album',
    steps: [
      { title: 'Upload up to 12 mixes', text: 'Arrange the songs in the intended album sequence.' },
      { title: 'Define one identity', text: 'AI evaluates level, tone and dynamics across the complete set.' },
      { title: 'Refine and export', text: 'Review each track in context and download the final masters.' },
    ],
    benefits: ['Up to 12 songs', 'Consistent perceived loudness', 'Tonal and dynamic cohesion', 'Individual adjustments before export'],
    faq: [
      { q: 'What makes Album Mode different?', a: 'It evaluates songs as a group and seeks continuity in perceived volume, tonal balance and dynamics.' },
      { q: 'Will every song sound identical?', a: 'No. Each track keeps its personality while disruptive differences are corrected.' },
      { q: 'Is Album Mode free?', a: 'Album Mode is an Unlimited feature.' },
    ], keywords: ['album mastering', 'AI album mastering', 'master multiple songs', 'online album mastering', 'album loudness consistency'],
  },
];

export const seoLandingByPath = Object.fromEntries(seoLandings.map((landing) => [landing.path, landing]));
