import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSecureAccessToken, secureMasteringAccessEnabled } from '../masteringAccess';
import { captureMasteringOrder, createMasteringOrder } from '../masteringCheckout';
import './checkout.css';

declare global {
  interface Window { paypal?: any }
}

export default function MasteringCheckoutPage() {
  const navigate = useNavigate();
  const buttonsRendered = useRef(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [status, setStatus] = useState<'ready' | 'processing' | 'success'>('ready');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('audioMixerUser')) {
      navigate('/auth/register?mode=checkout', { replace: true });
      return;
    }
    if (!secureMasteringAccessEnabled) return;
    getSecureAccessToken()
      .then(() => setSessionReady(true))
      .catch(() => navigate('/auth/login?mode=checkout', { replace: true }));
  }, [navigate]);

  useEffect(() => {
    if (!sessionReady || !secureMasteringAccessEnabled) return;
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
    if (!clientId) {
      setError('El pago seguro todavía no está configurado.');
      return;
    }
    if (window.paypal) { setSdkReady(true); return; }
    const existing = document.querySelector<HTMLScriptElement>('script[data-mixingmusic-v3-paypal]');
    if (existing) {
      existing.addEventListener('load', () => setSdkReady(true), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;
    script.async = true;
    script.dataset.mixingmusicV3Paypal = 'true';
    script.onload = () => setSdkReady(true);
    script.onerror = () => setError('No pudimos cargar PayPal. Revisa tu conexión e inténtalo nuevamente.');
    document.head.appendChild(script);
  }, [sessionReady]);

  useEffect(() => {
    if (!sdkReady || !window.paypal || buttonsRendered.current || status === 'success') return;
    buttonsRendered.current = true;
    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', height: 48 },
      createOrder: async () => {
        setError('');
        setStatus('processing');
        try {
          const order = await createMasteringOrder();
          return order.orderID;
        } catch (checkoutError) {
          setStatus('ready');
          const code = checkoutError instanceof Error ? checkoutError.message : '';
          setError(code === 'ALREADY_UNLIMITED'
            ? 'Tu cuenta ya tiene Unlimited activo.'
            : code === 'SECURE_SESSION_REQUIRED'
              ? 'Tu sesión expiró. Ingresa nuevamente para continuar.'
              : 'No pudimos crear la orden de pago. Inténtalo nuevamente.');
          throw checkoutError;
        }
      },
      onApprove: async (data: { orderID: string }) => {
        try {
          await captureMasteringOrder(data.orderID);
          const stored = JSON.parse(localStorage.getItem('audioMixerUser') || '{}');
          localStorage.setItem('audioMixerUser', JSON.stringify({ ...stored, is_pro: true, plan: 'unlimited' }));
          setStatus('success');
          setError('');
        } catch {
          setStatus('ready');
          setError('PayPal recibió la operación, pero no pudimos verificarla. No repitas el pago; contáctanos con el número de orden.');
        }
      },
      onCancel: () => { setStatus('ready'); setError('Pago cancelado. No se realizó ningún cargo.'); },
      onError: () => { setStatus('ready'); setError('PayPal no pudo completar la operación. Inténtalo nuevamente.'); },
    }).render('#mixingmusic-v3-paypal-button');
  }, [sdkReady, status]);

  return (
    <main className="checkout-v3-page">
      <header>
        <button onClick={() => navigate('/')}><img src="/logo-brand.png" alt="MixingMusic.AI" /></button>
        <span>COMPRA SEGURA · PAGO ÚNICO</span>
      </header>
      <div className="checkout-v3-shell">
        <section className="checkout-v3-summary">
          <span className="checkout-v3-kicker">MIXINGMUSIC V3 · ILIMITADO PARA SIEMPRE</span>
          <h1>Tu música, sin límites. Para siempre.</h1>
          <p>Activa permanentemente la mezcla y el mastering profesional. Sin mensualidades ni renovación automática.</p>
          <ul>
            <li><i>✓</i><span><strong>Mezclas y masters ilimitados</strong>Procesa stems o premezclas completas.</span></li>
            <li><i>✓</i><span><strong>WAV PCM real de 24 bits</strong>Además de MP3 a 320 kbps.</span></li>
            <li><i>✓</i><span><strong>Configuraciones guardadas</strong>Reutiliza tu sonido en nuevos proyectos.</span></li>
            <li><i>✓</i><span><strong>Modo álbum</strong>Hasta 12 canciones con identidad coherente.</span></li>
          </ul>
        </section>
        <aside className="checkout-v3-card">
          {status === 'success' ? (
            <div className="checkout-v3-success">
              <i>✓</i><span className="checkout-v3-kicker">PAGO CONFIRMADO</span>
              <h2>Unlimited está activo.</h2>
              <p>Ya puedes masterizar, descargar WAV de 24 bits y usar Modo Álbum.</p>
              <button onClick={() => navigate('/mastering')}>Crear mi primer master →</button>
              <button className="checkout-v3-album-button" onClick={() => navigate('/mastering/album')}>Ir a Modo Álbum</button>
            </div>
          ) : (
            <>
              <div className="checkout-v3-price-label">PRECIO FUNDADOR</div>
              <div className="checkout-v3-price"><sup>US$</sup>14.99</div>
              <p>Un solo pago · no es suscripción · acceso permanente</p>
              <div className="checkout-v3-divider" />
              {!secureMasteringAccessEnabled ? (
                <div className="checkout-v3-pending"><button className="checkout-v3-paypal-preview" disabled><span>P</span>Pagar US$14.99 con PayPal</button><small>Falta conectar esta vista previa con el backend seguro antes de aceptar pagos reales.</small></div>
              ) : !sdkReady ? (
                <div className="checkout-v3-pending"><strong>Cargando pago seguro…</strong><span>Conectando con PayPal.</span></div>
              ) : (
                <div id="mixingmusic-v3-paypal-button" />
              )}
              {status === 'processing' && <div className="checkout-v3-processing">Verificando operación…</div>}
              {error && <div className="checkout-v3-error">{error}</div>}
              <div className="checkout-v3-paypal-only">Pago único procesado de forma segura por PayPal</div>
              <small>El acceso se activa únicamente después de que PayPal confirma el pago. No almacenamos los datos de tu tarjeta.</small>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
