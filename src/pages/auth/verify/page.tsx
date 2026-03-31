
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../../components/base/Button';

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'error' | 'expired'>('success');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);

  const token = searchParams.get('token');
  const type = searchParams.get('type') || 'registration';

  useEffect(() => {
    if (!token) {
      setVerificationStatus('error');
      setMessage('Token de verificación no válido');
      setIsVerifying(false);
      return;
    }

    verifyEmail();
  }, [token, type]);

  const verifyEmail = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          token: token,
          type: type
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error.includes('expirado')) {
          setVerificationStatus('expired');
        } else {
          setVerificationStatus('error');
        }
        setMessage(data.error);
      } else {
        setVerificationStatus('success');
        setMessage(data.message);
        setUser(data.user);

        // Actualizar usuario en localStorage si existe
        const existingUser = localStorage.getItem('audioMixerUser');
        if (existingUser) {
          const userData = JSON.parse(existingUser);
          const updatedUser = {
            ...userData,
            emailVerified: true,
            credits: data.user.credits,
            needsVerification: false
          };
          localStorage.setItem('audioMixerUser', JSON.stringify(updatedUser));
        }
      }
    } catch (error) {
      console.error('Error verificando email:', error);
      setVerificationStatus('error');
      setMessage('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    // Implementar reenvío de verificación
    alert('Funcionalidad de reenvío en desarrollo');
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 shadow-2xl text-center">
          {/* Icono de verificación animado */}
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-magenta-500 to-cyan-500 rounded-3xl flex items-center justify-center shadow-lg">
            <i className="ri-loader-4-line text-white text-3xl animate-spin"></i>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4">Verificando Email...</h2>
          <p className="text-slate-300 text-lg">Por favor espera mientras confirmamos tu dirección de correo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-8 shadow-2xl text-center">
        
        {verificationStatus === 'success' && (
          <>
            {/* Icono de éxito */}
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-3xl flex items-center justify-center shadow-lg">
              <i className="ri-check-double-line text-white text-3xl"></i>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">
              {type === 'registration' ? '¡Email Verificado!' : '¡Suscripción Confirmada!'}
            </h2>
            
            <p className="text-slate-300 text-lg mb-6 leading-relaxed">
              {message}
            </p>

            {type === 'registration' && user && (
              <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <i className="ri-coin-line text-emerald-400 text-2xl"></i>
                  <h4 className="font-bold text-white text-xl">500 Créditos Añadidos</h4>
                </div>
                <p className="text-emerald-200 text-sm">
                  ¡Ya puedes comenzar a mezclar tu música con IA profesional!
                </p>
              </div>
            )}

            <div className="flex flex-col space-y-3">
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                {type === 'registration' ? 'Comenzar a Mezclar' : 'Ir al Dashboard'}
              </Button>
              
              <Link
                to="/auth/login"
                className="text-slate-400 hover:text-white transition-colors text-sm"
              >
                O inicia sesión aquí
              </Link>
            </div>
          </>
        )}

        {verificationStatus === 'error' && (
          <>
            {/* Icono de error */}
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-lg">
              <i className="ri-error-warning-line text-white text-3xl"></i>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">Error de Verificación</h2>
            
            <p className="text-red-300 text-lg mb-6 leading-relaxed">
              {message}
            </p>

            <div className="flex flex-col space-y-3">
              <Button
                onClick={handleResendVerification}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 py-3 font-semibold"
              >
                Reenviar Verificación
              </Button>
              
              <Link
                to="/auth/register"
                className="text-slate-400 hover:text-white transition-colors text-sm"
              >
                ← Volver al registro
              </Link>
            </div>
          </>
        )}

        {verificationStatus === 'expired' && (
          <>
            {/* Icono de expirado */}
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-3xl flex items-center justify-center shadow-lg">
              <i className="ri-time-line text-white text-3xl"></i>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">Enlace Expirado</h2>
            
            <p className="text-yellow-300 text-lg mb-6 leading-relaxed">
              El enlace de verificación ha expirado. Los enlaces son válidos por 24 horas por seguridad.
            </p>

            <div className="flex flex-col space-y-3">
              <Button
                onClick={handleResendVerification}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0 py-3 font-semibold"
              >
                Solicitar Nuevo Enlace
              </Button>
              
              <Link
                to="/auth/login"
                className="text-slate-400 hover:text-white transition-colors text-sm"
              >
                Ir a iniciar sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
