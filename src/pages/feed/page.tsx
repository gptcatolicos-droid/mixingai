
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/base/Button';
import Header from '@/components/feature/Header';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  credits: number;
  username: string;
  avatar?: string;
  bio?: string;
  isPrivate: boolean;
  createdAt: string;
}

interface FeedPost {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    avatar?: string;
  };
  mix: {
    id: string;
    title: string;
    description?: string;
    genre: string;
    duration: string;
    stemsCount: number;
    waveform: number[];
  };
  likes: number;
  comments: number;
  plays: number;
  isLiked: boolean;
  createdAt: string;
}

interface Comment {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    avatar?: string;
  };
  text: string;
  createdAt: string;
}

export default function FeedPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('audioMixerUser');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setCurrentUser(userData);
      loadFeedPosts();
    } else {
      navigate('/');
    }
  }, [navigate]);

  const loadFeedPosts = () => {
    // Simulate API call to load feed posts
    const mockPosts: FeedPost[] = [
      {
        id: '1',
        user: {
          id: '2',
          firstName: 'María',
          lastName: 'González',
          username: 'maria_beats',
          avatar: 'https://readdy.ai/api/search-image?query=professional%20woman%20musician%20portrait%20with%20headphones%20in%20modern%20studio%2C%20warm%20lighting%2C%20confident%20expression%2C%20music%20producer%2C%20creative%20professional&width=60&height=60&seq=user1&orientation=squarish'
        },
        mix: {
          id: '1',
          title: 'Summer Reggaeton Mix',
          description: 'Una mezcla fresca perfecta para el verano con los mejores hits de reggaeton 🔥🎵',
          genre: 'Reggaeton',
          duration: '3:24',
          stemsCount: 8,
          waveform: Array.from({ length: 80 }, () => Math.random())
        },
        likes: 234,
        comments: 28,
        plays: 1250,
        isLiked: false,
        createdAt: '2024-01-20T10:30:00Z'
      },
      {
        id: '2',
        user: {
          id: '3',
          firstName: 'Carlos',
          lastName: 'Rodríguez',
          username: 'carlos_producer',
          avatar: 'https://readdy.ai/api/search-image?query=young%20latino%20man%20music%20producer%20in%20studio%20with%20mixing%20console%2C%20professional%20headphones%2C%20creative%20artist%2C%20urban%20style&width=60&height=60&seq=user2&orientation=squarish'
        },
        mix: {
          id: '2',
          title: 'Urban Pop Fusion',
          description: 'Fusión experimental de pop urbano con elementos electrónicos. ¿Qué opinan?',
          genre: 'Pop',
          duration: '4:12',
          stemsCount: 12,
          waveform: Array.from({ length: 80 }, () => Math.random())
        },
        likes: 189,
        comments: 15,
        plays: 892,
        isLiked: true,
        createdAt: '2024-01-19T15:45:00Z'
      },
      {
        id: '3',
        user: {
          id: '4',
          firstName: 'Ana',
          lastName: 'Torres',
          username: 'ana_soundz',
          avatar: 'https://readdy.ai/api/search-image?query=young%20woman%20DJ%20with%20colorful%20hair%20and%20headphones%2C%20creative%20music%20artist%2C%20modern%20studio%20background%2C%20vibrant%20style&width=60&height=60&seq=user3&orientation=squarish'
        },
        mix: {
          id: '3',
          title: 'Electronic Dreamscape',
          description: 'Paisaje sonoro electrónico con sintetizadores atmosféricos ✨ Perfecta para meditar o estudiar',
          genre: 'EDM',
          duration: '5:33',
          stemsCount: 10,
          waveform: Array.from({ length: 80 }, () => Math.random())
        },
        likes: 456,
        comments: 42,
        plays: 2100,
        isLiked: false,
        createdAt: '2024-01-18T08:20:00Z'
      },
      {
        id: '4',
        user: {
          id: '5',
          firstName: 'Diego',
          lastName: 'Morales',
          username: 'diego_mixer',
          avatar: 'https://readdy.ai/api/search-image?query=young%20man%20with%20beard%20music%20producer%20in%20professional%20recording%20studio%2C%20focused%20expression%2C%20modern%20equipment&width=60&height=60&seq=user4&orientation=squarish'
        },
        mix: {
          id: '4',
          title: 'Trap Experimental',
          description: 'Mi primer intento en trap experimental 🎭 Feedback bienvenido',
          genre: 'Trap',
          duration: '2:58',
          stemsCount: 6,
          waveform: Array.from({ length: 80 }, () => Math.random())
        },
        likes: 78,
        comments: 12,
        plays: 345,
        isLiked: false,
        createdAt: '2024-01-17T20:15:00Z'
      }
    ];
    
    setFeedPosts(mockPosts);
  };

  const handleLike = (postId: string) => {
    setFeedPosts(prev => prev.map(post => 
      post.id === postId 
        ? { 
            ...post, 
            isLiked: !post.isLiked, 
            likes: post.isLiked ? post.likes - 1 : post.likes + 1 
          }
        : post
    ));
  };

  const handleShowComments = (postId: string) => {
    if (showComments === postId) {
      setShowComments(null);
      return;
    }
    
    setShowComments(postId);
    // Load comments for this post
    const mockComments: Comment[] = [
      {
        id: '1',
        user: {
          id: '6',
          firstName: 'Sofía',
          lastName: 'Vega',
          username: 'sofia_music',
          avatar: 'https://readdy.ai/api/search-image?query=young%20latina%20woman%20smiling%2C%20professional%20photo%2C%20music%20enthusiast%2C%20modern%20style&width=40&height=40&seq=comment1&orientation=squarish'
        },
        text: '¡Increíble mezcla! Me encanta cómo suena el drop 🔥',
        createdAt: '2024-01-20T11:00:00Z'
      },
      {
        id: '2',
        user: {
          id: '7',
          firstName: 'Luis',
          lastName: 'Herrera',
          username: 'luis_beats',
          avatar: 'https://readdy.ai/api/search-image?query=young%20man%20with%20glasses%20music%20enthusiast%2C%20modern%20professional%20photo%2C%20creative%20artist&width=40&height=40&seq=comment2&orientation=squarish'
        },
        text: 'Técnicamente muy sólida. El balance está perfecto 👌',
        createdAt: '2024-01-20T11:30:00Z'
      }
    ];
    setComments(mockComments);
  };

  const handleAddComment = (postId: string) => {
    if (!newComment.trim() || !currentUser) return;

    const comment: Comment = {
      id: Date.now().toString(),
      user: {
        id: currentUser.id,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        username: currentUser.username || 'usuario',
        avatar: currentUser.avatar
      },
      text: newComment.trim(),
      createdAt: new Date().toISOString()
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');
    
    // Update comment count
    setFeedPosts(prev => prev.map(post => 
      post.id === postId ? { ...post, comments: post.comments + 1 } : post
    ));
  };

  const renderWaveform = (waveform: number[]) => {
    return (
      <div className="flex items-center space-x-0.5 h-12 bg-slate-900/50 rounded-lg p-2 overflow-hidden">
        {waveform.map((value, index) => (
          <div
            key={index}
            className="bg-gradient-to-t from-magenta-500 to-cyan-400 rounded-full transition-all hover:from-magenta-400 hover:to-cyan-300"
            style={{
              width: '2px',
              height: `${Math.max(2, value * 32)}px`
            }}
          />
        ))}
      </div>
    );
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'hace poco';
    if (diffInHours < 24) return `hace ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `hace ${diffInDays}d`;
  };

  if (!currentUser) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-white">Cargando...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Header user={currentUser} />
      
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Feed Musical</h1>
          <p className="text-slate-400">Descubre las últimas mezclas de la comunidad</p>
        </div>

        {/* Feed Posts */}
        <div className="space-y-6">
          {feedPosts.map((post) => (
            <div key={post.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              {/* Post Header */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-600">
                  {post.user.avatar ? (
                    <img 
                      src={post.user.avatar} 
                      alt={post.user.firstName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-magenta-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                      {post.user.firstName.charAt(0)}{post.user.lastName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">
                    {post.user.firstName} {post.user.lastName}
                  </h3>
                  <p className="text-sm text-slate-400">@{post.user.username} • {formatTimeAgo(post.createdAt)}</p>
                </div>
                <button className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center">
                  <i className="ri-more-2-line"></i>
                </button>
              </div>

              {/* Mix Info */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-white">{post.mix.title}</h2>
                  <div className="flex items-center space-x-3 text-sm text-slate-400">
                    <span className="bg-slate-700/50 px-2 py-1 rounded-lg">{post.mix.genre}</span>
                    <span>{post.mix.duration}</span>
                    <span>{post.mix.stemsCount} stems</span>
                  </div>
                </div>
                
                {post.mix.description && (
                  <p className="text-slate-300 mb-4 leading-relaxed">{post.mix.description}</p>
                )}
                
                {/* Waveform */}
                <div className="mb-4">
                  {renderWaveform(post.mix.waveform)}
                </div>
              </div>

              {/* Stats and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center space-x-2 transition-colors ${
                      post.isLiked ? 'text-red-400' : 'text-slate-400 hover:text-red-400'
                    }`}
                  >
                    <i className={`${post.isLiked ? 'ri-heart-fill' : 'ri-heart-line'} w-5 h-5 flex items-center justify-center`}></i>
                    <span className="font-medium">{post.likes}</span>
                  </button>
                  
                  <button
                    onClick={() => handleShowComments(post.id)}
                    className="flex items-center space-x-2 text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    <i className="ri-chat-1-line w-5 h-5 flex items-center justify-center"></i>
                    <span className="font-medium">{post.comments}</span>
                  </button>
                  
                  <div className="flex items-center space-x-2 text-slate-400">
                    <i className="ri-play-line w-5 h-5 flex items-center justify-center"></i>
                    <span className="font-medium">{post.plays.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button className="text-slate-400 hover:text-magenta-400 w-10 h-10 flex items-center justify-center transition-colors rounded-lg hover:bg-magenta-500/10">
                    <i className="ri-play-line text-lg"></i>
                  </button>
                  <button className="text-slate-400 hover:text-cyan-400 w-10 h-10 flex items-center justify-center transition-colors rounded-lg hover:bg-cyan-500/10">
                    <i className="ri-share-line"></i>
                  </button>
                </div>
              </div>

              {/* Comments Section */}
              {showComments === post.id && (
                <div className="mt-6 pt-6 border-t border-slate-700/50">
                  <div className="space-y-4 mb-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-600 flex-shrink-0">
                          {comment.user.avatar ? (
                            <img 
                              src={comment.user.avatar} 
                              alt={comment.user.firstName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-r from-magenta-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                              {comment.user.firstName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="bg-slate-700/50 rounded-xl px-4 py-3">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="font-semibold text-white text-sm">
                                {comment.user.firstName} {comment.user.lastName}
                              </span>
                              <span className="text-xs text-slate-400">
                                @{comment.user.username}
                              </span>
                            </div>
                            <p className="text-slate-300 text-sm">{comment.text}</p>
                          </div>
                          <span className="text-xs text-slate-500 ml-4 mt-1">
                            {formatTimeAgo(comment.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Comment */}
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-600 flex-shrink-0">
                      {currentUser.avatar ? (
                        <img 
                          src={currentUser.avatar} 
                          alt={currentUser.firstName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-r from-magenta-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xs">
                          {currentUser.firstName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex items-center space-x-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Escribe un comentario..."
                        className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-magenta-500/50"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                      />
                      <Button
                        onClick={() => handleAddComment(post.id)}
                        disabled={!newComment.trim()}
                        size="sm"
                        className={`${
                          newComment.trim()
                            ? 'bg-gradient-to-r from-magenta-500 to-cyan-500 hover:from-magenta-600 hover:to-cyan-600 text-white border-0'
                            : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <i className="ri-send-plane-line"></i>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white hover:bg-slate-700/50 border-slate-600/50"
          >
            <i className="ri-refresh-line mr-2 w-4 h-4 flex items-center justify-center"></i>
            Cargar más
          </Button>
        </div>
      </div>
    </div>
  );
}
