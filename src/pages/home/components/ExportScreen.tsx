
import { useState, useRef, useEffect, useCallback } from 'react';
import Header from '@/components/feature/Header';
import Progress from '@/components/base/Progress';
import { drawWaveform, handleWaveformClick } from '@/utils/drawWaveform';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  credits: number;
  provider?: string;
  createdAt: string;
}

interface ExportScreenProps {
  user: User;
  projectId: string;
  exportData: {
    audioBuffer: AudioBuffer;
    audioUrl: string;
    waveformPeaks: Float32Array;
    finalLufs: number;
    mp3Url?: string;
    wavUrl?: string;
  } | null;
  exportProgress: number;
  exportStep: string;
  onBack: () => void;
  onCreditsUpdate: (newCredits: number) => void;
}

export default function ExportScreen({
  user,
  projectId,
  exportData,
  exportProgress,
  exportStep,
  onBack,
  onCreditsUpdate
}: ExportScreenProps) {
  const [isExportPlaying, setIsExportPlaying] = useState(false);
  const [exportCurrentTime, setExportCurrentTime] = useState(0);
  const [exportPausedTime, setExportPausedTime] = useState(0);
  
  // Estados para descarga DIRECTA (sin guardado)
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadFormat, setDownloadFormat] = useState<'mp3' | 'wav' | null>(null);
  
  // NUEVO: Estados para el aviso de créditos descontados
  const [showCreditsDeductedModal, setShowCreditsDeductedModal] = useState(false);
  const [deductedCreditsInfo, setDeductedCreditsInfo] = useState<{
    format: string;
    creditsDeducted: number;
    remainingCredits: number;
  } | null>(null);
  
  // Audio context for export playback
  const [exportAudioContext, setExportAudioContext] = useState<AudioContext | null>(null);
  const [exportSourceNode, setExportSourceNode] = useState<AudioBufferSourceNode | null>(null);

  // Canvas refs
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Animation refs  
  const exportTimeUpdateRef = useRef<number>();

  // Initialize export audio context
  useEffect(() => {
    if (exportData && !exportAudioContext) {
      const initExportAudio = async () => {
        try {
          const ctx = new AudioContext();
          setExportAudioContext(ctx);
        } catch (error) {
          console.error('Error initializing export audio:', error);
        }
      };
      
      initExportAudio();
    }
  }, [exportData, exportAudioContext]);

  // Draw timeline
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !exportData) return;

    // Create mock waveform for SoundCloud style visualization - ESTÁTICO
    const mockWaveform = new Float32Array(800);
    for (let i = 0; i < mockWaveform.length; i++) {
      mockWaveform[i] = Math.random() * 0.7 + 0.1;
    }

    // Dibujar waveform estático pero con playhead que se mueve
    drawWaveform({
      canvas,
      waveformPeaks: mockWaveform,
      currentTime: exportCurrentTime,
      duration: exportData.audioBuffer.duration,
      style: 'soundcloud',
      colors: {
        played: '#ff6b35',
        unplayed: '#e2e8f0',
        playhead: '#ff4500'
      }
    });
  }, [exportData, exportCurrentTime]);

  // Export playback controls
  const handleExportPlayPause = useCallback(async () => {
    if (!exportAudioContext || !exportData) return;

    if (exportAudioContext.state === 'suspended') {
      await exportAudioContext.resume();
    }

    if (isExportPlaying) {
      if (exportSourceNode) {
        exportSourceNode.stop();
        exportSourceNode.disconnect();
      }
      setIsExportPlaying(false);
      setExportPausedTime(exportCurrentTime);
      
      if (exportTimeUpdateRef.current) {
        clearInterval(exportTimeUpdateRef.current);
      }
    } else {
      const sourceNode = exportAudioContext.createBufferSource();
      sourceNode.buffer = exportData.audioBuffer;
      sourceNode.connect(exportAudioContext.destination);

      const startTime = exportAudioContext.currentTime;
      const offset = exportPausedTime;

      sourceNode.start(startTime, offset);
      setExportSourceNode(sourceNode);
      setIsExportPlaying(true);

      sourceNode.onended = () => {
        setIsExportPlaying(false);
        setExportPausedTime(0);
        setExportCurrentTime(0);
      };

      // Time tracking
      exportTimeUpdateRef.current = window.setInterval(() => {
        const elapsed = exportAudioContext.currentTime - startTime + offset;
        setExportCurrentTime(Math.min(elapsed, exportData.audioBuffer.duration));

        if (elapsed >= exportData.audioBuffer.duration) {
          setIsExportPlaying(false);
          setExportPausedTime(0);
          setExportCurrentTime(0);
          if (exportTimeUpdateRef.current) {
            clearInterval(exportTimeUpdateRef.current);
          }
        }
      }, 100);
    }
  }, [exportAudioContext, exportData, isExportPlaying, exportCurrentTime, exportPausedTime, exportSourceNode]);

  // NUEVA función para Stop
  const handleExportStop = useCallback(() => {
    if (!exportAudioContext) return;

    // Parar reproducción
    if (exportSourceNode) {
      exportSourceNode.stop();
      exportSourceNode.disconnect();
    }
    
    // Resetear todo
    setIsExportPlaying(false);
    setExportPausedTime(0);
    setExportCurrentTime(0);
    
    if (exportTimeUpdateRef.current) {
      clearInterval(exportTimeUpdateRef.current);
    }
  }, [exportAudioContext, exportSourceNode]);

  // NUEVA función para descarga DIRECTA (sin guardado en base de datos)
  const handleDirectDownload = async (format: 'mp3' | 'wav') => {
    if (!exportData || isDownloading) return;

    // Verificar créditos (500 créditos por exportación)
    if (user.credits < 500) {
      alert('Necesitas al menos 500 créditos para descargar la mezcla');
      return;
    }

    setIsDownloading(true);
    setDownloadFormat(format);
    setDownloadProgress(0);

    try {
      // Simular progreso de creación
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15 + 5;
        });
      }, 300);

      // Load JSZip if not already loaded
      if (!(window as any).JSZip) {
        await loadJSZip();
      }

      // Crear archivo de audio
      const audioBlob = await createAudioBlob(exportData.audioBuffer, format);
      
      // Crear ZIP con JSZip
      const zip = new (window as any).JSZip();
      const fileName = `Mix_AI_Optimized_${Date.now()}.${format}`;
      zip.file(fileName, audioBlob);
      
      // Completar progreso
      setTimeout(async () => {
        clearInterval(progressInterval);
        setDownloadProgress(100);
        
        // Generar ZIP
        const zipBlob = await zip.generateAsync({ type: "blob" });
        
        // Descargar archivo ZIP DIRECTAMENTE
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `MixingMusic_AI_${format}_${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Descontar créditos del usuario LOCALMENTE
        const newCredits = user.credits - 500;
        onCreditsUpdate(newCredits);

        // NUEVO: Preparar info para el modal de créditos descontados
        setDeductedCreditsInfo({
          format: format.toUpperCase(),
          creditsDeducted: 500,
          remainingCredits: newCredits
        });

        // Resetear estado de descarga
        setIsDownloading(false);
        setDownloadFormat(null);
        setDownloadProgress(0);

        // MOSTRAR MODAL DE CRÉDITOS DESCONTADOS
        setShowCreditsDeductedModal(true);

      }, 1500 + Math.random() * 1000);

    } catch (error) {
      console.error('Error en exportación:', error);
      setIsDownloading(false);
      setDownloadFormat(null);
      setDownloadProgress(0);
      alert('Error exportando la mezcla. Intenta de nuevo.');
    }
  };

  // NUEVA función para crear otra mezcla
  const handleCreateAnotherMix = () => {
    setShowCreditsDeductedModal(false);
    setDeductedCreditsInfo(null);
    // Regresar al mezclador para crear nueva mezcla  
    onBack();
  };

  // NUEVA función para ir a comprar créditos
  const handleBuyCredits = () => {
    setShowCreditsDeductedModal(false);
    setDeductedCreditsInfo(null);
    // Navegar a la página de billing/compra de créditos
    window.location.href = '/billing';
  };

  // Handle waveform seeking
  const handleWaveformSeek = useCallback((newTime: number) => {
    if (!exportData || !exportAudioContext) return;
    
    // Stop current playback if playing
    if (isExportPlaying && exportSourceNode) {
      exportSourceNode.stop();
      exportSourceNode.disconnect();
    }
    
    // Set new position
    setExportCurrentTime(newTime);
    setExportPausedTime(newTime);
    
    // If was playing, start from new position
    if (isExportPlaying) {
      const sourceNode = exportAudioContext.createBufferSource();
      sourceNode.buffer = exportData.audioBuffer;
      sourceNode.connect(exportAudioContext.destination);

      const startTime = exportAudioContext.currentTime;
      sourceNode.start(startTime, newTime);
      setExportSourceNode(sourceNode);

      sourceNode.onended = () => {
        setIsExportPlaying(false);
        setExportPausedTime(0);
        setExportCurrentTime(0);
      };

      // Update time tracking
      if (exportTimeUpdateRef.current) {
        clearInterval(exportTimeUpdateRef.current);
      }
      
      exportTimeUpdateRef.current = window.setInterval(() => {
        const elapsed = exportAudioContext.currentTime - startTime + newTime;
        setExportCurrentTime(Math.min(elapsed, exportData.audioBuffer.duration));

        if (elapsed >= exportData.audioBuffer.duration) {
          setIsExportPlaying(false);
          setExportPausedTime(0);
          setExportCurrentTime(0);
          if (exportTimeUpdateRef.current) {
            clearInterval(exportTimeUpdateRef.current);
          }
        }
      }, 100);
    }
  }, [exportData, exportAudioContext, isExportPlaying, exportSourceNode]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (exportTimeUpdateRef.current) {
        clearInterval(exportTimeUpdateRef.current);
      }
      if (exportAudioContext) {
        exportAudioContext.close();
      }
    };
  }, [exportAudioContext]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
      <Header
        user={user}
        onLogout={() => {}}
        onCreditsUpdate={onCreditsUpdate}
      />

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
        {/* Header - Responsive */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
              🎵 Tu Mezcla Final
            </h1>
            <p className="text-gray-600 text-base lg:text-lg font-medium">
              Optimizada con IA • 44.1 kHz / 24 bits • -14 LUFS para streaming
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-4 lg:px-6 py-2 lg:py-3 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center space-x-2 whitespace-nowrap border border-white/20 backdrop-blur-sm bg-gradient-to-br from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold text-sm lg:text-base"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
          >
            <i className="ri-arrow-left-line"></i>
            <span>Volver al Mezclador</span>
          </button>
        </div>

        {/* CONDICIÓN CORREGIDA: Mostrar pantalla final cuando tenemos exportData */}
        {exportData ? (
          /* PANTALLA FINAL SIMPLIFICADA - SOLO TIMELINE + BOTONES DE DESCARGA DIRECTA */
          <div className="space-y-6 lg:space-y-8">
            
            {/* Timeline Principal - Estilo SoundCloud - Mobile Friendly */}
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-4 lg:p-8 shadow-2xl border border-orange-200/50">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 lg:mb-6 space-y-2 lg:space-y-0">
                <h3 className="text-xl lg:text-2xl font-bold text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                  🎧 Preview de tu Mezcla Final
                </h3>
                <div className="text-orange-600 text-xs lg:text-sm font-medium bg-orange-100 px-2 lg:px-3 py-1 rounded-full">
                  Procesada con IA • {exportData.finalLufs.toFixed(1)} LUFS
                </div>
              </div>
              
              {/* Waveform Principal - SoundCloud Style - Responsive */}
              <div className="bg-gradient-to-r from-orange-100/50 to-red-100/50 rounded-xl lg:rounded-2xl p-3 lg:p-6 border border-orange-200/50 mb-4 lg:mb-6">
                <canvas
                  ref={waveformCanvasRef}
                  width={800}
                  height={120}
                  className="w-full h-20 lg:h-38 rounded-xl cursor-pointer"
                  onClick={(e) => {
                    if (waveformCanvasRef.current) {
                      handleWaveformClick(
                        e,
                        waveformCanvasRef.current,
                        exportData.audioBuffer.duration,
                        handleWaveformSeek
                      );
                    }
                  }}
                />
              </div>

              {/* Controles de Reproducción - Estilo Apple Music - Mobile Friendly */}
              <div className="flex justify-center items-center space-x-3 lg:space-x-4 mb-6 lg:mb-8">
                {/* Botón Stop */}
                <button
                  onClick={handleExportStop}
                  className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white flex items-center justify-center text-lg lg:text-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 border border-white/10 backdrop-blur-sm"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
                >
                  <i className="ri-stop-fill"></i>
                </button>

                {/* Botón Play/Pause Principal */}
                <button
                  onClick={handleExportPlayPause}
                  className={`w-16 h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center text-2xl lg:text-3xl transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 border border-white/20 backdrop-blur-sm ${
                    isExportPlaying
                      ? 'bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white'
                      : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                  }`}
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
                >
                  <i className={isExportPlaying ? 'ri-pause-fill' : 'ri-play-fill'}></i>
                </button>
              </div>

              {/* Tiempo - Responsive */}
              <div className="text-center text-gray-900 font-semibold text-base lg:text-lg mb-6 lg:mb-8" style={{ fontFamily: '"SF Mono", "Monaco", "Menlo", monospace' }}>
                {Math.floor(exportCurrentTime / 60)}:{(exportCurrentTime % 60).toFixed(0).padStart(2, '0')} / {Math.floor(exportData.audioBuffer.duration / 60)}:{(exportData.audioBuffer.duration % 60).toFixed(0).padStart(2, '0')}
              </div>

              {/* BOTONES DE DESCARGA DIRECTA - Mobile Friendly */}
              <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
                <button
                  onClick={() => handleDirectDownload('mp3')}
                  disabled={isDownloading}
                  className={`px-6 lg:px-8 py-3 lg:py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center space-x-2 lg:space-x-3 whitespace-nowrap border border-white/20 backdrop-blur-sm text-sm lg:text-base ${
                    isDownloading 
                      ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white cursor-not-allowed opacity-70' 
                      : 'bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                  }`}
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
                >
                  <i className="ri-download-line text-lg lg:text-xl"></i>
                  <span className="font-semibold">Descargar .MP3 (500 créditos)</span>
                </button>

                <button
                  onClick={() => handleDirectDownload('wav')}
                  disabled={isDownloading}
                  className={`px-6 lg:px-8 py-3 lg:py-4 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center space-x-2 lg:space-x-3 whitespace-nowrap border border-white/20 backdrop-blur-sm text-sm lg:text-base ${
                    isDownloading 
                      ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white cursor-not-allowed opacity-70' 
                      : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
                  }`}
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
                >
                  <i className="ri-download-2-line text-lg lg:text-xl"></i>
                  <span className="font-semibold">Descargar .WAV (500 créditos)</span>
                </button>
              </div>

              {/* Info créditos - Responsive - SIMPLIFICADO */}
              <div className="text-center mt-4 lg:mt-6 text-gray-600 text-xs lg:text-sm font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                Descarga directa: 500 créditos • Tu saldo: {(user?.credits || 0).toLocaleString()} créditos
              </div>
            </div>

          </div>
        ) : (
          /* Processing Screen - SOLO CUANDO NO HAY exportData - Mobile Friendly */
          <div className="flex items-center justify-center min-h-96">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-8 lg:p-12 max-w-sm lg:max-w-lg w-full shadow-2xl border border-white/50">
              <div className="text-center">
                {/* Logo MixingMusic.ai estilo Apple Music */}
                <div className="w-20 h-20 lg:w-24 lg:h-24 mx-auto mb-6 lg:mb-8 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 rounded-3xl flex items-center justify-center shadow-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400/30 via-pink-400/30 to-red-400/30 animate-pulse"></div>
                  <div className="relative z-10">
                    <i className="ri-equalizer-fill text-white text-3xl lg:text-4xl animate-bounce"></i>
                  </div>
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-[shine_2s_ease-in-out_infinite]"></div>
                </div>
                
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3 lg:mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                  Procesando con IA
                </h3>
                <p className="text-gray-600 mb-4 lg:mb-6 text-base lg:text-lg font-medium">{exportStep}</p>
                <Progress value={exportProgress} className="mb-3 lg:mb-4" />
                <div className="text-blue-600 font-bold text-lg lg:text-xl" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                  {exportProgress}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE DESCARGA CON ANIMACIÓN - Mobile Friendly */}
      {isDownloading && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-8 lg:p-12 max-w-sm lg:max-w-lg w-full shadow-2xl border border-white/50">
            <div className="text-center">
              {/* Logo MixingMusic.ai Animado */}
              <div className="w-20 h-20 lg:w-24 lg:h-24 mx-auto mb-6 lg:mb-8 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 rounded-3xl flex items-center justify-center shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/30 via-pink-400/30 to-red-400/30 animate-pulse"></div>
                <div className="relative z-10">
                  <i className="ri-file-zip-line text-white text-3xl lg:text-4xl animate-bounce"></i>
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-[shine_2s_ease-in-out_infinite]"></div>
              </div>
              
              <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3 lg:mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                Creando {downloadFormat?.toUpperCase()} ZIP
              </h3>
              
              <p className="text-gray-600 mb-4 lg:mb-6 text-base lg:text-lg leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                Generando y comprimiendo tu mezcla optimizada con IA...
              </p>
              
              <Progress value={downloadProgress} className="mb-3 lg:mb-4" />
              
              <div className="text-purple-600 font-bold text-lg lg:text-xl" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                {downloadProgress}%
              </div>

              <div className="text-sm text-gray-500 mt-4">
                Se descontarán 500 créditos al completar
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NUEVO: MODAL DE CRÉDITOS DESCONTADOS - Mobile Friendly */}
      {showCreditsDeductedModal && deductedCreditsInfo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-4 lg:p-6 w-full max-w-xs lg:max-w-sm mx-4 shadow-2xl border border-gray-200/50">
            <div className="text-center">
              {/* Logo de Éxito Estilo Apple Music */}
              <div className="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-3 lg:mb-4 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20 animate-pulse"></div>
                <div className="relative z-10">
                  <i className="ri-checkbox-circle-fill text-white text-lg lg:text-2xl"></i>
                </div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent transform -skew-x-12 animate-[shine_3s_ease-in-out_infinite]"></div>
              </div>
              
              <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                ¡Descarga Completada!
              </h3>
              
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl lg:rounded-2xl p-3 lg:p-4 mb-3 lg:mb-4 border border-gray-200/50 shadow-inner">
                <div className="text-center space-y-1">
                  <div className="text-xs lg:text-sm font-bold text-gray-900">
                    📁 Formato: {deductedCreditsInfo.format}
                  </div>
                  <div className="text-red-600 font-semibold text-xs lg:text-sm">
                    -500 créditos
                  </div>
                  <div className="text-gray-700 font-medium text-xs">
                    💰 Restantes: {(deductedCreditsInfo?.remainingCredits || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <p className="text-gray-600 mb-3 lg:mb-4 text-xs leading-relaxed" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                Tu mezcla optimizada con IA ha sido descargada exitosamente.
              </p>

              {/* Opciones del usuario - Compactas y Mobile Friendly */}
              <div className="space-y-2">
                {/* Botón Crear Otra Mezcla - Solo si tiene créditos suficientes */}
                {(deductedCreditsInfo?.remainingCredits || 0) >= 500 ? (
                  <button
                    onClick={handleCreateAnotherMix}
                    className="w-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold py-2 lg:py-2.5 px-3 lg:px-4 rounded-xl lg:rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center space-x-2 text-xs lg:text-sm"
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
                  >
                    <i className="ri-add-circle-line text-sm lg:text-base"></i>
                    <span>Crear Otra Mezcla</span>
                  </button>
                ) : (
                  <div className="w-full bg-gray-300 text-gray-600 font-bold py-2 lg:py-2.5 px-3 lg:px-4 rounded-xl lg:rounded-2xl flex items-center justify-center space-x-2 cursor-not-allowed text-xs lg:text-sm">
                    <i className="ri-forbid-line text-sm lg:text-base"></i>
                    <span>Sin Créditos Suficientes</span>
                  </div>
                )}

                {/* Botón Comprar Créditos - Solo si no tiene créditos suficientes */}
                {(deductedCreditsInfo?.remainingCredits || 0) < 500 && (
                  <button
                    onClick={handleBuyCredits}
                    className="w-full bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-2 lg:py-2.5 px-3 lg:px-4 rounded-xl lg:rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center space-x-2 text-xs lg:text-sm"
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
                  >
                    <i className="ri-shopping-cart-line text-sm lg:text-base"></i>
                    <span>Comprar Más Créditos</span>
                  </button>
                )}

                {/* Botón Volver al Inicio - Compacto */}
                <button
                  onClick={() => {
                    setShowCreditsDeductedModal(false);
                    setDeductedCreditsInfo(null);
                    // Volver a la pantalla inicial
                    onBack();
                  }}
                  className="w-full bg-gradient-to-br from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-2 lg:py-2.5 px-3 lg:px-4 rounded-xl lg:rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center space-x-2 text-xs lg:text-sm"
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
                >
                  <i className="ri-home-line text-sm lg:text-base"></i>
                  <span>Volver al Inicio</span>
                </button>
              </div>

              {/* Info adicional - Compacta */}
              <div className="text-center mt-2 lg:mt-3 text-gray-500 text-xs" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                🎵 MixingMusic.AI - Powered by Advanced AI
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animación CSS personalizada */}
      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
      `}</style>
    </div>
  );
}

// Función auxiliar para crear blob de audio
async function createAudioBlob(buffer: AudioBuffer, format: 'mp3' | 'wav'): Promise<Blob> {
  const length = buffer.length;
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = format === 'wav' ? 2 : 2; // 16-bit para ambos
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize;
  
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Convert samples
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      const intSample = Math.round(sample * 32767);
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  
  const mimeType = format === 'mp3' ? 'audio/mp3' : 'audio/wav';
  return new Blob([arrayBuffer], { type: mimeType });
}

// Función para cargar JSZip dinámicamente
async function loadJSZip(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load JSZip'));
    document.head.appendChild(script);
  });
}
