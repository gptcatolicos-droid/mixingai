import { useState, useEffect, useRef } from 'react';

let pendingExportData: any = null;
import Header from '@/components/feature/Header';
import MixEditor from './MixEditor';
import ExportScreen from './ExportScreen';
import NewProjectScreen from './NewProjectScreen';
import PresetScreen, { MixPreset, PRESETS } from './PresetScreen';
import AIChat from './AIChat';
import StemSeparator from './StemSeparator';
import AIGenerator from './AIGenerator';
import InstrumentAdder from './InstrumentAdder';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

interface User {
  id: string; firstName: string; lastName: string; email: string;
  country: string; credits: number; provider?: string; createdAt: string;
  username?: string; avatar?: string; is_pro?: boolean; plan?: string;
}
interface Project {
  id: string; name: string; stems: number;
  status: 'draft'|'processing'|'complete'; createdAt: Date; genre?: string; mode?: string;
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
  { id:'daw',         icon:'🎹', label:'MixingStudio AI',       sub:'DAW · Crea · Mezcla · Exporta', color:'#a259ff', credits:0,  desc:'Abre el estudio completo con IA' },
  { id:'generator',   icon:'✦',  label:'Crear canción con IA',   sub:'Prompt · Letra · Referencia',   color:'#C026D3', credits:10, desc:'ACE-Step genera música completa' },
  { id:'separator',   icon:'🎚️', label:'Separar stems',          sub:'Vocals · Drums · Bass · Other', color:'#7C3AED', credits:3,  desc:'Demucs separa cualquier canción' },
  { id:'instruments', icon:'🎸', label:'Agregar instrumento IA',  sub:'Elige · Describe · Genera',     color:'#EC4899', credits:5,  desc:'Stem nuevo directo al DAW' },
];

// Genera un ID de proyecto único
const newProjectId = () => `proj_${Date.now()}`;

export default function ProjectDashboard() {
  const [user, setUser] = useState<User|null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [selectedProject, setSelectedProject] = useState<string>(newProjectId());
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
        if (!u.username) u.username = `${u.firstName.toLowerCase()}_${u.lastName?.toLowerCase()||''}`;
        setUser(u);
      } catch { localStorage.removeItem('audioMixerUser'); }
    }
    // Si viene con ?studio=1 en la URL, abrir el DAW directamente
    if (searchParams.get('studio') === '1') {
      setCurrentScreen('daw');
    }
  }, []);

  const handleCreditsUpdate = (n: number) => {
    if (!user) return;
    const u = {...user, credits:n};
    setUser(u); localStorage.setItem('audioMixerUser', JSON.stringify(u));
    if (n <= 0) setShowUpgradeHint(true);
  };

  const handleLogout = () => {
    setUser(null); localStorage.removeItem('audioMixerUser'); localStorage.removeItem('rememberUser');
    setCurrentScreen('dashboard'); navigate('/');
  };

  // Abrir el DAW siempre — sin necesitar proyecto previo
  const openDAW = (files: File[] = [], preset: MixPreset = PRESETS[0], rv = false, dl = false, st = false) => {
    const projId = newProjectId();
    setSelectedProject(projId);
    setUploadedFiles(files);
    setSelectedPreset(preset);
    setReverbOn(rv); setDelayOn(dl); setStereoOn(st);
    setCurrentScreen('mixer');
  };

  const handleUploadComplete = (files: File[]) => {
    if (!user) return;
    const proj: Project = { id: newProjectId(), name: `Proyecto ${projects.length+1}`, stems: files.length, status: 'draft', createdAt: new Date(), mode: 'mix' };
    setProjects(prev => [proj,...prev]);
    setSelectedProject(proj.id);
    setUploadedFiles(files);
    setCurrentScreen('preset');
  };

  const handleChatStartMixer = (preset: MixPreset, files: File[]) => {
    openDAW(files, preset, preset.reverbWet > 0, preset.delayWet > 0, preset.stereoWidth > 0.5);
  };

  const handlePresetConfirm = (preset: MixPreset, rv: boolean, dl: boolean, st: boolean) => {
    openDAW(uploadedFiles, preset, rv, dl, st);
  };

  const handleExport = (data: ExportData) => {
    pendingExportData = data;
    exportDataRef.current = data;
    setExportData(data);
    setCurrentScreen('export');
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard');
    setUploadedFiles([]);
    setExportData(null);
  };

  // Stems separados → abrir DAW con esos stems
  const handleStemsReady = (files: File[]) => {
    if (!user) return;
    const proj: Project = { id: newProjectId(), name: `Separación ${projects.length+1}`, stems: files.length, status: 'draft', createdAt: new Date(), mode: 'separator' };
    setProjects(prev => [proj,...prev]);
    openDAW(files, PRESETS[0]);
  };

  // Track generado → abrir DAW con ese track
  const handleTrackReady = (url: string, title: string) => {
    // Convertir URL a File para el DAW
    fetch(url).then(r => r.blob()).then(blob => {
      const file = new File([blob], `${title}.wav`, { type: 'audio/wav' });
      const proj: Project = { id: newProjectId(), name: title, stems: 1, status: 'draft', createdAt: new Date(), mode: 'generator' };
      setProjects(prev => [proj,...prev]);
      openDAW([file], PRESETS[0]);
    }).catch(() => setCurrentScreen('dashboard'));
  };

  // Instrumento generado → agregar al DAW y abrir
  const handleInstrumentReady = (file: File, name: string) => {
    setUploadedFiles(prev => [...prev, file]);
    setCurrentScreen('mixer');
  };

  // ─── Screens ──────────────────────────────────────────────────────────────
  if (currentScreen === 'daw' && user)
    return <AIChat user={user} onStartMixer={handleChatStartMixer} onCreditsUpdate={handleCreditsUpdate} />;

  if (currentScreen === 'separator' && user)
    return <StemSeparator user={user} onBack={() => setCurrentScreen('dashboard')} onCreditsUpdate={handleCreditsUpdate} onStemsReady={handleStemsReady} />;

  if (currentScreen === 'generator' && user)
    return <AIGenerator user={user} onBack={() => setCurrentScreen('dashboard')} onCreditsUpdate={handleCreditsUpdate} onTrackReady={handleTrackReady} />;

  if (currentScreen === 'instruments' && user)
    return <InstrumentAdder user={user} onBack={() => setCurrentScreen('dashboard')} onCreditsUpdate={handleCreditsUpdate} onInstrumentReady={handleInstrumentReady} />;

  if (currentScreen === 'newProject' && user)
    return <NewProjectScreen user={user} onBack={() => setCurrentScreen('dashboard')} onUploadComplete={handleUploadComplete} hasUnlimitedCredits={true} />;

  if (currentScreen === 'preset' && user)
    return <PresetScreen user={user} stemCount={uploadedFiles.length} onBack={() => setCurrentScreen('newProject')} onConfirm={handlePresetConfirm} />;

  // El mixer SIEMPRE abre — selectedProject siempre tiene valor
  if (currentScreen === 'mixer' && user)
    return <MixEditor
      projectId={selectedProject} user={user} uploadedFiles={uploadedFiles}
      onBack={handleBackToDashboard} onCreditsUpdate={handleCreditsUpdate} onExport={handleExport}
      initialPreset={selectedPreset} reverbOn={reverbOn} delayOn={delayOn} stereoOn={stereoOn}
    />;

  if (currentScreen === 'export') {
    const expData = pendingExportData || exportDataRef.current || exportData;
    const expUser = user || { id:'guest', firstName:'Usuario', lastName:'', email:'', country:'', credits:999999, createdAt:'' };
    return <ExportScreen user={expUser} projectId={selectedProject} exportData={expData}
      exportProgress={expData ? 100 : 0} exportStep={expData ? '¡Listo!' : 'Preparando...'}
      onBack={() => setCurrentScreen('mixer')}
      onNewMix={() => setCurrentScreen('newProject')}
      onGoHome={() => setCurrentScreen('dashboard')}
      onCreditsUpdate={handleCreditsUpdate} />;
  }

  // ─── Dashboard principal ──────────────────────────────────────────────────
  const isPro = user?.is_pro || user?.plan === 'unlimited';
  const creditsLow = user && user.credits < 10 && !isPro;

  return (
    <div style={{ minHeight:'100vh', background:'transparent', fontFamily:"'DM Sans',system-ui,sans-serif", color:T.text }}>
      <Header user={user} onLogout={handleLogout} onCreditsUpdate={handleCreditsUpdate} />

      <div style={{ maxWidth:'720px', margin:'0 auto', padding:'40px 16px' }}>

        {!user ? (
          <div style={{ textAlign:'center', paddingTop:'60px' }}>
            <h1 style={{ fontSize:'40px', fontWeight:700, letterSpacing:'-1px', background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:'12px' }}>
              MixingMusic.AI
            </h1>
            <p style={{ color:'#9B7EC8', fontSize:'16px', marginBottom:'32px' }}>Mezcla · Genera · Separa · Instrumentos — con IA</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px', maxWidth:'320px', margin:'0 auto' }}>
              <Link to="/auth/register" style={{ background:'linear-gradient(135deg,#EC4899,#C026D3)', color:'#fff', padding:'14px', borderRadius:'980px', fontSize:'15px', fontWeight:600, textDecoration:'none', textAlign:'center', boxShadow:'0 0 24px rgba(192,38,211,0.4)' }}>
                Comenzar Gratis — 2 canciones
              </Link>
              <Link to="/auth/login" style={{ background:'transparent', border:'1px solid rgba(192,38,211,0.25)', color:'#9B7EC8', padding:'13px', borderRadius:'980px', fontSize:'14px', textDecoration:'none', textAlign:'center' }}>
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Greeting */}
            <div style={{ marginBottom:'28px' }}>
              <h1 style={{ fontSize:'26px', fontWeight:600, letterSpacing:'-0.5px', color:T.text, marginBottom:'4px' }}>
                Hola, {user.firstName} 👋
              </h1>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
                <p style={{ color:'#9B7EC8', fontSize:'14px', margin:0 }}>
                  {isPro ? '∞ Plan Creador Pro activo' : 'Plan Gratis · 2 canciones incluidas'}
                </p>
                <div style={{ background:'rgba(192,38,211,0.1)', border:`1px solid ${T.border}`, borderRadius:'980px', padding:'3px 12px', fontSize:'12px', color:'#9B7EC8' }}>
                  <span style={{ color:T.pink, fontWeight:700 }}>{isPro ? '∞' : user.credits}</span> créditos
                </div>
              </div>
            </div>

            {creditsLow && (
              <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:'12px', padding:'14px 18px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'12px' }}>
                <span style={{ fontSize:'20px' }}>⚡</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'#F59E0B', marginBottom:'2px' }}>Pocos créditos ({user.credits} restantes)</div>
                  <div style={{ fontSize:'12px', color:T.text2 }}>1,000 créditos por $5.99 · nunca vencen</div>
                </div>
                <Link to="/billing" style={{ background:'linear-gradient(135deg,#EC4899,#C026D3)', color:'#fff', padding:'8px 18px', borderRadius:'980px', fontSize:'12px', fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
                  Comprar
                </Link>
              </div>
            )}

            {/* 4 modos */}
            <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'#9B7EC8', marginBottom:'14px' }}>
              ¿Qué quieres hacer hoy?
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'20px' }}>
              {MODES.map(mode => {
                const canUse = isPro || user.credits >= mode.credits || mode.credits === 0;
                return (
                  <button key={mode.id}
                    onClick={() => canUse ? (
                      mode.id === 'daw'
                        ? openDAW() // Abrir DAW vacío directamente
                        : setCurrentScreen(mode.id as Screen)
                    ) : setShowUpgradeHint(true)}
                    style={{ background:`linear-gradient(135deg,rgba(26,16,40,0.95),rgba(15,10,26,0.95))`, border:`1px solid ${mode.color}33`, borderRadius:'14px', padding:'20px', cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all 0.15s', position:'relative', overflow:'hidden' }}
                    onMouseEnter={e => { (e.currentTarget.style.borderColor=`${mode.color}66`); (e.currentTarget.style.transform='translateY(-2px)'); }}
                    onMouseLeave={e => { (e.currentTarget.style.borderColor=`${mode.color}33`); (e.currentTarget.style.transform='translateY(0)'); }}>
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px', background:mode.color }}></div>
                    <div style={{ fontSize:'24px', marginBottom:'10px' }}>{mode.icon}</div>
                    <div style={{ fontSize:'13px', fontWeight:700, color:T.text, marginBottom:'3px' }}>{mode.label}</div>
                    <div style={{ fontSize:'11px', color:mode.color, fontWeight:600, marginBottom:'6px' }}>{mode.sub}</div>
                    <div style={{ fontSize:'11px', color:T.text3, lineHeight:1.4, marginBottom:'10px' }}>{mode.desc}</div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      {mode.credits > 0 ? (
                        <span style={{ background:`${mode.color}18`, border:`1px solid ${mode.color}33`, borderRadius:'6px', padding:'2px 8px', fontSize:'10px', fontWeight:700, color:mode.color }}>
                          {mode.credits} créditos
                        </span>
                      ) : (
                        <span style={{ background:`${mode.color}18`, border:`1px solid ${mode.color}33`, borderRadius:'6px', padding:'2px 8px', fontSize:'10px', fontWeight:700, color:mode.color }}>
                          Gratis
                        </span>
                      )}
                      {!canUse && <span style={{ fontSize:'10px', color:'#F59E0B' }}>⚡ Sin créditos</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Subir stems */}
            <button onClick={() => setCurrentScreen('newProject')}
              style={{ width:'100%', background:'transparent', border:`1px solid ${T.border}`, color:T.text2, padding:'12px 24px', borderRadius:'12px', fontSize:'14px', cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginBottom:'24px' }}>
              ⬆ Subir stems directamente al mezclador
            </button>

            {/* Credit breakdown */}
            {!isPro && (
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'14px', padding:'20px', marginBottom:'24px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color:T.text }}>Plan Creador Pro — $5.99</div>
                  <Link to="/billing" style={{ background:'linear-gradient(135deg,#EC4899,#C026D3)', color:'#fff', padding:'7px 16px', borderRadius:'980px', fontSize:'12px', fontWeight:700, textDecoration:'none' }}>
                    Obtener 1,000 cr.
                  </Link>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                  {[
                    {icon:'🎹', label:'MixingStudio AI', cost:'Gratis'},
                    {icon:'✦',  label:'Generar canción', cost:'10 cr.'},
                    {icon:'🎚️', label:'Separar stems', cost:'3 cr.'},
                    {icon:'🎸', label:'Instrumento IA', cost:'5 cr.'},
                  ].map(item => (
                    <div key={item.label} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'12px', color:T.text2, padding:'4px 0' }}>
                      <span style={{ fontSize:'14px' }}>{item.icon}</span>
                      <span style={{ flex:1 }}>{item.label}</span>
                      <span style={{ color:T.pink, fontWeight:600, fontFamily:'monospace', fontSize:'11px' }}>{item.cost}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Proyectos recientes */}
            {projects.length > 0 && (
              <div>
                <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', color:'#9B7EC8', marginBottom:'12px' }}>
                  Proyectos recientes
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {projects.slice(0,5).map(p => {
                    const modeInfo = MODES.find(m => m.id === p.mode);
                    return (
                      <button key={p.id}
                        onClick={() => { setSelectedProject(p.id); setCurrentScreen('mixer'); }}
                        style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:'12px', padding:'14px 18px', display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', width:'100%', textAlign:'left', fontFamily:'inherit', transition:'border-color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor='rgba(192,38,211,0.35)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor=T.border)}>
                        <span style={{ fontSize:'20px' }}>{modeInfo?.icon || '🎵'}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'14px', fontWeight:600, color:T.text }}>{p.name}</div>
                          <div style={{ fontSize:'12px', color:'#9B7EC8', marginTop:'2px' }}>
                            {p.stems} stems · {p.createdAt.toLocaleDateString('es-CO')}
                          </div>
                        </div>
                        <span style={{ color:'#9B7EC8', fontSize:'18px' }}>›</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upgrade modal */}
      {showUpgradeHint && (
        <div style={{ position:'fixed', inset:0, background:'rgba(8,4,16,0.9)', backdropFilter:'blur(12px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ background:'linear-gradient(135deg,rgba(36,18,58,0.99),rgba(20,10,36,0.99))', border:'1px solid rgba(192,38,211,0.4)', borderRadius:'24px', padding:'36px 32px', maxWidth:'420px', width:'100%', textAlign:'center', boxShadow:'0 0 60px rgba(192,38,211,0.3)' }}>
            <div style={{ fontSize:'36px', marginBottom:'14px' }}>⚡</div>
            <h2 style={{ fontSize:'22px', fontWeight:800, color:T.text, marginBottom:'6px' }}>Sin créditos suficientes</h2>
            <p style={{ fontSize:'14px', color:T.text2, marginBottom:'24px', lineHeight:1.6 }}>
              1,000 créditos por $5.99 · nunca vencen
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <Link to="/billing" onClick={() => setShowUpgradeHint(false)}
                style={{ background:'linear-gradient(135deg,#EC4899,#C026D3)', color:'#fff', padding:'16px', borderRadius:'14px', fontSize:'15px', fontWeight:800, textDecoration:'none', display:'block', boxShadow:'0 0 24px rgba(192,38,211,0.4)' }}>
                🎛️ Obtener 1,000 créditos — $5.99
              </Link>
              <button onClick={() => setShowUpgradeHint(false)}
                style={{ background:'transparent', border:'none', color:T.text3, fontSize:'13px', cursor:'pointer', fontFamily:'inherit', padding:'8px' }}>
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
