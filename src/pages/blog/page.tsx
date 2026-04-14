
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { blogArticles } from '../../mocks/blogArticles';

// Función para obtener últimos artículos del blog  
const getLatestBlogArticles = () => {
  return blogArticles
    .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
    .slice(0, 6); // Top 6 más recientes
};

const BlogPage: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'es'>('es');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const categories = [
    { id: 'all', name: 'All Articles', nameEs: 'Todos los Artículos' },
    { id: 'mixing', name: 'Mixing Techniques', nameEs: 'Técnicas de Mezcla' },
    { id: 'ai', name: 'AI Music Production', nameEs: 'Producción Musical con IA' },
    { id: 'tools', name: 'Music Tools', nameEs: 'Herramientas Musicales' },
    { id: 'tutorials', name: 'Tutorials', nameEs: 'Tutoriales' },
  ];

  const filteredArticles = selectedCategory === 'all' 
    ? blogArticles 
    : blogArticles.filter(article => article.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header - Similar al Home con menú desplegable móvil */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo y Título */}
            <Link to="/" className="flex items-center space-x-3 sm:space-x-4">
              <img 
                src="https://static.readdy.ai/image/b1eac48ec385ead8debde409294ee615/609f268732409aa5f9e36b8cf47e9d62.png" 
                alt="MixingMusic.ai" 
                className="object-contain w-32 h-7 sm:w-40 sm:h-8 lg:w-48 lg:h-10"
              />
              <div className="hidden sm:block">
                <h1 className="text-lg font-medium text-white">
                  mixingmusic.ai
                </h1>
                <p className="text-blue-200 text-sm">Blog</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center bg-white/10 rounded-xl p-1">
                <button
                  onClick={() => setSelectedLanguage('en')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedLanguage === 'en' 
                      ? 'bg-white text-blue-600 shadow-lg' 
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setSelectedLanguage('es')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedLanguage === 'es' 
                      ? 'bg-white text-blue-600 shadow-lg' 
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  Español
                </button>
              </div>
              <Link 
                to="/auth/register"
                className="bg-white text-purple-600 px-6 py-2 rounded-xl font-semibold hover:bg-purple-50 transition-all whitespace-nowrap"
              >
                {selectedLanguage === 'en' ? 'Mix Free with AI' : 'Mezcla Gratis con IA'}
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <i className={`ri-${mobileMenuOpen ? 'close' : 'menu-3'}-line text-xl`}></i>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-white/20 pt-4">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center bg-white/10 rounded-xl p-1">
                  <button
                    onClick={() => setSelectedLanguage('en')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedLanguage === 'en' 
                        ? 'bg-white text-blue-600 shadow-lg' 
                        : 'text-white hover:bg-white/20'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setSelectedLanguage('es')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedLanguage === 'es' 
                        ? 'bg-white text-blue-600 shadow-lg' 
                        : 'text-white hover:bg-white/20'
                    }`}
                  >
                    Español
                  </button>
                </div>
                <Link 
                  to="/auth/register"
                  className="bg-white text-purple-600 px-4 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-all text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {selectedLanguage === 'en' ? 'Mix Free with AI' : 'Mezcla Gratis con IA'}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://readdy.ai/api/search-image?query=Professional%20music%20production%20studio%20with%20mixing%20console%2C%20computer%20monitors%20displaying%20audio%20software%2C%20sound%20engineering%20workspace%2C%20modern%20recording%20equipment%2C%20professional%20audio%20mixing%20environment%2C%20digital%20audio%20workstation%2C%20music%20technology%20setup%2C%20studio%20monitors%20and%20acoustic%20treatment&width=1400&height=600&seq=blog-hero&orientation=landscape"
            alt="Professional Music Mixing Studio"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 via-blue-900/60 to-transparent"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="max-w-4xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
              {selectedLanguage === 'en' 
                ? 'Master Music Mixing with AI' 
                : 'Domina la Mezcla Musical con IA'}
            </h1>
            <p className="text-lg sm:text-xl text-blue-100 mb-6 sm:mb-8 leading-relaxed">
              {selectedLanguage === 'en'
                ? 'Learn professional mixing techniques, discover AI-powered tools, and take your music production to the next level with our comprehensive guides and tutorials.'
                : 'Aprende técnicas profesionales de mezcla, descubre herramientas impulsadas por IA, y lleva tu producción musical al siguiente nivel con nuestras guías y tutoriales completos.'}
            </p>
            
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 sm:px-4 py-2">
                <span className="text-cyan-300 font-semibold text-sm sm:text-base">
                  {selectedLanguage === 'en' ? 'Latest Articles' : 'Artículos Recientes'}
                </span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 sm:px-4 py-2">
                <span className="text-pink-300 font-semibold text-sm sm:text-base">
                  {selectedLanguage === 'en' ? 'Expert Tips' : 'Consejos de Expertos'}
                </span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 sm:px-4 py-2">
                <span className="text-yellow-300 font-semibold text-sm sm:text-base">
                  {selectedLanguage === 'en' ? 'Free Resources' : 'Recursos Gratuitos'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Filter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all text-sm sm:text-base whitespace-nowrap ${
                selectedCategory === category.id
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {selectedLanguage === 'en' ? category.name : category.nameEs}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-20">
        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6 sm:gap-8">
          {filteredArticles.map((article) => (
            <article key={article.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <div className="relative h-48 overflow-hidden">
                <img
                  src={article.image}
                  alt={selectedLanguage === 'en' ? article.title : article.titleEs}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    {selectedLanguage === 'en' ? article.categoryName : article.categoryNameEs}
                  </span>
                </div>
                <div className="absolute top-4 right-4">
                  <span className="bg-black/50 text-white px-2 py-1 rounded text-xs">
                    {article.readTime} {selectedLanguage === 'en' ? 'min read' : 'min lectura'}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                  {selectedLanguage === 'en' ? article.title : article.titleEs}
                </h2>
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {selectedLanguage === 'en' ? article.excerpt : article.excerptEs}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={article.author.avatar}
                      alt={article.author.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{article.author.name}</p>
                      <p className="text-xs text-gray-500">{article.publishDate}</p>
                    </div>
                  </div>
                  
                  <Link
                    to={`/blog/${article.slug}?lang=${selectedLanguage}`}
                    className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center space-x-1 group whitespace-nowrap"
                  >
                    <span>{selectedLanguage === 'en' ? 'Read More' : 'Leer Más'}</span>
                    <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform"></i>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            {selectedLanguage === 'en' 
              ? 'Stay Updated with Latest Music Production Tips' 
              : 'Mantente Actualizado con los Últimos Consejos de Producción Musical'}
          </h3>
          <p className="text-blue-100 mb-6 sm:mb-8 text-base sm:text-lg">
            {selectedLanguage === 'en'
              ? 'Get weekly insights, tutorials, and industry news delivered to your inbox.'
              : 'Recibe ideas semanales, tutoriales y noticias de la industria en tu bandeja de entrada.'}
          </p>
          
          <div className="flex flex-col sm:flex-row max-w-md mx-auto gap-3 sm:gap-0">
            <input
              type="email"
              placeholder={selectedLanguage === 'en' ? 'Enter your email' : 'Ingresa tu email'}
              className="flex-1 px-4 py-3 rounded-xl sm:rounded-l-xl sm:rounded-r-none border-0 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-6 py-3 rounded-xl sm:rounded-l-none sm:rounded-r-xl transition-colors whitespace-nowrap">
              {selectedLanguage === 'en' ? 'Subscribe' : 'Suscribirse'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer con Últimos Artículos */}
      <footer className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="grid md:grid-cols-4 gap-6 sm:gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <img 
                  src="https://static.readdy.ai/image/b1eac48ec385ead8debde409294ee615/609f268732409aa5f9e36b8cf47e9d62.png" 
                  alt="MixingMusic.ai" 
                  className="object-contain w-24 sm:w-32 h-5 sm:h-7"
                />
                <h3 className="text-lg font-medium text-white">
                  mixingmusic.ai
                </h3>
              </div>
              <p className="text-slate-400 mb-4 text-sm sm:text-base">
                {selectedLanguage === 'en'
                  ? 'The most advanced AI platform for professional music mixing and production.'
                  : 'La plataforma de IA más avanzada para mezcla y producción musical profesional.'}
              </p>
            </div>
            
            {/* Últimos Artículos del Blog en Footer */}
            <div>
              <h4 className="font-semibold mb-4">
                {selectedLanguage === 'en' ? 'Latest Articles' : 'Últimos Artículos'}
              </h4>
              <ul className="space-y-2 text-slate-400">
                {getLatestBlogArticles().slice(0, 5).map((article) => (
                  <li key={article.id}>
                    <Link 
                      to={`/blog/${article.slug}?lang=${selectedLanguage}`}
                      className="hover:text-white transition-colors text-sm leading-relaxed line-clamp-2"
                    >
                      {selectedLanguage === 'es' ? article.titleEs : article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">
                {selectedLanguage === 'en' ? 'Quick Links' : 'Enlaces Rápidos'}
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/" className="hover:text-white transition-colors text-sm">
                  {selectedLanguage === 'en' ? 'Home' : 'Inicio'}
                </Link></li>
                <li><Link to="/" className="hover:text-white transition-colors text-sm">
                  {selectedLanguage === 'en' ? 'Pricing' : 'Precios'}
                </Link></li>
                <li><Link to="/auth/register" className="hover:text-white transition-colors text-sm">
                  {selectedLanguage === 'en' ? 'Create Free Account' : 'Crear Cuenta Gratis'}
                </Link></li>
                <li><a href="https://readdy.ai/?origin=logo" className="hover:text-white transition-colors text-sm">
                  Made with Readdy
                </a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-6 sm:pt-8 mt-6 sm:mt-8 text-center text-slate-400">
            <p className="text-sm">&copy; 2024 MixingMusic.ai. {selectedLanguage === 'en' ? 'All rights reserved.' : 'Todos los derechos reservados.'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BlogPage;
