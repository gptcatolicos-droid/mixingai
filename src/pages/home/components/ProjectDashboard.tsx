import { useState, useEffect, useRef } from 'react';

let pendingExportData: any = null;
import Header from '@/components/feature/Header';
import MixEditor from './MixEditor';
import ExportScreen from './ExportScreen';
import NewProjectScreen from './NewProjectScreen';
import PresetScreen, { MixPreset, PRESETS } from './PresetScreen';
import StemSeparator from './StemSeparator';
import AIGenerator from './AIGenerator';
import InstrumentAdder from './InstrumentAdder';
import DawV4 from './DawV4';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

interface User {
  id: string; firstName: string; lastName: string; email: string;
  country: string; credits: number; provider?: string; createdAt: string;
  username?: string; avatar?: string; is_pro?: boolean; plan?: string;
}
interface Project {
  id: string; name: string; stems: number;
  status: 'draft'|'processing'|'complete'; createdAt: Date; mode?: string;
}
interface ExportData {
  audioBuffer: AudioBuffer; audioUrl: string; waveformPeaks: Float32Array;
  finalLufs: number; mp3Url?: string; wavUrl?: string;
}

type Screen = 'dashboard'|'daw'|'newProject'|'preset'|'mixer'|'export'|'separator'|'generator'|'instruments';

const T = {
  text: '#F8F0FF', text2: 'rgba(248,240,255,0.65)', text3: 'rgba(248,240,255,0.38)',
  pink: '#EC4899', fuchsia: '#C026D3', violet: '#7C3AED', border: 'rgba(192,38,211,0.18)',
  surface: 'rgba(26,16,40,0.82)', green: '#4ade80',
};

const MODES = [
  { id:'daw',         icon:'✦', label:'MixingStudio AI',      sub:'DAW · Timeline · Mezcla · IA',   color:'#C026D3', credits:0,  desc:'El estudio completo con IA', big: true },
  { id:'generator',   icon:'🎵', label:'Crear canción con IA', sub:'Prompt · Letra · Referencia',    color:'#EC4899', credits:10, desc:'ACE-Step genera música completa' },
  { id:'separator',   icon:'🎚️', label:'Separar stems',        sub:'Vocals · Drums · Bass · Other', color:'#7C3AED', credits:3,  desc:'Demucs separa cualquier canción' },
  { id:'instruments', icon:'🎸', label:'Agregar instrumento',  sub:'Elige · Describe · Genera',      color:'#a259ff', credits:5,  desc:'Stem nuevo directo al DAW' },
];

const newProjId = () => `proj_${Date.now()}`;

export default function ProjectDashboard() {
  const [user, setUser] = useState<User|null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [selectedProject, setSelectedProject] = useState<string>(newProjId());
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<MixPreset>(PRESETS[0]);
  const [reverbOn, setReverbOn] = useState(false);
  const [delayOn, setDelayOn] = useState(false);
  const [stereoOn, setStereoOn] = useState(false);
  const [exportData, setExportData] = useState<ExportData|null>(null);
  const [showUpgradeHint, setShowUpgradeHint] = useState(false);
  const exportDataRef = useRef<ExportData|null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const stored = localStorage.getItem('audioMixerUser');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setUser(u);
      } catch { localStorage.removeItem('audioMixerUser'); }
    }
    // Leer el modo desde la URL
    const mode = searchParams.get('mode');
    if (mode === 'daw' || searchParams.get('studio') === '1') setCurrentScreen('daw');
    else if (mode === 'separator') setCurrentScreen('separator');
    else if (mode === 'generator') setCurrentScreen('generator');
    else if (mode === 'upload') setCurrentScreen('newProject');
  }, []);

  const handleCreditsUpdate = (n: number) => {
    if (!user) return;
    const u = {...user, credits: n};
    setUser(u); localStorage.setItem('audioMixerUser', JSON.stringify(u));
    if (n <= 0) setShowUpgradeHint(true);
  };

  const handleLogout = () => {
    setUser(null); localStorage.removeItem('audioMixerUser');
    setCurrentScreen('dashboard'); navigate('/');
  };

  // Navegar desde el header
  const handleNavMode = (mode: string) => {
    if (mode === 'daw') setCurrentScreen('daw');
    else if (mode === 'separator') setCurrentScreen('separator');
    else if (mode === 'generator') setCurrentScreen('generator');
    else if (mode === 'upload') setCurrentScreen('newProject');
    else setCurrentScreen('dashboard');
  };

  // Abrir el DAW directamente — siempre funciona
  const openDAW = (files: File[] = []) => {
    setUploadedFiles(files);
    setCurrentScreen('daw');
  };

  // Abrir el mezclador clásico
  const openMixer = (files: File[] = [], preset: MixPreset = PRESETS[0], rv = false, dl = false, st = false) => {
    const id = newProjId();
    setSelectedProject(id);
    setUploadedFiles(files);
    setSelectedPreset(preset);
    setReverbOn(rv); setDelayOn(dl); setStereoOn(st);
    setCurrentScreen('mixer');
  };

  const handleUploadComplete = (files: File[]) => {
    setUploadedFiles(files);
    setCurrentScreen('preset');
  };

  const handlePresetConfirm = (preset: MixPreset, rv: boolean, dl: boolean, st: boolean) => {
    openMixer(uploadedFiles, preset, rv, dl, st);
  };

  const handleExport = (data: ExportData) => {
    pendingExportData = data;
    exportDataRef.current = data;
    setExportData(data);
    setCurrentScreen('export');
  };

  const handleStemsReady = (files: File[]) => {
    // Stems separados → abrir el DAW con esos stems
    openDAW(files);
  };

  const handleTrackReady = (url: string, title: string) => {
    fetch(url).then(r => r.blob()).then(blob => {
      const file = new File([blob], `${title}.wav`, { type: 'audio/wav' });
      openDAW([file]);
    }).catch(() => setCurrentScreen('dashboard'));
  };

  const handleInstrumentReady = (file: File) => {
    setUploadedFiles(prev => [...prev, file]);
    setCurrentScreen('daw');
  };

  // ─── Screens ──────────────────────────────────────────────────────────────

  // DAW V4 — el nuevo con timeline
  if (currentScreen === 'daw')
    return <DawV4 user={user} onBack={() => setCurrentScreen('dashboard')} initialFiles={uploadedFiles} onCreditsUpdate={handleCreditsUpdate} />;

  if (currentScreen === 'separator' && user)
    return <StemSeparator user={user} onBack={() => setCurrentScreen('dashboard')} onCreditsUpdate={handleCreditsUpdate} onStemsReady={handleStemsReady} />;

  if (currentScreen === 'generator' && user)
    return <AIGenerator user={user} onBack={() => setCurrentScreen('dashboard')} onCreditsUpdate={handleCreditsUpdate} onTrackReady={handleTrackReady} />;

  if (currentScreen === 'instruments' && user)
    return <InstrumentAdder user={user} onBack={() => setCurrentScreen('dashboard')} onCreditsUpdate={handleCreditsUpdate} onInstrumentReady={(f, _) => handleInstrumentReady(f)} />;

  if (currentScreen === 'newProject' && user)
    return <NewProjectScreen user={user} onBack={() => setCurrentScreen('dashboard')} onUploadComplete={handleUploadComplete} hasUnlimitedCredits={true} />;

  if (currentScreen === 'preset' && user)
    return <PresetScreen user={user} stemCount={uploadedFiles.length} onBack={() => setCurrentScreen('newProject')} onConfirm={handlePresetConfirm} />;

  if (currentScreen === 'mixer' && user)
    return <MixEditor projectId={selectedProject} user={user} uploadedFiles={uploadedFiles}
      onBack={() => setCurrentScreen('dashboard')} onCreditsUpdate={handleCreditsUpdate} onExport={handleExport}
      initialPreset={selectedPreset} reverbOn={reverbOn} delayOn={delayOn} stereoOn={stereoOn} />;

  if (currentScreen === 'export') {
    const expData = pendingExportData || exportDataRef.current || exportData;
    const expUser = user || { id:'guest', firstName:'Usuario', lastName:'', email:'', country:'', credits:999999, createdAt:'' };
    return <ExportScreen user={expUser} projectId={selectedProject} exportData={expData}
      exportProgress={expData ? 100 : 0} exportStep={expData ? '¡Listo!' : 'Preparando...'}
      onBack={() => setCurrentScreen('mixer')} onNewMix={() => setCurrentScreen('newProject')}
      onGoHome={() => setCurrentScreen('dashboard')} onCreditsUpdate={handleCreditsUpdate} />;
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────
  const isPro = user?.is_pro || user?.plan === 'unlimited';

  return (
    <div style={{ minHeight:'100vh', background:'transparent', fontFamily:"'DM Sans',system-ui,sans-serif", color:T.text }}>
      <Header user={user} onLogout={handleLogout} onCreditsUpdate={handleCreditsUpdate} onNavigate={handleNavMode} />

      <div style={{ maxWidth:'800px', margin:'0 auto', padding:'48px 20px' }}>

        {!user ? (
          /* ── No logueado ── */
          <div style={{ textAlign:'center', paddingTop:'40px' }}>
            <h1 style={{ fontSize:'clamp(36px,6vw,56px)', fontWeight:900, letterSpacing:'-1.5px', lineHeight:1.1, marginBottom:'16px' }}>
              <span style={{ background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                Crea música<br/>con Inteligencia Artificial
              </span>
            </h1>
            <p style={{ color:T.text2, fontSize:'18px', marginBottom:'36px', lineHeight:1.6 }}>
              Mezcla · Genera · Separa · Instrumentos — todo con IA.<br/>
              Gratis para empezar. Sin suscripción.
            </p>
            <div style={{ display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap', marginBottom:'48px' }}>
              <Link to="/auth/register" style={{ background:'linear-gradient(135deg,#EC4899,#C026D3)', color:'#fff', padding:'16px 36px', borderRadius:'980px', fontSize:'16px', fontWeight:700, textDecoration:'none', boxShadow:'0 0 32px rgba(192,38,211,0.5)' }}>
                Comenzar gratis
              </Link>
              <Link to="/auth/login" style={{ background:'transparent', border:'1px solid rgba(192,38,211,0.3)', color:'#9B7EC8', padding:'15px 28px', borderRadius:'980px', fontSize:'15px', textDecoration:'none' }}>
                Ya tengo cuenta
              </Link>
            </div>
            {/* Preview de los 4 modos para usuarios no logueados */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'14px', maxWidth:'700px', margin:'0 auto' }}>
              {MODES.map(m => (
                <div key={m.id} style={{ background:T.surface, border:`1px solid ${m.color}33`, borderRadius:'16px', padding:'20px 16px', textAlign:'left', borderTop:`2px solid ${m.color}` }}>
                  <div style={{ fontSize:'28px', marginBottom:'8px' }}>{m.icon}</div>
                  <div style={{ fontSize:'13px', fontWeight:700, color:T.text, marginBottom:'4px' }}>{m.label}</div>
                  <div style={{ fontSize:'11px', color:m.color, fontWeight:600 }}>{m.sub}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ── Logueado ── */}
            <div style={{ marginBottom:'32px' }}>
              <h1 style={{ fontSize:'clamp(28px,4vw,40px)', fontWeight:800, letterSpacing:'-1px', color:T.text, marginBottom:'6px' }}>
                Hola, {user.firstName} 👋
              </h1>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
                <p style={{ color:'#9B7EC8', fontSize:'15px', margin:0 }}>
                  {isPro ? '∞ Plan Creador Pro activo' : 'Plan Gratis · 2 canciones incluidas'}
                </p>
                <div style={{ background:'rgba(192,38,211,0.1)', border:`1px solid ${T.border}`, borderRadius:'980px', padding:'4px 14px', fontSize:'13px', color:'#9B7EC8' }}>
                  <span style={{ color:T.pink, fontWeight:700 }}>{isPro ? '∞' : user.credits}</span> créditos
                </div>
              </div>
            </div>

            {/* MixingStudio AI — card grande destacada */}
            <button onClick={() => openDAW()}
              style={{ width:'100%', background:`linear-gradient(135deg,rgba(192,38,211,0.2),rgba(162,89,255,0.15))`, border:`2px solid rgba(192,38,211,0.5)`, borderRadius:'20px', padding:'28px 32px', cursor:'pointer', textAlign:'left', fontFamily:'inherit', marginBottom:'16px', display:'flex', alignItems:'center', gap:'24px', boxShadow:'0 0 40px rgba(192,38,211,0.2)', transition:'all 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 60px rgba(192,38,211,0.4)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 40px rgba(192,38,211,0.2)')}>
              <div style={{ width:'60px', height:'60px', borderRadius:'16px', background:'linear-gradient(135deg,#C026D3,#EC4899)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', flexShrink:0, boxShadow:'0 0 24px rgba(192,38,211,0.5)' }}>✦</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'22px', fontWeight:800, color:T.text, letterSpacing:'-0.5px', marginBottom:'4px' }}>MixingStudio AI</div>
                <div style={{ fontSize:'14px', color:'#C026D3', fontWeight:600, marginBottom:'8px' }}>DAW completo · Timeline · Mezcla · Generación IA · Stems</div>
                <div style={{ fontSize:'13px', color:T.text2, lineHeight:1.5 }}>El estudio de música con IA más completo. Crea, mezcla y exporta canciones profesionales desde el navegador.</div>
              </div>
              <div style={{ background:'linear-gradient(135deg,#EC4899,#C026D3)', color:'#fff', padding:'12px 24px', borderRadius:'980px', fontSize:'14px', fontWeight:700, flexShrink:0, boxShadow:'0 0 20px rgba(192,38,211,0.5)' }}>
                Abrir →
              </div>
            </button>

            {/* 3 modos restantes */}
            <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'#9B7EC8', marginBottom:'14px' }}>
              Otras herramientas
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'20px' }}>
              {MODES.filter(m => m.id !== 'daw').map(mode => {
                const canUse = isPro || user.credits >= mode.credits;
                return (
                  <button key={mode.id}
                    onClick={() => canUse ? setCurrentScreen(mode.id as Screen) : setShowUpgradeHint(true)}
                    style={{ background:`rgba(26,16,40,0.95)`, border:`1px solid ${mode.color}33`, borderRadius:'14px', padding:'18px 16px', cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all 0.15s', position:'relative', overflow:'hidden' }}
                    onMouseEnter={e => { (e.currentTarget.style.borderColor=`${mode.color}66`); (e.currentTarget.style.transform='translateY(-2px)'); }}
                    onMouseLeave={e => { (e.currentTarget.style.borderColor=`${mode.color}33`); (e.currentTarget.style.transform='translateY(0)'); }}>
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:mode.color }}></div>
                    <div style={{ fontSize:'22px', marginBottom:'8px' }}>{mode.icon}</div>
                    <div style={{ fontSize:'13px', fontWeight:700, color:T.text, marginBottom:'3px' }}>{mode.label}</div>
                    <div style={{ fontSize:'11px', color:mode.color, fontWeight:600, marginBottom:'8px' }}>{mode.sub}</div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ background:`${mode.color}18`, border:`1px solid ${mode.color}33`, borderRadius:'6px', padding:'2px 8px', fontSize:'10px', fontWeight:700, color:mode.color }}>
                        {mode.credits > 0 ? `${mode.credits} créditos` : 'Gratis'}
                      </span>
                      {!canUse && <span style={{ fontSize:'10px', color:'#F59E0B' }}>⚡</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Cargar stems directo al mezclador */}
            <button onClick={() => setCurrentScreen('newProject')}
              style={{ width:'100%', background:'transparent', border:`1px solid ${T.border}`, color:T.text2, padding:'12px 24px', borderRadius:'12px', fontSize:'14px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'24px' }}>
              ⬆ Cargar stems al mezclador clásico
            </button>

            {/* Proyectos recientes */}
            {projects.length > 0 && (
              <div style={{ marginTop:'8px' }}>
                <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'#9B7EC8', marginBottom:'12px' }}>Recientes</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {projects.slice(0,4).map(p => (
                    <button key={p.id}
                      onClick={() => { setSelectedProject(p.id); setCurrentScreen('daw'); }}
                      style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'12px', padding:'12px 16px', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', width:'100%', textAlign:'left', fontFamily:'inherit' }}>
                      <span style={{ fontSize:'18px' }}>🎵</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'14px', fontWeight:600, color:T.text }}>{p.name}</div>
                        <div style={{ fontSize:'12px', color:'#9B7EC8', marginTop:'2px' }}>{p.stems} stems · {p.createdAt.toLocaleDateString('es-CO')}</div>
                      </div>
                      <span style={{ color:'#9B7EC8', fontSize:'18px' }}>›</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upgrade modal */}
      {showUpgradeHint && (
        <div style={{ position:'fixed', inset:0, background:'rgba(8,4,16,0.9)', backdropFilter:'blur(12px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ background:'linear-gradient(135deg,rgba(36,18,58,0.99),rgba(20,10,36,0.99))', border:'1px solid rgba(192,38,211,0.4)', borderRadius:'24px', padding:'36px 32px', maxWidth:'400px', width:'100%', textAlign:'center', boxShadow:'0 0 60px rgba(192,38,211,0.3)' }}>
            <div style={{ fontSize:'36px', marginBottom:'14px' }}>⚡</div>
            <h2 style={{ fontSize:'22px', fontWeight:800, color:T.text, marginBottom:'8px' }}>Sin créditos suficientes</h2>
            <p style={{ fontSize:'14px', color:T.text2, marginBottom:'24px', lineHeight:1.6 }}>1,000 créditos por $5.99 · nunca vencen · sin suscripción</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <Link to="/billing" onClick={() => setShowUpgradeHint(false)}
                style={{ background:'linear-gradient(135deg,#EC4899,#C026D3)', color:'#fff', padding:'16px', borderRadius:'14px', fontSize:'15px', fontWeight:800, textDecoration:'none', display:'block' }}>
                Obtener 1,000 créditos — $5.99
              </Link>
              <button onClick={() => setShowUpgradeHint(false)} style={{ background:'transparent', border:'none', color:T.text3, fontSize:'13px', cursor:'pointer', fontFamily:'inherit' }}>
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
