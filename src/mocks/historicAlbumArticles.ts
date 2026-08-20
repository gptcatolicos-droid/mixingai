import type { BlogArticle } from './blogArticles';

type AlbumStudy = {
  slug: string;
  artist: string;
  album: string;
  year: number;
  producer: string;
  mix: string;
  master: string;
  contextEn: string;
  contextEs: string;
  processEn: string[];
  processEs: string[];
  lessonEn: string;
  lessonEs: string;
  sources: { label: string; url: string }[];
};

// Editorial methodology: these are the first 20 titles in the reported-sales
// grouping used by Wikipedia's worldwide best-selling-albums list on 20 Aug 2026.
// Sales are estimates and can change; the articles focus on documented credits
// and interviews, never on guessed plugin settings.
const studies: AlbumStudy[] = [
  {
    slug: 'thriller-michael-jackson-mixing-mastering', artist: 'Michael Jackson', album: 'Thriller', year: 1982,
    producer: 'Quincy Jones and Michael Jackson', mix: 'Bruce Swedien', master: 'Bernie Grundman',
    contextEn: 'The world’s best-selling album joined pop, funk, R&B and rock without flattening their differences. Its clarity comes as much from arrangement and performance as from processing.',
    contextEs: 'El álbum más vendido del mundo unió pop, funk, R&B y rock sin borrar sus diferencias. Su claridad nace tanto del arreglo y la interpretación como del procesamiento.',
    processEn: ['Swedien recorded and mixed with his Acusonic approach, combining synchronized multitrack machines while protecting transient detail.', 'Each song was given a distinct “sonic personality”; the dry, instantly recognizable drums and disciplined low end leave room for Jackson’s vocal.', 'Grundman’s mastering translated the wide, deep mixes to commercial formats without turning the record into one continuous loudness block.'],
    processEs: ['Swedien grabó y mezcló con su enfoque Acusonic, sincronizando máquinas multipista y protegiendo el detalle transitorio.', 'Cada canción recibió una “personalidad sonora”; la batería seca, reconocible y el grave disciplinado dejan espacio a la voz de Jackson.', 'El mastering de Grundman trasladó mezclas amplias y profundas a formatos comerciales sin convertir el disco en un bloque constante de volumen.'],
    lessonEn: 'Build contrast into the production first. A vocal feels larger when competing parts are edited, arranged and placed around it—not merely boosted.',
    lessonEs: 'Construye primero el contraste en la producción. Una voz parece más grande cuando los elementos que compiten se editan, arreglan y ubican a su alrededor; no solo cuando se sube.',
    sources: [{label:'Sound On Sound: Bruce Swedien',url:'https://www.soundonsound.com/people/bruce-swedien-recording-michael-jackson'},{label:'Sound On Sound: Acusonic',url:'https://www.soundonsound.com/sound-advice/q-what-acusonic-recording-process'},{label:'Worldwide sales methodology',url:'https://en.wikipedia.org/wiki/List_of_best-selling_albums'}],
  },
  {
    slug: 'back-in-black-acdc-mixing-mastering', artist: 'AC/DC', album: 'Back in Black', year: 1980,
    producer: 'Robert John “Mutt” Lange', mix: 'Tony Platt with Mutt Lange', master: 'Bob Ludwig (original US mastering credit)',
    contextEn: 'The record sounds enormous because it is controlled, not crowded: hard-panned guitars, a centered rhythm section and arrangements with deliberate gaps.',
    contextEs: 'El disco suena enorme porque está controlado, no saturado: guitarras abiertas, sección rítmica centrada y arreglos con espacios deliberados.',
    processEn: ['Tony Platt captured different guitar-speaker positions to create complementary colors rather than one overloaded guitar tone.', 'Lange’s exacting vocal stacks and rhythm editing turned a live rock band into a precise, repeatable wall of energy.', 'The master retained impact by letting kick, snare and guitar attacks remain audible instead of chasing constant density.'],
    processEs: ['Tony Platt capturó distintas posiciones del parlante de guitarra para crear colores complementarios en lugar de un único tono sobrecargado.', 'Las capas vocales y la edición rítmica meticulosa de Lange convirtieron una banda en vivo en una pared de energía precisa.', 'El master conservó impacto dejando audibles los ataques de bombo, redoblante y guitarra, sin perseguir densidad constante.'],
    lessonEn: 'For heavy rock, width comes from different performances and tones. Duplicating one processed guitar rarely creates the same authority.',
    lessonEs: 'En rock pesado, la amplitud nace de interpretaciones y tonos diferentes. Duplicar una sola guitarra procesada rara vez produce la misma autoridad.',
    sources: [{label:'Sound On Sound: Back In Black',url:'https://www.soundonsound.com/techniques/classic-tracks-acdc-back-black'},{label:'Sound On Sound: Tony Platt',url:'https://www.soundonsound.com/people/tony-platt-rock-island-life'},{label:'Worldwide sales methodology',url:'https://en.wikipedia.org/wiki/List_of_best-selling_albums'}],
  },
  {
    slug: 'the-bodyguard-whitney-houston-mixing-mastering', artist: 'Whitney Houston / Various Artists', album: 'The Bodyguard', year: 1992,
    producer: 'Whitney Houston, David Foster and multiple track producers', mix: 'Dave Reitzas, Mick Guzauski, Bob Rosa, Dave Way and others', master: 'George Marino',
    contextEn: 'This is a soundtrack assembled from several production teams. Its cohesion was created at the editorial and mastering stages rather than by forcing every song through one mix template.',
    contextEs: 'Esta banda sonora reunió varios equipos de producción. Su cohesión se construyó en la edición y el mastering, no obligando a que cada canción pasara por una única plantilla.',
    processEn: ['“I Will Always Love You” begins a cappella, using silence and delayed orchestration as the largest possible dynamic contrast.', 'Different mixers preserved the identity of gospel, pop, R&B and rock material while a common sequence made the soundtrack feel intentional.', 'George Marino’s album master had to reconcile tonal balance and level across heterogeneous sessions.'],
    processEs: ['“I Will Always Love You” comienza a cappella: el silencio y la entrada tardía del arreglo crean el mayor contraste dinámico posible.', 'Distintos mezcladores conservaron la identidad del gospel, pop, R&B y rock, mientras una secuencia común dio intención al conjunto.', 'El master de George Marino tuvo que conciliar balance tonal y nivel entre sesiones heterogéneas.'],
    lessonEn: 'Album consistency does not mean identical EQ. Match perceived level and broad tonal direction while preserving each track’s emotional scale.',
    lessonEs: 'Consistencia de álbum no significa EQ idéntica. Iguala nivel percibido y dirección tonal general, preservando la escala emocional de cada pista.',
    sources: [{label:'The Bodyguard recording and personnel',url:'https://en.wikipedia.org/wiki/The_Bodyguard_(soundtrack)'},{label:'Whitney Houston official site',url:'https://www.whitneyhouston.com/track/i-will-always-love-you/'},{label:'Worldwide sales methodology',url:'https://en.wikipedia.org/wiki/List_of_best-selling_albums'}],
  },
  {
    slug: 'dark-side-of-the-moon-pink-floyd-mixing-mastering', artist: 'Pink Floyd', album: 'The Dark Side of the Moon', year: 1973,
    producer: 'Pink Floyd', mix: 'Pink Floyd and Alan Parsons', master: 'Original lacquer credits vary by territory; later reference editions involved Doug Sax and James Guthrie',
    contextEn: 'The album behaves like one continuous work. Transitions, tape effects and recurring ambience are structural elements, not decorations added after the songs were finished.',
    contextEs: 'El álbum funciona como una obra continua. Las transiciones, efectos de cinta y ambientes recurrentes son elementos estructurales, no adornos añadidos al final.',
    processEn: ['Abbey Road tape loops, clocks, voices and EMS synthesizers were arranged as musical events with their own depth and movement.', 'Automation was performed manually on the console, so dynamics and spatial gestures became part of the performance.', 'Because original masters differ across territories, responsible analysis distinguishes the 1973 mix from later remasters and surround versions.'],
    processEs: ['Loops de cinta, relojes, voces y sintetizadores EMS en Abbey Road se organizaron como eventos musicales con profundidad y movimiento.', 'La automatización se interpretó manualmente en consola; dinámica y espacio se volvieron parte de la ejecución.', 'Como los masters originales varían por territorio, un análisis responsable diferencia la mezcla de 1973 de remasters y versiones surround posteriores.'],
    lessonEn: 'For album mode, plan transitions before mastering. No limiter can create narrative continuity that is absent from the arrangement and edit.',
    lessonEs: 'Para modo álbum, planea las transiciones antes del mastering. Ningún limitador puede crear continuidad narrativa si no existe en el arreglo y la edición.',
    sources: [{label:'Abbey Road: The Dark Side of the Moon',url:'https://www.abbeyroad.com/news/50-years-of-pink-floyds-the-dark-side-of-the-moon-3285'},{label:'Alan Parsons interview',url:'https://www.soundonsound.com/people/alan-parsons'},{label:'Worldwide sales methodology',url:'https://en.wikipedia.org/wiki/List_of_best-selling_albums'}],
  },
  {
    slug: 'eagles-greatest-hits-mixing-mastering', artist: 'Eagles', album: 'Their Greatest Hits (1971–1975)', year: 1976,
    producer: 'Glyn Johns and Bill Szymczyk', mix: 'Multiple original-album engineers', master: 'Mike Fuller; later digital remasters by Steve Hoffman and Ted Jensen',
    contextEn: 'A compilation is an album-mastering stress test: recordings made in different rooms, years and production eras must coexist without rewriting history.',
    contextEs: 'Una recopilación es una prueba exigente de mastering de álbum: grabaciones de salas, años y etapas distintas deben convivir sin reescribir la historia.',
    processEn: ['The source tracks span the natural country-rock sound of Glyn Johns and the more polished rock approach of Bill Szymczyk.', 'Sequencing emphasizes vocal harmony and song flow rather than strict chronological order.', 'Different editions carry different mastering credits, so “the sound of the album” depends on the specific release being studied.'],
    processEs: ['Las fuentes abarcan el country-rock natural de Glyn Johns y el enfoque rock más pulido de Bill Szymczyk.', 'La secuencia prioriza armonías vocales y flujo musical por encima del orden cronológico estricto.', 'Las ediciones tienen créditos de mastering distintos; “el sonido del álbum” depende de la versión estudiada.'],
    lessonEn: 'When mastering catalog material, use the least processing that creates continuity. Do not erase the audible history between sessions.',
    lessonEs: 'Al masterizar catálogo, usa el mínimo procesamiento que cree continuidad. No borres la historia audible entre sesiones.',
    sources: [{label:'Official Eagles overview',url:'https://eagles.com/blogs/news/eagles-their-greatest-hits-1971-1975'},{label:'Album credits',url:'https://en.wikipedia.org/wiki/Their_Greatest_Hits_(1971%E2%80%931975)'},{label:'Bill Szymczyk interview',url:'https://www.soundonsound.com/people/bill-szymczyk'}],
  },
  {
    slug: 'hotel-california-eagles-mixing-mastering', artist: 'Eagles', album: 'Hotel California', year: 1976,
    producer: 'Bill Szymczyk', mix: 'Bill Szymczyk and engineers including Allan Blazek', master: 'Ted Jensen (widely credited original mastering)',
    contextEn: 'The album’s polish never removes the band’s physical feel. Carefully controlled drums, layered guitars and extremely precise harmonies share space without sounding clinical.',
    contextEs: 'El acabado del álbum no elimina la sensación física de la banda. Baterías controladas, guitarras en capas y armonías precisas comparten espacio sin sonar clínicas.',
    processEn: ['Szymczyk kept drums comparatively open and used arrangement discipline to prevent the dense guitar parts from swallowing them.', 'The title track’s guitar dialogue works because the tones and phrases answer one another instead of occupying identical space.', 'Mastering preserved a smooth top end and midrange detail that lets long listening remain comfortable.'],
    processEs: ['Szymczyk mantuvo la batería relativamente abierta y usó disciplina de arreglo para que las guitarras densas no la ocultaran.', 'El diálogo de guitarras del tema principal funciona porque tonos y frases se responden en vez de ocupar el mismo espacio.', 'El mastering conservó agudos suaves y detalle medio para permitir escucha prolongada.'],
    lessonEn: 'Before cutting EQ, ask whether two instruments are performing the same job. Complementary parts are the cleanest form of frequency separation.',
    lessonEs: 'Antes de recortar EQ, pregunta si dos instrumentos cumplen la misma función. Las partes complementarias son la separación de frecuencias más limpia.',
    sources: [{label:'Sound On Sound: Hotel California',url:'https://www.soundonsound.com/techniques/classic-tracks-eagles-hotel-california'},{label:'Bill Szymczyk interview',url:'https://www.soundonsound.com/people/bill-szymczyk'},{label:'Worldwide sales methodology',url:'https://en.wikipedia.org/wiki/List_of_best-selling_albums'}],
  },
  {
    slug: 'come-on-over-shania-twain-mixing-mastering', artist: 'Shania Twain', album: 'Come On Over', year: 1997,
    producer: 'Robert John “Mutt” Lange', mix: 'Mike Shipley and Mutt Lange', master: 'Glenn Meadows',
    contextEn: 'Country instruments were framed with pop precision: tight low end, edited arrangements, stacked vocals and multiple market-specific mixes.',
    contextEs: 'Los instrumentos country se enmarcaron con precisión pop: grave firme, arreglos editados, voces apiladas y mezclas específicas para distintos mercados.',
    processEn: ['Lange and Shipley treated vocal intelligibility as a word-by-word production task, using detailed automation and tonal control.', 'Dense backing vocals are organized by register, timing and panorama so the lead remains conversational.', 'Country and international pop editions show that a mix can adapt to an audience while keeping the song’s identity.'],
    processEs: ['Lange y Shipley trataron la inteligibilidad vocal palabra por palabra mediante automatización y control tonal detallados.', 'Los coros densos se organizan por registro, tiempo y panorama para que la voz principal siga siendo conversacional.', 'Las ediciones country y pop internacional muestran que una mezcla puede adaptarse sin perder identidad.'],
    lessonEn: 'Automate the vocal before over-compressing it. Consistent words can still retain phrasing and emotion.',
    lessonEs: 'Automatiza la voz antes de sobrecomprimirla. Las palabras pueden ser consistentes sin perder fraseo ni emoción.',
    sources: [{label:'Sound On Sound: Mutt Lange vocal EQ',url:'https://www.soundonsound.com/sound-advice/q-why-would-mutt-lange-want-eq-every-word-vocal'},{label:'Sound On Sound: Mike Shipley',url:'https://www.soundonsound.com/techniques/mike-shipley-recording-alison-krauss-paper-airplane'},{label:'Worldwide sales methodology',url:'https://en.wikipedia.org/wiki/List_of_best-selling_albums'}],
  },
  {
    slug: 'rumours-fleetwood-mac-mixing-mastering', artist: 'Fleetwood Mac', album: 'Rumours', year: 1977,
    producer: 'Fleetwood Mac, Ken Caillat and Richard Dashut', mix: 'Ken Caillat and Richard Dashut', master: 'Ken Perry',
    contextEn: 'A highly layered production still feels intimate because the team continually chose which element should carry the listener’s attention.',
    contextEs: 'Una producción con muchas capas conserva intimidad porque el equipo decidió constantemente qué elemento debía guiar la atención.',
    processEn: ['Long sessions and extensive overdubs required careful tape management and frequent submix decisions.', 'On “Go Your Own Way,” drum and guitar energy are balanced by a vocal that stays emotionally exposed rather than excessively polished.', 'The final album maintains different songwriter identities through a common midrange language and rhythm-section weight.'],
    processEs: ['Sesiones largas y numerosos overdubs exigieron manejo cuidadoso de cinta y decisiones frecuentes de submezcla.', 'En “Go Your Own Way”, la energía de batería y guitarras convive con una voz emocionalmente expuesta, no excesivamente pulida.', 'El álbum conserva distintas identidades autorales mediante un lenguaje común de medios y peso rítmico.'],
    lessonEn: 'In dense sessions, commit. Printing submixes and choosing priorities can produce more musical clarity than endless optional tracks.',
    lessonEs: 'En sesiones densas, comprométete. Imprimir submezclas y elegir prioridades puede dar más claridad musical que conservar opciones infinitas.',
    sources: [{label:'Sound On Sound: Go Your Own Way',url:'https://www.soundonsound.com/techniques/classic-tracks-fleetwood-mac-go-your-own-way'},{label:'Album credits',url:'https://en.wikipedia.org/wiki/Rumours_(album)'},{label:'Worldwide sales methodology',url:'https://en.wikipedia.org/wiki/List_of_best-selling_albums'}],
  },
  {
    slug: 'bat-out-of-hell-meat-loaf-mixing-mastering', artist: 'Meat Loaf', album: 'Bat Out of Hell', year: 1977,
    producer: 'Todd Rundgren', mix: 'Todd Rundgren and John Jansen', master: 'Greg Calbi',
    contextEn: 'The record translates theatrical writing into rock by exaggerating changes in scale: whispers against massed vocals, piano against saturated guitars, intimacy against spectacle.',
    contextEs: 'El disco traduce escritura teatral al rock exagerando cambios de escala: susurros frente a coros masivos, piano frente a guitarras saturadas, intimidad frente a espectáculo.',
    processEn: ['Rundgren arranged and produced with deliberate theatrical excess, but the sections remain readable because entrances are tightly staged.', 'Layered guitars and voices work as orchestration; not every layer is full-range or equally loud.', 'Calbi’s mastering had to preserve long-form dynamics while making the dense peaks translate on vinyl.'],
    processEs: ['Rundgren arregló y produjo con exceso teatral deliberado, pero las secciones siguen legibles porque las entradas están cuidadosamente escenificadas.', 'Las capas de guitarras y voces funcionan como orquestación; no todas tienen rango completo ni el mismo nivel.', 'El mastering de Calbi debía preservar dinámica de formas largas y hacer que los picos densos funcionaran en vinilo.'],
    lessonEn: 'Big does not mean everything at maximum. Reserve the widest, brightest and densest presentation for the moments that earn it.',
    lessonEs: 'Grande no significa todo al máximo. Reserva la presentación más amplia, brillante y densa para los momentos que la merecen.',
    sources: [{label:'Album credits',url:'https://en.wikipedia.org/wiki/Bat_Out_of_Hell'},{label:'Greg Calbi discography',url:'https://sterling-sound.com/engineer/greg-calbi/'},{label:'Worldwide sales methodology',url:'https://en.wikipedia.org/wiki/List_of_best-selling_albums'}],
  },
  {
    slug: 'saturday-night-fever-mixing-mastering', artist: 'Bee Gees / Various Artists', album: 'Saturday Night Fever', year: 1977,
    producer: 'Bee Gees, Albhy Galuten, Karl Richardson and multiple source-track producers', mix: 'Karl Richardson, Albhy Galuten and others', master: 'Multiple original release credits; edition-dependent',
    contextEn: 'Its dance-floor continuity comes from tempo, groove, bass discipline and sequencing even though the soundtrack combines recordings from different artists and periods.',
    contextEs: 'Su continuidad de pista de baile nace del tempo, groove, disciplina del bajo y secuencia, aunque la banda sonora reúne grabaciones de artistas y épocas distintas.',
    processEn: ['The famous “Stayin’ Alive” drum loop was assembled from tape, creating a stable pulse before modern grid editing existed.', 'Falsetto vocals sit above a tightly controlled bass-and-kick foundation, leaving the midrange available for strings and guitars.', 'Album assembly makes older catalog tracks coexist with new disco productions through sequencing and level management.'],
    processEs: ['El célebre loop de batería de “Stayin’ Alive” se construyó con cinta, creando pulso estable antes de la edición moderna a cuadrícula.', 'Las voces en falsete se ubican sobre una base de bajo y bombo controlada, dejando medios para cuerdas y guitarras.', 'La construcción del álbum hace convivir catálogo anterior y producciones disco nuevas mediante secuencia y control de nivel.'],
    lessonEn: 'For dance music, stabilize the rhythmic anchor before widening or brightening the mix. Movement depends on a reliable center.',
    lessonEs: 'En música de baile, estabiliza el ancla rítmica antes de ampliar o iluminar la mezcla. El movimiento depende de un centro confiable.',
    sources: [{label:'Sound On Sound: Stayin’ Alive',url:'https://www.soundonsound.com/techniques/classic-tracks-bee-gees-stayin-alive'},{label:'Album credits',url:'https://en.wikipedia.org/wiki/Saturday_Night_Fever_(soundtrack)'},{label:'Worldwide sales methodology',url:'https://en.wikipedia.org/wiki/List_of_best-selling_albums'}],
  },
  {
    slug: 'led-zeppelin-iv-mixing-mastering', artist: 'Led Zeppelin', album: 'Led Zeppelin IV', year: 1971,
    producer: 'Jimmy Page', mix: 'Jimmy Page and Andy Johns', master: 'George “Porky” Peckham (original UK lacquer)',
    contextEn: 'Room acoustics became part of the instrumentation. The album moves between close folk textures and monumental rock without making either feel artificially standardized.',
    contextEs: 'La acústica de la sala se volvió parte de la instrumentación. El álbum pasa de texturas folk cercanas a rock monumental sin estandarizarlas artificialmente.',
    processEn: ['At Headley Grange, “When the Levee Breaks” placed drums in a tall hallway and microphones upstairs to capture delayed room energy.', 'Compression and echo emphasized the architecture, but Bonham’s performance remained the source of weight.', 'The original UK lacquer cut by George Peckham is distinct from later remasters; mastering comparisons must name the edition.'],
    processEs: ['En Headley Grange, “When the Levee Breaks” ubicó la batería en un vestíbulo alto y micrófonos arriba para capturar energía retardada de sala.', 'Compresión y eco enfatizaron la arquitectura, pero la interpretación de Bonham siguió siendo la fuente del peso.', 'El corte UK original de George Peckham es distinto de remasters posteriores; toda comparación debe nombrar la edición.'],
    lessonEn: 'Capture depth at the source when possible. Artificial reverb can enhance a convincing space, but it rarely replaces one completely.',
    lessonEs: 'Captura profundidad en la fuente cuando sea posible. La reverb artificial puede reforzar un espacio convincente, pero rara vez lo reemplaza por completo.',
    sources: [{label:'Making of When the Levee Breaks',url:'https://www.musicradar.com/artists/one-night-zeppelin-were-all-going-down-the-boozer-and-i-said-you-guys-bugger-off-but-bonzo-you-stay-behind-because-ive-got-an-idea-the-genius-behind-john-bonhams-towering-when-the-levee-breaks-drum-sound'},{label:'Album credits',url:'https://en.wikipedia.org/wiki/Led_Zeppelin_IV'},{label:'Worldwide sales methodology',url:'https://en.wikipedia.org/wiki/List_of_best-selling_albums'}],
  },
  {
    slug: 'bad-michael-jackson-mixing-mastering', artist: 'Michael Jackson', album: 'Bad', year: 1987,
    producer: 'Quincy Jones and Michael Jackson', mix: 'Bruce Swedien', master: 'Bernie Grundman',
    contextEn: 'Bad extends the Thriller team’s philosophy with denser digital-era arrangements, sharper transients and carefully sculpted vocal layers.',
    contextEs: 'Bad amplía la filosofía del equipo de Thriller con arreglos más densos de era digital, transitorios definidos y capas vocales cuidadosamente modeladas.',
    processEn: ['Swedien used the Harrison-console workflow and meticulous track organization to maintain depth inside increasingly complex arrangements.', 'Jackson’s rhythmic breaths, consonants and ad-libs are mixed as percussion as well as narrative.', 'Grundman’s mastering maintained punch and front-to-back depth across a brighter late-1980s palette.'],
    processEs: ['Swedien usó su flujo con consola Harrison y organización meticulosa para conservar profundidad dentro de arreglos más complejos.', 'Respiraciones, consonantes y ad-libs de Jackson se mezclan como percusión y como narrativa.', 'El mastering de Grundman mantuvo golpe y profundidad en una paleta más brillante de finales de los ochenta.'],
    lessonEn: 'Treat vocal details as arrangement elements. De-essing and editing should preserve rhythmic intent, not sterilize it.',
    lessonEs: 'Trata los detalles vocales como elementos de arreglo. De-essing y edición deben preservar la intención rítmica, no esterilizarla.',
    sources: [{label:'Bernie Grundman masterclass',url:'https://daily.redbullmusicacademy.com/2017/10/bernie-grundman-mastering-masterclass/'},{label:'Bruce Swedien career',url:'https://www.soundonsound.com/news/bruce-swedien-1934-2020'},{label:'Album credits',url:'https://en.wikipedia.org/wiki/Bad_(album)'}],
  },
  {
    slug: 'jagged-little-pill-mixing-mastering', artist: 'Alanis Morissette', album: 'Jagged Little Pill', year: 1995,
    producer: 'Glen Ballard', mix: 'Christopher Fogel', master: 'Chris Bellman',
    contextEn: 'Intimate writing, programmed foundations and live-band energy coexist because the production protects the urgency of Morissette’s performance.',
    contextEs: 'La escritura íntima, bases programadas y energía de banda conviven porque la producción protege la urgencia interpretativa de Morissette.',
    processEn: ['Ballard and Morissette developed songs quickly, preserving demo immediacy instead of rebuilding every idea into a polished abstraction.', 'Fogel balanced aggressive guitars with a forward, intelligible vocal and used contrast between verses and choruses to create scale.', 'Bellman’s master unified material that ranges from sparse confession to dense alternative rock.'],
    processEs: ['Ballard y Morissette desarrollaron canciones rápidamente, preservando la inmediatez de demo en lugar de reconstruir cada idea.', 'Fogel equilibró guitarras agresivas con voz frontal e inteligible y usó contraste entre estrofas y coros para crear escala.', 'El master de Bellman unificó material desde confesión escasa hasta rock alternativo denso.'],
    lessonEn: 'Do not edit away the reason a performance connects. Technical cleanup should support urgency, not replace it.',
    lessonEs: 'No edites hasta eliminar la razón por la que una interpretación conecta. La limpieza técnica debe apoyar la urgencia, no reemplazarla.',
    sources: [{label:'Sound On Sound: Christopher Fogel',url:'https://www.soundonsound.com/people/christopher-fogel-alanis-morissettes-jagged-little-pill'},{label:'Album credits',url:'https://en.wikipedia.org/wiki/Jagged_Little_Pill'},{label:'Worldwide sales methodology',url:'https://en.wikipedia.org/wiki/List_of_best-selling_albums'}],
  },
  {
    slug: 'dirty-dancing-soundtrack-mixing-mastering', artist: 'Various Artists', album: 'Dirty Dancing', year: 1987,
    producer: 'Jimmy Ienner (executive) with Michael Lloyd and multiple track producers', mix: 'Multiple engineers by track', master: 'Soundtrack edition credits vary',
    contextEn: 'The soundtrack combines newly produced hits with older recordings. Its success is an example of curation and emotional sequencing as production tools.',
    contextEs: 'La banda sonora combina éxitos nuevos con grabaciones antiguas. Su éxito demuestra que curaduría y secuencia emocional también son herramientas de producción.',
    processEn: ['Michael Lloyd supervised and produced key new tracks including “(I’ve Had) The Time of My Life” and “She’s Like the Wind.”', 'The new productions use clear duet placement, large chorus lift and cinematic dynamics to serve specific scenes.', 'Catalog recordings were not forced into one modern texture; sequence and mastering made the era changes feel purposeful.'],
    processEs: ['Michael Lloyd supervisó y produjo temas nuevos clave como “(I’ve Had) The Time of My Life” y “She’s Like the Wind”.', 'Las producciones nuevas usan ubicación clara del dueto, gran elevación del coro y dinámica cinematográfica para servir a escenas específicas.', 'Las grabaciones de catálogo no se forzaron a una textura moderna; secuencia y mastering hicieron intencionales los cambios de época.'],
    lessonEn: 'When sources differ radically, prioritize emotional continuity over spectral sameness.',
    lessonEs: 'Cuando las fuentes difieren radicalmente, prioriza continuidad emocional por encima de igualdad espectral.',
    sources: [{label:'Michael Lloyd oral history',url:'https://www.namm.org/library/oral-history/michael-lloyd'},{label:'Rolling Stone soundtrack history',url:'https://www.rollingstone.com/feature/the-dirty-dancing-soundtrack-10-things-you-didnt-know-203885/'},{label:'Worldwide sales methodology',url:'https://en.wikipedia.org/wiki/List_of_best-selling_albums'}],
  },
  {
    slug: 'falling-into-you-celine-dion-mixing-mastering', artist: 'Céline Dion', album: 'Falling into You', year: 1996,
    producer: 'David Foster, Humberto Gatica, Jean-Jacques Goldman and multiple producers', mix: 'Humberto Gatica, Steve MacMillan and multiple mixers', master: 'Vlado Meller',
    contextEn: 'The album’s many producers and studios are held together by Dion’s vocal identity, orchestral scale and a consistent commercial-pop finish.',
    contextEs: 'Sus numerosos productores y estudios se mantienen unidos por la identidad vocal de Dion, escala orquestal y acabado pop comercial consistente.',
    processEn: ['Lead vocals are treated as the fixed point while arrangements move from intimate ballad to large rock-pop production.', 'Gatica and the other mixers create depth by separating voice, rhythm section, keyboards and orchestra into readable planes.', 'Meller’s mastering provides a common level and tonal frame across a very long, multi-producer album.'],
    processEs: ['La voz principal funciona como punto fijo mientras los arreglos pasan de balada íntima a gran producción rock-pop.', 'Gatica y los demás mezcladores crean profundidad separando voz, ritmo, teclados y orquesta en planos legibles.', 'El mastering de Meller aporta nivel y marco tonal comunes a un álbum largo con múltiples productores.'],
    lessonEn: 'On multi-producer albums, define one anchor—often the lead vocal—and judge every mix against that anchor before mastering.',
    lessonEs: 'En álbumes multiproductor, define un ancla —a menudo la voz principal— y evalúa cada mezcla respecto a ella antes del mastering.',
    sources: [{label:'Album studios and producers',url:'https://en.wikipedia.org/wiki/Falling_into_You'},{label:'Vlado Meller interview',url:'https://www.soundonsound.com/people/vlado-meller'},{label:'Worldwide sales methodology',url:'https://en.wikipedia.org/wiki/List_of_best-selling_albums'}],
  },
  {
    slug: 'dangerous-michael-jackson-mixing-mastering', artist: 'Michael Jackson', album: 'Dangerous', year: 1991,
    producer: 'Michael Jackson, Teddy Riley, Bill Bottrell and Bruce Swedien', mix: 'Bruce Swedien, Teddy Riley, Bill Bottrell and collaborators', master: 'Bernie Grundman',
    contextEn: 'Dangerous changed production teams and embraced new jack swing while preserving Jackson’s demand for a distinct sonic identity on every song.',
    contextEs: 'Dangerous cambió de equipos y abrazó el new jack swing, conservando la exigencia de Jackson de dar identidad sonora propia a cada canción.',
    processEn: ['Riley’s programmed rhythms use tightly separated kick, snare and syncopated details to make complex grooves readable.', 'Bottrell’s rock-oriented work and Swedien’s spatial depth create contrast across the 76-minute sequence.', 'Grundman completed the master after a multi-studio production, supplying a common playback frame without erasing those contrasts.'],
    processEs: ['Los ritmos programados de Riley separan bombo, caja y detalles sincopados para hacer legibles grooves complejos.', 'El enfoque rock de Bottrell y la profundidad de Swedien crean contraste en una secuencia de 76 minutos.', 'Grundman completó el master tras producción multiestudio, dando un marco común sin borrar contrastes.'],
    lessonEn: 'A long album needs recurring anchors—vocal scale, low-end rules and peak behavior—more than identical effects.',
    lessonEs: 'Un álbum largo necesita anclas recurrentes —escala vocal, reglas de graves y comportamiento de picos— más que efectos idénticos.',
    sources: [{label:'Dangerous production history',url:'https://en.wikipedia.org/wiki/Dangerous_(Michael_Jackson_album)'},{label:'Michael Jackson at Bernie Grundman Mastering',url:'https://audiomediainternational.com/michael-jackson-mastered-at-bernie-grundman-mastering/'},{label:'Worldwide sales methodology',url:'https://en.wikipedia.org/wiki/List_of_best-selling_albums'}],
  },
  {
    slug: '21-adele-mixing-mastering', artist: 'Adele', album: '21', year: 2011,
    producer: 'Adele with Paul Epworth, Rick Rubin, Jim Abbiss and others', mix: 'Tom Elmhirst, Jim Abbiss, Ian Dowling and others', master: 'Tom Coyne',
    contextEn: 'The album changes producers without losing intimacy. Vocal storytelling is the invariant; production expands or contracts around it.',
    contextEs: 'El álbum cambia de productores sin perder intimidad. La narrativa vocal es la constante; la producción se expande o contrae a su alrededor.',
    processEn: ['Tom Elmhirst’s mixes keep consonants and breath detail present while controlling the power of Adele’s upper register.', '“Rolling in the Deep” builds weight through layered rhythm and response vocals; “Someone Like You” protects the instability of voice and piano.', 'Tom Coyne’s master creates commercial continuity across deliberately different production aesthetics.'],
    processEs: ['Las mezclas de Tom Elmhirst mantienen consonantes y respiración presentes mientras controlan la potencia del registro alto de Adele.', '“Rolling in the Deep” construye peso con capas rítmicas y voces de respuesta; “Someone Like You” protege la fragilidad de voz y piano.', 'El master de Tom Coyne crea continuidad comercial entre estéticas deliberadamente distintas.'],
    lessonEn: 'Use automation and selective dynamic control to keep an expressive vocal close; a single aggressive compressor setting is rarely the whole answer.',
    lessonEs: 'Usa automatización y control dinámico selectivo para mantener cerca una voz expresiva; un único compresor agresivo rara vez es toda la respuesta.',
    sources: [{label:'21 personnel and mix credits',url:'https://en.wikipedia.org/wiki/21_(Adele_album)'},{label:'Tom Elmhirst interview',url:'https://www.gear-club.net/episodes/2019/tom-elmhirst'},{label:'Worldwide sales methodology',url:'https://en.wikipedia.org/wiki/List_of_best-selling_albums'}],
  },
  {
    slug: 'the-beatles-1-remastering-compilation', artist: 'The Beatles', album: '1', year: 2000,
    producer: 'George Martin (original recordings); compilation by George Martin, Paul McCartney, George Harrison and Ringo Starr', mix: 'Multiple original Abbey Road mixes', master: 'Peter Mew and Abbey Road team for the 2000 edition; later editions differ',
    contextEn: 'This compilation places recordings from 1962 to 1970 on one disc. The mastering challenge is historical continuity, not making every era sound contemporary.',
    contextEs: 'La recopilación reúne grabaciones de 1962 a 1970. El reto de mastering es continuidad histórica, no hacer que todas las épocas suenen contemporáneas.',
    processEn: ['Original mixes reflect rapid changes from twin-track recording to elaborate multitrack production.', 'The 2000 compilation was remastered specifically for release at Abbey Road under Peter Mew’s supervision.', 'Later 2009-remaster and 2015-remix-derived editions sound different, so any technical claim must identify the edition.'],
    processEs: ['Las mezclas originales reflejan el salto desde grabación twin-track hasta producción multipista elaborada.', 'La recopilación de 2000 fue remasterizada específicamente en Abbey Road bajo supervisión de Peter Mew.', 'Ediciones posteriores basadas en remasters de 2009 y remixes de 2015 suenan distintas; toda afirmación técnica debe identificar la versión.'],
    lessonEn: 'For archival albums, preserve era changes while controlling only the jumps that interrupt listening.',
    lessonEs: 'En álbumes de archivo, conserva los cambios de época y controla solo los saltos que interrumpen la escucha.',
    sources: [{label:'The Beatles 1 credits',url:'https://www.allmusic.com/album/1-mw0000096318'},{label:'Abbey Road remastering overview',url:'https://www.thebeatles.com/beatles-1'},{label:'Worldwide sales methodology',url:'https://en.wikipedia.org/wiki/List_of_best-selling_albums'}],
  },
  {
    slug: 'metallica-black-album-mixing-mastering', artist: 'Metallica', album: 'Metallica (The Black Album)', year: 1991,
    producer: 'Bob Rock with James Hetfield and Lars Ulrich', mix: 'Randy Staub and Mike Tacci with Bob Rock', master: 'George Marino',
    contextEn: 'The band traded thrash density for slower, heavier arrangements. The result feels larger because fewer events are allowed to occupy more space.',
    contextEs: 'La banda cambió densidad thrash por arreglos más lentos y pesados. El resultado parece mayor porque menos eventos ocupan más espacio.',
    processEn: ['Bob Rock captured performances with more live interaction and a more physical drum sound than the band’s previous album.', 'Multiple rhythm-guitar performances create width and mass; careful midrange management keeps the center open for voice, snare and bass.', 'George Marino’s original mastering presented weight without removing the pauses and attacks that define the riffs.'],
    processEs: ['Bob Rock capturó interpretaciones con más interacción en vivo y batería más física que en el álbum anterior.', 'Múltiples guitarras rítmicas crean amplitud y masa; el manejo cuidadoso de medios deja centro para voz, caja y bajo.', 'El mastering original de George Marino presentó peso sin eliminar pausas y ataques que definen los riffs.'],
    lessonEn: 'Heaviness is contrast between impact and space. If every subdivision is full, the downbeat cannot feel larger.',
    lessonEs: 'La pesadez nace del contraste entre impacto y espacio. Si cada subdivisión está llena, el pulso fuerte no puede sentirse mayor.',
    sources: [{label:'Black Album production credits',url:'https://en.wikipedia.org/wiki/Metallica_(album)'},{label:'Randy Staub guitar-width technique',url:'https://www.guitarworld.com/gear/accessories/srs-wow-thing'},{label:'Worldwide sales methodology',url:'https://en.wikipedia.org/wiki/List_of_best-selling_albums'}],
  },
  {
    slug: 'lets-talk-about-love-celine-dion-mixing-mastering', artist: 'Céline Dion', album: 'Let’s Talk About Love', year: 1997,
    producer: 'David Foster, George Martin, Jim Steinman, Walter Afanasieff and others', mix: 'Humberto Gatica and additional track mixers', master: 'Vlado Meller',
    contextEn: 'A global pop album with many producers achieves identity through vocal scale, orchestral depth and consistent tonal finishing.',
    contextEs: 'Un álbum pop global con muchos productores logra identidad mediante escala vocal, profundidad orquestal y acabado tonal consistente.',
    processEn: ['Humberto Gatica mixed most tracks and engineered lead vocals, creating a repeatable center across different arrangements.', 'Orchestral and synthesized layers are separated by depth and register so the vocal remains the emotional foreground.', 'Vlado Meller’s mastering reconciled multiple rooms and production teams for a continuous commercial sequence.'],
    processEs: ['Humberto Gatica mezcló la mayoría de temas y grabó voces principales, creando un centro repetible entre arreglos distintos.', 'Capas orquestales y sintetizadas se separan por profundidad y registro para que la voz permanezca al frente emocional.', 'El mastering de Vlado Meller concilió salas y equipos distintos en una secuencia comercial continua.'],
    lessonEn: 'If an album uses many producers, standardize delivery specs and reference level before the final mastering session.',
    lessonEs: 'Si un álbum usa muchos productores, estandariza especificaciones de entrega y nivel de referencia antes del mastering final.',
    sources: [{label:'Album production credits',url:'https://en.wikipedia.org/wiki/Let%27s_Talk_About_Love'},{label:'Session credits',url:'https://sessiondays.com/2020/09/17/1997-celine-dion-lets-talk-love/'},{label:'Vlado Meller interview',url:'https://www.soundonsound.com/people/vlado-meller'}],
  },
];

const author = {
  name: 'MixingMusic Editorial',
  avatar: '/logo-brand.png',
  bio: 'Research-led guides about recording, mixing and mastering for independent artists.',
  bioEs: 'Guías basadas en investigación sobre grabación, mezcla y mastering para artistas independientes.',
};

const sourceList = (sources: AlbumStudy['sources']) => sources.map((source) => `- [${source.label}](${source.url})`).join('\n');

export const historicAlbumArticles: BlogArticle[] = studies.map((study, index) => ({
  id: `historic-album-${String(index + 1).padStart(2, '0')}`,
  slug: study.slug,
  title: `How ${study.album} by ${study.artist} Was Mixed and Mastered`,
  titleEs: `Cómo se mezcló y masterizó ${study.album} de ${study.artist}`,
  excerpt: `${study.album} (${study.year}): documented production, mixing and mastering credits, the sonic decisions that shaped it, and practical lessons for modern sessions.`,
  excerptEs: `${study.album} (${study.year}): créditos documentados de producción, mezcla y mastering, decisiones que definieron su sonido y lecciones para sesiones actuales.`,
  content: `# How ${study.album} by ${study.artist} Was Mixed and Mastered

> **Editorial note:** worldwide album-sales totals are estimates and rankings change. This study uses documented credits and interviews; it does not invent plugin chains, secret presets or exact settings that the team has never published.

## Album and production credits

- **Artist:** ${study.artist}
- **Album:** ${study.album}
- **Release:** ${study.year}
- **Producer(s):** ${study.producer}
- **Mixing:** ${study.mix}
- **Mastering:** ${study.master}

${study.contextEn}

## What the production and mix reveal

${study.processEn.map((item, itemIndex) => `${itemIndex + 1}. ${item}`).join('\n')}

## What modern mixers can learn

${study.lessonEn}

Use a level-matched reference when applying this lesson. Compare vocal position, bass extension, transient shape, stereo movement and section-to-section contrast—not just loudness. A historic record is a reference for decisions, not a preset to copy blindly.

## Applying the idea in MixingMusic

Upload stems when you need a new balance, or upload a stereo premix when the balance already works. Start with the **Neutral** preset for material that already contains the intended effects; then adjust only what the song objectively needs. For a collection of songs, Album Mode is the safer place to evaluate continuity without forcing every track into identical processing.

## Sources and further reading

${sourceList(study.sources)}
`,
  contentEs: `# Cómo se mezcló y masterizó ${study.album} de ${study.artist}

> **Nota editorial:** las cifras mundiales de ventas son estimaciones y el orden puede cambiar. Este estudio usa créditos e entrevistas documentadas; no inventa cadenas de plugins, presets secretos ni valores exactos que el equipo nunca publicó.

## Ficha y créditos de producción

- **Artista:** ${study.artist}
- **Álbum:** ${study.album}
- **Lanzamiento:** ${study.year}
- **Productor(es):** ${study.producer}
- **Mezcla:** ${study.mix}
- **Mastering:** ${study.master}

${study.contextEs}

## Lo que revela la producción y la mezcla

${study.processEs.map((item, itemIndex) => `${itemIndex + 1}. ${item}`).join('\n')}

## Qué puede aprender un mezclador actual

${study.lessonEs}

Aplica esta lección usando una referencia con volumen igualado. Compara posición vocal, extensión del grave, forma de transitorios, movimiento estéreo y contraste entre secciones; no solo volumen. Un disco histórico es referencia de decisiones, no un preset para copiar a ciegas.

## Cómo aplicar la idea en MixingMusic

Sube stems cuando necesites construir un balance nuevo o una premezcla estéreo cuando el balance ya funcione. Empieza con el preset **Neutro** si el material ya contiene los efectos deseados y ajusta solo lo que la canción necesite objetivamente. Para varias canciones, el Modo Álbum permite evaluar continuidad sin forzar procesamiento idéntico.

## Fuentes y lectura adicional

${sourceList(study.sources)}
`,
  category: 'mixing-mastering-history',
  categoryName: 'Iconic Album Sound',
  categoryNameEs: 'Sonido de álbumes históricos',
  image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=82',
  author,
  publishDate: `August ${20 - Math.floor(index / 2)}, 2026`,
  readTime: 8,
  tags: [study.artist, study.album, 'Mixing', 'Mastering', 'Album production'],
  tagsEs: [study.artist, study.album, 'Mezcla', 'Mastering', 'Producción de álbumes'],
  seoKeywords: {
    en: [`how ${study.album} was mixed`, `${study.album} mastering`, `${study.artist} production`, 'best selling albums mixing techniques'],
    es: [`cómo se mezcló ${study.album}`, `mastering de ${study.album}`, `producción de ${study.artist}`, 'técnicas de mezcla discos más vendidos'],
  },
  metaDescription: `How ${study.album} by ${study.artist} was produced, mixed and mastered: documented credits, sonic decisions and practical lessons for modern music production.`,
  metaDescriptionEs: `Cómo se produjo, mezcló y masterizó ${study.album} de ${study.artist}: créditos documentados, decisiones sonoras y lecciones prácticas.`,
}));
