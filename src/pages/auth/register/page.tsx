import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const SUPABASE_URL = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_ANON_KEY ?? '';

const COUNTRIES = [
  'Colombia','México','Argentina','Chile','Perú','Venezuela','Ecuador',
  'Bolivia','Uruguay','Paraguay','España','Estados Unidos','Otro'
];

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', password:'', country:'Colombia' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const saveAndGo = (id: string, email: string, token?: string) => {
    const { firstName, lastName, country } = form;
    localStorage.setItem('audioMixerUser', JSON.stringify({
      id, email, firstName, lastName, country,
      credits: 0, plan: 'free', is_pro: false,
      provider: 'email',
      createdAt: new Date().toISOString(),
      username: `${firstName.toLowerCase().replace(/\s/g,'_')}_${lastName.toLowerCase().replace(/\s/g,'_')}`,
      ...(token ? { accessToken: token } : {}),
    }));
    localStorage.removeItem('mixingai_used_free');
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { firstName, lastName, email, password } = form;

    if (!firstName || !lastName || !email || !password) { setError('Por favor completa todos los campos.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Ingresa un email válido.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener mínimo 6 caracteres.'); return; }

    setLoading(true);
    try {
      // ── 1. Intentar registro ──────────────────────────────────
      const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({
          email, password,
          data: { first_name: firstName, last_name: form.lastName, country: form.country, plan: 'free', is_pro: false },
        }),
      });
      const signupData = await signupRes.json();

      // ── 2. Email ya registrado ────────────────────────────────
      const alreadyMsg = signupData?.msg || signupData?.error_description || signupData?.message || '';
      const alreadyExists = !signupRes.ok && (
        alreadyMsg.toLowerCase().includes('already registered') ||
        alreadyMsg.toLowerCase().includes('already in use') ||
        alreadyMsg.toLowerCase().includes('already exists') ||
        alreadyMsg.toLowerCase().includes('user already')
      );
      if (alreadyExists) { setError('Este email ya está registrado.'); setLoading(false); return; }
      if (!signupRes.ok) { setError(alreadyMsg || 'Error al crear la cuenta. Inténtalo de nuevo.'); setLoading(false); return; }

      // ── 3. Insert into users table (so admin panel can see them) ──
      const userId = signupData.user?.id || `usr_${Date.now()}`;
      const accessToken = signupData.access_token;
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            id: userId,
            first_name: firstName,
            last_name: lastName,
            email,
            country,
            credits: 0,
            plan: 'free',
            is_pro: false,
            provider: 'email',
            username: `${firstName.toLowerCase().replace(/\s/g,'_')}_${lastName.toLowerCase().replace(/\s/g,'_')}`,
            email_verified: !!signupData.user?.email_confirmed_at,
            created_at: new Date().toISOString(),
          }),
        });
      } catch (dbErr) {
        // Non-critical — user still registered in auth.users
        console.warn('Could not insert into users table:', dbErr);
      }

      // ── 4. Signup OK con session ──────────────────────────────
      if (accessToken && signupData.user) {
        saveAndGo(signupData.user.id, signupData.user.email, accessToken);
        return;
      }

      // ── 5. Confirm email ON → intentar login ─────────────────
      const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();
      if (loginRes.ok && loginData.access_token) {
        saveAndGo(loginData.user.id, loginData.user.email, loginData.access_token);
        return;
      }

      // ── 6. Fallback — entra de todas formas ──────────────────
      saveAndGo(userId, email);

    } catch (err: any) {
      console.error('Register error:', err);
      setError('Error de conexión. Verifica tu internet e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Styles ────────────────────────────────────────────────
  const ff = "'Outfit',system-ui,sans-serif";
  const inputS: React.CSSProperties = {
    width:'100%', background:'rgba(8,4,16,0.6)', border:'1px solid rgba(192,38,211,0.2)',
    borderRadius:'10px', padding:'11px 14px', color:'#F8F0FF', fontSize:'14px',
    fontFamily:ff, boxSizing:'border-box' as const,
  };

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0D0A14,#1a0a2e,#0d1a3a)', fontFamily:ff, color:'#F8F0FF' }}>

      {/* Header */}
      <div style={{ background:'rgba(13,10,20,0.95)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(192,38,211,0.15)', padding:'0 24px', height:'60px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <Link to="/" style={{ display:'flex', alignItems:'center', gap:'10px', textDecoration:'none' }}>
          <div style={{ width:'32px', height:'32px', background:'linear-gradient(135deg,#EC4899,#C026D3)', borderRadius:'9px', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <i className="ri-equalizer-fill" style={{ color:'#fff', fontSize:'15px' }}></i>
          </div>
          <span style={{ fontWeight:700, fontSize:'15px', background:'linear-gradient(90deg,#EC4899,#C026D3)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>mixingmusic.ai</span>
        </Link>
        <Link to="/auth/login" style={{ color:'#9B7EC8', fontSize:'13px', textDecoration:'none', border:'1px solid rgba(192,38,211,0.25)', padding:'7px 16px', borderRadius:'980px', fontWeight:600 }}>
          Iniciar Sesión
        </Link>
      </div>

      {/* Form */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'calc(100vh - 60px)', padding:'40px 20px' }}>
        <div style={{ background:'rgba(26,16,40,0.9)', border:'1px solid rgba(192,38,211,0.2)', borderRadius:'24px', padding:'36px 32px', maxWidth:'480px', width:'100%', boxShadow:'0 0 60px rgba(192,38,211,0.1)' }}>

          <div style={{ textAlign:'center', marginBottom:'28px' }}>
            <div style={{ width:'64px', height:'64px', background:'linear-gradient(135deg,#EC4899,#C026D3)', borderRadius:'20px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:'28px', boxShadow:'0 0 28px rgba(192,38,211,0.4)' }}>🎛️</div>
            <h1 style={{ fontSize:'26px', fontWeight:800, color:'#F8F0FF', marginBottom:'6px', letterSpacing:'-0.5px' }}>Crea tu Cuenta</h1>
            <p style={{ fontSize:'14px', color:'rgba(155,126,200,0.8)' }}>Regístrate y haz tu primera mezcla gratis</p>
          </div>

          {/* Perks */}
          <div style={{ background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.15)', borderRadius:'12px', padding:'12px 16px', marginBottom:'22px' }}>
            <div style={{ fontSize:'12px', color:'rgba(248,240,255,0.65)', lineHeight:1.9 }}>
              <div>✦ 1 mezcla gratis al registrarte — sin tarjeta</div>
              <div>✦ Mezclador IA + 9 presets de género musical</div>
              <div>✦ IA EQ 12 bandas · WAV 24-bit a -10 LUFS</div>
              <div>✦ Mezclas ilimitadas por $3.99 pago único</div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'10px', padding:'10px 14px', marginBottom:'18px', display:'flex', gap:'8px' }}>
              <span style={{ color:'#f87171', flexShrink:0 }}>⚠</span>
              <span style={{ fontSize:'13px', color:'#fca5a5', lineHeight:1.5 }}>
                {error}
                {error.includes('registrado') && <>{' '}<Link to="/auth/login" style={{ color:'#EC4899', fontWeight:700 }}>Iniciar Sesión →</Link></>}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              {[{ label:'Nombre *', name:'firstName', ph:'Tu nombre' }, { label:'Apellido *', name:'lastName', ph:'Tu apellido' }].map(f => (
                <div key={f.name}>
                  <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(155,126,200,0.8)', display:'block', marginBottom:'6px' }}>{f.label}</label>
                  <input type="text" name={f.name} value={(form as any)[f.name]} onChange={onChange} placeholder={f.ph} disabled={loading} required style={inputS} />
                </div>
              ))}
            </div>

            <div>
              <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(155,126,200,0.8)', display:'block', marginBottom:'6px' }}>Correo Electrónico *</label>
              <input type="email" name="email" value={form.email} onChange={onChange} placeholder="tu@email.com" disabled={loading} required autoComplete="email" style={inputS} />
            </div>

            <div>
              <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(155,126,200,0.8)', display:'block', marginBottom:'6px' }}>Contraseña *</label>
              <input type="password" name="password" value={form.password} onChange={onChange} placeholder="Mínimo 6 caracteres" disabled={loading} required minLength={6} autoComplete="new-password" style={inputS} />
            </div>

            <div>
              <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(155,126,200,0.8)', display:'block', marginBottom:'6px' }}>País</label>
              <select name="country" value={form.country} onChange={onChange} disabled={loading} style={{ ...inputS, cursor:'pointer' }}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button type="submit" disabled={loading} style={{
              width:'100%', border:'none', color:'#fff', padding:'15px', borderRadius:'14px',
              fontSize:'16px', fontWeight:700, fontFamily:ff, marginTop:'4px',
              background: loading ? 'rgba(192,38,211,0.35)' : 'linear-gradient(135deg,#EC4899,#C026D3)',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 0 28px rgba(192,38,211,0.45)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
            }}>
              {loading
                ? <><span style={{ width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} />Creando cuenta...</>
                : '🎛️ Crear Cuenta y Empezar'}
            </button>
          </form>

          <p style={{ fontSize:'11px', color:'rgba(155,126,200,0.4)', textAlign:'center', marginTop:'16px', lineHeight:1.6 }}>
            Al crear una cuenta aceptas nuestros{' '}
            <Link to="/terms" style={{ color:'#C026D3', textDecoration:'none' }}>Términos</Link>{' '}y{' '}
            <Link to="/privacy" style={{ color:'#C026D3', textDecoration:'none' }}>Privacidad</Link>
          </p>
          <p style={{ fontSize:'13px', color:'rgba(155,126,200,0.7)', textAlign:'center', marginTop:'12px' }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/auth/login" style={{ color:'#EC4899', fontWeight:700, textDecoration:'none' }}>Iniciar Sesión →</Link>
          </p>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus,select:focus{border-color:rgba(192,38,211,0.5)!important;outline:none}`}</style>
    </div>
  );
};

export default RegisterPage;
