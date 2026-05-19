import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function PaymentConfirmation() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const status = params.get('status') || 'success';
  const provider = params.get('provider') || 'paypal';
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (status === 'success') {
      try {
        const stored = localStorage.getItem('audioMixerUser');
        const u = stored ? JSON.parse(stored) : {};
        u.is_pro = true; u.plan = 'unlimited';
        localStorage.setItem('audioMixerUser', JSON.stringify(u));
        localStorage.removeItem('mixingai_used_free');
      } catch {}
    }
    const t = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(t); navigate('/'); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [status, navigate]);

  const isOk = status === 'success';
  const isPending = status === 'pending';

  return (
    <div style={{ minHeight:'100vh', background:'#0D0A14', backgroundImage:'url(/studio-bg.png)', backgroundSize:'cover', backgroundPosition:'center', backgroundAttachment:'fixed', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Outfit',system-ui,sans-serif", padding:'20px' }}>
      <div style={{ background:'linear-gradient(135deg,rgba(26,16,40,0.97),rgba(15,10,26,0.97))', border:`1px solid ${isOk?'rgba(74,222,128,0.35)':isPending?'rgba(245,158,11,0.35)':'rgba(239,68,68,0.35)'}`, borderRadius:'24px', padding:'48px 40px', maxWidth:'460px', width:'100%', textAlign:'center', boxShadow:`0 0 60px ${isOk?'rgba(74,222,128,0.15)':isPending?'rgba(245,158,11,0.1)':'rgba(239,68,68,0.1)'}` }}>
        <div style={{ width:'72px', height:'72px', borderRadius:'50%', margin:'0 auto 20px', background:isOk?'rgba(74,222,128,0.15)':isPending?'rgba(245,158,11,0.12)':'rgba(239,68,68,0.12)', border:`2px solid ${isOk?'rgba(74,222,128,0.5)':isPending?'rgba(245,158,11,0.4)':'rgba(239,68,68,0.4)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px' }}>
          {isOk ? '✅' : isPending ? '⏳' : '❌'}
        </div>
        <h1 style={{ fontSize:'24px', fontWeight:800, color:isOk?'#4ade80':isPending?'#F59E0B':'#f87171', marginBottom:'10px', letterSpacing:'-0.5px' }}>
          {isOk ? '¡Pago exitoso!' : isPending ? 'Pago pendiente' : 'Pago fallido'}
        </h1>
        <p style={{ fontSize:'14px', color:'rgba(155,126,200,0.8)', marginBottom:'20px', lineHeight:1.6 }}>
          {isOk ? 'Tu suscripción de mezclas ilimitadas ha sido activada. ¡Ya puedes mezclar sin límites!' : isPending ? 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.' : 'Hubo un problema con tu pago. No se realizó ningún cargo.'}
        </p>
        {isOk && (
          <div style={{ background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:'12px', padding:'12px 16px', marginBottom:'24px' }}>
            <div style={{ fontSize:'12px', color:'#4ade80', fontWeight:700, marginBottom:'4px' }}>∞ Mezclas Ilimitadas Activadas</div>
            <div style={{ fontSize:'11px', color:'rgba(155,126,200,0.7)' }}>Procesado via {provider === 'mp' ? 'Mercado Pago' : 'PayPal'} · mixingmusic.ai</div>
          </div>
        )}
        <button onClick={() => navigate('/')} style={{ width:'100%', background:'linear-gradient(135deg,#EC4899,#C026D3)', border:'none', color:'#fff', padding:'16px', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 0 24px rgba(192,38,211,0.4)', marginBottom:'10px' }}>
          {isOk ? '🎛️ Ir al Mezclador' : 'Volver al inicio'}
        </button>
        {!isOk && (
          <button onClick={() => navigate('/billing')} style={{ width:'100%', background:'transparent', border:'1px solid rgba(192,38,211,0.25)', color:'#9B7EC8', padding:'12px', borderRadius:'14px', fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }}>
            Intentar de nuevo
          </button>
        )}
        <p style={{ marginTop:'16px', fontSize:'12px', color:'rgba(155,126,200,0.4)' }}>Redirigiendo en {countdown}s...</p>
      </div>
    </div>
  );
}
