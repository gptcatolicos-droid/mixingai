import type { SeoLanding } from './seoLandingData';

type LocalizedCopy = {
  name: string;
  promise: string;
  intro: string;
  bestFor: string;
  avoidWhen: string;
  character: string;
};

type PresetProfile = {
  slug: string;
  enSlug?: string;
  color: string;
  bass: string;
  mids: string;
  highs: string;
  compression: string;
  space: string;
  genrePath?: string;
  genreEnPath?: string;
  en: LocalizedCopy;
  es: LocalizedCopy;
};

const profiles: PresetProfile[] = [
  {
    slug: 'pop', color: '#EC4899', bass: '+2 dB', mids: '+1 dB', highs: '+3 dB', compression: 'Medium', space: '15% reverb · 50% stereo width', genrePath: 'pop',
    es: { name: 'Pop', promise: 'claridad vocal y brillo controlado.', intro: 'El preset Pop pone la voz al frente, limpia el grave y añade brillo sin perder un centro sólido.', bestFor: 'Producciones vocales modernas, synth-pop, pop latino y arreglos densos que necesitan separación.', avoidWhen: 'La mezcla ya es muy brillante, la voz tiene sibilancia fuerte o el bus estéreo llega muy comprimido.', character: 'Voz definida, graves limpios y agudos abiertos.' },
    en: { name: 'Pop', promise: 'vocal clarity with controlled shine.', intro: 'The Pop preset brings the vocal forward, tightens the low end and adds shine while keeping a solid center.', bestFor: 'Modern vocal productions, synth-pop, Latin pop and dense arrangements that need separation.', avoidWhen: 'The mix is already bright, the vocal is heavily sibilant or the stereo bus arrives over-compressed.', character: 'Defined vocals, clean lows and open highs.' },
  },
  {
    slug: 'rock', color: '#EF4444', bass: '+4 dB', mids: '-1 dB', highs: '+2 dB', compression: 'High', space: '5% reverb · 60% stereo width', genrePath: 'rock',
    es: { name: 'Rock', promise: 'pegada, peso y ataque.', intro: 'El preset Rock refuerza el golpe de batería y bajo, controla la densidad y conserva el filo de guitarras y voces.', bestFor: 'Rock alternativo, hard rock, punk y sesiones de banda con batería acústica y guitarras amplificadas.', avoidWhen: 'Los overheads son ásperos, el grave ya está sobredimensionado o la mezcla perdió transitorios.', character: 'Grave potente, ataque firme y guitarras presentes.' },
    en: { name: 'Rock', promise: 'weight, punch and attack.', intro: 'The Rock preset reinforces drums and bass, controls density and preserves the edge of guitars and vocals.', bestFor: 'Alternative rock, hard rock, punk and full-band sessions with acoustic drums and amplified guitars.', avoidWhen: 'Overheads are harsh, the low end is already oversized or the mix has lost its transients.', character: 'Powerful lows, firm attack and present guitars.' },
  },
  {
    slug: 'hip-hop', color: '#F59E0B', bass: '+6 dB', mids: '-2 dB', highs: '+1 dB', compression: 'High', space: '8% reverb · 10% delay · 40% width',
    es: { name: 'Hip Hop', promise: '808 profundo y voz al frente.', intro: 'El preset Hip Hop reserva espacio para el 808, mantiene la caja seca y proyecta la voz sobre una base compacta.', bestFor: 'Rap, trap, drill y producciones centradas en beat, bajo subgrave y voz principal.', avoidWhen: 'El 808 ya satura el bus, el beat tiene exceso de subgrave o la voz llega demasiado comprimida.', character: 'Subgrave profundo, caja seca y centro vocal.' },
    en: { name: 'Hip Hop', promise: 'deep 808s and forward vocals.', intro: 'The Hip Hop preset makes room for the 808, keeps the snare dry and projects the vocal over a compact beat.', bestFor: 'Rap, trap, drill and productions built around beats, sub bass and lead vocals.', avoidWhen: 'The 808 already saturates the bus, the beat has excessive sub energy or the vocal arrives over-compressed.', character: 'Deep sub bass, dry snare and vocal focus.' },
  },
  {
    slug: 'reggaeton', color: '#10B981', bass: '+5 dB', mids: '0 dB', highs: '+2 dB', compression: 'High', space: '10% reverb · 15% delay · 50% width', genrePath: 'reggaeton',
    es: { name: 'Reggaeton', promise: 'dembow firme y vocal directa.', intro: 'El preset Reggaeton equilibra kick, bajo y dembow mientras mantiene una voz seca, clara y cercana.', bestFor: 'Reggaeton, urbano latino y producciones donde el ritmo y la voz deben dominar en teléfonos y sistemas grandes.', avoidWhen: 'Kick y bajo ya compiten, el master bus clipea o las voces tienen demasiado delay impreso.', character: 'Bajo redondo, percusión compacta y vocal seca.' },
    en: { name: 'Reggaeton', promise: 'solid dembow and direct vocals.', intro: 'The Reggaeton preset balances kick, bass and dembow while keeping the vocal dry, clear and close.', bestFor: 'Reggaeton, Latin urban music and productions where rhythm and vocals must translate on phones and large systems.', avoidWhen: 'Kick and bass already compete, the mix bus clips or vocals contain excessive printed delay.', character: 'Rounded bass, compact percussion and dry vocals.' },
  },
  {
    slug: 'dance-edm', color: '#6366F1', bass: '+4 dB', mids: '-1 dB', highs: '+3 dB', compression: 'Maximum', space: '20% reverb · 20% delay · 80% width',
    es: { name: 'Dance / EDM', promise: 'impacto de club y amplitud.', intro: 'El preset Dance / EDM prioriza un kick definido, densidad competitiva y elementos laterales amplios.', bestFor: 'House, EDM, dance pop y música electrónica con transitorios fuertes y drops de alta energía.', avoidWhen: 'La mezcla ya tiene limitación agresiva, graves fuera de fase o demasiada amplitud por debajo de 120 Hz.', character: 'Kick firme, densidad alta y estéreo amplio.' },
    en: { name: 'Dance / EDM', promise: 'club impact and width.', intro: 'The Dance / EDM preset prioritizes a defined kick, competitive density and wide side elements.', bestFor: 'House, EDM, dance pop and electronic tracks with strong transients and high-energy drops.', avoidWhen: 'The mix is already aggressively limited, lows are out of phase or content below 120 Hz is excessively wide.', character: 'Firm kick, high density and wide stereo image.' },
  },
  {
    slug: 'clasica', enSlug: 'classical', color: '#8B5CF6', bass: '0 dB', mids: '+1 dB', highs: '+2 dB', compression: 'None', space: '40% room reverb · 70% width', genrePath: 'clasica', genreEnPath: 'classical',
    es: { name: 'Clásica', promise: 'dinámica y profundidad natural.', intro: 'El preset Clásica evita la compresión, conserva contrastes y utiliza espacio para sostener la perspectiva del ensamble.', bestFor: 'Solistas, cámara, coral, orquesta y grabaciones donde la interpretación y la sala son parte del sonido.', avoidWhen: 'La grabación ya incluye una cola de sala larga o necesita restauración antes de cualquier procesamiento musical.', character: 'Dinámica amplia, medios naturales y profundidad de sala.' },
    en: { name: 'Classical', promise: 'natural dynamics and depth.', intro: 'The Classical preset avoids compression, preserves contrast and uses space to support the ensemble perspective.', bestFor: 'Soloists, chamber music, choirs, orchestras and recordings where performance and room are part of the sound.', avoidWhen: 'The recording already contains a long room tail or needs restoration before musical processing.', character: 'Wide dynamics, natural mids and room depth.' },
  },
  {
    slug: 'balada', enSlug: 'ballad', color: '#F472B6', bass: '+1 dB', mids: '+2 dB', highs: '+2 dB', compression: 'Low', space: '35% reverb · 10% delay · 50% width',
    es: { name: 'Balada', promise: 'voz íntima y ambiente cálido.', intro: 'El preset Balada sostiene una voz protagonista con compresión suave, medios presentes y un espacio envolvente.', bestFor: 'Balada pop, power ballad, canción romántica y arreglos donde la narrativa vocal debe permanecer cerca.', avoidWhen: 'La voz ya trae mucha reverb, las consonantes están duras o el acompañamiento ocupa todo el rango medio.', character: 'Vocal prominente, medios cálidos y cola suave.' },
    en: { name: 'Ballad', promise: 'intimate vocals and warm space.', intro: 'The Ballad preset supports a lead vocal with gentle compression, present mids and an enveloping space.', bestFor: 'Pop ballads, power ballads, romantic songs and arrangements where the vocal narrative must stay close.', avoidWhen: 'The vocal already has heavy reverb, consonants are harsh or the accompaniment fills the entire midrange.', character: 'Prominent vocal, warm mids and a soft tail.' },
  },
  {
    slug: 'acustico', enSlug: 'acoustic', color: '#A78BFA', bass: '-1 dB', mids: '+3 dB', highs: '+2 dB', compression: 'Low', space: '25% reverb · 45% width', genrePath: 'acustico', genreEnPath: 'acoustic',
    es: { name: 'Acústico', promise: 'detalle, madera y cercanía.', intro: 'El preset Acústico protege el ataque de cuerdas, resalta información media y crea un espacio íntimo sin endurecer el brillo.', bestFor: 'Guitarra y voz, cantautor, folk acústico, piano y sesiones orgánicas con pocos elementos.', avoidWhen: 'Las pistas ya tienen ambiente impreso, ruido de sala evidente o resonancias fuertes entre 150 y 350 Hz.', character: 'Medios detallados, dinámica suave y espacio íntimo.' },
    en: { name: 'Acoustic', promise: 'detail, wood and intimacy.', intro: 'The Acoustic preset protects string attack, highlights midrange information and creates an intimate space without hardening the top end.', bestFor: 'Guitar and vocal, singer-songwriter, acoustic folk, piano and organic sessions with few elements.', avoidWhen: 'Tracks already contain printed ambience, obvious room noise or strong resonances between 150 and 350 Hz.', character: 'Detailed mids, gentle dynamics and intimate space.' },
  },
  {
    slug: 'gospel', color: '#FBBF24', bass: '+2 dB', mids: '+3 dB', highs: '+3 dB', compression: 'Medium', space: '45% reverb · 5% delay · 70% width',
    es: { name: 'Gospel', promise: 'coro amplio y voces llenas.', intro: 'El preset Gospel da presencia al coro, sostiene la base rítmica y utiliza una sala amplia sin esconder la voz principal.', bestFor: 'Gospel contemporáneo, worship, coros, piano, órgano y arreglos vocales por capas.', avoidWhen: 'Las voces ya tienen una reverb larga impresa o el coro presenta sibilancia y acumulación en medios altos.', character: 'Voces llenas, coro amplio y ambiente de sala.' },
    en: { name: 'Gospel', promise: 'wide choir and full vocals.', intro: 'The Gospel preset gives the choir presence, supports the rhythm section and uses a broad room without hiding the lead vocal.', bestFor: 'Contemporary gospel, worship, choirs, piano, organ and layered vocal arrangements.', avoidWhen: 'Vocals already contain long printed reverb or the choir has sibilance and upper-mid buildup.', character: 'Full vocals, wide choir and room ambience.' },
  },
  {
    slug: 'neutro', enSlug: 'neutral', color: '#22D3EE', bass: '0 dB', mids: '0 dB', highs: '0 dB', compression: 'None', space: 'No reverb · no delay · no artificial width',
    es: { name: 'Neutro', promise: 'tu sonido, sin efectos añadidos.', intro: 'El preset Neutro conserva EQ, dinámica y estéreo; solo normaliza el nivel y protege los picos durante la salida.', bestFor: 'Mezclas que ya llegan terminadas, stems con efectos impresos y material que solo necesita entrega técnica transparente.', avoidWhen: 'La sesión aún necesita balance, control tonal o corrección dinámica entre pistas.', character: 'Sin color, sin compresión, sin reverb y sin delay.' },
    en: { name: 'Neutral', promise: 'your sound with no added effects.', intro: 'The Neutral preset preserves EQ, dynamics and stereo image; it only normalizes level and protects peaks during output.', bestFor: 'Finished mixes, stems with printed effects and material that only needs transparent technical delivery.', avoidWhen: 'The session still needs balance, tonal control or dynamic correction between tracks.', character: 'No color, compression, reverb or delay.' },
  },
];

function buildLanding(profile: PresetProfile, lang: 'es' | 'en'): SeoLanding {
  const copy = profile[lang];
  const isEs = lang === 'es';
  const enSlug = profile.enSlug ?? profile.slug;
  const path = isEs ? `/presets/${profile.slug}` : `/en/presets/${enSlug}`;
  const alternatePath = isEs ? `/en/presets/${enSlug}` : `/presets/${profile.slug}`;
  const genrePath = profile.genrePath ? (isEs ? `/generos/${profile.genrePath}` : `/en/genres/${profile.genreEnPath ?? profile.genrePath}`) : undefined;

  return {
    path,
    alternatePath,
    lang,
    kind: 'preset',
    parentPath: isEs ? '/presets' : '/en/presets',
    relatedPaths: genrePath ? [genrePath] : [],
    eyebrow: isEs ? 'PRESET MIXINGMUSIC' : 'MIXINGMUSIC PRESET',
    title: `${isEs ? 'Preset' : ''} ${copy.name}`.trim(),
    accent: copy.promise,
    metaTitle: isEs ? `Preset ${copy.name} para mezcla y mastering | MixingMusic.AI` : `${copy.name} mixing and mastering preset | MixingMusic.AI`,
    metaDescription: isEs ? `Conoce el preset ${copy.name} de MixingMusic.AI: carácter, ajustes, usos recomendados y cuándo elegir otro punto de partida.` : `Explore the MixingMusic.AI ${copy.name} preset: sound character, settings, recommended uses and when to choose another starting point.`,
    intro: copy.intro,
    problem: copy.avoidWhen,
    solution: copy.bestFor,
    cta: isEs ? `Probar preset ${copy.name}` : `Try the ${copy.name} preset`,
    mode: 'mix',
    steps: isEs ? [
      { title: 'Sube tu material', text: 'Carga stems separados o una mezcla estéreo con margen y sin clipping.' },
      { title: `Selecciona ${copy.name}`, text: 'Usa el preset como punto de partida y escucha qué aporta al balance.' },
      { title: 'Compara antes de exportar', text: 'Iguala el volumen, revisa en audífonos y altavoces y conserva solo los cambios que ayuden.' },
    ] : [
      { title: 'Upload your material', text: 'Add separate stems or a stereo mix with headroom and no clipping.' },
      { title: `Select ${copy.name}`, text: 'Use the preset as a starting point and hear what it contributes to the balance.' },
      { title: 'Compare before export', text: 'Match playback level, check headphones and speakers, and keep only the changes that help.' },
    ],
    benefits: isEs ? [copy.character, `Ideal para: ${copy.bestFor}`, 'Control manual después de aplicar el preset', 'Comparación A/B antes de descargar'] : [copy.character, `Best for: ${copy.bestFor}`, 'Manual control after applying the preset', 'A/B comparison before download'],
    technicalNotes: isEs ? [
      { label: 'Graves', value: profile.bass }, { label: 'Medios', value: profile.mids }, { label: 'Agudos', value: profile.highs },
      { label: 'Compresión', value: profile.compression === 'None' ? 'Ninguna' : profile.compression }, { label: 'Espacio', value: profile.space },
    ] : [
      { label: 'Lows', value: profile.bass }, { label: 'Mids', value: profile.mids }, { label: 'Highs', value: profile.highs },
      { label: 'Compression', value: profile.compression }, { label: 'Space', value: profile.space },
    ],
    faq: isEs ? [
      { q: `¿El preset ${copy.name} termina la mezcla automáticamente?`, a: 'Es un punto de partida. Debes comparar, revisar el balance de tus stems y ajustar según la grabación.' },
      { q: '¿Puedo cambiar los controles después?', a: 'Sí. El preset establece una dirección inicial, pero puedes modificar intensidad, efectos, balance y loudness.' },
      { q: '¿Debo usarlo si mis pistas ya tienen efectos?', a: `Solo si el carácter ayuda. Cuando el material ya viene procesado, prueba primero el preset Neutro para evitar sumar color innecesario.` },
    ] : [
      { q: `Does the ${copy.name} preset finish the mix automatically?`, a: 'It is a starting point. Compare the result, review stem balance and adjust it for the actual recording.' },
      { q: 'Can I change the controls afterwards?', a: 'Yes. The preset sets an initial direction, but you can change intensity, effects, balance and loudness.' },
      { q: 'Should I use it when tracks already have effects?', a: 'Only if the character helps. When material arrives processed, try Neutral first to avoid adding unnecessary color.' },
    ],
    keywords: isEs ? [`preset ${copy.name.toLowerCase()}`, `mezcla ${copy.name.toLowerCase()}`, `mastering ${copy.name.toLowerCase()}`, `preset de audio ${copy.name.toLowerCase()}`] : [`${copy.name.toLowerCase()} mixing preset`, `${copy.name.toLowerCase()} mastering preset`, `AI ${copy.name.toLowerCase()} mixing`, `${copy.name.toLowerCase()} audio preset`],
  };
}

export const presetSeoLandings: SeoLanding[] = profiles.flatMap((profile) => [buildLanding(profile, 'es'), buildLanding(profile, 'en')]);
