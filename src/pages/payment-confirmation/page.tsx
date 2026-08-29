import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMasteringEntitlements } from '../mastering/masteringAccess';

export default function PaymentConfirmation() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const status = params.get('status') || 'success';
  const provider = params.get('provider') || 'paypal';
  const [countdown, setCountdown] = useState(5);
  const [entitlementVerified, setEntitlementVerified] = useState<boolean | null>(null);
  const [verificationFinished, setVerificationFinished] = useState(status === 'failed');

  const verifyEntitlement = useCallback(async () => {
    setEntitlementVerified(null);
    setVerificationFinished(false);
    const attempts = provider === 'mp' ? 20 : 5;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const { unlimited } = await getMasteringEntitlements();
        if (unlimited) {
          const stored = localStorage.getItem('audioMixerUser');
          const user = stored ? JSON.parse(stored) : {};
          localStorage.setItem('audioMixerUser', JSON.stringify({ ...user, is_pro: true, plan: 'unlimited' }));
          localStorage.removeItem('mixingai_used_free');
          localStorage.removeItem('mixingmusic_pending_payment');
          setEntitlementVerified(true);
          setVerificationFinished(true);
          setCountdown(5);
          return;
        }
      } catch {
        // A delayed webhook or a brief network interruption should not become a false failure.
      }
      if (attempt < attempts - 1) await new Promise(resolve => window.setTimeout(resolve, 3000));
    }
    setEntitlementVerified(false);
    setVerificationFinished(true);
  }, [provider]);

  useEffect(() => {
    if (status === 'success' || status === 'pending') void verifyEntitlement();
  }, [status, verifyEntitlement]);

  useEffect(() => {
    if (entitlementVerified !== true && status !== 'failed') return;
    const t = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(t); navigate('/'); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [status, entitlementVerified, navigate]);

  const isOk = status !== 'failed' && entitlementVerified === true;
  const isPending = status !== 'failed' && entitlementVerified !== true;
  const isStillProcessing = isPending && !verificationFinished;

  return (
    <div style={{ minHeight:'100vh', background:'#0D0A14', backgroundImage:'url(/studio-bg.png)', backgroundSize:'cover', backgroundPosition:'center', backgroundAttachment:'fixed', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Outfit',system-ui,sans-serif", padding:'20px' }}>
      <div style={{ background:'linear-gradient(135deg,rgba(26,16,40,0.97),rgba(15,10,26,0.97))', border:`1px solid ${isOk?'rgba(74,222,128,0.35)':isPending?'rgba(245,158,11,0.35)':'rgba(239,68,68,0.35)'}`, borderRadius:'24px', padding:'48px 40px', maxWidth:'460px', width:'100%', textAlign:'center', boxShadow:`0 0 60px ${isOk?'rgba(74,222,128,0.15)':isPending?'rgba(245,158,11,0.1)':'rgba(239,68,68,0.1)'}` }}>
        <div style={{ width:'72px', height:'72px', borderRadius:'50%', margin:'0 auto 20px', background:isOk?'rgba(74,222,128,0.15)':isPending?'rgba(245,158,11,0.12)':'rgba(239,68,68,0.12)', border:`2px solid ${isOk?'rgba(74,222,128,0.5)':isPending?'rgba(245,158,11,0.4)':'rgba(239,68,68,0.4)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px' }}>
          {isOk ? '✅' : isPending ? '⏳' : '❌'}
        </div>
        <h1 style={{ fontSize:'24px', fontWeight:800, color:isOk?'#4ade80':isPending?'#F59E0B':'#f87171', marginBottom:'10px', letterSpacing:'-0.5px' }}>
          {isOk ? '¡Pago exitoso!' : isStillProcessing ? 'Confirmando tu pago' : isPending ? 'Tu pago sigue en verificación' : 'Pago fallido'}
        </h1>
        <p style={{ fontSize:'14px', color:'rgba(155,126,200,0.8)', marginBottom:'20px', lineHeight:1.6 }}>
          {isOk ? 'Tu acceso Unlimited ya está activo. ¡Ya puedes mezclar sin límites!' : isStillProcessing ? 'Estamos validando el pago y activando tu acceso de forma segura. No cierres esta ventana.' : isPending ? 'El proveedor aún no confirma el pago. No repitas la compra; puedes revisar nuevamente en unos segundos.' : 'Hubo un problema con tu pago. No se realizó ningún cargo.'}
        </p>
        {isOk && (
          <div style={{ background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:'12px', padding:'12px 16px', marginBottom:'24px' }}>
            <div style={{ fontSize:'12px', color:'#4ade80', fontWeight:700, marginBottom:'4px' }}>∞ Mezclas Ilimitadas Activadas</div>
            <div style={{ fontSize:'11px', color:'rgba(155,126,200,0.7)' }}>Procesado via {provider === 'mp' ? 'Mercado Pago' : 'PayPal'} · mixingmusic.ai</div>
          </div>
        )}
        <button onClick={() => navigate('/')} style={{ width:'100%', background:'linear-gradient(135deg,#EC4899,#C026D3)', border:'none', color:'#fff', padding:'16px', borderRadius:'14px', fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 0 24px rgba(192,38,211,0.4)', marginBottom:'10px' }}>
          {isOk ? '🎛️ Ir al Mezclador' : isPending ? 'Volver al inicio' : 'Volver al inicio'}
        </button>
        {!isOk && verificationFinished && (
          <button onClick={isPending ? verifyEntitlement : () => navigate('/checkout-v3')} style={{ width:'100%', background:'transparent', border:'1px solid rgba(192,38,211,0.25)', color:'#9B7EC8', padding:'12px', borderRadius:'14px', fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }}>
            {isPending ? 'Revisar activación nuevamente' : 'Intentar de nuevo'}
          </button>
        )}
        {(isOk || status === 'failed') && <p style={{ marginTop:'16px', fontSize:'12px', color:'rgba(155,126,200,0.4)' }}>Redirigiendo en {countdown}s...</p>}
      </div>
    </div>
  );
}
