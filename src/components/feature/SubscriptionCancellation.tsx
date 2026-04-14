
import React, { useState } from 'react';
import Button from '../base/Button';
import Modal from '../base/Modal';

interface SubscriptionCancellationProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionId?: string;
  onCreditsUpdate: (newCredits: number) => void;
}

export default function SubscriptionCancellation({ 
  isOpen, 
  onClose, 
  subscriptionId,
  onCreditsUpdate 
}: SubscriptionCancellationProps) {
  const [step, setStep] = useState<'reason' | 'offer' | 'processing' | 'success'>('reason');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customReason, setCustomReason] = useState('');

  const reasons = [
    { id: 'expensive', label: 'Es muy caro para mí', icon: 'ri-money-dollar-circle-line' },
    { id: 'features', label: 'No uso suficientes funciones', icon: 'ri-function-line' },
    { id: 'quality', label: 'La calidad no cumple expectativas', icon: 'ri-star-line' },
    { id: 'complexity', label: 'Es muy complicado de usar', icon: 'ri-question-line' },
    { id: 'temporary', label: 'Solo lo necesitaba temporalmente', icon: 'ri-time-line' },
    { id: 'alternative', label: 'Encontré una mejor alternativa', icon: 'ri-arrow-left-right-line' },
    { id: 'other', label: 'Otro motivo', icon: 'ri-more-line' }
  ];

  const handleReasonSubmit = async () => {
    if (!reason) return;

    setIsLoading(true);
    
    try {
      const user = JSON.parse(localStorage.getItem('audioMixerUser') || '{}');
      const finalReason = reason === 'other' ? customReason : reasons.find(r => r.id === reason)?.label;

      const response = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'request_cancellation',
          subscriptionId: subscriptionId,
          reason: finalReason
        })
      });

      if (response.ok) {
        setStep('offer');
      } else {
        throw new Error('Error procesando cancelación');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error procesando tu solicitud. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptCredits = async () => {
    setIsLoading(true);
    setStep('processing');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'accept_credits'
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Actualizar créditos del usuario
        const user = JSON.parse(localStorage.getItem('audioMixerUser') || '{}');
        const newCredits = user.credits + 500;
        const updatedUser = { ...user, credits: newCredits };
        localStorage.setItem('audioMixerUser', JSON.stringify(updatedUser));
        
        onCreditsUpdate(newCredits);
        setStep('success');
      } else {
        throw new Error(data.error || 'Error procesando cancelación');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error procesando tu solicitud. Inténtalo de nuevo.');
      setStep('offer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCancellation = async () => {
    setIsLoading(true);
    setStep('processing');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'confirm_cancellation'
        })
      });

      if (response.ok) {
        setStep('success');
      } else {
        throw new Error('Error procesando cancelación');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error procesando tu solicitud. Inténtalo de nuevo.');
      setStep('offer');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep('reason');
    setReason('');
    setCustomReason('');
    setIsLoading(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="">
      <div className="p-6">
        
        {step === 'reason' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <i className="ri-emotion-sad-line text-white text-2xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Antes de cancelar...</h3>
              <p className="text-slate-400">¿Podrías decirnos por qué quieres cancelar tu suscripción?</p>
            </div>

            <div className="space-y-3 mb-6">
              {reasons.map((reasonOption) => (
                <button
                  key={reasonOption.id}
                  onClick={() => setReason(reasonOption.id)}
                  className={`w-full p-4 rounded-xl text-left transition-all border ${
                    reason === reasonOption.id
                      ? 'bg-magenta-500/20 border-magenta-500/50 text-white'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <i className={`${reasonOption.icon} text-xl`}></i>
                    <span>{reasonOption.label}</span>
                  </div>
                </button>
              ))}
            </div>

            {reason === 'other' && (
              <div className="mb-6">
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Cuéntanos tu motivo..."
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-magenta-500/50 resize-none"
                  rows={3}
                />
              </div>
            )}

            <div className="flex space-x-4">
              <Button
                variant="ghost"
                onClick={resetAndClose}
                className="flex-1 border-slate-600/50 text-slate-400 hover:text-white"
              >
                Mantener Suscripción
              </Button>
              <Button
                onClick={handleReasonSubmit}
                disabled={!reason || (reason === 'other' && !customReason.trim()) || isLoading}
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white border-0"
              >
                {isLoading ? 'Procesando...' : 'Continuar'}
              </Button>
            </div>
          </div>
        )}

        {step === 'offer' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-3xl flex items-center justify-center shadow-lg">
                <i className="ri-gift-line text-white text-3xl"></i>
              </div>
              <h3 className="text-3xl font-bold text-white mb-2">¡Espera! 🎁</h3>
              <p className="text-slate-300 text-lg">Tenemos una oferta especial para ti</p>
            </div>

            <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-6 mb-6">
              <div className="text-center">
                <div className="text-6xl font-bold text-emerald-400 mb-2">500</div>
                <div className="text-xl font-semibold text-white mb-3">Créditos Gratis</div>
                <div className="text-slate-300 text-sm space-y-1">
                  <p>• Suficiente para 1 mezcla completa</p>
                  <p>• Todas las funciones de IA incluidas</p>
                  <p>• Sin suscripción, sin compromisos</p>
                  <p>• Válidos por tiempo ilimitado</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-start space-x-3">
                <i className="ri-lightbulb-line text-yellow-400 text-xl mt-1"></i>
                <div>
                  <p className="text-yellow-200 text-sm">
                    <strong>¿Sabías que?</strong> Muchos usuarios regresan después de probar nuestros créditos gratuitos. 
                    Esta es tu oportunidad de seguir disfrutando MixingMusic.ai sin costo adicional.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button
                onClick={handleConfirmCancellation}
                variant="ghost"
                disabled={isLoading}
                className="flex-1 border-slate-600/50 text-slate-400 hover:text-white"
              >
                No, Cancelar Definitivamente
              </Button>
              <Button
                onClick={handleAcceptCredits}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0 font-semibold"
              >
                {isLoading ? 'Procesando...' : '¡Sí, Quiero los Créditos! 🎉'}
              </Button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center">
              <i className="ri-loader-4-line text-white text-2xl animate-spin"></i>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Procesando...</h3>
            <p className="text-slate-400">Por favor espera mientras procesamos tu solicitud</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-3xl flex items-center justify-center shadow-lg">
              <i className="ri-check-double-line text-white text-3xl"></i>
            </div>
            <h3 className="text-3xl font-bold text-white mb-4">¡Listo! 🎉</h3>
            <p className="text-slate-300 text-lg mb-6">
              Tu solicitud ha sido procesada exitosamente. 
              {reason === 'accept_credits' ? ' Plan actualizado a mezclas ilimitadas.' : ' Tu suscripción ha sido cancelada.'}
            </p>
            
            <Button
              onClick={resetAndClose}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0 py-3 font-semibold"
            >
              Entendido
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
