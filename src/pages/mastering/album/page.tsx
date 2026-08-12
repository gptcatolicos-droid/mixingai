import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRESETS } from '../../home/components/mixTypes';
import type { MixPreset } from '../../home/components/mixTypes';
import { analyzeAudioFile, formatDuration, formatFileSize } from '../audioAnalysis';
import type { AudioFileAnalysis } from '../audioAnalysis';
import { getMasteringEntitlements, secureMasteringAccessEnabled } from '../masteringAccess';
import { createMaster } from '../masteringEngine';
import type { LoudnessProfile } from '../masteringEngine';
import { buildAlbumArchive } from './albumArchive';
import { CompactWaveformComparison } from '../MasteringWaveforms';
import '../mastering.css';
import './album.css';

type AlbumStage = 'upload' | 'configure' | 'processing' | 'results';
type TrackStatus = 'ready' | 'processing' | 'done' | 'error';

interface AlbumTrack {
  id: string;
  file: File;
  analysis: AudioFileAnalysis;
  status: TrackStatus;
  progress: number;
  label: string;
  wavUrl?: string;
  mp3Url?: string;
  wavBlob?: Blob;
  mp3Blob?: Blob;
  peakDbfs?: number;
  appliedGainDb?: number;
  integratedLufs?: number;
  originalWaveformPeaks?: Float32Array;
  masterWaveformPeaks?: Float32Array;
  error?: string;
}

const acceptedExtensions = /\.(wav|wave|aif|aiff|mp3|flac|m4a)$/i;
const maxFileSize = 600 * 1024 * 1024;

function getUser() {
  try { return JSON.parse(localStorage.getItem('audioMixerUser') || '{}'); }
  catch { return {}; }
}

export default function AlbumMasteringPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const tracksRef = useRef<AlbumTrack[]>([]);
  const [stage, setStage] = useState<AlbumStage>('upload');
  const [tracks, setTracks] = useState<AlbumTrack[]>([]);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<MixPreset>(PRESETS[0]);
  const [strength, setStrength] = useState(50);
  const [stereo, setStereo] = useState(25);
  const [loudness, setLoudness] = useState<LoudnessProfile>('balanced');
  const [currentTrack, setCurrentTrack] = useState(0);
  const [archiveFormat, setArchiveFormat] = useState<'wav' | 'mp3' | null>(null);
  const [archiveProgress, setArchiveProgress] = useState(0);
  const user = getUser();
  const localUnlimited = user.is_pro === true || user.plan === 'unlimited';
  const [secureUnlimited, setSecureUnlimited] = useState<boolean | null>(null);
  const isUnlimited = secureMasteringAccessEnabled ? secureUnlimited === true : localUnlimited;
  const validatingAccess = secureMasteringAccessEnabled && secureUnlimited === null;

  useEffect(() => {
    document.body.classList.add('page-mastering-v3');
    if (!localStorage.getItem('audioMixerUser')) navigate('/auth/register?mode=album', { replace: true });
    return () => document.body.classList.remove('page-mastering-v3');
  }, [navigate]);

  useEffect(() => {
    if (!secureMasteringAccessEnabled || !localStorage.getItem('audioMixerUser')) return;
    let active = true;
    getMasteringEntitlements()
      .then((entitlements) => { if (active) setSecureUnlimited(entitlements.unlimited); })
      .catch((accessError) => {
        if (!active) return;
        setSecureUnlimited(false);
        setError(accessError instanceof Error && accessError.message === 'SECURE_SESSION_REQUIRED'
          ? 'Ingresa nuevamente para validar el acceso a Modo Álbum.'
          : 'No pudimos validar tu plan Unlimited. Inténtalo nuevamente.');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => () => {
    tracksRef.current.forEach((track) => {
      if (track.wavUrl) URL.revokeObjectURL(track.wavUrl);
      if (track.mp3Url) URL.revokeObjectURL(track.mp3Url);
    });
  }, []);

  const albumStats = useMemo(() => {
    if (!tracks.length) return null;
    const average = tracks.reduce((total, track) => total + track.analysis.integratedLufs, 0) / tracks.length;
    const crest = tracks.reduce((total, track) => total + track.analysis.crestFactorDb, 0) / tracks.length;
    const duration = tracks.reduce((total, track) => total + track.analysis.durationSeconds, 0);
    return { average, crest, duration };
  }, [tracks]);

  const addFiles = async (fileList: FileList | File[]) => {
    if (!isUnlimited) {
      setError('El modo álbum pertenece al plan Unlimited.');
      return;
    }
    const candidates = Array.from(fileList).slice(0, 12 - tracks.length);
    if (!candidates.length) return;
    setAnalyzing(true);
    setError('');
    const accepted: AlbumTrack[] = [];
    const rejected: string[] = [];

    for (const file of candidates) {
      if ((!file.type.startsWith('audio/') && !acceptedExtensions.test(file.name)) || file.size > maxFileSize) {
        rejected.push(file.name);
        continue;
      }
      try {
        const analysis = await analyzeAudioFile(file);
        if (analysis.channels !== 2) {
          rejected.push(`${file.name} (no es estéreo)`);
          continue;
        }
        accepted.push({
          id: crypto.randomUUID(),
          file,
          analysis,
          status: 'ready',
          progress: 0,
          label: 'Lista para procesar',
        });
      } catch {
        rejected.push(`${file.name} (no se pudo analizar)`);
      }
    }

    setTracks((current) => [...current, ...accepted].slice(0, 12));
    if (accepted.length) setStage('configure');
    if (rejected.length) setError(`No se agregaron: ${rejected.join(', ')}`);
    setAnalyzing(false);
  };

  const removeTrack = (id: string) => {
    setTracks((current) => current.filter((track) => track.id !== id));
  };

  const processAlbum = async () => {
    if (!isUnlimited || tracks.length < 2) {
      setError(tracks.length < 2 ? 'Agrega al menos 2 canciones para crear un álbum.' : 'El modo álbum pertenece al plan Unlimited.');
      return;
    }
    setError('');
    tracks.forEach((track) => {
      if (track.wavUrl) URL.revokeObjectURL(track.wavUrl);
      if (track.mp3Url) URL.revokeObjectURL(track.mp3Url);
    });
    setTracks((current) => current.map((track) => ({
      ...track,
      status: 'ready',
      progress: 0,
      label: 'En cola',
      wavUrl: undefined,
      mp3Url: undefined,
      wavBlob: undefined,
      mp3Blob: undefined,
      peakDbfs: undefined,
      appliedGainDb: undefined,
      integratedLufs: undefined,
      error: undefined,
    })));
    setStage('processing');

    for (let index = 0; index < tracks.length; index += 1) {
      const track = tracks[index];
      setCurrentTrack(index + 1);
      setTracks((current) => current.map((item) => item.id === track.id
        ? { ...item, status: 'processing', progress: 2, label: 'Preparando canción' }
        : item));
      try {
        const result = await createMaster(
          track.file,
          track.analysis,
          { preset: selectedPreset, strength, stereo, loudness },
          (progress, label) => setTracks((current) => current.map((item) => item.id === track.id
            ? { ...item, progress, label }
            : item)),
        );
        const wavUrl = URL.createObjectURL(result.wav24);
        const mp3Url = URL.createObjectURL(result.mp3);
        setTracks((current) => current.map((item) => item.id === track.id
          ? {
              ...item,
              status: 'done',
              progress: 100,
              label: 'Master listo',
              wavUrl,
              mp3Url,
              wavBlob: result.wav24,
              mp3Blob: result.mp3,
              peakDbfs: result.peakDbfs,
              appliedGainDb: result.appliedGainDb,
              integratedLufs: result.integratedLufs,
              originalWaveformPeaks: result.originalWaveformPeaks,
              masterWaveformPeaks: result.masterWaveformPeaks,
            }
          : item));
      } catch (processingError) {
        setTracks((current) => current.map((item) => item.id === track.id
          ? {
              ...item,
              status: 'error',
              label: 'Error de procesamiento',
              error: processingError instanceof Error ? processingError.message : 'No se pudo procesar.',
            }
          : item));
      }
    }
    setStage('results');
  };

  const download = (track: AlbumTrack, format: 'wav' | 'mp3') => {
    const url = format === 'wav' ? track.wavUrl : track.mp3Url;
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${track.file.name.replace(/\.[^.]+$/, '')}-album-master-mixingmusic.${format}`;
    link.click();
  };

  const downloadAlbum = async (format: 'wav' | 'mp3') => {
    const completed = tracks.filter((track) => track.status === 'done');
    const files = completed.flatMap((track) => {
      const blob = format === 'wav' ? track.wavBlob : track.mp3Blob;
      if (!blob) return [];
      const baseName = track.file.name.replace(/\.[^.]+$/, '');
      return [{ blob, fileName: `${baseName}-album-master-mixingmusic.${format}` }];
    });
    if (!files.length || archiveFormat) return;

    setArchiveFormat(format);
    setArchiveProgress(0);
    setError('');
    try {
      const archive = await buildAlbumArchive(files, setArchiveProgress);
      const url = URL.createObjectURL(archive);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mixingmusic-album-masters-${format === 'wav' ? 'wav24' : 'mp3'}.zip`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : 'No se pudo crear el archivo ZIP.');
    } finally {
      setArchiveFormat(null);
      setArchiveProgress(0);
    }
  };

  return (
    <main className="master-page album-page">
      <header className="master-header">
        <button className="master-logo" onClick={() => navigate('/')}>
          <img src="/logo-brand.png" alt="MixingMusic.AI" /><span>ALBUM V3</span>
        </button>
        <button className="master-exit" onClick={() => navigate('/mastering')}>Master individual</button>
      </header>

      <div className="album-shell">
        <div className="album-heading">
          <span className="master-kicker">MODO ÁLBUM · UNLIMITED</span>
          <h1>Un álbum. Una identidad sonora.</h1>
          <p>Sube entre 2 y 12 mezclas. Aplicaremos el mismo preset, intención, amplitud y objetivo de nivel a todo el proyecto.</p>
        </div>

        {validatingAccess && (
          <section className="album-paywall">
            <strong>Validando tu plan…</strong>
            <p>Estamos comprobando de forma segura el acceso a Modo Álbum.</p>
          </section>
        )}

        {!validatingAccess && !isUnlimited && (
          <section className="album-paywall">
            <strong>Modo álbum es una función premium</strong>
            <p>Actualiza a Unlimited para procesar hasta 12 canciones en bloque y descargar WAV de 24 bits.</p>
            <button onClick={() => navigate('/pricing')}>Ver Unlimited</button>
          </section>
        )}

        {isUnlimited && stage === 'upload' && (
          <section className="album-empty">
            <div>12</div><h2>Sube las mezclas de tu álbum</h2>
            <p>WAV o AIFF recomendado · Archivos estéreo · Máximo 600 MB por canción</p>
            <button onClick={() => inputRef.current?.click()}>{analyzing ? 'Analizando…' : 'Seleccionar canciones'}</button>
          </section>
        )}

        {isUnlimited && stage !== 'upload' && (
          <>
            <section className="album-toolbar">
              <div><strong>{tracks.length}/12 canciones</strong><span>{albumStats ? `${formatDuration(albumStats.duration)} · promedio ${albumStats.average.toFixed(1)} LUFS · dinámica ${albumStats.crest.toFixed(1)} dB` : ''}</span></div>
              {(stage === 'configure' || stage === 'results') && <button onClick={() => inputRef.current?.click()} disabled={tracks.length >= 12 || analyzing}>{analyzing ? 'Analizando…' : '+ Agregar canciones'}</button>}
            </section>

            <div className="album-layout">
              <section className="album-track-list">
                {tracks.map((track, index) => (
                  <article className={`album-track ${track.status}`} key={track.id}>
                    <i>{String(index + 1).padStart(2, '0')}</i>
                    <div className="album-track-copy">
                      <strong>{track.file.name}</strong>
                      <span>{formatDuration(track.analysis.durationSeconds)} · {formatFileSize(track.analysis.sizeBytes)} · {(track.integratedLufs ?? track.analysis.integratedLufs).toFixed(1)} LUFS</span>
                      {(stage === 'processing' || stage === 'results') && <div className="album-track-progress"><b style={{ width: `${track.progress}%` }} /></div>}
                      {track.error && <small>{track.error}</small>}
                    </div>
                    <em>{track.label}</em>
                    {stage === 'configure' && <button onClick={() => removeTrack(track.id)}>×</button>}
{stage === 'results' && track.status === 'done' && <><div className="album-downloads"><button onClick={() => download(track, 'mp3')}>MP3</button><button onClick={() => download(track, 'wav')}>WAV 24</button></div>{track.originalWaveformPeaks && track.masterWaveformPeaks && <CompactWaveformComparison originalPeaks={track.originalWaveformPeaks} masterPeaks={track.masterWaveformPeaks} />}</>}
                  </article>
                ))}
              </section>

              <aside className="album-controls">
                <span className="master-kicker">SONIDO COMPARTIDO</span>
                <h2>Configuración del álbum</h2>
                <label>Preset<select value={selectedPreset.id} onChange={(event) => setSelectedPreset(PRESETS.find((preset) => preset.id === event.target.value) || PRESETS[0])}>{PRESETS.map((preset) => <option value={preset.id} key={preset.id}>{preset.name}</option>)}</select></label>
                <label>Intensidad <b>{strength}%</b><input type="range" min="0" max="100" value={strength} onChange={(event) => setStrength(Number(event.target.value))} /></label>
                <label>Amplitud <b>{stereo}%</b><input type="range" min="0" max="60" value={stereo} onChange={(event) => setStereo(Number(event.target.value))} /></label>
                <label>Loudness<select value={loudness} onChange={(event) => setLoudness(event.target.value as LoudnessProfile)}><option value="streaming">Streaming</option><option value="balanced">Balanceado</option><option value="competitive">Competitivo</option></select></label>
                {stage === 'configure' && <button className="album-process" onClick={processAlbum} disabled={tracks.length < 2}>Masterizar {tracks.length} canciones</button>}
                {stage === 'processing' && <div className="album-processing-label"><strong>Canción {currentTrack} de {tracks.length}</strong><span>Procesamos una a la vez para proteger la memoria.</span></div>}
                {stage === 'results' && (
                  <>
                    <div className="album-archive-actions">
                      <strong>Descargar álbum completo</strong>
                      <button onClick={() => downloadAlbum('mp3')} disabled={archiveFormat !== null}>{archiveFormat === 'mp3' ? `Creando ZIP ${archiveProgress}%` : 'ZIP · MP3 320'}</button>
                      <button onClick={() => downloadAlbum('wav')} disabled={archiveFormat !== null}>{archiveFormat === 'wav' ? `Creando ZIP ${archiveProgress}%` : 'ZIP · WAV 24 bits'}</button>
                      <span>Los archivos conservan el orden del álbum.</span>
                    </div>
                    <button className="album-process album-reprocess" onClick={() => setStage('configure')} disabled={archiveFormat !== null}>Ajustar y reprocesar</button>
                  </>
                )}
              </aside>
            </div>
          </>
        )}

        <input ref={inputRef} type="file" accept="audio/*,.wav,.wave,.aif,.aiff,.mp3,.flac,.m4a" multiple hidden onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ''; }} />
        {error && <div className="master-info album-error">{error}</div>}
      </div>
    </main>
  );
}
