import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeAudioFile, formatDuration, formatFileSize } from '../mastering/audioAnalysis';
import type { AudioFileAnalysis } from '../mastering/audioAnalysis';
import { downloadBlob, saveBlobToDisk } from '../../utils/downloadFile';
import { CompactWaveformComparison } from '../mastering/MasteringWaveforms';
import {
  DEFAULT_IMPROVE_MIX_SETTINGS,
  improveMix,
  clampImproveMixSettings,
} from './improveMixEngine';
import type { ImproveMixSettings, ImproveMixResult } from './improveMixEngine';
import StudioTabs from '../../components/feature/StudioTabs';
import AudioChatPanel from '../../components/feature/AudioChatPanel';
import '../mastering/mastering.css';
import './improve-mix.css';

type Stage = 'upload' | 'analyzing' | 'configure' | 'processing' | 'result';
type Mode = 'simple' | 'avanzado';

const acceptedExtensions = /\.(wav|wave|aif|aiff|mp3|flac|m4a)$/i;
const maxFileSize = 600 * 1024 * 1024;

function formatNumber(value: unknown, digits = 1) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

export default function ImproveMixPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('upload');
  const [mode, setMode] = useState<Mode>('simple');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [analysis, setAnalysis] = useState<AudioFileAnalysis | null>(null);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<ImproveMixSettings>(DEFAULT_IMPROVE_MIX_SETTINGS);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingLabel, setProcessingLabel] = useState('Preparando motor');
  const [result, setResult] = useState<ImproveMixResult | null>(null);
  const [resultWavUrl, setResultWavUrl] = useState('');
  const [resultMp3Url, setResultMp3Url] = useState('');

  useEffect(() => {
    document.body.classList.add('page-mastering-v3');
    if (!localStorage.getItem('audioMixerUser')) {
      navigate('/auth/register?mode=mejorar', { replace: true });
    }
    return () => document.body.classList.remove('page-mastering-v3');
  }, [navigate]);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);
  useEffect(() => () => {
    if (resultWavUrl) URL.revokeObjectURL(resultWavUrl);
    if (resultMp3Url) URL.revokeObjectURL(resultMp3Url);
  }, [resultWavUrl, resultMp3Url]);

  const processFile = async (selected: File | null | undefined) => {
    if (!selected) return;
    setError('');
    if (!acceptedExtensions.test(selected.name)) {
      setError('Formato no soportado. Sube WAV, AIFF, MP3, FLAC o M4A.');
      return;
    }
    if (selected.size > maxFileSize) {
      setError('El archivo supera los 600 MB permitidos.');
      return;
    }
    setStage('analyzing');
    try {
      const fileAnalysis = await analyzeAudioFile(selected);
      setFile(selected);
      setAudioUrl(URL.createObjectURL(selected));
      setAnalysis(fileAnalysis);
      setSettings(DEFAULT_IMPROVE_MIX_SETTINGS);
      setStage('configure');
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'No pudimos leer este audio.');
      setStage('upload');
    }
  };

  const updateSetting = (key: keyof ImproveMixSettings, value: number) => {
    setSettings((prev) => clampImproveMixSettings({ ...prev, [key]: value }));
  };

  const runImprove = async () => {
    if (!file) return;
    setStage('processing');
    setProcessingProgress(0);
    setError('');
    try {
      const outcome = await improveMix(file, settings, (progress, label) => {
        setProcessingProgress(Math.round(progress));
        setProcessingLabel(label);
      });
      setResult(outcome);
      setResultWavUrl(URL.createObjectURL(outcome.wav24));
      setResultMp3Url(URL.createObjectURL(outcome.mp3));
      setStage('result');
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : 'No pudimos procesar la mezcla.');
      setStage('configure');
    }
  };

  const reset = () => {
    setStage('upload');
    setFile(null);
    setAnalysis(null);
    setResult(null);
    setSettings(DEFAULT_IMPROVE_MIX_SETTINGS);
    setError('');
  };

  const downloadWav = () => {
    if (!result || !file) return;
    const name = `${file.name.replace(/\.[^.]+$/, '')}-mejorada-mixingmusic.wav`;
    saveBlobToDisk(result.wav24, name, 'audio/wav', '.wav').catch(() => downloadBlob(result.wav24, name));
  };
  const downloadMp3 = () => {
    if (!result || !file) return;
    downloadBlob(result.mp3, `${file.name.replace(/\.[^.]+$/, '')}-mejorada-mixingmusic.mp3`);
  };

  const controls: Array<{
    key: keyof ImproveMixSettings;
    label: string;
    min: number;
    max: number;
    step: number;
    unit: string;
    simpleHint: string;
    detail: (value: number) => string;
  }> = [
    {
      key: 'warmth',
      label: 'Calidez',
      min: -6, max: 6, step: 1, unit: '',
      simpleHint: 'Más cuerpo en graves, agudos más suaves.',
      detail: (v) => `Low-shelf 150Hz: ${(v / 6 * 2.5).toFixed(1)}dB · High-shelf 10kHz: ${(v / 6 * -1.5).toFixed(1)}dB`,
    },
    {
      key: 'clarity',
      label: 'Claridad',
      min: -6, max: 6, step: 1, unit: '',
      simpleHint: 'Más presencia y aire, sin agresividad.',
      detail: (v) => `Presencia 3.5kHz: ${(v >= 0 ? v / 6 * 3 : v / 6 * 2).toFixed(1)}dB · Aire 9kHz: ${(Math.max(0, v) / 6 * 2.5).toFixed(1)}dB`,
    },
    {
      key: 'dynamics',
      label: 'Dinámica',
      min: 0, max: 10, step: 1, unit: '',
      simpleHint: 'Glue suave — conserva el rango natural.',
      detail: (v) => v === 0 ? 'Sin compresión de bus' : `Threshold ${(-20 + v / 10 * 10).toFixed(0)}dB · Ratio ${(1.5 + v / 10 * 1.5).toFixed(1)}:1`,
    },
    {
      key: 'width',
      label: 'Balance estéreo',
      min: -30, max: 30, step: 5, unit: '%',
      simpleHint: 'Centro estable — ensancha o estrecha con cuidado.',
      detail: (v) => `Ancho mid-side: ${(100 + v).toFixed(0)}%`,
    },
  ];

  return (
    <main className="master-page">
      <header className="master-header">
        <button className="master-logo" onClick={() => navigate('/')}>
          <img src="/logo-brand.png" alt="MixingMusic.AI" />
          <span>MEJORAR MEZCLA</span>
        </button>
        <button className="master-exit" onClick={() => navigate('/')}>Guardar y salir</button>
      </header>

      <div style={{ width: 'min(1180px,calc(100% - 36px))', margin: '0 auto', paddingTop: '6px' }}>
        <StudioTabs active="mejorar" />
      </div>

      <div className="studio-shell-grid" style={{ width: 'min(1180px,calc(100% - 36px))', margin: '0 auto' }}>
        <div className="master-shell" style={{ width: 'auto', margin: 0 }}>

          {(stage === 'upload' || stage === 'analyzing') && (
            <section className="master-upload-section">
              <div className="master-intro">
                <span className="master-kicker">MEJORAR MEZCLA</span>
                <h1>Sube tu mezcla estéreo.</h1>
                <p>Ajustamos tono, dinámica y estéreo con cuidado — tu mezcla conserva rango para un mastering posterior si lo necesitas.</p>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="audio/*,.wav,.wave,.aif,.aiff,.mp3,.flac,.m4a"
                hidden
                onChange={(event) => { processFile(event.target.files?.[0]); event.target.value = ''; }}
              />
              <button
                className={`master-dropzone ${dragging ? 'dragging' : ''} ${stage === 'analyzing' ? 'analyzing' : ''}`}
                onClick={() => stage !== 'analyzing' && inputRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => { event.preventDefault(); setDragging(false); processFile(event.dataTransfer.files[0]); }}
              >
                {stage === 'analyzing' ? (
                  <>
                    <div className="master-spinner" />
                    <span className="master-kicker">IA DE ANÁLISIS</span>
                    <h2>Analizando mezcla</h2>
                    <p>Leemos loudness, dinámica, fase y margen de entrega.</p>
                    <div className="master-analysis-line"><span /></div>
                  </>
                ) : (
                  <>
                    <div className="master-upload-icon">↑</div>
                    <h2>Arrastra tu mezcla aquí</h2>
                    <p>o haz clic para seleccionar el archivo</p>
                    <strong>WAV o AIFF recomendado · Estéreo · Hasta 600 MB</strong>
                  </>
                )}
              </button>

              {error && <div className="master-error"><strong>No pudimos continuar.</strong><span>{error}</span></div>}

              <div className="master-preflight">
                <div><i>✓</i><span><strong>Recomendado</strong>WAV/AIFF de 24 bits</span></div>
                <div><i>✓</i><span><strong>Conserva dinámica</strong>Glue suave, nunca un limitador</span></div>
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
                  <span>{formatFileSize(analysis.sizeBytes)} · {formatDuration(analysis.durationSeconds)} · {formatNumber(analysis.integratedLufs)} LUFS</span>
                </div>
                <audio controls src={audioUrl} />
                <button onClick={reset}>Cambiar archivo</button>
              </div>

              <div className="imx-safety-note">
                <strong>Red de seguridad activa:</strong> el pico de salida nunca pasa de −1.2 dBFS y el nivel solo se corrige hacia −14 LUFS si tu mezcla está más floja — nunca la empujamos más fuerte que eso, para dejar margen a un mastering posterior.
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span className="master-kicker">AJUSTES</span>
                  <div className="imx-mode-toggle">
                    <button className={mode === 'simple' ? 'active' : ''} onClick={() => setMode('simple')} type="button">Simple</button>
                    <button className={mode === 'avanzado' ? 'active' : ''} onClick={() => setMode('avanzado')} type="button">Avanzado</button>
                  </div>
                </div>

                <div className="imx-controls">
                  {controls.map((control) => (
                    <div className="imx-control" key={control.key}>
                      <div className="imx-control-head">
                        <strong>{control.label}</strong>
                        <span>{settings[control.key] > 0 ? '+' : ''}{settings[control.key]}{control.unit}</span>
                      </div>
                      <p>{control.simpleHint}</p>
                      <input
                        type="range"
                        min={control.min}
                        max={control.max}
                        step={control.step}
                        value={settings[control.key]}
                        onChange={(event) => updateSetting(control.key, Number(event.target.value))}
                      />
                      {mode === 'avanzado' && (
                        <div className="imx-control-detail">{control.detail(settings[control.key])}</div>
                      )}
                    </div>
                  ))}
                </div>

                <button className="master-continue" onClick={runImprove}>MEJORAR MEZCLA <span>→</span></button>
              </div>
            </section>
          )}

          {stage === 'processing' && (
            <section className="master-processing">
              <div className="master-processing-orbit"><i /><b>{processingProgress}%</b></div>
              <h1>{processingLabel}</h1>
              <p>Aplicamos tus ajustes de tono, dinámica y estéreo sin saturar la señal.</p>
              <div className="master-processing-bar"><span style={{ width: `${Math.max(12, processingProgress)}%` }} /></div>
            </section>
          )}

          {stage === 'result' && result && file && (
            <section className="master-compare">
              <div className="master-compare-heading">
                <span className="master-kicker">MEZCLA MEJORADA</span>
                <h1>Escucha el antes y el después.</h1>
                <p>{formatNumber(result.integratedLufs)} LUFS integrado · {formatNumber(result.peakDbfs)} dBFS de pico{result.appliedGainDb !== 0 ? ` · ${result.appliedGainDb > 0 ? 'subimos' : 'bajamos'} ${Math.abs(result.appliedGainDb).toFixed(1)}dB de nivel` : ''}</p>
              </div>

              <CompactWaveformComparison
                originalPeaks={result.originalWaveformPeaks}
                masterPeaks={result.improvedWaveformPeaks}
                originalSource={audioUrl}
                masterSource={resultWavUrl}
              />

              <div className="master-compare-actions">
                <button className="master-secondary" onClick={() => setStage('configure')}>← Ajustar de nuevo</button>
                <button className="master-download" onClick={downloadMp3}>Descargar MP3 320 kbps ↓</button>
                <button className="master-download" onClick={downloadWav}>Descargar WAV 24-bit ↓</button>
              </div>
              <p className="master-free-export">Esta mezcla mejorada también puede pasar directo por Mastering para el nivel final de publicación.</p>
              {error && <div className="master-info">{error}</div>}
            </section>
          )}
        </div>{/* .master-shell */}
        <AudioChatPanel />
      </div>{/* .studio-shell-grid */}
    </main>
  );
}
