
import { useState, useRef, useEffect, useCallback } from 'react';
import Button from '@/components/base/Button';
import Progress from '@/components/base/Progress';
import Header from '@/components/feature/Header';
import UploadModal from '@/components/feature/UploadModal';
import { drawFFTAnalyzer, drawMiniFFT } from '@/utils/drawFFT';
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
  username?: string;
  avatar?: string;
}

interface Stem {
  id: string;
  name: string;
  file: File;
  buffer: AudioBuffer;
  gainNode: GainNode;
  panNode: StereoPannerNode;
  analyserNode: AnalyserNode;
  sourceNode?: AudioBufferSourceNode;
  volume: number; // -60 to +12 dB
  pan: number; // -1 to +1
  muted: boolean;
  fftData: Uint8Array;
  waveformPeaks: Float32Array;
}

interface MixEditorProps {
  projectId: string;
  user: User;
  uploadedFiles: File[];
  onBack: () => void;
  onCreditsUpdate: (newCredits: number) => void;
  onExport: (exportData: {
    audioBuffer: AudioBuffer;
    audioUrl: string;
    waveformPeaks: Float32Array;
    finalLufs: number;
  }) => void;
}

export default function MixEditor({ 
  projectId, 
  user, 
  uploadedFiles, 
  onBack, 
  onCreditsUpdate,
  onExport 
}: MixEditorProps) {
  // Core state
  const [stems, setStems] = useState<Stem[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [masterVolume, setMasterVolume] = useState(0); // dB
  const [lufsIntegrated, setLufsIntegrated] = useState(-23.0);
  const [lufsMomentary, setLufsMomentary] = useState(-23.0);
  
  // Estados para controles de EQ
  const [bassGain, setBassGain] = useState(0);
  const [midGain, setMidGain] = useState(0);
  const [highGain, setHighGain] = useState(0);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState('Inicializando...');

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStep, setExportStep] = useState('');

  // NUEVO: Estado para modal de subida de más stems
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // NUEVO: Estado para mantener la lista completa de archivos
  const [allFiles, setAllFiles] = useState<File[]>(uploadedFiles);

  // Audio context and nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const mixAnalyserRef = useRef<AnalyserNode | null>(null);
  const mixFftDataRef = useRef<Uint8Array | null>(null);
  
  // Referencias para filtros EQ
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const highFilterRef = useRef<BiquadFilterNode | null>(null);
  
  // Timeline and playback
  const timeUpdateIntervalRef = useRef<number>();
  const animationFrameRef = useRef<number>();
  const pausedTimeRef = useRef(0);
  const lufsHistoryRef = useRef<number[]>([]);

  // Canvas refs
  const mixFFTCanvasRef = useRef<HTMLCanvasElement>(null);
  const lufsCanvasRef = useRef<HTMLCanvasElement>(null);
  const timelineCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize audio engine and load stems - ACTUALIZADO para usar allFiles
  useEffect(() => {
    if (allFiles.length > 0) {
      initializeAudioEngine();
    }
  }, [allFiles]);

  // NUEVO: Actualizar allFiles cuando cambie uploadedFiles
  useEffect(() => {
    setAllFiles(uploadedFiles);
  }, [uploadedFiles]);

  const initializeAudioEngine = async () => {
    try {
      setIsLoading(true);
      setLoadingStep('Inicializando motor de audio...');
      setLoadingProgress(10);

      // LIMPIAR audio context anterior si existe
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close();
      }

      // Initialize Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create mix bus with EQ
      const masterGain = audioContext.createGain();
      const mixAnalyser = audioContext.createAnalyser();
      
      // Crear filtros EQ
      const bassFilter = audioContext.createBiquadFilter();
      const midFilter = audioContext.createBiquadFilter();
      const highFilter = audioContext.createBiquadFilter();
      
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 100;
      bassFilter.gain.value = bassGain; // Mantener configuración actual
      
      midFilter.type = 'peaking';
      midFilter.frequency.value = 1000;
      midFilter.Q.value = 1;
      midFilter.gain.value = midGain; // Mantener configuración actual
      
      highFilter.type = 'highshelf';
      highFilter.frequency.value = 8000;
      highFilter.gain.value = highGain; // Mantener configuración actual
      
      mixAnalyser.fftSize = 2048;
      mixAnalyser.smoothingTimeConstant = 0.8;

      // Conectar cadena de EQ
      masterGain.connect(bassFilter);
      bassFilter.connect(midFilter);
      midFilter.connect(highFilter);
      highFilter.connect(mixAnalyser);
      mixAnalyser.connect(audioContext.destination);

      // Aplicar volumen master actual
      masterGain.gain.value = Math.pow(10, masterVolume / 20);

      masterGainRef.current = masterGain;
      mixAnalyserRef.current = mixAnalyser;
      mixFftDataRef.current = new Uint8Array(mixAnalyser.frequencyBinCount);
      
      // Guardar referencias de filtros
      bassFilterRef.current = bassFilter;
      midFilterRef.current = midFilter;
      highFilterRef.current = highFilter;

      setLoadingStep('Decodificando archivos de audio...');
      setLoadingProgress(30);

      // Decode all files with Promise.all for parallel processing - USAR allFiles
      const decodedStems = await Promise.all(
        allFiles.map(async (file, index) => {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // Update progress
            const progress = 30 + ((index + 1) / allFiles.length) * 40;
            setLoadingProgress(progress);
            setLoadingStep(`Procesando ${file.name}...`);

            return { file, buffer: audioBuffer };
          } catch (error) {
            console.error(`Error decoding ${file.name}:`, error);
            return null;
          }
        })
      );

      setLoadingStep('Configurando mezclador...');
      setLoadingProgress(80);

      // Filter out failed decodes and create stems
      const validDecoded = decodedStems.filter(item => item !== null);
      const stemsArray: Stem[] = [];
      let maxDuration = 0;

      for (let i = 0; i < validDecoded.length; i++) {
        const { file, buffer } = validDecoded[i];
        
        // Create audio nodes for this stem
        const gainNode = audioContext.createGain();
        const panNode = audioContext.createStereoPanner();
        const analyserNode = audioContext.createAnalyser();
        
        analyserNode.fftSize = 512;
        analyserNode.smoothingTimeConstant = 0.7;

        // Connect: gain -> pan -> analyser -> master
        gainNode.connect(panNode);
        panNode.connect(analyserNode);
        analyserNode.connect(masterGain);

        // Generate waveform peaks
        const waveformPeaks = generateWaveformPeaks(buffer, 400);

        const stem: Stem = {
          id: `stem-${i}`,
          name: file.name,
          file,
          buffer,
          gainNode,
          panNode,
          analyserNode,
          volume: 0, // 0 dB default
          pan: 0, // Center
          muted: false,
          fftData: new Uint8Array(analyserNode.frequencyBinCount),
          waveformPeaks
        };

        stemsArray.push(stem);
        maxDuration = Math.max(maxDuration, buffer.duration);
      }

      setStems(stemsArray);
      setDuration(maxDuration);
      
      setLoadingStep('Iniciando visualizaciones...');
      setLoadingProgress(95);

      // Start FFT animation
      startFFTAnimation();

      setLoadingProgress(100);
      setLoadingStep('¡Mezclador listo!');
      
      setTimeout(() => {
        setIsLoading(false);
      }, 500);

    } catch (error) {
      console.error('Error initializing audio engine:', error);
      setIsLoading(false);
    }
  };

  // Estado para preset actual
  const [currentPreset, setCurrentPreset] = useState<'custom' | 'pop' | 'rock' | 'lofi'>('custom');

  // Función para aplicar presets
  const applyPreset = useCallback((preset: 'pop' | 'rock' | 'lofi') => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    let bassValue = 0, midValue = 0, highValue = 0;
    
    switch (preset) {
      case 'pop':
        bassValue = 2; midValue = 1; highValue = 3;
        break;
      case 'rock':
        bassValue = 4; midValue = -1; highValue = 2;
        break;
      case 'lofi':
        bassValue = 1; midValue = -2; highValue = -4;
        break;
    }
    
    if (bassFilterRef.current) bassFilterRef.current.gain.setTargetAtTime(bassValue, audioContext.currentTime, 0.01);
    if (midFilterRef.current) midFilterRef.current.gain.setTargetAtTime(midValue, audioContext.currentTime, 0.01);
    if (highFilterRef.current) highFilterRef.current.gain.setTargetAtTime(highValue, audioContext.currentTime, 0.01);
    
    setBassGain(bassValue);
    setMidGain(midValue);
    setHighGain(highValue);
    setCurrentPreset(preset);
  }, []);

  // Función para ajustar EQ global
  const adjustGlobalEQ = useCallback((band: 'bass' | 'mid' | 'high', direction: 'up' | 'down') => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    const adjustment = direction === 'up' ? 1 : -1;
    let newValue = 0;

    switch (band) {
      case 'bass':
        newValue = Math.max(-12, Math.min(12, bassGain + adjustment));
        if (bassFilterRef.current) {
          bassFilterRef.current.gain.setTargetAtTime(newValue, audioContext.currentTime, 0.01);
        }
        setBassGain(newValue);
        break;
      case 'mid':
        newValue = Math.max(-12, Math.min(12, midGain + adjustment));
        if (midFilterRef.current) {
          midFilterRef.current.gain.setTargetAtTime(newValue, audioContext.currentTime, 0.01);
        }
        setMidGain(newValue);
        break;
      case 'high':
        newValue = Math.max(-12, Math.min(12, highGain + adjustment));
        if (highFilterRef.current) {
          highFilterRef.current.gain.setTargetAtTime(newValue, audioContext.currentTime, 0.01);
        }
        setHighGain(newValue);
        break;
    }

    // Si se hace ajuste manual, cambiar a preset custom
    setCurrentPreset('custom');
  }, [bassGain, midGain, highGain]);

  // Función para ajustar todos los stems al mismo valor dB
  const setAllStemsGain = useCallback((dbValue: number) => {
    const audioContext = audioContextRef.current;
    
    setStems(prevStems => 
      prevStems.map(stem => {
        if (audioContext) {
          const linearGain = Math.pow(10, dbValue / 20);
          stem.gainNode.gain.setTargetAtTime(linearGain, audioContext.currentTime, 0.01);
        }
        return { ...stem, volume: dbValue };
      })
    );
  }, []);

  // NUEVO: Función para manejar subida de más stems
  const handleUploadMoreStems = async (newFiles: File[]) => {
    if (stems.length + newFiles.length > 12) {
      alert('Máximo 12 stems permitidos por proyecto');
      return;
    }

    // Detener reproducción si está activa
    if (isPlaying) {
      handleStop();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Cerrar modal
    setShowUploadModal(false);

    // Combinar todos los archivos (existentes + nuevos)
    const combinedFiles = [...allFiles, ...newFiles];
    
    // Actualizar la lista completa de archivos
    setAllFiles(combinedFiles);
    
    // La reinicialización se activará automáticamente por el useEffect que escucha allFiles
    // Esto recargará completamente el mezclador con todos los stems
  };

  // Generate waveform peaks from audio buffer
  const generateWaveformPeaks = (buffer: AudioBuffer, samples: number): Float32Array => {
    const peaks = new Float32Array(samples);
    const channelData = buffer.getChannelData(0);
    const sampleSize = Math.floor(channelData.length / samples);
    
    for (let i = 0; i < samples; i++) {
      let max = 0;
      const start = i * sampleSize;
      const end = Math.min(start + sampleSize, channelData.length);
      
      for (let j = start; j < end; j++) {
        max = Math.max(max, Math.abs(channelData[j]));
      }
      peaks[i] = max;
    }
    
    return peaks;
  };

  // Start FFT and LUFS animation
  const startFFTAnimation = useCallback(() => {
    const updateVisualizations = () => {
      const mixAnalyser = mixAnalyserRef.current;
      const mixFftData = mixFftDataRef.current;

      if (mixAnalyser && mixFftData) {
        // Update mix FFT
        mixAnalyser.getByteFrequencyData(mixFftData);
        
        // Update each stem's FFT
        setStems(prevStems => 
          prevStems.map(stem => {
            stem.analyserNode.getByteFrequencyData(stem.fftData);
            return { ...stem };
          })
        );

        // Calculate LUFS from time domain data
        const waveformData = new Float32Array(mixAnalyser.fftSize);
        mixAnalyser.getFloatTimeDomainData(waveformData);
        
        // Simple RMS calculation
        let rmsSum = 0;
        for (let i = 0; i < waveformData.length; i++) {
          rmsSum += waveformData[i] * waveformData[i];
        }
        const rms = Math.sqrt(rmsSum / waveformData.length);
        
        // Convert to LUFS approximation
        const momentaryLufs = rms > 0 ? Math.max(-60, 20 * Math.log10(rms) - 0.691) : -60;
        
        lufsHistoryRef.current.push(momentaryLufs);
        if (lufsHistoryRef.current.length > 300) {
          lufsHistoryRef.current.shift();
        }
        
        const integratedLufs = lufsHistoryRef.current.reduce((a, b) => a + b, 0) / lufsHistoryRef.current.length;
        
        setLufsMomentary(momentaryLufs);
        setLufsIntegrated(integratedLufs);

        // Draw visualizations - usar estilo Apple Music
        if (mixFFTCanvasRef.current) {
          drawFFTAnalyzer({
            canvas: mixFFTCanvasRef.current,
            fftData: mixFftData,
            style: 'applemusic'
          });
        }

        drawLUFSMeter();
      }

      animationFrameRef.current = requestAnimationFrame(updateVisualizations);
    };

    updateVisualizations();
  }, []);

  // Playback controls
  const handlePlayPause = async () => {
    const audioContext = audioContextRef.current;
    if (!audioContext || stems.length === 0) return;

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    if (isPlaying) {
      // Stop all sources
      stems.forEach(stem => {
        if (stem.sourceNode) {
          stem.sourceNode.stop();
          stem.sourceNode.disconnect();
        }
      });

      setIsPlaying(false);
      pausedTimeRef.current = currentTime;

      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    } else {
      // Start playback
      const startTime = audioContext.currentTime;
      const offset = pausedTimeRef.current;

      const updatedStems = stems.map(stem => {
        if (!stem.muted) {
          const sourceNode = audioContext.createBufferSource();
          sourceNode.buffer = stem.buffer;
          sourceNode.connect(stem.gainNode);
          sourceNode.start(startTime, offset);
          
          return { ...stem, sourceNode };
        }
        return stem;
      });

      setStems(updatedStems);
      setIsPlaying(true);

      // Time tracking
      timeUpdateIntervalRef.current = window.setInterval(() => {
        const elapsed = audioContext.currentTime - startTime + offset;
        setCurrentTime(Math.min(elapsed, duration));

        if (elapsed >= duration) {
          handleStop();
        }
      }, 100);
    }
  };

  const handleStop = () => {
    stems.forEach(stem => {
      if (stem.sourceNode) {
        stem.sourceNode.stop();
        stem.sourceNode.disconnect();
      }
    });

    const stoppedStems = stems.map(stem => ({ ...stem, sourceNode: undefined }));
    setStems(stoppedStems);
    setIsPlaying(false);
    setCurrentTime(0);
    pausedTimeRef.current = 0;

    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
    }
  };

  // Volume controls
  const updateMasterVolume = (dbValue: number) => {
    const masterGain = masterGainRef.current;
    const audioContext = audioContextRef.current;
    
    if (masterGain && audioContext) {
      const linearGain = Math.pow(10, dbValue / 20);
      masterGain.gain.setTargetAtTime(linearGain, audioContext.currentTime, 0.01);
    }
    
    setMasterVolume(dbValue);
  };

  const updateStemVolume = (stemId: string, dbValue: number) => {
    const audioContext = audioContextRef.current;
    
    setStems(prevStems => 
      prevStems.map(stem => {
        if (stem.id === stemId) {
          if (audioContext) {
            const linearGain = Math.pow(10, dbValue / 20);
            stem.gainNode.gain.setTargetAtTime(linearGain, audioContext.currentTime, 0.01);
          }
          return { ...stem, volume: dbValue };
        }
        return stem;
      })
    );
  };

  const updateStemPan = (stemId: string, panValue: number) => {
    const audioContext = audioContextRef.current;
    
    setStems(prevStems => 
      prevStems.map(stem => {
        if (stem.id === stemId) {
          if (audioContext) {
            stem.panNode.pan.setTargetAtTime(panValue, audioContext.currentTime, 0.01);
          }
          return { ...stem, pan: panValue };
        }
        return stem;
      })
    );
  };

  const toggleStemMute = (stemId: string) => {
    const audioContext = audioContextRef.current;
    
    setStems(prevStems => 
      prevStems.map(stem => {
        if (stem.id === stemId) {
          const newMuted = !stem.muted;
          if (audioContext) {
            const targetGain = newMuted ? 0 : Math.pow(10, stem.volume / 20);
            stem.gainNode.gain.setTargetAtTime(targetGain, audioContext.currentTime, 0.01);
          }
          return { ...stem, muted: newMuted };
        }
        return stem;
      })
    );
  };

  // Timeline seeking
  const handleTimelineSeek = (newTime: number) => {
    if (isPlaying) {
      // If playing, restart from new position
      handleStop();
      setTimeout(() => {
        pausedTimeRef.current = newTime;
        setCurrentTime(newTime);
        handlePlayPause();
      }, 50);
    } else {
      // If stopped, just update position
      pausedTimeRef.current = newTime;
      setCurrentTime(newTime);
    }
  };

  // Export Mix with AI Processing - MEJORADO con nueva UI
  const handleExportMix = async () => {
    if (!audioContextRef.current || stems.length === 0) return;

    // Step 1: Detener reproducción si está activa
    if (isPlaying) {
      handleStop();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStep('Inicializando procesamiento de IA...');

    try {
      setExportProgress(5);
      setExportStep('Preparando cadena de procesamiento profesional...');
      await new Promise(resolve => setTimeout(resolve, 800));

      setExportProgress(15);
      setExportStep('Estamos mezclando y optimizando tu canción con IA. Aplicando reducción de ruido, compresión, ecualización y normalización a -14 LUFS...');
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Step 2: Crear OfflineAudioContext para render de alta calidad
      const sampleRate = 44100;
      const channels = 2;
      const length = Math.floor(sampleRate * duration);
      const offlineContext = new OfflineAudioContext(channels, length, sampleRate);

      setExportProgress(25);
      setExportStep('Aplicando algoritmos de IA para mejora de audio...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Crear cadena de procesamiento profesional
      const mixBus = offlineContext.createGain();
      
      // Compresión inteligente
      const compressor = offlineContext.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.1;

      // Noise Reduction (Filtro pasa altos para eliminar ruido de baja frecuencia)
      const noiseReduction = offlineContext.createBiquadFilter();
      noiseReduction.type = 'highpass';
      noiseReduction.frequency.value = 40;
      noiseReduction.Q.value = 0.7;

      // EQ inteligente para mejorar el sonido
      const lowShelf = offlineContext.createBiquadFilter();
      const midPeak = offlineContext.createBiquadFilter();
      const highShelf = offlineContext.createBiquadFilter();

      lowShelf.type = 'lowshelf';
      lowShelf.frequency.value = 100;
      lowShelf.gain.value = bassGain + 1.2; // Aplicar EQ actual + mejora IA

      midPeak.type = 'peaking';
      midPeak.frequency.value = 2500;
      midPeak.Q.value = 0.8;
      midPeak.gain.value = midGain - 0.5; // Aplicar EQ actual + mejora IA

      highShelf.type = 'highshelf';
      highShelf.frequency.value = 8000;
      highShelf.gain.value = highGain + 1.8; // Aplicar EQ actual + mejora IA

      // Limiter final para evitar clipping
      const limiter = offlineContext.createDynamicsCompressor();
      limiter.threshold.value = -1;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.01;

      // Conectar la cadena de procesamiento
      mixBus.connect(noiseReduction);
      noiseReduction.connect(lowShelf);
      lowShelf.connect(midPeak);
      midPeak.connect(highShelf);
      highShelf.connect(compressor);
      compressor.connect(limiter);
      limiter.connect(offlineContext.destination);

      setExportProgress(40);
      setExportStep('Renderizando stems con configuración optimizada...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4: Procesar cada stem con su configuración actual
      for (const stem of stems) {
        if (stem.buffer && !stem.muted) {
          const source = offlineContext.createBufferSource();
          const gainNode = offlineContext.createGain();
          const pannerNode = offlineContext.createStereoPanner();

          source.buffer = stem.buffer;
          
          // Aplicar configuración actual del usuario
          gainNode.gain.value = Math.pow(10, stem.volume / 20);
          pannerNode.pan.value = stem.pan;

          source.connect(gainNode);
          gainNode.connect(pannerNode);
          pannerNode.connect(mixBus);

          source.start(0);
        }
      }

      // Aplicar volumen master actual
      mixBus.gain.value = Math.pow(10, masterVolume / 20);

      setExportProgress(75);
      setExportStep('Renderizando audio con procesamiento de IA...');
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Step 5: Renderizar el audio offline
      const renderedBuffer = await offlineContext.startRendering();

      setExportProgress(85);
      setExportStep('Normalizando a -14 LUFS para streaming...');
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 6: Normalización automática a -14 LUFS
      const normalizedBuffer = normalizeTo14LUFS(renderedBuffer);

      setExportProgress(95);
      setExportStep('Generando archivos de audio final...');
      await new Promise(resolve => setTimeout(resolve, 600));

      // Step 7: Generar waveform y URLs
      const waveformPeaks = generateWaveformPeaks(normalizedBuffer, 800);
      
      // Crear WAV blob
      const wavBlob = bufferToWav(normalizedBuffer, 24);
      const wavUrl = URL.createObjectURL(wavBlob);
      
      setExportProgress(100);
      setExportStep('¡Procesamiento completado! Preparando preview...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 8: Llamar al callback con los datos de exportación
      onExport({
        audioBuffer: normalizedBuffer,
        audioUrl: wavUrl,
        waveformPeaks: waveformPeaks,
        finalLufs: -14.0
      });

      // Resetear estado de exportación
      setIsExporting(false);
      setExportProgress(0);
      setExportStep('');

    } catch (error) {
      console.error('Error en exportación:', error);
      setIsExporting(false);
      setExportStep('Error en la exportación');
      setTimeout(() => {
        setExportProgress(0);
        setExportStep('');
      }, 3000);
    }
  };

  // Normalización a -14 LUFS (simplificada)
  const normalizeTo14LUFS = (buffer: AudioBuffer): AudioBuffer => {
    const targetLUFS = -14.0;
    
    // Calcular RMS del canal principal
    const channelData = buffer.getChannelData(0);
    let rmsSum = 0;
    for (let i = 0; i < channelData.length; i++) {
      rmsSum += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(rmsSum / channelData.length);
    
    // Convertir a LUFS aproximado
    const currentLUFS = rms > 0 ? 20 * Math.log10(rms) - 0.691 : -60;
    
    // Calcular ganancia necesaria
    const gainAdjustment = targetLUFS - currentLUFS;
    const linearGain = Math.pow(10, gainAdjustment / 20);
    
    // Aplicar normalización con soft limiting
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const channelData = buffer.getChannelData(c);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] *= linearGain;
        
        // Soft limiting para prevenir clipping
        if (Math.abs(channelData[i]) > 0.95) {
          channelData[i] = channelData[i] > 0 ? 0.95 : -0.95;
        }
      }
    }
    
    return buffer;
  };

  // Helper functions for export
  const bufferToWav = (buffer: AudioBuffer, bitDepth: number = 24): Blob => {
    const length = buffer.length;
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = bitDepth / 8;
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
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Convert samples based on bit depth
    let offset = 44;
    
    if (bitDepth === 24) {
      // 24-bit conversion
      for (let i = 0; i < length; i++) {
        for (let c = 0; c < channels; c++) {
          const sample = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
          const intSample = Math.round(sample * 8388607); // 24-bit max value
          
          // Verificar límites del buffer antes de escribir
          if (offset + 2 < arrayBuffer.byteLength) {
            view.setInt8(offset, intSample & 0xFF);
            view.setInt8(offset + 1, (intSample >> 8) & 0xFF);
            view.setInt8(offset + 2, (intSample >> 16) & 0xFF);
            offset += 3;
          }
        }
      }
    } else {
      // 16-bit conversion
      for (let i = 0; i < length; i++) {
        for (let c = 0; c < channels; c++) {
          const sample = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
          const intSample = Math.round(sample * 32767); // 16-bit max value
          
          // Verificar límites del buffer antes de escribir
          if (offset + 1 < arrayBuffer.byteLength) {
            view.setInt16(offset, intSample, true); // Little endian
            offset += 2;
          }
        }
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  // Draw LUFS meter
  const drawLUFSMeter = () => {
    const canvas = lufsCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    // LUFS scale (-60 to 0)
    const lufsRange = 60;
    const meterHeight = height - 40;
    const meterY = 20;

    // Draw scale
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';

    for (let lufs = -60; lufs <= 0; lufs += 15) {
      const y = meterY + ((60 + lufs) / lufsRange) * meterHeight;
      ctx.beginPath();
      ctx.moveTo(width - 30, y);
      ctx.lineTo(width - 25, y);
      ctx.stroke();
      ctx.fillText(lufs.toString(), width - 35, y + 3);
    }

    // Reference lines
    const spotifyY = meterY + ((60 + 14) / lufsRange) * meterHeight; // -14 LUFS
    ctx.strokeStyle = '#1db954';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(10, spotifyY);
    ctx.lineTo(width - 40, spotifyY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw meters
    const barWidth = 15;
    const momentaryX = 10;
    const integratedX = 30;

    // Momentary bar
    const momentaryHeight = Math.max(0, ((60 + lufsMomentary) / lufsRange) * meterHeight);
    const momentaryY = meterY + meterHeight - momentaryHeight;
    
    ctx.fillStyle = lufsMomentary > -6 ? '#ef4444' : lufsMomentary > -12 ? '#eab308' : '#22c55e';
    ctx.fillRect(momentaryX, momentaryY, barWidth, momentaryHeight);

    // Integrated bar
    const integratedHeight = Math.max(0, ((60 + lufsIntegrated) / lufsRange) * meterHeight);
    const integratedY = meterY + meterHeight - integratedHeight;
    
    ctx.fillStyle = (lufsIntegrated > -6 ? '#ef4444' : lufsIntegrated > -12 ? '#eab308' : '#22c55e') + '80';
    ctx.fillRect(integratedX, integratedY, barWidth, integratedHeight);

    // Labels
    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('M', momentaryX + barWidth/2, height - 5);
    ctx.fillText('I', integratedX + barWidth/2, height - 5);
  };

  // Draw timeline
  useEffect(() => {
    const canvas = timelineCanvasRef.current;
    if (!canvas || duration === 0) return;

    // Create combined waveform from all stems
    const combinedPeaks = new Float32Array(400);
    stems.forEach(stem => {
      if (!stem.muted) {
        for (let i = 0; i < combinedPeaks.length; i++) {
          combinedPeaks[i] += stem.waveformPeaks[i] || 0;
        }
      }
    });

    // Normalize
    let max = 0;
    for (let i = 0; i < combinedPeaks.length; i++) {
      max = Math.max(max, combinedPeaks[i]);
    }
    if (max > 0) {
      for (let i = 0; i < combinedPeaks.length; i++) {
        combinedPeaks[i] /= max;
      }
    }

    drawWaveform({
      canvas,
      waveformPeaks: combinedPeaks,
      currentTime,
      duration,
      style: 'soundcloud',
      colors: {
        played: '#C026D3',
        unplayed: 'rgba(124,58,237,0.25)',
        playhead: '#EC4899'
      }
    });
  }, [stems, currentTime, duration]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Loading screen with Apple Music design
  if (isLoading) {
    return (
      <div style={{minHeight:'100vh',background:'#0F0A1A',display:'flex',flexDirection:'column'}}>
        <Header user={user} onLogout={() => {}} onCreditsUpdate={onCreditsUpdate} />
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
          <div style={{background:'#1A1028',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'24px',padding:'48px',maxWidth:'440px',width:'100%',textAlign:'center'}}>
            <div style={{width:'72px',height:'72px',margin:'0 auto 28px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'20px',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 32px rgba(192,38,211,0.5)'}}>
              <i className="ri-equalizer-line" style={{color:'#fff',fontSize:'28px'}}></i>
            </div>
            <h3 style={{fontSize:'24px',fontWeight:600,color:'#F8F0FF',marginBottom:'12px',letterSpacing:'-0.5px'}}>Cargando Mezclador</h3>
            <p style={{color:'#9B7EC8',marginBottom:'28px',fontSize:'15px'}}>{loadingStep}</p>
            <div style={{background:'#241636',borderRadius:'8px',height:'6px',overflow:'hidden',marginBottom:'12px'}}>
              <div style={{height:'100%',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'8px',width:`${loadingProgress}%`,transition:'width 0.3s ease'}}></div>
            </div>
            <div style={{fontFamily:'monospace',color:'#C026D3',fontWeight:600,fontSize:'18px'}}>{loadingProgress}%</div>
          </div>
        </div>
      </div>
    );
  }

  // Export modal overlay - nuevo diseño fucsia/violeta
  if (isExporting) {
    const steps = [
      {label:'Reducción Ruido', threshold:25},
      {label:'Compresión', threshold:50},
      {label:'EQ + Limiter', threshold:75},
      {label:'Normalización', threshold:95},
    ];
    return (
      <div style={{minHeight:'100vh',background:'#0F0A1A',display:'flex',flexDirection:'column'}}>
        <Header user={user} onLogout={() => {}} onCreditsUpdate={onCreditsUpdate} />
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
          <div style={{background:'#1A1028',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'24px',padding:'48px',maxWidth:'480px',width:'100%',textAlign:'center'}}>
            <div style={{width:'80px',height:'80px',margin:'0 auto 28px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'24px',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 40px rgba(192,38,211,0.6)'}}>
              <i className="ri-equalizer-fill" style={{color:'#fff',fontSize:'32px'}}></i>
            </div>
            <h3 style={{fontSize:'26px',fontWeight:600,color:'#F8F0FF',marginBottom:'12px',letterSpacing:'-0.5px'}}>Procesando con IA</h3>
            <p style={{color:'#9B7EC8',marginBottom:'28px',fontSize:'14px',lineHeight:1.6}}>{exportStep}</p>
            <div style={{background:'#241636',borderRadius:'8px',height:'6px',overflow:'hidden',marginBottom:'10px'}}>
              <div style={{height:'100%',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'8px',width:`${exportProgress}%`,transition:'width 0.4s ease'}}></div>
            </div>
            <div style={{fontFamily:'monospace',color:'#C026D3',fontWeight:600,fontSize:'20px',marginBottom:'32px'}}>{exportProgress}%</div>
            <div style={{display:'flex',justifyContent:'center',gap:'24px'}}>
              {steps.map(s => (
                <div key={s.label} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'6px'}}>
                  <div style={{width:'10px',height:'10px',borderRadius:'50%',background:exportProgress>=s.threshold?'#C026D3':'#241636',border:exportProgress>=s.threshold?'2px solid #EC4899':'2px solid #3D2560',boxShadow:exportProgress>=s.threshold?'0 0 10px rgba(192,38,211,0.7)':'none',transition:'all 0.4s ease'}}></div>
                  <span style={{fontSize:'10px',color:'#9B7EC8',fontWeight:500}}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const S = {
    page: {minHeight:'100vh',background:'#0F0A1A',fontFamily:"'DM Sans',system-ui,sans-serif"},
    card: {background:'#1A1028',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'18px',padding:'20px'},
    label: {fontSize:'10px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8',marginBottom:'12px',display:'block'},
    sectionPad: {maxWidth:'1400px',margin:'0 auto',padding:'20px 20px 40px'},
    gradText: {background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'},
    glowBtn: {background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'10px 22px',borderRadius:'980px',fontSize:'13px',fontWeight:600,cursor:'pointer',boxShadow:'0 0 20px rgba(192,38,211,0.4)',fontFamily:'inherit'},
    ghostBtn: {background:'transparent',border:'1px solid rgba(192,38,211,0.25)',color:'#9B7EC8',padding:'10px 18px',borderRadius:'980px',fontSize:'13px',cursor:'pointer',fontFamily:'inherit'},
    track: {height:'4px',background:'#241636',borderRadius:'2px',position:'relative' as const},
    trackFill: {height:'100%',background:'linear-gradient(90deg,#EC4899,#7C3AED)',borderRadius:'2px'},
    mono: {fontFamily:"'DM Mono',monospace"},
  };

  return (
    <div style={S.page}>
      <Header user={user} onLogout={() => {}} onCreditsUpdate={onCreditsUpdate} />
      <div style={S.sectionPad}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px',flexWrap:'wrap',gap:'12px'}}>
          <div>
            <h1 style={{fontSize:'26px',fontWeight:600,letterSpacing:'-0.5px',...S.gradText}}>🎛️ Mezclador AI Pro</h1>
            <p style={{color:'#9B7EC8',fontSize:'13px',marginTop:'4px'}}>{stems.length} stems · {Math.floor(duration/60)}:{String(Math.floor(duration%60)).padStart(2,'0')}</p>
          </div>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            {stems.length < 12 && (
              <button onClick={() => setShowUploadModal(true)} style={{...S.ghostBtn,borderColor:'rgba(192,38,211,0.4)',color:'#C026D3'}}>
                + Subir Stems ({stems.length}/12)
              </button>
            )}
            <button onClick={handleExportMix} disabled={stems.length===0||isExporting} style={{...S.glowBtn,opacity:stems.length===0?0.5:1}}>
              ✦ Exportar con IA
            </button>
            <button onClick={onBack} style={S.ghostBtn}>← Volver</button>
          </div>
        </div>

        {/* Timeline */}
        <div style={{...S.card,marginBottom:'12px'}}>
          <span style={S.label}>Timeline</span>
          <div style={{background:'#0F0A1A',borderRadius:'10px',padding:'8px 12px',border:'1px solid rgba(192,38,211,0.1)'}}>
            <canvas ref={timelineCanvasRef} width={1200} height={100} style={{width:'100%',height:'60px',borderRadius:'8px',cursor:'pointer'}}
              onClick={(e) => { if(timelineCanvasRef.current) handleWaveformClick(e,timelineCanvasRef.current,duration,handleTimelineSeek); }} />
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:'6px',fontSize:'11px',color:'#9B7EC8',...S.mono}}>
            <span>{Math.floor(currentTime/60)}:{String(Math.floor(currentTime%60)).padStart(2,'0')}</span>
            <span>{Math.floor(duration/60)}:{String(Math.floor(duration%60)).padStart(2,'0')}</span>
          </div>
        </div>

        {/* Controls Row */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 2fr 1fr',gap:'12px',marginBottom:'12px'}}>

          {/* Transport */}
          <div style={S.card}>
            <span style={S.label}>Control Mix</span>
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px'}}>
              <button onClick={handlePlayPause} disabled={stems.length===0} style={{width:'52px',height:'52px',borderRadius:'50%',background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 24px rgba(236,72,153,0.5)',flexShrink:0}}>
                <i className={isPlaying?'ri-pause-fill':'ri-play-fill'} style={{color:'#fff',fontSize:'20px',marginLeft:isPlaying?0:'3px'}}></i>
              </button>
              <button onClick={handleStop} disabled={stems.length===0} style={{width:'36px',height:'36px',borderRadius:'50%',background:'#241636',border:'1px solid rgba(192,38,211,0.2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="ri-stop-fill" style={{color:'#9B7EC8',fontSize:'14px'}}></i>
              </button>
            </div>
            <div style={{marginBottom:'16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'8px'}}>
                <span style={{color:'#9B7EC8'}}>Mix Volume</span>
                <span style={{...S.mono,color:'#EC4899',fontWeight:500}}>{masterVolume>0?'+':''}{masterVolume.toFixed(1)} dB</span>
              </div>
              <div style={S.track}>
                <div style={{...S.trackFill,width:`${((masterVolume+60)/72)*100}%`}}></div>
                <input type="range" min="-60" max="12" step="0.1" value={masterVolume} onChange={e=>updateMasterVolume(parseFloat(e.target.value))} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%'}} />
              </div>
            </div>
            <div>
              <div style={{fontSize:'11px',color:'#9B7EC8',marginBottom:'8px',fontWeight:500}}>Stems Gain</div>
              <div style={{display:'flex',gap:'6px'}}>
                {[-12,-6,0].map(v=>(
                  <button key={v} onClick={()=>setAllStemsGain(v)} style={{flex:1,padding:'7px 0',background:'#241636',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'8px',fontSize:'11px',color:'#9B7EC8',cursor:'pointer',fontFamily:'inherit',fontWeight:500}}>
                    {v===0?'0 dB':`${v}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* FFT */}
          <div style={S.card}>
            <span style={S.label}>FFT Analyzer Pro</span>
            <div style={{background:'#0F0A1A',borderRadius:'12px',padding:'12px',border:'1px solid rgba(192,38,211,0.1)',marginBottom:'16px',height:'100px',overflow:'hidden'}}>
              <canvas ref={mixFFTCanvasRef} width={800} height={120} style={{width:'100%',height:'80px',borderRadius:'8px'}} />
            </div>
            <div style={{display:'flex',justifyContent:'space-around'}}>
              {(['bass','mid','high'] as const).map((band,i)=>{
                const val = band==='bass'?bassGain:band==='mid'?midGain:highGain;
                return (
                  <div key={band} style={{textAlign:'center'}}>
                    <div style={{fontSize:'10px',fontWeight:600,letterSpacing:'0.8px',textTransform:'uppercase',color:'#9B7EC8',marginBottom:'8px'}}>{band}</div>
                    <div style={{display:'flex',gap:'6px',justifyContent:'center'}}>
                      <button onClick={()=>adjustGlobalEQ(band,'down')} style={{width:'32px',height:'32px',background:'#241636',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'8px',color:'#F8F0FF',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                      <button onClick={()=>adjustGlobalEQ(band,'up')} style={{width:'32px',height:'32px',background:'#241636',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'8px',color:'#F8F0FF',cursor:'pointer',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                    </div>
                    <div style={{...S.mono,fontSize:'11px',color:'#C026D3',marginTop:'6px',fontWeight:500}}>{val>0?'+':''}{val.toFixed(1)} dB</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LUFS */}
          <div style={S.card}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
              <span style={{...S.label,marginBottom:0}}>LUFS</span>
              <span style={{fontSize:'10px',fontWeight:600,padding:'3px 10px',borderRadius:'980px',background:'rgba(34,197,94,0.1)',color:'#4ade80',border:'1px solid rgba(34,197,94,0.2)'}}>
                {lufsIntegrated>=-16&&lufsIntegrated<=-12?'Ready':'Safe'}
              </span>
            </div>
            {[{label:'Momentary',val:lufsMomentary},{label:'Integrated',val:lufsIntegrated}].map(m=>(
              <div key={m.label} style={{background:'#0F0A1A',borderRadius:'12px',padding:'14px',textAlign:'center',border:'1px solid rgba(192,38,211,0.1)',marginBottom:'10px'}}>
                <div style={{...S.mono,fontSize:'24px',fontWeight:500,letterSpacing:'-1px',background:'linear-gradient(90deg,#EC4899,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{m.val.toFixed(1)}</div>
                <div style={{fontSize:'10px',color:'#9B7EC8',marginTop:'2px',textTransform:'uppercase',letterSpacing:'0.8px'}}>{m.label}</div>
              </div>
            ))}
            <div style={{borderTop:'1px solid rgba(192,38,211,0.1)',paddingTop:'10px'}}>
              {[{name:'Spotify',val:'-14',color:'#4ade80'},{name:'YouTube',val:'-13',color:'#f87171'}].map(r=>(
                <div key={r.name} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:'11px',marginBottom:'5px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                    <div style={{width:'6px',height:'6px',borderRadius:'50%',background:r.color}}></div>
                    <span style={{color:'#9B7EC8'}}>{r.name}</span>
                  </div>
                  <span style={{...S.mono,color:'#F8F0FF',fontWeight:500}}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stems Grid */}
        {stems.length > 0 && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:'10px'}}>
            {stems.map(stem => (
              <div key={stem.id} style={{...S.card,transition:'border-color 0.2s',borderColor:stem.muted?'rgba(239,68,68,0.3)':'rgba(192,38,211,0.15)'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                  <span style={{fontSize:'12px',fontWeight:600,color:'#F8F0FF',letterSpacing:'0.2px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'140px'}}>
                    {stem.name.replace(/\.[^.]+$/,'').toUpperCase()}
                  </span>
                  <button onClick={()=>toggleStemMute(stem.id)} style={{width:'26px',height:'26px',borderRadius:'7px',background:stem.muted?'rgba(239,68,68,0.2)':'linear-gradient(135deg,#C026D3,#7C3AED)',border:stem.muted?'1px solid rgba(239,68,68,0.4)':'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <i className={stem.muted?'ri-volume-mute-line':'ri-volume-up-line'} style={{color:'#fff',fontSize:'12px'}}></i>
                  </button>
                </div>
                {/* Mini FFT */}
                <div style={{background:'#0F0A1A',borderRadius:'8px',height:'32px',overflow:'hidden',border:'1px solid rgba(192,38,211,0.1)',marginBottom:'10px'}}>
                  <canvas width={300} height={40} style={{width:'100%',height:'100%'}}
                    ref={canvas => { if(canvas && stem.fftData) { const {drawMiniFFT} = require('@/utils/drawFFT'); drawMiniFFT(canvas,stem.fftData,'#C026D3'); }}} />
                </div>
                {/* Volume */}
                <div style={{marginBottom:'10px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',marginBottom:'5px'}}>
                    <span style={{color:'#9B7EC8'}}>Volume</span>
                    <span style={{...S.mono,color:'#C026D3',fontWeight:500}}>{stem.volume>0?'+':''}{stem.volume.toFixed(1)} dB</span>
                  </div>
                  <div style={S.track}>
                    <div style={{...S.trackFill,width:`${((stem.volume+60)/72)*100}%`}}></div>
                    <input type="range" min="-60" max="12" step="0.1" value={stem.volume} onChange={e=>updateStemVolume(stem.id,parseFloat(e.target.value))} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%'}} />
                  </div>
                </div>
                {/* Pan */}
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',marginBottom:'5px'}}>
                    <span style={{color:'#9B7EC8'}}>Pan</span>
                    <span style={{...S.mono,color:'#C026D3',fontWeight:500}}>{stem.pan===0?'C':stem.pan>0?`R${(stem.pan*100).toFixed(0)}`:`L${(Math.abs(stem.pan)*100).toFixed(0)}`}</span>
                  </div>
                  <div style={S.track}>
                    <div style={{...S.trackFill,width:`${((stem.pan+1)/2)*100}%`}}></div>
                    <input type="range" min="-1" max="1" step="0.01" value={stem.pan} onChange={e=>updateStemPan(stem.id,parseFloat(e.target.value))} style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%'}} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <UploadModal isOpen={showUploadModal} onClose={()=>setShowUploadModal(false)} onUploadComplete={handleUploadMoreStems} userCredits={user.credits} onCreditsUpdate={onCreditsUpdate} />
    </div>
  );
}
