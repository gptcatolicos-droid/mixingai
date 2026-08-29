import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSecureAccessToken, secureMasteringAccessEnabled } from '../masteringAccess';
import { captureMasteringOrder, createMasteringOrder, createMercadoPagoOrder, reportMasteringCheckoutEvent } from '../masteringCheckout';
import './checkout.css';

declare global {
  interface Window { paypal?: any }
}

export default function MasteringCheckoutPage() {
  const navigate = useNavigate();
  const buttonsRendered = useRef(false);
  const currentOrderId = useRef('');
  const webviewReported = useRef(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [status, setStatus] = useState<'ready' | 'processing' | 'success'>('ready');
  const [activeProvider, setActiveProvider] = useState<'paypal' | 'mercadopago' | null>(null);
  const [error, setError] = useState('');
  const [isInAppBrowser] = useState(() => /Instagram|FBAN|FBAV/i.test(navigator.userAgent));

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
    if (!sessionReady || !isInAppBrowser || webviewReported.current) return;
    webviewReported.current = true;
    reportMasteringCheckoutEvent({
      eventType: 'webview_detected',
      browserContext: /Instagram/i.test(navigator.userAgent) ? 'instagram_webview' : 'facebook_webview',
    }).catch(() => undefined);
  }, [sessionReady, isInAppBrowser]);

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
        setActiveProvider('paypal');
        setStatus('processing');
        try {
          const order = await createMasteringOrder();
          currentOrderId.current = order.orderID;
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
      onApprove: async (data: { orderID: string }, actions: { restart?: () => Promise<void> }) => {
        try {
          await captureMasteringOrder(data.orderID);
          const stored = JSON.parse(localStorage.getItem('audioMixerUser') || '{}');
          localStorage.setItem('audioMixerUser', JSON.stringify({ ...stored, is_pro: true, plan: 'unlimited' }));
          setStatus('success');
          setError('');
        } catch (checkoutError) {
          const code = checkoutError instanceof Error ? checkoutError.message : '';
          if (code.includes('INSTRUMENT_DECLINED') && actions.restart) {
            setStatus('ready');
            setActiveProvider(null);
            return actions.restart();
          }
          reportMasteringCheckoutEvent({
            eventType: 'paypal_error', orderID: data.orderID, errorCode: code || 'CAPTURE_CALLBACK_FAILED',
            browserContext: isInAppBrowser ? 'in_app_webview' : 'supported_browser',
          }).catch(() => undefined);
          setStatus('ready');
          setActiveProvider(null);
          setError('PayPal recibió la operación, pero no pudimos verificarla. No repitas el pago; contáctanos con el número de orden.');
        }
      },
      onCancel: (data: { orderID?: string }) => {
        reportMasteringCheckoutEvent({ eventType: 'paypal_cancel', orderID: data?.orderID || currentOrderId.current }).catch(() => undefined);
        setStatus('ready'); setActiveProvider(null); setError('Pago cancelado. No se realizó ningún cargo.');
      },
      onError: (paypalError: { code?: string; message?: string }) => {
        reportMasteringCheckoutEvent({
          eventType: 'paypal_error', orderID: currentOrderId.current,
          errorCode: paypalError?.code || paypalError?.message || 'PAYPAL_SDK_ERROR',
          browserContext: isInAppBrowser ? 'in_app_webview' : 'supported_browser',
        }).catch(() => undefined);
        setStatus('ready'); setActiveProvider(null); setError('PayPal no pudo completar la operación. Puedes intentarlo en Safari o Chrome, o pagar con Mercado Pago.');
      },
    }).render('#mixingmusic-v3-paypal-button');
  }, [sdkReady, status, isInAppBrowser]);

  const payWithMercadoPago = async () => {
    setError('');
    setActiveProvider('mercadopago');
    setStatus('processing');
    try {
      const preference = await createMercadoPagoOrder();
      if (!preference.init_point) throw new Error('MERCADOPAGO_REDIRECT_MISSING');
      localStorage.setItem('mixingmusic_pending_payment', JSON.stringify({
        provider: 'mercadopago',
        preferenceId: preference.preference_id,
        amount: preference.amount,
        currency: preference.currency,
      }));
      window.location.assign(preference.init_point);
    } catch (checkoutError) {
      setStatus('ready');
      setActiveProvider(null);
      const code = checkoutError instanceof Error ? checkoutError.message : '';
      setError(code === 'ALREADY_UNLIMITED'
        ? 'Tu cuenta ya tiene Unlimited activo.'
        : code === 'SECURE_SESSION_REQUIRED' || code === 'Unauthorized'
          ? 'Tu sesión expiró. Ingresa nuevamente para continuar.'
          : 'No pudimos abrir Mercado Pago. Inténtalo nuevamente o usa PayPal.');
    }
  };

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
              <div className="checkout-v3-price checkout-v3-price-cop"><sup>COP $</sup>49.900</div>
              <p>Un solo pago · no es suscripción · acceso permanente</p>
              <div className="checkout-v3-divider" />
              {!secureMasteringAccessEnabled ? (
                <div className="checkout-v3-pending"><strong>Pago seguro no disponible</strong><span>El checkout todavía no está conectado.</span></div>
              ) : (
                <div className="checkout-v3-payment-methods">
                  <div className="checkout-v3-provider-label"><span>Tarjeta, PSE o saldo</span><strong>COP $49.900</strong></div>
                  <button className="checkout-v3-mercadopago-button" onClick={payWithMercadoPago} disabled={status === 'processing'}>
                    {activeProvider === 'mercadopago' ? 'Abriendo Mercado Pago…' : 'Pagar COP $49.900 con Mercado Pago'}
                  </button>
                  <div className="checkout-v3-or"><span>o paga con PayPal</span></div>
                  <div className="checkout-v3-provider-label"><span>PayPal</span><strong>US$14.99</strong></div>
                  {isInAppBrowser ? (
                    <div className="checkout-v3-webview-warning">
                      <strong>Para PayPal, abre Safari o Chrome</strong>
                      <span>El navegador interno de Instagram/Facebook puede interrumpir la confirmación. Mercado Pago continúa disponible arriba.</span>
                    </div>
                  ) : !sdkReady ? (
                    <div className="checkout-v3-pending"><strong>Cargando PayPal…</strong><span>Conectando de forma segura.</span></div>
                  ) : (
                    <div id="mixingmusic-v3-paypal-button" />
                  )}
                </div>
              )}
              {status === 'processing' && <div className="checkout-v3-processing">{activeProvider === 'mercadopago' ? 'Preparando Mercado Pago…' : 'Verificando operación…'}</div>}
              {error && <div className="checkout-v3-error">{error}</div>}
              <div className="checkout-v3-paypal-only">Pago único seguro con Mercado Pago o PayPal</div>
              <small>Unlimited se activa únicamente cuando el proveedor confirma el pago. MixingMusic no almacena los datos de tu tarjeta.</small>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}
