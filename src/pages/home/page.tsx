import { useState } from 'react';
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

// Variable de módulo — fuera del componente, no se pierde entre renders
let pendingExportData: ExportData | null = null;

export default function HomePage() {
  const [user] = useState(() => {
    try { const s = localStorage.getItem('audioMixerUser'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [screen, setScreen] = useState<Screen>('chat');
  const [selectedPreset, setSelectedPreset] = useState<MixPreset | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [projectId] = useState(() => Date.now().toString());

  const handleStartMixer = (preset: MixPreset, files: File[]) => {
    setSelectedPreset(preset); setUploadedFiles(files); setScreen('mixer');
  };

  const handleExport = (data: ExportData) => {
    pendingExportData = data; // sync — disponible inmediatamente
    setExportData(data);
    setScreen('export');
  };

  if (user) return <ProjectDashboard />;

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

  if (screen === 'export') {
    // Usar pendingExportData (sync) como fallback garantizado
    const data = exportData || pendingExportData;
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

  return <AIChat user={null} onStartMixer={handleStartMixer} onCreditsUpdate={() => {}} />;
}
