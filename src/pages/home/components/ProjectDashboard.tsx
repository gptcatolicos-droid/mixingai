/**
 * ProjectDashboard.tsx — Router principal
 * 
 * El DAW (MixEditor) es el centro de todo.
 * Todo abre en el DAW. El mezclador viejo ya no se usa como pantalla separada.
 * 
 * FLUJO:
 * home        → FlowHome (5 cards)
 * studio      → MixEditor (DAW principal, puede estar vacío)
 * separate    → StemSeparator → al terminar → MixEditor con 4 stems
 * stems       → NewProjectScreen (subir stems) → MixEditor directo (sin preset screen separada)
 * mixsong     → NewProjectScreen → MixEditor
 * create      → FlowCreate (generar canción) → al terminar → MixEditor con track
 * export      → ExportScreen
 */
import { useState, useEffect, useRef } from 'react';
let pendingExportData: any = null;
import StudioDAW from './StudioDAW';
import ExportScreen from './ExportScreen';
import NewProjectScreen from './NewProjectScreen';
import StemSeparator from './StemSeparator';
import FlowHome from './FlowHome';
import FlowCreate from './FlowCreate';
import { PRESETS, MixPreset } from './PresetScreen';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

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
type Screen = 'home'|'studio'|'create'|'separate'|'stems'|'mixsong'|'export';

const newId = () => `proj_${Date.now()}`;

// Landing pública
function FlowLanding({ onNavigate }: { onNavigate: (id:string)=>void }) {
  const T = { pink:'#ec4899', fuchsia:'#C026D3', violet:'#a259ff', text2:'#b8a8d0', text3:'#7a6a90', border:'rgba(192,38,211,0.18)', surface:'rgba(26,16,40,0.62)' };
  const navigate = useNavigate();
  return (
    <div style={{ width:'100%', minHeight:'100vh', background:'radial-gradient(ellipse at 80% -10%,rgba(192,38,211,0.18),transparent 50%),radial-gradient(ellipse at 0% 110%,rgba(162,89,255,0.14),transparent 50%),#0F0A1A', fontFamily:'-apple-system,BlinkMacSystemFont,"DM Sans",system-ui,sans-serif', color:'#F8F0FF' }}>
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 22px', textAlign:'center' }}>
        <div style={{ width:64, height:64, borderRadius:18, background:`linear-gradient(135deg,${T.fuchsia},${T.pink})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 40px ${T.fuchsia}66`, marginBottom:28 }}>
          <svg width="30" height="30" viewBox="0 0 24 24"><path d="M12 3 L13.6 9.4 L20 11 L13.6 12.6 L12 19 L10.4 12.6 L4 11 L10.4 9.4 Z" fill="#fff"/></svg>
        </div>
        <h1 style={{ fontSize:'clamp(36px,7vw,56px)', fontWeight:600, margin:0, background:`linear-gradient(90deg,#F8F0FF,${T.pink},${T.violet})`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:-1.2, lineHeight:1.05 }}>
          Crea música con IA<br/>en tu navegador
        </h1>
        <p style={{ fontSize:17, color:T.text2, maxWidth:540, margin:'20px 0 36px', lineHeight:1.5 }}>
          Genera canciones, separa stems, mezcla y masteriza. Todo en el DAW con IA.
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
          <span>✓ 10 créditos gratis</span><span>✓ Sin tarjeta</span><span>✓ DAW en tu navegador</span>
        </div>
      </div>
    </div>
  );
}

export default function ProjectDashboard() {
  const [user, setUser] = useState<User|null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [projectId, setProjectId] = useState<string>(newId());
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [activePreset, setActivePreset] = useState<MixPreset>(PRESETS[0]);
  const [exportData, setExportData] = useState<ExportData|null>(null);
  const exportRef = useRef<ExportData|null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const stored = localStorage.getItem('audioMixerUser');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { localStorage.removeItem('audioMixerUser'); }
    }
    const mode = searchParams.get('mode');
    const valid: Screen[] = ['studio','create','separate','stems','mixsong'];
    if (mode && valid.includes(mode as Screen)) setScreen(mode as Screen);
  }, []);

  const updateUser = (u: User) => { setUser(u); localStorage.setItem('audioMixerUser', JSON.stringify(u)); };
  const handleCredits = (n: number) => { if (!user) return; updateUser({...user, credits:n}); };

  const handleLogout = () => {
    // Limpiar TODO el estado y localStorage
    setUser(null);
    setScreen('home');
    setUploadedFiles([]);
    // Limpiar localStorage completo de auth
    localStorage.removeItem('audioMixerUser');
    Object.keys(localStorage).forEach(k => {
      if (k.includes('supabase') || k.includes('sb-') || k.includes('auth-token')) {
        localStorage.removeItem(k);
      }
    });
    // Forzar recarga para limpiar estado de React completamente
    window.location.href = '/';
  };

  // Navegar — todo va al DAW
  const handleNavigate = (id: string) => {
    if (id === 'login')    { navigate('/auth/login');    return; }
    if (id === 'register') { navigate('/auth/register'); return; }
    if (id === 'blog')     { navigate('/blog');          return; }
    if (id === 'billing')  { navigate('/billing');       return; }
    const screenMap: Record<string, Screen> = {
      home: 'home', studio: 'studio', create: 'create',
      separate: 'separate', stems: 'stems', mixsong: 'mixsong',
    };
    if (screenMap[id]) setScreen(screenMap[id]);
  };

  // Abrir el DAW con archivos
  const openDAW = (files: File[] = [], preset: MixPreset = PRESETS[0]) => {
    setProjectId(newId());
    setUploadedFiles(files);
    setActivePreset(preset);
    setScreen('studio');
  };

  // Stems separados (4 tracks) → DAW
  const handleStemsReady = (files: File[]) => openDAW(files, PRESETS[0]);

  // Track generado con IA → DAW
  const handleTrackReady = (url: string, title: string) => {
    fetch(url).then(r => r.blob()).then(blob => {
      openDAW([new File([blob], `${title}.wav`, { type:'audio/wav' })], PRESETS[0]);
    }).catch(() => setScreen('studio'));
  };

  // Stems cargados manualmente → DAW directo (sin pantalla de preset separada)
  const handleUploadComplete = (files: File[]) => openDAW(files, PRESETS[0]);

  // Export
  const handleExport = (data: ExportData) => {
    pendingExportData = data; exportRef.current = data; setExportData(data);
    setScreen('export');
  };

  // Sin usuario → landing
  if (!user) return <FlowLanding onNavigate={handleNavigate} />;

  // DAW = MixEditor con todo incluido
  if (screen === 'studio') {
    return <StudioDAW
      projectId={projectId}
      user={user!}
      uploadedFiles={uploadedFiles}
      onBack={() => setScreen('home')}
      onCreditsUpdate={handleCredits}
      onExport={handleExport}
      initialPreset={activePreset}
      reverbOn={activePreset.reverbWet > 0}
      delayOn={activePreset.delayWet > 0}
      stereoOn={activePreset.stereoWidth > 0.5}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    />;
  }

  // Separar stems → DAW
  if (screen === 'separate') {
    return <StemSeparator
      user={user!}
      onBack={() => setScreen('home')}
      onCreditsUpdate={handleCredits}
      onStemsReady={handleStemsReady}
    />;
  }

  // Cargar stems → DAW directo
  if (screen === 'stems' || screen === 'mixsong') {
    return <NewProjectScreen
      user={user!}
      onBack={() => setScreen('home')}
      onUploadComplete={handleUploadComplete}
      hasUnlimitedCredits={true}
    />;
  }

  // Crear con IA → DAW
  if (screen === 'create') {
    return <FlowCreate
      user={user!}
      onNavigate={handleNavigate}
      onTrackReady={handleTrackReady}
      onCreditsUpdate={handleCredits}
    />;
  }

  // Export
  if (screen === 'export') {
    const expData = pendingExportData || exportRef.current || exportData;
    return <ExportScreen
      user={user!} projectId={projectId} exportData={expData}
      exportProgress={expData ? 100 : 0} exportStep={expData ? '¡Listo!' : 'Preparando...'}
      onBack={() => setScreen('studio')}
      onNewMix={() => setScreen('stems')}
      onGoHome={() => setScreen('home')}
      onCreditsUpdate={handleCredits}
    />;
  }

  // Home - tablero
  return <FlowHome user={user!} onNavigate={handleNavigate} onLogout={handleLogout} />;
}
