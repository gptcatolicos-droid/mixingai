
import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header Navigation */}
      <div className="bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-4">
              <img 
                src="https://static.readdy.ai/image/b1eac48ec385ead8debde409294ee615/609f268732409aa5f9e36b8cf47e9d62.png" 
                alt="MixingMusic.ai" 
                className="object-contain"
                style={{ width: '200px', height: '42.7px' }}
              />
              <div>
                <h1 className="text-2xl font-bold text-white" style={{ fontFamily: '"Pacifico", serif' }}>
                  mixingmusic.ai
                </h1>
                <p className="text-blue-200 text-sm">Studio Pro</p>
              </div>
            </Link>
            <Link 
              to="/"
              className="text-slate-300 hover:text-white px-6 py-3 rounded-xl font-semibold transition-all border border-slate-600/50 hover:bg-slate-700/50"
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Política de Privacidad
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            En MixingMusic.ai, protegemos tu privacidad y nos comprometemos a manejar tus datos personales de forma segura y transparente.
          </p>
          <div className="mt-8 bg-green-50 border-l-4 border-green-500 p-6 rounded-r-xl">
            <p className="text-green-800 font-semibold">
              <i className="ri-shield-check-line mr-2"></i>
              Última actualización: 15 de enero de 2024
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-information-line text-blue-600 mr-3"></i>
              1. Información que Recopilamos
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <i className="ri-user-line text-purple-500 mr-2"></i>
                  Datos Personales
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Nombre y apellido</li>
                  <li>• Dirección de correo electrónico</li>
                  <li>• País de residencia</li>
                  <li>• Información de pago (procesada por Stripe)</li>
                  <li>• Preferencias de usuario</li>
                </ul>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <i className="ri-music-2-line text-green-500 mr-2"></i>
                  Datos de Uso
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Archivos de audio subidos</li>
                  <li>• Historial de mezclas</li>
                  <li>• Configuraciones de proyecto</li>
                  <li>• Estadísticas de uso</li>
                  <li>• Logs técnicos</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-settings-3-line text-orange-600 mr-3"></i>
              2. Cómo Utilizamos tu Información
            </h2>
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Procesamiento de Audio</h3>
                <p className="text-gray-700 leading-relaxed">
                  Utilizamos tus archivos de audio exclusivamente para proporcionar servicios de mezcla con IA. 
                  Los archivos se procesan en servidores seguros y se eliminan automáticamente después de 30 días 
                  de la última actividad en tu proyecto.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Mejora del Servicio</h3>
                <p className="text-gray-700 leading-relaxed">
                  Analizamos datos de uso agregados y anónimos para mejorar nuestros algoritmos de IA, 
                  optimizar el rendimiento y desarrollar nuevas funcionalidades que beneficien a todos los usuarios.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Comunicación</h3>
                <p className="text-gray-700 leading-relaxed">
                  Te contactaremos únicamente para notificaciones importantes del servicio, actualizaciones de seguridad, 
                  y comunicaciones relacionadas con tu cuenta. Puedes optar por no recibir emails promocionales.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-shield-check-line text-green-600 mr-3"></i>
              3. Protección de Datos
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                    <i className="ri-lock-line text-blue-500 mr-2"></i>
                    Encriptación
                  </h4>
                  <p className="text-gray-700 text-sm">
                    Todos los datos se encriptan en tránsito (TLS 1.3) y en reposo (AES-256).
                  </p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                    <i className="ri-server-line text-purple-500 mr-2"></i>
                    Servidores Seguros
                  </h4>
                  <p className="text-gray-700 text-sm">
                    Infraestructura hospedada en centros de datos certificados ISO 27001.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                    <i className="ri-team-line text-orange-500 mr-2"></i>
                    Acceso Limitado
                  </h4>
                  <p className="text-gray-700 text-sm">
                    Solo personal autorizado con autenticación multifactor puede acceder a los datos.
                  </p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                    <i className="ri-history-line text-red-500 mr-2"></i>
                    Retención Limitada
                  </h4>
                  <p className="text-gray-700 text-sm">
                    Los archivos de audio se eliminan automáticamente después de 30 días de inactividad.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-share-line text-purple-600 mr-3"></i>
              4. Compartir Información
            </h2>
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-red-800 mb-3 flex items-center">
                <i className="ri-forbid-line mr-2"></i>
                Lo que NO hacemos
              </h3>
              <ul className="space-y-2 text-red-700">
                <li>• No vendemos tus datos personales a terceros</li>
                <li>• No compartimos tu música con otras personas</li>
                <li>• No utilizamos tu contenido para entrenar IA comercial</li>
                <li>• No enviamos spam ni emails no solicitados</li>
              </ul>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-xl font-bold text-blue-800 mb-3 flex items-center">
                <i className="ri-check-line mr-2"></i>
                Cuando compartimos
              </h3>
              <ul className="space-y-2 text-blue-700">
                <li>• Con procesadores de pago (Stripe) para transacciones seguras</li>
                <li>• Con proveedores de infraestructura bajo estrictos contratos de confidencialidad</li>
                <li>• Cuando sea requerido por ley o autoridades competentes</li>
                <li>• Con tu consentimiento explícito para casos específicos</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-user-settings-line text-cyan-600 mr-3"></i>
              5. Tus Derechos
            </h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Bajo el RGPD y otras regulaciones de privacidad, tienes derecho a:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                  <i className="ri-eye-line text-blue-500 mr-2"></i>
                  Acceso
                </h4>
                <p className="text-gray-700 text-sm">
                  Solicitar una copia de todos los datos personales que tenemos sobre ti.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                  <i className="ri-edit-line text-green-500 mr-2"></i>
                  Rectificación
                </h4>
                <p className="text-gray-700 text-sm">
                  Corregir cualquier información personal inexacta o incompleta.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                  <i className="ri-delete-bin-line text-red-500 mr-2"></i>
                  Eliminación
                </h4>
                <p className="text-gray-700 text-sm">
                  Solicitar la eliminación de tus datos personales en ciertas circunstancias.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                  <i className="ri-download-line text-purple-500 mr-2"></i>
                  Portabilidad
                </h4>
                <p className="text-gray-700 text-sm">
                  Recibir tus datos en un formato estructurado y legible por máquina.
                </p>
              </div>
            </div>
            <div className="mt-6 bg-cyan-50 border border-cyan-200 rounded-xl p-4">
              <p className="text-cyan-800 font-semibold">
                <i className="ri-mail-line mr-2"></i>
                Para ejercer estos derechos, contáctanos en: privacy@mixingmusic.ai
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-cookie-line text-yellow-600 mr-3"></i>
              6. Cookies y Tecnologías Similares
            </h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Utilizamos cookies y tecnologías similares para mejorar tu experiencia. Para más detalles, 
              consulta nuestra <Link to="/cookies" className="text-blue-600 hover:text-blue-800 font-semibold">Política de Cookies</Link>.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                <i className="ri-settings-3-line text-gray-600 text-2xl mb-2"></i>
                <h4 className="font-bold text-gray-900 mb-1">Funcionales</h4>
                <p className="text-gray-700 text-xs">Necesarias para el funcionamiento</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                <i className="ri-bar-chart-line text-blue-600 text-2xl mb-2"></i>
                <h4 className="font-bold text-gray-900 mb-1">Analíticas</h4>
                <p className="text-gray-700 text-xs">Para mejorar el servicio</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                <i className="ri-user-heart-line text-purple-600 text-2xl mb-2"></i>
                <h4 className="font-bold text-gray-900 mb-1">Preferencias</h4>
                <p className="text-gray-700 text-xs">Recordar tus configuraciones</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-global-line text-green-600 mr-3"></i>
              7. Transferencias Internacionales
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Tus datos pueden ser procesados en servidores ubicados fuera de tu país de residencia. 
              Aseguramos que estas transferencias cumplan con los estándares de protección adecuados:
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                  <i className="ri-shield-check-line text-green-500 mr-2"></i>
                  Salvaguardas
                </h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• Cláusulas contractuales estándar</li>
                  <li>• Certificaciones de adequacy</li>
                  <li>• Medidas técnicas y organizativas</li>
                </ul>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                  <i className="ri-map-pin-line text-blue-500 mr-2"></i>
                  Ubicaciones
                </h4>
                <ul className="text-gray-700 text-sm space-y-1">
                  <li>• Servidores principales: UE y EE.UU.</li>
                  <li>• Respaldos: Regiones certificadas</li>
                  <li>• CDN: Red global segura</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-refresh-line text-blue-600 mr-3"></i>
              8. Actualizaciones de la Política
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Podemos actualizar esta Política de Privacidad ocasionalmente para reflejar cambios en nuestras 
              prácticas o por otras razones operativas, legales o regulatorias.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h4 className="font-bold text-blue-800 mb-3">Te notificaremos sobre cambios importantes:</h4>
              <ul className="space-y-2 text-blue-700">
                <li>• Email a tu dirección registrada</li>
                <li>• Aviso en la plataforma al iniciar sesión</li>
                <li>• Actualización de la fecha en esta página</li>
              </ul>
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <i className="ri-customer-service-line text-cyan-400 mr-3"></i>
              9. Contacto y Preguntas
            </h2>
            <p className="text-slate-300 leading-relaxed mb-6">
              Si tienes preguntas sobre esta Política de Privacidad o cómo manejamos tus datos personales, 
              no dudes en contactarnos:
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <i className="ri-mail-line text-cyan-400"></i>
                  <span className="font-semibold">Email de Privacidad</span>
                </div>
                <p className="text-slate-300">privacy@mixingmusic.ai</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <i className="ri-time-line text-cyan-400"></i>
                  <span className="font-semibold">Tiempo de Respuesta</span>
                </div>
                <p className="text-slate-300">Máximo 72 horas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-4 mb-4">
                <img 
                  src="https://static.readdy.ai/image/b1eac48ec385ead8debde409294ee615/609f268732409aa5f9e36b8cf47e9d62.png" 
                  alt="MixingMusic.ai" 
                  className="object-contain"
                  style={{ width: '200px', height: '42.7px' }}
                />
              </div>
              <p className="text-slate-400">
                Tu privacidad es nuestra prioridad. Protegemos tus datos con los más altos estándares de seguridad.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/terms" className="hover:text-white">Términos de Servicio</Link></li>
                <li><Link to="/privacy" className="hover:text-white text-white">Política de Privacidad</Link></li>
                <li><Link to="/cookies" className="hover:text-white">Política de Cookies</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Enlaces</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/" className="hover:text-white">Inicio</Link></li>
                <li><a href="https://readdy.ai/?origin=logo" className="hover:text-white">Make with Readdy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 text-center text-slate-400">
            <p>© 2024 MixingMusic.ai. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPage;
