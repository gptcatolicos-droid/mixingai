

const T = {
  text: '#F8F0FF', text2: '#b8a8d0', text3: '#7a6a90',
  pink: '#ec4899', fuchsia: '#C026D3',
  border: 'rgba(192,38,211,0.18)', borderStrong: 'rgba(192,38,211,0.45)',
};

interface FlowNavProps {
  active?: string;
  onNavigate: (id: string) => void;
  user?: { firstName: string; credits: number; is_pro?: boolean; plan?: string } | null;
}

const NAV = [
  { id: 'home',     label: 'Inicio',          glyph: '⌂' },
  { id: 'stems',    label: 'Cargar Stems',    glyph: '↑' },
  { id: 'separate', label: 'Separar Stems',   glyph: '✂' },
  { id: 'studio',   label: 'MixingStudio AI', glyph: '✦', primary: true },
  { id: 'create',   label: 'Crear con IA',    glyph: '+' },
  { id: 'blog',     label: 'Blog' },
];

export default function FlowNav({ active, onNavigate, user }: FlowNavProps) {
  const isPro = user?.is_pro || user?.plan === 'unlimited';
  return (
    <div style={{ height:48, display:'flex', alignItems:'center', padding:'0 22px', gap:4, borderBottom:`0.5px solid ${T.border}`, background:'rgba(10,6,18,0.7)', backdropFilter:'blur(20px)', position:'sticky', top:0, zIndex:100 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:18, cursor:'pointer' }} onClick={() => onNavigate('home')}>
        <div style={{ width:22, height:22, borderRadius:6, background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 10px ${T.fuchsia}66`, fontSize:11, fontWeight:700, color:'#fff' }}>M</div>
        <span style={{ fontSize:13, fontWeight:500, color:T.text }}>mixingmusic.ai</span>
      </div>
      {NAV.map(item => {
        const isActive = active === item.id;
        if (item.primary) return (
          <button key={item.id} onClick={() => onNavigate(item.id)} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:999, border:'none', background: isActive ? `linear-gradient(135deg,${T.fuchsia},${T.pink})` : 'rgba(192,38,211,0.18)', color:'#fff', fontSize:11.5, fontWeight:600, cursor:'pointer', boxShadow: isActive ? `0 0 18px ${T.fuchsia}66` : 'none', fontFamily:'inherit' }}>
            <span style={{ fontSize:12 }}>{item.glyph}</span>{item.label}
          </button>
        );
        return (
          <button key={item.id} onClick={() => onNavigate(item.id)} style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', border:'none', background:'transparent', color: isActive ? T.text : T.text3, fontSize:11.5, fontWeight: isActive ? 500 : 400, cursor:'pointer', fontFamily:'inherit', borderRadius:7 }}>
            {item.glyph && <span style={{ fontSize:11 }}>{item.glyph}</span>}{item.label}
          </button>
        );
      })}
      <div style={{ flex:1 }} />
      {user ? (
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ padding:'4px 12px', borderRadius:999, background:'rgba(192,38,211,0.14)', color:T.pink, fontSize:11.5, fontWeight:500, border:`0.5px solid ${T.borderStrong}` }}>
            {isPro ? '∞ Plan Creador Pro' : 'Plan Gratis'}
          </span>
          <span style={{ padding:'4px 12px', borderRadius:999, background:'rgba(251,191,36,0.12)', color:'#fbbf24', fontSize:11.5, fontWeight:500, border:'0.5px solid rgba(251,191,36,0.3)', cursor:'pointer' }} onClick={() => onNavigate('billing')}>
            {isPro ? '∞' : user.credits} créditos
          </span>
          <div style={{ width:30, height:30, borderRadius:999, background:`linear-gradient(135deg,${T.fuchsia},#a259ff)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, color:'#fff', cursor:'pointer' }} onClick={() => onNavigate('profile')}>
            {user.firstName?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => onNavigate('login')} style={{ padding:'6px 14px', borderRadius:999, background:'transparent', border:`0.5px solid ${T.border}`, color:T.text2, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>Iniciar Sesión</button>
          <button onClick={() => onNavigate('register')} style={{ padding:'6px 16px', borderRadius:999, border:'none', background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', boxShadow:`0 0 16px ${T.fuchsia}55` }}>Comenzar gratis</button>
        </div>
      )}
    </div>
  );
}
