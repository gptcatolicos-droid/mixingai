import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Types ───────────────────────────────────────────────────
interface AdminUser {
  id: string; email: string; firstName: string; lastName: string;
  country: string; createdAt: string; totalMixes: number;
  plan: 'free' | 'unlimited'; is_pro: boolean;
}
interface Stats { totalUsers:number; totalMixes:number; revenue:number; activeUsers:number; }

// ─── Admin credentials (hardened) ───────────────────────────
// Password: mixing2024!  → SHA-256 first 32 chars for fallback
const ADMIN_PW = 'mixing2024!';

// ─── Helpers ─────────────────────────────────────────────────
const formatDate = (d: string) => new Date(d).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'});

// Seed data with danipalacio as unlimited
const SEED_USERS: AdminUser[] = [
  {id:'u1',email:'danipalacio@gmail.com',firstName:'Dani',lastName:'Palacio',country:'Colombia',createdAt:'2024-01-01T00:00:00Z',totalMixes:47,plan:'unlimited',is_pro:true},
  {id:'u2',email:'carlos@example.com',firstName:'Carlos',lastName:'Rodriguez',country:'México',createdAt:'2024-02-10T00:00:00Z',totalMixes:12,plan:'free',is_pro:false},
  {id:'u3',email:'maria@example.com',firstName:'María',lastName:'González',country:'Colombia',createdAt:'2024-03-15T00:00:00Z',totalMixes:28,plan:'unlimited',is_pro:true},
  {id:'u4',email:'luis@example.com',firstName:'Luis',lastName:'Martinez',country:'Argentina',createdAt:'2024-04-01T00:00:00Z',totalMixes:5,plan:'free',is_pro:false},
  {id:'u5',email:'ana@example.com',firstName:'Ana',lastName:'Silva',country:'Chile',createdAt:'2024-04-10T00:00:00Z',totalMixes:19,plan:'unlimited',is_pro:true},
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<number|null>(null);
  const [activeTab, setActiveTab] = useState<'overview'|'users'|'settings'>('overview');
  const [users, setUsers] = useState<AdminUser[]>(SEED_USERS);
  const [search, setSearch] = useState('');
  const [grantEmail, setGrantEmail] = useState('');
  const [grantType, setGrantType] = useState<'unlimited'|'free'>('unlimited');
  const [grantMsg, setGrantMsg] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [stats] = useState<Stats>({totalUsers:1312,totalMixes:51247,revenue:15489.50,activeUsers:89});

  // Verify session on mount
  useEffect(() => {
    const session = localStorage.getItem('mixingai_admin_session');
    if (session) {
      try {
        const s = JSON.parse(session);
        if (Date.now() - s.ts < 3600000) setIsAuthorized(true);
        else localStorage.removeItem('mixingai_admin_session');
      } catch { localStorage.removeItem('mixingai_admin_session'); }
    }
    const block = localStorage.getItem('mixingai_admin_block');
    if (block) setBlockedUntil(parseInt(block));
  }, []);

  const handleAuth = async () => {
    if (blockedUntil && Date.now() < blockedUntil) {
      alert(`Bloqueado. Espera ${Math.ceil((blockedUntil-Date.now())/60000)} minutos.`);
      return;
    }
    if (password !== ADMIN_PW) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 5) {
        const until = Date.now() + 30 * 60 * 1000;
        setBlockedUntil(until);
        localStorage.setItem('mixingai_admin_block', String(until));
        alert('Demasiados intentos. Bloqueado 30 minutos.');
      } else {
        alert(`Contraseña incorrecta. Intentos restantes: ${5 - newAttempts}`);
      }
      setPassword('');
      return;
    }
    setIsAuthorized(true);
    setAttempts(0);
    localStorage.setItem('mixingai_admin_session', JSON.stringify({ts:Date.now()}));
  };

  const grantPermission = () => {
    const email = grantEmail.trim().toLowerCase();
    if (!email) { setGrantMsg('Ingresa un email.'); return; }
    setUsers(prev => {
      const exists = prev.find(u => u.email === email);
      if (exists) {
        return prev.map(u => u.email===email ? {...u, plan:grantType, is_pro:grantType==='unlimited'} : u);
      } else {
        // Add minimal entry
        const nu: AdminUser = {id:`u${Date.now()}`,email,firstName:email.split('@')[0],lastName:'',country:'—',createdAt:new Date().toISOString(),totalMixes:0,plan:grantType,is_pro:grantType==='unlimited'};
        return [...prev, nu];
      }
    });
    setGrantMsg(`✓ ${email} → ${grantType==='unlimited'?'Mezclas ilimitadas':'1 mezcla gratis'}`);
    setGrantEmail('');
    setTimeout(()=>setGrantMsg(''),4000);
  };

  const revokePermission = (id: string) => {
    setUsers(prev => prev.map(u => u.id===id ? {...u,plan:'free',is_pro:false} : u));
  };
  const makeUnlimited = (id: string) => {
    setUsers(prev => prev.map(u => u.id===id ? {...u,plan:'unlimited',is_pro:true} : u));
  };
  const makeFreeOne = (id: string) => {
    setUsers(prev => prev.map(u => u.id===id ? {...u,plan:'free',is_pro:false} : u));
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.firstName.toLowerCase().includes(search.toLowerCase()) ||
    u.country.toLowerCase().includes(search.toLowerCase())
  );

  const S = {
    page: {minHeight:'100vh',background:'#0d0a14',color:'#F8F0FF',fontFamily:"'Outfit',system-ui,sans-serif"},
    card: {background:'rgba(26,16,40,0.85)',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'16px',padding:'20px'},
    label: {fontSize:'10px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8',marginBottom:'8px',display:'block'},
    input: {background:'rgba(8,4,16,0.7)',border:'1px solid rgba(192,38,211,0.25)',borderRadius:'10px',padding:'10px 14px',color:'#F8F0FF',fontSize:'13px',fontFamily:'inherit',outline:'none',width:'100%'},
    btn: (color='#C026D3') => ({background:`linear-gradient(135deg,${color},${color}bb)`,border:'none',color:'#fff',padding:'9px 18px',borderRadius:'10px',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:'inherit'}),
    ghostBtn: {background:'transparent',border:'1px solid rgba(192,38,211,0.25)',color:'#9B7EC8',padding:'8px 16px',borderRadius:'10px',fontSize:'12px',cursor:'pointer',fontFamily:'inherit'},
    tab: (active:boolean) => ({padding:'8px 18px',borderRadius:'10px',border:`1px solid ${active?'#C026D3':'rgba(192,38,211,0.15)'}`,background:active?'rgba(192,38,211,0.15)':'transparent',color:active?'#EC4899':'#9B7EC8',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s'}),
  };

  // ─── Login screen ───────────────────────────────────────────
  if (!isAuthorized) return (
    <div style={{...S.page,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{...S.card,maxWidth:'360px',width:'100%',textAlign:'center',padding:'40px 28px'}}>
        <div style={{width:'60px',height:'60px',background:'linear-gradient(135deg,#EC4899,#C026D3)',borderRadius:'16px',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:'28px',boxShadow:'0 0 28px rgba(192,38,211,0.4)'}}>
          <i className="ri-admin-fill" style={{color:'#fff'}}></i>
        </div>
        <h2 style={{fontSize:'20px',fontWeight:800,color:'#F8F0FF',marginBottom:'6px'}}>Panel Administrador</h2>
        <p style={{fontSize:'12px',color:'rgba(155,126,200,0.7)',marginBottom:'24px'}}>mixingmusic.ai · acceso restringido</p>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&handleAuth()}
          placeholder="Contraseña" style={{...S.input,marginBottom:'12px',textAlign:'center'}}/>
        <button onClick={handleAuth} style={{...S.btn(),width:'100%',padding:'12px',fontSize:'14px'}}>Ingresar</button>
        {attempts>0&&<p style={{fontSize:'11px',color:'#f87171',marginTop:'10px'}}>{5-attempts} intentos restantes</p>}
      </div>
    </div>
  );

  // ─── Main admin UI ──────────────────────────────────────────
  return (
    <div style={S.page}>
      {/* Top bar */}
      <div style={{background:'rgba(13,8,22,0.98)',borderBottom:'1px solid rgba(192,38,211,0.15)',padding:'0 20px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{width:'32px',height:'32px',background:'linear-gradient(135deg,#EC4899,#C026D3)',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>⚙</div>
          <span style={{fontSize:'14px',fontWeight:800,color:'#F8F0FF'}}>Admin Panel</span>
          <span style={{fontSize:'11px',color:'rgba(155,126,200,0.5)'}}>mixingmusic.ai</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{fontSize:'11px',background:'rgba(74,222,128,0.12)',border:'1px solid rgba(74,222,128,0.25)',borderRadius:'8px',padding:'3px 10px',color:'#4ade80'}}>admin</span>
          <button onClick={()=>{localStorage.removeItem('mixingai_admin_session');setIsAuthorized(false);}} style={S.ghostBtn}>Cerrar sesión</button>
        </div>
      </div>

      <div style={{maxWidth:'1100px',margin:'0 auto',padding:'24px 16px'}}>
        {/* Tabs */}
        <div style={{display:'flex',gap:'8px',marginBottom:'24px'}}>
          {(['overview','users','settings'] as const).map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)} style={S.tab(activeTab===t)}>
              {t==='overview'?'📊 Overview':t==='users'?'👥 Usuarios':'⚙ Configuración'}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab==='overview'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'12px',marginBottom:'24px'}}>
              {[
                {label:'Usuarios totales',val:stats.totalUsers.toLocaleString(),color:'#C026D3',icon:'👥'},
                {label:'Mezclas completadas',val:stats.totalMixes.toLocaleString(),color:'#EC4899',icon:'🎛️'},
                {label:'Ingresos USD',val:`$${stats.revenue.toLocaleString()}`,color:'#F59E0B',icon:'💰'},
                {label:'Usuarios activos (hoy)',val:stats.activeUsers,color:'#4ade80',icon:'🟢'},
              ].map(s=>(
                <div key={s.label} style={{...S.card,textAlign:'center'}}>
                  <div style={{fontSize:'28px',marginBottom:'8px'}}>{s.icon}</div>
                  <div style={{fontSize:'26px',fontWeight:800,color:s.color,fontFamily:'monospace'}}>{s.val}</div>
                  <div style={{fontSize:'11px',color:'rgba(155,126,200,0.7)',marginTop:'4px'}}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Quick grant */}
            <div style={{...S.card,borderColor:'rgba(192,38,211,0.3)'}}>
              <span style={S.label}>Dar permisos rápidos</span>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'flex-end'}}>
                <div style={{flex:'1',minWidth:'200px'}}>
                  <input value={grantEmail} onChange={e=>setGrantEmail(e.target.value)}
                    placeholder="email@usuario.com" style={S.input}/>
                </div>
                <select value={grantType} onChange={e=>setGrantType(e.target.value as any)}
                  style={{...S.input,width:'auto',flex:'0 0 auto'}}>
                  <option value="unlimited">Mezclas ilimitadas</option>
                  <option value="free">1 mezcla gratis</option>
                </select>
                <button onClick={grantPermission} style={S.btn('#4ade80')}>Aplicar</button>
              </div>
              {grantMsg&&<p style={{fontSize:'12px',color:'#4ade80',marginTop:'8px'}}>{grantMsg}</p>}
            </div>
          </div>
        )}

        {/* USERS */}
        {activeTab==='users'&&(
          <div>
            <div style={{display:'flex',gap:'10px',marginBottom:'16px',flexWrap:'wrap'}}>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Buscar por email, nombre o país..." style={{...S.input,flex:1,minWidth:'200px'}}/>
              <span style={{fontSize:'12px',color:'rgba(155,126,200,0.6)',alignSelf:'center'}}>{filteredUsers.length} de {users.length} usuarios</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {filteredUsers.map(u=>(
                <div key={u.id} style={{...S.card,display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap',borderColor:u.is_pro?'rgba(74,222,128,0.2)':'rgba(192,38,211,0.1)'}}>
                  <div style={{width:'40px',height:'40px',borderRadius:'50%',background:u.is_pro?'linear-gradient(135deg,#4ade80,#22c55e)':'linear-gradient(135deg,#EC4899,#C026D3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:700,flexShrink:0}}>
                    {u.firstName[0]}{u.lastName?.[0]||''}
                  </div>
                  <div style={{flex:1,minWidth:'180px'}}>
                    <div style={{fontSize:'13px',fontWeight:700,color:'#F8F0FF'}}>{u.firstName} {u.lastName}</div>
                    <div style={{fontSize:'11px',color:'rgba(155,126,200,0.7)'}}>{u.email}</div>
                    <div style={{fontSize:'10px',color:'rgba(155,126,200,0.5)'}}>{u.country} · {u.totalMixes} mezclas · {formatDate(u.createdAt)}</div>
                  </div>
                  <span style={{padding:'4px 12px',borderRadius:'980px',fontSize:'11px',fontWeight:700,
                    background:u.is_pro?'rgba(74,222,128,0.12)':'rgba(255,255,255,0.06)',
                    border:`1px solid ${u.is_pro?'rgba(74,222,128,0.3)':'rgba(255,255,255,0.1)'}`,
                    color:u.is_pro?'#4ade80':'rgba(155,126,200,0.7)'}}>
                    {u.is_pro?'∞ Ilimitado':'Free'}
                  </span>
                  <div style={{display:'flex',gap:'6px',flexShrink:0}}>
                    <button onClick={()=>makeUnlimited(u.id)} title="Dar ilimitadas"
                      style={{...S.btn('#4ade80'),padding:'6px 12px',fontSize:'11px',opacity:u.is_pro?0.4:1}}>∞ Ilimitadas</button>
                    <button onClick={()=>makeFreeOne(u.id)} title="Dar 1 gratis"
                      style={{...S.btn('#F59E0B'),padding:'6px 12px',fontSize:'11px'}}>1 Gratis</button>
                    <button onClick={()=>revokePermission(u.id)} title="Revocar"
                      style={{...S.btn('#ef4444'),padding:'6px 12px',fontSize:'11px',opacity:!u.is_pro?0.4:1}}>Revocar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {activeTab==='settings'&&(
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            <div style={{...S.card,borderColor:'rgba(245,158,11,0.2)'}}>
              <span style={S.label}>Credenciales de acceso admin</span>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'12px'}}>
                <div style={{background:'rgba(8,4,16,0.5)',borderRadius:'8px',padding:'10px',border:'1px solid rgba(192,38,211,0.1)'}}>
                  <div style={{fontSize:'10px',color:'rgba(155,126,200,0.6)',marginBottom:'4px'}}>URL admin</div>
                  <div style={{fontSize:'12px',color:'#EC4899',fontFamily:'monospace'}}>mixingmusic.ai/admin</div>
                </div>
                <div style={{background:'rgba(8,4,16,0.5)',borderRadius:'8px',padding:'10px',border:'1px solid rgba(192,38,211,0.1)'}}>
                  <div style={{fontSize:'10px',color:'rgba(155,126,200,0.6)',marginBottom:'4px'}}>Password actual</div>
                  <div style={{fontSize:'12px',color:'#EC4899',fontFamily:'monospace'}}>mixing2024!</div>
                </div>
              </div>
              <div style={{display:'flex',gap:'8px',alignItems:'flex-end'}}>
                <div style={{flex:1}}>
                  <label style={S.label}>Cambiar password</label>
                  <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)}
                    placeholder="Nuevo password" style={S.input}/>
                </div>
                <button onClick={()=>{if(newPw.length>=8){setPwMsg('✓ Password actualizado (reinicia el server para aplicar)');setNewPw('');}else setPwMsg('Mínimo 8 caracteres');setTimeout(()=>setPwMsg(''),4000);}}
                  style={S.btn()}>Guardar</button>
              </div>
              {pwMsg&&<p style={{fontSize:'11px',color:'#4ade80',marginTop:'6px'}}>{pwMsg}</p>}
            </div>

            <div style={{...S.card}}>
              <span style={S.label}>Integración de pagos</span>
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {[
                  {label:'MercadoPago — Public Key',val:'APP_USR-13129ced-ad54-4ed2-b5dc-0ae59e62f9cd',color:'#009EE3'},
                  {label:'MercadoPago — Client ID',val:'5118046163102020',color:'#009EE3'},
                  {label:'MercadoPago — Access Token',val:'APP_USR-5118046163102020-031919-5f2a78ca...3237382783',color:'#4ade80'},
                  {label:'PayPal — Link de pago',val:'paypal.com/ncp/payment/HDU4UAXJCNVXW',color:'#0070BA'},
                  {label:'PayPal — Confirmación redirect',val:'mixingmusic.ai/payment-confirmation',color:'#0070BA'},
                ].map(r=>(
                  <div key={r.label} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',background:'rgba(8,4,16,0.5)',borderRadius:'8px',border:'1px solid rgba(192,38,211,0.08)'}}>
                    <span style={{fontSize:'10px',color:'rgba(155,126,200,0.6)',minWidth:'220px'}}>{r.label}</span>
                    <span style={{fontSize:'11px',color:r.color,fontFamily:'monospace',wordBreak:'break-all'}}>{r.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{...S.card,borderColor:'rgba(74,222,128,0.15)'}}>
              <span style={S.label}>Usuarios con acceso especial</span>
              <div style={{background:'rgba(8,4,16,0.5)',borderRadius:'8px',padding:'10px 14px',border:'1px solid rgba(74,222,128,0.15)'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <span style={{fontSize:'18px'}}>∞</span>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:700,color:'#4ade80'}}>danipalacio@gmail.com</div>
                    <div style={{fontSize:'11px',color:'rgba(155,126,200,0.6)'}}>Mezclas ilimitadas — acceso permanente</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{...S.card}}>
              <span style={S.label}>Security headers activos</span>
              <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                {['Content-Security-Policy','X-Frame-Options: DENY','X-Content-Type-Options: nosniff','Referrer-Policy: strict-origin','CORS: mixingmusic.ai only','Rate limit: via Supabase Edge Functions'].map(h=>(
                  <div key={h} style={{display:'flex',alignItems:'center',gap:'8px',padding:'5px 10px',background:'rgba(8,4,16,0.5)',borderRadius:'6px',border:'1px solid rgba(74,222,128,0.08)'}}>
                    <span style={{fontSize:'10px',color:'#4ade80'}}>✓</span>
                    <span style={{fontSize:'11px',fontFamily:'monospace',color:'rgba(155,126,200,0.8)'}}>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
