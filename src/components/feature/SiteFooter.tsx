import { Link, Outlet } from 'react-router-dom';
import './site-footer.css';

export default function SiteLayout() {
  return <div className="site-v3-layout">
    <Outlet />
    <footer className="site-v3-footer">
      <div className="site-v3-footer-main">
        <Link to="/" className="site-v3-footer-brand"><img src="/logo-brand.png" alt="MixingMusic.AI" /><span>V3</span></Link>
        <p>Mezcla y mastering con inteligencia artificial, presets propios y control para el artista.</p>
        <nav aria-label="Enlaces del pie de página">
          <Link to="/pricing">Precios</Link>
          <Link to="/capacidades">Funciones</Link>
          <Link to="/conceptos-audio">Conceptos</Link>
          <Link to="/terms">Términos</Link>
          <Link to="/privacy">Privacidad</Link>
        </nav>
      </div>
      <div className="site-v3-network">
        <span>OTROS PROYECTOS DE IA</span>
        <a href="https://www.guitarraia.com" target="_blank" rel="noreferrer"><strong>GuitarraIA</strong><small>Tu asistente para tocar más →</small></a>
        <a href="https://www.catolicosgpt.com" target="_blank" rel="noreferrer"><strong>CatólicosGPT</strong><small>Inteligencia artificial católica →</small></a>
      </div>
      <div className="site-v3-footer-bottom"><span>© 2026 MixingMusic.AI</span><span>Global Recognition Award 2026 · Innovación en IA</span></div>
    </footer>
  </div>;
}
