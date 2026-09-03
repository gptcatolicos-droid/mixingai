import type React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { blogArticles } from '../../../mocks/blogArticles';
import ArticleComparison from './ArticleComparison';
import NotFound from '../../NotFound';

const BlogArticlePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const selectedLanguage = pathname.startsWith('/en/') ? 'en' : 'es';
  const blogPath = selectedLanguage === 'en' ? '/en/blog' : '/blog';
  const article = blogArticles.find(a => a.slug === slug);
  if (!article) return <NotFound />;
  const handleLanguageChange = (lang: 'en' | 'es') => navigate(`${lang === 'en' ? '/en' : ''}/blog/${slug}`);
  const title = selectedLanguage === 'en' ? article.title : article.titleEs;
  const content = selectedLanguage === 'en' ? article.content : article.contentEs;
  const tags = selectedLanguage === 'en' ? article.tags : article.tagsEs;

  // The page title is the only H1. Markdown keeps real lists, tables and source links.
  const markdown = content.replace(/^# (.+)$/m, (heading, text) => text.trim() === title.trim() ? '' : heading);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700">
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
                <p className="text-2xl font-bold text-white" style={{ fontFamily: '"Pacifico", serif' }}>
                  mixingmusic.ai
                </p>
                <p className="text-blue-200 text-sm">Blog</p>
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              <Link to={blogPath} className="text-white hover:text-blue-200 transition-colors">
                <i className="ri-arrow-left-line mr-2"></i>
                {selectedLanguage === 'en' ? 'Back to Blog' : 'Volver al Blog'}
              </Link>
              
              <div className="flex items-center bg-white/10 rounded-xl p-1">
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedLanguage === 'en' 
                      ? 'bg-white text-blue-600 shadow-lg' 
                      : 'text-white hover:bg-white/20'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => handleLanguageChange('es')}
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
                className="bg-white text-purple-600 px-6 py-2 rounded-xl font-semibold hover:bg-purple-50 transition-all"
              >
                {selectedLanguage === 'en' ? 'Start Free' : 'Comenzar Gratis'}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Article Header */}
      <div className="relative bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={article.image}
            alt={title}
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 via-blue-900/60 to-transparent"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-6 py-16">
          <nav aria-label={selectedLanguage === 'en' ? 'Breadcrumb' : 'Ruta de navegación'} className="text-blue-100 mb-6 flex flex-wrap gap-2">
            <Link to="/">MixingMusic.AI</Link><span aria-hidden="true">/</span><Link to={blogPath}>Blog</Link>
          </nav>
          <div className="mb-6">
            <span className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-white font-semibold">
              {selectedLanguage === 'en' ? article.categoryName : article.categoryNameEs}
            </span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            {title}
          </h1>
          
          <div className="flex items-center space-x-6 text-blue-100 mb-8">
            <div className="flex items-center space-x-3">
              <img
                src={article.author.avatar}
                alt={article.author.name}
                className="w-12 h-12 rounded-full border-2 border-white/20"
              />
              <div>
                <p className="font-semibold text-white">{article.author.name}</p>
                <p className="text-sm">{article.publishDate}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <i className="ri-time-line mr-2"></i>
                {article.readTime} {selectedLanguage === 'en' ? 'min read' : 'min lectura'}
              </span>
            </div>
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 text-sm text-white"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-12">
          <div className="prose prose-lg max-w-none">
            <Markdown remarkPlugins={[remarkGfm]} components={{
              h1: ({ children }) => <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-10">{children}</h2>,
              h2: ({ children }) => <h2 className="text-3xl font-bold text-gray-900 mb-6 mt-10">{children}</h2>,
              h3: ({ children }) => <h3 className="text-2xl font-bold text-gray-900 mb-4 mt-8">{children}</h3>,
              h4: ({ children }) => <h4 className="text-xl font-bold text-gray-900 mb-3 mt-6">{children}</h4>,
              p: ({ children }) => <p className="text-gray-700 mb-4 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 text-gray-700 space-y-2">{children}</ol>,
              a: ({ href, children }) => <a className="text-purple-700 underline break-words" href={href?.startsWith('/blog/') ? `${selectedLanguage === 'en' ? '/en' : ''}${href}` : href}>{children}</a>,
              table: ({ children }) => <div className="overflow-x-auto my-6"><table className="w-full text-left border-collapse">{children}</table></div>,
              th: ({ children }) => <th className="p-3 border bg-slate-100">{children}</th>,
              td: ({ children }) => <td className="p-3 border text-gray-700">{children}</td>,
              img: ({ src, alt }) => <img src={src} alt={alt || ''} loading="lazy" decoding="async" />,
            }}>{markdown}</Markdown>
          </div>

          {article.showComparison !== false && <ArticleComparison english={selectedLanguage === 'en'} />}
          
          {/* Author Bio */}
          <div className="border-t border-gray-200 pt-8 mt-12">
            <div className="flex items-start space-x-4">
              <img
                src={article.author.avatar}
                alt={article.author.name}
                className="w-16 h-16 rounded-full"
              />
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-2">{article.author.name}</h4>
                <p className="text-gray-600">
                  {selectedLanguage === 'en' ? article.author.bio : article.author.bioEs}
                </p>
              </div>
            </div>
          </div>
          
          {/* Share Section */}
          <div className="border-t border-gray-200 pt-8 mt-8">
            <h4 className="text-lg font-bold text-gray-900 mb-4">
              {selectedLanguage === 'en' ? 'Share this article' : 'Comparte este artículo'}
            </h4>
            <div className="flex space-x-4">
              <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <i className="ri-twitter-line"></i>
                <span>Twitter</span>
              </button>
              <button className="flex items-center space-x-2 bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors">
                <i className="ri-facebook-line"></i>
                <span>Facebook</span>
              </button>
              <button className="flex items-center space-x-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors">
                <i className="ri-linkedin-line"></i>
                <span>LinkedIn</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Related Articles */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          {selectedLanguage === 'en' ? 'Related Articles' : 'Artículos Relacionados'}
        </h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogArticles
            .filter(a => a.id !== article.id && a.category === article.category)
            .slice(0, 3)
            .map((relatedArticle) => (
              <article key={relatedArticle.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                <div className="relative h-48 overflow-hidden">
                  <img
                    loading="lazy" decoding="async" width={640} height={360}
                    src={relatedArticle.image}
                    alt={selectedLanguage === 'en' ? relatedArticle.title : relatedArticle.titleEs}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {selectedLanguage === 'en' ? relatedArticle.categoryName : relatedArticle.categoryNameEs}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">
                    {selectedLanguage === 'en' ? relatedArticle.title : relatedArticle.titleEs}
                  </h4>
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {selectedLanguage === 'en' ? relatedArticle.excerpt : relatedArticle.excerptEs}
                  </p>
                  
                  <Link
                    to={`${blogPath}/${relatedArticle.slug}`}
                    className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center space-x-1 group"
                  >
                    <span>{selectedLanguage === 'en' ? 'Read More' : 'Leer Más'}</span>
                    <i className="ri-arrow-right-line group-hover:translate-x-1 transition-transform"></i>
                  </Link>
                </div>
              </article>
            ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            {selectedLanguage === 'en' 
              ? 'Ready to Transform Your Music?' 
              : '¿Listo para Transformar tu Música?'}
          </h3>
          <p className="text-blue-100 mb-8 text-lg">
            {selectedLanguage === 'en'
              ? 'Try our AI-powered mixing platform and get professional results in minutes.'
              : 'Prueba nuestra plataforma de mezcla con IA y obtén resultados profesionales en minutos.'}
          </p>
          
          <Link
            to="/auth/register"
            className="inline-flex items-center bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-purple-50 transition-all shadow-lg hover:shadow-xl"
          >
            <i className="ri-music-2-line mr-3"></i>
            <span>
              {selectedLanguage === 'en' ? 'Start Free — Mix with AI' : 'Comenzar Gratis — Mezcla con IA'}
            </span>
          </Link>
        </div>
      </div>

    </div>
  );
};

export default BlogArticlePage;
