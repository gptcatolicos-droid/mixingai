import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/feature/Header';
import { getMasteringEntitlements } from '@/pages/mastering/masteringAccess';
import '../account.css';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  credits: number;
  provider?: string;
  createdAt: string;
  username?: string;
  avatar?: string;
  plan?: string;
  is_pro?: boolean;
}

function readUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem('audioMixerUser') || 'null');
  } catch {
    return null;
  }
}

export default function BillingPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(readUser);
  const [unlimited, setUnlimited] = useState(Boolean(user?.is_pro || user?.plan === 'unlimited'));
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth/login', { replace: true });
      return;
    }
    getMasteringEntitlements()
      .then((entitlements) => {
        setUnlimited(entitlements.unlimited);
        const updated = {
          ...user,
          is_pro: entitlements.unlimited,
          plan: entitlements.unlimited ? 'unlimited' : 'free',
        };
        setUser(updated);
        localStorage.setItem('audioMixerUser', JSON.stringify(updated));
      })
      .catch(() => {
        // Keep the last known state visible; protected actions still validate server-side.
      })
      .finally(() => setCheckingAccess(false));
  }, [navigate, user?.id]);

  if (!user) return null;

  const logout = () => {
    localStorage.removeItem('audioMixerUser');
    localStorage.removeItem('rememberUser');
    setUser(null);
    navigate('/');
  };

  return (
    <div className="account-page">
      <Header user={user} onLogout={logout} />
      <main className="account-shell account-shell--narrow">
        <header className="account-heading">
          <span>ACCESO Y PAGO</span>
          <h1>Mi acceso</h1>
          <p>MixingMusic no almacena tarjetas ni utiliza renovaciones automáticas.</p>
        </header>

        <section className={`access-card ${unlimited ? 'is-unlimited' : ''}`}>
          <div className="access-card__top">
            <div>
              <span className="account-eyebrow">ESTADO DE LA CUENTA</span>
              <h2>{checkingAccess ? 'Verificando acceso…' : unlimited ? 'Unlimited activo' : 'Plan gratis'}</h2>
              <p>{unlimited ? 'Tu acceso es permanente y no tiene fecha de vencimiento.' : 'Puedes activar el acceso permanente con un único pago por PayPal.'}</p>
            </div>
            <b>{unlimited ? '∞' : 'FREE'}</b>
          </div>

          <div className="access-card__features">
            <div><i>✓</i><span><strong>Mezclas y masters</strong>{unlimited ? 'Sin límite' : 'Uso gratuito limitado'}</span></div>
            <div><i>✓</i><span><strong>Exportación</strong>{unlimited ? 'MP3 320 kbps y WAV 24 bits' : 'Master gratuito en MP3'}</span></div>
            <div><i>✓</i><span><strong>Modo Álbum</strong>{unlimited ? 'Hasta 12 canciones' : 'Disponible con Unlimited'}</span></div>
            <div><i>✓</i><span><strong>Vigencia</strong>{unlimited ? 'Para siempre' : 'Sin suscripción activa'}</span></div>
          </div>

          {!checkingAccess && !unlimited && (
            <button className="access-card__cta" onClick={() => navigate('/checkout-v3')}>
              Activar Unlimited por US$14.99 →
            </button>
          )}
        </section>

        <section className="payment-note">
          <i className="ri-paypal-line" />
          <div>
            <strong>Pago único procesado por PayPal</strong>
            <p>No guardamos métodos de pago. No hay cobros mensuales, cancelaciones ni renovación automática.</p>
          </div>
        </section>

        <section className="account-actions">
          <button onClick={() => navigate('/profile')}>Volver a mi perfil</button>
          <a href="mailto:support@mixingmusic.ai">¿Necesitas ayuda con un pago?</a>
        </section>
      </main>
    </div>
  );
}
