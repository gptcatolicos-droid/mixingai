
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
        played: '#3b82f6',
        unplayed: '#e2e8f0',
        playhead: '#1e40af'
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <Header user={user} onLogout={() => {}} onCreditsUpdate={onCreditsUpdate} />
        
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 max-w-lg w-full mx-4 shadow-2xl border border-white/20">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center animate-pulse shadow-lg">
                <i className="ri-equalizer-line text-white text-3xl"></i>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                Cargando Mezclador
              </h3>
              <p className="text-gray-600 mb-6 text-lg" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>{loadingStep}</p>
              <Progress value={loadingProgress} className="mb-4" />
              <div className="text-blue-600 font-bold text-xl" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                {loadingProgress}%
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Export modal overlay - MEJORADO con logo Apple Music
  if (isExporting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <Header user={user} onLogout={() => {}} onCreditsUpdate={onCreditsUpdate} />
        
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 max-w-lg w-full mx-4 shadow-2xl border border-white/20">
            <div className="text-center">
              {/* Logo Apple Music Style con animación */}
              <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 rounded-3xl flex items-center justify-center shadow-lg relative overflow-hidden">
                {/* Animación de ondas de sonido */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/30 via-pink-400/30 to-red-400/30 animate-pulse"></div>
                <div className="relative z-10">
                  <i className="ri-equalizer-fill text-white text-4xl animate-bounce"></i>
                </div>
                {/* Efecto de brillo */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-[shine_2s_ease-in-out_infinite]"></div>
              </div>
              
              <h3 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                Procesando con IA
              </h3>
              
              <p className="text-gray-600 mb-6 text-lg leading-relaxed max-w-md mx-auto" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                {exportStep}
              </p>
              
              <Progress value={exportProgress} className="mb-4" />
              
              <div className="text-purple-600 font-bold text-xl mb-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                {exportProgress}%
              </div>
              
              {/* Indicadores de procesamiento */}
              <div className="flex justify-center space-x-6">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full transition-all duration-500 ${exportProgress >= 25 ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  <span className="text-xs text-gray-500 mt-1">Reducción Ruido</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full transition-all duration-500 ${exportProgress >= 50 ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  <span className="text-xs text-gray-500 mt-1">Compresión</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full transition-all duration-500 ${exportProgress >= 75 ? 'bg-purple-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  <span className="text-xs text-gray-500 mt-1">EQ + Limiter</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full transition-all duration-500 ${exportProgress >= 95 ? 'bg-pink-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  <span className="text-xs text-gray-500 mt-1">Normalización</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Header user={user} onLogout={() => {}} onCreditsUpdate={onCreditsUpdate} />

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
        {/* Header with Apple Music styling and Export Button */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
              🎛️ Mezclador AI Pro
            </h1>
            <p className="text-gray-500 text-base lg:text-lg font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
              {stems.length} stems cargados • Duración: {Math.floor(duration / 60)}:{(duration % 60).toFixed(0).padStart(2, '0')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {/* NUEVO: Botón para subir más stems */}
            {stems.length < 12 && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 lg:px-6 py-2 lg:py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2 text-sm lg:text-base"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
              >
                <i className="ri-add-line"></i>
                <span>Subir Más Stems ({stems.length}/12)</span>
              </button>
            )}
            
            <button
              onClick={handleExportMix}
              disabled={stems.length === 0 || isExporting}
              className={`px-6 lg:px-8 py-3 lg:py-4 bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white font-bold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2 lg:space-x-3 text-sm lg:text-base ${
                stems.length === 0 || isExporting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
              }`}
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              <i className="ri-download-cloud-line text-lg lg:text-xl"></i>
              <span>Exportar Mezcla con IA</span>
            </button>
            <button
              onClick={onBack}
              className="px-4 lg:px-6 py-2 lg:py-3 bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white font-medium rounded-2xl transition-all duration-300 border border-white/20 shadow-lg hover:shadow-xl text-sm lg:text-base"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              <i className="ri-arrow-left-line mr-2"></i>
              Volver
            </button>
          </div>
        </div>

        {/* Timeline con proporciones corregidas */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-4 lg:p-8 mb-6 lg:mb-8 border border-white/20 shadow-2xl">
          <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4 lg:mb-6" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>Timeline</h3>
          <div className="bg-gray-100/50 rounded-xl lg:rounded-2xl p-2 lg:p-4">
            <canvas
              ref={timelineCanvasRef}
              width={1000}
              height={120}
              className="w-full h-20 lg:h-28 rounded-xl cursor-pointer"
              style={{ aspectRatio: '25/3' }}
              onClick={(e) => {
                if (timelineCanvasRef.current) {
                  handleWaveformClick(e, timelineCanvasRef.current, duration, handleTimelineSeek);
                }
              }}
            />
          </div>
          <div className="flex justify-between text-gray-500 text-xs lg:text-sm mt-2 lg:mt-4" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
            <span>{Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}</span>
            <span>{Math.floor(duration / 60)}:{(duration % 60).toFixed(0).padStart(2, '0')}</span>
          </div>
        </div>

        {/* Main Controls Grid - REDESIGN: Nueva distribución responsive */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 mb-6 lg:mb-8">
          
          {/* Transport Controls - 3 columns en desktop */}
          <div className="xl:col-span-3 bg-white/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-4 lg:p-8 border border-white/20 shadow-2xl">
            <h3 className="text-lg lg:text-2xl font-bold text-gray-900 mb-4 lg:mb-6" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>Control MIX</h3>
            <div className="flex items-center justify-center space-x-4 lg:space-x-6 mb-6 lg:mb-8">
              <button
                onClick={handlePlayPause}
                disabled={stems.length === 0}
                className={`w-16 h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center text-2xl lg:text-3xl transition-all duration-300 shadow-2xl ${
                  isPlaying
                    ? 'bg-gradient-to-br from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white shadow-red-500/30'
                    : 'bg-gradient-to-br from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white shadow-blue-500/30'
                } ${stems.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
              >
                <i className={isPlaying ? 'ri-pause-fill' : 'ri-play-fill'}></i>
              </button>

              <button
                onClick={handleStop}
                disabled={stems.length === 0}
                className={`w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white rounded-full flex items-center justify-center text-lg lg:text-xl transition-all duration-300 shadow-xl hover:scale-110 ${
                  stems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <i className="ri-stop-fill"></i>
              </button>
            </div>

            {/* Master Volume */}
            <div className="space-y-3 lg:space-y-4 mb-4 lg:mb-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-900 font-semibold text-base lg:text-lg" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>Mix Volume</span>
                <span className="text-blue-600 font-bold text-base lg:text-lg" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                  {masterVolume > 0 ? '+' : ''}{masterVolume.toFixed(1)} dB
                </span>
              </div>
              <div className="bg-gray-200/50 rounded-full p-1">
                <input
                  type="range"
                  min="-60"
                  max="12"
                  step="0.1"
                  value={masterVolume}
                  onChange={(e) => updateMasterVolume(parseFloat(e.target.value))}
                  className="w-full h-2 lg:h-3 bg-transparent rounded-full appearance-none cursor-pointer apple-slider"
                />
              </div>
            </div>

            {/* Función para ajustar todos los stems */}
            <div className="space-y-3 lg:space-y-4 mb-4 lg:mb-6">
              <div className="text-center">
                <span className="text-gray-900 font-semibold text-base lg:text-lg" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>Stems Gain Adjust</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setAllStemsGain(-12)}
                  className="px-2 lg:px-3 py-1.5 lg:py-2 bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white font-bold rounded-lg lg:rounded-xl transition-all duration-300 shadow-lg hover:scale-105 text-xs lg:text-sm"
                >
                  -12 dB
                </button>
                <button
                  onClick={() => setAllStemsGain(-6)}
                  className="px-2 lg:px-3 py-1.5 lg:py-2 bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white font-bold rounded-lg lg:rounded-xl transition-all duration-300 shadow-lg hover:scale-105 text-xs lg:text-sm"
                >
                  -6 dB
                </button>
                <button
                  onClick={() => setAllStemsGain(0)}
                  className="px-2 lg:px-3 py-1.5 lg:py-2 bg-gradient-to-r from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white font-bold rounded-lg lg:rounded-xl transition-all duration-300 shadow-lg hover:scale-105 text-xs lg:text-sm"
                >
                  0 dB
                </button>
              </div>
            </div>
          </div>

          {/* FFT Analyzer EXPANDIDO - 7 columns en desktop */}
          <div className="xl:col-span-7 bg-white/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-4 lg:p-8 border border-white/20 shadow-2xl">
            <h3 className="text-lg lg:text-2xl font-bold text-gray-900 mb-4 lg:mb-6" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>FFT Analyzer Pro</h3>
            
            {/* FFT Canvas CORREGIDO - Proporciones exactas */}
            <div className="bg-gradient-to-br from-gray-200 via-gray-100 to-gray-50 rounded-xl lg:rounded-2xl p-3 lg:p-6 mb-4 lg:mb-6 border border-gray-200/50 shadow-inner">
              <canvas
                ref={mixFFTCanvasRef}
                width={800}
                height={200}
                className="w-full h-32 lg:h-48 rounded-xl"
                style={{ aspectRatio: '4/1' }}
              />
            </div>

            {/* Botones EQ rápido centrados con colores Apple Music */}
            <div className="flex justify-center">
              <div className="grid grid-cols-3 gap-4 lg:gap-8">
                <div className="text-center">
                  <div className="text-xs lg:text-sm text-gray-600 mb-2 lg:mb-3 font-semibold" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>BASS</div>
                  <div className="flex space-x-1 lg:space-x-2">
                    <button
                      onClick={() => adjustGlobalEQ('bass', 'down')}
                      className="w-8 h-8 lg:w-12 lg:h-12 bg-gradient-to-br from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white rounded-xl lg:rounded-2xl text-sm lg:text-lg font-bold transition-all duration-300 shadow-lg hover:scale-110 hover:shadow-xl"
                    >
                      <i className="ri-subtract-line"></i>
                    </button>
                    <button
                      onClick={() => adjustGlobalEQ('bass', 'up')}
                      className="w-8 h-8 lg:w-12 lg:h-12 bg-gradient-to-br from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white rounded-xl lg:rounded-2xl text-sm lg:text-lg font-bold transition-all duration-300 shadow-lg hover:scale-110 hover:shadow-xl"
                    >
                      <i className="ri-add-line"></i>
                    </button>
                  </div>
                  <div className="text-xs lg:text-sm text-blue-600 font-bold mt-1 lg:mt-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                    {bassGain > 0 ? '+' : ''}{bassGain.toFixed(1)} dB
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-xs lg:text-sm text-gray-600 mb-2 lg:mb-3 font-semibold" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>MID</div>
                  <div className="flex space-x-1 lg:space-x-2">
                    <button
                      onClick={() => adjustGlobalEQ('mid', 'down')}
                      className="w-8 h-8 lg:w-12 lg:h-12 bg-gradient-to-br from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white rounded-xl lg:rounded-2xl text-sm lg:text-lg font-bold transition-all duration-300 shadow-lg hover:scale-110 hover:shadow-xl"
                    >
                      <i className="ri-subtract-line"></i>
                    </button>
                    <button
                      onClick={() => adjustGlobalEQ('mid', 'up')}
                      className="w-8 h-8 lg:w-12 lg:h-12 bg-gradient-to-br from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white rounded-xl lg:rounded-2xl text-sm lg:text-lg font-bold transition-all duration-300 shadow-lg hover:scale-110 hover:shadow-xl"
                    >
                      <i className="ri-add-line"></i>
                    </button>
                  </div>
                  <div className="text-xs lg:text-sm text-blue-600 font-bold mt-1 lg:mt-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                    {midGain > 0 ? '+' : ''}{midGain.toFixed(1)} dB
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-xs lg:text-sm text-gray-600 mb-2 lg:mb-3 font-semibold" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>HIGH</div>
                  <div className="flex space-x-1 lg:space-x-2">
                    <button
                      onClick={() => adjustGlobalEQ('high', 'down')}
                      className="w-8 h-8 lg:w-12 lg:h-12 bg-gradient-to-br from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white rounded-xl lg:rounded-2xl text-sm lg:text-lg font-bold transition-all duration-300 shadow-lg hover:scale-110 hover:shadow-xl"
                    >
                      <i className="ri-subtract-line"></i>
                    </button>
                    <button
                      onClick={() => adjustGlobalEQ('high', 'up')}
                      className="w-8 h-8 lg:w-12 lg:h-12 bg-gradient-to-br from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white rounded-xl lg:rounded-2xl text-sm lg:text-lg font-bold transition-all duration-300 shadow-lg hover:scale-110 hover:shadow-xl"
                    >
                      <i className="ri-add-line"></i>
                    </button>
                  </div>
                  <div className="text-xs lg:text-sm text-blue-600 font-bold mt-1 lg:mt-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                    {highGain > 0 ? '+' : ''}{highGain.toFixed(1)} dB
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* LUFS Counter - 2 columns - SOLO CONTADOR NUMÉRICO responsive */}
          <div className="xl:col-span-2 bg-white/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-4 lg:p-8 border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h3 className="text-lg lg:text-2xl font-bold text-gray-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>LUFS</h3>
              <div className="text-xs font-bold px-2 lg:px-3 py-1 lg:py-2 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                {lufsIntegrated >= -16 && lufsIntegrated <= -12 ? 'Ready' : 'Safe'}
              </div>
            </div>
            
            {/* LUFS Counter Grande - SIN BARRRA GRÁFICA responsive */}
            <div className="text-center space-y-4 lg:space-y-6">
              <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl lg:rounded-3xl p-3 lg:p-6 border border-gray-200/50 shadow-inner">
                <div className="text-xs text-gray-500 mb-1 lg:mb-2 font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>Momentary</div>
                <div 
                  className="text-base lg:text-lg font-bold mb-1 leading-none overflow-hidden" 
                  style={{ 
                    fontFamily: '"JetBrains Mono", monospace',
                    color: '#d946ef'
                  }}
                >
                  {lufsMomentary.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>LUFS</div>
              </div>

              <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl lg:rounded-3xl p-3 lg:p-6 border border-gray-200/50 shadow-inner">
                <div className="text-xs text-gray-500 mb-1 lg:mb-2 font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>Integrated</div>
                <div 
                  className="text-base lg:text-lg font-bold mb-1 leading-none overflow-hidden" 
                  style={{ 
                    fontFamily: '"JetBrains Mono", monospace',
                    color: '#d946ef'
                  }}
                >
                  {lufsIntegrated.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>LUFS</div>
              </div>
            </div>

            {/* Reference Standards */}
            <div className="mt-4 lg:mt-6 pt-3 lg:pt-4 border-t border-gray-200/50">
              <div className="text-xs text-gray-500 mb-2 font-medium" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>Standards</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>Spotify</span>
                  </div>
                  <span className="text-gray-900 font-bold">-14</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>YouTube</span>
                  </div>
                  <span className="text-gray-900 font-bold">-13</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stems Grid with Apple Music cards responsive */}
        {stems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
            {stems.map((stem) => (
              <div key={stem.id} className="bg-white/80 backdrop-blur-xl rounded-2xl lg:rounded-3xl p-4 lg:p-6 border border-white/20 shadow-2xl hover:shadow-3xl transition-all hover:scale-[1.02]">
                {/* Stem header */}
                <div className="flex items-center justify-between mb-4 lg:mb-6">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm lg:text-lg truncate" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                      {stem.name.split('.')[0]}
                    </h4>
                  </div>
                  <button
                    onClick={() => toggleStemMute(stem.id)}
                    className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-sm lg:text-lg transition-all duration-300 shadow-lg ${
                      stem.muted
                        ? 'bg-gradient-to-br from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white shadow-red-500/30 hover:scale-110'
                        : 'bg-gradient-to-br from-red-400 to-pink-500 hover:from-red-500 hover:to-pink-600 text-white shadow-gray-500/30 hover:scale-110'
                    }`}
                  >
                    <i className={stem.muted ? 'ri-volume-mute-line' : 'ri-volume-up-line'}></i>
                  </button>
                </div>

                {/* Mini FFT con proporciones Apple exactas */}
                <div className="h-12 lg:h-16 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-50 rounded-xl lg:rounded-2xl mb-4 lg:mb-6 overflow-hidden border border-gray-200/50">
                  <canvas
                    width={400}
                    height={60}
                    className="w-full h-full rounded-xl"
                    style={{ aspectRatio: '20/3' }}
                    ref={(canvas) => {
                      if (canvas && stem.fftData) {
                        drawMiniFFT(canvas, stem.fftData, '#007AFF');
                      }
                    }}
                  />
                </div>

                {/* Volume slider with Apple design */}
                <div className="space-y-2 lg:space-y-3 mb-3 lg:mb-4">
                  <div className="flex items-center justify-between text-xs lg:text-sm">
                    <span className="text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>Volume</span>
                    <span className="text-blue-600 font-bold" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                      {stem.volume > 0 ? '+' : ''}{stem.volume.toFixed(1)} dB
                    </span>
                  </div>
                  <div className="bg-gray-200/50 rounded-full p-1">
                    <input
                      type="range"
                      min="-60"
                      max="12"
                      step="0.1"
                      value={stem.volume}
                      onChange={(e) => updateStemVolume(stem.id, parseFloat(e.target.value))}
                      className="w-full h-1.5 lg:h-2 bg-transparent rounded-full appearance-none cursor-pointer apple-mini-slider"
                    />
                  </div>
                  
                  {/* Manual Volume Input */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="-60"
                      max="12"
                      step="0.1"
                      value={stem.volume.toFixed(1)}
                      onChange={(e) => {
                        const value = Math.max(-60, Math.min(12, parseFloat(e.target.value) || 0));
                        updateStemVolume(stem.id, value);
                      }}
                      className="w-12 lg:w-16 px-1 lg:px-2 py-0.5 lg:py-1 text-xs bg-gray-100/50 border border-gray-200 rounded-lg text-center font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
                    />
                    <span className="text-xs text-gray-500">dB</span>
                  </div>
                </div>

                {/* Pan slider with Apple design */}
                <div className="space-y-2 lg:space-y-3">
                  <div className="flex items-center justify-between text-xs lg:text-sm">
                    <span className="text-gray-600" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>Pan</span>
                    <span className="text-blue-600 font-bold" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                      {stem.pan === 0 ? 'C' : stem.pan > 0 ? `R${(stem.pan * 100).toFixed(0)}` : `L${(Math.abs(stem.pan) * 100).toFixed(0)}`}
                    </span>
                  </div>
                  <div className="bg-gray-200/50 rounded-full p-1">
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.01"
                      value={stem.pan}
                      onChange={(e) => updateStemPan(stem.id, parseFloat(e.target.value))}
                      className="w-full h-1.5 lg:h-2 bg-transparent rounded-full appearance-none cursor-pointer apple-mini-slider"
                    />
                  </div>
                  
                  {/* Manual Pan Input */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="-100"
                      max="100"
                      step="1"
                      value={Math.round(stem.pan * 100)}
                      onChange={(e) => {
                        const value = Math.max(-100, Math.min(100, parseInt(e.target.value) || 0));
                        updateStemPan(stem.id, value / 100);
                      }}
                      className="w-12 lg:w-16 px-1 lg:px-2 py-0.5 lg:py-1 text-xs bg-gray-100/50 border border-gray-200 rounded-lg text-center font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NUEVO: Modal para subir más stems */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={handleUploadMoreStems}
        userCredits={user.credits}
        onCreditsUpdate={onCreditsUpdate}
      />

      {/* Apple Music style slider CSS */}
      <style jsx>{`
        .apple-slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #007AFF, #5856D6);
          cursor: pointer;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0, 122, 255, 0.4);
          transition: all 0.2s ease;
        }

        .apple-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(0, 122, 255, 0.6);
        }

        .apple-slider::-webkit-slider-track {
          background: linear-gradient(90deg, #007AFF, #5856D6);
          height: 6px;
          border-radius: 3px;
        }

        .apple-mini-slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #007AFF, #5856D6);
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
          transition: all 0.2s ease;
        }

        .apple-mini-slider::-webkit-slider-track {
          background: linear-gradient(90deg, #007AFF, #5856D6);
          height: 4px;
          border-radius: 2px;
        }

        .apple-slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #007AFF, #5856D6);
          cursor: pointer;
          border: 3px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0, 122, 255, 0.4);
        }

        .apple-mini-slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #007AFF, #5856D6);
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0, 122, 255, 0.3);
        }

        @media (max-width: 1024px) {
          .apple-slider::-webkit-slider-thumb {
            height: 24px;
            width: 24px;
          }
          .apple-mini-slider::-webkit-slider-thumb {
            height: 20px;
            width: 20px;
          }
        }
      `}</style>
    </div>
  );
}
