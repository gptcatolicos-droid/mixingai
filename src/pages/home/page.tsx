
import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProjectDashboard from './components/ProjectDashboard';
import FAQ from '../../components/feature/FAQ';
import { blogArticles } from '../../mocks/blogArticles';

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

interface ExportData {
  audioBuffer: AudioBuffer;
  audioUrl: string;
  waveformPeaks: Float32Array;
  finalLufs: number;
  mp3Url?: string;
  wavUrl?: string;
}

// Función para detectar idioma por IP (simulada)
const detectLanguageByIP = (): 'en' | 'es' => {
  // En una implementación real, esto haría una llamada a un servicio de geolocalización
  // Por ahora simulamos detección por timezone o navegador
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const browserLang = navigator.language || navigator.languages[0];
  
  // Si el timezone sugiere países de habla hispana
  const spanishTimezones = ['America/Mexico_City', 'America/Lima', 'America/Bogota', 'America/Buenos_Aires', 'Europe/Madrid'];
  const isSpanishTimezone = spanishTimezones.some(tz => timezone.includes(tz.split('/')[1]));
  
  // Si el navegador está en español
  const isSpanishBrowser = browserLang.startsWith('es');
  
  return (isSpanishTimezone || isSpanishBrowser) ? 'es' : 'en';
};

// Función para obtener últimos artículos del blog
const getLatestBlogArticles = () => {
  // Usar la importación directa en lugar de require
  return blogArticles
    .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
    .slice(0, 6); // Top 6 más recientes
};

const HomePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check for stored user on component mount and detect language
  React.useEffect(() => {
    // Detectar idioma por IP/región
    const detectedLanguage = detectLanguageByIP();
    setLanguage(detectedLanguage);
    
    const storedUser = localStorage.getItem('audioMixerUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (!userData.username) {
          userData.username = `${userData.firstName.toLowerCase()}_${userData.lastName.toLowerCase()}`;
        }
        setUser(userData);
        localStorage.setItem('audioMixerUser', JSON.stringify(userData));
      } catch (error) {
        localStorage.removeItem('audioMixerUser');
      }
    }
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('audioMixerUser');
    localStorage.removeItem('rememberUser');
  };

  const handleCreditsUpdate = (newCredits: number) => {
    if (!user) return;
    const updatedUser = { ...user, credits: newCredits };
    setUser(updatedUser);
    localStorage.setItem('audioMixerUser', JSON.stringify(updatedUser));
  };

  const handleExport = (exportData: ExportData) => {
    setExportData(exportData);
    // setCurrentScreen('export'); // This line references an undefined variable, commented out for now
  };

  // If user is logged in, show ONLY the project dashboard (it has its own header)
  if (user) {
    return <ProjectDashboard />;
  }

  // Textos según idioma detectado
  const texts = {
    en: {
      signIn: 'Sign In',
      createAccount: 'Create Account',
      heroTitle: 'Never been so easy and professional',
      heroSubtitle: 'to mix your music',
      heroDescription: 'Transform your recordings into professional productions with the power of artificial intelligence. No complications, no learning curve.',
      freeCredits: '500 FREE Credits!',
      freeCreditsDesc: 'Register and mix your first songs at no cost',
      startFree: 'Start Free',
      instructions: 'Instructions',
      featuresTitle: 'Everything you need to mix like a professional',
      featuresDesc: 'Our AI analyzes every element of your song and applies professional mixing techniques used by the world\'s best audio engineers.',
      advancedAI: 'Advanced AI',
      advancedAIDesc: 'Algorithms trained with thousands of professional mixes to obtain studio-quality results.',
      fastResults: 'Fast Results',
      fastResultsDesc: 'In minutes get a professional mix that would normally take hours of manual work.',
      totalControl: 'Total Control',
      totalControlDesc: 'Adjust every parameter according to your artistic vision. AI suggests, you decide.',
      footerDesc: 'The most advanced artificial intelligence platform for mixing music professionally. Transform your musical ideas into studio-quality productions.',
      footerCredits: '500 FREE Credits!',
      footerCreditsDesc: 'Register today and start mixing at no cost',
      quickLinks: 'Quick Links',
      contact: 'Contact',
      followUs: 'Follow Us',
      aiMixing: 'AI Music Mixing',
      mixWithAI: 'Mix with AI',
      musicProduction: 'Music Production',
      professionalProduction: 'Professional production',
      allRights: 'All rights reserved.'
    },
    es: {
      signIn: 'Iniciar Sesión',
      createAccount: 'Crear Cuenta',
      heroTitle: 'Nunca fue tan fácil y profesional',
      heroSubtitle: 'mezclar tu música',
      heroDescription: 'Transforma tus grabaciones en producciones profesionales con el poder de la inteligencia artificial. Sin complicaciones, sin curva de aprendizaje.',
      freeCredits: '¡500 Créditos GRATIS!',
      freeCreditsDesc: 'Regístrate y mezcla tus primeras canciones sin costo',
      startFree: 'Comenzar Gratis',
      instructions: 'Instrucciones',
      featuresTitle: 'Todo lo que necesitas para mezclar como un profesional',
      featuresDesc: 'Nuestra IA analiza cada elemento de tu canción y aplica técnicas de mezcla profesionales utilizadas por los mejores ingenieros de audio del mundo.',
      advancedAI: 'IA Avanzada',
      advancedAIDesc: 'Algoritmos entrenados con miles de mezclas profesionales para obtener resultados de calidad de estudio.',
      fastResults: 'Resultados Rápidos',
      fastResultsDesc: 'En minutos obtén una mezcla profesional que normalmente tomaría horas de trabajo manual.',
      totalControl: 'Control Total',
      totalControlDesc: 'Ajusta cada parámetro según tu visión artística. La IA sugiere, tú decides.',
      footerDesc: 'La plataforma de inteligencia artificial más avanzada para mezclar música profesionalmente. Transforma tus ideas musicales en producciones de calidad de estudio.',
      footerCredits: '¡500 Créditos GRATIS!',
      footerCreditsDesc: 'Regístrate hoy y comienza a mezclar sin costo',
      quickLinks: 'Enlaces Rápidos',
      contact: 'Contacto',
      followUs: 'Síguenos',
      aiMixing: 'Mezcla Musical con IA',
      mixWithAI: 'Mezclar con IA',
      musicProduction: 'Producción Musical',
      professionalProduction: 'Producción profesional',
      allRights: 'Todos los derechos reservados.'
    }
  };

  const t = texts[language];

  return (
    <div className="min-h-screen bg-white">
      {/* Top Header with Login/Register - SOLO para usuarios no logueados */}
      <div className="bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo más grande con nuevo logo - SIN cuadrado */}
            <div className="flex items-center space-x-4">
              <img 
                src="https://static.readdy.ai/image/b1eac48ec385ead8debde409294ee615/609f268732409aa5f9e36b8cf47e9d62.png" 
                alt="MixingMusic.ai" 
                className="w-24 h-6 object-contain md:block"
                style={{ width: '200px', height: '42.7px' }}
              />
              {/* Título visible en blanco, fuente moderna no cursiva - SOLO DESKTOP */}
              <h1 className="text-lg font-medium text-white hidden md:block">
                mixingmusic.ai
              </h1>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                to="/blog"
                className="text-slate-300 hover:text-white px-4 py-2 rounded-xl font-semibold text-lg transition-all border border-slate-600/50 hover:bg-slate-700/50"
              >
                Blog
              </Link>
              <Link 
                to="/pricing"
                className="text-slate-300 hover:text-white px-4 py-2 rounded-xl font-semibold text-lg transition-all border border-slate-600/50 hover:bg-slate-700/50"
              >
                Precios
              </Link>
              <Link 
                to="/auth/login"
                className="text-slate-300 hover:text-white px-6 py-3 rounded-xl font-semibold text-lg transition-all border border-slate-600/50 hover:bg-slate-700/50"
              >
                {t.signIn}
              </Link>
              <Link 
                to="/auth/register"
                className="bg-gradient-to-r from-magenta-500 to-cyan-500 hover:from-magenta-600 hover:to-cyan-600 text-white px-8 py-3 rounded-xl font-semibold text-lg shadow-lg"
              >
                {t.createAccount}
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-slate-300 hover:text-white p-2 rounded-lg"
            >
              <i className={`text-2xl ${mobileMenuOpen ? 'ri-close-line' : 'ri-menu-line'}`}></i>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-slate-700/50 pt-4">
              <div className="space-y-3">
                <Link 
                  to="/blog"
                  className="block text-slate-300 hover:text-white px-4 py-3 rounded-xl font-semibold text-lg transition-all border border-slate-600/50 hover:bg-slate-700/50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Blog
                </Link>
                <Link 
                  to="/pricing"
                  className="block text-slate-300 hover:text-white px-4 py-3 rounded-xl font-semibold text-lg transition-all border border-slate-600/50 hover:bg-slate-700/50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Precios
                </Link>
                <Link 
                  to="/auth/login"
                  className="block text-slate-300 hover:text-white px-4 py-3 rounded-xl font-semibold text-lg transition-all border border-slate-600/50 hover:bg-slate-700/50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.signIn}
                </Link>
                <Link 
                  to="/auth/register"
                  className="block bg-gradient-to-r from-magenta-500 to-cyan-500 hover:from-magenta-600 hover:to-cyan-600 text-white px-6 py-3 rounded-xl font-semibold text-lg shadow-lg text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.createAccount}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hero Banner - Integrated Design */}
      <div className="relative bg-gradient-to-br from-blue-600 via-purple-700 to-indigo-800 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://readdy.ai/api/search-image?query=Two%20professional%20music%20producers%20working%20together%20in%20modern%20recording%20studio%2C%20sitting%20at%20mixing%20console%20with%20multiple%20monitors%2C%20collaborating%20on%20music%20mixing%2C%20professional%20studio%20lighting%2C%20high-tech%20equipment%2C%20focused%20musicians%20creating%20music%2C%20wide%20angle%20view%20of%20studio%20setup%2C%20contemporary%20music%20production%20environment%2C%20teamwork%20in%20sound%20engineering&width=1400&height=800&seq=banner-collab&orientation=landscape"
            alt="Professional music mixing studio with two producers"
            className="w-full h-full object-cover object-top opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-purple-900/70 to-transparent"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-16 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Side - Content con logo de marca */}
            <div className="max-w-2xl text-center lg:text-left">
              {/* NUEVO: Logo agregado encima del título */}
              <div className="flex justify-center lg:justify-start mb-8">
                <img 
                  src="https://static.readdy.ai/image/b1eac48ec385ead8debde409294ee615/265373b6781fc1bc833e0cb3faaa9b7c.png" 
                  alt="MixingMusic.ai Logo" 
                  className="h-16 lg:h-20 object-contain"
                />
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 lg:mb-8 leading-tight">
                {t.heroTitle}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
                  {t.heroSubtitle}
                </span>
              </h1>
              
              <p className="text-lg lg:text-2xl text-blue-100 mb-6 lg:mb-8 leading-relaxed">
                {t.heroDescription}
              </p>
              
              {/* Destacar 500 créditos gratis */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 lg:p-6 mb-6 lg:mb-8">
                <div className="flex items-center space-x-3 lg:space-x-4">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <i className="ri-gift-line text-white text-lg lg:text-xl"></i>
                  </div>
                  <div>
                    <h3 className="text-lg lg:text-xl font-bold text-white">{t.freeCredits}</h3>
                    <p className="text-blue-200 text-sm lg:text-base">{t.freeCreditsDesc}</p>
                  </div>
                </div>
              </div>
              
              {/* Botones de acción */}
              <div className="space-y-4 lg:space-y-6">
                <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
                  <Link 
                    to="/auth/register"
                    className="bg-white text-purple-900 px-6 lg:px-8 py-3 lg:py-4 rounded-xl font-semibold text-base lg:text-lg hover:bg-purple-50 transition-all duration-300 whitespace-nowrap cursor-pointer shadow-lg hover:shadow-xl text-center"
                  >
                    {t.startFree}
                  </Link>
                  <button 
                    onClick={() => {
                      const instructionsText = language === 'es' 
                        ? '🎵 Instrucciones de Uso:\n\n1️⃣ Sube tus archivos de audio (MP3, WAV, FLAC)\n2️⃣ Máximo 12 stems por proyecto\n3️⃣ Nuestra IA analiza cada elemento automáticamente\n4️⃣ Selecciona tu estilo de mezcla preferido\n5️⃣ Ajusta parámetros específicos si lo deseas\n6️⃣ Descarga tu mezcla profesional en minutos!\n\n✨ Con 500 créditos gratis puedes mezclar varias canciones para probar la calidad de nuestro servicio.'
                        : '🎵 Usage Instructions:\n\n1️⃣ Upload your audio files (MP3, WAV, FLAC)\n2️⃣ Maximum 12 stems per project\n3️⃣ Our AI analyzes each element automatically\n4️⃣ Select your preferred mixing style\n5️⃣ Adjust specific parameters if desired\n6️⃣ Download your professional mix in minutes!\n\n✨ With 500 free credits you can mix several songs to test our service quality.';
                      alert(instructionsText);
                    }}
                    className="border-2 border-white text-white px-6 lg:px-8 py-3 lg:py-4 rounded-xl font-semibold text-base lg:text-lg hover:bg-white hover:text-purple-900 transition-all duration-300 whitespace-nowrap cursor-pointer"
                  >
                    {t.instructions}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Right Side - Visual Element - SOLO DESKTOP */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-pink-500/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8">
                <div className="space-y-4">
                  <div className="h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"></div>
                  <div className="h-2 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full w-3/4"></div>
                  <div className="h-2 bg-gradient-to-r from-green-400 to-cyan-5 00 rounded-full w-5/6"></div>
                  <div className="h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full w-2/3"></div>
                  <div className="text-center pt-6">
                    <div className="inline-flex items-center space-x-2 bg-white/10 rounded-full px-4 py-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-white text-sm font-medium">
                        {language === 'es' ? 'Mezclando con IA...' : 'Mixing with AI...'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            {t.featuresTitle}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t.featuresDesc}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 hover:shadow-lg transition-all duration-300">
            <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6">
              <i className="ri-music-2-line text-2xl text-white"></i>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{t.advancedAI}</h3>
            <p className="text-gray-600 leading-relaxed">
              {t.advancedAIDesc}
            </p>
          </div>

          <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg transition-all duration-300">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6">
              <i className="ri-time-line text-2xl text-white"></i>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{t.fastResults}</h3>
            <p className="text-gray-600 leading-relaxed">
              {t.fastResultsDesc}
            </p>
          </div>

          <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 hover:shadow-lg transition-all duration-300">
            <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-6">
              <i className="ri-settings-3-line text-2xl text-white"></i>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{t.totalControl}</h3>
            <p className="text-gray-600 leading-relaxed">
              {t.totalControlDesc}
            </p>
          </div>
        </div>

        {/* Enlaces internos a artículos del blog */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8 mb-20">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {language === 'es' ? 'Aprende Más sobre Mezcla Musical' : 'Learn More about Music Mixing'}
            </h3>
            <p className="text-gray-600">
              {language === 'es' 
                ? 'Descubre técnicas profesionales y consejos expertos en nuestro blog'
                : 'Discover professional techniques and expert tips in our blog'}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Link 
              to="/blog/ai-music-mixing-guide?lang=es"
              className="bg-white p-6 rounded-xl hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <i className="ri-brain-line text-white text-xl"></i>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">
                {language === 'es' ? 'Guía Completa de Mezcla con IA' : 'Complete AI Mixing Guide'}
              </h4>
              <p className="text-gray-600 text-sm">
                {language === 'es' 
                  ? 'Todo lo que necesitas saber sobre la mezcla musical con inteligencia artificial'
                  : 'Everything you need to know about AI music mixing'}
              </p>
            </Link>

            <Link 
              to="/blog/professional-mixing-techniques?lang=es"
              className="bg-white p-6 rounded-xl hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <i className="ri-equalizer-line text-white text-xl"></i>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">
                {language === 'es' ? 'Técnicas de Mezcla Profesional' : 'Professional Mixing Techniques'}
              </h4>
              <p className="text-gray-600 text-sm">
                {language === 'es' 
                  ? 'Aprende los secretos que usan los ingenieros de audio profesionales'
                  : 'Learn the secrets used by professional audio engineers'}
              </p>
            </Link>

            <Link 
              to="/blog/stem-separation-guide?lang=es"
              className="bg-white p-6 rounded-xl hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <i className="ri-file-music-line text-white text-xl"></i>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">
                {language === 'es' ? 'Separación de Stems con IA' : 'AI Stem Separation'}
              </h4>
              <p className="text-gray-600 text-sm">
                {language === 'es' 
                  ? 'Cómo separar instrumentos y voces usando inteligencia artificial'
                  : 'How to separate instruments and vocals using artificial intelligence'}
              </p>
            </Link>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gradient-to-br from-slate-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <FAQ language={language} />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(255,255,255,0.1) 2px, transparent 0), 
                             radial-gradient(circle at 75px 75px, rgba(255,255,255,0.05) 2px, transparent 0)`,
            backgroundSize: '100px 100px'
          }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-16">
          {/* Main Footer Content */}
          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-12 mb-12">
            {/* Logo and Description */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-4 mb-6">
                <img 
                  src="https://static.readdy.ai/image/b1eac48ec385ead8debde409294ee615/609f268732409aa5f9e36b8cf47e9d62.png" 
                  alt="MixingMusic.ai" 
                  className="object-contain"
                  style={{ width: '200px', height: '42.7px' }}
                />
                <div>
                  <h3 className="text-lg font-medium text-white">
                    mixingmusic.ai
                  </h3>
                  <p className="text-purple-300 text-sm">
                    {language === 'es' ? 'La revolución de la mezcla musical' : 'The music mixing revolution'}
                  </p>
                </div>
              </div>
              <p className="text-slate-300 text-lg leading-relaxed mb-6">
                {t.footerDesc}
              </p>
              
              {/* Highlight 500 créditos gratis */}
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <i className="ri-gift-line text-white text-xl"></i>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">{t.footerCredits}</h4>
                    <p className="text-yellow-200">{t.footerCreditsDesc}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Últimos Artículos del Blog */}
            <div>
              <h4 className="text-xl font-bold mb-6">
                {language === 'es' ? 'Últimos Artículos del Blog' : 'Latest Blog Articles'}
              </h4>
              <ul className="space-y-3">
                {getLatestBlogArticles().slice(0, 7).map((article) => (
                  <li key={article.id}>
                    <Link 
                      to={`/blog/${article.slug}?lang=${language}`}
                      className="text-slate-300 hover:text-cyan-400 transition-colors flex items-start group"
                    >
                      <i className="ri-arrow-right-s-line mr-2 mt-0.5 text-cyan-400 group-hover:translate-x-1 transition-transform"></i>
                      <span className="text-sm leading-relaxed">
                        {language === 'es' ? article.titleEs : article.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Enlaces Rápidos y Contacto */}
            <div>
              <h4 className="text-xl font-bold mb-6">{t.quickLinks}</h4>
              <ul className="space-y-3 mb-8">
                <li><Link to="/" className="text-slate-300 hover:text-cyan-400 transition-colors flex items-center"><i className="ri-arrow-right-s-line mr-2"></i>{language === 'es' ? 'Inicio' : 'Home'}</Link></li>
                <li><Link to="/blog" className="text-slate-300 hover:text-cyan-400 transition-colors flex items-center"><i className="ri-arrow-right-s-line mr-2"></i>Blog</Link></li>
                <li><Link to="/auth/register" className="text-slate-300 hover:text-cyan-400 transition-colors flex items-center"><i className="ri-arrow-right-s-line mr-2"></i>{language === 'es' ? 'Crear Cuenta - 500 Créditos Gratis' : 'Create Account - 500 Free Credits'}</Link></li>
                <li><Link to="/pricing" className="text-slate-300 hover:text-cyan-400 transition-colors flex items-center"><i className="ri-arrow-right-s-line mr-2"></i>{language === 'es' ? 'Precios' : 'Pricing'}</Link></li>
                <li><a href="https://www.sellerplus.co/" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-cyan-400 transition-colors flex items-center"><i className="ri-arrow-right-s-line mr-2"></i>Vender en Amazon - Agencia Amazon</a></li>
                <li><a href="https://readdy.ai/?origin=logo" className="text-slate-300 hover:text-cyan-400 transition-colors flex items-center"><i className="ri-arrow-right-s-line mr-2"></i>Made with Readdy</a></li>
              </ul>

              {/* Contacto */}
              <div>
                <h5 className="font-semibold mb-4">{t.contact}</h5>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <i className="ri-mail-line text-cyan-400 w-5 h-5 flex items-center justify-center"></i>
                    <span className="text-slate-300 text-sm">support@mixingmusic.co</span>
                  </div>
                </div>
                
                {/* Instagram */}
                <div className="mt-6">
                  <h6 className="font-semibold mb-3 text-sm">{t.followUs}</h6>
                  <div className="flex space-x-3">
                    <a href="#" className="w-8 h-8 bg-slate-800/50 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700/70 transition-all">
                      <i className="ri-instagram-line text-sm"></i>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SEO Keywords Section */}
          <div className="border-t border-slate-700/50 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-6 mb-4 md:mb-0">
              <p className="text-slate-400">
                © 2024 MixingMusic.ai. {t.allRights}
              </p>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <Link to="/terms" className="text-slate-400 hover:text-white transition-colors">
                {language === 'es' ? 'Términos de Servicio' : 'Terms of Service'}
              </Link>
              <Link to="/privacy" className="text-slate-400 hover:text-white transition-colors">
                {language === 'es' ? 'Política de Privacidad' : 'Privacy Policy'}
              </Link>
              <Link to="/cookies" className="text-slate-400 hover:text-white transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
