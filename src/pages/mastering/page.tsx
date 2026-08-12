import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PRESETS } from '../home/components/mixTypes';
import type { MixPreset } from '../home/components/mixTypes';
import { recommendPresetFromAnalysis } from '../home/components/presetRecommendation';
import type { PresetRecommendation } from '../home/components/presetRecommendation';
import { analyzeAudioFile, formatDuration, formatFileSize } from './audioAnalysis';
import type { AudioFileAnalysis } from './audioAnalysis';
import {
  claimFreeMaster,
  getMasteringEntitlements,
  listMasteringConfigurations,
  saveMasteringConfiguration as saveRemoteMasteringConfiguration,
  secureMasteringAccessEnabled,
} from './masteringAccess';
import { createMaster } from './masteringEngine';
import type { LoudnessProfile, MasteringResult } from './masteringEngine';
import { downloadBlob, downloadObjectUrl, saveBlobToDisk } from '../../utils/downloadFile';
import './mastering.css';

type Stage = 'upload' | 'analyzing' | 'configure' | 'processing' | 'compare' | 'complete';

interface SavedMasteringConfiguration {
  id: string;
  name: string;
  presetId: string;
  strength: number;
  stereo: number;
  loudness: LoudnessProfile;
}

const acceptedExtensions = /\.(wav|wave|aif|aiff|mp3|flac|m4a)$/i;
const maxFileSize = 600 * 1024 * 1024;

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="master-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

/** Keep the result screen available even if a browser reports a missing meter value. */
function formatNumber(value: unknown, digits = 1) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('audioMixerUser') || '{}'); }
  catch { return {}; }
}

export default function MasteringPage({ onExit }: { onExit?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const incomingFileHandled = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const originalCompareRef = useRef<HTMLAudioElement>(null);
  const masterCompareRef = useRef<HTMLAudioElement>(null);
  const liveMeterCanvasRef = useRef<HTMLCanvasElement>(null);
  const meterContextRef = useRef<AudioContext | null>(null);
  const meterSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const meterAnalyserRef = useRef<AnalyserNode | null>(null);
  const meterAnimationRef = useRef<number | null>(null);
  const meterEnergyRef = useRef({ sum: 0, count: 0 });
  const [stage, setStage] = useState<Stage>('upload');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [analysis, setAnalysis] = useState<AudioFileAnalysis | null>(null);
  const [error, setError] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<MixPreset>(PRESETS[0]);
  const [presetRecommendation, setPresetRecommendation] = useState<PresetRecommendation | null>(null);
  const [strength, setStrength] = useState(50);
  const [loudness, setLoudness] = useState<LoudnessProfile>('streaming');
  const [stereo, setStereo] = useState(25);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingLabel, setProcessingLabel] = useState('Preparando motor');
  const [masterResult, setMasterResult] = useState<MasteringResult | null>(null);
  const [masterUrl, setMasterUrl] = useState('');
  const [masterMp3Url, setMasterMp3Url] = useState('');
  const [volumeMatched, setVolumeMatched] = useState(true);
  const [downloadGrantedForCurrentResult, setDownloadGrantedForCurrentResult] = useState(false);
  const [sourceWasGeneratedMix, setSourceWasGeneratedMix] = useState(false);
  const [downloadedFormat, setDownloadedFormat] = useState<'MP3' | 'WAV 24-bit' | null>(null);
  const [liveMomentary, setLiveMomentary] = useState(-60);
  const [liveIntegrated, setLiveIntegrated] = useState(-60);
  const [savedConfigurations, setSavedConfigurations] = useState<SavedMasteringConfiguration[]>(() => {
    const user = getStoredUser();
    const key = user.id || user.email || 'guest';
    try { return JSON.parse(localStorage.getItem(`mixingmusic_master_configs_${key}`) || '[]'); }
    catch { return []; }
  });
  const [localUnlimited] = useState(() => {
    const user = getStoredUser();
    return user.is_pro === true || user.plan === 'unlimited';
  });
  const [secureUnlimited, setSecureUnlimited] = useState<boolean | null>(null);
  const isUnlimited = secureMasteringAccessEnabled ? secureUnlimited === true : localUnlimited;

  useEffect(() => {
    document.body.classList.add('page-mastering-v3');
    if (!localStorage.getItem('audioMixerUser')) {
      navigate('/auth/register?mode=master', { replace: true });
    }
    return () => document.body.classList.remove('page-mastering-v3');
  }, [navigate]);

  useEffect(() => {
    if (!secureMasteringAccessEnabled) return;
    let active = true;
    (async () => {
      try {
        const entitlements = await getMasteringEntitlements();
        if (!active) return;
        setSecureUnlimited(entitlements.unlimited);
        if (entitlements.unlimited) {
          try {
            const configurations = await listMasteringConfigurations();
            if (active) setSavedConfigurations(configurations);
          } catch {
            if (active) setError('Tu plan está activo, pero no pudimos cargar las configuraciones guardadas.');
          }
        } else if (active) {
          setSavedConfigurations([]);
        }
      } catch (accessError) {
        if (!active) return;
        setSecureUnlimited(false);
        if (accessError instanceof Error && accessError.message === 'SECURE_SESSION_REQUIRED') {
          setError('Tu sesión debe verificarse de nuevo antes de descargar o usar funciones Unlimited. Ingresa nuevamente a tu cuenta.');
        } else {
          setError('No pudimos validar temporalmente tu plan. Las descargas premium permanecerán protegidas hasta reintentar.');
        }
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => () => {
    if (masterUrl) URL.revokeObjectURL(masterUrl);
  }, [masterUrl]);

  useEffect(() => () => {
    if (masterMp3Url) URL.revokeObjectURL(masterMp3Url);
  }, [masterMp3Url]);

  useEffect(() => () => {
    if (meterAnimationRef.current) cancelAnimationFrame(meterAnimationRef.current);
    meterContextRef.current?.close().catch(() => {});
  }, []);

  const drawLiveMeter = (lufs: number) => {
    const canvas = liveMeterCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#0b0910';
    context.fillRect(0, 0, width, height);
    const normalized = Math.max(0, Math.min(1, (lufs + 48) / 43));
    const barHeight = Math.round((height - 18) * normalized);
    const gradient = context.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#42d58b');
    gradient.addColorStop(.66, '#42d58b');
    gradient.addColorStop(.82, '#f2b84b');
    gradient.addColorStop(.94, '#ef4aa8');
    gradient.addColorStop(1, '#f06767');
    context.fillStyle = gradient;
    context.fillRect(11, height - 9 - barHeight, 24, barHeight);
    context.fillRect(43, height - 9 - Math.round(barHeight * .96), 24, Math.round(barHeight * .96));
    context.strokeStyle = 'rgba(255,255,255,.16)';
    context.setLineDash([3, 3]);
    const targetLufs = masterResult?.integratedLufs ?? -16;
    const targetY = height - 9 - Math.round((height - 18) * ((targetLufs + 48) / 43));
    context.beginPath(); context.moveTo(5, targetY); context.lineTo(width - 5, targetY); context.stroke();
    context.setLineDash([]);
  };

  const stopLiveMeter = () => {
    if (meterAnimationRef.current) cancelAnimationFrame(meterAnimationRef.current);
    meterAnimationRef.current = null;
  };

  const releaseLiveMeter = () => {
    stopLiveMeter();
    meterContextRef.current?.close().catch(() => {});
    meterContextRef.current = null;
    meterSourceRef.current = null;
    meterAnalyserRef.current = null;
  };

  const startLiveMeter = async () => {
    const element = masterCompareRef.current;
    if (!element) return;
    let context = meterContextRef.current;
    if (!context) {
      context = new AudioContext();
      meterContextRef.current = context;
    }
    if (context.state === 'suspended') await context.resume();
    if (!meterSourceRef.current) {
      const source = context.createMediaElementSource(element);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = .62;
      source.connect(analyser);
      analyser.connect(context.destination);
      meterSourceRef.current = source;
      meterAnalyserRef.current = analyser;
    }
    meterEnergyRef.current = { sum: 0, count: 0 };
    setLiveMomentary(-60);
    setLiveIntegrated(-60);
    stopLiveMeter();
    const analyser = meterAnalyserRef.current;
    if (!analyser) return;
    const samples = new Float32Array(analyser.fftSize);
    const loop = () => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (let index = 0; index < samples.length; index += 1) sum += samples[index] * samples[index];
      const rms = Math.sqrt(sum / samples.length);
      const playbackGainDb = element.volume > 0 ? 20 * Math.log10(element.volume) : 0;
      const loudnessCalibrationDb = masterResult
        && Number.isFinite(masterResult.integratedLufs)
        && Number.isFinite(masterResult.averageDbfs)
        ? masterResult.integratedLufs - masterResult.averageDbfs
        : 0;
      const momentary = rms > .00001
        ? Math.max(-60, Math.min(0, 20 * Math.log10(rms) - playbackGainDb + loudnessCalibrationDb))
        : -60;
      setLiveMomentary(momentary);
      if (momentary > -55) {
        meterEnergyRef.current.sum += 10 ** (momentary / 10);
        meterEnergyRef.current.count += 1;
        setLiveIntegrated(10 * Math.log10(meterEnergyRef.current.sum / meterEnergyRef.current.count));
      }
      drawLiveMeter(momentary);
      meterAnimationRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  useEffect(() => {
    if (stage !== 'compare') return;
    const frame = requestAnimationFrame(() => drawLiveMeter(-60));
    return () => cancelAnimationFrame(frame);
  }, [stage]);

  useEffect(() => {
    const original = originalCompareRef.current;
    const mastered = masterCompareRef.current;
    if (!original || !mastered || !masterResult) return;
    original.volume = 1;
    mastered.volume = 1;
    if (!volumeMatched) return;
    if (masterResult.loudnessMatchGainDb <= 0) {
      mastered.volume = Math.max(0.05, Math.min(1, 10 ** (masterResult.loudnessMatchGainDb / 20)));
    } else {
      original.volume = Math.max(0.05, Math.min(1, 10 ** (-masterResult.loudnessMatchGainDb / 20)));
    }
  }, [masterResult, volumeMatched, stage]);

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setStage('upload');
    setFile(null);
    setAudioUrl('');
    setAnalysis(null);
    setPresetRecommendation(null);
    setMasterResult(null);
    if (masterUrl) URL.revokeObjectURL(masterUrl);
    setMasterUrl('');
    if (masterMp3Url) URL.revokeObjectURL(masterMp3Url);
    setMasterMp3Url('');
    setDownloadGrantedForCurrentResult(false);
    setSourceWasGeneratedMix(false);
    setDownloadedFormat(null);
    releaseLiveMeter();
    setLiveMomentary(-60);
    setLiveIntegrated(-60);
    setVolumeMatched(true);
    setError('');
  };

  const processMaster = async () => {
    if (!file || !analysis) return;
    setError('');
    setProcessingProgress(4);
    setProcessingLabel('Masterizando mezcla con IA');
    setStage('processing');
    try {
      const result = await createMaster(
        file,
        analysis,
        { preset: selectedPreset, strength, stereo, loudness },
        (progress, label) => {
          setProcessingProgress(progress);
          setProcessingLabel(`Masterizando mezcla con IA · ${label}`);
        },
      );
      if (masterUrl) URL.revokeObjectURL(masterUrl);
      if (masterMp3Url) URL.revokeObjectURL(masterMp3Url);
      setMasterResult(result);
      setMasterUrl(URL.createObjectURL(result.wav24));
      setMasterMp3Url(URL.createObjectURL(result.mp3));
      setDownloadGrantedForCurrentResult(false);
      setVolumeMatched(true);
      setStage('compare');
    } catch (processingError) {
      setError(processingError instanceof Error ? processingError.message : 'No pudimos procesar este master.');
      setStage('configure');
    }
  };

  const downloadGeneratedMix = () => {
    if (!audioUrl || !file) return;
    downloadObjectUrl(audioUrl, 'mezcla-v3-mixingmusic-24bit.wav');
  };

  const downloadWav = async () => {
    if (!masterResult || !file) return;
    if (!isUnlimited) {
      setError('La descarga WAV de 24 bits pertenece al plan Unlimited. El plan Gratis podrá descargar este master en MP3.');
      return;
    }
    setError('');
    try {
      const saved = await saveBlobToDisk(
        masterResult.wav24,
        `${file.name.replace(/\.[^.]+$/, '')}-master-mixingmusic-24bit.wav`,
        'audio/wav',
        '.wav',
      );
      if (!saved) return;
      setDownloadedFormat('WAV 24-bit');
      setStage('complete');
    } catch (downloadError) {
      setError(downloadError instanceof Error
        ? `No se pudo guardar el WAV: ${downloadError.message}`
        : 'No se pudo guardar el WAV. Inténtalo nuevamente.');
    }
  };

  const downloadMp3 = async () => {
    if (!masterResult || !file) return;
    if (!isUnlimited && !downloadGrantedForCurrentResult) {
      if (secureMasteringAccessEnabled) {
        try {
          await claimFreeMaster();
        } catch (accessError) {
          const code = accessError instanceof Error ? accessError.message : '';
          setError(code === 'FREE_MASTER_LIMIT_REACHED'
            ? 'Ya utilizaste la descarga master incluida en el plan Gratis. Unlimited incluye masters y descargas sin límite.'
            : code === 'SECURE_SESSION_REQUIRED'
              ? 'Ingresa nuevamente a tu cuenta para validar tu descarga gratuita.'
              : 'No pudimos validar la descarga. Inténtalo nuevamente.');
          if (code === 'FREE_MASTER_LIMIT_REACHED') navigate('/checkout-v3');
          return;
        }
      } else {
        const user = getStoredUser();
        const identity = user.id || user.email || 'guest';
        const usageKey = `mixingmusic_free_master_v3_${identity}`;
        if (localStorage.getItem(usageKey) === 'used') {
          setError('Ya utilizaste la descarga master incluida en el plan Gratis. Unlimited incluye masters y descargas sin límite.');
          navigate('/checkout-v3');
          return;
        }
        localStorage.setItem(usageKey, 'used');
      }
      setDownloadGrantedForCurrentResult(true);
    }
    downloadBlob(masterResult.mp3, `${file.name.replace(/\.[^.]+$/, '')}-master-mixingmusic-320kbps.mp3`);
    setDownloadedFormat('MP3');
    setStage('complete');
  };

  const saveConfiguration = async () => {
    if (!isUnlimited) {
      setError('Guardar configuraciones es una función de Unlimited.');
      return;
    }
    const configuration = {
      name: `${selectedPreset.name} · ${savedConfigurations.length + 1}`,
      presetId: selectedPreset.id,
      strength,
      stereo,
      loudness,
    };
    if (secureMasteringAccessEnabled) {
      try {
        const saved = await saveRemoteMasteringConfiguration(configuration);
        setSavedConfigurations((current) => [saved, ...current].slice(0, 20));
        setError('Configuración guardada en tu cuenta.');
      } catch (accessError) {
        setError(accessError instanceof Error && accessError.message === 'SECURE_SESSION_REQUIRED'
          ? 'Ingresa nuevamente para guardar la configuración en tu cuenta.'
          : 'No pudimos guardar la configuración. Inténtalo nuevamente.');
      }
      return;
    }
    const user = getStoredUser();
    const key = user.id || user.email || 'guest';
    const localConfiguration: SavedMasteringConfiguration = { id: crypto.randomUUID(), ...configuration };
    const updated = [...savedConfigurations, localConfiguration].slice(-20);
    localStorage.setItem(`mixingmusic_master_configs_${key}`, JSON.stringify(updated));
    setSavedConfigurations(updated);
    setError('Configuración guardada. Podrás reutilizarla en tus próximos masters desde este dispositivo.');
  };

  const loadConfiguration = (id: string) => {
    const configuration = savedConfigurations.find((item) => item.id === id);
    const preset = PRESETS.find((item) => item.id === configuration?.presetId);
    if (!configuration || !preset) return;
    setSelectedPreset(preset);
    setStrength(configuration.strength);
    setStereo(configuration.stereo);
    setLoudness(configuration.loudness);
    setError('');
  };

  const saveAndExit = () => {
    const user = getStoredUser();
    const identity = user.id || user.email || 'guest';
    localStorage.setItem(`mixingmusic_master_draft_${identity}`, JSON.stringify({
      presetId: selectedPreset.id,
      strength,
      stereo,
      loudness,
      fileName: file?.name || '',
      updatedAt: new Date().toISOString(),
    }));
    if (onExit) {
      onExit();
      return;
    }
    navigate('/');
  };

  const processFile = async (candidate?: File) => {
    if (!candidate) return;
    setError('');

    if (!candidate.type.startsWith('audio/') && !acceptedExtensions.test(candidate.name)) {
      setError('Selecciona una mezcla en WAV, AIFF, MP3, FLAC o M4A.');
      return;
    }
    if (candidate.size > maxFileSize) {
      setError('El archivo supera el máximo de 600 MB.');
      return;
    }

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const nextUrl = URL.createObjectURL(candidate);
    setFile(candidate);
    setAudioUrl(nextUrl);
    setAnalysis(null);
    setStage('analyzing');

    try {
      const result = await analyzeAudioFile(candidate);
      if (result.channels !== 2) {
        setError(`El archivo tiene ${result.channels} canal${result.channels === 1 ? '' : 'es'}. Para mastering necesitamos una mezcla estéreo.`);
        setStage('upload');
        return;
      }
      setAnalysis(result);
      const recommendation = recommendPresetFromAnalysis(candidate, result);
      setPresetRecommendation(recommendation);
      setSelectedPreset(recommendation.preset);
      setStereo(result.isDualMono ? 0 : Math.round(recommendation.preset.stereoWidth * 50));
      setStage('configure');
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'No pudimos analizar el archivo.');
      setStage('upload');
    }
  };

  useEffect(() => {
    const incomingState = location.state as { file?: File; fromMix?: boolean } | null;
    const incomingFile = incomingState?.file;
    if (!incomingFile || incomingFileHandled.current) return;
    incomingFileHandled.current = true;
    setSourceWasGeneratedMix(incomingState?.fromMix === true);
    processFile(incomingFile);
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [location.state]);

  const status = analysis?.isClipping
    ? { tone: 'danger', title: 'La mezcla presenta clipping', text: 'Podemos trabajar con ella, pero el resultado será mejor si exportas el premaster sin limitador.' }
    : analysis && analysis.headroomDb < 1
      ? { tone: 'warning', title: 'La mezcla tiene poco headroom', text: 'El procesamiento será conservador para evitar distorsión adicional.' }
      : analysis?.isDualMono
        ? { tone: 'warning', title: 'Mezcla dual-mono detectada', text: 'Preservaremos su imagen mono y no aplicaremos amplitud artificial.' }
        : { tone: 'good', title: 'Archivo listo para mastering', text: 'La mezcla es estéreo y conserva margen suficiente para continuar.' };

  return (
    <main className="master-page">
      <header className="master-header">
        <button className="master-logo" onClick={() => navigate('/')}>
          <img src="/logo-brand.png" alt="MixingMusic.AI" />
          <span>MASTERING V3</span>
        </button>
        <button className="master-exit" onClick={saveAndExit}>Guardar y salir</button>
      </header>

      <div className="master-shell">
        <div className="master-progress" aria-label="Progreso del mastering">
          {['Cargar mezcla', 'Definir sonido', 'Comparar', 'Exportar'].map((step, index) => {
            const activeIndex = stage === 'upload' || stage === 'analyzing' ? 0 : stage === 'configure' || stage === 'processing' ? 1 : stage === 'compare' ? 2 : 3;
            return (
              <div className={index <= activeIndex ? 'active' : ''} key={step}>
                <i>{index + 1}</i><span>{step}</span>
              </div>
            );
          })}
        </div>

        {(stage === 'upload' || stage === 'analyzing') && (
          <section className="master-upload-section">
            <div className="master-intro">
              <span className="master-kicker">MASTERING INDIVIDUAL</span>
              <h1>Sube tu mezcla terminada.</h1>
              <p>Analizaremos el archivo antes de aplicar cualquier procesamiento. Tu original nunca será modificado.</p>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="audio/*,.wav,.wave,.aif,.aiff,.mp3,.flac,.m4a"
              hidden
              onChange={(event) => {
                processFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <button
              className={`master-dropzone ${dragging ? 'dragging' : ''} ${stage === 'analyzing' ? 'analyzing' : ''}`}
              onClick={() => stage !== 'analyzing' && inputRef.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                processFile(event.dataTransfer.files[0]);
              }}
            >
              {stage === 'analyzing' ? (
                <>
                  <div className="master-spinner" />
                  <span className="master-kicker">IA DE ANÁLISIS</span>
                  <h2>Analizando mezcla con IA</h2>
                  <p>Leemos canales, resolución, loudness, dinámica, fase y margen de entrega.</p>
                  <div className="master-analysis-line"><span /></div>
                </>
              ) : (
                <>
                  <div className="master-upload-icon">↑</div>
                  <h2>Arrastra tu premezcla aquí</h2>
                  <p>o haz clic para seleccionar el archivo</p>
                  <strong>WAV o AIFF recomendado · Estéreo · Hasta 600 MB</strong>
                </>
              )}
            </button>

            {error && <div className="master-error"><strong>No pudimos continuar.</strong><span>{error}</span></div>}

            <div className="master-preflight">
              <div><i>✓</i><span><strong>Recomendado</strong>WAV/AIFF de 24 bits</span></div>
              <div><i>✓</i><span><strong>Mejor resultado</strong>Sin limitador · pico máximo entre −12 y −9 dBFS</span></div>
              <div><i>✓</i><span><strong>Privacidad</strong>El original se conserva intacto</span></div>
            </div>
          </section>
        )}

        {stage === 'configure' && analysis && file && (
          <section className="master-configure">
            {sourceWasGeneratedMix && (
              <div className="master-mix-ready">
                <div><span className="master-kicker">MEZCLA GENERADA CON IA</span><h1>Tu mezcla está lista.</h1><p>Escúchala, descárgala si quieres conservar el premaster y define abajo cómo masterizarla.</p></div>
                <button onClick={downloadGeneratedMix}>Descargar mezcla WAV 24-bit ↓</button>
              </div>
            )}
            <div className="master-filebar">
              <div className="master-file-icon">♫</div>
              <div>
                <strong>{analysis.name}</strong>
                <span>{formatFileSize(analysis.sizeBytes)} · {formatDuration(analysis.durationSeconds)}</span>
              </div>
              <audio ref={audioRef} controls src={audioUrl} />
              <button onClick={reset}>Cambiar archivo</button>
            </div>

            <div className={`master-status ${status.tone}`}>
              <i>{status.tone === 'good' ? '✓' : '!'}</i>
              <div><strong>{status.title}</strong><span>{status.text}</span></div>
            </div>

            <div className="master-metrics">
              <Metric label="Resolución" value={analysis.bitDepth ? `${analysis.bitDepth}-bit` : 'No detectada'} note={`${(analysis.sampleRate / 1000).toFixed(1)} kHz`} />
              <Metric label="Imagen estéreo" value={analysis.isDualMono ? "Dual-mono" : "Estéreo"} note={analysis.stereoCorrelation === null ? "Sin lectura de fase" : `Correlación ${analysis.stereoCorrelation.toFixed(2)}`} />
              <Metric label="Pico máximo" value={`${analysis.peakDbfs.toFixed(1)} dBFS`} note={`${analysis.headroomDb.toFixed(1)} dB de margen`} />
              <Metric label="Loudness integrado" value={`${analysis.integratedLufs.toFixed(1)} LUFS`} note={`ITU-R BS.1770 · promedio ${analysis.averageDbfs.toFixed(1)} dBFS`} />
            </div>
            <button className="master-concepts-link" onClick={() => navigate('/conceptos-audio')}>
              ¿No conoces LUFS, dBFS o headroom? Ver conceptos de audio →
            </button>

            <div className="master-config-grid">
              <div className="master-preset-panel">
                <span className="master-kicker">1. ELIGE EL CARÁCTER</span>
                <h2>Preset de mastering</h2>
                <p>Usamos los perfiles actuales de MixingMusic como punto de partida.</p>
                {presetRecommendation && (
                  <div className="master-recommendation" style={{ '--preset': presetRecommendation.preset.color } as React.CSSProperties}>
                    <div>
                      <span>✦ IA RECOMIENDA · CONFIANZA {presetRecommendation.confidence.toUpperCase()}</span>
                      <strong>{presetRecommendation.preset.name}</strong>
                      <small>{presetRecommendation.reason} Puedes cambiarlo si buscas otro carácter.</small>
                    </div>
                    <button onClick={() => { setSelectedPreset(presetRecommendation.preset); setStereo(Math.round(presetRecommendation.preset.stereoWidth * 50)); }}>Usar recomendado</button>
                  </div>
                )}
                <div className="master-preset-list">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      className={selectedPreset.id === preset.id ? 'selected' : ''}
                      onClick={() => { setSelectedPreset(preset); setStereo(Math.round(preset.stereoWidth * 50)); }}
                      style={{ '--preset': preset.color } as React.CSSProperties}
                    >
                      <div>
                        {preset.wavePattern.slice(0, 6).map((height, index) => <i key={index} style={{ height: `${Math.max(18, height * 100)}%` }} />)}
                      </div>
                      <span>{preset.name}</span>
                      <b>{selectedPreset.id === preset.id ? '✓' : ''}</b>
                    </button>
                  ))}
                </div>
              </div>

              <div className="master-controls-panel">
                <span className="master-kicker">2. AJUSTA LA INTENCIÓN</span>
                <h2>Controles esenciales</h2>
                <div className="master-saved-configs">
                  <select
                    aria-label="Cargar configuración guardada"
                    defaultValue=""
                    onChange={(event) => { loadConfiguration(event.target.value); event.target.value = ''; }}
                    disabled={!isUnlimited || savedConfigurations.length === 0}
                  >
                    <option value="">{savedConfigurations.length ? 'Cargar configuración…' : 'Sin configuraciones guardadas'}</option>
                    {savedConfigurations.map((configuration) => <option value={configuration.id} key={configuration.id}>{configuration.name}</option>)}
                  </select>
                  <button onClick={saveConfiguration}>Guardar {isUnlimited ? '' : '· Unlimited'}</button>
                </div>
                <div className="master-control">
                  <div><strong>Intensidad</strong><span>{strength}%</span></div>
                  <input type="range" min="0" max="100" value={strength} onChange={(event) => setStrength(Number(event.target.value))} />
                  <small>Sutil</small><small>Fuerte</small>
                </div>
                <div className="master-control">
                  <div><strong>Amplitud estéreo</strong><span>{stereo}%</span></div>
                  <input type="range" min="0" max="60" value={stereo} disabled={analysis.isDualMono} onChange={(event) => setStereo(Number(event.target.value))} />
                  <small>Original</small><small>Amplia</small>
                </div>
                <div className="master-loudness">
                  <strong>Loudness</strong>
                  <div>
                    {(['streaming', 'balanced', 'competitive'] as const).map((option) => (
                      <button className={loudness === option ? 'selected' : ''} key={option} onClick={() => setLoudness(option)}>
                        {option === 'streaming' ? 'Streaming' : option === 'balanced' ? 'Dinámico' : 'Competitivo'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="master-safe"><i>✓</i><span><strong>Protección de pico digital</strong>Medimos LUFS integrados y True Peak. Streaming/Dinámico protegen a −1 dBTP; Competitivo a −2 dBTP.</span></div>
                <button className="master-continue" onClick={processMaster}>MASTERIZAR CON IA <span>→</span></button>
              </div>
            </div>
            {error && <div className="master-info">{error}</div>}
          </section>
        )}

        {stage === 'processing' && (
          <section className="master-processing">
            <div className="master-processing-orbit"><i /><b>{Math.round(processingProgress)}%</b></div>
            <span className="master-kicker">MOTOR DE MASTERING CON IA</span>
            <h1>{processingLabel}</h1>
            <p>Procesamos una copia de tu mezcla. El archivo original permanece intacto.</p>
            <div className="master-processing-bar"><span style={{ width: `${processingProgress}%` }} /></div>
            <div className="master-chain">
              {['Análisis IA', 'EQ tonal', 'Dinámica', 'Estéreo', 'True Peak', 'Exportación'].map((item, index) => (
                <div className={processingProgress >= (index + 1) * 15 ? 'done' : ''} key={item}><i>{processingProgress >= (index + 1) * 15 ? '✓' : index + 1}</i><span>{item}</span></div>
              ))}
            </div>
          </section>
        )}

        {stage === 'compare' && masterResult && file && (
          <section className="master-compare">
            <div className="master-compare-heading">
              <span className="master-kicker">MASTER GENERADO</span>
              <h1>Escucha el resultado.</h1>
              <p>Preset {selectedPreset.name} · Intensidad {strength}% · {loudness === 'streaming' ? 'Streaming' : loudness === 'balanced' ? 'Dinámico' : 'Competitivo'}</p>
              <label className="master-volume-match">
                <input type="checkbox" checked={volumeMatched} onChange={(event) => setVolumeMatched(event.target.checked)} />
                <span><strong>Comparar con volumen igualado</strong><small>Evita confundir “más fuerte” con “mejor”.</small></span>
              </label>
            </div>
            <div className="master-compare-grid">
              <article>
                <div><span>ORIGINAL</span><small>{volumeMatched ? 'Nivel de escucha igualado' : 'Volumen original'}</small></div>
                <audio
                  ref={originalCompareRef}
                  controls
                  src={audioUrl}
                  onPlay={() => { masterCompareRef.current?.pause(); stopLiveMeter(); }}
                  onTimeUpdate={(event) => {
                    const other = masterCompareRef.current;
                    if (other && !event.currentTarget.paused && Math.abs(other.currentTime - event.currentTarget.currentTime) > 0.35) other.currentTime = event.currentTarget.currentTime;
                  }}
                />
              </article>
              <article className="master-version">
                <div><span>MASTER V3</span><small>{volumeMatched ? `${formatNumber(masterResult.loudnessMatchGainDb)} dB para comparar` : 'WAV PCM 24 bits'}</small></div>
                <audio
                  ref={masterCompareRef}
                  controls
                  src={masterUrl}
                  onPlay={() => { originalCompareRef.current?.pause(); startLiveMeter(); }}
                  onPause={stopLiveMeter}
                  onEnded={() => { stopLiveMeter(); setLiveMomentary(-60); setLiveIntegrated(-60); drawLiveMeter(-60); }}
                  onTimeUpdate={(event) => {
                    const other = originalCompareRef.current;
                    if (other && !event.currentTarget.paused && Math.abs(other.currentTime - event.currentTarget.currentTime) > 0.35) other.currentTime = event.currentTarget.currentTime;
                  }}
                />
              </article>
            </div>
            <div className="master-live-meter">
              <div className="master-live-title"><span><i className={masterCompareRef.current?.paused === false ? 'live' : ''} />MEDICIÓN DEL MASTER EN TIEMPO REAL</span><small>Reproduce MASTER V3 · <button onClick={() => navigate('/conceptos-audio')}>¿Qué significa?</button></small></div>
              <div className="master-live-grid">
                <canvas ref={liveMeterCanvasRef} width="78" height="150" aria-label="Medidor VU en tiempo real" />
                <div><strong>{formatNumber(liveMomentary)}</strong><span>LUFS momentáneos</span><small>Nivel actual · cambia con la música</small></div>
                <div><strong>{formatNumber(liveIntegrated)}</strong><span>Promedio parcial</span><small>Desde que diste play</small></div>
                <div><strong>{formatNumber(masterResult.truePeakDbtp)}</strong><span>dBTP True Peak</span><small>{masterResult.deliveryStatus === "ready" ? "Validado para distribución" : "Revisar objetivo de loudness"}</small></div>
              </div>
              <p className="master-live-explanation">La lectura en vivo cambia segundo a segundo. <strong>{formatNumber(masterResult.integratedLufs)} LUFS</strong> es el promedio certificado del archivo completo.</p>
            </div>
            <div className="master-result-metrics">
              <Metric label="Preset" value={selectedPreset.name} note={`${strength}% de intensidad`} />
              <Metric label="Ganancia aplicada" value={`${masterResult.appliedGainDb >= 0 ? '+' : ''}${formatNumber(masterResult.appliedGainDb)} dB`} note="Antes del control final" />
              <Metric label="True Peak" value={`${formatNumber(masterResult.truePeakDbtp)} dBTP`} note={masterResult.deliveryStatus === "ready" ? "Listo para distribución" : "Revisar antes de publicar"} />
              <Metric label="LUFS final de la canción" value={`${formatNumber(masterResult.integratedLufs)} LUFS`} note={`Archivo completo · ITU-R BS.1770 · ${(analysis!.sampleRate / 1000).toFixed(1)} kHz`} />
            </div>
            <div className="master-compare-actions">
              <button className="master-secondary" onClick={() => { releaseLiveMeter(); setError(''); setStage('configure'); }}>← Ajustar sonido</button>
              <button className="master-download" onClick={downloadMp3}>Descargar MP3 320 kbps ↓</button>
              <button className="master-download" onClick={downloadWav}>Descargar WAV 24-bit {isUnlimited ? '↓' : '· Unlimited'}</button>
            </div>
            {!isUnlimited && <p className="master-free-export">Plan Gratis: descarga este master en MP3. WAV real de 24 bits es exclusivo Unlimited.</p>}
            <p className="master-free-export">Codificación MP3 con <a href="https://lame.sourceforge.io/" target="_blank" rel="noreferrer">LAME</a> mediante Mediabunny.</p>
            {error && <div className="master-info">{error}</div>}
          </section>
        )}

        {stage === 'complete' && masterResult && file && (
          <section className="master-complete">
            <div className="master-complete-check">✓</div>
            <span className="master-kicker">PROCESO TERMINADO</span>
            <h1>Tu master se ha generado.</h1>
            <p>Descargaste {downloadedFormat}. El archivo original permanece intacto y tu master está listo para publicar.</p>
            <div className="master-complete-summary">
              <div><span>PRESET</span><strong>{selectedPreset.name}</strong></div>
              <div><span>LOUDNESS</span><strong>{formatNumber(masterResult.integratedLufs)} LUFS</strong></div>
              <div><span>PICO</span><strong>{formatNumber(masterResult.peakDbfs)} dBFS</strong></div>
            </div>
            {!isUnlimited && (
              <div className="master-complete-upgrade">
                <div><span>UNLIMITED PARA SIEMPRE</span><strong>US$14.99 · un solo pago</strong><small>No es suscripción. Sin mensualidades ni renovación.</small></div>
                <button onClick={() => navigate('/checkout-v3')}>Activar Unlimited con PayPal →</button>
              </div>
            )}
            <h2>¿Qué quieres hacer ahora?</h2>
            <div className="master-next-grid">
              <button style={{'--next-color':'#10B981'} as React.CSSProperties} onClick={() => navigate('/')}><div className="master-next-wave">{[.5,.9,.4,.8,.5,.9,.4,.8,.5,.9,.4,.8].map((height,index)=><em key={index} style={{height:`${height*100}%`}} />)}</div><i>≋</i><strong>Hacer otra mezcla</strong><span>Subir stems separados</span><b>Crear mezcla →</b></button>
              <button style={{'--next-color':'#6366F1'} as React.CSSProperties} onClick={() => isUnlimited ? reset() : navigate('/checkout-v3')}><div className="master-next-wave">{[.9,.2,.9,.2,.9,.2,.9,.2,.9,.2,.9,.2].map((height,index)=><em key={index} style={{height:`${height*100}%`}} />)}</div><i>◇</i><strong>Masterizar otra mezcla</strong><span>{isUnlimited ? 'Subir una premezcla' : 'Requiere Unlimited'}</span><b>{isUnlimited ? 'Subir mezcla →' : 'Activar Unlimited →'}</b></button>
              <button style={{'--next-color':'#EC4899'} as React.CSSProperties} onClick={() => isUnlimited ? navigate('/mastering/album') : navigate('/checkout-v3')}><div className="master-next-wave">{[.3,.5,.7,.9,.8,.6,.5,.7,.8,.6,.4,.5].map((height,index)=><em key={index} style={{height:`${height*100}%`}} />)}</div><i>▦</i><strong>Masterizar un álbum</strong><span>{isUnlimited ? 'Hasta 12 canciones' : 'Requiere Unlimited'}</span><b>{isUnlimited ? 'Crear álbum →' : 'Activar Unlimited →'}</b></button>
            </div>
            <button className="master-home-button" onClick={() => navigate('/')}>← Volver al home</button>
          </section>
        )}
      </div>
    </main>
  );
}
