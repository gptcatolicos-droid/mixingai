
import React from 'react';
import { Link } from 'react-router-dom';

const TermsPage: React.FC = () => {
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
            Términos de Servicio
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Estas condiciones regulan el uso de la plataforma MixingMusic.ai y sus servicios de mezcla musical con inteligencia artificial.
          </p>
          <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl">
            <p className="text-blue-800 font-semibold">
              <i className="ri-calendar-line mr-2"></i>
              Última actualización: 15 de enero de 2024
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-information-line text-blue-600 mr-3"></i>
              1. Aceptación de los Términos
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Al acceder y utilizar MixingMusic.ai, usted acepta estar sujeto a estos Términos de Servicio y todas las leyes y regulaciones aplicables. Si no está de acuerdo con alguno de estos términos, está prohibido usar o acceder a este sitio.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Estos términos son aplicables a todos los usuarios del sitio web, incluyendo sin limitación usuarios que sean navegadores, proveedores, clientes, comerciantes, y/o contribuyentes de contenido.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-service-line text-green-600 mr-3"></i>
              2. Descripción del Servicio
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              MixingMusic.ai es una plataforma de inteligencia artificial que proporciona servicios de mezcla musical automatizada. Nuestros servicios incluyen:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <i className="ri-check-line text-green-500 mr-3 mt-1"></i>
                <span>Análisis automático de stems de audio</span>
              </li>
              <li className="flex items-start">
                <i className="ri-check-line text-green-500 mr-3 mt-1"></i>
                <span>Mezcla profesional usando algoritmos de IA</span>
              </li>
              <li className="flex items-start">
                <i className="ri-check-line text-green-500 mr-3 mt-1"></i>
                <span>Masterización adaptativa según género musical</span>
              </li>
              <li className="flex items-start">
                <i className="ri-check-line text-green-500 mr-3 mt-1"></i>
                <span>Exportación en múltiples formatos de audio</span>
              </li>
              <li className="flex items-start">
                <i className="ri-check-line text-green-500 mr-3 mt-1"></i>
                <span>Sistema de créditos para uso del servicio</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-user-line text-purple-600 mr-3"></i>
              3. Registro de Usuario
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Para utilizar nuestros servicios, debe crear una cuenta proporcionando información precisa y completa. Usted es responsable de:
            </p>
            <ul className="space-y-3 text-gray-700 mb-6">
              <li className="flex items-start">
                <i className="ri-arrow-right-s-line text-purple-500 mr-3 mt-1"></i>
                <span>Mantener la confidencialidad de su cuenta y contraseña</span>
              </li>
              <li className="flex items-start">
                <i className="ri-arrow-right-s-line text-purple-500 mr-3 mt-1"></i>
                <span>Todas las actividades que ocurran bajo su cuenta</span>
              </li>
              <li className="flex items-start">
                <i className="ri-arrow-right-s-line text-purple-500 mr-3 mt-1"></i>
                <span>Notificar inmediatamente cualquier uso no autorizado</span>
              </li>
            </ul>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-purple-800 font-semibold">
                <i className="ri-gift-line mr-2"></i>
                Al registrarse, recibirá automáticamente 1 mezcla gratis al registrarse.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-coin-line text-yellow-600 mr-3"></i>
              4. Sistema de Créditos
            </h2>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Uso de Créditos</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Mezclas básicas (1-5 stems): 100 créditos</li>
                  <li>• Mezclas ilimitadas: $3.99</li>
                  <li>• Los créditos no utilizados no expiran</li>
                  <li>• Los créditos no son reembolsables</li>
                </ul>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Recarga y Compra</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Recarga diaria automática disponible</li>
                  <li>• Paquetes de créditos adicionales</li>
                  <li>• Pagos procesados por Stripe</li>
                  <li>• Facturas disponibles automáticamente</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-copyright-line text-red-600 mr-3"></i>
              5. Propiedad Intelectual
            </h2>
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Su Contenido</h3>
                <p className="text-gray-700 leading-relaxed">
                  Usted conserva todos los derechos sobre el contenido musical que suba a nuestra plataforma. 
                  Al usar nuestros servicios, nos otorga una licencia limitada para procesar su audio 
                  únicamente con el propósito de proporcionar los servicios de mezcla.
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Nuestro Contenido</h3>
                <p className="text-gray-700 leading-relaxed">
                  Todos los algoritmos, tecnología de IA, diseño del sitio web, y otros contenidos de 
                  MixingMusic.ai están protegidos por derechos de autor y son propiedad exclusiva de la empresa.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-forbid-line text-orange-600 mr-3"></i>
              6. Uso Prohibido
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Está estrictamente prohibido usar nuestros servicios para:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <i className="ri-close-line text-red-500 mr-3 mt-1"></i>
                  <span>Contenido que infrinja derechos de autor</span>
                </li>
                <li className="flex items-start">
                  <i className="ri-close-line text-red-500 mr-3 mt-1"></i>
                  <span>Material ilegal o inapropiado</span>
                </li>
                <li className="flex items-start">
                  <i className="ri-close-line text-red-500 mr-3 mt-1"></i>
                  <span>Intentos de piratería o hacking</span>
                </li>
              </ul>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <i className="ri-close-line text-red-500 mr-3 mt-1"></i>
                  <span>Spam o contenido malicioso</span>
                </li>
                <li className="flex items-start">
                  <i className="ri-close-line text-red-500 mr-3 mt-1"></i>
                  <span>Reventa no autorizada del servicio</span>
                </li>
                <li className="flex items-start">
                  <i className="ri-close-line text-red-500 mr-3 mt-1"></i>
                  <span>Uso comercial sin licencia apropiada</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-shield-line text-blue-600 mr-3"></i>
              7. Limitación de Responsabilidad
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              MixingMusic.ai se proporciona "tal como está" sin garantías de ningún tipo. No garantizamos que:
            </p>
            <ul className="space-y-2 text-gray-700 mb-6">
              <li>• El servicio sea ininterrumpido o libre de errores</li>
              <li>• Los resultados cumplan con sus expectativas específicas</li>
              <li>• Todos los defectos serán corregidos</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-blue-800">
                En ningún caso seremos responsables por daños indirectos, incidentales, especiales o consecuentes.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
              <i className="ri-refresh-line text-green-600 mr-3"></i>
              8. Modificaciones del Servicio
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Nos reservamos el derecho de modificar, suspender o discontinuar cualquier parte del servicio 
              en cualquier momento con o sin previo aviso. También podemos actualizar estos términos 
              periódicamente, y el uso continuado del servicio constituye aceptación de los términos modificados.
            </p>
          </div>

          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <i className="ri-customer-service-line text-cyan-400 mr-3"></i>
              9. Contacto
            </h2>
            <p className="text-slate-300 leading-relaxed mb-6">
              Si tiene preguntas sobre estos Términos de Servicio, puede contactarnos a través de:
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <i className="ri-mail-line text-cyan-400"></i>
                  <span className="font-semibold">Email</span>
                </div>
                <p className="text-slate-300">hello@mixingmusic.ai</p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <i className="ri-customer-service-line text-cyan-400"></i>
                  <span className="font-semibold">Soporte</span>
                </div>
                <p className="text-slate-300">Disponible 24/7</p>
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
                La plataforma de IA más avanzada para mezclas musicales profesionales.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/terms" className="hover:text-white">Términos de Servicio</Link></li>
                <li><Link to="/privacy" className="hover:text-white">Política de Privacidad</Link></li>
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

export default TermsPage;
