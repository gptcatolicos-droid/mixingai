import { useState, useCallback } from 'react';
import Button from '@/components/base/Button';
import Progress from '@/components/base/Progress';
import Header from '@/components/feature/Header';

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

interface NewProjectScreenProps {
  user: User;
  onBack: () => void;
  onUploadComplete: (files: File[]) => void;
  hasUnlimitedCredits: boolean;
}

interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  id: string;
}

export default function NewProjectScreen({ user, onBack, onUploadComplete, hasUnlimitedCredits }: NewProjectScreenProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showFuturisticAnimation, setShowFuturisticAnimation] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, [files]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
      // Reset the input value to allow selecting the same files again
      e.target.value = '';
    }
  }, [files]);

  const handleBrowseFiles = useCallback(() => {
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }, []);

  const processFiles = (newFiles: File[]) => {
    setErrorMessage('');
    
    // Filter for audio files and check size limit
    const audioFiles = newFiles.filter(file => {
      const isAudio = file.type.startsWith('audio/') || 
                     file.name.toLowerCase().endsWith('.wav') || 
                     file.name.toLowerCase().endsWith('.mp3') ||
                     file.name.toLowerCase().endsWith('.flac') ||
                     file.name.toLowerCase().endsWith('.aac') ||
                     file.name.toLowerCase().endsWith('.m4a');
      const isValidSize = file.size <= 300 * 1024 * 1024; // 300MB
      
      if (!isAudio) {
        console.warn(`Skipping non-audio file: ${file.name}`);
      }
      if (!isValidSize) {
        console.warn(`Skipping oversized file: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      }
      
      return isAudio && isValidSize;
    });

    // Check total stem limit
    if (files.length + audioFiles.length > 12) {
      setErrorMessage('Maximum 12 stems allowed per project. Please select fewer files.');
      return;
    }

    if (audioFiles.length === 0) {
      setErrorMessage('Please select valid audio files (WAV, MP3, FLAC, AAC, M4A) under 300MB each.');
      return;
    }

    // Show futuristic animation immediately when files are selected
    setShowFuturisticAnimation(true);

    const fileUploads: FileUpload[] = audioFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending',
      id: Math.random().toString(36).substr(2, 9)
    }));

    setFiles(prev => [...prev, ...fileUploads]);

    // Start upload simulation for each file after showing animation
    setTimeout(() => {
      fileUploads.forEach(upload => {
        simulateUpload(upload.id);
      });
    }, 1000);

    // Hide animation after 5 seconds max
    setTimeout(() => {
      setShowFuturisticAnimation(false);
    }, 5000);
  };

  const simulateUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 10; // Consistent progress
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress: 100, status: 'complete' } : f
        ));
      } else {
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress, status: 'uploading' } : f
        ));
      }
    }, 200);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setErrorMessage('');
  };

  const getCreditsNeeded = (fileCount: number) => {
    return fileCount <= 5 ? 100 : 500;
  };

  const canAffordMix = (fileCount: number) => {
    return hasUnlimitedCredits || user.credits >= getCreditsNeeded(fileCount);
  };

  const handleCreateProject = async () => {
    const completedFiles = files.filter(f => f.status === 'complete').map(f => f.file);
    
    if (completedFiles.length === 0) {
      setErrorMessage('Please upload at least one audio file to continue.');
      return;
    }

    if (!hasUnlimitedCredits) {
      const creditsNeeded = getCreditsNeeded(completedFiles.length);
      if (user.credits < creditsNeeded) {
        setErrorMessage(`You need ${creditsNeeded} credits for this mix. You currently have ${user.credits} credits.`);
        return;
      }
    }

    // Add transition effect
    setIsTransitioning(true);
    setErrorMessage('');
    
    // Navigate directly to mixer after brief delay
    setTimeout(() => {
      onUploadComplete(completedFiles);
    }, 500);
  };

  // Auto-transition when files are uploaded and complete
  const completedCount = files.filter(f => f.status === 'complete').length;
  const uploadingCount = files.filter(f => f.status === 'uploading').length;
  const creditsForCurrentFiles = completedCount > 0 ? getCreditsNeeded(completedCount) : 0;
  const canProceed = completedCount > 0 && canAffordMix(completedCount);

  // Auto-transition when all files are uploaded
  const shouldAutoTransition = files.length > 0 && uploadingCount === 0 && completedCount > 0;

  // Futuristic Animation Component
  const FuturisticProcessingAnimation = () => (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-full max-w-2xl px-8">
        <div className="relative h-64 flex flex-col items-center justify-center bg-gradient-to-r from-fuchsia-600/30 via-cyan-500/20 to-indigo-600/30 rounded-2xl border border-white/10 p-8 overflow-hidden">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-cyan-500/30 animate-pulse"></div>
            <div 
              className="absolute inset-0" 
              style={{
                backgroundImage: `radial-gradient(circle at 20% 50%, rgba(147, 51, 234, 0.3) 0%, transparent 50%), 
                                 radial-gradient(circle at 80% 50%, rgba(6, 182, 212, 0.3) 0%, transparent 50%),
                                 radial-gradient(circle at 40% 20%, rgba(236, 72, 153, 0.2) 0%, transparent 50%)`,
                animation: 'pulse 2s ease-in-out infinite alternate'
              }}
            ></div>
          </div>

          {/* Central rotating element */}
          <div className="relative z-10 mb-8">
            <div 
              className="w-24 h-24 rounded-full border-4 border-fuchsia-400/50 border-t-transparent animate-spin"
              style={{ 
                animationDuration: '2s',
                boxShadow: '0 0 30px rgba(236, 72, 153, 0.5), 0 0 60px rgba(147, 51, 234, 0.3)'
              }}
            ></div>
            <div 
              className="absolute inset-4 rounded-full border-2 border-cyan-400/30 border-b-transparent animate-spin"
              style={{ 
                animationDuration: '3s', 
                animationDirection: 'reverse',
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)'
              }}
            ></div>
          </div>

          {/* Animated text */}
          <div className="relative z-10 text-center">
            <h3 className="text-2xl font-bold text-white mb-2" style={{ textShadow: '0 0 15px rgba(255, 255, 255, 0.5)' }}>
              🎵 Procesando Stems
            </h3>
            <p className="text-lg text-slate-300 animate-pulse">
              Analizando elementos musicales con IA avanzada...
            </p>
          </div>

          {/* Animated bars at bottom */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-end gap-1 h-12">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-gradient-to-t from-fuchsia-500 via-cyan-400 to-white rounded-t animate-pulse"
                style={{
                  height: `${Math.random() * 30 + 10}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '1.5s'
                }}
              />
            ))}
          </div>

          {/* Pulsing corners */}
          <div className="absolute top-4 left-4 w-4 h-4 bg-fuchsia-400 rounded-full animate-ping"></div>
          <div className="absolute top-4 right-4 w-4 h-4 bg-cyan-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute bottom-4 left-4 w-4 h-4 bg-pink-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-4 right-4 w-4 h-4 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '1.5s' }}></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 relative">
      {/* Futuristic Animation Overlay */}
      {showFuturisticAnimation && <FuturisticProcessingAnimation />}

      {/* Transition overlay */}
      {isTransitioning && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-magenta-500 to-cyan-500 rounded-3xl flex items-center justify-center shadow-2xl animate-pulse">
              <i className="ri-equalizer-line text-white text-4xl"></i>
            </div>
            <h3 className="text-3xl font-bold text-white mb-3">Loading Mixer...</h3>
            <p className="text-slate-400 text-lg">Preparing your audio stems for professional mixing</p>
            <div className="mt-4">
              <div className="w-32 h-2 bg-slate-700 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-gradient-to-r from-magenta-500 to-cyan-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header with prominent logo */}
      <div className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-700/50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Prominent App Logo */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-magenta-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <i className="ri-music-2-line text-white text-2xl"></i>
              </div>
              <div>
                <h1 className="text-lg font-medium text-white">
                  mixingmusic.ai
                </h1>
                <p className="text-slate-400 text-sm">Professional AI Mixing Platform</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={onBack}
                className="text-cyan-400 hover:text-white hover:bg-slate-700/50 border-slate-600/50"
                disabled={isTransitioning}
              >
                <i className="ri-arrow-left-line mr-2 w-4 h-4 flex items-center justify-center"></i>
                Back to Dashboard
              </Button>
              
              {hasUnlimitedCredits && (
                <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <i className="ri-vip-crown-fill text-white"></i>
                    <span className="text-white font-semibold">UNLIMITED CREDITS</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modern gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-magenta-500/5 via-transparent to-cyan-500/5"></div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header Section with required text */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-6" style={{ fontFamily: '"Inter", sans-serif', fontWeight: '800' }}>
            New Project
          </h1>
          <p className="text-slate-300 text-2xl mb-8 font-medium">
            Upload your audio stems and create a professional mix with AI
          </p>
          
          {/* Project Name Input */}
          <div className="max-w-lg mx-auto">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name..."
              className="w-full bg-slate-800/60 border border-slate-700/50 rounded-2xl px-6 py-4 text-white text-lg placeholder-slate-400 focus:outline-none focus:border-magenta-500/50 focus:ring-2 focus:ring-magenta-500/20 backdrop-blur-sm"
              disabled={isTransitioning}
            />
          </div>
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="mb-8 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <i className="ri-error-warning-line text-red-400 text-xl"></i>
              <p className="text-red-300 font-medium">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Credits Info - Only show if not unlimited */}
        {!hasUnlimitedCredits && (
          <div className="bg-gradient-to-r from-magenta-500/10 to-cyan-500/10 border border-magenta-500/20 rounded-2xl p-8 mb-10 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-gradient-to-r from-magenta-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <i className="ri-coin-line text-white text-2xl"></i>
                </div>
                <div>
                  <h3 className="font-bold text-white mb-2 text-2xl">Available Credits</h3>
                  <p className="text-slate-300 text-lg">You have {user.credits.toLocaleString()} credits to use</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-cyan-400">{user.credits.toLocaleString()}</div>
                <div className="text-slate-400">credits</div>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Info - Only show if not unlimited */}
        {!hasUnlimitedCredits && (
          <div className="grid grid-cols-2 gap-8 mb-12">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                  <i className="ri-music-2-line text-cyan-400 text-xl"></i>
                </div>
                <div>
                  <div className="text-white font-bold text-xl">Basic Mix</div>
                  <div className="text-slate-400">1-5 stems</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-cyan-400 font-bold text-2xl">100 credits</span>
              </div>
            </div>
            
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-magenta-500/20 rounded-xl flex items-center justify-center">
                  <i className="ri-equalizer-line text-magenta-400 text-xl"></i>
                </div>
                <div>
                  <div className="text-white font-bold text-xl">Advanced Mix</div>
                  <div className="text-slate-400">6+ stems</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-magenta-400 font-bold text-2xl">500 credits</span>
              </div>
            </div>
          </div>
        )}

        {/* Upload Your Audio Stems Area */}
        <div
          className={`border-2 border-dashed rounded-3xl p-20 text-center transition-all mb-10 relative overflow-hidden ${
            isDragging 
              ? 'border-magenta-400 bg-magenta-500/10 scale-[1.02]' 
              : 'border-slate-600 bg-slate-800/40'
          } ${isTransitioning ? 'opacity-50 pointer-events-none' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-r from-magenta-500 to-cyan-500 rounded-3xl flex items-center justify-center shadow-2xl">
            <i className="ri-upload-cloud-2-line text-white text-5xl"></i>
          </div>
          <h3 className="text-4xl font-bold text-white mb-6" style={{ fontFamily: '"Inter", sans-serif' }}>
            Upload Your Audio Stems
          </h3>
          <p className="text-slate-300 mb-10 text-xl max-w-2xl mx-auto">
            Arrastra y suelta tus archivos de audio aquí o haz clic para explorar
            <br />
            <span className="text-emerald-400 text-lg font-semibold">WAV, MP3, FLAC, AAC, M4A • Hasta 300MB cada uno • Máximo 12 stems por proyecto</span>
          </p>
          
          {/* Hidden file input */}
          <input
            type="file"
            multiple
            accept="audio/*,.wav,.mp3,.flac,.aac,.m4a"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={isTransitioning}
          />
          
          {/* Browse Files Button - Multiple implementations to ensure it works */}
          <div className="flex flex-col items-center space-y-4">
            {/* Primary button using label */}
            <label
              htmlFor="file-upload"
              className="inline-flex items-center justify-center font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 hover:from-purple-600 hover:via-pink-600 hover:to-cyan-500 text-white border-0 px-10 py-5 text-xl font-bold cursor-pointer transition-all hover:scale-105 shadow-2xl hover:shadow-purple-500/25"
              style={{ 
                pointerEvents: isTransitioning ? 'none' : 'auto',
                boxShadow: '0 0 30px rgba(147, 51, 234, 0.3), 0 0 60px rgba(236, 72, 153, 0.2)'
              }}
            >
              <i className="ri-folder-open-line mr-4 w-6 h-6 flex items-center justify-center"></i>
              Explorar Archivos
            </label>
            
            {/* Secondary button using onClick */}
            <button
              type="button"
              onClick={handleBrowseFiles}
              disabled={isTransitioning}
              className="inline-flex items-center justify-center font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gradient-to-r from-cyan-400 via-emerald-500 to-pink-500 hover:from-cyan-500 hover:via-emerald-600 hover:to-pink-600 text-white border-0 px-8 py-4 text-lg font-semibold cursor-pointer transition-all hover:scale-105 shadow-lg"
              style={{ 
                boxShadow: '0 0 20px rgba(6, 182, 212, 0.4), 0 0 40px rgba(236, 72, 153, 0.2)'
              }}
            >
              <i className="ri-folder-open-line mr-3 w-5 h-5 flex items-center justify-center"></i>
              Seleccionar Archivos
            </button>
          </div>
        </div>

        {/* Files List */}
        {files.length > 0 && (
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-3xl p-10 border border-slate-700/50 mb-10">
            <div className="flex items-center justify-between mb-8">
              <h4 className="font-bold text-white text-3xl">
                Uploaded Files ({files.length}/12)
                {uploadingCount > 0 && (
                  <span className="ml-4 text-magenta-400 text-xl">
                    • Uploading {uploadingCount}...
                  </span>
                )}
              </h4>
              {completedCount > 0 && !hasUnlimitedCredits && (
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl px-8 py-4">
                  <div className="flex items-center space-x-4">
                    <span className="text-slate-400 text-lg">Cost:</span>
                    <span className={`font-bold text-2xl ${canAffordMix(completedCount) ? 'text-cyan-400' : 'text-red-400'}`}>
                      {creditsForCurrentFiles} credits
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid gap-6 max-h-96 overflow-y-auto">
              {files.map(upload => (
                <div key={upload.id} className="flex items-center space-x-6 p-6 bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/50">
                  <div className="w-16 h-16 bg-gradient-to-r from-magenta-500/20 to-cyan-500/20 border border-magenta-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <i className="ri-music-2-line text-magenta-300 text-2xl"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-bold text-white truncate mb-2">
                      {upload.file.name}
                    </p>
                    <p className="text-slate-400 font-medium">
                      {(upload.file.size / 1024 / 1024).toFixed(1)} MB • {upload.file.type || 'Audio file'}
                    </p>
                    {upload.status === 'uploading' && (
                      <div className="mt-4">
                        <Progress value={upload.progress} className="mb-2" />
                        <div className="text-magenta-400 font-medium">
                          {Math.round(upload.progress)}% uploaded
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-6">
                    {upload.status === 'complete' && (
                      <div className="flex items-center space-x-3">
                        <i className="ri-check-line text-emerald-400 text-3xl"></i>
                        <span className="text-emerald-400 font-bold">Ready</span>
                      </div>
                    )}
                    {upload.status === 'uploading' && (
                      <i className="ri-loader-4-line animate-spin text-magenta-400 text-3xl"></i>
                    )}
                    {upload.status === 'error' && (
                      <i className="ri-error-warning-line text-red-400 text-3xl"></i>
                    )}
                    <button
                      onClick={() => removeFile(upload.id)}
                      className="text-slate-400 hover:text-red-400 w-10 h-10 flex items-center justify-center transition-colors rounded-xl hover:bg-red-500/10"
                      disabled={isTransitioning}
                    >
                      <i className="ri-close-line text-2xl"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Auto-transition notice */}
            {shouldAutoTransition && !isTransitioning && (
              <div className="mt-8 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-2xl p-6" style={{
                border: '2px solid transparent',
                background: 'linear-gradient(45deg, rgba(16, 185, 129, 0.1), rgba(6, 182, 212, 0.1)) padding-box, linear-gradient(45deg, #10b981, #06b6d4) border-box',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)'
              }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <i className="ri-check-double-line text-emerald-400 text-2xl" style={{ textShadow: '0 0 10px rgba(16, 185, 129, 0.8)' }}></i>
                    <div>
                      <div className="text-emerald-400 font-bold text-xl" style={{ textShadow: '0 0 10px rgba(16, 185, 129, 0.6)' }}>¡Archivos Listos!</div>
                      <div className="text-slate-400">Todos los stems subidos exitosamente. Listo para comenzar la mezcla.</div>
                    </div>
                  </div>
                  <Button
                    onClick={handleCreateProject}
                    className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0 font-bold px-8 py-4 text-lg"
                    style={{ 
                      boxShadow: '0 0 25px rgba(16, 185, 129, 0.4), 0 0 50px rgba(6, 182, 212, 0.2)'
                    }}
                  >
                    <i className="ri-arrow-right-line mr-3 w-5 h-5 flex items-center justify-center"></i>
                    Iniciar Mezcla
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-8">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="text-slate-400 hover:text-white hover:bg-slate-700/50 border-slate-600/50 px-10 py-5 text-xl"
            disabled={isTransitioning}
          >
            Cancel
          </Button>
          {files.length > 0 && (
            <Button 
              onClick={handleCreateProject}
              disabled={!canProceed || isTransitioning}
              className={`px-10 py-5 text-xl font-bold transition-all ${
                canProceed && !isTransitioning
                  ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 hover:from-purple-600 hover:via-pink-600 hover:to-cyan-500 text-white border-0 hover:scale-105'
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed border-0'
              }`}
              style={canProceed && !isTransitioning ? { 
                boxShadow: '0 0 30px rgba(147, 51, 234, 0.4), 0 0 60px rgba(236, 72, 153, 0.2)' 
              } : {}}
            >
              {isTransitioning ? (
                <>
                  <i className="ri-loader-4-line animate-spin mr-3 w-6 h-6 flex items-center justify-center"></i>
                  Cargando Mezclador...
                </>
              ) : !canProceed && completedCount > 0 && !canAffordMix(completedCount) ? (
                `Necesitas ${creditsForCurrentFiles} créditos`
              ) : (
                `Crear Proyecto con ${completedCount} archivos`
              )}
            </Button>
          )}
        </div>

        {/* Features Preview */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-magenta-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center border border-magenta-500/20">
              <i className="ri-brain-line text-magenta-400 text-2xl"></i>
            </div>
            <h4 className="text-xl font-bold text-white mb-3">AI Mix Engine</h4>
            <p className="text-slate-400">Advanced artificial intelligence analyzes your stems and creates professional mixes automatically</p>
          </div>
          
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-cyan-500/20 to-magenta-500/20 rounded-2xl flex items-center justify-center border border-cyan-500/20">
              <i className="ri-equalizer-2-line text-cyan-400 text-2xl"></i>
            </div>
            <h4 className="text-xl font-bold text-white mb-3">Dynamic Range Control</h4>
            <p className="text-slate-400">Real-time dynamic range monitoring and optimization for perfect audio balance</p>
          </div>
          
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <i className="ri-message-3-line text-emerald-400 text-2xl"></i>
            </div>
            <h4 className="text-xl font-bold text-white mb-3">Custom Mix Prompts</h4>
            <p className="text-slate-400">Describe your desired sound and let AI interpret your creative vision</p>
          </div>
        </div>
      </div>
    </div>
  );
}
