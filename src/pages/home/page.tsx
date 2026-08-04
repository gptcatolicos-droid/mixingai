import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeHeroV3 from './components/HomeHeroV3';
import ProjectDashboard from './components/ProjectDashboard';
import AIChat from './components/AIChat';
import type { MixPreset } from './components/mixTypes';
import MixEditor from './components/MixEditor';
import { encodeWav24 } from '../mastering/wav24';

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

type Screen = 'home' | 'chat' | 'mixer';

export default function HomePage() {
  const navigate = useNavigate();
  const [user] = useState(() => {
    try {
      const s = localStorage.getItem('audioMixerUser');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedPreset, setSelectedPreset] = useState<MixPreset | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [projectId] = useState(() => Date.now().toString());

  const handleStartMixer = (preset: MixPreset, files: File[]) => {
    setSelectedPreset(preset);
    setUploadedFiles(files);
    setScreen('mixer');
  };

  const handleExport = (data: ExportData) => {
    const wavBlob = encodeWav24(data.audioBuffer);
    const masterFile = new File([wavBlob], 'mezcla-v3-mixingmusic.wav', { type: 'audio/wav' });
    navigate('/mastering', { state: { file: masterFile, fromMix: true } });
  };

  // Logged-in users → ProjectDashboard (has its own full flow)
  if (user) return <ProjectDashboard />;

  // AIChat: upload stems + pick preset → starts mixer
  if (screen === 'chat') {
    return (
      <AIChat
        user={null}
        onStartMixer={handleStartMixer}
        onStartMastering={(file) => navigate('/mastering', { state: { file } })}
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

  // V3 public home. The previous home remains available in the codebase so the
  // launch can be rolled back without touching the existing mixer flow.
  return <HomeHeroV3 />;
}
