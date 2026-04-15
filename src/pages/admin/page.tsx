import { useState, useEffect, useCallback } from 'react';

const SUPABASE_URL = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_ANON_KEY ?? '';
const ADMIN_PW = 'mixing2024!';

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  createdAt: string;
  lastLogin: string;
  confirmed: boolean;
  plan: 'free' | 'unlimited';
  is_pro: boolean;
}

const fmt = (d: string) => d ? new Date(d).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

export default function AdminDashboard() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [blocked, setBlocked] = useState<number|null>(null);
  const [tab, setTab] = useState<'overview'|'users'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [grantEmail, setGrantEmail] = useState('');
  const [grantMsg, setGrantMsg] = useState('');
  const [cursor, setCursor] = useState(0);
  const PER = 50;

  // ── Session ───────────────────────────────────────────────
  useEffect(() => {
    const s = localStorage.getItem('mixingai_admin_session');
    if (s) {
      try {
        const parsed = JSON.parse(s);
        if (Date.now() - parsed.ts < 4 * 3600000) { setIsAuthorized(true); }
        else localStorage.removeItem('mixingai_admin_session');
      } catch { localStorage.removeItem('mixingai_admin_session'); }
    }
    const b = localStorage.getItem('mixingai_admin_block');
    if (b) setBlocked(parseInt(b));
  }, []);

  // ── Load users from Supabase auth.users via REST ──────────
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Read from public users table — anon key can access this
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/users?select=*&order=created_at.desc&limit=500`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message || err?.hint || `Error ${res.status} leyendo tabla users`);
      }

      const rows: any[] = await res.json();
      const mapped: AdminUser[] = rows.map(u => ({
        id: u.id,
        email: u.email || '—',
        firstName: u.first_name || u.email?.split('@')[0] || '—',
        lastName: u.last_name || '',
        country: u.country || '—',
        createdAt: u.created_at || '',
        lastLogin: u.last_login || u.updated_at || '',
        confirmed: !!u.email_verified,
        plan: (u.is_pro || u.plan === 'unlimited') ? 'unlimited' : 'free',
        is_pro: !!(u.is_pro || u.plan === 'unlimited'),
      }));

      setUsers(mapped);
    } catch (e: any) {
      setError(e.message || 'Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) loadUsers();
  }, [isAuthorized, loadUsers]);

  // ── Grant/Revoke pro via Supabase Auth Admin API ──────────
  const updateUserPro = async (userId: string, isPro: boolean) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ is_pro: isPro, plan: isPro ? 'unlimited' : 'free' }),
      });
      if (!res.ok) throw new Error('Error actualizando usuario');
      setUsers(prev => prev.map(u => u.id === userId
        ? { ...u, is_pro: isPro, plan: isPro ? 'unlimited' : 'free' }
        : u
      ));
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  // ── Grant pro by email ────────────────────────────────────
  const grantByEmail = async () => {
    const email = grantEmail.trim().toLowerCase();
    if (!email) return;
    const user = users.find(u => u.email.toLowerCase() === email);
    if (!user) { setGrantMsg('❌ Email no encontrado en Supabase'); setTimeout(() => setGrantMsg(''), 4000); return; }
    await updateUserPro(user.id, true);
    setGrantMsg(`✓ ${email} → Mezclas ilimitadas activadas`);
    setGrantEmail('');
    setTimeout(() => setGrantMsg(''), 4000);
  };

  // ── Auth ──────────────────────────────────────────────────
  const handleAuth = () => {
    if (blocked && Date.now() < blocked) {
      alert(`Bloqueado ${Math.ceil((blocked - Date.now()) / 60000)} min más`); return;
    }
    if (password !== ADMIN_PW) {
      const n = attempts + 1; setAttempts(n); setPassword('');
      if (n >= 5) {
        const until = Date.now() + 30 * 60 * 1000;
        setBlocked(until); localStorage.setItem('mixingai_admin_block', String(until));
        alert('5 intentos fallidos. Bloqueado 30 minutos.');
      } else alert(`Contraseña incorrecta. ${5 - n} intentos restantes.`);
      return;
    }
    setIsAuthorized(true); setAttempts(0);
    localStorage.setItem('mixingai_admin_session', JSON.stringify({ ts: Date.now() }));
  };

  const S = {
    page: { minHeight:'100vh', background:'#0d0a14', color:'#F8F0FF', fontFamily:"'Outfit',system-ui,sans-serif" } as React.CSSProperties,
    card: { background:'rgba(26,16,40,0.85)', border:'1px solid rgba(192,38,211,0.15)', borderRadius:'16px', padding:'20px' } as React.CSSProperties,
    input: { background:'rgba(8,4,16,0.7)', border:'1px solid rgba(192,38,211,0.25)', borderRadius:'10px', padding:'10px 14px', color:'#F8F0FF', fontSize:'13px', fontFamily:'inherit', outline:'none', width:'100%', boxSizing:'border-box' as const },
    btn: (c = '#C026D3') => ({ background:`linear-gradient(135deg,${c},${c}bb)`, border:'none', color:'#fff', padding:'9px 18px', borderRadius:'10px', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }),
    ghost: { background:'transparent', border:'1px solid rgba(192,38,211,0.25)', color:'#9B7EC8', padding:'8px 16px', borderRadius:'10px', fontSize:'12px', cursor:'pointer', fontFamily:'inherit' } as React.CSSProperties,
    tab: (a: boolean) => ({ padding:'8px 18px', borderRadius:'10px', border:`1px solid ${a?'#C026D3':'rgba(192,38,211,0.15)'}`, background:a?'rgba(192,38,211,0.15)':'transparent', color:a?'#EC4899':'#9B7EC8', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }),
  };

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.firstName.toLowerCase().includes(search.toLowerCase()) ||
    u.country.toLowerCase().includes(search.toLowerCase())
  );
  const proCount = users.filter(u => u.is_pro).length;
  const confirmedCount = users.filter(u => u.confirmed).length;

  // ── Login ─────────────────────────────────────────────────
  if (!isAuthorized) return (
    <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ ...S.card, maxWidth:'360px', width:'100%', textAlign:'center', padding:'40px 28px' }}>
        <div style={{ width:'60px', height:'60px', background:'linear-gradient(135deg,#EC4899,#C026D3)', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:'24px', boxShadow:'0 0 28px rgba(192,38,211,0.4)' }}>⚙️</div>
        <h2 style={{ fontSize:'20px', fontWeight:800, marginBottom:'6px' }}>Panel Administrador</h2>
        <p style={{ fontSize:'12px', color:'rgba(155,126,200,0.6)', marginBottom:'24px' }}>mixingmusic.ai · acceso restringido</p>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAuth()}
          placeholder="Contraseña" style={{ ...S.input, marginBottom:'12px', textAlign:'center' }} />
        <button onClick={handleAuth} style={{ ...S.btn(), width:'100%', padding:'12px', fontSize:'14px' }}>Ingresar</button>
        {attempts > 0 && <p style={{ fontSize:'11px', color:'#f87171', marginTop:'10px' }}>{5 - attempts} intentos restantes</p>}
      </div>
    </div>
  );

  // ── Main ──────────────────────────────────────────────────
  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ background:'rgba(13,8,22,0.98)', borderBottom:'1px solid rgba(192,38,211,0.15)', padding:'0 20px', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'32px', height:'32px', background:'linear-gradient(135deg,#EC4899,#C026D3)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center' }}>⚙</div>
          <span style={{ fontSize:'14px', fontWeight:800 }}>Admin Panel</span>
          <span style={{ fontSize:'11px', color:'rgba(155,126,200,0.4)' }}>mixingmusic.ai</span>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          <button onClick={loadUsers} style={S.ghost} title="Recargar">🔄 Recargar</button>
          <button onClick={() => { localStorage.removeItem('mixingai_admin_session'); setIsAuthorized(false); }} style={S.ghost}>Salir</button>
        </div>
      </div>

      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'24px 16px' }}>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'24px' }}>
          <button onClick={() => setTab('overview')} style={S.tab(tab==='overview')}>📊 Overview</button>
          <button onClick={() => setTab('users')} style={S.tab(tab==='users')}>
            👥 Usuarios {users.length > 0 && <span style={{ background:'rgba(192,38,211,0.3)', borderRadius:'20px', padding:'1px 8px', marginLeft:'6px', fontSize:'11px' }}>{users.length}</span>}
          </button>
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'12px' }}>
            {[
              { label:'Total usuarios', val: loading ? '...' : users.length.toLocaleString(), color:'#C026D3', icon:'👥' },
              { label:'Emails confirmados', val: loading ? '...' : confirmedCount.toLocaleString(), color:'#4ade80', icon:'✅' },
              { label:'Plan Ilimitado', val: loading ? '...' : proCount.toLocaleString(), color:'#EC4899', icon:'∞' },
              { label:'Plan Gratis', val: loading ? '...' : (users.length - proCount).toLocaleString(), color:'#9B7EC8', icon:'🆓' },
            ].map(s => (
              <div key={s.label} style={{ ...S.card, textAlign:'center' }}>
                <div style={{ fontSize:'28px', marginBottom:'6px' }}>{s.icon}</div>
                <div style={{ fontSize:'28px', fontWeight:800, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:'11px', color:'rgba(155,126,200,0.6)', marginTop:'4px' }}>{s.label}</div>
              </div>
            ))}

            {/* Grant permissions */}
            <div style={{ ...S.card, gridColumn:'1 / -1' }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#9B7EC8', letterSpacing:'1px', textTransform:'uppercase', marginBottom:'14px' }}>
                Dar acceso ilimitado por email
              </div>
              <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
                <input value={grantEmail} onChange={e => setGrantEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && grantByEmail()}
                  placeholder="email@ejemplo.com" style={{ ...S.input, maxWidth:'320px' }} />
                <button onClick={grantByEmail} style={S.btn()}>∞ Dar Ilimitado</button>
              </div>
              {grantMsg && <p style={{ fontSize:'12px', color:'#4ade80', marginTop:'8px' }}>{grantMsg}</p>}
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div style={S.card}>
            {/* Search + stats */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', gap:'12px', flexWrap:'wrap' }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por email, nombre o país..."
                style={{ ...S.input, maxWidth:'400px' }} />
              <span style={{ fontSize:'12px', color:'rgba(155,126,200,0.6)', whiteSpace:'nowrap' }}>
                {loading ? 'Cargando...' : `${filtered.length} de ${users.length} usuarios`}
              </span>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'10px', padding:'12px 16px', marginBottom:'16px', fontSize:'13px', color:'#fca5a5' }}>
                ⚠ {error}
                <div style={{ fontSize:'11px', color:'rgba(155,126,200,0.5)', marginTop:'4px' }}>
                  Nota: Para leer auth.users necesitas configurar el Service Role Key en Supabase Edge Functions.
                  Alternativamente, los usuarios aparecen en Authentication → Users en el dashboard de Supabase.
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ textAlign:'center', padding:'48px', color:'rgba(155,126,200,0.5)' }}>
                <div style={{ width:'32px', height:'32px', border:'3px solid rgba(192,38,211,0.2)', borderTopColor:'#C026D3', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }}></div>
                Cargando usuarios de Supabase...
              </div>
            )}

            {/* Users table */}
            {!loading && filtered.length === 0 && !error && (
              <div style={{ textAlign:'center', padding:'48px', color:'rgba(155,126,200,0.4)', fontSize:'14px' }}>
                No se encontraron usuarios
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid rgba(192,38,211,0.15)' }}>
                      {['Usuario','País','Plan','Email confirmado','Registro','Último login','Acciones'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:'10px', fontWeight:700, color:'rgba(155,126,200,0.6)', letterSpacing:'0.8px', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => (
                      <tr key={u.id} style={{ borderBottom:'1px solid rgba(192,38,211,0.07)', transition:'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(192,38,211,0.04)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                            <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'linear-gradient(135deg,#EC4899,#C026D3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, flexShrink:0 }}>
                              {(u.firstName || u.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight:600, color:'#F8F0FF' }}>{u.firstName} {u.lastName}</div>
                              <div style={{ fontSize:'11px', color:'rgba(155,126,200,0.6)' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:'10px 12px', color:'rgba(155,126,200,0.7)' }}>{u.country}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{
                            padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:700,
                            background: u.is_pro ? 'rgba(192,38,211,0.15)' : 'rgba(155,126,200,0.08)',
                            border: `1px solid ${u.is_pro ? 'rgba(192,38,211,0.35)' : 'rgba(155,126,200,0.15)'}`,
                            color: u.is_pro ? '#EC4899' : '#9B7EC8',
                          }}>
                            {u.is_pro ? '∞ Ilimitado' : 'Gratis'}
                          </span>
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ color: u.confirmed ? '#4ade80' : '#FBBF24', fontSize:'12px' }}>
                            {u.confirmed ? '✓ Sí' : '⏳ No'}
                          </span>
                        </td>
                        <td style={{ padding:'10px 12px', color:'rgba(155,126,200,0.6)', fontSize:'11px', whiteSpace:'nowrap' }}>{fmt(u.createdAt)}</td>
                        <td style={{ padding:'10px 12px', color:'rgba(155,126,200,0.6)', fontSize:'11px', whiteSpace:'nowrap' }}>{fmt(u.lastLogin)}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ display:'flex', gap:'6px' }}>
                            {!u.is_pro ? (
                              <button onClick={() => updateUserPro(u.id, true)}
                                style={{ ...S.btn(), padding:'5px 10px', fontSize:'11px' }}>
                                ∞ Dar Pro
                              </button>
                            ) : (
                              <button onClick={() => updateUserPro(u.id, false)}
                                style={{ ...S.btn('#6b7280'), padding:'5px 10px', fontSize:'11px' }}>
                                Revocar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
