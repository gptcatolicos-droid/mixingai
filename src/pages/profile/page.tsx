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

export default function ProfilePage() {
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

  const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}` || 'MM';
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'No disponible';

  const logout = () => {
    localStorage.removeItem('audioMixerUser');
    localStorage.removeItem('rememberUser');
    setUser(null);
    navigate('/');
  };

  return (
    <div className="account-page">
      <Header user={user} onLogout={logout} />
      <main className="account-shell">
        <header className="account-heading">
          <span>CUENTA MIXINGMUSIC</span>
          <h1>Mi perfil</h1>
          <p>Tu información de acceso y el estado real de tu cuenta.</p>
        </header>

        <section className="account-grid">
          <article className="account-card account-card--identity">
            <div className="account-avatar">{initials.toUpperCase()}</div>
            <div>
              <span className="account-eyebrow">PERFIL</span>
              <h2>{user.firstName} {user.lastName}</h2>
              <p>{user.email}</p>
              {user.username && <small>@{user.username}</small>}
            </div>
          </article>

          <article className={`account-card account-card--access ${unlimited ? 'is-unlimited' : ''}`}>
            <div>
              <span className="account-eyebrow">TU ACCESO</span>
              <h2>{checkingAccess ? 'Verificando…' : unlimited ? 'Unlimited' : 'Plan gratis'}</h2>
              <p>{unlimited ? 'Acceso permanente. Sin mensualidades ni renovaciones.' : '3 mezclas desde stems y 1 master descargable en MP3.'}</p>
            </div>
            <b>{unlimited ? '∞ ACTIVO' : 'GRATIS'}</b>
          </article>
        </section>

        <section className="account-card account-details">
          <div><span>Nombre</span><strong>{user.firstName || 'No disponible'}</strong></div>
          <div><span>Apellido</span><strong>{user.lastName || 'No disponible'}</strong></div>
          <div><span>País</span><strong>{user.country || 'No disponible'}</strong></div>
          <div><span>Miembro desde</span><strong>{memberSince}</strong></div>
        </section>

        <section className="account-actions">
          <button onClick={() => navigate('/billing')}>Ver mi acceso</button>
          <a href="mailto:support@mixingmusic.ai">Contactar soporte</a>
        </section>
      </main>
    </div>
  );
}
