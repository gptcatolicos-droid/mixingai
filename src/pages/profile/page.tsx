import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/feature/Header';
import EditUsernameModal from '@/components/feature/EditUsernameModal';

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
  subscription?: {
    plan: 'basic' | 'premium' | 'unlimited';
    expirationDate: string;
    isActive: boolean;
  };
}

interface MixHistory {
  id: string;
  name: string;
  date: string;
  stems: number;
  status: 'completed' | 'processing' | 'failed';
  genre: string;
  downloadUrl?: string;
  canReDownload: boolean;
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('audioMixerUser');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'settings'>('profile');
  const [showEditUsername, setShowEditUsername] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock mix history - SIMPLIFICADO sin funcionalidad de guardado
  const [mixHistory] = useState<MixHistory[]>([
    {
      id: '1',
      name: 'Summer Vibes Mix',
      date: '2024-01-15',
      stems: 8,
      status: 'completed',
      genre: 'Pop',
      downloadUrl: 'https://example.com/download/1',
      canReDownload: false // DESHABILITADO - solo descarga directa
    },
    {
      id: '2',
      name: 'Rock Anthem v2',
      date: '2024-01-14',
      stems: 12,
      status: 'completed',
      genre: 'Rock',
      downloadUrl: 'https://example.com/download/2',
      canReDownload: false // DESHABILITADO - solo descarga directa
    },
    {
      id: '3',
      name: 'Jazz Session',
      date: '2024-01-13',
      stems: 6,
      status: 'failed',
      genre: 'Jazz',
      canReDownload: false
    },
    {
      id: '4',
      name: 'Electronic Beats',
      date: '2024-01-12',
      stems: 15,
      status: 'completed',
      genre: 'Electronic',
      downloadUrl: 'https://example.com/download/4',
      canReDownload: false // DESHABILITADO - solo descarga directa
    }
  ]);

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
    }
  }, [user, navigate]);

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('audioMixerUser');
    navigate('/');
  };

  const handleCreditsUpdate = (newCredits: number) => {
    if (!user) return;
    const updatedUser = { ...user, credits: newCredits };
    setUser(updatedUser);
    localStorage.setItem('audioMixerUser', JSON.stringify(updatedUser));
  };

  const handleUsernameUpdate = (newUsername: string) => {
    if (!user) return;
    const updatedUser = { ...user, username: newUsername };
    setUser(updatedUser);
    localStorage.setItem('audioMixerUser', JSON.stringify(updatedUser));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/20';
      case 'processing': return 'text-yellow-400 bg-yellow-500/20';
      case 'failed': return 'text-red-400 bg-red-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'processing': return 'Procesando';
      case 'failed': return 'Falló';
      default: return 'Desconocido';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'ri-check-line';
      case 'processing': return 'ri-loader-4-line animate-spin';
      case 'failed': return 'ri-close-line';
      default: return 'ri-question-line';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      <Header 
        user={user}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
        onCreditsUpdate={handleCreditsUpdate}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <i className="ri-user-line text-2xl text-cyan-400"></i>
            <h1 className="text-3xl font-bold text-white">Mi Perfil</h1>
          </div>
          <p className="text-slate-400">Gestiona tu información personal y revisa tu historial de mezclas</p>
        </div>

        {/* Navigation Tabs - SIMPLIFICADO: Solo Profile y Settings */}
        <div className="bg-slate-800/50 rounded-2xl p-1 mb-8 inline-flex">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-slate-700 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="ri-user-line mr-2"></i>
            Perfil
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-slate-700 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="ri-settings-line mr-2"></i>
            Configuración
          </button>
        </div>

        {/* Content */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-slate-800/50 rounded-2xl p-6">
              <div className="flex items-center space-x-6 mb-6">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-600">
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.firstName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-magenta-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {user.firstName} {user.lastName}
                  </h2>
                  <p className="text-slate-400 mb-2">{user.email}</p>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <i className="ri-at-line text-cyan-400"></i>
                      <span className="text-cyan-400">@{user.username || 'sin_configurar'}</span>
                      <button
                        onClick={() => setShowEditUsername(true)}
                        className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <i className="ri-edit-line w-4 h-4 flex items-center justify-center"></i>
                      </button>
                    </div>
                    {user.provider && (
                      <div className="flex items-center space-x-1">
                        <i className={`text-sm ${
                          user.provider === 'google' 
                            ? 'ri-google-fill text-red-400' 
                            : 'ri-apple-fill text-gray-400'
                        }`}></i>
                        <span className="text-xs text-slate-400 capitalize">
                          {user.provider}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Nombre
                    </label>
                    <p className="text-white font-semibold">{user.firstName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Apellido
                    </label>
                    <p className="text-white font-semibold">{user.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      País
                    </label>
                    <p className="text-white font-semibold">{user.country}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Email
                    </label>
                    <p className="text-white font-semibold">{user.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Miembro desde
                    </label>
                    <p className="text-white font-semibold">{formatDate(user.createdAt)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Créditos disponibles
                    </label>
                    <p className="text-cyan-400 font-bold text-xl">{(user.credits || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats - SIMPLIFICADO sin mezclas guardadas */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 rounded-xl p-6">
                <div className="flex items-center space-x-3">
                  <i className="ri-music-2-line text-2xl text-cyan-400"></i>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {mixHistory.filter(mix => mix.status === 'completed').length}
                    </div>
                    <div className="text-slate-400 text-sm">Mezclas creadas</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-6">
                <div className="flex items-center space-x-3">
                  <i className="ri-download-line text-2xl text-green-400"></i>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {mixHistory.filter(mix => mix.status === 'completed').length}
                    </div>
                    <div className="text-slate-400 text-sm">Descargas realizadas</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-6">
                <div className="flex items-center space-x-3">
                  <i className="ri-sound-module-line text-2xl text-magenta-400"></i>
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {mixHistory.reduce((acc, mix) => acc + (mix.stems || 0), 0)}
                    </div>
                    <div className="text-slate-400 text-sm">Total stems procesados</div>
                  </div>
                </div>
              </div>
            </div>

            {/* NUEVA SECCIÓN: Historial de Proyectos (Solo para referencia, sin descargas) */}
            {/* ELIMINADO - Mix History ya no se necesita */}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Account Settings */}
            <div className="bg-slate-800/50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Configuración de Cuenta</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between py-4 border-b border-slate-700/50">
                  <div>
                    <h3 className="text-white font-medium">Nombre de Usuario</h3>
                    <p className="text-slate-400 text-sm">@{user.username || 'sin_configurar'}</p>
                  </div>
                  <button
                    onClick={() => setShowEditUsername(true)}
                    className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-edit-line mr-2"></i>
                    Cambiar
                  </button>
                </div>

                <div className="flex items-center justify-between py-4 border-b border-slate-700/50">
                  <div>
                    <h3 className="text-white font-medium">Notificaciones por Email</h3>
                    <p className="text-slate-400 text-sm">Recibir actualizaciones sobre tus mezclas</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-cyan-500 transition-colors">
                    <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition-transform"></span>
                  </button>
                </div>

                <div className="flex items-center justify-between py-4 border-b border-slate-700/50">
                  <div>
                    <h3 className="text-white font-medium">Calidad de Audio</h3>
                    <p className="text-slate-400 text-sm">Calidad predeterminada para exportaciones</p>
                  </div>
                  <select className="bg-slate-700 text-white border border-slate-600 rounded-xl px-3 py-2 pr-8">
                    <option value="320">320 kbps</option>
                    <option value="256">256 kbps</option>
                    <option value="192">192 kbps</option>
                  </select>
                </div>

                <div className="flex items-center justify-between py-4">
                  <div>
                    <h3 className="text-white font-medium">Modo Oscuro</h3>
                    <p className="text-slate-400 text-sm">Tema de la interfaz</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-cyan-500 transition-colors">
                    <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition-transform"></span>
                  </button>
                </div>
              </div>
            </div>

            {/* Privacy & Security */}
            <div className="bg-slate-800/50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Privacidad y Seguridad</h2>
              
              <div className="space-y-4">
                <button className="w-full text-left bg-slate-700/50 hover:bg-slate-700 rounded-xl p-4 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Cambiar Contraseña</h3>
                      <p className="text-slate-400 text-sm">Actualiza tu contraseña de acceso</p>
                    </div>
                    <i className="ri-arrow-right-line text-slate-400"></i>
                  </div>
                </button>

                <button className="w-full text-left bg-slate-700/50 hover:bg-slate-700 rounded-xl p-4 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Descargar Mis Datos</h3>
                      <p className="text-slate-400 text-sm">Exporta todos tus datos personales</p>
                    </div>
                    <i className="ri-arrow-right-line text-slate-400"></i>
                  </div>
                </button>

                <button className="w-full text-left bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl p-4 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-red-400 font-medium">Eliminar Cuenta</h3>
                      <p className="text-slate-400 text-sm">Elimina permanentemente tu cuenta</p>
                    </div>
                    <i className="ri-arrow-right-line text-red-400"></i>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Username Modal */}
      <EditUsernameModal
        user={user}
        isOpen={showEditUsername}
        onClose={() => setShowEditUsername(false)}
        onUsernameUpdate={handleUsernameUpdate}
      />
    </div>
  );
};

export default ProfilePage;