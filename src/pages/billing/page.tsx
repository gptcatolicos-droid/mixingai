import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/feature/Header';

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

interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard' | 'amex' | 'paypal';
  last4: string;
  expiryDate: string;
  isDefault: boolean;
}

interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  plan: string;
  status: 'paid' | 'pending' | 'failed';
  invoice: string;
}

const BillingPage: React.FC = () => {
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

  const [activeTab, setActiveTab] = useState<'subscription' | 'payment' | 'history'>('subscription');
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data
  const [paymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'visa',
      last4: '4242',
      expiryDate: '12/25',
      isDefault: true
    },
    {
      id: '2',
      type: 'mastercard',
      last4: '5555',
      expiryDate: '08/26',
      isDefault: false
    }
  ]);

  const [billingHistory] = useState<BillingHistory[]>([
    {
      id: '1',
      date: '2024-01-15',
      amount: 9.99,
      plan: 'Plan Profesional',
      status: 'paid',
      invoice: 'INV-001'
    },
    {
      id: '2',
      date: '2023-12-15',
      amount: 9.99,
      plan: 'Plan Profesional',
      status: 'paid',
      invoice: 'INV-002'
    },
    {
      id: '3',
      date: '2023-11-15',
      amount: 3.99,
      plan: 'Plan Intermedio',
      status: 'paid',
      invoice: 'INV-003'
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

  const handleCancelSubscription = async () => {
    if (!user?.subscription) return;
    
    setIsLoading(true);
    
    // Simular cancelación
    setTimeout(() => {
      const updatedUser = {
        ...user,
        subscription: {
          ...user.subscription!,
          isActive: false
        }
      };
      setUser(updatedUser);
      localStorage.setItem('audioMixerUser', JSON.stringify(updatedUser));
      setIsLoading(false);
      alert('Suscripción cancelada correctamente. Tendrás acceso hasta la fecha de vencimiento.');
    }, 2000);
  };

  const handleUpgradePlan = () => {
    navigate('/pricing');
  };

  const getCardIcon = (type: string) => {
    switch (type) {
      case 'visa': return 'ri-visa-line';
      case 'mastercard': return 'ri-mastercard-line';
      case 'amex': return 'ri-bank-card-line';
      case 'paypal': return 'ri-paypal-line';
      default: return 'ri-bank-card-line';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-400 bg-green-500/20';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      case 'failed': return 'text-red-400 bg-red-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Pagado';
      case 'pending': return 'Pendiente';
      case 'failed': return 'Falló';
      default: return 'Desconocido';
    }
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
            <i className="ri-bill-line text-2xl text-cyan-400"></i>
            <h1 className="text-3xl font-bold text-white">Facturación</h1>
          </div>
          <p className="text-slate-400">Gestiona tu suscripción, métodos de pago e historial de facturación</p>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-800/50 rounded-2xl p-1 mb-8 inline-flex">
          <button
            onClick={() => setActiveTab('subscription')}
            className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'subscription'
                ? 'bg-slate-700 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="ri-vip-crown-line mr-2"></i>
            Suscripción
          </button>
          <button
            onClick={() => setActiveTab('payment')}
            className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'payment'
                ? 'bg-slate-700 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="ri-bank-card-line mr-2"></i>
            Métodos de Pago
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'history'
                ? 'bg-slate-700 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="ri-history-line mr-2"></i>
            Historial
          </button>
        </div>

        {/* Content */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            {/* Current Subscription */}
            <div className="bg-slate-800/50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Suscripción Actual</h2>
              
              {user.subscription?.isActive ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <i className="ri-vip-crown-line text-2xl text-yellow-400"></i>
                        <h3 className="text-2xl font-bold text-white">
                          {user.subscription.plan === 'premium' ? 'Plan Intermedio' : 
                           user.subscription.plan === 'unlimited' ? 'Plan Profesional' : 'Plan Básico'}
                        </h3>
                      </div>
                      <p className="text-slate-400">
                        {user.subscription.plan === 'premium' ? '2,500 créditos mensuales' : 
                         user.subscription.plan === 'unlimited' ? 'Mezclas ilimitadas' : '500 créditos gratis'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        ${user.subscription.plan === 'premium' ? '3.99' : 
                          user.subscription.plan === 'unlimited' ? '9.99' : '0.00'}
                      </div>
                      <div className="text-slate-400 text-sm">por mes</div>
                    </div>
                  </div>

                  <div className="bg-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-slate-300">Estado</span>
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                        Activo
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-slate-300">Próxima facturación</span>
                      <span className="text-white font-medium">
                        {new Date(user.subscription.expirationDate).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Renovación automática</span>
                      <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm font-medium">
                        Activada
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleUpgradePlan}
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-3 px-6 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer"
                    >
                      <i className="ri-arrow-up-line mr-2"></i>
                      Cambiar Plan
                    </button>
                    <button
                      onClick={handleCancelSubscription}
                      disabled={isLoading}
                      className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <i className="ri-loader-4-line mr-2 animate-spin"></i>
                          Cancelando...
                        </>
                      ) : (
                        <>
                          <i className="ri-close-line mr-2"></i>
                          Cancelar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <i className="ri-vip-crown-line text-6xl text-slate-600 mb-4"></i>
                  <h3 className="text-xl font-bold text-white mb-2">Sin Suscripción Activa</h3>
                  <p className="text-slate-400 mb-6">Elige un plan para acceder a todas las funciones premium</p>
                  <button
                    onClick={handleUpgradePlan}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-3 px-8 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-star-line mr-2"></i>
                    Ver Planes
                  </button>
                </div>
              )}
            </div>

            {/* Usage Stats */}
            <div className="bg-slate-800/50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Uso del Mes Actual</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <i className="ri-music-2-line text-2xl text-cyan-400"></i>
                    <div>
                      <div className="text-2xl font-bold text-white">24</div>
                      <div className="text-slate-400 text-sm">Mezclas creadas</div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2">
                    <div className="bg-cyan-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>

                <div className="bg-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <i className="ri-coin-line text-2xl text-yellow-400"></i>
                    <div>
                      <div className="text-2xl font-bold text-white">{user.credits.toLocaleString()}</div>
                      <div className="text-slate-400 text-sm">Créditos restantes</div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>

                <div className="bg-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <i className="ri-download-line text-2xl text-green-400"></i>
                    <div>
                      <div className="text-2xl font-bold text-white">18</div>
                      <div className="text-slate-400 text-sm">Exportaciones</div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="space-y-6">
            {/* Payment Methods */}
            <div className="bg-slate-800/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Métodos de Pago</h2>
                <button
                  onClick={() => setShowAddPayment(true)}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-2 px-4 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-add-line mr-2"></i>
                  Agregar Método
                </button>
              </div>

              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="bg-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <i className={`${getCardIcon(method.type)} text-2xl text-slate-300`}></i>
                      <div>
                        <div className="text-white font-medium">
                          •••• •••• •••• {method.last4}
                        </div>
                        <div className="text-slate-400 text-sm">
                          Expira {method.expiryDate}
                        </div>
                      </div>
                      {method.isDefault && (
                        <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-medium">
                          Predeterminado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded-lg transition-colors cursor-pointer">
                        <i className="ri-edit-line w-4 h-4 flex items-center justify-center"></i>
                      </button>
                      <button className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer">
                        <i className="ri-delete-bin-line w-4 h-4 flex items-center justify-center"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Billing Address */}
            <div className="bg-slate-800/50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Dirección de Facturación</h2>
              
              <div className="bg-slate-700/50 rounded-xl p-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-white font-medium">{user.firstName} {user.lastName}</div>
                    <div className="text-slate-400">123 Calle Principal</div>
                    <div className="text-slate-400">Ciudad, Estado 12345</div>
                    <div className="text-slate-400">{user.country}</div>
                  </div>
                  <div className="flex justify-end">
                    <button className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer">
                      <i className="ri-edit-line mr-2"></i>
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Billing History */}
            <div className="bg-slate-800/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Historial de Facturación</h2>
                <button className="bg-slate-600 hover:bg-slate-500 text-white py-2 px-4 rounded-xl font-medium transition-colors whitespace-nowrap cursor-pointer">
                  <i className="ri-download-line mr-2"></i>
                  Exportar
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Fecha</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Plan</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Monto</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Estado</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-medium">Factura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((item) => (
                      <tr key={item.id} className="border-b border-slate-700/50">
                        <td className="py-4 px-4 text-white">
                          {new Date(item.date).toLocaleDateString('es-ES')}
                        </td>
                        <td className="py-4 px-4 text-slate-300">{item.plan}</td>
                        <td className="py-4 px-4 text-white font-semibold">${item.amount}</td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status)}`}>
                            {getStatusText(item.status)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <button className="text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer">
                            <i className="ri-download-line mr-1"></i>
                            {item.invoice}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <i className="ri-money-dollar-circle-line text-2xl text-green-400"></i>
                  <div>
                    <div className="text-2xl font-bold text-white">$23.97</div>
                    <div className="text-slate-400 text-sm">Total pagado</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <i className="ri-calendar-line text-2xl text-cyan-400"></i>
                  <div>
                    <div className="text-2xl font-bold text-white">3</div>
                    <div className="text-slate-400 text-sm">Meses activo</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <i className="ri-receipt-line text-2xl text-yellow-400"></i>
                  <div>
                    <div className="text-2xl font-bold text-white">3</div>
                    <div className="text-slate-400 text-sm">Facturas</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Payment Method Modal */}
        {showAddPayment && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Agregar Método de Pago</h3>
                <button
                  onClick={() => setShowAddPayment(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="ri-close-line w-5 h-5 flex items-center justify-center"></i>
                </button>
              </div>

              <form className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-2">Número de Tarjeta</label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-2">Fecha de Expiración</label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-2">CVV</label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-2">Nombre en la Tarjeta</label>
                  <input
                    type="text"
                    placeholder="Juan Pérez"
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="default" className="rounded" />
                  <label htmlFor="default" className="text-slate-300 text-sm">
                    Establecer como método de pago predeterminado
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddPayment(false)}
                    className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-3 px-4 rounded-xl font-semibold transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-3 px-4 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer"
                  >
                    Agregar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingPage;