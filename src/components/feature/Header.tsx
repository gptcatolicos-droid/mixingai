import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import UserProfile from './UserProfile';
import CreditsPurchaseModal from './CreditsPurchaseModal';

interface User {
  id: string; firstName: string; lastName: string; email: string;
  country: string; credits: number; provider?: string; createdAt: string;
  username?: string; avatar?: string;
}
interface HeaderProps {
  user: User | null; onAuthSuccess?: (user: User) => void;
  onLogout?: () => void; onCreditsUpdate?: (newCredits: number) => void;
}

const S = {
  header: {background:'rgba(26,16,40,0.85)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(192,38,211,0.15)',position:'sticky' as const,top:0,zIndex:100},
  inner: {maxWidth:'1400px',margin:'0 auto',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:'60px'},
  logo: {display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',textDecoration:'none'},
  logoIcon: {width:'32px',height:'32px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'9px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
  logoText: {fontWeight:600,fontSize:'15px',letterSpacing:'-0.3px',background:'linear-gradient(90deg,#EC4899,#C026D3)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'},
  navBtn: {color:'#9B7EC8',padding:'7px 14px',borderRadius:'980px',fontSize:'13px',background:'transparent',border:'none',cursor:'pointer',fontFamily:'inherit',textDecoration:'none',display:'inline-block'},
  creditsBadge: {display:'flex',alignItems:'center',gap:'6px',background:'rgba(192,38,211,0.1)',border:'1px solid rgba(192,38,211,0.25)',borderRadius:'980px',padding:'5px 14px',fontSize:'13px',fontWeight:600},
  unlimitedBadge: {display:'flex',alignItems:'center',gap:'6px',background:'linear-gradient(135deg,#EC4899,#C026D3)',borderRadius:'980px',padding:'5px 14px',fontSize:'13px',fontWeight:600,color:'#fff'},
  userBtn: {display:'flex',alignItems:'center',gap:'8px',background:'rgba(192,38,211,0.08)',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'12px',padding:'6px 12px',cursor:'pointer'},
  avatar: {width:'28px',height:'28px',background:'linear-gradient(135deg,#EC4899,#7C3AED)',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:'12px',flexShrink:0},
};

export default function Header({ user, onLogout, onCreditsUpdate }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('audioMixerUser');
    localStorage.removeItem('rememberUser');
    onLogout?.();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header style={S.header}>
        <div style={S.inner}>
          {/* Logo */}
          <div style={{display:'flex',alignItems:'center',gap:'24px'}}>
            <div style={S.logo} onClick={() => navigate('/')}>
              <div style={S.logoIcon}>
                <i className="ri-equalizer-fill" style={{color:'#fff',fontSize:'15px'}}></i>
              </div>
              <span style={S.logoText}>mixingmusic.ai</span>
            </div>

            {/* Nav desktop */}
            <nav style={{display:'flex',gap:'4px'}} className="hide-mobile">
              <button onClick={() => navigate('/')} style={{...S.navBtn,color:isActive('/')?'#F8F0FF':'#9B7EC8'}}>Inicio</button>
              <Link to="/blog" style={{...S.navBtn,color:'#9B7EC8'}}>Blog</Link>
            </nav>
          </div>

          {/* Right side desktop */}
          <div style={{display:'flex',alignItems:'center',gap:'10px'}} className="hide-mobile">
            {user ? (
              <>
                {(user.is_pro || user.plan === 'unlimited') ? (
                  <div style={S.unlimitedBadge}>
                    <i className="ri-infinity-line"></i>
                    <span>ILIMITADO</span>
                  </div>
                ) : (
                  <div style={{...S.creditsBadge,background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.2)',color:'#4ade80',fontSize:'12px'}}>
                    <i className="ri-music-line"></i>
                    <span>Plan Gratis</span>
                  </div>
                )}
                <div style={{position:'relative'}}>
                  <button style={S.userBtn} onClick={() => setShowUserProfile(!showUserProfile)}>
                    <div style={S.avatar}>{user.firstName.charAt(0).toUpperCase()}</div>
                    <div style={{textAlign:'left'}}>
                      <div style={{fontSize:'13px',fontWeight:600,color:'#F8F0FF'}}>{user.firstName} {user.lastName}</div>
                      <div style={{fontSize:'11px',color:'#9B7EC8'}}>@{user.username||user.firstName.toLowerCase()}</div>
                    </div>
                    <i className="ri-arrow-down-s-line" style={{color:'#9B7EC8',fontSize:'14px'}}></i>
                  </button>
                  <UserProfile user={user} isOpen={showUserProfile} onClose={() => setShowUserProfile(false)} onLogout={handleLogout} />
                </div>
              </>
            ) : (
              <>
                <Link to="/auth/login" style={{...S.navBtn,border:'1px solid rgba(192,38,211,0.25)',color:'#9B7EC8'}}>Iniciar Sesión</Link>
                <Link to="/auth/register" style={{background:'linear-gradient(135deg,#EC4899,#C026D3)',color:'#fff',padding:'8px 18px',borderRadius:'980px',fontSize:'13px',fontWeight:600,textDecoration:'none',boxShadow:'0 0 16px rgba(192,38,211,0.4)'}}>
                  Crear Cuenta
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} style={{background:'none',border:'none',color:'#9B7EC8',cursor:'pointer',fontSize:'22px'}} className="show-mobile">
            <i className={mobileOpen ? 'ri-close-line' : 'ri-menu-line'}></i>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div style={{background:'#1A1028',borderTop:'1px solid rgba(192,38,211,0.1)',padding:'16px 24px',display:'flex',flexDirection:'column',gap:'8px'}}>
            {user ? (
              <>
                <div style={{background:'rgba(36,22,54,0.75)',borderRadius:'12px',padding:'14px',marginBottom:'8px',display:'flex',alignItems:'center',gap:'10px'}}>
                  <div style={S.avatar}>{user.firstName.charAt(0).toUpperCase()}</div>
                  <div>
                    <div style={{fontSize:'14px',fontWeight:600,color:'#F8F0FF'}}>{user.firstName} {user.lastName}</div>
                    <div style={{fontSize:'12px',color:'#9B7EC8'}}>{(user.is_pro || user.plan === 'unlimited') ? 'Mezclas Ilimitadas ∞' : 'Plan Gratis · 1 mezcla'}</div>
                  </div>
                </div>
                <button onClick={() => { navigate('/'); setMobileOpen(false); }} style={{...S.navBtn,textAlign:'left',width:'100%',padding:'10px 14px'}}>Inicio</button>
                <Link to="/blog" style={{...S.navBtn,padding:'10px 14px'}} onClick={() => setMobileOpen(false)}>Blog</Link>
                <button onClick={() => { handleLogout(); setMobileOpen(false); }} style={{...S.navBtn,color:'#f87171',textAlign:'left',width:'100%',padding:'10px 14px'}}>Cerrar Sesión</button>
              </>
            ) : (
              <>
                <Link to="/auth/login" style={{...S.navBtn,padding:'10px 14px',border:'1px solid rgba(192,38,211,0.2)'}} onClick={() => setMobileOpen(false)}>Iniciar Sesión</Link>
                <Link to="/auth/register" style={{background:'linear-gradient(135deg,#EC4899,#C026D3)',color:'#fff',padding:'10px 18px',borderRadius:'980px',fontSize:'13px',fontWeight:600,textDecoration:'none',textAlign:'center'}} onClick={() => setMobileOpen(false)}>
                  Crear Cuenta — Gratis
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      <CreditsPurchaseModal isOpen={showCreditsModal} onClose={() => setShowCreditsModal(false)}
        onPurchaseSuccess={(c) => { onCreditsUpdate?.(c); setShowCreditsModal(false); }}
        currentCredits={user?.credits || 0} />

      <style>{`
        @media (max-width: 768px) { .hide-mobile { display: none !important; } }
        @media (min-width: 769px) { .show-mobile { display: none !important; } }
      `}</style>
    </>
  );
}
