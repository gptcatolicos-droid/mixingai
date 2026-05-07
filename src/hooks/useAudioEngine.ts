import { useState, useRef, useCallback, useEffect } from 'react';

export interface Stem {
  id: string;
  name: string;
  file: File;
  role: 'vocals' | 'drums' | 'bass' | 'guitar' | 'synth' | 'other';
  volume: number; // -60 to +12 dB
  pan: number; // -1 to +1
  muted: boolean;
  solo: boolean;
  waveform: number[];
  audioBuffer?: AudioBuffer;
  gainNode?: GainNode;
  pannerNode?: StereoPannerNode;
  analyserNode?: AnalyserNode;
  sourceNode?: AudioBufferSourceNode;
  fftData?: Uint8Array;
  // EQ nodes
  lowShelfFilter?: BiquadFilterNode;
  midPeakFilter?: BiquadFilterNode;
  highShelfFilter?: BiquadFilterNode;
  bassGain: number;
  midGain: number;
  highGain: number;
}

export interface AudioEngineState {
  isInitialized: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  stems: Stem[];
  mixVolumeDb: number;
  lufsIntegrated: number;
  lufsMomentary: number;
  bassGain: number;
  midGain: number;
  highGain: number;
  compressionEnabled: boolean;
  currentPreset: 'custom' | 'pop' | 'rock' | 'lofi';
}

// Audio utility functions
function bufferToMono(buf: AudioBuffer): Float32Array {
  const len = buf.length;
  const out = new Float32Array(len);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < len; i++) out[i] += ch[i] / buf.numberOfChannels;
  }
  return out;
}

function mixBuffers(buffers: AudioBuffer[]): Float32Array {
  const maxLen = Math.max(...buffers.map(b => b.length));
  const mix = new Float32Array(maxLen);
  buffers.forEach(b => {
    const mono = bufferToMono(b);
    for (let i = 0; i < mono.length; i++) mix[i] += mono[i];
  });
  // normalize
  let peak = 0;
  for (let v of mix) peak = Math.max(peak, Math.abs(v));
  if (peak > 1) for (let i = 0; i < mix.length; i++) mix[i] /= peak;
  return mix;
}

function calculateRMS(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

function estimateLUFS(rmsValue: number): number {
  if (rmsValue <= 0) return -60;
  const lufs = 20 * Math.log10(rmsValue) - 0.691; // EBU R128 approximation
  return Math.max(-60, Math.min(0, lufs));
}

// AI Analysis for stems
function analyzeAudioBuffer(buffer: AudioBuffer): {
  loudness: number;
  dynamics: number;
  spectralCentroid: number;
  role: 'vocals' | 'drums' | 'bass' | 'guitar' | 'synth' | 'other';
} {
  const channelData = buffer.getChannelData(0);
  const length = channelData.length;

  // Analyze loudness (RMS)
  let rmsSum = 0;
  for (let i = 0; i < length; i++) {
    rmsSum += channelData[i] * channelData[i];
  }
  const loudness = Math.sqrt(rmsSum / length);

  // Analyze dynamics (peak to RMS ratio)
  let peak = 0;
  for (let i = 0; i < length; i++) {
    const abs = Math.abs(channelData[i]);
    if (abs > peak) peak = abs;
  }
  const dynamics = peak / (loudness || 0.001);

  // Simple spectral analysis for role detection
  const sampleRate = buffer.sampleRate;
  const nyquist = sampleRate / 2;

  // Analyze frequency content in different bands
  let lowEnergy = 0, midEnergy = 0, highEnergy = 0;
  const hopSize = Math.floor(length / 10);

  for (let window = 0; window < 10; window++) {
    const start = window * hopSize;
    const end = Math.min(start + 2048, length);

    for (let i = start; i < end; i++) {
      const freq = ((i - start) / 2048) * nyquist;
      const magnitude = Math.abs(channelData[i]);

      if (freq < 250) lowEnergy += magnitude;
      else if (freq < 4000) midEnergy += magnitude;
      else highEnergy += magnitude;
    }
  }

  const totalEnergy = lowEnergy + midEnergy + highEnergy;
  const lowRatio = lowEnergy / totalEnergy;
  const midRatio = midEnergy / totalEnergy;
  const highRatio = highEnergy / totalEnergy;
  const spectralCentroid = lowRatio * 125 + midRatio * 2125 + highRatio * 8000;

  // AI-based role detection
  let role: Stem['role'] = 'other';

  if (lowRatio > 0.6 && dynamics < 2) {
    role = 'bass';
  } else if (dynamics > 5 && midRatio > 0.4) {
    role = 'drums';
  } else if (highRatio > 0.3 && midRatio > 0.4) {
    role = 'vocals';
  } else if (spectralCentroid > 2000 && highRatio > 0.2) {
    role = 'synth';
  } else if (midRatio > 0.5 && spectralCentroid > 1000) {
    role = 'guitar';
  }

  return { loudness, dynamics, spectralCentroid, role };
}

function generateWaveformFromBuffer(buffer: AudioBuffer): number[] {
  const waveform: number[] = [];
  const samplesPerPoint = Math.floor(buffer.length / 200);
  const channelData = buffer.getChannelData(0);

  for (let i = 0; i < 200; i++) {
    let sum = 0;
    const start = i * samplesPerPoint;
    const end = Math.min(start + samplesPerPoint, buffer.length);

    for (let j = start; j < end; j++) {
      sum += Math.abs(channelData[j]);
    }

    waveform.push(sum / samplesPerPoint);
  }

  return waveform;
}

export default function useAudioEngine() {
  // Core state
  const [state, setState] = useState<AudioEngineState>({
    isInitialized: false,
    isPlaying: false,
    currentTime: 0,
    duration: 180,
    stems: [],
    mixVolumeDb: 0,
    lufsIntegrated: -23.0,
    lufsMomentary: -23.0,
    bassGain: 0,
    midGain: 0,
    highGain: 0,
    compressionEnabled: false,
    currentPreset: 'custom'
  });

  // Audio nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainNodeRef = useRef<GainNode | null>(null);
  const mixAnalyserNodeRef = useRef<AnalyserNode | null>(null);
  const lowShelfFilterRef = useRef<BiquadFilterNode | null>(null);
  const midPeakFilterRef = useRef<BiquadFilterNode | null>(null);
  const highShelfFilterRef = useRef<BiquadFilterNode | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);

  // Animation and timing refs
  const animationFrameRef = useRef<number>();
  const timeUpdateRef = useRef<number>();
  const pausedTimeRef = useRef(0);
  const lufsHistoryRef = useRef<number[]>([]);
  
  // FFT data
  const mixFftDataRef = useRef<Uint8Array | null>(null);
  const mixWaveformDataRef = useRef<Float32Array | null>(null);

  // Initialize Web Audio API
  const initializeAudio = useCallback(async () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      // Create audio graph
      const lowShelf = ctx.createBiquadFilter();
      lowShelf.type = 'lowshelf';
      lowShelf.frequency.value = 100;
      lowShelf.gain.value = 0;

      const midPeak = ctx.createBiquadFilter();
      midPeak.type = 'peaking';
      midPeak.frequency.value = 1000;
      midPeak.Q.value = 1;
      midPeak.gain.value = 0;

      const highShelf = ctx.createBiquadFilter();
      highShelf.type = 'highshelf';
      highShelf.frequency.value = 8000;
      highShelf.gain.value = 0;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      const masterGain = ctx.createGain();
      const mixAnalyser = ctx.createAnalyser();
      mixAnalyser.fftSize = 2048;
      mixAnalyser.smoothingTimeConstant = 0.8;

      // Connect nodes
      lowShelf.connect(midPeak);
      midPeak.connect(highShelf);
      highShelf.connect(compressor);
      compressor.connect(mixAnalyser);
      mixAnalyser.connect(masterGain);
      masterGain.connect(ctx.destination);

      // Store refs
      lowShelfFilterRef.current = lowShelf;
      midPeakFilterRef.current = midPeak;
      highShelfFilterRef.current = highShelf;
      compressorNodeRef.current = compressor;
      masterGainNodeRef.current = masterGain;
      mixAnalyserNodeRef.current = mixAnalyser;

      // Initialize FFT data
      mixFftDataRef.current = new Uint8Array(mixAnalyser.frequencyBinCount);
      mixWaveformDataRef.current = new Float32Array(mixAnalyser.fftSize);

      setState(prev => ({ ...prev, isInitialized: true }));
    } catch (error) {
      console.error('Error initializing audio context:', error);
    }
  }, []);

  // Decode audio files
  const decodeAudioFiles = useCallback(async (files: File[]): Promise<{file: File, buffer: AudioBuffer}[]> => {
    const ctx = audioContextRef.current;
    if (!ctx) return [];

    const decoded = [];
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        decoded.push({ file, buffer: audioBuffer });
      } catch (error) {
        console.error(`Error decoding ${file.name}:`, error);
      }
    }
    return decoded;
  }, []);

  // Load stems
  const loadStems = useCallback(async (files: File[]) => {
    const ctx = audioContextRef.current;
    const lowShelf = lowShelfFilterRef.current;
    if (!ctx || !lowShelf) return;

    const decodedBuffers = await decodeAudioFiles(files);
    const initialStems: Stem[] = [];

    for (let index = 0; index < decodedBuffers.length; index++) {
      const { file, buffer } = decodedBuffers[index];

      // AI Analysis
      const analysis = analyzeAudioBuffer(buffer);
      let role = analysis.role;

      // Fallback to filename analysis
      const fileName = file.name.toLowerCase();
      if (role === 'other') {
        if (fileName.includes('vocal') || fileName.includes('voice') || fileName.includes('lead')) {
          role = 'vocals';
        } else if (fileName.includes('drum') || fileName.includes('kick') || fileName.includes('snare')) {
          role = 'drums';
        } else if (fileName.includes('bass')) {
          role = 'bass';
        } else if (fileName.includes('guitar')) {
          role = 'guitar';
        } else if (fileName.includes('synth') || fileName.includes('keys') || fileName.includes('piano')) {
          role = 'synth';
        }
      }

      // Create individual EQ filters for each stem
      const stemLowShelf = ctx.createBiquadFilter();
      stemLowShelf.type = 'lowshelf';
      stemLowShelf.frequency.value = 100;
      stemLowShelf.gain.value = 0;

      const stemMidPeak = ctx.createBiquadFilter();
      stemMidPeak.type = 'peaking';
      stemMidPeak.frequency.value = 1000;
      stemMidPeak.Q.value = 1;
      stemMidPeak.gain.value = 0;

      const stemHighShelf = ctx.createBiquadFilter();
      stemHighShelf.type = 'highshelf';
      stemHighShelf.frequency.value = 8000;
      stemHighShelf.gain.value = 0;

      // Create audio nodes
      const gainNode = ctx.createGain();
      const pannerNode = ctx.createStereoPanner();
      const analyserNode = ctx.createAnalyser();

      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.7;

      // AI-suggested initial volume
      const suggestedVolume = Math.max(-12, Math.min(6, -20 * Math.log10(analysis.loudness || 0.1)));
      const initialGain = Math.pow(10, suggestedVolume / 20);
      gainNode.gain.value = initialGain;
      pannerNode.pan.value = 0.0;

      // Connect stem audio chain
      gainNode.connect(pannerNode);
      pannerNode.connect(stemLowShelf);
      stemLowShelf.connect(stemMidPeak);
      stemMidPeak.connect(stemHighShelf);
      stemHighShelf.connect(analyserNode);
      analyserNode.connect(lowShelf);

      const stem: Stem = {
        id: `stem-${index}`,
        name: file.name,
        file,
        role,
        volume: suggestedVolume,
        pan: 0,
        muted: false,
        solo: false,
        waveform: generateWaveformFromBuffer(buffer),
        audioBuffer: buffer,
        gainNode,
        pannerNode,
        analyserNode,
        fftData: new Uint8Array(analyserNode.frequencyBinCount),
        lowShelfFilter: stemLowShelf,
        midPeakFilter: stemMidPeak,
        highShelfFilter: stemHighShelf,
        bassGain: 0,
        midGain: 0,
        highGain: 0
      };

      initialStems.push(stem);
    }

    const maxDuration = Math.max(...decodedBuffers.map(d => d.buffer.duration));
    
    setState(prev => ({
      ...prev,
      stems: initialStems,
      duration: maxDuration
    }));

    // Start FFT animation
    startFFTAnimation();
  }, []);

  // FFT animation loop
  const startFFTAnimation = useCallback(() => {
    const updateFFT = () => {
      const analyser = mixAnalyserNodeRef.current;
      const fftData = mixFftDataRef.current;
      const waveformData = mixWaveformDataRef.current;

      if (!analyser || !fftData || !waveformData) return;

      // Update FFT data
      analyser.getByteFrequencyData(fftData);
      analyser.getFloatTimeDomainData(waveformData);

      // Update stem FFT data
      setState(prev => ({
        ...prev,
        stems: prev.stems.map(stem => {
          if (stem.analyserNode && stem.fftData) {
            stem.analyserNode.getByteFrequencyData(stem.fftData);
            return { ...stem, fftData: new Uint8Array(stem.fftData) };
          }
          return stem;
        })
      }));

      // Calculate LUFS
      const rms = calculateRMS(waveformData);
      const momentaryLufs = estimateLUFS(rms);
      
      lufsHistoryRef.current.push(momentaryLufs);
      if (lufsHistoryRef.current.length > 300) {
        lufsHistoryRef.current.shift();
      }

      const integratedLufs = lufsHistoryRef.current.reduce((a, b) => a + b, 0) / lufsHistoryRef.current.length;

      setState(prev => ({
        ...prev,
        lufsMomentary: momentaryLufs,
        lufsIntegrated: integratedLufs
      }));

      animationFrameRef.current = requestAnimationFrame(updateFFT);
    };

    updateFFT();
  }, []);

  // Playback controls
  const playPause = useCallback(async () => {
    const ctx = audioContextRef.current;
    if (!ctx || state.stems.length === 0) return;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    if (state.isPlaying) {
      // Stop all source nodes
      state.stems.forEach(stem => {
        if (stem.sourceNode) {
          try {
            stem.sourceNode.stop();
            stem.sourceNode.disconnect();
          } catch (e) {
            console.warn('Error stopping source node:', e);
          }
        }
      });
      
      pausedTimeRef.current = state.currentTime;
      setState(prev => ({ ...prev, isPlaying: false }));

      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
      }
    } else {
      // Create and start new source nodes
      const startTime = ctx.currentTime;
      const offset = pausedTimeRef.current;

      const updatedStems = state.stems.map(stem => {
        if (stem.audioBuffer && stem.gainNode) {
          const sourceNode = ctx.createBufferSource();
          sourceNode.buffer = stem.audioBuffer;
          sourceNode.loop = false;
          sourceNode.connect(stem.gainNode);

          try {
            sourceNode.start(startTime, offset);
          } catch (e) {
            console.warn('Error starting source node:', e);
          }

          return { ...stem, sourceNode };
        }
        return stem;
      });

      setState(prev => ({ 
        ...prev, 
        stems: updatedStems, 
        isPlaying: true 
      }));

      // Start time tracking
      timeUpdateRef.current = window.setInterval(() => {
        const elapsed = ctx.currentTime - startTime + offset;
        setState(prev => ({
          ...prev,
          currentTime: Math.min(elapsed, prev.duration)
        }));

        if (elapsed >= state.duration) {
          setState(prev => ({ 
            ...prev, 
            isPlaying: false, 
            currentTime: 0 
          }));
          pausedTimeRef.current = 0;
          if (timeUpdateRef.current) {
            clearInterval(timeUpdateRef.current);
          }
        }
      }, 100);
    }
  }, [state.isPlaying, state.stems, state.currentTime, state.duration]);

  const stop = useCallback(() => {
    state.stems.forEach(stem => {
      if (stem.sourceNode) {
        try {
          stem.sourceNode.stop();
          stem.sourceNode.disconnect();
        } catch (e) {
          console.warn('Error stopping source node:', e);
        }
      }
    });

    setState(prev => ({
      ...prev,
      stems: prev.stems.map(stem => ({ ...stem, sourceNode: undefined })),
      isPlaying: false,
      currentTime: 0
    }));
    
    pausedTimeRef.current = 0;

    if (timeUpdateRef.current) {
      clearInterval(timeUpdateRef.current);
    }
  }, [state.stems]);

  // Volume controls
  const updateMixVolume = useCallback((dbValue: number) => {
    const masterGain = masterGainNodeRef.current;
    const ctx = audioContextRef.current;
    
    if (masterGain && ctx) {
      const linearGain = Math.pow(10, dbValue / 20);
      masterGain.gain.setTargetAtTime(linearGain, ctx.currentTime, 0.01);
    }
    
    setState(prev => ({ ...prev, mixVolumeDb: dbValue }));
  }, []);

  const updateStemVolume = useCallback((stemId: string, dbValue: number) => {
    const ctx = audioContextRef.current;
    
    setState(prev => ({
      ...prev,
      stems: prev.stems.map(stem => {
        if (stem.id === stemId) {
          if (stem.gainNode && ctx) {
            const linearGain = Math.pow(10, dbValue / 20);
            stem.gainNode.gain.setTargetAtTime(linearGain, ctx.currentTime, 0.01);
          }
          return { ...stem, volume: dbValue };
        }
        return stem;
      })
    }));
  }, []);

  const toggleStemMute = useCallback((stemId: string) => {
    const ctx = audioContextRef.current;
    
    setState(prev => ({
      ...prev,
      stems: prev.stems.map(stem => {
        if (stem.id === stemId) {
          const newMuted = !stem.muted;
          if (stem.gainNode && ctx) {
            const targetGain = newMuted ? 0 : Math.pow(10, stem.volume / 20);
            stem.gainNode.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.01);
          }
          return { ...stem, muted: newMuted };
        }
        return stem;
      })
    }));
  }, []);

  // EQ controls - MEJORADO: Función adjustGlobalEQ accesible
  const adjustGlobalEQ = useCallback((band: 'bass' | 'mid' | 'high', direction: 'up' | 'down') => {
    const ctx = audioContextRef.current;
    const lowShelf = lowShelfFilterRef.current;
    const midPeak = midPeakFilterRef.current;
    const highShelf = highShelfFilterRef.current;
    
    if (!ctx) return;

    const increment = direction === 'up' ? 3 : -3;
    
    setState(prev => {
      let newGain = 0;
      let filterNode: BiquadFilterNode | null = null;
      
      switch (band) {
        case 'bass':
          newGain = Math.max(-12, Math.min(12, prev.bassGain + increment));
          filterNode = lowShelf;
          break;
        case 'mid':
          newGain = Math.max(-12, Math.min(12, prev.midGain + increment));
          filterNode = midPeak;
          break;
        case 'high':
          newGain = Math.max(-12, Math.min(12, prev.highGain + increment));
          filterNode = highShelf;
          break;
      }
      
      if (filterNode) {
        filterNode.gain.setTargetAtTime(newGain, ctx.currentTime, 0.01);
      }
      
      return {
        ...prev,
        [band === 'bass' ? 'bassGain' : band === 'mid' ? 'midGain' : 'highGain']: newGain
      };
    });
  }, []);

  const adjustStemEQ = useCallback((stemId: string, band: 'bass' | 'mid' | 'high', direction: 'up' | 'down') => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    const increment = direction === 'up' ? 2 : -2;
    
    setState(prev => ({
      ...prev,
      stems: prev.stems.map(stem => {
        if (stem.id === stemId) {
          let newGain = 0;
          let filterNode: BiquadFilterNode | undefined;
          
          switch (band) {
            case 'bass':
              newGain = Math.max(-12, Math.min(12, stem.bassGain + increment));
              filterNode = stem.lowShelfFilter;
              break;
            case 'mid':
              newGain = Math.max(-12, Math.min(12, stem.midGain + increment));
              filterNode = stem.midPeakFilter;
              break;
            case 'high':
              newGain = Math.max(-12, Math.min(12, stem.highGain + increment));
              filterNode = stem.highShelfFilter;
              break;
          }
          
          if (filterNode) {
            filterNode.gain.setTargetAtTime(newGain, ctx.currentTime, 0.01);
          }
          
          return {
            ...stem,
            [band === 'bass' ? 'bassGain' : band === 'mid' ? 'midGain' : 'highGain']: newGain
          };
        }
        return stem;
      })
    }));
  }, []);

  // Presets
  const applyPreset = useCallback((preset: 'pop' | 'rock' | 'lofi') => {
    const ctx = audioContextRef.current;
    const lowShelf = lowShelfFilterRef.current;
    const midPeak = midPeakFilterRef.current;
    const highShelf = highShelfFilterRef.current;
    
    if (!ctx || !lowShelf || !midPeak || !highShelf) return;
    
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
    
    lowShelf.gain.setTargetAtTime(bassValue, ctx.currentTime, 0.01);
    midPeak.gain.setTargetAtTime(midValue, ctx.currentTime, 0.01);
    highShelf.gain.setTargetAtTime(highValue, ctx.currentTime, 0.01);
    
    setState(prev => ({
      ...prev,
      bassGain: bassValue,
      midGain: midValue,
      highGain: highValue,
      currentPreset: preset,
      compressionEnabled: preset === 'pop' || preset === 'rock'
    }));
  }, []);

  // Export functionality
  const exportMix = useCallback(async (): Promise<{ 
    audioBuffer: AudioBuffer; 
    audioUrl: string; 
    waveformPeaks: Float32Array;
    finalLufs: number;
  } | null> => {
    const ctx = audioContextRef.current;
    if (!ctx || state.stems.length === 0) return null;

    try {
      // Create offline context for professional rendering
      const sampleRate = 44100;
      const channels = 2;
      const length = sampleRate * state.duration;
      const offlineContext = new OfflineAudioContext(channels, length, sampleRate);

      // Create professional audio processing chain
      const masterGain = offlineContext.createGain();
      const compressor = offlineContext.createDynamicsCompressor();
      const limiter = offlineContext.createDynamicsCompressor();
      
      // EQ Chain
      const lowShelf = offlineContext.createBiquadFilter();
      const midPeak = offlineContext.createBiquadFilter();
      const highShelf = offlineContext.createBiquadFilter();

      // Configure professional settings
      compressor.threshold.value = -18;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.1;

      limiter.threshold.value = -1;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.01;

      // Apply current EQ settings
      lowShelf.type = 'lowshelf';
      lowShelf.frequency.value = 100;
      lowShelf.gain.value = state.bassGain;

      midPeak.type = 'peaking';
      midPeak.frequency.value = 1000;
      midPeak.Q.value = 1;
      midPeak.gain.value = state.midGain;

      highShelf.type = 'highshelf';
      highShelf.frequency.value = 8000;
      highShelf.gain.value = state.highGain;

      // Connect processing chain
      masterGain.connect(lowShelf);
      lowShelf.connect(midPeak);
      midPeak.connect(highShelf);
      highShelf.connect(compressor);
      compressor.connect(limiter);
      limiter.connect(offlineContext.destination);

      // Process each stem
      for (const stem of state.stems) {
        if (stem.audioBuffer && !stem.muted) {
          const source = offlineContext.createBufferSource();
          const gainNode = offlineContext.createGain();
          const pannerNode = offlineContext.createStereoPanner();

          source.buffer = stem.audioBuffer;
          gainNode.gain.value = Math.pow(10, stem.volume / 20);
          pannerNode.pan.value = stem.pan;

          source.connect(gainNode);
          gainNode.connect(pannerNode);
          pannerNode.connect(masterGain);

          source.start(0);
        }
      }

      // Apply master volume
      masterGain.gain.value = Math.pow(10, state.mixVolumeDb / 20);

      // Render offline
      const renderedBuffer = await offlineContext.startRendering();

      // Normalize to -14 LUFS
      const normalizedBuffer = await normalizeTo14LUFS(renderedBuffer);

      // Generate waveform peaks for visualization
      const waveformPeaks = generateWaveformPeaks(normalizedBuffer, 800);

      // Create audio URL for playback
      const audioBlob = bufferToWav(normalizedBuffer, 24);
      const audioUrl = URL.createObjectURL(audioBlob);

      return {
        audioBuffer: normalizedBuffer,
        audioUrl,
        waveformPeaks,
        finalLufs: -14.0
      };
    } catch (error) {
      console.error('Export error:', error);
      return null;
    }
  }, [state.stems, state.duration, state.bassGain, state.midGain, state.highGain, state.mixVolumeDb]);

  // Helper functions for export
  const normalizeTo14LUFS = async (buffer: AudioBuffer): Promise<AudioBuffer> => {
    const targetLUFS = -14.0;
    const channelData = buffer.getChannelData(0);
    
    // Calculate current RMS
    let rmsSum = 0;
    for (let i = 0; i < channelData.length; i++) {
      rmsSum += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(rmsSum / channelData.length);
    const currentLUFS = estimateLUFS(rms);
    
    // Calculate gain adjustment
    const gainAdjustment = targetLUFS - currentLUFS;
    const linearGain = Math.pow(10, gainAdjustment / 20);
    
    // Apply normalization
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const channelData = buffer.getChannelData(c);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] *= linearGain;
        // Apply soft limiting
        if (Math.abs(channelData[i]) > 0.95) {
          channelData[i] = channelData[i] > 0 ? 0.95 : -0.95;
        }
      }
    }
    
    return buffer;
  };

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
    
    // Convert samples to 24-bit
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let c = 0; c < channels; c++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
        const intSample = Math.round(sample * 8388607); // 24-bit max value
        
        view.setInt8(offset, intSample & 0xFF);
        view.setInt8(offset + 1, (intSample >> 8) & 0xFF);
        view.setInt8(offset + 2, (intSample >> 16) & 0xFF);
        offset += 3;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  // Cleanup
  useEffect(() => {
    initializeAudio();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [initializeAudio]);

  return {
    // State
    state,
    
    // Audio nodes refs for visualization
    mixAnalyserNode: mixAnalyserNodeRef.current,
    mixFftData: mixFftDataRef.current,
    
    // Methods
    loadStems,
    playPause,
    stop,
    updateMixVolume,
    updateStemVolume,
    toggleStemMute,
    adjustGlobalEQ,
    adjustStemEQ,
    applyPreset,
    exportMix
  };
}
