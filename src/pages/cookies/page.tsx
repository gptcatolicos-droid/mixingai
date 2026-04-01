
import React from 'react';
import { Link } from 'react-router-dom';

const CookiesPage: React.FC = () => {
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
            Política de Cookies
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Información detallada sobre cómo MixingMusic.ai utiliza cookies y tecnologías similares para mejorar tu experiencia.
          </p>
          <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-xl">
            <p className="text-yellow-800 font-semibold">
              <i className="ri-cookie-line mr-2"></i>
              Última actualización: 15 de enero de 2024
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-question-line text-blue-600 mr-3"></i>
              1. ¿Qué son las Cookies?
            </h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas nuestro sitio web. 
              Nos ayudan a recordar tus preferencias, mejorar tu experiencia y analizar cómo utilizas nuestra plataforma.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center">
                  <i className="ri-computer-line text-purple-500 mr-2"></i>
                  Cookies del Navegador
                </h3>
                <p className="text-gray-700 text-sm">
                  Archivos almacenados localmente en tu navegador web que contienen información sobre tu sesión y preferencias.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center">
                  <i className="ri-storage-line text-green-500 mr-2"></i>
                  Almacenamiento Local
                </h3>
                <p className="text-gray-700 text-sm">
                  Datos guardados en tu dispositivo para recordar configuraciones y mejorar el rendimiento de la aplicación.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-list-check-line text-green-600 mr-3"></i>
              2. Tipos de Cookies que Utilizamos
            </h2>
            <div className="space-y-6">
              {/* Cookies Esenciales */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-red-800 mb-4 flex items-center">
                  <i className="ri-settings-3-line mr-3"></i>
                  Cookies Esenciales (Obligatorias)
                </h3>
                <p className="text-red-700 mb-4">
                  Estas cookies son necesarias para el funcionamiento básico del sitio web y no se pueden desactivar.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Autenticación</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Mantener tu sesión activa</li>
                      <li>• Recordar que estás logueado</li>
                      <li>• Verificar identidad</li>
                    </ul>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Seguridad</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Prevenir ataques CSRF</li>
                      <li>• Detectar actividad sospechosa</li>
                      <li>• Proteger tu cuenta</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Cookies Funcionales */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-blue-800 mb-4 flex items-center">
                  <i className="ri-function-line mr-3"></i>
                  Cookies Funcionales (Opcional)
                </h3>
                <p className="text-blue-700 mb-4">
                  Mejoran la funcionalidad del sitio web recordando tus elecciones y preferencias.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Preferencias de Usuario</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Configuraciones de mezcla preferidas</li>
                      <li>• Géneros musicales favoritos</li>
                      <li>• Idioma de la interfaz</li>
                    </ul>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Experiencia Personalizada</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Recordar proyectos recientes</li>
                      <li>• Mantener configuraciones de workspace</li>
                      <li>• Personalizar dashboard</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Cookies Analíticas */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h3 className="text-2xl font-bold text-purple-800 mb-4 flex items-center">
                  <i className="ri-bar-chart-line mr-3"></i>
                  Cookies Analíticas (Opcional)
                </h3>
                <p className="text-purple-700 mb-4">
                  Nos ayudan a entender cómo los usuarios interactúan con nuestra plataforma para mejorar el servicio.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Uso de la Plataforma</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Páginas más visitadas</li>
                      <li>• Tiempo de permanencia</li>
                      <li>• Funciones más utilizadas</li>
                    </ul>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Rendimiento</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      <li>• Velocidad de carga</li>
                      <li>• Errores técnicos</li>
                      <li>• Optimización de procesos</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-settings-4-line text-orange-600 mr-3"></i>
              3. Gestión de Cookies
            </h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Tienes control total sobre las cookies. Puedes configurar tus preferencias de las siguientes maneras:
            </p>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <i className="ri-toggle-line text-green-500 mr-2"></i>
                  Panel de Preferencias
                </h3>
                <p className="text-gray-700 mb-4 text-sm">
                  Utiliza nuestro panel de configuración de cookies para activar o desactivar categorías específicas.
                </p>
                <button className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors">
                  <i className="ri-settings-3-line mr-2"></i>
                  Configurar Cookies
                </button>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <i className="ri-global-line text-blue-500 mr-2"></i>
                  Configuración del Navegador
                </h3>
                <p className="text-gray-700 mb-4 text-sm">
                  Configura las cookies directamente desde tu navegador web para todos los sitios.
                </p>
                <div className="space-y-2 text-xs">
                  <a href="#" className="block text-blue-600 hover:text-blue-800">Chrome: Configuración de cookies</a>
                  <a href="#" className="block text-blue-600 hover:text-blue-800">Firefox: Gestión de cookies</a>
                  <a href="#" className="block text-blue-600 hover:text-blue-800">Safari: Privacidad y cookies</a>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h4 className="font-bold text-yellow-800 mb-3 flex items-center">
                <i className="ri-alert-line mr-2"></i>
                Importante sobre las Cookies Esenciales
              </h4>
              <p className="text-yellow-700 text-sm">
                Las cookies esenciales no se pueden desactivar ya que son necesarias para el funcionamiento básico 
                de la plataforma. Sin ellas, no podrías iniciar sesión, guardar proyectos o utilizar las funciones principales.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-team-line text-purple-600 mr-3"></i>
              4. Cookies de Terceros
            </h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Algunos servicios de terceros que utilizamos pueden establecer sus propias cookies:
            </p>
            
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <i className="ri-secure-payment-line text-white text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Stripe (Pagos)</h3>
                    <p className="text-gray-700 mb-3 text-sm">
                      Procesamiento seguro de pagos y prevención de fraudes.
                    </p>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Esencial</span>
                      <a href="https://stripe.com/privacy" className="text-blue-600 hover:text-blue-800">Política de Stripe</a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                    <i className="ri-bar-chart-2-line text-white text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Google Analytics (Opcional)</h3>
                    <p className="text-gray-700 mb-3 text-sm">
                      Análisis de uso del sitio web de forma anónima y agregada.
                    </p>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Analítica</span>
                      <a href="https://policies.google.com/privacy" className="text-blue-600 hover:text-blue-800">Política de Google</a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                    <i className="ri-cloud-line text-white text-xl"></i>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">CDN y Servicios de Infraestructura</h3>
                    <p className="text-gray-700 mb-3 text-sm">
                      Mejora del rendimiento y entrega de contenido.
                    </p>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">Funcional</span>
                      <span className="text-gray-500">CloudFlare, AWS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-time-line text-cyan-600 mr-3"></i>
              5. Duración de las Cookies
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <i className="ri-flashlight-line text-orange-500 mr-2"></i>
                  Cookies de Sesión
                </h3>
                <p className="text-gray-700 mb-4 text-sm">
                  Se eliminan automáticamente cuando cierras el navegador.
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Duración: Hasta cerrar navegador</li>
                  <li>• Uso: Autenticación temporal</li>
                  <li>• Almacenamiento: Memoria del navegador</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <i className="ri-save-line text-green-500 mr-2"></i>
                  Cookies Persistentes
                </h3>
                <p className="text-gray-700 mb-4 text-sm">
                  Se mantienen en tu dispositivo durante un período específico.
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Duración: 30 días a 2 años</li>
                  <li>• Uso: Preferencias y configuraciones</li>
                  <li>• Almacenamiento: Disco del dispositivo</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 bg-cyan-50 border border-cyan-200 rounded-xl p-6">
              <h4 className="font-bold text-cyan-800 mb-3">Limpieza Automática</h4>
              <p className="text-cyan-700 text-sm">
                Nuestras cookies se eliminan automáticamente al expirar. También puedes limpiarlas manualmente 
                desde la configuración de tu navegador en cualquier momento.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-shield-check-line text-green-600 mr-3"></i>
              6. Seguridad y Privacidad
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <i className="ri-lock-line text-red-500 mr-2"></i>
                  Protección de Datos
                </h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>• Las cookies están encriptadas</li>
                  <li>• No contienen información personal sensible</li>
                  <li>• Transmisión segura (HTTPS)</li>
                  <li>• Acceso restringido y controlado</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <i className="ri-eye-off-line text-blue-500 mr-2"></i>
                  Anonimización
                </h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>• Datos analíticos agregados y anónimos</li>
                  <li>• Sin rastreo entre sitios web</li>
                  <li>• Identificadores únicos sin vinculación personal</li>
                  <li>• Cumplimiento con RGPD y CCPA</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-refresh-line text-blue-600 mr-3"></i>
              7. Cambios en esta Política
            </h2>
            <p className="text-gray-700 leading-relaxed mb-6">
              Podemos actualizar esta Política de Cookies para reflejar cambios en nuestro uso de cookies 
              o por razones legales y operativas.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h4 className="font-bold text-blue-800 mb-3">Te notificaremos sobre cambios importantes:</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <ul className="space-y-2 text-blue-700 text-sm">
                  <li>• Banner de notificación en el sitio</li>
                  <li>• Email a usuarios registrados</li>
                </ul>
                <ul className="space-y-2 text-blue-700 text-sm">
                  <li>• Actualización de fecha en esta página</li>
                  <li>• Posibilidad de revisar configuración</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <i className="ri-customer-service-line text-cyan-400 mr-3"></i>
              8. Preguntas y Contacto
            </h2>
            <p className="text-slate-300 leading-relaxed mb-6">
              Si tienes preguntas sobre nuestra Política de Cookies o deseas ejercer tus derechos, 
              estamos aquí para ayudarte:
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <i className="ri-mail-line text-cyan-400"></i>
                  <span className="font-semibold">Email Especializado</span>
                </div>
                <p className="text-slate-300">cookies@mixingmusic.ai</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <i className="ri-settings-3-line text-cyan-400"></i>
                  <span className="font-semibold">Panel de Control</span>
                </div>
                <p className="text-slate-300">Configuración → Privacidad → Cookies</p>
              </div>
            </div>

            <div className="mt-8 bg-slate-800/50 rounded-xl p-6">
              <h4 className="font-bold text-white mb-4 flex items-center">
                <i className="ri-tools-line text-yellow-400 mr-2"></i>
                Herramientas Útiles
              </h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h5 className="font-semibold text-cyan-400 mb-2">Gestión de Cookies</h5>
                  <ul className="text-slate-300 space-y-1">
                    <li>• Panel de preferencias</li>
                    <li>• Configuración del navegador</li>
                    <li>• Limpieza manual</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-green-400 mb-2">Información Adicional</h5>
                  <ul className="text-slate-300 space-y-1">
                    <li>• Guías de configuración</li>
                    <li>• FAQ sobre cookies</li>
                    <li>• Soporte técnico</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-purple-400 mb-2">Privacidad</h5>
                  <ul className="text-slate-300 space-y-1">
                    <li>• Política de privacidad</li>
                    <li>• Derechos del usuario</li>
                    <li>• Solicitudes RGPD</li>
                  </ul>
                </div>
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
                Transparencia total en el uso de cookies. Tu privacidad es nuestra prioridad.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/terms" className="hover:text-white">Términos de Servicio</Link></li>
                <li><Link to="/privacy" className="hover:text-white">Política de Privacidad</Link></li>
                <li><Link to="/cookies" className="hover:text-white text-white">Política de Cookies</Link></li>
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

export default CookiesPage;
