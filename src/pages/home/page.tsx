import { useState } from 'react';
import HomeHero from './components/HomeHero';
import ProjectDashboard from './components/ProjectDashboard';
import MixEditor from './components/MixEditor';
import ExportScreen from './components/ExportScreen';
import { MixPreset, PRESETS } from './components/PresetScreen';

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

type Screen = 'home' | 'mixer' | 'export';

let pendingExportData: ExportData | null = null;

const GUEST_USER = { id:'guest', firstName:'Usuario', lastName:'', email:'', country:'', credits:999999, createdAt:'' };

export default function HomePage() {
  const [user] = useState(() => {
    try {
      const s = localStorage.getItem('audioMixerUser');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedPreset, setSelectedPreset] = useState<MixPreset>(PRESETS[0]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [projectId] = useState(() => Date.now().toString());

  // Logged-in users → ProjectDashboard (has its own full flow)
  if (user) return <ProjectDashboard />;

  const handleStartMixer = (preset: MixPreset, files: File[], mode?: 'mixer' | 'daw') => {
    setSelectedPreset(preset);
    setUploadedFiles(files);
    setScreen('mixer'); // Always go to mixer, never DAW
  };

  const handleExport = (data: ExportData) => {
    pendingExportData = data;
    setExportData(data);
    setScreen('export');
  };


  if (screen === 'mixer') {
    return (
      <MixEditor
        projectId={projectId}
        user={GUEST_USER}
        uploadedFiles={uploadedFiles}
        onBack={() => setScreen('home')}
        onCreditsUpdate={() => {}}
        onExport={handleExport}
        initialPreset={selectedPreset}
        reverbOn={selectedPreset.reverbWet > 0}
        delayOn={selectedPreset.delayWet > 0}
        stereoOn={selectedPreset.stereoWidth > 0.5}
        onSwitchToDAW={() => setScreen('daw')}
      />
    );
  }

  if (screen === 'export') {
    const data = exportData || pendingExportData;
    return (
      <ExportScreen
        user={GUEST_USER}
        projectId={projectId}
        exportData={data}
        exportProgress={data ? 100 : 0}
        exportStep={data ? '¡Listo!' : 'Preparando...'}
        onBack={() => setScreen('mixer')}
        onNewMix={() => setScreen('home')}
        onGoHome={() => setScreen('home')}
        onCreditsUpdate={() => {}}
      />
    );
  }

  return <HomeHero onStartMixer={handleStartMixer} />;
}
