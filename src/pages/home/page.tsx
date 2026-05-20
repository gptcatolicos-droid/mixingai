import { useState } from 'react';
import HomeHero from './components/HomeHero';
import ProjectDashboard from './components/ProjectDashboard';
import AIChat from './components/AIChat';
import { MixPreset } from './components/PresetScreen';
import MixEditor from './components/MixEditor';
import ExportScreen from './components/ExportScreen';

interface ExportData {
  audioBuffer: AudioBuffer;
  audioUrl: string;
  waveformPeaks: Float32Array;
  finalLufs: number;
  mp3Url?: string;
  wavUrl?: string;
  presetName?: string;
  iaEqPreset?: string;
}

type Screen = 'home' | 'chat' | 'mixer' | 'export';

let pendingExportData: ExportData | null = null;

export default function HomePage() {
  const [user] = useState(() => {
    try {
      const s = localStorage.getItem('audioMixerUser');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedPreset, setSelectedPreset] = useState<MixPreset | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [projectId] = useState(() => Date.now().toString());

  const handleStartMixer = (preset: MixPreset, files: File[]) => {
    setSelectedPreset(preset);
    setUploadedFiles(files);
    setScreen('mixer');
  };

  const handleExport = (data: ExportData) => {
    pendingExportData = data;
    setExportData(data);
    setScreen('export');
  };

  // Logged-in users → ProjectDashboard (has its own full flow)
  if (user) return <ProjectDashboard />;

  // AIChat: upload stems + pick preset → starts mixer
  if (screen === 'chat') {
    return (
      <AIChat
        user={null}
        onStartMixer={handleStartMixer}
        onCreditsUpdate={() => {}}
      />
    );
  }

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
    const data = exportData || pendingExportData;
    return (
      <ExportScreen
        user={{ id:'guest', firstName:'Usuario', lastName:'', email:'', country:'', credits:999999, createdAt:'' }}
        projectId={projectId}
        exportData={data}
        exportProgress={data ? 100 : 0}
        exportStep={data ? '¡Listo!' : 'Preparando...'}
        onBack={() => setScreen('mixer')}
        onNewMix={() => { setScreen('chat'); }}
        onGoHome={() => { setScreen('home'); }}
        onCreditsUpdate={() => {}}
      />
    );
  }

  // Default: HomeHero (all CTAs → /auth/register)
  return <HomeHero onStartMixer={handleStartMixer} />;
}
