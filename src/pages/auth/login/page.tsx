import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '@/components/base/Button';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  phone?: string;
  credits: number;
  provider?: string;
  createdAt: string;
  username?: string;
  avatar?: string;
  verified: boolean;
}

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const isSuperUser = (email: string) => {
    return email === 'danipalacio@gmail.com';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Determine credits based on user type
    const credits = isSuperUser(formData.email) ? 999999 : 500;

    const user: User = {
      id: Date.now().toString(),
      firstName: isSuperUser(formData.email) ? 'Dani' : 'User',
      lastName: isSuperUser(formData.email) ? 'Palacio' : 'Demo',
      email: formData.email,
      country: 'Colombia',
      credits: credits,
      createdAt: new Date().toISOString(),
      username: isSuperUser(formData.email) ? 'danipalacio' : 'user_demo',
      verified: true,
      provider: 'email'
    };

    // Store user with session persistence
    localStorage.setItem('audioMixerUser', JSON.stringify(user));
    if (formData.rememberMe) {
      localStorage.setItem('rememberUser', 'true');
    }

    setIsLoading(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-magenta-500/5 via-transparent to-cyan-500/5"></div>

      {/* Header - Mobile optimized */}
      <div className="relative z-10 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3 sm:space-x-4">
              <img 
                src="https://static.readdy.ai/image/b1eac48ec385ead8debde409294ee615/609f268732409aa5f9e36b8cf47e9d62.png" 
                alt="MixingMusic.ai" 
                className="object-contain w-32 h-7 sm:w-40 sm:h-8"
              />
            </Link>
            
            <div className="flex items-center space-x-3 sm:space-x-4">
              <span className="text-slate-400 text-sm sm:text-base hidden sm:block">¿No tienes cuenta?</span>
              <Link
                to="/auth/register"
                className="text-cyan-400 hover:text-white transition-colors font-medium text-sm sm:text-base"
              >
                Crear Cuenta
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen py-8 sm:py-12">
        <div className="max-w-md w-full mx-4 sm:mx-6">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              <div className="mb-4 flex justify-center">
                <img 
                  src="https://static.readdy.ai/image/b1eac48ec385ead8debde409294ee615/609f268732409aa5f9e36b8cf47e9d62.png" 
                  alt="MixingMusic.ai" 
                  className="object-contain w-40 h-8 sm:w-48 sm:h-10"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">¡Bienvenido de vuelta!</h1>
              <p className="text-slate-400 text-sm sm:text-base">
                Inicia sesión para acceder a tu estudio de mezclas
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={`w-full bg-slate-800/50 border rounded-lg px-3 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-magenta-500/50 transition-all duration-300 text-sm sm:text-base ${
                    errors.email ? 'border-red-500/50' : 'border-slate-700/50'
                  }`}
                  placeholder="tu@email.com"
                />
                {errors.email && (
                  <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className={`w-full bg-slate-800/50 border rounded-lg px-3 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-magenta-500/50 transition-all duration-300 text-sm sm:text-base ${
                    errors.password ? 'border-red-500/50' : 'border-slate-700/50'
                  }`}
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="text-red-400 text-xs mt-1">{errors.password}</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={formData.rememberMe}
                    onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                    className="w-4 h-4 bg-slate-800 border border-slate-600 rounded focus:ring-magenta-500"
                  />
                  <label htmlFor="rememberMe" className="text-sm text-slate-300 cursor-pointer">
                    Recordarme
                  </label>
                </div>
                <button
                  type="button"
                  className="text-sm text-magenta-400 hover:text-magenta-300 transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                loading={isLoading}
                className="w-full bg-gradient-to-r from-magenta-500 to-cyan-500 hover:from-magenta-600 hover:to-cyan-600 text-white border-0 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-sm sm:text-base"
              >
                {isLoading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 sm:my-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-slate-800/50 text-slate-400">O continúa con</span>
                </div>
              </div>
            </div>

            {/* Demo Login */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setFormData({ email: 'user@demo.com', password: 'demo123', rememberMe: false });
                }}
                className="w-full bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white px-4 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105 cursor-pointer flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                <i className="ri-user-line text-cyan-400"></i>
                <span>Demo Usuario Regular (500 créditos)</span>
              </button>
            </div>

            <div className="text-center mt-4 sm:mt-6">
              <p className="text-slate-400 text-sm">
                ¿No tienes cuenta?{' '}
                <Link to="/auth/register" className="text-magenta-400 hover:text-magenta-300 transition-colors">
                  Crea una gratis
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 bg-slate-800/50 backdrop-blur-sm border-t border-slate-700/50 text-white py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-4 sm:mb-6">
            <div>
              <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                <img 
                  src="https://static.readdy.ai/image/b1eac48ec385ead8debde409294ee615/609f268732409aa5f9e36b8cf47e9d62.png" 
                  alt="MixingMusic.ai" 
                  className="object-contain w-32 h-7 sm:w-40 sm:h-8"
                />
              </div>
              <p className="text-slate-400 text-sm sm:text-base">
                Mezcla tu música como un profesional con inteligencia artificial.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">Enlaces</h4>
              <ul className="space-y-2 text-slate-400 text-sm sm:text-base">
                <li><Link to="/" className="hover:text-white transition-colors">Inicio</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">Precios</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Términos</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacidad</Link></li>
                <li><a href="https://www.sellerplus.co/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Vender en Amazon - Agencia Amazon</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3 sm:mb-4 text-sm sm:text-base">Soporte</h4>
              <ul className="space-y-2 text-slate-400 text-sm sm:text-base">
                <li>support@mixingmusic.co</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700/50 pt-4 sm:pt-6 text-center text-slate-400">
            <p className="text-sm sm:text-base">© 2024 MixingMusic.ai. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
