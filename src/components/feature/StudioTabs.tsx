import { useNavigate } from 'react-router-dom';
import './studio-shell.css';

export type StudioTabId = 'mezclar' | 'mejorar' | 'mastering' | 'album';

interface TabDef {
  id: StudioTabId;
  label: string;
  /** Omit while the destination doesn't exist yet — renders disabled with a "Pronto" badge. */
  path?: string;
}

const TABS: TabDef[] = [
  { id: 'mezclar', label: 'Mezclar', path: '/' },
  { id: 'mejorar', label: 'Mejorar mezcla' },
  { id: 'mastering', label: 'Mastering', path: '/mastering' },
  { id: 'album', label: 'Álbum', path: '/mastering/album' },
];

/**
 * Shared top-level navigation between the mixer, mastering and album tools.
 * Each tool is still its own independent screen — switching tabs opens that
 * tool fresh, it does not carry the in-progress mix across screens (that
 * needs a shared project store, tracked separately).
 */
export default function StudioTabs({ active }: { active: StudioTabId }) {
  const navigate = useNavigate();

  return (
    <nav className="studio-tabs-row" aria-label="Herramientas de MixingMusic">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`studio-tab${tab.id === active ? ' active' : ''}${!tab.path ? ' disabled' : ''}`}
          disabled={!tab.path}
          title={!tab.path ? 'Próximamente' : undefined}
          onClick={() => tab.path && navigate(tab.path)}
        >
          {tab.label}
          {!tab.path && <span className="studio-tab-soon">Pronto</span>}
        </button>
      ))}
    </nav>
  );
}
