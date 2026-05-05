/**
 * ProjectDashboard.tsx — Router principal
 * 
 * UX FLOW:
 * home     → FlowHome (5 cards)
 * studio   → MixEditor real con look DAW (cada stem en su track)
 * create   → FlowCreate (Claude Design) → genera → abre studio con track
 * separate → StemSeparator → separa → abre studio con 4 stems en tracks
 * stems    → NewProjectScreen → preset → studio con stems en tracks
 * mixsong  → MixEditor (auto-mastering de una canción)
 * 
 * El MixEditor recibe uploadedFiles → cada File es un track separado en el DAW
 */
import { useState, useEffect, useRef } from 'react';
let pendingExportData: any = null;
import MixEditor from './MixEditor';
import ExportScreen from './ExportScreen';
import NewProjectScreen from './NewProjectScreen';
import PresetScreen, { MixPreset, PRESETS } from './PresetScreen';
import StemSeparator from './StemSeparator';
import FlowHome from './FlowHome';
import FlowCreate from './FlowCreate';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface User {
  id: string; firstName: string; lastName: string; email: string;
  country: string; credits: number; provider?: string; createdAt: string;
  username?: string; avatar?: string; is_pro?: boolean; plan?: string;
  genre?: string; level?: string; accessToken?: string;
}
interface ExportData {
  audioBuffer: AudioBuffer; audioUrl: string; waveformPeaks: Float32Array;
  finalLufs: number; mp3Url?: string; wavUrl?: string;
}

type Screen = 'home'|'studio'|'create'|'separate'|'stems'|'mixsong'|'preset'|'export'|'login'|'register';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const newId = () => `proj_${Date.now()}`;

const FlowBg = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width:'100%', minHeight:'100vh', background:'radial-gradient(ellipse at 80% -10%,rgba(192,38,211,0.18),transparent 50%),radial-gradient(ellipse at 0% 110%,rgba(162,89,255,0.14),transparent 50%),#0F0A1A', fontFamily:'-apple-system,BlinkMacSystemFont,"DM Sans",system-ui,sans-serif', color:'#F8F0FF' }}>
    {children}
  </div>
);

// ─── Landing pública (sin registro) ──────────────────────────────────────────
function FlowLanding({ onNavigate }: { onNavigate: (id:string)=>void }) {
  const T = { pink:'#ec4899', fuchsia:'#C026D3', violet:'#a259ff', text2:'#b8a8d0', text3:'#7a6a90', border:'rgba(192,38,211,0.18)', surface:'rgba(26,16,40,0.62)' };
  return (
    <FlowBg>
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 22px', textAlign:'center' }}>
        <div style={{ width:64, height:64, borderRadius:18, background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 40px ${T.fuchsia}66`, marginBottom:28 }}>
          <svg width="30" height="30" viewBox="0 0 24 24"><path d="M12 3 L13.6 9.4 L20 11 L13.6 12.6 L12 19 L10.4 12.6 L4 11 L10.4 9.4 Z" fill="#fff"/></svg>
        </div>
        <h1 style={{ fontSize:'clamp(36px,7vw,56px)', fontWeight:600, margin:0, background:`linear-gradient(90deg,#F8F0FF,${T.pink},${T.violet})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:-1.2, lineHeight:1.05 }}>
          Crea música con IA<br />en tu navegador
        </h1>
        <p style={{ fontSize:17, color:T.text2, maxWidth:540, margin:'20px 0 36px', lineHeight:1.5 }}>
          Genera canciones, separa stems, mezcla y masteriza. Todo en un solo lugar, con IA que te asiste en cada paso.
        </p>
        <div style={{ display:'flex', gap:12 }}>
          <Link to="/auth/register" style={{ height:48, padding:'0 28px', borderRadius:999, border:'none', background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`, color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8, boxShadow:`0 0 32px ${T.fuchsia}66`, textDecoration:'none' }}>
            Comienza gratis <span style={{ fontSize:18 }}>→</span>
          </Link>
          <Link to="/auth/login" style={{ height:48, padding:'0 22px', borderRadius:999, background:'transparent', border:`0.5px solid ${T.border}`, color:T.text2, fontSize:14, fontWeight:500, cursor:'pointer', display:'inline-flex', alignItems:'center', textDecoration:'none' }}>
            Ya tengo cuenta
          </Link>
        </div>
        <div style={{ display:'flex', gap:22, marginTop:32, fontSize:12, color:T.text3 }}>
          <span>✓ 10 créditos gratis</span>
          <span>✓ Sin tarjeta de crédito</span>
          <span>✓ 100% en tu navegador</span>
        </div>
        <div style={{ marginTop:56, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, maxWidth:760, width:'100%' }}>
          {[
            { t:'ACE-Step 1.5', s:'Genera canciones completas' },
            { t:'Demucs', s:'Separa stems en navegador' },
            { t:'IA EQ', s:'Optimiza por dispositivo' },
            { t:'Web Audio', s:'DAW completo, sin instalar' },
          ].map(f => (
            <div key={f.t} style={{ padding:'14px 12px', borderRadius:12, background:T.surface, border:`0.5px solid ${T.border}`, backdropFilter:'blur(8px)' }}>
              <div style={{ fontSize:12, fontWeight:600, color:T.pink, marginBottom:3 }}>{f.t}</div>
              <div style={{ fontSize:11, color:T.text3 }}>{f.s}</div>
            </div>
          ))}
        </div>
      </div>
    </FlowBg>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ProjectDashboard() {
  const [user, setUser] = useState<User|null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [projectId, setProjectId] = useState<string>(newId());
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<MixPreset>(PRESETS[0]);
  const [reverbOn, setReverbOn] = useState(false);
  const [delayOn, setDelayOn] = useState(false);
  const [stereoOn, setStereoOn] = useState(false);
  const [exportData, setExportData] = useState<ExportData|null>(null);
  const [pendingTrackUrl, setPendingTrackUrl] = useState<string|null>(null);
  const exportRef = useRef<ExportData|null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const stored = localStorage.getItem('audioMixerUser');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { localStorage.removeItem('audioMixerUser'); }
    }
    // Routing por query params
    const mode = searchParams.get('mode');
    const validModes: Screen[] = ['studio','create','separate','stems','mixsong'];
    if (mode && validModes.includes(mode as Screen)) setCurrentScreen(mode as Screen);
  }, []);

  const updateUser = (u: User) => { setUser(u); localStorage.setItem('audioMixerUser', JSON.stringify(u)); };
  const handleCredits = (n: number) => { if (!user) return; updateUser({...user, credits:n}); };
  const handleLogout = () => { setUser(null); localStorage.removeItem('audioMixerUser'); setCurrentScreen('home'); };

  // Navegar entre pantallas
  const handleNavigate = (id: string) => {
    if (id === 'login')    { navigate('/auth/login');    return; }
    if (id === 'register') { navigate('/auth/register'); return; }
    if (id === 'blog')     { navigate('/blog');          return; }
    if (id === 'billing')  { navigate('/billing');       return; }
    if (id === 'profile')  { /* futuro */ return; }
    setCurrentScreen(id as Screen);
  };

  // Abrir el estudio (MixEditor) con archivos — cada archivo = un track
  const openStudio = (files: File[] = [], preset: MixPreset = PRESETS[0], rv=false, dl=false, st=false) => {
    setProjectId(newId());
    setUploadedFiles(files);
    setSelectedPreset(preset);
    setReverbOn(rv); setDelayOn(dl); setStereoOn(st);
    setCurrentScreen('studio');
  };

  // Canción generada con IA → convertir a File → abrir studio
  const handleTrackReady = (url: string, title: string) => {
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const file = new File([blob], `${title}.wav`, { type:'audio/wav' });
        openStudio([file], PRESETS[0]);
      })
      .catch(() => { setPendingTrackUrl(url); setCurrentScreen('studio'); });
  };

  // Stems separados → abrir studio con cada stem en su track
  const handleStemsReady = (files: File[]) => {
    // files = [vocals.wav, drums.wav, bass.wav, other.wav]
    // MixEditor los recibe como uploadedFiles → cada uno es un Stem separado
    openStudio(files, PRESETS[0]);
  };

  // Stems cargados manualmente → preset → studio
  const handleUploadComplete = (files: File[]) => {
    setUploadedFiles(files);
    setCurrentScreen('preset');
  };
  const handlePresetConfirm = (preset: MixPreset, rv:boolean, dl:boolean, st:boolean) => {
    openStudio(uploadedFiles, preset, rv, dl, st);
  };

  // Export
  const handleExport = (data: ExportData) => {
    pendingExportData = data; exportRef.current = data; setExportData(data);
    setCurrentScreen('export');
  };

  // ─── Render screens ──────────────────────────────────────────────────────
  // Si no hay usuario → Landing pública
  if (!user) {
    return <FlowLanding onNavigate={handleNavigate} />;
  }

  // Tablero principal
  if (currentScreen === 'home') {
    return <FlowHome user={user} onNavigate={handleNavigate} />;
  }

  // Crear canción con IA
  if (currentScreen === 'create') {
    return <FlowCreate user={user} onNavigate={handleNavigate} onTrackReady={handleTrackReady} onCreditsUpdate={handleCredits} />;
  }

  // Separar stems → StemSeparator → abre studio con 4 tracks
  if (currentScreen === 'separate') {
    return <StemSeparator
      user={user} onBack={() => setCurrentScreen('home')}
      onCreditsUpdate={handleCredits}
      onStemsReady={handleStemsReady}
    />;
  }

  // Cargar stems para mezcla → selección de preset → studio
  if (currentScreen === 'stems') {
    return <NewProjectScreen
      user={user} onBack={() => setCurrentScreen('home')}
      onUploadComplete={handleUploadComplete}
      hasUnlimitedCredits={true}
    />;
  }

  // Preset selector
  if (currentScreen === 'preset') {
    return <PresetScreen
      user={user} stemCount={uploadedFiles.length}
      onBack={() => setCurrentScreen('stems')}
      onConfirm={handlePresetConfirm}
    />;
  }

  // Mezclar canción (auto-mastering) → sube 1 archivo → studio
  if (currentScreen === 'mixsong') {
    return <NewProjectScreen
      user={user} onBack={() => setCurrentScreen('home')}
      onUploadComplete={(files) => openStudio(files, PRESETS[0])}
      hasUnlimitedCredits={true}
    />;
  }

  // MixingStudio AI — el MixEditor real con TODOS los tracks separados
  if (currentScreen === 'studio') {
    if (!user) return null;
    return <MixEditor
      projectId={projectId}
      user={user}
      uploadedFiles={uploadedFiles}
      onBack={() => setCurrentScreen('home')}
      onCreditsUpdate={handleCredits}
      onExport={handleExport}
      initialPreset={selectedPreset}
      reverbOn={reverbOn}
      delayOn={delayOn}
      stereoOn={stereoOn}
    />;
  }

  // Export screen
  if (currentScreen === 'export') {
    const expData = pendingExportData || exportRef.current || exportData;
    return <ExportScreen
      user={user} projectId={projectId} exportData={expData}
      exportProgress={expData ? 100 : 0} exportStep={expData ? '¡Listo!' : 'Preparando...'}
      onBack={() => setCurrentScreen('studio')}
      onNewMix={() => setCurrentScreen('stems')}
      onGoHome={() => setCurrentScreen('home')}
      onCreditsUpdate={handleCredits}
    />;
  }

  return <FlowHome user={user} onNavigate={handleNavigate} />;
}
