import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PRESETS } from '../home/components/mixTypes';
import type { MixPreset } from '../home/components/mixTypes';
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
import './mastering.css';

type Stage = 'upload' | 'analyzing' | 'configure' | 'processing' | 'compare';

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
  const [stage, setStage] = useState<Stage>('upload');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [analysis, setAnalysis] = useState<AudioFileAnalysis | null>(null);
  const [error, setError] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<MixPreset>(PRESETS[0]);
  const [strength, setStrength] = useState(50);
  const [loudness, setLoudness] = useState<LoudnessProfile>('balanced');
  const [stereo, setStereo] = useState(25);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingLabel, setProcessingLabel] = useState('Preparando motor');
  const [masterResult, setMasterResult] = useState<MasteringResult | null>(null);
  const [masterUrl, setMasterUrl] = useState('');
  const [masterMp3Url, setMasterMp3Url] = useState('');
  const [volumeMatched, setVolumeMatched] = useState(true);
  const [downloadGrantedForCurrentResult, setDownloadGrantedForCurrentResult] = useState(false);
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
    setMasterResult(null);
    if (masterUrl) URL.revokeObjectURL(masterUrl);
    setMasterUrl('');
    if (masterMp3Url) URL.revokeObjectURL(masterMp3Url);
    setMasterMp3Url('');
    setDownloadGrantedForCurrentResult(false);
    setVolumeMatched(true);
    setError('');
  };

  const processMaster = async () => {
    if (!file || !analysis) return;
    setError('');
    setProcessingProgress(4);
    setProcessingLabel('Preparando motor');
    setStage('processing');
    try {
      const result = await createMaster(
        file,
        analysis,
        { preset: selectedPreset, strength, stereo, loudness },
        (progress, label) => {
          setProcessingProgress(progress);
          setProcessingLabel(label);
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

  const downloadWav = () => {
    if (!masterUrl || !file) return;
    if (!isUnlimited) {
      setError('La descarga WAV de 24 bits pertenece al plan Unlimited. El plan Gratis podrá descargar este master en MP3.');
      return;
    }
    const link = document.createElement('a');
    link.href = masterUrl;
    link.download = `${file.name.replace(/\.[^.]+$/, '')}-master-mixingmusic-24bit.wav`;
    link.click();
  };

  const downloadMp3 = async () => {
    if (!masterMp3Url || !file) return;
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
          return;
        }
      } else {
        const user = getStoredUser();
        const identity = user.id || user.email || 'guest';
        const usageKey = `mixingmusic_free_master_v3_${identity}`;
        if (localStorage.getItem(usageKey) === 'used') {
          setError('Ya utilizaste la descarga master incluida en el plan Gratis. Unlimited incluye masters y descargas sin límite.');
          return;
        }
        localStorage.setItem(usageKey, 'used');
      }
      setDownloadGrantedForCurrentResult(true);
    }
    const link = document.createElement('a');
    link.href = masterMp3Url;
    link.download = `${file.name.replace(/\.[^.]+$/, '')}-master-mixingmusic-320kbps.mp3`;
    link.click();
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
      setStage('configure');
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'No pudimos analizar el archivo.');
      setStage('upload');
    }
  };

  useEffect(() => {
    const incomingFile = (location.state as { file?: File } | null)?.file;
    if (!incomingFile || incomingFileHandled.current) return;
    incomingFileHandled.current = true;
    processFile(incomingFile);
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [location.state]);

  const status = analysis?.isClipping
    ? { tone: 'danger', title: 'La mezcla presenta clipping', text: 'Podemos trabajar con ella, pero el resultado será mejor si exportas el premaster sin limitador.' }
    : analysis && analysis.headroomDb < 1
      ? { tone: 'warning', title: 'La mezcla tiene poco headroom', text: 'El procesamiento será conservador para evitar distorsión adicional.' }
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
            const activeIndex = stage === 'upload' || stage === 'analyzing' ? 0 : stage === 'configure' || stage === 'processing' ? 1 : 2;
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
                  <h2>Analizando {file?.name}</h2>
                  <p>Estamos leyendo canales, resolución, nivel y margen dinámico.</p>
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
              <div><i>✓</i><span><strong>Mejor resultado</strong>Sin limitador en el mix bus</span></div>
              <div><i>✓</i><span><strong>Privacidad</strong>El original se conserva intacto</span></div>
            </div>
          </section>
        )}

        {stage === 'configure' && analysis && file && (
          <section className="master-configure">
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
              <Metric label="Canales" value="Estéreo" note="2 canales" />
              <Metric label="Pico máximo" value={`${analysis.peakDbfs.toFixed(1)} dBFS`} note={`${analysis.headroomDb.toFixed(1)} dB de margen`} />
              <Metric label="Loudness integrado" value={`${analysis.integratedLufs.toFixed(1)} LUFS`} note={`ITU-R BS.1770 · promedio ${analysis.averageDbfs.toFixed(1)} dBFS`} />
            </div>

            <div className="master-config-grid">
              <div className="master-preset-panel">
                <span className="master-kicker">1. ELIGE EL CARÁCTER</span>
                <h2>Preset de mastering</h2>
                <p>Usamos los perfiles actuales de MixingMusic como punto de partida.</p>
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
                  <input type="range" min="0" max="60" value={stereo} onChange={(event) => setStereo(Number(event.target.value))} />
                  <small>Original</small><small>Amplia</small>
                </div>
                <div className="master-loudness">
                  <strong>Loudness</strong>
                  <div>
                    {(['streaming', 'balanced', 'competitive'] as const).map((option) => (
                      <button className={loudness === option ? 'selected' : ''} key={option} onClick={() => setLoudness(option)}>
                        {option === 'streaming' ? 'Streaming' : option === 'balanced' ? 'Balanceado' : 'Competitivo'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="master-safe"><i>✓</i><span><strong>Protección de pico digital</strong>El master inicial no superará −1.2 dBFS. La medición True Peak se validará por separado.</span></div>
                <button className="master-continue" onClick={processMaster}>Procesar master <span>→</span></button>
              </div>
            </div>
            {error && <div className="master-info">{error}</div>}
          </section>
        )}

        {stage === 'processing' && (
          <section className="master-processing">
            <div className="master-processing-orbit"><i /><b>{Math.round(processingProgress)}%</b></div>
            <span className="master-kicker">MOTOR V3</span>
            <h1>{processingLabel}</h1>
            <p>Procesamos una copia de tu mezcla. El archivo original permanece intacto.</p>
            <div className="master-processing-bar"><span style={{ width: `${processingProgress}%` }} /></div>
            <div className="master-chain">
              {['Análisis', 'EQ tonal', 'Dinámica', 'Estéreo', 'Pico', 'Exportación'].map((item, index) => (
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
              <p>Preset {selectedPreset.name} · Intensidad {strength}% · {loudness === 'streaming' ? 'Streaming' : loudness === 'balanced' ? 'Balanceado' : 'Competitivo'}</p>
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
                  onPlay={() => masterCompareRef.current?.pause()}
                  onTimeUpdate={(event) => {
                    const other = masterCompareRef.current;
                    if (other && !event.currentTarget.paused && Math.abs(other.currentTime - event.currentTarget.currentTime) > 0.35) other.currentTime = event.currentTarget.currentTime;
                  }}
                />
              </article>
              <article className="master-version">
                <div><span>MASTER V3</span><small>{volumeMatched ? `${masterResult.loudnessMatchGainDb.toFixed(1)} dB para comparar` : 'WAV PCM 24 bits'}</small></div>
                <audio
                  ref={masterCompareRef}
                  controls
                  src={masterUrl}
                  onPlay={() => originalCompareRef.current?.pause()}
                  onTimeUpdate={(event) => {
                    const other = originalCompareRef.current;
                    if (other && !event.currentTarget.paused && Math.abs(other.currentTime - event.currentTarget.currentTime) > 0.35) other.currentTime = event.currentTarget.currentTime;
                  }}
                />
              </article>
            </div>
            <div className="master-result-metrics">
              <Metric label="Preset" value={selectedPreset.name} note={`${strength}% de intensidad`} />
              <Metric label="Ganancia aplicada" value={`${masterResult.appliedGainDb >= 0 ? '+' : ''}${masterResult.appliedGainDb.toFixed(1)} dB`} note="Antes del control final" />
              <Metric label="Pico de muestra" value={`${masterResult.peakDbfs.toFixed(1)} dBFS`} note={`Techo ${masterResult.samplePeakCeilingDbfs.toFixed(1)} dBFS`} />
              <Metric label="Loudness integrado" value={`${masterResult.integratedLufs.toFixed(1)} LUFS`} note={`ITU-R BS.1770 · ${(analysis!.sampleRate / 1000).toFixed(1)} kHz`} />
            </div>
            <div className="master-compare-actions">
              <button className="master-secondary" onClick={() => { setError(''); setStage('configure'); }}>← Ajustar sonido</button>
              <button className="master-download" onClick={downloadMp3}>Descargar MP3 320 kbps ↓</button>
              <button className="master-download" onClick={downloadWav}>Descargar WAV 24-bit {isUnlimited ? '↓' : '· Unlimited'}</button>
            </div>
            {!isUnlimited && <p className="master-free-export">Plan Gratis: descarga este master en MP3. WAV real de 24 bits es exclusivo Unlimited.</p>}
            <p className="master-free-export">Codificación MP3 con <a href="https://lame.sourceforge.io/" target="_blank" rel="noreferrer">LAME</a> mediante Mediabunny.</p>
            {error && <div className="master-info">{error}</div>}
          </section>
        )}
      </div>
    </main>
  );
}
