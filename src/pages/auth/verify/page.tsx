import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const SUPABASE_URL = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_ANON_KEY ?? '';

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<'loading'|'success'|'error'|'expired'>('loading');
  const [msg, setMsg] = useState('');

  // Supabase sends: token_hash, type, next (or just redirects automatically)
  const tokenHash = params.get('token_hash') || params.get('token') || '';
  const type = params.get('type') || 'signup';

  useEffect(() => {
    if (!tokenHash) {
      // Supabase Auth may have already handled the redirect — check if user is in session
      const stored = localStorage.getItem('audioMixerUser');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          if (u.id) { setStatus('success'); return; }
        } catch {}
      }
      setStatus('error');
      setMsg('Enlace de verificación inválido o ya usado.');
      return;
    }
    verifyToken();
  }, [tokenHash]);

  const verifyToken = async () => {
    try {
      // Supabase Auth REST: verify OTP (email confirmation)
      const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ token_hash: tokenHash, type }),
      });
      const data = await res.json();

      if (!res.ok) {
        const errMsg = data?.msg || data?.message || data?.error_description || '';
        if (errMsg.toLowerCase().includes('expired') || errMsg.toLowerCase().includes('expirado')) {
          setStatus('expired');
          setMsg('El enlace de verificación ha expirado. Registrate de nuevo para recibir un enlace fresco.');
        } else {
          setStatus('error');
          setMsg(errMsg || 'Error al verificar el email. El enlace puede haber sido ya usado.');
        }
        return;
      }

      // Success — update localStorage user
      if (data.user) {
        const stored = localStorage.getItem('audioMixerUser');
        const u = stored ? JSON.parse(stored) : {};
        const meta = data.user.user_metadata || {};
        localStorage.setItem('audioMixerUser', JSON.stringify({
          ...u,
          id: data.user.id,
          email: data.user.email,
          firstName: meta.first_name || u.firstName || data.user.email.split('@')[0],
          lastName: meta.last_name || u.lastName || '',
          country: meta.country || u.country || 'Colombia',
          credits: 999999,
          plan: meta.plan || 'free',
          is_pro: meta.is_pro || false,
          provider: 'email',
          createdAt: data.user.created_at,
          needsVerification: false,
          accessToken: data.access_token,
        }));
      }
      setStatus('success');
    } catch (e) {
      console.error('Verify error:', e);
      setStatus('error');
      setMsg('Error de conexión. Inténtalo de nuevo.');
    }
  };

  const ff = "'Outfit',system-ui,sans-serif";
  const pg: React.CSSProperties = { minHeight:'100vh', background:'linear-gradient(135deg,#0D0A14,#1a0a2e,#0d1a3a)', fontFamily:ff, color:'#F8F0FF', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' };

  if (status === 'loading') return (
    <div style={pg}>
      <div style={{textAlign:'center'}}>
        <div style={{width:'64px',height:'64px',border:'3px solid rgba(192,38,211,0.2)',borderTopColor:'#C026D3',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 20px'}}></div>
        <h2 style={{fontSize:'20px',fontWeight:700,color:'#F8F0FF',marginBottom:'8px'}}>Verificando tu email...</h2>
        <p style={{color:'rgba(155,126,200,0.7)',fontSize:'14px'}}>Un momento por favor</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (status === 'success') return (
    <div style={pg}>
      <div style={{background:'rgba(26,16,40,0.9)',border:'1px solid rgba(74,222,128,0.3)',borderRadius:'24px',padding:'44px 36px',maxWidth:'460px',width:'100%',textAlign:'center',boxShadow:'0 0 60px rgba(74,222,128,0.1)'}}>
        <div style={{width:'72px',height:'72px',background:'rgba(74,222,128,0.12)',border:'2px solid rgba(74,222,128,0.4)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:'32px'}}>✅</div>
        <h1 style={{fontSize:'26px',fontWeight:800,color:'#4ade80',marginBottom:'10px'}}>¡Email verificado!</h1>
        <p style={{fontSize:'14px',color:'rgba(248,240,255,0.7)',marginBottom:'24px',lineHeight:1.6}}>Tu cuenta está activa. Ya puedes hacer tu primera mezcla gratis con IA profesional.</p>
        <div style={{background:'rgba(74,222,128,0.06)',border:'1px solid rgba(74,222,128,0.15)',borderRadius:'12px',padding:'14px',marginBottom:'24px',textAlign:'left'}}>
          <div style={{fontSize:'12px',color:'rgba(248,240,255,0.65)',lineHeight:1.9}}>
            <div>✦ 1 mezcla gratis lista para usar</div>
            <div>✦ Mezclador IA + 9 presets de género</div>
            <div>✦ IA EQ 12 bandas · Exportación -10 LUFS · WAV 24-bit</div>
          </div>
        </div>
        <button onClick={()=>navigate('/')} style={{width:'100%',background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'16px',borderRadius:'14px',fontSize:'16px',fontWeight:700,cursor:'pointer',fontFamily:ff,boxShadow:'0 0 28px rgba(192,38,211,0.4)',marginBottom:'12px'}}>
          🎛️ Empezar a Mezclar
        </button>
        <Link to="/auth/login" style={{fontSize:'13px',color:'rgba(155,126,200,0.6)',textDecoration:'none'}}>O inicia sesión →</Link>
      </div>
    </div>
  );

  if (status === 'expired') return (
    <div style={pg}>
      <div style={{background:'rgba(26,16,40,0.9)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:'24px',padding:'44px 36px',maxWidth:'460px',width:'100%',textAlign:'center'}}>
        <div style={{fontSize:'40px',margin:'0 auto 16px'}}>⏳</div>
        <h1 style={{fontSize:'22px',fontWeight:800,color:'#F59E0B',marginBottom:'10px'}}>Enlace expirado</h1>
        <p style={{fontSize:'14px',color:'rgba(248,240,255,0.7)',marginBottom:'24px',lineHeight:1.6}}>{msg}</p>
        <Link to="/auth/register" style={{display:'block',background:'linear-gradient(135deg,#EC4899,#C026D3)',color:'#fff',padding:'14px',borderRadius:'14px',fontSize:'14px',fontWeight:700,textDecoration:'none',marginBottom:'10px'}}>Registrarse de nuevo</Link>
        <Link to="/auth/login" style={{fontSize:'13px',color:'rgba(155,126,200,0.6)',textDecoration:'none'}}>Ya tengo cuenta →</Link>
      </div>
    </div>
  );

  return (
    <div style={pg}>
      <div style={{background:'rgba(26,16,40,0.9)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'24px',padding:'44px 36px',maxWidth:'460px',width:'100%',textAlign:'center'}}>
        <div style={{fontSize:'40px',margin:'0 auto 16px'}}>❌</div>
        <h1 style={{fontSize:'22px',fontWeight:800,color:'#f87171',marginBottom:'10px'}}>Error de verificación</h1>
        <p style={{fontSize:'14px',color:'rgba(248,240,255,0.7)',marginBottom:'24px',lineHeight:1.6}}>{msg || 'El enlace no es válido o ya fue usado.'}</p>
        <Link to="/auth/register" style={{display:'block',background:'linear-gradient(135deg,#EC4899,#C026D3)',color:'#fff',padding:'14px',borderRadius:'14px',fontSize:'14px',fontWeight:700,textDecoration:'none',marginBottom:'10px'}}>Registrarse</Link>
        <Link to="/auth/login" style={{fontSize:'13px',color:'rgba(155,126,200,0.6)',textDecoration:'none'}}>Iniciar Sesión →</Link>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
