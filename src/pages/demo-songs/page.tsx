import { Link, useLocation } from 'react-router-dom';
import DemoSongs from '../../components/feature/DemoSongs';
import './demo-songs-page.css';

export default function DemoSongsPage() {
  const english = useLocation().pathname.startsWith('/en/');

  return (
    <main className="demo-songs-page">
      <header className="demo-songs-hero">
        <span>{english ? 'MIXINGMUSIC DEMO SONGS' : 'CANCIONES DEMO DE MIXINGMUSIC'}</span>
        <h1>{english ? 'MixingMusic demo songs: hear real mixes and masters.' : 'Canciones demo de MixingMusic: escucha mezclas y masters reales.'}</h1>
        <p>{english ? 'Explore finished songs mixed and mastered with MixingMusic.AI. Listen directly on SoundCloud and Spotify to hear the final sound in released music.' : 'Explora canciones terminadas que fueron mezcladas y masterizadas con MixingMusic.AI. Escúchalas directamente en SoundCloud y Spotify para conocer el sonido final en música publicada.'}</p>
      </header>

      <DemoSongs english={english} />

      <section className="demo-songs-explanation" aria-labelledby="demo-songs-explanation-title">
        <div>
          <span>{english ? 'FROM AUDIO TO RELEASE' : 'DEL AUDIO AL LANZAMIENTO'}</span>
          <h2 id="demo-songs-explanation-title">{english ? 'Mixing and mastering that support the artist’s intention.' : 'Mezcla y mastering al servicio de la intención del artista.'}</h2>
        </div>
        <div>
          <p>{english ? 'MixingMusic helps balance tracks, shape dynamics, refine tone and prepare the final delivery. The artist still chooses the performance, arrangement and creative direction.' : 'MixingMusic ayuda a equilibrar pistas, trabajar la dinámica, refinar el tono y preparar la entrega final. El artista sigue eligiendo la interpretación, el arreglo y la dirección creativa.'}</p>
          <p>{english ? 'Every song is different. These demos are listening references, not a promise that one preset will make all productions sound the same.' : 'Cada canción es diferente. Estas demos son referencias de escucha, no una promesa de que un preset hará que todas las producciones suenen iguales.'}</p>
          <Link to="/auth/register?mode=master">{english ? 'Try MixingMusic free' : 'Probar MixingMusic gratis'} <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </main>
  );
}
