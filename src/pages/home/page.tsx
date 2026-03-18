import { useState, useRef } from 'react';
import AIChat from './components/AIChat';
import ProjectDashboard from './components/ProjectDashboard';
import { MixPreset } from './components/PresetScreen';
import MixEditor from './components/MixEditor';
import ExportScreen from './components/ExportScreen';

interface ExportData {
  audioBuffer: AudioBuffer; audioUrl: string; waveformPeaks: Float32Array;
  finalLufs: number; mp3Url?: string; wavUrl?: string; presetName?: string;
}

type Screen = 'chat' | 'mixer' | 'export';

export default function HomePage() {
  // TODOS los hooks primero, sin condiciones
  const [user] = useState(() => {
    try { const s = localStorage.getItem('audioMixerUser'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [screen, setScreen] = useState<Screen>('chat');
  const [selectedPreset, setSelectedPreset] = useState<MixPreset | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const exportDataRef = useRef<ExportData | null>(null);
  const [exportDataState, setExportDataState] = useState<ExportData | null>(null);
  const [projectId] = useState(() => Date.now().toString());

  const handleStartMixer = (preset: MixPreset, files: File[]) => {
    setSelectedPreset(preset);
    setUploadedFiles(files);
    setScreen('mixer');
  };

  const handleExport = (data: ExportData) => {
    // Guardar en ref primero — disponible inmediatamente sin esperar re-render
    exportDataRef.current = data;
    setExportDataState(data);
    setScreen('export');
  };

  // Si usuario logueado → dashboard completo
  if (user) return <ProjectDashboard />;

  // PANTALLA: Mezclador
  if (screen === 'mixer' && selectedPreset) {
    return (
      <MixEditor
        projectId={projectId}
        user={{ id:'guest', firstName:'Usuario', lastName:'', email:'', country:'', credits:999999, createdAt:'' }}
        uploadedFiles={uploadedFiles}
        onBack={() => setScreen('chat')}
        onCreditsUpdate={() => {}}
        onExport={handleExport}
        initialPreset={selectedPreset}
        reverbOn={selectedPreset.reverbWet > 0}
        delayOn={selectedPreset.delayWet > 0}
        stereoOn={selectedPreset.stereoWidth > 0.5}
      />
    );
  }

  // PANTALLA: Export — usar ref para garantizar que el dato está disponible
  if (screen === 'export') {
    const data = exportDataRef.current || exportDataState;
    return (
      <ExportScreen
        user={{ id:'guest', firstName:'Usuario', lastName:'', email:'', country:'', credits:999999, createdAt:'' }}
        projectId={projectId}
        exportData={data}
        exportProgress={data ? 100 : 0}
        exportStep={data ? '¡Listo!' : 'Preparando...'}
        onBack={() => setScreen('mixer')}
        onCreditsUpdate={() => {}}
      />
    );
  }

  // PANTALLA: Chat principal
  return (
    <AIChat user={null} onStartMixer={handleStartMixer} onCreditsUpdate={() => {}} />
  );
}
