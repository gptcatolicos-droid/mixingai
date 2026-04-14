import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../base/Button';
import Modal from '../base/Modal';

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
}

interface UserProfileProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
}

export default function UserProfile({ user, isOpen, onClose, onLogout }: UserProfileProps) {
  const navigate = useNavigate();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCreditColor = (credits: number) => {
    if (credits >= 500) return 'text-emerald-400';
    if (credits >= 100) return 'text-cyan-400';
    return 'text-orange-400';
  };

  const getNextRecharge = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const now = new Date().getTime();
    const timeUntilRecharge = tomorrow.getTime() - now;
    
    const hours = Math.floor(timeUntilRecharge / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilRecharge % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const handleLogout = () => {
    localStorage.removeItem('audioMixerUser');
    if (onLogout) onLogout();
    onClose();
    navigate('/'); // Redirect to home screen after logout
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose(); // Cerrar el menú después de navegar
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-xl z-50">
        <div className="p-4">
          {/* User Info Header */}
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-700/50">
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-600">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.firstName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-magenta-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-slate-400 text-sm">{user.email}</p>
              {user.username && (
                <p className="text-cyan-400 text-sm">@{user.username}</p>
              )}
              {user.provider && (
                <div className="flex items-center space-x-1 mt-1">
                  <i className={`text-xs ${
                    user.provider === 'google' 
                      ? 'ri-google-fill text-red-400' 
                      : 'ri-apple-fill text-gray-400'
                  }`}></i>
                  <span className="text-xs text-slate-400 capitalize">
                    Connected via {user.provider}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Credits Section */}
          <div className="py-4 border-b border-slate-700/50">
            <div className="bg-slate-900/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-white flex items-center">
                  <i className="ri-coin-line text-cyan-400 mr-2 w-4 h-4 flex items-center justify-center"></i>
                  Available Credits
                </h4>
                <span className={`text-2xl font-bold ${getCreditColor(user.credits || 0)}`}>
                  {(user.credits || 0).toLocaleString()}
                </span>
              </div>
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Next recharge:</span>
                  <span className="text-emerald-400 font-semibold">{getNextRecharge()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Basic mix (1-5 stems):</span>
                  <span className="text-cyan-400">100 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>Advanced mix (6+ stems):</span>
                  <span className="text-magenta-400">∞ ilimitadas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Options */}
          <div className="py-2 border-t border-slate-600">
            <button
              onClick={() => handleNavigation('/profile')}
              className="w-full flex items-center space-x-3 px-4 py-3 text-left text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
            >
              <i className="ri-user-line w-5 h-5 flex items-center justify-center"></i>
              <span>My Profile</span>
            </button>
            
            <button
              onClick={() => handleNavigation('/profile')}
              className="w-full flex items-center space-x-3 px-4 py-3 text-left text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
            >
              <i className="ri-history-line w-5 h-5 flex items-center justify-center"></i>
              <span>Mix History</span>
            </button>

            <button
              onClick={() => handleNavigation('/billing')}
              className="w-full flex items-center space-x-3 px-4 py-3 text-left text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
            >
              <i className="ri-bill-line w-5 h-5 flex items-center justify-center"></i>
              <span>Billing</span>
            </button>

            <button
              onClick={() => window.open('mailto:support@mixingmusic.co', '_blank')}
              className="w-full flex items-center space-x-3 px-4 py-3 text-left text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
            >
              <i className="ri-question-line w-5 h-5 flex items-center justify-center"></i>
              <span>Help & Support</span>
            </button>
          </div>

          <div className="py-2 border-t border-slate-600">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 text-left text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <i className="ri-logout-box-line w-5 h-5 flex items-center justify-center"></i>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="User Profile"
        size="md"
      >
        <div className="bg-slate-900 text-white -m-6 p-6">
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl overflow-hidden border-2 border-slate-600">
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.firstName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-magenta-500 to-cyan-500 flex items-center justify-center text-white font-bold text-2xl">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-white">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-slate-400">{user.email}</p>
              {user.username && (
                <p className="text-cyan-400">@{user.username}</p>
              )}
            </div>

            {/* User Details */}
            <div className="bg-slate-800/50 rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    First Name
                  </label>
                  <p className="text-white font-semibold">{user.firstName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Last Name
                  </label>
                  <p className="text-white font-semibold">{user.lastName}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Country
                </label>
                <p className="text-white font-semibold">{user.country}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Member since
                </label>
                <p className="text-white font-semibold">{formatDate(user.createdAt)}</p>
              </div>
            </div>

            {/* Credits Summary */}
            <div className="bg-gradient-to-r from-magenta-500/10 to-cyan-500/10 border border-magenta-500/20 rounded-xl p-6">
              <h4 className="font-bold text-white mb-4">Credits Summary</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Current credits:</span>
                  <span className={`text-xl font-bold ${getCreditColor(user.credits || 0)}`}>
                    {(user.credits || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Next recharge:</span>
                  <span className="text-emerald-400 font-semibold">{getNextRecharge()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
