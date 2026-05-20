
import { useState, useEffect, useRef } from 'react';
import Button from '../base/Button';

interface CreditsPurchaseScreenProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchaseSuccess: (credits: number) => void;
  currentCredits: number;
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

export default function CreditsPurchaseScreen({ 
  isOpen, 
  onClose, 
  onPurchaseSuccess, 
  currentCredits 
}: CreditsPurchaseScreenProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPack, setSelectedPack] = useState('basic');
  const [paypalLoaded, setPaypalLoaded] = useState(false);
  const [loadingPaypal, setLoadingPaypal] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const paypalButtonsRendered = useRef(false);

  const creditPacks = [
    {
      id: 'basic',
      name: 'Pack Básico',
      credits: 5000,
      price: 3.99,
      popular: true,
      description: '50 mezclas básicas o 10 mezclas avanzadas',
      features: [
        '5,000 créditos adicionales',
        'Válido por tiempo ilimitado',
        'Soporte prioritario',
        'Sin límite de stems por mezcla'
      ]
    }
  ];

  const selectedPackData = creditPacks.find(pack => pack.id === selectedPack)!;

  // Load PayPal SDK
  useEffect(() => {
    if (!isOpen || paypalLoaded || loadingPaypal) return;

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

        // Cleanup function
        return () => {
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        };

      } catch (error) {
        console.error('Error loading PayPal SDK:', error);
        setPaypalError(error.message || 'Error desconocido');
        setLoadingPaypal(false);
      }
    };

    loadPayPalSDK();
  }, [isOpen, paypalLoaded, loadingPaypal]);

  // Render PayPal buttons when SDK is loaded
  useEffect(() => {
    if (!paypalLoaded || !isOpen || paypalButtonsRendered.current || !paypalContainerRef.current) return;

    const renderPayPalButtons = async () => {
      try {
        if (!window.paypal) {
          throw new Error('PayPal SDK not available');
        }

        // Get user data
        const user = JSON.parse(localStorage.getItem('audioMixerUser') || '{}');
        const userId = user.id || 'guest_' + Date.now();

        const buttons = window.paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'pay',
            height: 50
          },

          createOrder: async (data: any, actions: any) => {
            setIsProcessing(true);

            try {
              const response = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/create-paypal-order`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                  amount: selectedPackData.price.toString(),
                  currency: 'USD',
                  userId: userId,
                  itemName: `MixingMusic.ai - ${selectedPackData.name}`
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
                
                // Update credits in parent component
                onPurchaseSuccess(result.creditsAdded);
                
                // Show success message
                alert(`¡Pago completado exitosamente! Se han añadido ${result.creditsAdded.toLocaleString()} créditos a tu cuenta.`);
                
                // Close modal
                onClose();

              } else {
                throw new Error(result.message || 'Error capturing payment');
              }

            } catch (error) {
              console.error('❌ Capture error:', error);
              alert('Error al procesar el pago. Por favor contacta al soporte.');
            } finally {
              setIsProcessing(false);
            }
          },

          onError: (err: any) => {
            console.error('❌ PayPal error:', err);
            setIsProcessing(false);
            alert('Error en el pago con PayPal. Por favor inténtalo nuevamente.');
          },

          onCancel: (data: any) => {
            setIsProcessing(false);
          }
        });

        // Render buttons
        if (paypalContainerRef.current) {
          await buttons.render('#paypal-buttons-container');
          paypalButtonsRendered.current = true;
        }

      } catch (error) {
        console.error('❌ Error rendering PayPal buttons:', error);
        setPaypalError('Error configurando botones de pago');
      }
    };

    renderPayPalButtons();
  }, [paypalLoaded, isOpen, selectedPackData, onPurchaseSuccess, onClose]);

  // Reset PayPal buttons when modal closes/opens
  useEffect(() => {
    if (!isOpen) {
      paypalButtonsRendered.current = false;
      if (paypalContainerRef.current) {
        paypalContainerRef.current.innerHTML = '';
      }
    }
  }, [isOpen]);

  // Si no está abierto, no renderizar nada
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900 min-h-screen overflow-y-auto">
      
      {/* Header Propio de la Pantalla de Compra */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-magenta-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <i className="ri-music-2-line text-white text-xl"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">MixingMusic.ai</h1>
                <p className="text-slate-400 text-sm">Comprar Créditos</p>
              </div>
            </div>
            
            {/* Botón Volver */}
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex items-center space-x-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
            >
              <i className="ri-arrow-left-line"></i>
              <span>Volver</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-r from-magenta-500 to-cyan-500 rounded-3xl flex items-center justify-center shadow-2xl">
            <i className="ri-coin-line text-white text-4xl"></i>
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-4">
            Comprar Créditos
          </h1>
          
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Añade más créditos a tu cuenta para continuar creando mezclas profesionales con IA
          </p>
        </div>

        {/* Créditos Actuales */}
        <div className="bg-slate-800/50 rounded-3xl p-8 mb-12 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center">
                <i className="ri-wallet-3-line text-cyan-400 text-2xl"></i>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Créditos Actuales</h3>
                <p className="text-slate-400 text-lg">Disponibles en tu cuenta</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-cyan-400">
                {currentCredits.toLocaleString()}
              </div>
              <div className="text-slate-400 text-lg">créditos</div>
            </div>
          </div>
        </div>

        {/* Pack de Créditos - Card Grande */}
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 rounded-3xl p-12 border-2 border-magenta-500/30 relative mb-12 shadow-2xl">
          
          {/* Badge Popular */}
          <div className="absolute -top-4 left-8">
            <span className="bg-gradient-to-r from-magenta-500 to-cyan-500 text-white text-sm font-bold px-8 py-3 rounded-full shadow-lg">
              🔥 MÁS POPULAR
            </span>
          </div>

          <div className="mt-6 grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Información del Pack */}
            <div>
              <h2 className="text-4xl font-bold text-white mb-4">
                {selectedPackData.name}
              </h2>
              
              <p className="text-xl text-slate-300 mb-8">
                {selectedPackData.description}
              </p>

              {/* Características */}
              <div className="space-y-4">
                {selectedPackData.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <i className="ri-check-line text-white text-sm"></i>
                    </div>
                    <span className="text-slate-300 text-lg">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Créditos y Precio */}
            <div className="text-center">
              
              {/* Créditos */}
              <div className="bg-slate-900/50 rounded-3xl p-8 mb-8 border border-slate-600/50">
                <div className="text-6xl font-bold text-cyan-400 mb-3">
                  {selectedPackData.credits.toLocaleString()}
                </div>
                <div className="text-slate-400 text-lg mb-6">créditos adicionales</div>
                
                <div className="pt-6 border-t border-slate-600/50">
                  <p className="text-slate-300 text-lg">
                    Después tendrás <span className="text-cyan-400 font-bold text-xl">{(currentCredits + selectedPackData.credits).toLocaleString()}</span> créditos
                  </p>
                </div>
              </div>

              {/* Precio */}
              <div className="mb-8">
                <div className="text-6xl font-bold text-white mb-2">
                  ${selectedPackData.price}
                </div>
                <div className="text-slate-400 text-lg">USD • Pago único</div>
              </div>

            </div>
          </div>
        </div>

        {/* Ejemplos de Uso */}
        <div className="bg-slate-800/30 rounded-3xl p-8 mb-12 border border-slate-700/50">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">
            ¿Qué puedes hacer con 5,000 créditos?
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex items-center space-x-6 bg-slate-700/30 rounded-2xl p-6">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center">
                <i className="ri-music-2-line text-cyan-400 text-2xl"></i>
              </div>
              <div>
                <div className="text-white font-bold text-xl">50+ mezclas básicas</div>
                <div className="text-slate-400">Tracks con 1-5 stems</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6 bg-slate-700/30 rounded-2xl p-6">
              <div className="w-16 h-16 bg-magenta-500/20 rounded-2xl flex items-center justify-center">
                <i className="ri-equalizer-line text-magenta-400 text-2xl"></i>
              </div>
              <div>
                <div className="text-white font-bold text-xl">10+ mezclas avanzadas</div>
                <div className="text-slate-400">Tracks con 6+ stems</div>
              </div>
            </div>
          </div>
        </div>

        {/* PayPal Payment Section */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-3xl p-8 mb-8">
          <div className="text-center mb-6">
            <h4 className="font-bold text-blue-400 mb-3 text-2xl">💳 Pagar con PayPal</h4>
            <p className="text-blue-300/80 text-lg">
              Pago seguro procesado por PayPal con encriptación SSL
            </p>
          </div>

          {/* PayPal Loading States */}
          {loadingPaypal && (
            <div className="text-center py-8">
              <div className="inline-flex items-center space-x-3 text-blue-400">
                <i className="ri-loader-4-line animate-spin text-2xl"></i>
                <span className="text-lg">Cargando PayPal...</span>
              </div>
            </div>
          )}

          {paypalError && (
            <div className="text-center py-8">
              <div className="text-red-400 mb-4">
                <i className="ri-error-warning-line text-2xl"></i>
              </div>
              <p className="text-red-300">{paypalError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/30 transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* PayPal Buttons Container */}
          {paypalLoaded && !paypalError && (
            <div className="max-w-md mx-auto">
              <div 
                id="paypal-buttons-container"
                ref={paypalContainerRef}
                className="min-h-[50px]"
              ></div>
              
              {isProcessing && (
                <div className="text-center mt-4">
                  <div className="inline-flex items-center space-x-3 text-blue-400">
                    <i className="ri-loader-4-line animate-spin text-xl"></i>
                    <span>Procesando pago...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Información de Seguridad */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-3xl p-8">
          <div className="flex items-start space-x-6">
            <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <i className="ri-shield-check-line text-green-400 text-2xl"></i>
            </div>
            <div>
              <h4 className="font-bold text-green-400 mb-3 text-xl">🔒 Pago 100% Seguro</h4>
              <div className="text-green-300/80 space-y-2">
                <p>• ✅ Procesado por PayPal con encriptación SSL</p>
                <p>• ✅ Sin almacenar datos de tarjetas</p>
                <p>• ✅ Créditos añadidos automáticamente</p>
                <p>• ✅ Garantía de reembolso de 30 días</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
