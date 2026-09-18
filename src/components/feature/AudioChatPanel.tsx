import { useRef, useState } from 'react';
import './studio-shell.css';

export interface MixerChatStem {
  id: string;
  name: string;
  role: string;
  volume: number;
  pan: number;
  muted: boolean;
  locked: boolean;
}

export interface MixerChatState {
  stems: MixerChatStem[];
  master: {
    bassGain: number;
    midGain: number;
    highGain: number;
    reverbActive: boolean;
    delayActive: boolean;
    widenerActive: boolean;
  };
}

export interface MixerChatChange {
  target: 'stem' | 'master';
  stemId?: string;
  param: 'volume' | 'pan' | 'mute' | 'unmute' | 'bass' | 'mid' | 'high' | 'reverb' | 'delay' | 'widener';
  value: number;
}

export interface MixerChatBridge {
  /** Called fresh right before every send — never a stale snapshot. */
  getState: () => MixerChatState;
  applyChanges: (changes: MixerChatChange[]) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  proposal?: MixerChatChange[];
  appliedProposal?: boolean;
  /** Snapshot of what each changed param held right before this proposal was
   * applied — captured once, at apply time. Undo replays this snapshot
   * instead of re-deriving it from current state (which would already
   * reflect the applied change by the time Undo is clicked). */
  previousChanges?: MixerChatChange[];
  /** Names of locked stems a raw proposal wanted to touch, dropped before
   * the user ever saw them — surfaced as the "pista protegida" note instead
   * of silently vanishing. */
  protectedNames?: string[];
  time?: string;
}

const SUGGESTIONS = ['Más claridad', 'Más calidez', 'Menos reverb', 'No toques la batería'];

const PARAM_LABEL: Record<MixerChatChange['param'], string> = {
  volume: 'Volumen', pan: 'Paneo', mute: 'Silenciar', unmute: 'Reactivar',
  bass: 'Graves', mid: 'Medios', high: 'Agudos',
  reverb: 'Reverb', delay: 'Delay', widener: 'Ensanchador estéreo',
};

function describeChange(change: MixerChatChange, stemName?: string) {
  const label = PARAM_LABEL[change.param];
  if (change.target === 'stem') {
    const who = stemName ?? change.stemId ?? 'pista';
    if (change.param === 'mute' || change.param === 'unmute') return `${who}: ${label}`;
    if (change.param === 'pan') return `${who} · ${label} ${change.value > 0 ? `${change.value} (der.)` : change.value < 0 ? `${Math.abs(change.value)} (izq.)` : 'centro'}`;
    return `${who} · ${label} ${change.value > 0 ? '+' : ''}${change.value.toFixed(1)}dB`;
  }
  if (['reverb', 'delay', 'widener'].includes(change.param)) return `${label}: ${change.value ? 'activado' : 'desactivado'}`;
  return `${label} ${change.value > 0 ? '+' : ''}${change.value.toFixed(1)}dB`;
}

/**
 * Persistent right-rail AudioChat panel. Visual-only unless `mixer` is
 * passed (only MixEditor does, for now) — Mastering/Mejorar mezcla/Álbum
 * still get the "Próximamente" placeholder until they're wired the same way.
 *
 * `variant="v4"` renders the same real chat state/logic below as the
 * `.sidebar-astra` markup from the mixer-v4 reference design (always-visible
 * sidebar, no floating toggle) instead of the older collapsible overlay.
 */
export default function AudioChatPanel({ mixer, variant }: { mixer?: MixerChatBridge; variant?: 'v4' }) {
  const [collapsed, setCollapsed] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const isLive = Boolean(mixer);

  const scrollToBottom = () => {
    requestAnimationFrame(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' }));
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending || !mixer) return;
    setInput('');
    const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: trimmed, time };
    setMessages((prev) => [...prev, userMessage]);
    setSending(true);
    scrollToBottom();

    try {
      const supabaseUrl = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_URL;
      const anonKey = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anonKey) throw new Error('AUDIO_CHAT_NOT_CONFIGURED');

      const history = [...messages, userMessage].slice(-8).map((m) => ({ role: m.role, content: m.text }));
      const response = await fetch(`${supabaseUrl}/functions/v1/audio-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        body: JSON.stringify({ messages: history, state: mixer.getState() }),
      });
      if (!response.ok) throw new Error('AUDIO_CHAT_UNAVAILABLE');
      const data = await response.json();
      const rawProposal: MixerChatChange[] = Array.isArray(data.changes) ? data.changes : [];
      // The edge function already drops changes targeting a locked stem, but
      // filter again here too: the proposal card must never list something
      // that then silently doesn't happen when "Aplicar" is pressed.
      const lockedStems = mixer.getState().stems.filter((s) => s.locked);
      const lockedIds = new Set(lockedStems.map((s) => s.id));
      const proposal = rawProposal.filter((change) => change.target !== 'stem' || !lockedIds.has(change.stemId ?? ''));
      const touchedLockedIds = new Set(rawProposal.filter((c) => c.target === 'stem' && lockedIds.has(c.stemId ?? '')).map((c) => c.stemId));
      const protectedNames = lockedStems.filter((s) => touchedLockedIds.has(s.id)).map((s) => s.name);
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.reply || 'Listo.',
        proposal: proposal.length ? proposal : undefined,
        protectedNames: protectedNames.length ? protectedNames : undefined,
        time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: 'No pude conectar con AudioChat ahora mismo. Intenta de nuevo en un momento 🎧',
        time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  /** What each changed param holds *right now*, before it's touched — used
   * to build the Undo snapshot at apply time, while it's still accurate. */
  const snapshotFor = (changes: MixerChatChange[], state: MixerChatState): MixerChatChange[] =>
    changes.map((change) => {
      if (change.target === 'stem') {
        const stem = state.stems.find((s) => s.id === change.stemId);
        if (change.param === 'mute' || change.param === 'unmute') {
          return { ...change, param: stem?.muted ? 'mute' : 'unmute' } as MixerChatChange;
        }
        if (change.param === 'volume') return { ...change, value: stem?.volume ?? 0 };
        if (change.param === 'pan') return { ...change, value: stem?.pan ?? 0 };
      } else {
        if (change.param === 'bass') return { ...change, value: state.master.bassGain };
        if (change.param === 'mid') return { ...change, value: state.master.midGain };
        if (change.param === 'high') return { ...change, value: state.master.highGain };
        if (change.param === 'reverb') return { ...change, value: state.master.reverbActive ? 1 : 0 };
        if (change.param === 'delay') return { ...change, value: state.master.delayActive ? 1 : 0 };
        if (change.param === 'widener') return { ...change, value: state.master.widenerActive ? 1 : 0 };
      }
      return change;
    });

  const applyProposal = (message: ChatMessage) => {
    if (!mixer || !message.proposal) return;
    // Capture "before" values now, while they're still accurate — reading
    // them again after applyChanges would just return the new values, which
    // is the bug an earlier version of this had.
    const previousChanges = snapshotFor(message.proposal, mixer.getState());
    mixer.applyChanges(message.proposal);
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, appliedProposal: true, previousChanges } : m)));
  };

  const discardProposal = (message: ChatMessage) => {
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, proposal: undefined } : m)));
  };

  const undoProposal = (message: ChatMessage) => {
    if (!mixer || !message.previousChanges) return;
    mixer.applyChanges(message.previousChanges);
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, appliedProposal: false } : m)));
  };

  if (variant === 'v4') {
    return (
      <aside className="sidebar-astra" aria-label="AudioChat">
        <div className="astra-header">
          <div className="astra-avatar">
            <svg viewBox="0 0 24 24" fill="#ffffff"><path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6z"></path></svg>
          </div>
          <div className="astra-title">
            <div className="name">Audio<em>Chat</em></div>
            <div className="role">Asistente de mezcla{isLive ? '' : ' · Próximamente'}</div>
          </div>
          <button className="astra-menu-btn" aria-label="Más opciones" type="button" disabled title="Próximamente">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
          </button>
        </div>

        <div className="astra-body" ref={bodyRef}>
          {messages.length === 0 && (
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {isLive
                ? 'Cuéntame cómo quieres que suene tu mezcla. Te propongo ajustes de volumen, paneo, EQ o efectos — tú decides si aplicarlos.'
                : 'Muy pronto vas a poder describir aquí cómo quieres que suene tu mezcla. AudioChat te propondrá ajustes que escuchas y comparas antes de aplicarlos — tú decides cada cambio.'}
            </p>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`chat-msg ${message.role === 'user' ? 'from-user' : 'from-astra'}`}>
              <div className="meta">{message.role === 'user' ? 'Tú' : 'AudioChat'} {message.time && <span className="time">{message.time}</span>}</div>
              <div className="chat-bubble">{message.text}</div>

              {message.proposal && (
                <div className="proposal-card">
                  <div className="title">Propuesta de mezcla</div>
                  <div className="proposal-rows">
                    {message.proposal.map((change, index) => {
                      const stemName = mixer?.getState().stems.find((s) => s.id === change.stemId)?.name;
                      const label = stemName ?? PARAM_LABEL[change.param];
                      let value: string;
                      if (change.param === 'mute' || change.param === 'unmute') value = PARAM_LABEL[change.param];
                      else if (change.param === 'pan') value = change.value === 0 ? 'centro' : change.value > 0 ? `${change.value} der.` : `${Math.abs(change.value)} izq.`;
                      else if (['reverb', 'delay', 'widener'].includes(change.param)) value = change.value ? 'activado' : 'desactivado';
                      else value = `${change.value > 0 ? '+' : ''}${change.value.toFixed(1)} dB`;
                      return (
                        <div className="proposal-row" key={index}>
                          <span className="label">{label}{change.target === 'stem' ? ` · ${PARAM_LABEL[change.param]}` : ''}</span>
                          <span className="value">{value}</span>
                        </div>
                      );
                    })}
                  </div>

                  {message.protectedNames && message.protectedNames.length > 0 && (
                    <div className="protected-note">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"></rect><path d="M7 11V8a5 5 0 0 1 10 0v3"></path></svg>
                      <div>
                        <div className="title">{message.protectedNames.length === 1 ? `${message.protectedNames[0]} protegida` : 'Pistas protegidas'}</div>
                        <div className="caption">{message.protectedNames.length === 1 ? 'No será modificada.' : `${message.protectedNames.join(', ')} no serán modificadas.`}</div>
                      </div>
                    </div>
                  )}

                  <div className="proposal-actions">
                    {message.appliedProposal ? (
                      <button className="btn-discard" type="button" onClick={() => undoProposal(message)}>Deshacer</button>
                    ) : (
                      <>
                        <button className="btn-apply" type="button" onClick={() => applyProposal(message)}>Aplicar</button>
                        <button className="btn-discard" type="button" onClick={() => discardProposal(message)}>Descartar</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {sending && <p style={{ fontSize: '12px', color: 'var(--text-faint)' }}>AudioChat está pensando…</p>}

          <div className="quick-suggestions">
            <span className="heading">Sugerencias rápidas</span>
            <div className="chip-row">
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} className="chip" type="button" disabled={!isLive} onClick={() => send(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form className="astra-input-row" onSubmit={(event) => { event.preventDefault(); send(input); }}>
          <div className="astra-input">
            <label className="sr-only" htmlFor="astra-input">Mensaje para AudioChat</label>
            <input
              id="astra-input"
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={isLive ? '¿Cómo quieres que suene?' : 'Muy pronto podrás escribir aquí…'}
              disabled={!isLive || sending}
            />
            <button className="btn-send" type="submit" disabled={!isLive || sending || !input.trim()} aria-label="Enviar">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="13 6 19 12 13 18"></polyline></svg>
            </button>
          </div>
          <div className="astra-footer-note">Tú decides cada cambio.</div>
        </form>
      </aside>
    );
  }

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
            <span>Asistente de mezcla{isLive ? '' : ' · Próximamente'}</span>
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

        <div className="audio-chat-body" ref={bodyRef}>
          {messages.length === 0 && (
            <p className="audio-chat-empty">
              {isLive
                ? 'Cuéntame cómo quieres que suene tu mezcla. Te propongo ajustes de volumen, paneo, EQ o efectos — tú decides si aplicarlos.'
                : 'Muy pronto vas a poder describir aquí cómo quieres que suene tu mezcla. AudioChat te propondrá ajustes que escuchas y comparas antes de aplicarlos — tú decides cada cambio.'}
            </p>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`audio-chat-message ${message.role}`}>
              <p>{message.text}</p>
              {message.proposal && (
                <div className="audio-chat-proposal">
                  <span className="audio-chat-proposal-title">Propuesta</span>
                  <ul className="audio-chat-proposal-list">
                    {message.proposal.map((change, index) => (
                      <li key={index}>
                        {describeChange(change, mixer?.getState().stems.find((s) => s.id === change.stemId)?.name)}
                      </li>
                    ))}
                  </ul>
                  <div className="audio-chat-proposal-actions">
                    {message.appliedProposal ? (
                      <button type="button" onClick={() => undoProposal(message)}>Deshacer</button>
                    ) : (
                      <>
                        <button type="button" className="primary" onClick={() => applyProposal(message)}>Aplicar</button>
                        <button type="button" onClick={() => discardProposal(message)}>Descartar</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {sending && <p className="audio-chat-typing">AudioChat está pensando…</p>}

          <div className="audio-chat-suggestions">
            {SUGGESTIONS.map((suggestion) => (
              <span
                key={suggestion}
                className="audio-chat-chip"
                role={isLive ? 'button' : undefined}
                tabIndex={isLive ? 0 : undefined}
                onClick={isLive ? () => send(suggestion) : undefined}
                style={isLive ? { cursor: 'pointer' } : undefined}
              >
                {suggestion}
              </span>
            ))}
          </div>
        </div>

        <form
          className="audio-chat-inputbar"
          onSubmit={(event) => { event.preventDefault(); send(input); }}
        >
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={isLive ? 'Describe cómo quieres que suene…' : 'Muy pronto podrás escribir aquí…'}
            disabled={!isLive || sending}
          />
          <button type="submit" disabled={!isLive || sending || !input.trim()} aria-label="Enviar">➤</button>
        </form>
      </aside>
    </>
  );
}
