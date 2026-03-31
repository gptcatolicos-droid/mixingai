import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../components/base/Button';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    country: 'Argentina',
    phone: '',
    rememberPassword: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userIP, setUserIP] = useState<string>('');
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);

  // Obtener IP del usuario al cargar la página
  useEffect(() => {
    const getUserIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setUserIP(data.ip);
      } catch (error) {
        console.error('Error obteniendo IP:', error);
        // IP de respaldo para desarrollo
        setUserIP('127.0.0.1');
      }
    };
    
    getUserIP();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
        setError('Por favor, completa todos los campos requeridos');
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Por favor, ingresa un email válido');
        return;
      }

      // Generate proper UUID
      const userId = crypto.randomUUID();
      
      // Create user (sin créditos iniciales - se otorgan al verificar email)
      const newUser = {
        id: userId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        country: formData.country,
        phone: formData.phone,
        credits: 0, // No créditos hasta verificar email
        provider: 'email',
        createdAt: new Date().toISOString(),
        username: `${formData.firstName.toLowerCase()}_${formData.lastName.toLowerCase()}`,
        emailVerified: false,
        registrationIP: userIP
      };

      // Registrar en Supabase (simulado - en producción usarías Supabase Auth)
      const registerResponse = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/register-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user: newUser,
          ipAddress: userIP
        })
      });

      if (!registerResponse.ok) {
        const registerData = await registerResponse.json();
        setError(registerData.error || 'Error durante el registro');
        return;
      }

      // Enviar email de verificación
      const emailResponse = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/send-verification-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          userId: userId,
          type: 'registration'
        })
      });

      if (!emailResponse.ok) {
        console.error('Error enviando email de verificación');
        // Continúar aunque falle el email
      }

      // Store user temporarily (sin créditos)
      localStorage.setItem('audioMixerUser', JSON.stringify({
        ...newUser,
        needsVerification: true
      }));
      
      if (formData.rememberPassword) {
        localStorage.setItem('rememberUser', 'true');
      }

      // Mostrar mensaje de verificación
      setShowVerificationMessage(true);

    } catch (err) {
      console.error('Registration error:', err);
      setError('Ocurrió un error durante el registro. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Componente de mensaje de verificación
  if (showVerificationMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 shadow-2xl text-center">
          {/* Icono de email */}
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-3xl flex items-center justify-center shadow-lg">
            <i className="ri-mail-check-line text-white text-3xl"></i>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4">¡Verifica tu Email!</h2>
          
          <p className="text-slate-300 text-lg mb-6 leading-relaxed">
            Te hemos enviado un email de verificación a:<br/>
            <span className="font-semibold text-cyan-400">{formData.email}</span>
          </p>

          <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-3 mb-3">
              <i className="ri-gift-line text-emerald-400 text-xl"></i>
              <h4 className="font-semibold text-white">500 Créditos Te Esperan</h4>
            </div>
            <p className="text-emerald-200 text-sm">
              Haz clic en el enlace del email para verificar tu cuenta y recibir automáticamente 500 créditos gratuitos.
            </p>
          </div>

          <div className="text-slate-400 text-sm mb-6">
            <p>• Revisa tu bandeja de entrada y spam</p>
            <p>• El enlace expira en 24 horas</p>
            <p>• Solo una cuenta gratuita por IP</p>
          </div>

          <div className="flex flex-col space-y-3">
            <Button
              onClick={() => navigate('/auth/login')}
              className="w-full bg-gradient-to-r from-magenta-500 to-cyan-500 hover:from-magenta-600 hover:to-cyan-600 text-white border-0 py-3 font-semibold"
            >
              Ir a Iniciar Sesión
            </Button>
            
            <button
              onClick={() => setShowVerificationMessage(false)}
              className="text-slate-400 hover:text-white transition-colors text-sm"
            >
              ← Volver al registro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      {/* Header - Mobile optimized */}
      <div className="bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Link to="/" className="flex items-center space-x-2 sm:space-x-3">
                <img 
                  src="https://static.readdy.ai/image/b1eac48ec385ead8debde409294ee615/609f268732409aa5f9e36b8cf47e9d62.png" 
                  alt="MixingMusic.ai" 
                  className="object-contain w-32 h-7 sm:w-40 sm:h-8 lg:w-48 lg:h-10"
                />
              </Link>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Link 
                to="/auth/login"
                className="text-slate-300 hover:text-white px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold text-sm sm:text-lg transition-all border border-slate-600/50 hover:bg-slate-700/50"
              >
                Iniciar Sesión
              </Link>
              <Link 
                to="/auth/register"
                className="bg-gradient-to-r from-magenta-500 to-cyan-500 hover:from-magenta-600 hover:to-cyan-600 text-white px-4 sm:px-8 py-2 sm:py-3 rounded-xl font-semibold text-sm sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Crear Cuenta
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Background with pattern */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255,255,255,0.1) 2px, transparent 0), 
                             radial-gradient(circle at 75px 75px, rgba(255,255,255,0.05) 2px, transparent 0)`,
            backgroundSize: '100px 100px'
          }}></div>
        </div>

        {/* Register Form */}
        <div className="relative z-10 flex items-center justify-center min-h-screen py-8 sm:py-12">
          <div className="max-w-md w-full mx-4 sm:mx-6">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl">
              <div className="text-center mb-6 sm:mb-8">
                <div className="w-14 sm:w-16 h-14 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gradient-to-r from-magenta-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <i className="ri-user-add-line text-white text-xl sm:text-2xl"></i>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Crea tu Cuenta</h1>
                <p className="text-slate-400 text-sm sm:text-base">Únete y obtén 500 créditos gratis al verificar tu email</p>
              </div>

              {/* IP Protection Notice */}
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <i className="ri-shield-check-line text-yellow-400 text-lg sm:text-xl mt-1"></i>
                  <div>
                    <h4 className="font-semibold text-white text-sm sm:text-base mb-1">Política de Registro</h4>
                    <div className="text-xs sm:text-sm text-yellow-200 space-y-1">
                      <p>• Solo 1 cuenta gratuita por dirección IP</p>
                      <p>• Verificación de email obligatoria</p>
                      <p>• 500 créditos gratis al verificar</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Welcome Bonus */}
              <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                  <i className="ri-gift-line text-emerald-400 text-lg sm:text-xl"></i>
                  <h4 className="font-semibold text-white text-sm sm:text-base">¡Bonificación de Bienvenida!</h4>
                </div>
                <div className="text-xs sm:text-sm text-slate-300 space-y-1">
                  <p>• 500 créditos gratis al verificar email</p>
                  <p>• Perfecto para mezclar tu primera canción</p>
                  <p>• Todas las funciones de IA incluidas</p>
                  <p>• Exportación profesional -14 LUFS</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                  <div className="flex items-start space-x-2">
                    <i className="ri-error-warning-line text-red-400 text-lg mt-1"></i>
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Nombre *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-magenta-500/50 transition-all duration-300 text-sm sm:text-base"
                      placeholder="Tu nombre"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Apellido *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-magenta-500/50 transition-all duration-300 text-sm sm:text-base"
                      placeholder="Tu apellido"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Correo Electrónico *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-magenta-500/50 transition-all duration-300 text-sm sm:text-base"
                    placeholder="tu@email.com"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Contraseña *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength={6}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-magenta-500/50 transition-all duration-300 text-sm sm:text-base"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-gradient-to-r from-magenta-500 to-cyan-500 hover:from-magenta-600 hover:to-cyan-600 text-white border-0 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-sm sm:text-base"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creando Cuenta...' : 'Crear Cuenta Gratis'}
                </Button>
              </form>

              <div className="text-center mt-4 sm:mt-6">
                <p className="text-slate-400 text-xs sm:text-sm">
                  Al crear una cuenta, aceptas nuestros{' '}
                  <Link to="/terms" className="text-magenta-400 hover:text-magenta-300 transition-colors">
                    Términos de Servicio
                  </Link>{' '}
                  y{' '}
                  <Link to="/privacy" className="text-magenta-400 hover:text-magenta-300 transition-colors">
                    Política de Privacidad
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Mobile optimized */}
      <footer className="bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255,255,255,0.1) 2px, transparent 0), 
                             radial-gradient(circle at 75px 75px, rgba(255,255,255,0.05) 2px, transparent 0)`,
            backgroundSize: '100px 100px'
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 md:grid-cols-2 gap-8 sm:gap-12 mb-8 sm:mb-12">
            {/* Logo and Description */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-6">
                <img 
                  src="https://static.readdy.ai/image/b1eac48ec385ead8debde409294ee615/609f268732409aa5f9e36b8cf47e9d62.png" 
                  alt="MixingMusic.ai" 
                  className="object-contain w-32 h-7 sm:w-40 sm:h-8 lg:w-48 lg:h-10"
                />
              </div>
              <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-4 sm:mb-6">
                La plataforma de inteligencia artificial más avanzada para mezclar música profesionalmente. 
                Transforme tus ideas musicales en producciones de calidad de estudio.
              </p>
              
              {/* Highlight 500 créditos gratis */}
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <i className="ri-gift-line text-white text-lg sm:text-xl"></i>
                  </div>
                  <div>
                    <h4 className="text-lg sm:text-xl font-bold text-white">¡500 Créditos GRATIS!</h4>
                    <p className="text-yellow-200 text-sm sm:text-base">Regístrate hoy y comienza a mezclar sin costo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Enlaces Rápidos</h4>
              <ul className="space-y-2 sm:space-y-3">
                <li><Link to="/" className="text-slate-300 hover:text-cyan-400 transition-colors flex items-center text-sm sm:text-base"><i className="ri-arrow-right-s-line mr-2"></i>Inicio</Link></li>
                <li><Link to="/auth/register" className="text-slate-300 hover:text-cyan-400 transition-colors flex items-center text-sm sm:text-base"><i className="ri-arrow-right-s-line mr-2"></i>Crear Cuenta</Link></li>
                <li><Link to="/" className="text-slate-300 hover:text-cyan-400 transition-colors flex items-center text-sm sm:text-base"><i className="ri-arrow-right-s-line mr-2"></i>Precios</Link></li>
                <li><Link to="/feed" className="text-slate-300 hover:text-cyan-400 transition-colors flex items-center text-sm sm:text-base"><i className="ri-arrow-right-s-line mr-2"></i>Feed Musical</Link></li>
                <li><a href="#" className="text-slate-300 hover:text-cyan-400 transition-colors flex items-center text-sm sm:text-base"><i className="ri-arrow-right-s-line mr-2"></i>Soporte</a></li>
                <li><a href="https://readdy.ai/?origin=logo" className="text-slate-300 hover:text-cyan-400 transition-colors flex items-center text-sm sm:text-base"><i className="ri-arrow-right-s-line mr-2"></i>Made with Readdy</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6">Contacto</h4>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center space-x-3">
                  <i className="ri-mail-line text-cyan-400"></i>
                  <span className="text-slate-300 text-sm sm:text-base">support@mixingmusic.ai</span>
                </div>
                <div className="flex items-center space-x-3">
                  <i className="ri-customer-service-line text-cyan-400"></i>
                  <span className="text-slate-300 text-sm sm:text-base">Soporte 24/7</span>
                </div>
              </div>
              
              {/* Solo Instagram */}
              <div className="mt-6 sm:mt-8">
                <h5 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Síguenos</h5>
                <div className="flex space-x-4">
                  <a href="#" className="w-8 sm:w-10 h-8 sm:h-10 bg-slate-800/50 rounded-xl flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700/70 transition-all">
                    <i className="ri-instagram-line text-sm sm:text-base"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-700/50 pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4 sm:space-x-6">
              <p className="text-slate-400 text-sm sm:text-base">
                © 2024 MixingMusic.ai. Todos los derechos reservados.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center space-x-4 sm:space-x-6 text-xs sm:text-sm">
              <Link to="/terms" className="text-slate-400 hover:text-white transition-colors">Términos de Servicio</Link>
              <Link to="/privacy" className="text-slate-400 hover:text-white transition-colors">Política de Privacidad</Link>
              <Link to="/cookies" className="text-slate-400 hover:text-white transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RegisterPage;
