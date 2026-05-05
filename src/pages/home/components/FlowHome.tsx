/**
 * FlowHome.tsx — Tablero principal con 5 cards
 * Diseño idéntico al de Claude Design (flow-screens.jsx → FlowHome)
 */
import FlowNav from '@/components/flow/FlowNav';

const T = {
  bg: '#0a0612', bgDeep: '#0F0A1A',
  surface: 'rgba(26,16,40,0.62)', surface2: 'rgba(35,20,55,0.5)',
  text: '#F8F0FF', text2: '#b8a8d0', text3: '#7a6a90',
  pink: '#ec4899', fuchsia: '#C026D3', violet: '#a259ff',
  amber: '#fbbf24', green: '#10b981',
  border: 'rgba(192,38,211,0.18)', borderStrong: 'rgba(192,38,211,0.45)',
};

interface User {
  id: string; firstName: string; credits: number;
  is_pro?: boolean; plan?: string; genre?: string; level?: string;
}

interface FlowHomeProps {
  user: User | null;
  onNavigate: (id: string) => void;
}

const CARDS = [
  {
    id: 'studio',   t: 'MixingStudio AI',        s: 'DAW completo',
    desc: 'Timeline · Mezcla · Presets · IA EQ · LUFS · Exportar WAV',
    tags: ['Pro', 'Todas las funciones'],
    glyph: '✦', accent: T.fuchsia,
    cost: 'Sin coste por sesión',
  },
  {
    id: 'stems',    t: 'Cargar stems al DAW',    s: 'Abre en el DAW',
    desc: 'Sube tus stems — cada uno en su track. Aplica presets y mezcla.',
    tags: ['Pop', 'Gospel', 'Reggaetón', '+9'],
    glyph: '↑', accent: T.amber,
    cost: 'Gratis',
  },
  {
    id: 'separate', t: 'Separar stems',           s: 'Demucs → DAW',
    desc: 'Sube una canción — la IA separa Vocals, Drums, Bass, Other en el DAW',
    tags: ['Vocals', 'Drums', 'Bass', 'Other'],
    glyph: '✂', accent: T.violet,
    cost: '2 créditos',
  },
  {
    id: 'create',   t: 'Crear canción con IA',   s: 'Texto → DAW',
    desc: 'Genera una canción completa desde tu descripción. Se abre en el DAW.',
    tags: ['Prompt', 'Letra', 'Referencia'],
    glyph: '♫', accent: T.pink,
    cost: '10 créditos',
  },
  {
    id: 'mixsong',  t: 'Grabar / Masterizar',    s: 'Graba o masteriza en el DAW',
    desc: 'Graba desde tu micrófono o sube una canción y masteriza con IA EQ',
    tags: ['LUFS', 'IA EQ', 'Grabar', 'Limiter'],
    glyph: '◐', accent: T.green,
    cost: '5 créditos',
  },
];

const RECENT = [
  { t: 'Gospel — domingo',          s: 'Hace 2 horas · 7 stems', a: T.amber   },
  { t: 'Generación: pop electrónico', s: 'Ayer · 3:00',            a: T.pink    },
  { t: 'Beat trap 808',              s: 'Hace 3 días · stems',     a: T.violet  },
];

export default function FlowHome({ user, onNavigate }: FlowHomeProps) {
  const isPro = user?.is_pro || user?.plan === 'unlimited';
  const genre = user?.genre || 'Gospel';
  const level = user?.level || 'intermedio';

  return (
    <div style={{ width:'100%', minHeight:'100vh', background:`radial-gradient(ellipse at 80% -10%,rgba(192,38,211,0.18),transparent 50%),radial-gradient(ellipse at 0% 110%,rgba(162,89,255,0.14),transparent 50%),${T.bgDeep}`, fontFamily:'-apple-system,BlinkMacSystemFont,"DM Sans",system-ui,sans-serif', color:T.text }}>
      <FlowNav active="home" onNavigate={onNavigate} user={user} />

      <div style={{ padding:'36px 32px 60px', maxWidth:1200, margin:'0 auto' }}>
        {/* Header personalizado */}
        <div style={{ marginBottom:32 }}>
          <h1 style={{ fontSize:38, fontWeight:600, margin:0, letterSpacing:-0.6 }}>
            Hola, {user?.firstName || 'Músico'} 👋
          </h1>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:12, flexWrap:'wrap' }}>
            <span style={{ padding:'4px 12px', borderRadius:999, background:'rgba(192,38,211,0.14)', color:T.pink, fontSize:11.5, fontWeight:500, border:`0.5px solid ${T.borderStrong}` }}>
              {isPro ? '∞ Plan Creador Pro' : 'Plan Gratis'}
            </span>
            <span style={{ padding:'4px 12px', borderRadius:999, background:'rgba(251,191,36,0.12)', color:T.amber, fontSize:11.5, fontWeight:500, border:'0.5px solid rgba(251,191,36,0.3)', cursor:'pointer' }} onClick={() => onNavigate('billing')}>
              {isPro ? '∞' : (user?.credits ?? 0)} créditos
            </span>
            <span style={{ fontSize:12, color:T.text3, marginLeft:6 }}>
              Personalizado para {genre} · nivel {level}
            </span>
          </div>
        </div>

        {/* 5 cards — mismo tamaño, 3 columnas */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
          {CARDS.map(c => (
            <div key={c.id} onClick={() => onNavigate(c.id)}
              style={{ padding:20, borderRadius:16, background:T.surface, border:`0.5px solid ${T.border}`, backdropFilter:'blur(8px)', cursor:'pointer', position:'relative', overflow:'hidden', transition:'all .15s', minHeight:200, display:'flex', flexDirection:'column' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=T.borderStrong; e.currentTarget.style.boxShadow=`0 0 28px ${c.accent}44`; e.currentTarget.style.transform='translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'; }}>
              {/* accent line top */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${c.accent},transparent)`, boxShadow:`0 0 12px ${c.accent}` }} />
              <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:14 }}>
                <div style={{ width:44, height:44, borderRadius:11, background:`linear-gradient(135deg,${c.accent},${c.accent}aa)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'#fff', fontWeight:600, boxShadow:`0 0 16px ${c.accent}66`, flexShrink:0 }}>
                  {c.glyph}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:600, color:T.text }}>{c.t}</div>
                  <div style={{ fontSize:11.5, color:T.text3, marginTop:2 }}>{c.s}</div>
                </div>
              </div>
              <div style={{ fontSize:12.5, color:T.text2, lineHeight:1.5, marginBottom:12, flex:1 }}>{c.desc}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:12 }}>
                {c.tags.map(tag => (
                  <span key={tag} style={{ fontSize:10, padding:'2px 8px', borderRadius:999, background:'rgba(255,255,255,0.04)', color:c.accent, fontWeight:500, border:`0.5px solid ${c.accent}33` }}>{tag}</span>
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:`0.5px solid ${T.border}`, paddingTop:10 }}>
                <span style={{ fontSize:10.5, color:T.text3 }}>{c.cost}</span>
                <span style={{ fontSize:11.5, fontWeight:600, color:c.accent }}>Abrir →</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recientes */}
        <div style={{ marginTop:36 }}>
          <div style={{ fontSize:11, color:T.text3, letterSpacing:0.4, textTransform:'uppercase', marginBottom:12 }}>Recientes</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {RECENT.map(r => (
              <div key={r.t} onClick={() => onNavigate('studio')}
                style={{ padding:12, borderRadius:10, background:T.surface, border:`0.5px solid ${T.border}`, cursor:'pointer', display:'flex', alignItems:'center', gap:10, transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=T.borderStrong; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor=T.border; }}>
                <div style={{ width:3, height:28, background:r.a, borderRadius:2, boxShadow:`0 0 8px ${r.a}` }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:T.text }}>{r.t}</div>
                  <div style={{ fontSize:10.5, color:T.text3 }}>{r.s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
