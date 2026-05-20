import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const SUPABASE_URL = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Hardcoded unlimited users — always work
const SUPER: Record<string, { firstName: string; lastName: string }> = {
  'danipalacio@gmail.com': { firstName: 'Dani', lastName: 'Palacio' },
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const saveAndGo = (id: string, email: string, meta: any = {}, token?: string, isPro = false) => {
    localStorage.setItem('audioMixerUser', JSON.stringify({
      id, email,
      firstName: meta.first_name || email.split('@')[0],
      lastName: meta.last_name || '',
      country: meta.country || 'Colombia',
      credits: isPro ? 999999 : 0,
      plan: isPro ? 'unlimited' : (meta.plan || 'free'),
      is_pro: isPro || meta.is_pro || false,
      provider: 'email',
      createdAt: new Date().toISOString(),
      username: meta.username || email.split('@')[0],
      ...(token ? { accessToken: token } : {}),
    }));
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { email, password } = form;
    if (!email || !password) { setError('Completa todos los campos.'); return; }

    setLoading(true);
    try {
      // ── 1. Super user bypass ──────────────────────────────────
      const key = email.trim().toLowerCase();
      if (SUPER[key]) {
        saveAndGo(`super_${key}`, key, { first_name: SUPER[key].firstName, last_name: SUPER[key].lastName, country: 'Colombia' }, undefined, true);
        return;
      }

      // ── 2. Normal Supabase login ──────────────────────────────
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (res.ok && data.access_token) {
        const meta = data.user?.user_metadata || {};
        const isPro = meta.is_pro || meta.plan === 'unlimited' || false;
        saveAndGo(data.user.id, data.user.email, meta, data.access_token, isPro);
        return;
      }

      // ── 3. Handle errors ─────────────────────────────────────
      const msg = (data?.error_description || data?.msg || data?.message || '').toLowerCase();

      if (msg.includes('email not confirmed')) {
        // Supabase has confirmation ON but user exists — log them in anyway
        // by trusting localStorage from register step
        const stored = localStorage.getItem('audioMixerUser');
        if (stored) {
          try {
            const u = JSON.parse(stored);
            if (u.email === email.trim()) {
              // Already have their data — just redirect
              navigate('/');
              return;
            }
          } catch {}
        }
        setError('Tu email aún no está verificado. Revisa tu bandeja de entrada y haz clic en el enlace de confirmación, luego vuelve aquí.');
      } else if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('wrong password')) {
        setError('Email o contraseña incorrectos. ¿Olvidaste tu contraseña?');
      } else if (msg.includes('rate limit') || msg.includes('too many')) {
        setError('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.');
      } else {
        setError(msg || 'Error al iniciar sesión. Inténtalo de nuevo.');
      }

    } catch (err: any) {
      console.error('Login error:', err);
      setError('Error de conexión. Verifica tu internet e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const ff = "'Outfit',system-ui,sans-serif";
  const inputS: React.CSSProperties = {
    width: '100%', background: 'rgba(8,4,16,0.6)', border: '1px solid rgba(192,38,211,0.2)',
    borderRadius: '10px', padding: '11px 14px', color: '#F8F0FF', fontSize: '14px',
    fontFamily: ff, boxSizing: 'border-box' as const,
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
        <Link to="/auth/register" style={{ background:'linear-gradient(135deg,#EC4899,#C026D3)', color:'#fff', padding:'8px 18px', borderRadius:'980px', fontSize:'13px', fontWeight:600, textDecoration:'none' }}>
          Crear Cuenta
        </Link>
      </div>

      {/* Form */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'calc(100vh - 60px)', padding:'40px 20px' }}>
        <div style={{ background:'rgba(26,16,40,0.9)', border:'1px solid rgba(192,38,211,0.2)', borderRadius:'24px', padding:'36px 32px', maxWidth:'440px', width:'100%', boxShadow:'0 0 60px rgba(192,38,211,0.1)' }}>

          <div style={{ textAlign:'center', marginBottom:'28px' }}>
            <div style={{ width:'64px', height:'64px', background:'linear-gradient(135deg,#EC4899,#C026D3)', borderRadius:'20px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:'28px', boxShadow:'0 0 28px rgba(192,38,211,0.4)' }}>🎛️</div>
            <h1 style={{ fontSize:'26px', fontWeight:800, color:'#F8F0FF', marginBottom:'6px', letterSpacing:'-0.5px' }}>¡Bienvenido de vuelta!</h1>
            <p style={{ fontSize:'14px', color:'rgba(155,126,200,0.8)' }}>Accede a tu estudio de mezclas</p>
          </div>

          {error && (
            <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'10px', padding:'10px 14px', marginBottom:'18px', display:'flex', gap:'8px' }}>
              <span style={{ color:'#f87171', flexShrink:0 }}>⚠</span>
              <span style={{ fontSize:'13px', color:'#fca5a5', lineHeight:1.5 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <div>
              <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(155,126,200,0.8)', display:'block', marginBottom:'6px' }}>Correo Electrónico</label>
              <input type="email" name="email" value={form.email} onChange={onChange} placeholder="tu@email.com" disabled={loading} required autoComplete="email" style={inputS} />
            </div>
            <div>
              <label style={{ fontSize:'12px', fontWeight:600, color:'rgba(155,126,200,0.8)', display:'block', marginBottom:'6px' }}>Contraseña</label>
              <input type="password" name="password" value={form.password} onChange={onChange} placeholder="Tu contraseña" disabled={loading} required autoComplete="current-password" style={inputS} />
            </div>

            <button type="submit" disabled={loading} style={{
              width:'100%', border:'none', color:'#fff', padding:'15px', borderRadius:'14px',
              fontSize:'16px', fontWeight:700, fontFamily:ff,
              background: loading ? 'rgba(192,38,211,0.35)' : 'linear-gradient(135deg,#EC4899,#C026D3)',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 0 28px rgba(192,38,211,0.45)',
              display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
            }}>
              {loading
                ? <><span style={{ width:'16px', height:'16px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} />Iniciando sesión...</>
                : 'Iniciar Sesión'}
            </button>
          </form>

          <p style={{ textAlign:'center', fontSize:'13px', color:'rgba(155,126,200,0.7)', marginTop:'20px' }}>
            ¿No tienes cuenta?{' '}
            <Link to="/auth/register" style={{ color:'#EC4899', fontWeight:700, textDecoration:'none' }}>Crear cuenta gratis →</Link>
          </p>
          <p style={{ textAlign:'center', fontSize:'11px', color:'rgba(155,126,200,0.4)', marginTop:'8px' }}>
            ¿Problemas para entrar?{' '}
            <a href="mailto:support@mixingmusic.ai" style={{ color:'#9B7EC8', textDecoration:'none' }}>support@mixingmusic.ai</a>
          </p>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus{border-color:rgba(192,38,211,0.5)!important;outline:none}`}</style>
    </div>
  );
};

export default LoginPage;
