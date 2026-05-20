import { useState } from 'react';

interface UpgradeModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  user?: { id: string; email: string; firstName?: string } | null;
  trigger?: 'master' | 'export' | 'limit';
}

const SUPABASE_URL = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
const MP_PUBLIC_KEY = 'APP_USR-13129ced-ad54-4ed2-b5dc-0ae59e62f9cd';

const BENEFITS = [
  { icon: '🎛️', text: 'Mezclas ilimitadas' },
  { icon: '✦',  text: 'Masterizar con IA — -12 LUFS' },
  { icon: '💾', text: 'Exportar WAV 24-bit' },
  { icon: '📊', text: 'Análisis AI del audio' },
  { icon: '🔗', text: 'Link compartible público' },
  { icon: '☁️', text: 'Proyectos guardados en nube' },
];

export default function UpgradeModal({ onClose, onSuccess, user, trigger = 'master' }: UpgradeModalProps) {
  const [step, setStep] = useState<'plans' | 'register' | 'paying'>('plans');
  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payMethod, setPayMethod] = useState<'mp' | 'paypal' | null>(null);

  const triggerText = {
    master: 'Para masterizar con IA necesitas el plan Pro',
    export: 'Para exportar WAV necesitas el plan Pro',
    limit: 'Llegaste al límite de 2 mezclas gratuitas este mes',
  }[trigger];

  const handleGoogleAuth = () => {
    window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(window.location.origin + '?upgrade=1')}`;
  };

  const handleEmailRegister = async () => {
    if (!email || !password || !firstName) { setError('Completa todos los campos'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description || data.msg || 'Error al registrarse');
      const userId = data.user?.id;
      if (userId) {
        const ip = await fetch('https://api.ipify.org?format=json').then(r=>r.json()).then(d=>d.ip).catch(()=>'0.0.0.0');
        await fetch(`${SUPABASE_URL}/functions/v1/register-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}` },
          body: JSON.stringify({ user: { id: userId, firstName, lastName: '', email, country: 'Colombia', credits: 999999, plan: 'free', mixes_this_month: 0, provider: 'email', createdAt: new Date().toISOString(), username: email.split('@')[0] }, ipAddress: ip })
        });
        localStorage.setItem('audioMixerUser', JSON.stringify({ id: userId, firstName, email, plan: 'free', mixes_this_month: 0 }));
      }
      setStep('paying');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleMercadoPago = async () => {
    setPayMethod('mp'); setLoading(true);
    try {
      const currentUser = user || JSON.parse(localStorage.getItem('audioMixerUser') || '{}');
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-mercadopago-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}` },
        body: JSON.stringify({ userId: currentUser.id, userEmail: currentUser.email || email })
      });
      const data = await res.json();
      if (data.init_point) window.open(data.init_point, '_blank');
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handlePayPal = async () => {
    setPayMethod('paypal'); setLoading(true);
    try {
      const currentUser = user || JSON.parse(localStorage.getItem('audioMixerUser') || '{}');
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-paypal-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}` },
        body: JSON.stringify({ userId: currentUser.id, amount: '3.99', description: 'MixingMusic.AI Pro — 1 mes' })
      });
      const data = await res.json();
      if (data.approvalUrl) window.open(data.approvalUrl, '_blank');
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const S = {
    overlay: { position:'fixed' as const, inset:0, background:'rgba(8,4,16,0.94)', backdropFilter:'blur(10px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' },
    card: { background:'linear-gradient(135deg,rgba(30,18,50,0.99),rgba(18,10,30,0.99))', border:'1px solid rgba(192,38,211,0.25)', borderRadius:'24px', padding:'36px 32px', maxWidth:'460px', width:'100%', position:'relative' as const, overflow:'hidden' as const },
    input: { width:'100%', background:'rgba(8,4,16,0.7)', border:'1px solid rgba(192,38,211,0.2)', borderRadius:'10px', padding:'12px 16px', color:'#F8F0FF', fontSize:'14px', fontFamily:'inherit', outline:'none', boxSizing:'border-box' as const },
    label: { fontSize:'11px', fontWeight:700, color:'#9B7EC8', marginBottom:'5px', display:'block' as const, letterSpacing:'0.3px' },
  };

  return (
    <div style={S.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={S.card}>
        {/* Barra superior gradiente */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:'3px', background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)' }}></div>
        <button onClick={onClose} style={{ position:'absolute', top:'16px', right:'16px', background:'none', border:'none', color:'#9B7EC8', fontSize:'20px', cursor:'pointer', lineHeight:1 }}>✕</button>

        {/* STEP 1: PLANES */}
        {step === 'plans' && (<>
          <div style={{ textAlign:'center', marginBottom:'24px' }}>
            <div style={{ fontSize:'36px', marginBottom:'10px' }}>✦</div>
            <h2 style={{ fontSize:'22px', fontWeight:800, color:'#F8F0FF', marginBottom:'8px', letterSpacing:'-0.5px' }}>
              {trigger === 'master' ? 'Masteriza como un pro' : trigger === 'limit' ? '2 mezclas usadas' : 'Exporta en WAV 24-bit'}
            </h2>
            <p style={{ fontSize:'13px', color:'#9B7EC8', lineHeight:1.6 }}>{triggerText}</p>
          </div>

          {/* Cards Free vs Pro */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'24px' }}>
            {/* Free */}
            <div style={{ background:'rgba(8,4,16,0.5)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px', padding:'16px', opacity:0.7 }}>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#9B7EC8', marginBottom:'6px' }}>Gratis</div>
              <div style={{ fontSize:'28px', fontWeight:900, color:'#F8F0FF', lineHeight:1 }}>$0</div>
              <div style={{ fontSize:'11px', color:'rgba(248,240,255,0.4)', margin:'8px 0 12px' }}>para siempre</div>
              {['2 mezclas/mes','MP3 only','Sin mastering'].map((f,i)=>(
                <div key={i} style={{ fontSize:'11px', color:'rgba(248,240,255,0.5)', marginBottom:'4px', display:'flex', gap:'6px' }}>
                  <span style={{ color:'rgba(255,255,255,0.2)' }}>—</span> {f}
                </div>
              ))}
            </div>
            {/* Pro */}
            <div style={{ background:'rgba(192,38,211,0.08)', border:'2px solid #C026D3', borderRadius:'14px', padding:'16px', position:'relative' as const }}>
              <div style={{ position:'absolute' as const, top:'-10px', left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#EC4899,#C026D3)', borderRadius:'980px', padding:'3px 12px', fontSize:'10px', fontWeight:700, color:'#fff', whiteSpace:'nowrap' }}>🔥 POPULAR</div>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#C026D3', marginBottom:'6px' }}>Pro</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:'3px', lineHeight:1 }}>
                <span style={{ fontSize:'28px', fontWeight:900, background:'linear-gradient(135deg,#EC4899,#C026D3)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>$3.99</span>
              </div>
              <div style={{ fontSize:'11px', color:'rgba(248,240,255,0.4)', margin:'8px 0 12px' }}>/mes · cancela cuando quieras</div>
              {BENEFITS.map((b,i)=>(
                <div key={i} style={{ fontSize:'11px', color:'rgba(248,240,255,0.85)', marginBottom:'5px', display:'flex', alignItems:'center', gap:'6px' }}>
                  <span style={{ color:'#C026D3', fontSize:'12px' }}>{b.icon}</span> {b.text}
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => user ? setStep('paying') : setStep('register')}
            style={{ width:'100%', background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)', border:'none', color:'#fff', padding:'16px', borderRadius:'980px', fontSize:'16px', fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 0 28px rgba(192,38,211,0.5)', marginBottom:'10px' }}>
            🚀 Hazte Pro — $3.99/mes
          </button>
          <div style={{ textAlign:'center', fontSize:'11px', color:'rgba(248,240,255,0.3)' }}>
            PayPal · Mercado Pago · Cancela cuando quieras
          </div>
        </>)}

        {/* STEP 2: REGISTRO */}
        {step === 'register' && (<>
          <div style={{ textAlign:'center', marginBottom:'24px' }}>
            <h2 style={{ fontSize:'20px', fontWeight:800, color:'#F8F0FF', marginBottom:'6px' }}>Crear tu cuenta Pro</h2>
            <p style={{ fontSize:'13px', color:'#9B7EC8' }}>30 segundos · sin tarjeta hasta confirmar</p>
          </div>

          <button onClick={handleGoogleAuth}
            style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'#F8F0FF', padding:'14px', borderRadius:'14px', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', marginBottom:'16px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuar con Google
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
            <div style={{ flex:1, height:'1px', background:'rgba(192,38,211,0.15)' }}></div>
            <span style={{ fontSize:'11px', color:'#9B7EC8' }}>o con email</span>
            <div style={{ flex:1, height:'1px', background:'rgba(192,38,211,0.15)' }}></div>
          </div>

          {error && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'10px', padding:'10px 14px', fontSize:'12px', color:'#f87171', marginBottom:'14px' }}>{error}</div>}

          <div style={{ display:'flex', flexDirection:'column' as const, gap:'12px', marginBottom:'16px' }}>
            <div>
              <label style={S.label}>Nombre</label>
              <input value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="Tu nombre" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Email</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="tu@email.com" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Contraseña</label>
              <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Mínimo 6 caracteres" style={S.input} />
            </div>
          </div>

          <button onClick={handleEmailRegister} disabled={loading}
            style={{ width:'100%', background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)', border:'none', color:'#fff', padding:'14px', borderRadius:'980px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginBottom:'10px', opacity:loading?0.7:1 }}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta y continuar →'}
          </button>
          <div style={{ textAlign:'center', fontSize:'12px', color:'#9B7EC8' }}>
            ¿Ya tienes cuenta? <button onClick={()=>setStep('paying')} style={{ background:'none', border:'none', color:'#C026D3', cursor:'pointer', fontFamily:'inherit', fontWeight:600, fontSize:'12px', padding:0 }}>Ir al pago</button>
          </div>
        </>)}

        {/* STEP 3: PAGO */}
        {step === 'paying' && (<>
          <div style={{ textAlign:'center', marginBottom:'28px' }}>
            <div style={{ fontSize:'36px', marginBottom:'10px' }}>💳</div>
            <h2 style={{ fontSize:'20px', fontWeight:800, color:'#F8F0FF', marginBottom:'6px' }}>Elige cómo pagar</h2>
            <div style={{ display:'inline-flex', alignItems:'baseline', gap:'4px', background:'rgba(192,38,211,0.1)', border:'1px solid rgba(192,38,211,0.2)', borderRadius:'980px', padding:'6px 16px' }}>
              <span style={{ fontSize:'24px', fontWeight:900, background:'linear-gradient(135deg,#EC4899,#C026D3)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>$3.99</span>
              <span style={{ fontSize:'13px', color:'#9B7EC8' }}>/mes</span>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column' as const, gap:'12px', marginBottom:'20px' }}>
            <button onClick={handleMercadoPago} disabled={loading}
              style={{ width:'100%', background:payMethod==='mp'?'rgba(0,164,0,0.2)':'#00a400', border:payMethod==='mp'?'2px solid #00a400':'none', color:'#fff', padding:'16px', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', opacity:loading&&payMethod!=='mp'?0.5:1 }}>
              <span style={{ fontSize:'20px' }}>💳</span>
              {payMethod==='mp'&&loading ? 'Conectando a Mercado Pago...' : 'Pagar con Mercado Pago'}
            </button>
            <button onClick={handlePayPal} disabled={loading}
              style={{ width:'100%', background:payMethod==='paypal'?'rgba(0,112,186,0.2)':'linear-gradient(135deg,#003087,#009cde)', border:payMethod==='paypal'?'2px solid #009cde':'none', color:'#fff', padding:'16px', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', opacity:loading&&payMethod!=='paypal'?0.5:1 }}>
              <span style={{ fontSize:'20px' }}>🅿️</span>
              {payMethod==='paypal'&&loading ? 'Conectando a PayPal...' : 'Pagar con PayPal'}
            </button>
          </div>

          <div style={{ background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.15)', borderRadius:'12px', padding:'12px 16px', marginBottom:'16px' }}>
            {['Cancela cuando quieras — sin permanencia', 'Pago seguro y encriptado', 'Activa inmediatamente al pagar'].map((t,i)=>(
              <div key={i} style={{ fontSize:'12px', color:'rgba(248,240,255,0.7)', display:'flex', gap:'8px', marginBottom:i<2?'6px':0 }}>
                <span style={{ color:'#4ade80' }}>✓</span> {t}
              </div>
            ))}
          </div>
          <div style={{ textAlign:'center', fontSize:'11px', color:'rgba(248,240,255,0.3)' }}>
            Al pagar aceptas los términos de servicio
          </div>
        </>)}
      </div>
    </div>
  );
}
