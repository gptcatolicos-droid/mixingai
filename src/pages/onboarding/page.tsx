
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/base/Button';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  credits: number;
}

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState<User | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Verificar si el usuario está logueado
  useEffect(() => {
    const userData = localStorage.getItem('audioMixerUser');
    if (!userData) {
      navigate('/auth/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Verificar si ya completó el onboarding
    const hasCompletedOnboarding = localStorage.getItem('onboardingCompleted');
    if (hasCompletedOnboarding) {
      navigate('/');
    }
  }, [navigate]);

  const steps = [
    {
      id: 1,
      title: '¡Bienvenido a MixingMusic.ai!',
      subtitle: 'Tu estudio de mezclas con inteligencia artificial',
      content: (
        <div className="text-center space-y-6">
          {/* Logo animado */}
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 rounded-3xl flex items-center justify-center shadow-2xl animate-pulse">
            <i className="ri-equalizer-fill text-white text-4xl"></i>
          </div>
          
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
              ¡Hola {user?.firstName}!
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
              Estás a punto de descubrir la forma más avanzada de mezclar música. Nuestra IA te ayudará a crear mezclas profesionales en minutos.
            </p>
          </div>

          {/* Créditos disponibles */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-6 max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <i className="ri-coin-line text-emerald-500 text-2xl"></i>
              <h3 className="font-bold text-gray-900 text-xl">Tienes {user?.credits || 0} Créditos</h3>
            </div>
            <p className="text-emerald-700 text-sm">
              Perfecto para comenzar a mezclar tus primeras canciones con IA profesional
            </p>
          </div>

          {/* Características principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg mb-3">
                <i className="ri-robot-line text-white text-2xl"></i>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">IA Avanzada</h4>
              <p className="text-gray-600 text-sm">Algoritmos profesionales de mezcla y masterización</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg mb-3">
                <i className="ri-headphone-line text-white text-2xl"></i>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Calidad Studio</h4>
              <p className="text-gray-600 text-sm">Exportación profesional -10 LUFS para streaming</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg mb-3">
                <i className="ri-time-line text-white text-2xl"></i>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Súper Rápido</h4>
              <p className="text-gray-600 text-sm">Mezclas profesionales en menos de 5 minutos</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: 'Cómo Funciona MixingMusic.ai',
      subtitle: 'Proceso simple en 4 pasos',
      content: (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '1',
                title: 'Sube tus Stems',
                description: 'Arrastra tus archivos de audio (voces, instrumentos, etc.)',
                icon: 'ri-upload-cloud-2-line',
                color: 'from-blue-500 to-indigo-500'
              },
              {
                step: '2',
                title: 'IA Analiza',
                description: 'Nuestros algoritmos identifican cada instrumento automáticamente',
                icon: 'ri-brain-line',
                color: 'from-purple-500 to-pink-500'
              },
              {
                step: '3',
                title: 'Mezcla y Ajusta',
                description: 'Usa plantillas profesionales o ajusta manualmente',
                icon: 'ri-equalizer-line',
                color: 'from-green-500 to-emerald-500'
              },
              {
                step: '4',
                title: 'Exporta Pro',
                description: 'Descarga tu mezcla optimizada para streaming',
                icon: 'ri-download-cloud-line',
                color: 'from-red-500 to-orange-500'
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className={`w-20 h-20 mx-auto bg-gradient-to-br ${item.color} rounded-3xl flex items-center justify-center shadow-2xl mb-4`}>
                  <i className={`${item.icon} text-white text-3xl`}></i>
                </div>
                <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl p-4 border border-gray-200/50">
                  <div className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center text-sm font-bold mb-3 mx-auto">
                    {item.step}
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                    {item.title}
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Ejemplo visual */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
              🎵 Ejemplo de Proyecto
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Vocals.wav', type: 'vocals', color: 'bg-pink-500' },
                { name: 'Drums.wav', type: 'drums', color: 'bg-red-500' },
                { name: 'Bass.wav', type: 'bass', color: 'bg-purple-500' },
                { name: 'Guitar.wav', type: 'guitar', color: 'bg-blue-500' }
              ].map((file, index) => (
                <div key={index} className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                  <div className={`w-8 h-8 ${file.color} rounded-lg flex items-center justify-center mb-2`}>
                    <i className="ri-music-line text-white text-sm"></i>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{file.name}</div>
                  <div className="text-xs text-gray-600 capitalize">{file.type}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: 'Plantillas Profesionales',
      subtitle: 'Mezclas perfectas con un clic',
      content: (
        <div className="space-y-8">
          <div className="text-center mb-8">
            <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
              Hemos creado plantillas basadas en los géneros musicales más populares. Cada una aplica automáticamente la ecualización, compresión y efectos ideales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Pop',
                description: 'Mezcla brillante y moderna perfecta para música comercial',
                icon: 'ri-mic-line',
                color: 'from-pink-500 to-rose-500',
                features: ['Bass: +2 dB', 'Mid: +1 dB', 'High: +3 dB', 'Compresión Suave'],
                usage: 'Ideal para: Baladas, Pop comercial, R&B'
              },
              {
                name: 'Rock',
                description: 'Potencia y presencia para géneros con energía',
                icon: 'ri-guitar-line',
                color: 'from-red-500 to-orange-500',
                features: ['Bass: +4 dB', 'Mid: -1 dB', 'High: +2 dB', 'Compresión Intensa'],
                usage: 'Ideal para: Rock, Metal, Punk, Hard Rock'
              },
              {
                name: 'Lo-Fi',
                description: 'Sonido cálido y vintage con carácter nostálgico',
                icon: 'ri-vinyl-line',
                color: 'from-amber-500 to-yellow-500',
                features: ['Bass: +1 dB', 'Mid: -2 dB', 'High: -4 dB', 'Saturación Vintage'],
                usage: 'Ideal para: Hip-Hop, Chill, Jazz, Soul'
              }
            ].map((preset, index) => (
              <div key={index} className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl hover:shadow-3xl transition-all hover:scale-105">
                <div className="text-center">
                  <div className={`w-20 h-20 mx-auto bg-gradient-to-br ${preset.color} rounded-3xl flex items-center justify-center shadow-2xl mb-6`}>
                    <i className={`${preset.icon} text-white text-3xl`}></i>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                    {preset.name}
                  </h3>
                  
                  <p className="text-gray-600 mb-6 leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                    {preset.description}
                  </p>

                  {/* Configuraciones */}
                  <div className="bg-gray-100/50 rounded-2xl p-4 mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3 text-sm">Configuración Automática</h4>
                    <div className="space-y-2">
                      {preset.features.map((feature, fIndex) => (
                        <div key={fIndex} className="flex items-center justify-center">
                          <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mr-2"></div>
                          <span className="text-xs text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Uso recomendado */}
                  <div className="text-left">
                    <div className="text-xs text-gray-500 mb-1 font-medium">Uso Recomendado</div>
                    <div className="text-sm text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/30">
                      {preset.usage}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tip profesional */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-6">
            <div className="flex items-start space-x-4">
              <i className="ri-lightbulb-line text-emerald-500 text-2xl mt-1"></i>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">💡 Consejo de Productor</h4>
                <p className="text-gray-700 leading-relaxed">
                  Las plantillas son excelentes puntos de partida, pero siempre puedes ajustar manualmente después. 
                  La IA aprende de productores Grammy y estudios profesionales para darte el mejor sonido base.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: '¡Listo para Comenzar!',
      subtitle: 'Tu estudio profesional te espera',
      content: (
        <div className="text-center space-y-8">
          {/* Animación de éxito */}
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl animate-bounce">
            <i className="ri-check-double-line text-white text-5xl"></i>
          </div>

          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
              ¡Todo Configurado!
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
              Ya conoces las herramientas principales. Es hora de crear tu primera mezcla profesional con IA.
            </p>
          </div>

          {/* Resumen de créditos */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-3xl p-8 max-w-lg mx-auto">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <i className="ri-vip-crown-line text-yellow-500 text-3xl"></i>
              <h3 className="text-2xl font-bold text-gray-900">Cuenta Premium Lista</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-white/50 rounded-xl p-3">
                <span className="text-gray-700">Créditos Disponibles</span>
                <span className="font-bold text-green-600 text-lg">{user?.credits || 0}</span>
              </div>
              <div className="flex items-center justify-between bg-white/50 rounded-xl p-3">
                <span className="text-gray-700">Calidad de Exportación</span>
                <span className="font-bold text-blue-600">-10 LUFS</span>
              </div>
              <div className="flex items-center justify-between bg-white/50 rounded-xl p-3">
                <span className="text-gray-700">Plantillas Incluidas</span>
                <span className="font-bold text-purple-600">3 Profesionales</span>
              </div>
            </div>
          </div>

          {/* Siguiente paso */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-6">
            <h4 className="font-bold text-gray-900 mb-3 text-lg">🚀 Próximo Paso Recomendado</h4>
            <p className="text-gray-700 mb-4">
              Crea tu primer proyecto subiendo algunos archivos de audio. El sistema identificará automáticamente cada instrumento y aplicará la configuración inicial perfecta.
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm text-emerald-600">
              <i className="ri-time-line"></i>
              <span>Tiempo estimado: 2-5 minutos</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCompletedSteps(prev => [...prev, currentStep]);
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    navigate('/');
  };

  const currentStepData = steps.find(step => step.id === currentStep);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <div className="bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src="https://static.readdy.ai/image/b1eac48ec385ead8debde409294ee615/609f268732409aa5f9e36b8cf47e9d62.png" 
                alt="MixingMusic.ai" 
                className="object-contain w-40 h-8"
              />
              <div className="text-slate-300 text-sm">
                Onboarding • Paso {currentStep} de {steps.length}
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="text-slate-400 hover:text-white transition-colors text-sm"
            >
              Saltar →
            </button>
          </div>
        </div>
      </div>

      {/* Progreso */}
      <div className="bg-slate-800/50 border-b border-slate-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  currentStep === step.id
                    ? 'bg-gradient-to-r from-magenta-500 to-cyan-500 text-white'
                    : completedSteps.includes(step.id)
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-700 text-slate-400'
                }`}>
                  {completedSteps.includes(step.id) ? (
                    <i className="ri-check-line"></i>
                  ) : (
                    step.id
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-1 mx-3 rounded-full transition-all ${
                    completedSteps.includes(step.id) ? 'bg-green-500' : 'bg-slate-700'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 lg:p-12 shadow-2xl border border-white/20">
          {/* Header del paso */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
              {currentStepData?.title}
            </h1>
            <p className="text-xl text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
              {currentStepData?.subtitle}
            </p>
          </div>

          {/* Contenido del paso */}
          <div className="mb-12">
            {currentStepData?.content}
          </div>

          {/* Navegación */}
          <div className="flex items-center justify-between">
            <div>
              {currentStep > 1 && (
                <Button
                  onClick={handlePrevious}
                  className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 border-0"
                >
                  <i className="ri-arrow-left-line mr-2"></i>
                  Anterior
                </Button>
              )}
            </div>

            <div className="text-center">
              <div className="text-sm text-gray-500 mb-2">
                Paso {currentStep} de {steps.length}
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-magenta-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(currentStep / steps.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <Button
                onClick={handleNext}
                className="px-8 py-3 bg-gradient-to-r from-magenta-500 to-cyan-500 hover:from-magenta-600 hover:to-cyan-600 text-white border-0 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                {currentStep === steps.length ? 'Comenzar a Mezclar' : 'Siguiente'}
                <i className="ri-arrow-right-line ml-2"></i>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
