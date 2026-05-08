import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import UserProfile from './UserProfile';

interface User {
  id: string; firstName: string; lastName: string; email: string;
  country: string; credits: number; provider?: string; createdAt: string;
  username?: string; avatar?: string; is_pro?: boolean; plan?: string;
}

interface HeaderProps {
  user?: User | null;
  onLogout?: () => void;
  onCreditsUpdate?: (n: number) => void;
  onNavigate?: (mode: string) => void;
}

const T = {
  text: '#F8F0FF', text2: 'rgba(248,240,255,0.65)', text3: 'rgba(248,240,255,0.38)',
  pink: '#EC4899', fuchsia: '#C026D3', border: 'rgba(192,38,211,0.18)',
  surface: 'rgba(26,16,40,0.9)',
};

export default function Header({ user, onLogout, onCreditsUpdate, onNavigate }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const isPro = user?.is_pro || user?.plan === 'unlimited';

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowUserProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    setShowUserProfile(false);
    onLogout?.();
  };

  const handleNavMode = (mode: string) => {
    setMobileOpen(false);
    if (onNavigate) {
      onNavigate(mode);
    } else {
      navigate(`/?mode=${mode}`);
    }
  };

  // Nav items — siempre visibles
  const NAV_ITEMS = [
    { label: 'Cargar Stems',    mode: 'upload',      icon: '⬆' },
    { label: 'MixingStudio AI', mode: 'daw',         icon: '✦', highlight: true },
  ];

  const S = {
    header: { background: T.surface, borderBottom: `0.5px solid ${T.border}`, padding: '0 20px', height: '52px', display: 'flex', alignItems: 'center', gap: '12px', backdropFilter: 'blur(20px)', position: 'sticky' as const, top: 0, zIndex: 100 },
    logo: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textDecoration: 'none' as const, flexShrink: 0 },
    logoIcon: { width: '28px', height: '28px', background: 'linear-gradient(135deg,#EC4899,#C026D3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 12px rgba(192,38,211,0.4)' },
    logoText: { fontWeight: 600, fontSize: '14px', letterSpacing: '-0.3px', background: 'linear-gradient(90deg,#EC4899,#C026D3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    navBtn: { color: T.text3, padding: '6px 12px', borderRadius: '8px', fontSize: '12px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' as const, transition: 'all 0.12s' },
    navBtnHighlight: { background: 'linear-gradient(135deg,rgba(236,72,153,0.15),rgba(192,38,211,0.15))', border: '1px solid rgba(192,38,211,0.4)', color: '#EC4899', fontWeight: 600 },
  };

  return (
    <>
      <header style={S.header}>
        {/* Logo */}
        <div style={S.logo} onClick={() => navigate('/')}>
          <div style={S.logoIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24"><g fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M5 8 V16"/><path d="M9 5 V19"/><path d="M13 9 V15"/><path d="M17 6 V18"/></g></svg>
          </div>
          <span style={S.logoText}>mixingmusic.ai</span>
        </div>

        {/* Nav links — desktop */}
        <nav style={{ display: 'flex', gap: '2px', marginLeft: '8px' }} className="hide-mobile">
          {NAV_ITEMS.map(item => (
            <button key={item.mode}
              onClick={() => handleNavMode(item.mode)}
              style={{ ...S.navBtn, ...(item.highlight ? S.navBtnHighlight : {}) }}
              onMouseEnter={e => { if (!item.highlight) (e.currentTarget.style.color = T.text); }}
              onMouseLeave={e => { if (!item.highlight) (e.currentTarget.style.color = T.text3); }}>
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
          <Link to="/blog" style={{ ...S.navBtn, textDecoration: 'none', color: T.text3 }}>Blog</Link>
        </nav>

        <div style={{ flex: 1 }} />

        {/* Right side */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Credits badge */}
            <div style={{ background: 'rgba(192,38,211,0.1)', border: `1px solid ${T.border}`, borderRadius: '980px', padding: '4px 12px', fontSize: '12px', color: '#9B7EC8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
              onClick={() => navigate('/billing')}>
              <span style={{ color: '#EC4899', fontWeight: 700 }}>{isPro ? '∞' : user.credits}</span>
              <span style={{ color: T.text3 }}>créditos</span>
            </div>

            {/* Pro badge */}
            {isPro && (
              <span style={{ background: 'linear-gradient(135deg,#EC4899,#C026D3)', color: '#fff', padding: '4px 12px', borderRadius: '980px', fontSize: '11px', fontWeight: 600, boxShadow: '0 0 12px rgba(192,38,211,0.4)' }}>
                ∞ ILIMITADO
              </span>
            )}

            {/* User button */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserProfile(!showUserProfile)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(26,16,40,0.8)', border: `1px solid ${T.border}`, borderRadius: '980px', padding: '5px 12px 5px 6px', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg,#EC4899,#C026D3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: '#fff' }}>
                  {user.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: T.text, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.firstName}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" style={{ transform: showUserProfile ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}><path d="M6 9 L12 15 L18 9" fill="none" stroke="#9B7EC8" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>

              {showUserProfile && (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '8px', zIndex: 200 }}>
                  <UserProfile user={user} onLogout={handleLogout} onClose={() => setShowUserProfile(false)} onCreditsUpdate={onCreditsUpdate} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link to="/auth/login" style={{ color: T.text3, padding: '7px 16px', borderRadius: '8px', fontSize: '13px', background: 'transparent', border: `1px solid ${T.border}`, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }}>
              Iniciar Sesión
            </Link>
            <Link to="/auth/register" style={{ background: 'linear-gradient(135deg,#EC4899,#C026D3)', color: '#fff', padding: '7px 16px', borderRadius: '980px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', boxShadow: '0 0 16px rgba(192,38,211,0.4)' }}>
              Comenzar gratis
            </Link>
          </div>
        )}

        {/* Mobile hamburger */}
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', color: T.text3, cursor: 'pointer', fontSize: '22px' }} className="show-mobile">
          ☰
        </button>
      </header>

      {/* Mobile nav */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,4,16,0.95)', zIndex: 200, display: 'flex', flexDirection: 'column', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: T.text }}>mixingmusic.ai</span>
            <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: T.text3, cursor: 'pointer', fontSize: '24px' }}>✕</button>
          </div>
          {NAV_ITEMS.map(item => (
            <button key={item.mode} onClick={() => handleNavMode(item.mode)}
              style={{ ...S.navBtn, textAlign: 'left', width: '100%', padding: '14px 16px', fontSize: '15px', color: item.highlight ? '#EC4899' : T.text2, borderBottom: `0.5px solid ${T.border}`, borderRadius: 0 }}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
          {!user && (
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link to="/auth/login" onClick={() => setMobileOpen(false)} style={{ color: T.text2, padding: '13px', borderRadius: '980px', fontSize: '15px', border: `1px solid ${T.border}`, textDecoration: 'none', textAlign: 'center' }}>Iniciar Sesión</Link>
              <Link to="/auth/register" onClick={() => setMobileOpen(false)} style={{ background: 'linear-gradient(135deg,#EC4899,#C026D3)', color: '#fff', padding: '13px', borderRadius: '980px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>Comenzar gratis</Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}
