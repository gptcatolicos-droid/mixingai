
import { useState, useCallback } from 'react';
import Modal from '../base/Modal';
import Button from '../base/Button';
import Progress from '../base/Progress';
import CreditsPurchaseModal from './CreditsPurchaseModal';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (files: File[]) => void;
  userCredits: number;
  onCreditsUpdate: (newCredits: number) => void;
}

interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  id: string;
}

export default function UploadModal({
  isOpen,
  onClose,
  onUploadComplete,
  userCredits,
  onCreditsUpdate,
}: UploadModalProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

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
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  }, []);

  const processFiles = (newFiles: File[]) => {
    const audioFiles = newFiles.filter(
      (file) => file.type.startsWith('audio/') && file.size <= 300 * 1024 * 1024
    );

    if (files.length + audioFiles.length > 12) {
      alert('Máximo 12 stems permitidos por proyecto');
      return;
    }

    const fileUploads: FileUpload[] = audioFiles.map((file) => ({
      file,
      progress: 0,
      status: 'pending',
      id: Math.random().toString(36).substr(2, 9),
    }));

    setFiles((prev) => [...prev, ...fileUploads]);

    fileUploads.forEach((upload) => {
      simulateUpload(upload.id);
    });
  };

  const simulateUpload = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, progress: 100, status: 'complete' } : f
          )
        );
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, progress, status: 'uploading' } : f
          )
        );
      }
    }, 200);
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const getCreditsNeeded = (fileCount: number) => {
    return fileCount <= 5 ? 100 : 500;
  };

  const canAffordMix = (fileCount: number) => {
    return userCredits >= getCreditsNeeded(fileCount);
  };

  const handleUpload = () => {
    const completedFiles = files
      .filter((f) => f.status === 'complete')
      .map((f) => f.file);
    const creditsNeeded = getCreditsNeeded(completedFiles.length);

    // VALIDACIÓN ESTRICTA DE CRÉDITOS - NO PERMITIR CONTINUAR SIN CRÉDITOS
    if (userCredits < creditsNeeded) {
      setShowPurchaseModal(true);
      return;
    }

    onUploadComplete(completedFiles);
    setFiles([]);
    onClose();
  };

  const completedCount = files.filter((f) => f.status === 'complete').length;
  const creditsForCurrentFiles =
    completedCount > 0 ? getCreditsNeeded(completedCount) : 0;
  const canProceed = completedCount > 0 && canAffordMix(completedCount);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Subir Stems Adicionales" size="lg">
        <div className="space-y-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl -m-6 p-6" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
          {/* Header Apple Music Style */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/30 via-purple-400/30 to-pink-400/30 animate-pulse"></div>
              <div className="relative z-10">
                <i className="ri-music-2-line text-white text-2xl"></i>
              </div>
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-[shine_2s_ease-in-out_infinite]"></div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Agregar Más Stems</h2>
            <p className="text-slate-300 text-sm">Expande tu mezcla con hasta 12 stems totales</p>
          </div>

          {/* Credits Info Banner - Apple Music Style */}
          <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                  <i className="ri-coin-line text-white text-xl"></i>
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1 text-lg">Créditos Disponibles</h3>
                  <p className="text-sm text-slate-300">
                    Tienes {userCredits.toLocaleString()} créditos para usar
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  {userCredits.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400">créditos</div>
              </div>
            </div>
          </div>

          {/* Credits Pricing - Apple Music Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-cyan-500/20">
                  <i className="ri-music-2-line text-cyan-400 text-lg"></i>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Mezcla Básica</div>
                  <div className="text-xs text-slate-400">1-5 stems</div>
                </div>
              </div>
              <div className="mt-3 text-right">
                <span className="text-cyan-400 font-bold text-lg">100 créditos</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-4 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center border border-purple-500/20">
                  <i className="ri-equalizer-line text-purple-400 text-lg"></i>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Mezcla Avanzada</div>
                  <div className="text-xs text-slate-400">6+ stems</div>
                </div>
              </div>
              <div className="mt-3 text-right">
                <span className="text-purple-400 font-bold text-lg">500 créditos</span>
              </div>
            </div>
          </div>

          {/* Upload Area - Apple Music Style */}
          <div
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-300 relative overflow-hidden ${
              isDragging 
                ? 'border-blue-400 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10' 
                : 'border-slate-600 bg-gradient-to-br from-slate-800/30 via-slate-700/20 to-slate-800/30'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl"></div>

            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20 animate-pulse"></div>
                <div className="relative z-10">
                  <i className="ri-upload-cloud-2-line text-white text-4xl"></i>
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent transform -skew-x-12 animate-[shine_2s_ease-in-out_infinite]"></div>
              </div>
              <p className="text-2xl font-bold text-white mb-3">
                Arrastra tus stems adicionales aquí
              </p>
              <p className="text-slate-300 mb-6 text-base">
                WAV o MP3, hasta 300MB cada uno
              </p>
              <input
                type="file"
                multiple
                accept="audio/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload-additional"
              />
              <label htmlFor="file-upload-additional">
                <button
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white border-0 px-8 py-4 font-bold cursor-pointer rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-105"
                  style={{
                    boxShadow: '0 0 30px rgba(59, 130, 246, 0.4), 0 0 60px rgba(147, 51, 234, 0.3)',
                  }}
                  onClick={() => document.getElementById('file-upload-additional')?.click()}
                >
                  <i className="ri-folder-open-line mr-3 text-xl"></i>
                  Explorar Archivos
                </button>
              </label>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-xl">
                  Nuevos Stems ({files.length})
                </h4>
                {completedCount > 0 && (
                  <div className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-sm border border-slate-600/50 rounded-xl px-4 py-2 shadow-lg">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-300 text-sm">Costo:</span>
                      <span
                        className={`font-bold text-lg ${
                          canAffordMix(completedCount) ? 'text-cyan-400' : 'text-red-400'
                        }`}
                      >
                        {creditsForCurrentFiles} créditos
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Files list - Apple Music Style */}
              <div className="max-h-64 overflow-y-auto space-y-3 custom-scrollbar">
                {files.map((upload) => (
                  <div
                    key={upload.id}
                    className="flex items-center space-x-4 p-4 bg-gradient-to-r from-slate-800/60 to-slate-700/60 backdrop-blur-sm rounded-2xl border border-slate-600/30 shadow-xl transition-all hover:scale-[1.02]"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 border border-blue-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <i className="ri-music-2-line text-blue-300 text-xl"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate mb-1">{upload.file.name}</p>
                      <p className="text-xs text-slate-400 font-medium">
                        {(upload.file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                      {upload.status === 'uploading' && (
                        <div className="mt-2">
                          <Progress value={upload.progress} className="apple-music-progress" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      {upload.status === 'complete' && (
                        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                          <i className="ri-check-line text-white text-sm font-bold"></i>
                        </div>
                      )}
                      {upload.status === 'uploading' && (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                          <i className="ri-loader-4-line animate-spin text-white text-sm"></i>
                        </div>
                      )}
                      <button
                        onClick={() => removeFile(upload.id)}
                        className="w-8 h-8 bg-gradient-to-br from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 rounded-full flex items-center justify-center text-white transition-all hover:scale-110 shadow-lg"
                      >
                        <i className="ri-close-line text-sm font-bold"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons - Apple Music Style */}
          <div className="flex justify-end space-x-4 pt-4">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpload}
              disabled={!canProceed}
              className={`font-bold px-8 py-3 rounded-2xl transition-all duration-300 shadow-2xl ${
                canProceed
                  ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white hover:scale-105 hover:shadow-3xl'
                  : 'bg-gradient-to-r from-slate-600 to-slate-700 text-slate-400 cursor-not-allowed opacity-60'
              }`}
              style={canProceed ? { 
                boxShadow: '0 0 40px rgba(59, 130, 246, 0.4), 0 0 80px rgba(147, 51, 234, 0.3)' 
              } : undefined}
            >
              {!canProceed && completedCount > 0 && !canAffordMix(completedCount)
                ? 'Comprar Créditos'
                : `Agregar ${completedCount} Stems al Mezclador`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Compra de Créditos */}
      <CreditsPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onPurchaseSuccess={(credits) => {
          onCreditsUpdate(userCredits + credits);
          setShowPurchaseModal(false);
        }}
        currentCredits={userCredits}
      />

      {/* Custom CSS for Apple Music styling */}
      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(71, 85, 105, 0.3);
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          border-radius: 10px;
          border: 2px solid rgba(30, 41, 59, 0.1);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #2563eb, #7c3aed);
        }

        .apple-music-progress .progress-bar {
          background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899);
        }
      `}</style>
    </>
  );
}