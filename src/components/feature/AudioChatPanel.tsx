import { useState } from 'react';
import './studio-shell.css';

const SUGGESTIONS = ['Más claridad', 'Más calidez', 'Menos reverb', 'No toques la batería'];

/**
 * Persistent right-rail panel reserved for AudioChat (Anthropic-backed).
 * Visual shell only for now — no request is sent anywhere yet. Wiring it up
 * to a real conversation, with proposals you can listen to/apply/discard,
 * is a separate follow-up so nobody mistakes this for a working assistant.
 */
export default function AudioChatPanel() {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <>
      <button
        type="button"
        className="audio-chat-toggle"
        onClick={() => setCollapsed((value) => !value)}
        aria-expanded={!collapsed}
      >
        ✦ AudioChat
      </button>

      <aside className={`audio-chat-panel${collapsed ? ' collapsed' : ''}`} aria-label="AudioChat">
        <header className="audio-chat-head">
          <div className="audio-chat-avatar">✦</div>
          <div className="audio-chat-head-copy">
            <strong>Habla con AudioChat</strong>
            <span>Asistente de mezcla · Próximamente</span>
          </div>
          <button
            type="button"
            className="audio-chat-close"
            onClick={() => setCollapsed(true)}
            aria-label="Cerrar AudioChat"
          >
            ✕
          </button>
        </header>

        <div className="audio-chat-body">
          <p className="audio-chat-empty">
            Muy pronto vas a poder describir aquí cómo quieres que suene tu mezcla. AudioChat te
            propondrá ajustes que escuchas y comparas antes de aplicarlos — tú decides cada cambio.
          </p>
          <div className="audio-chat-suggestions">
            {SUGGESTIONS.map((suggestion) => (
              <span key={suggestion} className="audio-chat-chip">{suggestion}</span>
            ))}
          </div>
        </div>

        <div className="audio-chat-inputbar">
          <input type="text" placeholder="Muy pronto podrás escribir aquí…" disabled />
          <button type="button" disabled aria-label="Enviar">➤</button>
        </div>
      </aside>
    </>
  );
}
