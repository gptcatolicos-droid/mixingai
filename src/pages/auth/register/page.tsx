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
  const [done, setDone] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { firstName, lastName, email, password, country } = form;

    if (!firstName || !lastName || !email || !password) {
      setError('Por favor completa todos los campos.'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresa un email válido.'); return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener mínimo 6 caracteres.'); return;
    }

    setLoading(true);
    try {
      // Supabase Auth REST API — no library needed
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email,
          password,
          data: { first_name: firstName, last_name: lastName, country, plan: 'free', is_pro: false },
          options: { emailRedirectTo: `${window.location.origin}/auth/verify` },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.msg || data?.error_description || data?.message || '';
        if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
          setError('Este email ya está registrado. ¿Quieres iniciar sesión?');
        } else if (msg.toLowerCase().includes('password')) {
          setError('La contraseña no cumple los requisitos mínimos.');
        } else {
          setError(msg || 'Error al crear la cuenta. Inténtalo de nuevo.');
        }
        return;
      }

      // Store minimal user in localStorage
      if (data.user) {
        localStorage.setItem('audioMixerUser', JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          firstName, lastName, country,
          credits: 999999, plan: 'free', is_pro: false,
          provider: 'email',
          createdAt: data.user.created_at || new Date().toISOString(),
          username: `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
          needsVerification: !data.user.email_confirmed_at,
        }));
      }

      setDone(true);
    } catch (err: any) {
      console.error(err);
      setError('Error de conexión. Verifica tu internet e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // ── Éxito ──
  if (done) return (
    <div style={pg}>
      <div style={headerS}>
        <LogoLink />
        <Link to="/auth/login" style={loginLink}>Iniciar Sesión</Link>
      </div>
      <div style={center}>
        <div style={{...box, borderColor:'rgba(74,222,128,0.3)'}}>
          <div style={iconCircle('#4ade80')}>📧</div>
          <h2 style={{...h1, color:'#4ade80'}}>¡Cuenta creada!</h2>
          <p style={sub}>Enviamos un email de verificación a:</p>
          <p style={{color:'#EC4899', fontWeight:700, fontSize:'16px', margin:'4px 0 20px'}}>{form.email}</p>
          <div style={infoBox('#4ade80')}>
            <div style={infoRow}>✓ Revisa bandeja de entrada y spam</div>
            <div style={infoRow}>✓ Haz clic en el enlace para activar tu cuenta</div>
            <div style={infoRow}>✓ Después podrás hacer tu primera mezcla gratis</div>
          </div>
          <button onClick={()=>navigate('/auth/login')} style={primaryBtn}>Ir a Iniciar Sesión →</button>
          <p style={{fontSize:'12px',color:'rgba(155,126,200,0.5)',marginTop:'12px'}}>
            También puedes{' '}
            <button onClick={()=>navigate('/')} style={{background:'none',border:'none',color:'#C026D3',cursor:'pointer',fontFamily:'inherit',fontSize:'12px',fontWeight:600}}>
              ir al inicio
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  // ── Formulario ──
  return (
    <div style={pg}>
      <div style={headerS}>
        <LogoLink />
        <Link to="/auth/login" style={loginLink}>Iniciar Sesión</Link>
      </div>
      <div style={center}>
        <div style={box}>
          <div style={{textAlign:'center',marginBottom:'28px'}}>
            <div style={iconCircle('#C026D3')}>🎛️</div>
            <h1 style={h1}>Crea tu Cuenta</h1>
            <p style={sub}>Regístrate y haz tu primera mezcla gratis</p>
          </div>

          {/* Bienvenida */}
          <div style={infoBox('#4ade80')}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
              <span>🎵</span>
              <span style={{fontSize:'13px',fontWeight:700,color:'#4ade80'}}>¡Bienvenido al Estudio!</span>
            </div>
            <div style={{fontSize:'12px',color:'rgba(248,240,255,0.65)',lineHeight:1.8}}>
              <div>✦ 1 mezcla gratis al registrarte</div>
              <div>✦ Mezclador IA + 9 presets de género</div>
              <div>✦ IA EQ · Exportación a -10 LUFS · WAV 24-bit</div>
              <div>✦ Mezclas ilimitadas por $3.99</div>
            </div>
          </div>

          {error && (
            <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'10px',padding:'10px 14px',margin:'0 0 16px',display:'flex',gap:'8px'}}>
              <span style={{color:'#f87171',flexShrink:0}}>⚠</span>
              <span style={{fontSize:'13px',color:'#fca5a5',lineHeight:1.5}}>
                {error}
                {error.includes('registrado') && (
                  <>{' '}<Link to="/auth/login" style={{color:'#EC4899',fontWeight:700}}>Iniciar Sesión</Link></>
                )}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'14px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              {[{label:'Nombre *',name:'firstName',ph:'Tu nombre'},{label:'Apellido *',name:'lastName',ph:'Tu apellido'}].map(f=>(
                <div key={f.name}>
                  <label style={labelS}>{f.label}</label>
                  <input type="text" name={f.name} value={(form as any)[f.name]} onChange={onChange}
                    placeholder={f.ph} disabled={loading} required style={inputS}/>
                </div>
              ))}
            </div>
            <div>
              <label style={labelS}>Correo Electrónico *</label>
              <input type="email" name="email" value={form.email} onChange={onChange}
                placeholder="tu@email.com" disabled={loading} required style={inputS}/>
            </div>
            <div>
              <label style={labelS}>Contraseña *</label>
              <input type="password" name="password" value={form.password} onChange={onChange}
                placeholder="Mínimo 6 caracteres" disabled={loading} required minLength={6} style={inputS}/>
            </div>
            <div>
              <label style={labelS}>País</label>
              <select name="country" value={form.country} onChange={onChange} disabled={loading}
                style={{...inputS,cursor:'pointer'}}>
                {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button type="submit" disabled={loading} style={{
              ...primaryBtn, marginTop:'4px',
              background: loading ? 'rgba(192,38,211,0.4)' : 'linear-gradient(135deg,#EC4899,#C026D3)',
              cursor: loading ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'
            }}>
              {loading
                ? <><Spinner/>Creando cuenta...</>
                : '🎛️ Crear Cuenta Gratis'}
            </button>
          </form>

          <p style={{fontSize:'11px',color:'rgba(155,126,200,0.45)',textAlign:'center',marginTop:'16px',lineHeight:1.6}}>
            Al crear una cuenta aceptas nuestros{' '}
            <Link to="/terms" style={{color:'#C026D3',textDecoration:'none'}}>Términos</Link>{' '}y{' '}
            <Link to="/privacy" style={{color:'#C026D3',textDecoration:'none'}}>Privacidad</Link>
          </p>
          <p style={{fontSize:'13px',color:'rgba(155,126,200,0.7)',textAlign:'center',marginTop:'12px'}}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/auth/login" style={{color:'#EC4899',fontWeight:700,textDecoration:'none'}}>Iniciar Sesión →</Link>
          </p>
        </div>
      </div>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        input:focus,select:focus{border-color:rgba(192,38,211,0.5)!important;outline:none}
      `}</style>
    </div>
  );
};

// ── Helpers ──
const Spinner = () => (
  <span style={{width:'14px',height:'14px',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite'}}/>
);
const LogoLink = () => (
  <Link to="/" style={{display:'flex',alignItems:'center',gap:'10px',textDecoration:'none'}}>
    <div style={{width:'32px',height:'32px',background:'linear-gradient(135deg,#EC4899,#C026D3)',borderRadius:'9px',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <i className="ri-equalizer-fill" style={{color:'#fff',fontSize:'15px'}}></i>
    </div>
    <span style={{fontWeight:700,fontSize:'15px',background:'linear-gradient(90deg,#EC4899,#C026D3)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>mixingmusic.ai</span>
  </Link>
);

// ── Styles ──
const ff = "'Outfit',system-ui,sans-serif";
const pg: React.CSSProperties = {minHeight:'100vh',background:'linear-gradient(135deg,#0D0A14,#1a0a2e,#0d1a3a)',fontFamily:ff,color:'#F8F0FF'};
const headerS: React.CSSProperties = {background:'rgba(13,10,20,0.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(192,38,211,0.15)',padding:'0 24px',height:'60px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100};
const loginLink: React.CSSProperties = {color:'#9B7EC8',fontSize:'13px',textDecoration:'none',border:'1px solid rgba(192,38,211,0.25)',padding:'7px 16px',borderRadius:'980px',fontWeight:600};
const center: React.CSSProperties = {display:'flex',alignItems:'center',justifyContent:'center',minHeight:'calc(100vh - 60px)',padding:'40px 20px'};
const box: React.CSSProperties = {background:'rgba(26,16,40,0.9)',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'24px',padding:'36px 32px',maxWidth:'480px',width:'100%',boxShadow:'0 0 60px rgba(192,38,211,0.1)'};
const h1: React.CSSProperties = {fontSize:'26px',fontWeight:800,color:'#F8F0FF',marginBottom:'6px',letterSpacing:'-0.5px',textAlign:'center'};
const sub: React.CSSProperties = {fontSize:'14px',color:'rgba(155,126,200,0.8)',textAlign:'center',marginBottom:'0'};
const labelS: React.CSSProperties = {fontSize:'12px',fontWeight:600,color:'rgba(155,126,200,0.8)',display:'block',marginBottom:'6px'};
const inputS: React.CSSProperties = {width:'100%',background:'rgba(8,4,16,0.6)',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'10px',padding:'10px 14px',color:'#F8F0FF',fontSize:'14px',fontFamily:ff,boxSizing:'border-box' as const};
const primaryBtn: React.CSSProperties = {width:'100%',background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'15px',borderRadius:'14px',fontSize:'15px',fontWeight:700,cursor:'pointer',fontFamily:ff,boxShadow:'0 0 28px rgba(192,38,211,0.4)',transition:'opacity 0.2s'};
const iconCircle = (color: string): React.CSSProperties => ({width:'64px',height:'64px',background:`linear-gradient(135deg,${color}30,${color}15)`,border:`2px solid ${color}40`,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:'28px'});
const infoBox = (color: string): React.CSSProperties => ({background:`rgba(${color==='#4ade80'?'74,222,128':'192,38,211'},0.06)`,border:`1px solid rgba(${color==='#4ade80'?'74,222,128':'192,38,211'},0.2)`,borderRadius:'12px',padding:'14px 16px',marginBottom:'20px'});
const infoRow: React.CSSProperties = {fontSize:'12px',color:'rgba(248,240,255,0.65)',lineHeight:1.9};

export default RegisterPage;
