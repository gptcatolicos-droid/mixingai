import { useState } from 'react';
import { Link } from 'react-router-dom';
import AIChat from './components/AIChat';
import ProjectDashboard from './components/ProjectDashboard';
import { MixPreset } from './components/PresetScreen';
import MixEditor from './components/MixEditor';
import ExportScreen from './components/ExportScreen';
import { blogArticles } from '../../mocks/blogArticles';

const getLatestArticles = () =>
  blogArticles.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()).slice(0, 6);

const detectLang = (): 'en' | 'es' => navigator.language?.startsWith('es') ? 'es' : 'en';

interface ExportData {
  audioBuffer: AudioBuffer; audioUrl: string; waveformPeaks: Float32Array;
  finalLufs: number; mp3Url?: string; wavUrl?: string;
}

type Screen = 'chat' | 'mixer' | 'export';

export default function HomePage() {
  const [user] = useState(() => {
    try { const s = localStorage.getItem('audioMixerUser'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [screen, setScreen] = useState<Screen>('chat');
  const [selectedPreset, setSelectedPreset] = useState<MixPreset | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [projectId] = useState(() => Date.now().toString());
  const [lang] = useState(detectLang);

  // Si usuario está logueado, mostrar el dashboard completo
  if (user) return <ProjectDashboard />;

  const handleStartMixer = (preset: MixPreset, files: File[]) => {
    setSelectedPreset(preset);
    setUploadedFiles(files);
    setScreen('mixer');
  };

  const handleExport = (data: ExportData) => {
    setExportData(data);
    setScreen('export');
  };

  // PANTALLA: Mezclador (sin login)
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

  // PANTALLA: Exportar (sin login)
  if (screen === 'export') {
    return (
      <ExportScreen
        user={{ id:'guest', firstName:'Usuario', lastName:'', email:'', country:'', credits:999999, createdAt:'' }}
        projectId={projectId}
        exportData={exportData}
        exportProgress={0}
        exportStep=""
        onBack={() => setScreen('mixer')}
        onCreditsUpdate={() => {}}
      />
    );
  }

  // PANTALLA PRINCIPAL: Chat IA directo, sin login
  return (
    <div style={{minHeight:'100vh',background:'transparent',fontFamily:"'DM Sans',system-ui,sans-serif",color:'#F8F0FF',display:'flex',flexDirection:'column'}}>
      <AIChat user={null} onStartMixer={handleStartMixer} onCreditsUpdate={() => {}} />
    </div>
  );
}
