import { useNavigate } from 'react-router-dom';
import './user-profile.css';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  credits: number;
  provider?: string;
  createdAt: string;
  username?: string;
  avatar?: string;
  plan?: string;
  is_pro?: boolean;
}

interface UserProfileProps {
  user: User;
  unlimited: boolean;
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
}

export default function UserProfile({ user, unlimited, isOpen, onClose, onLogout }: UserProfileProps) {
  const navigate = useNavigate();

  const goTo = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    localStorage.removeItem('audioMixerUser');
    localStorage.removeItem('rememberUser');
    onLogout?.();
    onClose();
    navigate('/');
  };

  if (!isOpen) return null;

  const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}` || 'MM';

  return (
    <aside className="user-menu" aria-label="Cuenta de usuario">
      <div className="user-menu__identity">
        {user.avatar ? (
          <img className="user-menu__avatar" src={user.avatar} alt="" />
        ) : (
          <div className="user-menu__avatar user-menu__avatar--initials">{initials.toUpperCase()}</div>
        )}
        <div>
          <strong>{user.firstName} {user.lastName}</strong>
          <span>{user.email}</span>
          {user.username && <small>@{user.username}</small>}
        </div>
      </div>

      <div className={`user-menu__access ${unlimited ? 'is-unlimited' : ''}`}>
        <div className="user-menu__access-heading">
          <span>{unlimited ? 'Unlimited' : 'Plan gratis'}</span>
          <b>{unlimited ? '∞ ACTIVO' : 'ACTIVO'}</b>
        </div>
        <p>
          {unlimited
            ? 'Acceso permanente a mezclas, mastering, WAV 24 bits y Modo Álbum.'
            : '3 mezclas desde stems y 1 master descargable en MP3.'}
        </p>
        {!unlimited && (
          <button className="user-menu__upgrade" onClick={() => goTo('/checkout-v3')}>
            Activar Unlimited · US$14.99
          </button>
        )}
      </div>

      <nav className="user-menu__links">
        <button onClick={() => goTo('/profile')}><i className="ri-user-line" />Mi perfil</button>
        <button onClick={() => goTo('/billing')}><i className="ri-infinity-line" />Mi acceso</button>
        <a href="mailto:support@mixingmusic.ai"><i className="ri-question-line" />Soporte</a>
      </nav>

      <button className="user-menu__logout" onClick={handleLogout}>
        <i className="ri-logout-box-line" />Cerrar sesión
      </button>
    </aside>
  );
}
