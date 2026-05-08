import { useState, useRef, useEffect } from 'react';

const T = {
  text:'#F8F0FF', text2:'#b8a8d0', text3:'#7a6a90',
  pink:'#ec4899', fuchsia:'#C026D3',
  border:'rgba(192,38,211,0.18)', borderStrong:'rgba(192,38,211,0.45)',
  surface:'rgba(18,9,30,0.98)',
};

interface FlowNavProps {
  active?: string;
  onNavigate: (id: string) => void;
  user?: { firstName: string; credits: number; is_pro?: boolean; plan?: string } | null;
  onLogout?: () => void;
}

const NAV = [
  { id:'home',     label:'Inicio',          glyph:'⌂' },
  { id:'stems',    label:'Cargar Stems',    glyph:'↑' },
  { id:'studio',   label:'MixingStudio AI', glyph:'✦', primary:true },
];

export default function FlowNav({ active, onNavigate, user, onLogout }: FlowNavProps) {
  const isPro = user?.is_pro || user?.plan === 'unlimited';
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    setShowMenu(false);
    // Limpiar TODO del localStorage
    localStorage.removeItem('audioMixerUser');
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.includes('supabase') || k.includes('sb-') || k.includes('auth')) {
        localStorage.removeItem(k);
      }
    });
    onLogout?.();
    onNavigate('home');
    window.location.href = '/';
  };

  return (
    <div style={{ height:48, display:'flex', alignItems:'center', padding:'0 22px', gap:4, borderBottom:`0.5px solid ${T.border}`, background:'rgba(10,6,18,0.7)', backdropFilter:'blur(20px)', position:'sticky', top:0, zIndex:100 }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:18, cursor:'pointer' }} onClick={() => onNavigate('home')}>
        <div style={{ width:22, height:22, borderRadius:6, background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 10px ${T.fuchsia}66`, fontSize:11, fontWeight:700, color:'#fff' }}>M</div>
        <span style={{ fontSize:13, fontWeight:500, color:T.text }}>mixingmusic.ai</span>
      </div>

      {/* Nav items */}
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

      {/* Right side */}
      {user ? (
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ padding:'4px 12px', borderRadius:999, background:'rgba(192,38,211,0.14)', color:T.pink, fontSize:11.5, fontWeight:500, border:`0.5px solid ${T.borderStrong}` }}>
            {isPro ? '∞ Plan Creador Pro' : 'Plan Gratis'}
          </span>
          <span style={{ padding:'4px 12px', borderRadius:999, background:'rgba(251,191,36,0.12)', color:'#fbbf24', fontSize:11.5, fontWeight:500, border:'0.5px solid rgba(251,191,36,0.3)', cursor:'pointer' }} onClick={() => onNavigate('billing')}>
            {isPro ? '∞' : user.credits} créditos
          </span>

          {/* Avatar con dropdown */}
          <div ref={menuRef} style={{ position:'relative' }}>
            <div style={{ width:32, height:32, borderRadius:999, background:`linear-gradient(135deg,${T.fuchsia},#a259ff)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, color:'#fff', cursor:'pointer', border: showMenu ? `2px solid ${T.pink}` : '2px solid transparent' }}
              onClick={() => setShowMenu(!showMenu)}>
              {user.firstName?.[0]?.toUpperCase() || 'U'}
            </div>

            {showMenu && (
              <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:T.surface, border:`1px solid ${T.borderStrong}`, borderRadius:12, padding:6, minWidth:180, boxShadow:'0 8px 32px rgba(0,0,0,0.7)', zIndex:500 }}>
                {/* User info */}
                <div style={{ padding:'10px 12px', borderBottom:`0.5px solid ${T.border}`, marginBottom:4 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:T.text }}>{user.firstName}</div>
                  <div style={{ fontSize:10, color:T.text3, marginTop:2 }}>{isPro ? '∞ Plan Creador Pro' : `${user.credits} créditos`}</div>
                </div>

                {[
                  { icon:'⌂', label:'Inicio', id:'home' },
                  { icon:'💳', label:'Créditos y Plan', id:'billing' },
                ].map(item => (
                  <button key={item.id} onClick={() => { setShowMenu(false); onNavigate(item.id); }}
                    style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 12px', borderRadius:7, background:'transparent', border:'none', color:T.text2, fontSize:12, cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                    <span>{item.icon}</span>{item.label}
                  </button>
                ))}

                <div style={{ height:0.5, background:T.border, margin:'4px 0' }}/>

                {/* Cerrar sesión */}
                <button onClick={handleLogout}
                  style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'8px 12px', borderRadius:7, background:'rgba(239,68,68,0.08)', border:'none', color:'#f87171', fontSize:12, cursor:'pointer', fontFamily:'inherit', textAlign:'left', fontWeight:600 }}>
                  <span>→</span> Cerrar sesión
                </button>
              </div>
            )}
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
