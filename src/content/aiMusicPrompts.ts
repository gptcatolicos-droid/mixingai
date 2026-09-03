export type AiMusicPrompt = {
  id: string;
  genre: string;
  genreEs: string;
  title: string;
  titleEs: string;
  prompt: string;
  promptEs: string;
};

const genres = [
  ['Pop', 'Pop', 'bright synth layers, tight live drums and an immediate melodic hook', 'capas de sintetizador brillantes, batería acústica precisa y un gancho melódico inmediato'],
  ['Rock', 'Rock', 'crunchy electric guitars, energetic acoustic drums and a confident bass line', 'guitarras eléctricas crujientes, batería acústica enérgica y una línea de bajo segura'],
  ['Hip-hop', 'Hip-hop', 'deep 808s, crisp drums, sparse keys and space for a lead vocal', '808 profundos, batería nítida, teclas minimalistas y espacio para una voz principal'],
  ['R&B', 'R&B', 'warm electric piano, elastic bass, restrained drums and layered harmonies', 'piano eléctrico cálido, bajo elástico, batería contenida y armonías vocales en capas'],
  ['Reggaeton', 'Reguetón', 'a clean dembow groove, rounded sub bass, syncopated percussion and a memorable chorus', 'un dembow limpio, subgrave redondo, percusión sincopada y un coro memorable'],
  ['Trap', 'Trap', 'sliding 808 bass, rapid hi-hat details, dark pads and a spacious lead motif', 'bajo 808 deslizante, detalles rápidos de hi-hat, pads oscuros y un motivo principal espacioso'],
  ['House', 'House', 'four-on-the-floor drums, a buoyant bass groove, piano stabs and a gradual club build', 'bombo a negras, bajo con rebote, acordes cortos de piano y crecimiento gradual de club'],
  ['Techno', 'Techno', 'driving kick, hypnotic sequencer pulses, metallic percussion and controlled tension', 'bombo impulsor, pulsos hipnóticos de secuenciador, percusión metálica y tensión controlada'],
  ['Ambient', 'Ambient', 'slowly evolving pads, granular textures, distant piano and abundant negative space', 'pads de evolución lenta, texturas granulares, piano distante y abundante espacio negativo'],
  ['Lo-fi', 'Lo-fi', 'soft drums, dusty keys, mellow bass and subtle room texture without excessive noise', 'batería suave, teclas polvorientas, bajo tranquilo y textura de sala sutil sin ruido excesivo'],
  ['Jazz', 'Jazz', 'acoustic piano, upright bass, brushed drums and conversational improvisation', 'piano acústico, contrabajo, escobillas y una improvisación conversada'],
  ['Blues', 'Blues', 'expressive guitar, Hammond organ, pocket drums and a call-and-response phrase', 'guitarra expresiva, órgano Hammond, batería con pocket y una frase de llamada y respuesta'],
  ['Folk', 'Folk', 'fingerpicked acoustic guitar, intimate vocal space, light percussion and organic dynamics', 'guitarra acústica fingerpicking, espacio vocal íntimo, percusión ligera y dinámica orgánica'],
  ['Country', 'Country', 'acoustic guitar, pedal steel accents, steady drums and a story-forward arrangement', 'guitarra acústica, acentos de pedal steel, batería estable y un arreglo al servicio de la historia'],
  ['Cinematic', 'Cinemática', 'orchestral strings, low percussion, evolving brass and a wide emotional arc', 'cuerdas orquestales, percusión grave, metales evolutivos y un arco emocional amplio'],
  ['Classical', 'Clásica', 'a chamber ensemble with natural articulation, thematic development and concert-hall depth', 'un ensamble de cámara con articulación natural, desarrollo temático y profundidad de sala de concierto'],
  ['Salsa', 'Salsa', 'piano montuno, tumbao bass, congas, timbales and a dynamic brass section', 'piano montuno, bajo en tumbao, congas, timbales y una sección dinámica de metales'],
  ['Afrobeats', 'Afrobeats', 'interlocking percussion, melodic guitar, warm bass and an easy vocal pocket', 'percusión entrelazada, guitarra melódica, bajo cálido y un espacio cómodo para la voz'],
  ['Gospel', 'Gospel', 'piano-led harmony, organ swells, live drums and a responsive choir', 'armonía guiada por piano, crescendos de órgano, batería en vivo y un coro responsorial'],
  ['Latin ballad', 'Balada latina', 'piano and acoustic guitar, restrained strings, intimate verses and a soaring chorus', 'piano y guitarra acústica, cuerdas contenidas, versos íntimos y un coro expansivo'],
] as const;

const directions = [
  {
    title: 'Emotional song arc', titleEs: 'Arco emocional',
    en: 'Write an original, emotionally clear song that begins intimate, grows through the pre-chorus and reaches a larger final chorus. Keep the arrangement uncluttered and preserve believable dynamics.',
    es: 'Crea una canción original y emocionalmente clara que comience íntima, crezca en el pre-coro y llegue a un coro final más grande. Mantén el arreglo despejado y conserva una dinámica creíble.',
  },
  {
    title: 'Instrumental creator bed', titleEs: 'Base instrumental',
    en: 'Create an original instrumental with a recognizable eight-bar theme, two contrasting sections and clean transitions. Leave useful headroom and a clear midrange for an optional narrator or singer.',
    es: 'Crea un instrumental original con un tema reconocible de ocho compases, dos secciones contrastantes y transiciones limpias. Deja headroom útil y un rango medio claro para un narrador o cantante opcional.',
  },
  {
    title: 'Short-form hook', titleEs: 'Gancho para formato corto',
    en: 'Build an original 45-second idea that reaches its hook within the first eight seconds, introduces one satisfying variation and ends on a clean musical button rather than a fade.',
    es: 'Construye una idea original de 45 segundos que llegue al gancho en los primeros ocho segundos, introduzca una variación satisfactoria y termine con un cierre musical limpio en lugar de un fade.',
  },
  {
    title: 'Live-room performance', titleEs: 'Interpretación en sala',
    en: 'Imagine an original live-room performance with human timing, natural instrument interaction and restrained ambience. Avoid brick-wall loudness, over-quantization and exaggerated stereo widening.',
    es: 'Imagina una interpretación original en sala con tiempo humano, interacción natural entre instrumentos y ambiente contenido. Evita volumen aplastado, cuantización excesiva y apertura estéreo exagerada.',
  },
  {
    title: 'Evolving production', titleEs: 'Producción evolutiva',
    en: 'Develop an original three-minute production in which texture, register and rhythmic density change every eight or sixteen bars. Use a deliberate breakdown and return with a transformed final section.',
    es: 'Desarrolla una producción original de tres minutos donde la textura, el registro y la densidad rítmica cambien cada ocho o dieciséis compases. Usa un breakdown deliberado y regresa con una sección final transformada.',
  },
] as const;

export const aiMusicPrompts: AiMusicPrompt[] = genres.flatMap(([genre, genreEs, palette, paletteEs], genreIndex) =>
  directions.map((direction, directionIndex) => ({
    id: `prompt-${genreIndex + 1}-${directionIndex + 1}`,
    genre,
    genreEs,
    title: `${genre}: ${direction.title}`,
    titleEs: `${genreEs}: ${direction.titleEs}`,
    prompt: `${direction.en} Use ${palette}. Set a coherent tempo and key for the mood, reserve frequency space for every main element, and do not imitate any named artist, copyrighted song, or recognizable voice.`,
    promptEs: `${direction.es} Usa ${paletteEs}. Define un tempo y tonalidad coherentes con el ánimo, reserva espacio de frecuencia para cada elemento principal y no imites a ningún artista, canción protegida ni voz reconocible.`,
  })),
);

export const aiMusicPromptGenres = genres.map(([genre, genreEs]) => ({ genre, genreEs }));
