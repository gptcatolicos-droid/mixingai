
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/feature/Header';
import CreditsPurchaseModal from '@/components/feature/CreditsPurchaseModal';

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

// Declare PayPal SDK types
declare global {
  interface Window {
    paypal?: {
      Buttons: (config: any) => {
        render: (selector: string) => Promise<void>;
      };
    };
  }
}

const PricingPage: React.FC = () => {
  const location = useLocation();
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

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Estados para PayPal
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [loadingPaypal, setLoadingPaypal] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const paypalButtonsRendered = useRef<Set<string>>(new Set());
  
  // NUEVO: Estado para el modal de compra de créditos
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  // NUEVO: Detectar si el usuario viene desde la pantalla de exportación sin créditos
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const needsCredits = searchParams.get('needsCredits') === 'true';
    
    if (needsCredits && user && user.credits < 500) {
      // Abrir modal de compra de créditos automáticamente
      setShowCreditsModal(true);
    }
  }, [location, user]);

  // NUEVA FUNCIÓN: Manejar compra de créditos con verificación de login
  const handleCreditsButtonClick = () => {
    if (!user) {
      // Redirigir al login si no está autenticado
      navigate('/auth/login');
      return;
    }
    // Abrir modal si está logueado
    setShowCreditsModal(true);
  };

  // Load PayPal SDK
  useEffect(() => {
    if (paypalLoaded || loadingPaypal) return;

    const loadPayPalSDK = async () => {
      setLoadingPaypal(true);
      setPaypalError(null);

      try {
        // Get client ID from environment
        const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
        
        if (!clientId) {
          throw new Error('PayPal Client ID no configurado');
        }

        // Check if already loaded
        if (window.paypal) {
          setPaypalLoaded(true);
          setLoadingPaypal(false);
          return;
        }

        // Load PayPal SDK
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
        script.async = true;
        
        script.onload = () => {
          if (window.paypal) {
            setPaypalLoaded(true);
          } else {
            setPaypalError('PayPal SDK no se cargó correctamente');
          }
          setLoadingPaypal(false);
        };

        script.onerror = () => {
          setPaypalError('Error cargando PayPal SDK');
          setLoadingPaypal(false);
        };

        document.head.appendChild(script);

      } catch (error) {
        console.error('Error loading PayPal SDK:', error);
        setPaypalError(error.message || 'Error desconocido');
        setLoadingPaypal(false);
      }
    };

    loadPayPalSDK();
  }, [paypalLoaded, loadingPaypal]);

  // Render PayPal buttons for each plan
  useEffect(() => {
    if (!paypalLoaded || paypalButtonsRendered.current.has('premium') || !user) return;

    const renderPayPalButton = async (planId: string, amount: string, containerId: string) => {
      try {
        if (!window.paypal) return;

        const userId = user.id || 'guest_' + Date.now();

        const buttons = window.paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'pay',
            height: 45
          },

          createOrder: async (data: any, actions: any) => {
            setIsProcessing(true);
            setSelectedPlan(planId);

            try {
              const response = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/create-paypal-order`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                  amount: amount,
                  currency: 'USD',
                  userId: userId,
                  itemName: `MixingMusic.ai - ${planId === 'premium' ? 'Plan Intermedio' : planId === 'unlimited' ? 'Plan Profesional' : 'Pack Básico'}`
                })
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error creating order');
              }

              const orderData = await response.json();
              
              return orderData.orderID;

            } catch (error) {
              console.error('❌ Create order error:', error);
              setIsProcessing(false);
              setSelectedPlan(null);
              throw error;
            }
          },

          onApprove: async (data: any, actions: any) => {

            try {
              const response = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/capture-paypal-order`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                  orderID: data.orderID,
                  userId: userId
                })
              });

              const result = await response.json();

              if (result.status === 'success') {
                
                // Actualizar créditos del usuario
                const newCredits = user.credits + result.creditsAdded;
                const updatedUser = { ...user, credits: newCredits };
                
                // Si es un plan de suscripción, actualizar también la suscripción
                if (planId === 'premium' || planId === 'unlimited') {
                  const now = new Date();
                  const expirationDate = new Date(now.setMonth(now.getMonth() + 1));
                  
                  updatedUser.subscription = {
                    plan: planId as 'premium' | 'unlimited',
                    expirationDate: expirationDate.toISOString(),
                    isActive: true
                  };
                }
                
                setUser(updatedUser);
                localStorage.setItem('audioMixerUser', JSON.stringify(updatedUser));
                handleCreditsUpdate(newCredits);
                
                // Show success message
                alert(`¡Pago completado exitosamente! Se han añadido ${result.creditsAdded.toLocaleString()} créditos a tu cuenta.`);

              } else {
                throw new Error(result.message || 'Error capturing payment');
              }

            } catch (error) {
              console.error('❌ Capture error:', error);
              alert('Error al procesar el pago. Por favor contacta al soporte.');
            } finally {
              setIsProcessing(false);
              setSelectedPlan(null);
            }
          },

          onError: (err: any) => {
            console.error('❌ PayPal error:', err);
            setIsProcessing(false);
            setSelectedPlan(null);
            alert('Error en el pago con PayPal. Por favor inténtalo nuevamente.');
          },

          onCancel: (data: any) => {
            setIsProcessing(false);
            setSelectedPlan(null);
          }
        });

        // Render buttons
        const container = document.getElementById(containerId);
        if (container && !paypalButtonsRendered.current.has(planId)) {
          await buttons.render(`#${containerId}`);
          paypalButtonsRendered.current.add(planId);
        }

      } catch (error) {
        console.error(`❌ Error rendering PayPal buttons for ${planId}:`, error);
        setPaypalError('Error configurando botones de pago');
      }
    };

    // Render buttons for each plan
    setTimeout(() => {
      renderPayPalButton('basic', '3.99', 'paypal-basic');
      renderPayPalButton('premium', '3.99', 'paypal-premium');  
      renderPayPalButton('unlimited', '9.99', 'paypal-unlimited');
    }, 1000);

  }, [paypalLoaded, user]);

  const handleFreeSignup = () => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    // For free plan, just update user status
    const updatedUser: User = {
      ...user,
      credits: user.credits + 500, // Add welcome credits
      subscription: {
        plan: 'basic',
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        isActive: true
      }
    };

    setUser(updatedUser);
    localStorage.setItem('audioMixerUser', JSON.stringify(updatedUser));
    alert('¡Plan Básico activado! 1 mezcla gratis activada.');
  };

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('audioMixerUser');
  };

  const handleCreditsUpdate = (newCredits: number) => {
    if (!user) return;
    const updatedUser = { ...user, credits: newCredits };
    setUser(updatedUser);
    localStorage.setItem('audioMixerUser', JSON.stringify(updatedUser));
  };

  // NUEVO: Manejar compra de créditos exitosa
  const handleCreditsPurchaseSuccess = (purchasedCredits: number) => {
    if (user) {
      const newCredits = user.credits + purchasedCredits;
      handleCreditsUpdate(newCredits);
      setShowCreditsModal(false);
      
      // Mostrar mensaje de éxito
      alert(`¡${purchasedCredits.toLocaleString()} créditos añadidos exitosamente! Ahora tienes ${newCredits.toLocaleString()} créditos.`);
    }
  };

  const plans = [
    {
      id: 'basic',
      name: 'Plan Básico',
      credits: '5,000 Créditos Únicos',
      originalPrice: 0,
      offerPrice: 0,
      features: [
        '5,000 créditos únicos al registrarse',
        'Se consumen en la primera descarga',
        'Acceso a todas las funciones básicas',
        'Soporte por email'
      ],
      popular: false,
      gradient: 'from-gray-500 to-gray-600',
      buttonText: 'Registrarse Gratis',
      icon: 'ri-gift-line',
      paypalAmount: '0'
    },
    {
      id: 'premium',
      name: 'Plan Intermedio',
      credits: '25,000 Créditos/Mes',
      originalPrice: 10,
      offerPrice: 3.99,
      features: [
        '25,000 créditos mensuales',
        'Hasta 5 mezclas descargadas por mes',
        'Cada mezcla consume 5,000 créditos',
        'Todas las funciones premium',
        'Prioridad en procesamiento',
        'Soporte prioritario 24/7',
        'Historial extendido'
      ],
      popular: true,
      gradient: 'from-purple-500 to-pink-600',
      buttonText: 'Más Popular',
      icon: 'ri-vip-crown-line',
      paypalAmount: '3.99'
    },
    {
      id: 'unlimited',
      name: 'Plan Profesional',
      credits: 'Mezclas Ilimitadas',
      originalPrice: 19.99,
      offerPrice: 9.99,
      features: [
        'Mezclas ilimitadas mensuales',
        'Sin límite de créditos por descarga',
        'Todas las funciones premium',
        'API access para desarrolladores',
        'Soporte dedicado',
        'Sesiones de consultoría incluidas',
        'Licencia comercial extendida',
        'Integraciones personalizadas'
      ],
      popular: false,
      gradient: 'from-indigo-500 to-purple-700',
      buttonText: 'Para Profesionales',
      icon: 'ri-star-line',
      paypalAmount: '9.99'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif' }}>
      <Header 
        user={user}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
        onCreditsUpdate={handleCreditsUpdate}
      />

      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* NUEVO: Banner de compra rápida de créditos */}
        {user && user.credits < 500 && (
          <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/30 rounded-2xl p-6 mb-8 backdrop-blur-xl">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <i className="ri-error-warning-line text-red-400 text-2xl"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">¡Créditos Insuficientes!</h3>
                  <p className="text-red-300">Necesitas más créditos para continuar mezclando. Tienes {user.credits} créditos.</p>
                </div>
              </div>
              <button
                onClick={handleCreditsButtonClick}
                className="bg-gradient-to-r from-magenta-500 to-cyan-500 hover:from-magenta-600 hover:to-cyan-600 text-white border-0 font-bold px-8 py-4 rounded-2xl transition-all hover:scale-105 shadow-xl whitespace-nowrap"
              >
                <i className="ri-shopping-cart-line mr-2"></i>
                Comprar Créditos Ahora
              </button>
            </div>
          </div>
        )}

        {/* Header Section - Apple Music Style */}
        <div className="text-center mb-16">
          {/* Logo with Apple Music styling */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 rounded-3xl flex items-center justify-center shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/30 via-pink-400/30 to-red-400/30 animate-pulse"></div>
                <div className="relative z-10">
                  <i className="ri-equalizer-fill text-white text-3xl"></i>
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-[shine_2s_ease-in-out_infinite]"></div>
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Elige tu Plan
            <span className="block text-3xl sm:text-4xl lg:text-5xl bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent mt-2">
              Mezclado con IA
            </span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-white/80 max-w-4xl mx-auto mb-8 leading-relaxed font-medium">
            Desbloquea todo el potencial de la inteligencia artificial para crear mezclas profesionales.
            <span className="block mt-2 text-lg text-white/60">Planes diseñados para cada tipo de artista y proyecto.</span>
          </p>
          
          {/* ACTUALIZADO: Opciones rápidas de compra con verificación de login */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
            <button
              onClick={handleCreditsButtonClick}
              className="bg-gradient-to-r from-magenta-500 to-cyan-500 hover:from-magenta-600 hover:to-cyan-600 text-white border-0 font-bold px-8 py-4 rounded-2xl transition-all hover:scale-105 shadow-xl flex items-center space-x-3"
            >
              <i className="ri-coin-line text-xl"></i>
              <span>{user ? 'Comprar Créditos Inmediatamente' : 'Iniciar Sesión para Comprar'}</span>
            </button>
            <span className="text-white/60">o elige un plan mensual abajo</span>
          </div>
          
          {/* Offer banner - Apple Music style */}
          <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 border border-yellow-400/30 rounded-full px-6 py-3 backdrop-blur-xl">
            <i className="ri-fire-line text-yellow-400 text-xl animate-bounce"></i>
            <span className="text-white font-semibold text-lg">¡Oferta de lanzamiento! Hasta 50% OFF</span>
            <i className="ri-fire-line text-yellow-400 text-xl animate-bounce"></i>
          </div>
        </div>

        {/* Current Subscription Status */}
        {user?.subscription?.isActive && (
          <div className="bg-green-500/10 border border-green-400/30 rounded-2xl p-6 mb-12 text-center backdrop-blur-xl">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <i className="ri-vip-crown-line text-green-400 text-2xl"></i>
              <h3 className="text-xl font-bold text-white">Plan Activo: {user.subscription.plan.toUpperCase()}</h3>
            </div>
            <p className="text-green-300">
              Válido hasta: {new Date(user.subscription.expirationDate).toLocaleDateString('es-ES')}
            </p>
          </div>
        )}

        {/* Plans Grid - Apple Music Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <div
              key={plan.id}
              className={`relative transform transition-all duration-500 hover:scale-105 ${
                plan.popular ? 'lg:-translate-y-4' : ''
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-xl">
                    ✨ Más Popular
                  </div>
                </div>
              )}

              {/* Card */}
              <div className={`relative bg-white/5 backdrop-blur-xl rounded-3xl p-8 border transition-all duration-300 shadow-2xl ${
                plan.popular 
                  ? 'border-purple-400/50 shadow-purple-500/20' 
                  : 'border-white/10 hover:border-white/20'
              }`}>
                
                {/* Plan Icon */}
                <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-r ${plan.gradient} flex items-center justify-center shadow-xl`}>
                  <i className={`text-white text-2xl ${plan.icon}`}></i>
                </div>
                
                {/* Plan Details */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-3">{plan.name}</h3>
                  <p className="text-white/70 text-lg mb-6">{plan.credits}</p>
                  
                  {/* Pricing */}
                  {plan.offerPrice === 0 ? (
                    <div className="text-4xl font-bold text-white mb-2">Gratis</div>
                  ) : (
                    <div className="mb-4">
                      <div className="flex items-center justify-center space-x-3 mb-2">
                        {plan.originalPrice !== 0 && (
                          <span className="text-white/50 line-through text-xl">${plan.originalPrice}</span>
                        )}
                        <span className="text-4xl font-bold text-white">${plan.offerPrice}</span>
                      </div>
                      <p className="text-white/70">{plan.id === 'basic' ? 'pago único' : 'por mes'}</p>
                      {plan.originalPrice !== 0 && (
                        <div className="inline-flex items-center space-x-2 bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-sm mt-2">
                          <i className="ri-price-tag-line"></i>
                          <span>Ahorra {Math.round((1 - plan.offerPrice / plan.originalPrice) * 100)}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <i className="ri-check-line text-green-400 text-sm"></i>
                      </div>
                      <span className="text-white/80">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* PLAN GRATIS - Botón tradicional */}
                {plan.id === 'basic' ? (
                  <button
                    onClick={handleFreeSignup}
                    disabled={user?.subscription?.plan === plan.id && user?.subscription?.isActive}
                    className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-xl ${
                      user?.subscription?.plan === plan.id && user?.subscription?.isActive
                        ? 'bg-green-500/20 text-green-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white hover:shadow-2xl transform hover:scale-105'
                    }`}
                  >
                    {user?.subscription?.plan === plan.id && user?.subscription?.isActive ? (
                      <>
                        <i className="ri-check-line mr-2"></i>
                        Plan Activo
                      </>
                    ) : (
                      <>
                        <i className="ri-gift-line mr-2"></i>
                        Registrarse Gratis
                      </>
                    )}
                  </button>
                ) : (
                  /* PLANS PAGOS - PayPal Integration */
                  <div className="space-y-4">
                    {/* Plan Status Check */}
                    {user?.subscription?.plan === plan.id && user?.subscription?.isActive ? (
                      <button
                        disabled
                        className="w-full py-4 rounded-2xl font-bold text-lg bg-green-500/20 text-green-300 cursor-not-allowed shadow-xl"
                      >
                        <i className="ri-check-line mr-2"></i>
                        Plan Activo
                      </button>
                    ) : !user ? (
                      <button
                        onClick={() => navigate('/auth/login')}
                        className="w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white transition-all duration-300 shadow-xl"
                      >
                        <i className="ri-login-box-line mr-2"></i>
                        Iniciar Sesión para Comprar
                      </button>
                    ) : (
                      /* PayPal Buttons Container */
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
                        <div className="text-center mb-3">
                          <h4 className="font-bold text-blue-400 text-sm">💳 Pagar con PayPal</h4>
                          <p className="text-blue-300/80 text-xs">Pago seguro con encriptación SSL</p>
                        </div>

                        {/* PayPal Loading States */}
                        {loadingPaypal && (
                          <div className="text-center py-4">
                            <div className="inline-flex items-center space-x-2 text-blue-400 text-sm">
                              <i className="ri-loader-4-line animate-spin"></i>
                              <span>Cargando PayPal...</span>
                            </div>
                          </div>
                        )}

                        {paypalError && (
                          <div className="text-center py-4">
                            <div className="text-red-400 mb-2">
                              <i className="ri-error-warning-line"></i>
                            </div>
                            <p className="text-red-300 text-xs">{paypalError}</p>
                          </div>
                        )}

                        {/* PayPal Buttons */}
                        {paypalLoaded && !paypalError && (
                          <div className="min-h-[45px]">
                            <div 
                              id={`paypal-${plan.id}`}
                              className="min-h-[45px]"
                            ></div>
                            
                            {isProcessing && selectedPlan === plan.id && (
                              <div className="text-center mt-2">
                                <div className="inline-flex items-center space-x-2 text-blue-400 text-sm">
                                  <i className="ri-loader-4-line animate-spin"></i>
                                  <span>Procesando...</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 mb-16 border border-white/10">
          <h3 className="text-3xl font-bold text-white text-center mb-8">Preguntas Frecuentes</h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h4 className="text-xl font-bold text-white mb-3">¿Cómo funcionan los créditos?</h4>
                <p className="text-white/70">
                  Cada mezcla consume créditos según su complejidad. Las mezclas básicas (1-5 stems) usan 100 créditos, 
                  las ilimitadas por $3.99 pago único.
                </p>
              </div>
              
              <div>
                <h4 className="text-xl font-bold text-white mb-3">¿Puedo cambiar de plan?</h4>
                <p className="text-white/70">
                  Sí, puedes actualizar o cambiar tu plan en cualquier momento. Los cambios se reflejan 
                  inmediatamente y se prorratean según corresponda.
                </p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-xl font-bold text-white mb-3">¿Hay garantía de reembolso?</h4>
                <p className="text-white/70">
                  Ofrecemos garantía de satisfacción de 30 días. Si no estás satisfecho, 
                  puedes solicitar un reembolso completo durante el primer mes.
                </p>
              </div>
              
              <div>
                <h4 className="text-xl font-bold text-white mb-3">¿Los pagos son seguros?</h4>
                <p className="text-white/70">
                  Todos los pagos son procesados de forma segura por PayPal con encriptación de nivel bancario 
                  y cumplimiento PCI DSS.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="text-center bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
          <h3 className="text-2xl font-bold text-white mb-4">¿Necesitas ayuda para elegir?</h3>
          <p className="text-white/70 mb-6">
            Nuestro equipo está aquí para ayudarte a encontrar el plan perfecto para tus necesidades.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6">
            <a href="mailto:support@mixingmusic.co" className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300">
              <i className="ri-mail-line"></i>
              <span>support@mixingmusic.co</span>
            </a>
            <span className="text-white/50 hidden sm:block">|</span>
            <span className="text-white/70">Soporte 24/7</span>
          </div>
        </div>
      </div>

      {/* NUEVO: Modal de compra de créditos integrado */}
      <CreditsPurchaseModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        onPurchaseSuccess={handleCreditsPurchaseSuccess}
        currentCredits={user?.credits || 0}
      />

      {/* Custom animations */}
      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
      `}</style>
    </div>
  );
};

export default PricingPage;
