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
 */
export default function AudioChatPanel({ mixer }: { mixer?: MixerChatBridge }) {
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
    const userMessage: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text: trimmed };
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
      const lockedIds = new Set(mixer.getState().stems.filter((s) => s.locked).map((s) => s.id));
      const proposal = rawProposal.filter((change) => change.target !== 'stem' || !lockedIds.has(change.stemId ?? ''));
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.reply || 'Listo.',
        proposal: proposal.length ? proposal : undefined,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: 'No pude conectar con AudioChat ahora mismo. Intenta de nuevo en un momento 🎧',
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
