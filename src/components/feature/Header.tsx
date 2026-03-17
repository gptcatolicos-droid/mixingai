
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Button from '../base/Button';
import UserProfile from './UserProfile';
import CreditsPurchaseModal from './CreditsPurchaseModal';

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
}

interface HeaderProps {
  user: User | null;
  onAuthSuccess?: (user: User) => void;
  onLogout?: () => void;
  onCreditsUpdate?: (newCredits: number) => void;
}

export default function Header({ user, onAuthSuccess, onLogout, onCreditsUpdate }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if user has unlimited credits
  const hasUnlimitedCredits = (userEmail: string) => {
    return userEmail === 'danipalacio@gmail.com';
  };

  const handleLogout = () => {
    localStorage.removeItem('audioMixerUser');
    localStorage.removeItem('rememberUser');
    if (onLogout) onLogout();
    navigate('/'); // Redirect to home screen after logout
  };

  const handlePurchaseCredits = () => {
    setShowCreditsModal(true);
  };

  const handleCreditsPurchaseSuccess = (purchasedCredits: number) => {
    if (user && onCreditsUpdate) {
      onCreditsUpdate(user.credits + purchasedCredits);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleHomeNavigation = () => {
    // Navegar directamente al home sin hacer logout automático
    navigate('/');
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo - Mobile y Desktop */}
            <div className="flex items-center space-x-3 lg:space-x-4">
              <div 
                className="flex items-center space-x-2 lg:space-x-3 cursor-pointer"
                onClick={handleHomeNavigation}
              >
                <img 
                  src="https://static.readdy.ai/image/b1eac48ec385ead8debde409294ee615/609f268732409aa5f9e36b8cf47e9d62.png" 
                  alt="MixingMusic.ai" 
                  className="object-contain w-20 h-4 lg:w-32 lg:h-7"
                />
                {/* Título - SOLO DESKTOP */}
                <h1 className="text-base lg:text-lg font-medium text-white hidden lg:block">
                  mixingmusic.ai
                </h1>
              </div>

              {/* Navigation - SOLO DESKTOP */}
              <nav className="hidden lg:flex items-center space-x-1 ml-8">
                <button 
                  onClick={handleHomeNavigation}
                  className={`px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors font-medium cursor-pointer ${
                    isActive('/') ? 'bg-slate-700/50 text-white' : ''
                  }`}
                >
                  <span>Inicio</span>
                </button>
                <button 
                  onClick={() => handleNavigation('/pricing')}
                  className={`px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors font-medium cursor-pointer ${
                    isActive('/pricing') ? 'bg-slate-700/50 text-white' : ''
                  }`}
                >
                  <span>Precios</span>
                </button>
              </nav>
            </div>

            {/* Right side - Desktop */}
            <div className="hidden lg:flex items-center space-x-4">
              {user ? (
                <>
                  {/* Credits display - only show if not unlimited */}
                  {!hasUnlimitedCredits(user.email) && (
                    <div className="flex items-center space-x-4">
                      <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2">
                        <div className="flex items-center space-x-2">
                          <i className="ri-coin-line text-cyan-400"></i>
                          <span className="text-cyan-400 font-semibold">
                            {user.credits.toLocaleString()}
                          </span>
                          <span className="text-slate-400 text-sm">créditos</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setShowCreditsModal(true)}
                        className="bg-gradient-to-r from-magenta-500 to-cyan-500 hover:from-magenta-600 hover:to-cyan-600 text-white border-0 font-semibold"
                      >
                        <i className="ri-add-line mr-1 w-4 h-4 flex items-center justify-center"></i>
                        Comprar
                      </Button>
                    </div>
                  )}

                  {/* Unlimited credits badge */}
                  {hasUnlimitedCredits(user.email) && (
                    <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <i className="ri-infinity-line text-white"></i>
                        <span className="text-white font-semibold">ILIMITADO</span>
                      </div>
                    </div>
                  )}

                  {/* User Profile */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserProfile(!showUserProfile)}
                      className="flex items-center space-x-3 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl px-4 py-2 transition-colors border border-slate-600/50 cursor-pointer"
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-magenta-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">
                        {user.firstName.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <div className="text-white font-medium text-sm">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-slate-400 text-xs">
                          @{user.username || `${user.firstName.toLowerCase()}_${user.lastName.toLowerCase()}`}
                        </div>
                      </div>
                      <i className="ri-arrow-down-s-line text-slate-400"></i>
                    </button>

                    <UserProfile
                      user={user}
                      isOpen={showUserProfile}
                      onClose={() => setShowUserProfile(false)}
                      onLogout={handleLogout}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/auth/login"
                    className="text-slate-300 hover:text-white hover:bg-slate-700/50 px-4 py-2 rounded-lg transition-colors font-medium border border-slate-600/50"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/auth/register"
                    className="bg-gradient-to-r from-magenta-500 to-cyan-500 hover:from-magenta-600 hover:to-cyan-600 text-white border-0 font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    Create Account
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu - User Info + Hamburger */}
            <div className="flex lg:hidden items-center space-x-3">
              {user && (
                <>
                  {/* Credits Mobile - Compacto */}
                  {!hasUnlimitedCredits(user.email) && (
                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-1.5">
                      <div className="flex items-center space-x-1">
                        <i className="ri-coin-line text-cyan-400 text-sm"></i>
                        <span className="text-cyan-400 font-semibold text-sm">
                          {user.credits.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {hasUnlimitedCredits(user.email) && (
                    <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg px-2 py-1">
                      <div className="flex items-center space-x-1">
                        <i className="ri-infinity-line text-white text-sm"></i>
                        <span className="text-white font-semibold text-xs">∞</span>
                      </div>
                    </div>
                  )}

                  {/* User Avatar Mobile */}
                  <div className="w-8 h-8 bg-gradient-to-r from-magenta-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                    {user.firstName.charAt(0).toUpperCase()}
                  </div>
                </>
              )}

              {/* Hamburger Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-300 hover:text-white p-2 rounded-lg"
              >
                <i className={`text-xl ${mobileMenuOpen ? 'ri-close-line' : 'ri-menu-line'}`}></i>
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="lg:hidden mt-4 pb-4 border-t border-slate-700/50 pt-4">
              <div className="space-y-2">
                {user ? (
                  <>
                    {/* User Info Mobile */}
                    <div className="bg-slate-700/30 rounded-xl p-4 mb-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-magenta-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-bold">
                          {user.firstName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-slate-400 text-sm">
                            @{user.username || `${user.firstName.toLowerCase()}_${user.lastName.toLowerCase()}`}
                          </div>
                        </div>
                      </div>

                      {/* Credits Info Mobile */}
                      {!hasUnlimitedCredits(user.email) && (
                        <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                          <div className="flex items-center space-x-2">
                            <i className="ri-coin-line text-cyan-400"></i>
                            <span className="text-cyan-400 font-semibold">
                              {user.credits.toLocaleString()} créditos
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setShowCreditsModal(true);
                              setMobileMenuOpen(false);
                            }}
                            className="bg-gradient-to-r from-magenta-500 to-cyan-500 hover:from-magenta-600 hover:to-cyan-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold"
                          >
                            Comprar
                          </button>
                        </div>
                      )}

                      {hasUnlimitedCredits(user.email) && (
                        <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-lg p-3">
                          <div className="flex items-center justify-center space-x-2">
                            <i className="ri-infinity-line text-white"></i>
                            <span className="text-white font-semibold">CRÉDITOS ILIMITADOS</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Navigation Links */}
                    <button 
                      onClick={handleHomeNavigation}
                      className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors ${
                        isActive('/') 
                          ? 'bg-slate-700/50 text-white' 
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                      }`}
                    >
                      <i className="ri-home-line mr-3"></i>
                      Inicio
                    </button>
                    <button 
                      onClick={() => handleNavigation('/pricing')}
                      className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-colors ${
                        isActive('/pricing') 
                          ? 'bg-slate-700/50 text-white' 
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                      }`}
                    >
                      <i className="ri-price-tag-3-line mr-3"></i>
                      Precios
                    </button>
                    <button 
                      onClick={() => handleNavigation('/profile')}
                      className="w-full text-left px-4 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/50 font-medium transition-colors"
                    >
                      <i className="ri-user-line mr-3"></i>
                      Mi Perfil
                    </button>
                    <button 
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 font-medium transition-colors"
                    >
                      <i className="ri-logout-box-line mr-3"></i>
                      Cerrar Sesión
                    </button>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/auth/login"
                      className="block text-slate-300 hover:text-white px-4 py-3 rounded-xl font-medium transition-colors hover:bg-slate-700/50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <i className="ri-login-box-line mr-3"></i>
                      Iniciar Sesión
                    </Link>
                    <Link 
                      to="/auth/register"
                      className="block bg-gradient-to-r from-magenta-500 to-cyan-500 hover:from-magenta-600 hover:to-cyan-600 text-white px-4 py-3 rounded-xl font-medium text-center"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <i className="ri-user-add-line mr-3"></i>
                      Crear Cuenta
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <CreditsPurchaseModal
          isOpen={showCreditsModal}
          onClose={() => setShowCreditsModal(false)}
          onPurchaseSuccess={(credits) => {
            onCreditsUpdate?.(user!.credits + credits);
            setShowCreditsModal(false);
          }}
          currentCredits={user?.credits || 0}
        />
      </header>
    </>
  );
}