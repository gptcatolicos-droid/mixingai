import { useState, useEffect } from 'react';
import Button from '@/components/base/Button';
import CreditsPurchaseModal from '@/components/feature/CreditsPurchaseModal';
import Header from '@/components/feature/Header';
import MixEditor from './MixEditor';
import ExportScreen from './ExportScreen';
import NewProjectScreen from './NewProjectScreen';
import { useNavigate, Link } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  stems: number;
  status: 'draft' | 'processing' | 'complete';
  createdAt: Date;
  genre?: string;
}

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

interface ExportData {
  audioBuffer: AudioBuffer;
  audioUrl: string;
  waveformPeaks: Float32Array;
  finalLufs: number;
  mp3Url?: string;
  wavUrl?: string;
}

export default function ProjectDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  
  const [user, setUser] = useState<User | null>(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const navigate = useNavigate();
  const [showNewProject, setShowNewProject] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  // Estados para la pantalla de exportación
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'newProject' | 'mixer' | 'export'>('dashboard');
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStep, setExportStep] = useState('');

  // Check for stored user on component mount with session persistence
  useEffect(() => {
    const storedUser = localStorage.getItem('audioMixerUser');
    const rememberUser = localStorage.getItem('rememberUser');
    
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        // Add username if not present
        if (!userData.username) {
          userData.username = `${userData.firstName.toLowerCase()}_${userData.lastName.toLowerCase()}`;
        }
        setUser(userData);
        localStorage.setItem('audioMixerUser', JSON.stringify(userData));
      } catch (error) {
        localStorage.removeItem('audioMixerUser');
        localStorage.removeItem('rememberUser');
      }
    }
  }, []);

  // Check if user has unlimited credits
  const hasUnlimitedCredits = (userEmail: string) => {
    return userEmail === 'danipalacio@gmail.com';
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('audioMixerUser');
    localStorage.removeItem('rememberUser');
    setSelectedProject(null);
    setCurrentScreen('dashboard');
    navigate('/');
  };

  const handleCreditsUpdate = (newCredits: number) => {
    if (!user) return;
    const updatedUser = { ...user, credits: newCredits };
    setUser(updatedUser);
    localStorage.setItem('audioMixerUser', JSON.stringify(updatedUser));
  };

  const handleNewProject = () => {
    if (!user) {
      navigate('/auth/login');
      return;
    }
    setCurrentScreen('newProject');
  };

  const handleUploadComplete = (files: File[]) => {
    if (!user) return;

    // Skip credit check for unlimited users
    if (!hasUnlimitedCredits(user.email)) {
      // Calculate credits needed
      const creditsNeeded = files.length <= 5 ? 100 : 500;
      
      if (user.credits < creditsNeeded) {
        setShowCreditsModal(true);
        return;
      }

      // Deduct credits
      const updatedUser = { ...user, credits: user.credits - creditsNeeded };
      setUser(updatedUser);
      localStorage.setItem('audioMixerUser', JSON.stringify(updatedUser));
    }

    const newProject: Project = {
      id: Date.now().toString(),
      name: `Proyecto ${projects.length + 1}`,
      stems: files.length,
      status: 'draft',
      createdAt: new Date(),
    };
    setProjects(prev => [newProject, ...prev]);
    setSelectedProject(newProject.id);
    setUploadedFiles(files);
    setCurrentScreen('mixer');
  };

  const handleProjectClick = (projectId: string) => {
    if (!user) {
      navigate('/auth/login');
      return;
    }
    setSelectedProject(projectId);
    setCurrentScreen('mixer');
  };

  const handleCreditsPurchaseSuccess = (purchasedCredits: number) => {
    if (!user) return;
    
    const updatedUser = { ...user, credits: user.credits + purchasedCredits };
    setUser(updatedUser);
    localStorage.setItem('audioMixerUser', JSON.stringify(updatedUser));
  };

  // NUEVA: Función para manejar la exportación desde MixEditor
  const handleExport = (exportData: ExportData) => {
    setExportData(exportData);
    setCurrentScreen('export');
  };

  // NUEVA: Función para volver desde las pantallas
  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
    setSelectedProject(null);
    setUploadedFiles([]);
    setExportData(null);
    setExportProgress(0);
    setExportStep('');
  };

  const handleBackToMixer = () => {
    setCurrentScreen('mixer');
    setExportData(null);
    setExportProgress(0);
    setExportStep('');
  };

  // Show new project screen
  if (currentScreen === 'newProject' && user) {
    return (
      <NewProjectScreen
        user={user}
        onBack={() => setCurrentScreen('dashboard')}
        onUploadComplete={handleUploadComplete}
        hasUnlimitedCredits={hasUnlimitedCredits(user.email)}
      />
    );
  }

  // Show export screen
  if (currentScreen === 'export' && user && selectedProject) {
    return (
      <ExportScreen
        user={user}
        projectId={selectedProject}
        exportData={exportData}
        exportProgress={exportProgress}
        exportStep={exportStep}
        onBack={handleBackToMixer}
        onCreditsUpdate={handleCreditsUpdate}
      />
    );
  }

  // Show mixer screen
  if (currentScreen === 'mixer' && selectedProject && user) {
    return (
      <MixEditor
        projectId={selectedProject}
        user={user}
        uploadedFiles={uploadedFiles}
        onBack={handleBackToDashboard}
        onCreditsUpdate={handleCreditsUpdate}
        onExport={handleExport}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Header */}
      <Header 
        user={user} 
        onLogout={handleLogout}
        onCreditsUpdate={handleCreditsUpdate}
      />

      {/* Interfaz minimalista tipo Apple Music */}
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-2xl mx-auto px-8">
          
          {!user ? (
            /* Vista para usuarios no logueados - Minimalista */
            <div className="text-center">
              <div className="mb-16">
                <h1 className="text-6xl font-light text-gray-900 mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  Mixing Music AI
                </h1>
                <p className="text-xl text-gray-600 font-light">
                  Mezcla profesional con inteligencia artificial
                </p>
              </div>

              <div className="space-y-6">
                <Link 
                  to="/auth/register"
                  className="inline-block w-full max-w-md mx-auto bg-black hover:bg-gray-800 text-white px-8 py-4 rounded-full text-lg font-medium transition-all duration-200 shadow-sm"
                >
                  Comenzar con 500 créditos gratis
                </Link>
                
                <div className="text-gray-500 text-sm">
                  ¿Ya tienes cuenta? <Link to="/auth/login" className="text-black hover:underline">Iniciar sesión</Link>
                </div>
              </div>
            </div>
          ) : (
            /* Vista principal minimalista para usuarios logueados */
            <div className="text-center">
              {/* Saludo minimalista */}
              <div className="mb-12">
                <h1 className="text-4xl font-light text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                  Hola, {user.firstName}
                </h1>
                <p className="text-lg text-gray-600 font-light">
                  {hasUnlimitedCredits(user.email) 
                    ? 'Acceso ilimitado activado'
                    : `${user.credits.toLocaleString()} créditos disponibles`
                  }
                </p>
              </div>

              {/* Área central única de subida - Minimalista tipo Apple */}
              <div className="relative">
                <UploadArea onUploadComplete={handleUploadComplete} />
              </div>

              {/* Lista simple de proyectos existentes */}
              {projects.length > 0 && (
                <div className="mt-16 pt-8 border-t border-gray-200">
                  <h3 className="text-lg font-light text-gray-900 mb-6">Proyectos recientes</h3>
                  <div className="space-y-2">
                    {projects.slice(0, 3).map(project => (
                      <button
                        key={project.id}
                        onClick={() => handleProjectClick(project.id)}
                        className="w-full text-left px-6 py-4 hover:bg-gray-50 rounded-xl transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{project.name}</div>
                            <div className="text-sm text-gray-500">{project.stems} stems • {project.createdAt.toLocaleDateString()}</div>
                          </div>
                          <i className="ri-arrow-right-s-line text-gray-400 group-hover:text-gray-600 transition-colors"></i>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreditsPurchaseModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        onPurchaseSuccess={handleCreditsPurchaseSuccess}
        currentCredits={user?.credits || 0}
      />
    </div>
  );
}

// Componente de área de subida minimalista
interface UploadAreaProps {
  onUploadComplete: (files: File[]) => void;
}

function UploadArea({ onUploadComplete }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
      e.target.value = '';
    }
  };

  const processFiles = async (files: File[]) => {
    setErrorMessage('');
    
    // Filtrar archivos de audio válidos
    const audioFiles = files.filter(file => {
      const isAudio = file.type.startsWith('audio/') || 
                     file.name.toLowerCase().endsWith('.wav') || 
                     file.name.toLowerCase().endsWith('.mp3') ||
                     file.name.toLowerCase().endsWith('.flac') ||
                     file.name.toLowerCase().endsWith('.aac') ||
                     file.name.toLowerCase().endsWith('.m4a');
      const isValidSize = file.size <= 300 * 1024 * 1024; // 300MB
      return isAudio && isValidSize;
    });

    if (audioFiles.length === 0) {
      setErrorMessage('Selecciona archivos de audio válidos (WAV, MP3, FLAC, AAC, M4A)');
      return;
    }

    if (audioFiles.length > 12) {
      setErrorMessage('Máximo 12 stems por proyecto');
      return;
    }

    // Simular carga con animación suave
    setIsUploading(true);
    setUploadProgress(0);

    // Progreso suave
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 10 + 5;
      });
    }, 200);

    // Completar después de 2-4 segundos
    setTimeout(() => {
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        onUploadComplete(audioFiles);
      }, 500);
    }, 2000 + Math.random() * 2000);
  };

  const handleClick = () => {
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  if (isUploading) {
    return (
      <div className="text-center py-16">
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto mb-6 bg-black rounded-full flex items-center justify-center">
            <i className="ri-upload-line text-white text-2xl"></i>
          </div>
          <h3 className="text-2xl font-light text-gray-900 mb-2">Subiendo stems...</h3>
          <p className="text-gray-600">Procesando archivos de audio</p>
        </div>
        
        {/* Barra de progreso minimalista */}
        <div className="w-full max-w-md mx-auto mb-4">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-black transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
        <div className="text-sm text-gray-500">{Math.round(uploadProgress)}%</div>
      </div>
    );
  }

  return (
    <>
      <input
        type="file"
        multiple
        accept="audio/*,.wav,.mp3,.flac,.aac,.m4a"
        onChange={handleFileSelect}
        className="hidden"
        id="file-upload"
      />
      
      <div
        className={`relative border-2 border-dashed rounded-3xl p-16 cursor-pointer transition-all duration-200 ${
          isDragging 
            ? 'border-black bg-gray-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-8 bg-black rounded-full flex items-center justify-center">
            <i className="ri-upload-line text-white text-3xl"></i>
          </div>
          
          <h2 className="text-3xl font-light text-gray-900 mb-4">
            Subir Stems
          </h2>
          
          <p className="text-lg text-gray-600 mb-6">
            Arrastra tus archivos aquí o haz clic para seleccionar
          </p>
          
          <div className="text-sm text-gray-500 space-y-1">
            <div>WAV, MP3, FLAC, AAC, M4A</div>
            <div>Hasta 300MB por archivo • <span className="font-medium">Máximo 12 stems</span></div>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center space-x-3">
            <i className="ri-error-warning-line text-red-500"></i>
            <p className="text-red-700 font-medium">{errorMessage}</p>
          </div>
          <button 
            onClick={() => setErrorMessage('')}
            className="mt-3 text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Reintentar
          </button>
        </div>
      )}
    </>
  );
}
