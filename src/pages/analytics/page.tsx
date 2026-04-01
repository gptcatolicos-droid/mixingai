
import { useState, useEffect } from 'react';
import { useNavigate as useRouterNavigate } from 'react-router-dom';
import Button from '../../components/base/Button';
import Header from '../../components/feature/Header';

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
}

interface AnalyticsData {
  totalMixes: number;
  favoriteGenre: string;
  totalCreditsUsed: number;
  avgMixTime: number;
  mixesThisMonth: number;
  totalProjects: number;
  completionRate: number;
  topGenres: Array<{ genre: string; count: number; percentage: number }>;
  mixHistory: Array<{
    date: string;
    mixName: string;
    genre: string;
    creditsUsed: number;
    status: 'completed' | 'failed';
  }>;
  monthlyStats: Array<{
    month: string;
    mixes: number;
    credits: number;
  }>;
}

export default function AnalyticsPage() {
  const navigate = useRouterNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalMixes: 47,
    favoriteGenre: 'Reggaeton',
    totalCreditsUsed: 12500,
    avgMixTime: 285, // seconds
    mixesThisMonth: 12,
    totalProjects: 23,
    completionRate: 94.5,
    topGenres: [
      { genre: 'Reggaeton', count: 18, percentage: 38 },
      { genre: 'Pop', count: 12, percentage: 26 },
      { genre: 'EDM', count: 8, percentage: 17 },
      { genre: 'Hip-Hop', count: 6, percentage: 13 },
      { genre: 'Rock', count: 3, percentage: 6 }
    ],
    mixHistory: [
      { date: '2024-01-20', mixName: 'Summer Vibes', genre: 'Reggaeton', creditsUsed: 500, status: 'completed' },
      { date: '2024-01-19', mixName: 'Night Drive', genre: 'Pop', creditsUsed: 100, status: 'completed' },
      { date: '2024-01-18', mixName: 'Bass Drop', genre: 'EDM', creditsUsed: 500, status: 'completed' },
      { date: '2024-01-17', mixName: 'Acoustic Soul', genre: 'Acoustic', creditsUsed: 100, status: 'failed' },
      { date: '2024-01-16', mixName: 'Trap Beats', genre: 'Hip-Hop', creditsUsed: 500, status: 'completed' }
    ],
    monthlyStats: [
      { month: 'Oct', mixes: 15, credits: 3500 },
      { month: 'Nov', mixes: 20, credits: 4200 },
      { month: 'Dic', mixes: 25, credits: 5800 },
      { month: 'Ene', mixes: 12, credits: 2900 }
    ]
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('audioMixerUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        // If parsing fails, clear corrupted data and redirect
        console.error('Failed to parse user data from localStorage:', error);
        localStorage.removeItem('audioMixerUser');
        navigate('/');
      }
    } else {
      navigate('/');
    }
  }, [navigate]);

  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    localStorage.setItem('audioMixerUser', JSON.stringify(userData));
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  };

  if (!user) {
    // Render nothing while redirecting
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Header
        user={user}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
        onCreditsUpdate={handleCreditsUpdate}
      />

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: '"Inter", sans-serif', fontWeight: '800' }}>
              Analytics
            </h1>
            <p className="text-slate-400 text-lg">
              Analiza tu progreso y descubre patrones en tu producción musical
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white pr-8"
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 90 días</option>
              <option value="1y">Último año</option>
            </select>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="text-slate-300 hover:text-white hover:bg-slate-700/50 border-slate-600/50"
            >
              <i className="ri-arrow-left-line mr-2 w-4 h-4 flex items-center justify-center"></i>
              Volver
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-magenta-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center">
                <i className="ri-music-2-line text-magenta-400 text-xl"></i>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">{analytics.totalMixes}</p>
                <p className="text-slate-400 text-sm">Mezclas Totales</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-emerald-400 text-sm font-medium">+{analytics.mixesThisMonth}</span>
              <span className="text-slate-400 text-sm">este mes</span>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
                <i className="ri-coin-line text-cyan-400 text-xl"></i>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">{analytics.totalCreditsUsed.toLocaleString()}</p>
                <p className="text-slate-400 text-sm">Créditos Usados</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-cyan-400 text-sm font-medium">{Math.round(analytics.totalCreditsUsed / analytics.totalMixes)}</span>
              <span className="text-slate-400 text-sm">promedio por mezcla</span>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl flex items-center justify-center">
                <i className="ri-time-line text-yellow-400 text-xl"></i>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">{formatTime(analytics.avgMixTime)}</p>
                <p className="text-slate-400 text-sm">Tiempo Promedio</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-emerald-400 text-sm font-medium">-15%</span>
              <span className="text-slate-400 text-sm">vs mes anterior</span>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center">
                <i className="ri-checkbox-circle-line text-emerald-400 text-xl"></i>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">{analytics.completionRate}%</p>
                <p className="text-slate-400 text-sm">Tasa de Éxito</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-emerald-400 text-sm font-medium">Excelente</span>
              <span className="text-slate-400 text-sm">rendimiento</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Top Genres */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Géneros Favoritos</h3>
              <div className="text-slate-400 text-sm">
                Tu género #1: <span className="text-magenta-400 font-semibold">{analytics.favoriteGenre}</span>
              </div>
            </div>

            <div className="space-y-4">
              {analytics.topGenres.map((genre, index) => (
                <div key={genre.genre} className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-magenta-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium">{genre.genre}</span>
                      <span className="text-slate-400 text-sm">{genre.count} mezclas</span>
                    </div>
                    <div className="bg-slate-700/50 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-magenta-500 to-cyan-500 h-full rounded-full transition-all"
                        style={{ width: `${genre.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-cyan-400 font-semibold text-sm w-12 text-right">
                    {genre.percentage}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Progress */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Progreso Mensual</h3>

            <div className="space-y-4">
              {analytics.monthlyStats.map((stat) => (
                <div key={stat.month} className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl">
                  <div>
                    <p className="text-white font-semibold">{stat.month}</p>
                    <p className="text-slate-400 text-sm">{stat.mixes} mezclas</p>
                  </div>
                  <div className="text-right">
                    <p className="text-cyan-400 font-bold">{stat.credits.toLocaleString()}</p>
                    <p className="text-slate-400 text-sm">créditos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Historial de Mezclas</h3>
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-slate-700/50 border-slate-600/50"
            >
              Ver Todo
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Proyecto</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Género</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Créditos</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {analytics.mixHistory.map((mix, index) => (
                  <tr key={index} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                    <td className="px-4 py-3 text-slate-300 text-sm">{formatDate(mix.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-magenta-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center">
                          <i className="ri-music-2-line text-magenta-400 text-sm"></i>
                        </div>
                        <span className="text-white font-medium">{mix.mixName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-700/50 text-slate-300 px-2 py-1 rounded text-xs">
                        {mix.genre}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-cyan-400 font-semibold">{mix.creditsUsed}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                          mix.status === 'completed' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                        }`}
                      >
                        <i className={`${mix.status === 'completed' ? 'ri-check-line' : 'ri-close-line'} mr-1`}></i>
                        {mix.status === 'completed' ? 'Completada' : 'Falló'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-r from-magenta-500/10 to-cyan-500/10 border border-magenta-500/20 rounded-2xl p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-magenta-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="ri-lightbulb-line text-magenta-400 text-xl"></i>
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-2">Insight de Productividad</h4>
                <p className="text-slate-300 text-sm mb-3">
                  Tu productividad ha aumentado un 23% este mes. Los {analytics.favoriteGenre.toLowerCase()} son tu fuerte,
                  considera explorar géneros similares como Trap o Latin para expandir tu repertorio.
                </p>
                <Button
                  size="sm"
                  className="bg-magenta-500/20 text-magenta-300 border-magenta-500/30 hover:bg-magenta-500/30"
                >
                  Explorar Géneros
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-2xl p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className="ri-trophy-line text-cyan-400 text-xl"></i>
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-2">Logro Desbloqueado</h4>
                <p className="text-slate-300 text-sm mb-3">
                  ¡Felicidades! Has completado {analytics.totalMixes} mezclas con una tasa de éxito del{' '}
                  {analytics.completionRate}%.
                  Estás en el top 10% de usuarios más productivos.
                </p>
                <Button
                  size="sm"
                  className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/30"
                >
                  Ver Logros
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
