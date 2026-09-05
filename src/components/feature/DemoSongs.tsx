import { Link } from 'react-router-dom';
import './demo-songs.css';

type DemoSongsProps = {
  english?: boolean;
  home?: boolean;
};

const soundCloudPlayer = (trackId: string) =>
  `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A${trackId}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`;

export default function DemoSongs({ english = false, home = false }: DemoSongsProps) {
  const copy = english
    ? {
        kicker: 'HEAR THE RESULT',
        title: 'Songs mixed and mastered with MixingMusic.',
        intro: 'Listen to finished music on SoundCloud and Spotify. These releases show how MixingMusic can support the final sound while the artist keeps the creative decisions.',
        soundcloud: 'Listen on SoundCloud',
        spotifyTitle: 'Dany Palacio album on Spotify',
        spotify: 'Listen on Spotify',
        link: 'Explore all demo songs',
      }
    : {
        kicker: 'ESCUCHA EL RESULTADO',
        title: 'Canciones mezcladas y masterizadas con MixingMusic.',
        intro: 'Escucha música terminada en SoundCloud y Spotify. Estos lanzamientos muestran cómo MixingMusic puede apoyar el sonido final mientras el artista conserva las decisiones creativas.',
        soundcloud: 'Escuchar en SoundCloud',
        spotifyTitle: 'Álbum de Dany Palacio en Spotify',
        spotify: 'Escuchar en Spotify',
        link: 'Explorar todas las canciones demo',
      };

  return (
    <section className={`demo-songs-section${home ? ' demo-songs-home' : ''}`} aria-labelledby={home ? 'home-demo-songs-title' : 'demo-songs-player-title'}>
      <div className="demo-songs-heading">
        <span>{copy.kicker}</span>
        <h2 id={home ? 'home-demo-songs-title' : 'demo-songs-player-title'}>{copy.title}</h2>
        <p>{copy.intro}</p>
      </div>

      <div className="demo-songs-grid">
        <article className="demo-song-card demo-song-soundcloud">
          <h3>Al Otro Lado del Silencio</h3>
          <iframe
            title="Al Otro Lado del Silencio — DanyPalacio en SoundCloud"
            src={soundCloudPlayer('2394981195')}
            width="100%"
            height="166"
            scrolling="no"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            loading="lazy"
          />
          <a href="https://soundcloud.com/danipalacio/al-otor-lado-del-silencio" target="_blank" rel="noreferrer">
            {copy.soundcloud} <span aria-hidden="true">↗</span>
          </a>
        </article>

        <article className="demo-song-card demo-song-spotify">
          <h3>{copy.spotifyTitle}</h3>
          <iframe
            title={copy.spotifyTitle}
            src="https://open.spotify.com/embed/album/5e7yQsYIvc7Eww3HLlk5hs?utm_source=generator"
            width="100%"
            height="352"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
          <a href="https://open.spotify.com/album/5e7yQsYIvc7Eww3HLlk5hs" target="_blank" rel="noreferrer">
            {copy.spotify} <span aria-hidden="true">↗</span>
          </a>
        </article>

        <article className="demo-song-card demo-song-soundcloud">
          <h3>Igual Que Ayer</h3>
          <iframe
            title="Igual Que Ayer — DanyPalacio en SoundCloud"
            src={soundCloudPlayer('2394551082')}
            width="100%"
            height="166"
            scrolling="no"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            loading="lazy"
          />
          <a href="https://soundcloud.com/danipalacio/igual-que-ayer" target="_blank" rel="noreferrer">
            {copy.soundcloud} <span aria-hidden="true">↗</span>
          </a>
        </article>
      </div>

      {home && <Link className="demo-songs-link" to="/canciones-demo-mixing-music">{copy.link} <span aria-hidden="true">→</span></Link>}
    </section>
  );
}
