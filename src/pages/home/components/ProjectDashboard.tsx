import { useState, useEffect } from 'react';
import Header from '@/components/feature/Header';
import MixEditor from './MixEditor';
import NewProjectScreen from './NewProjectScreen';
import PresetScreen from './PresetScreen';
import type { MixPreset } from './mixTypes';
import { PRESETS } from './mixTypes';
import AIChat from './AIChat';
import { useNavigate, Link } from 'react-router-dom';
import MasteringPage from '../../mastering/page';
import { encodeWav24 } from '../../mastering/wav24';
import './dashboard-v3.css';
import { recommendPresetFromFiles } from './presetRecommendation';

interface User {
  id: string; firstName: string; lastName: string; email: string;
  country: string; credits: number; provider?: string; createdAt: string;
  username?: string; avatar?: string;
}
interface Project {
  id: string; name: string; stems: number;
  status: 'draft'|'processing'|'complete'; createdAt: Date; genre?: string;
}
interface ExportData {
  audioBuffer: AudioBuffer; audioUrl: string; waveformPeaks: Float32Array;
  finalLufs: number; mp3Url?: string; wavUrl?: string;
}

type Screen = 'dashboard'|'chat'|'newProject'|'preset'|'mixer'|'mastering';

export default function ProjectDashboard() {
  const [user, setUser] = useState<User|null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [selectedProject, setSelectedProject] = useState<string|null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<MixPreset>(PRESETS[0]);
  const [recommendedPresetId, setRecommendedPresetId] = useState('pop');
  const [reverbOn, setReverbOn] = useState(false);
  const [delayOn, setDelayOn] = useState(false);
  const [stereoOn, setStereoOn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('audioMixerUser');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (!u.username) u.username = `${u.firstName.toLowerCase()}_${u.lastName.toLowerCase()}`;
        setUser(u);
      } catch { localStorage.removeItem('audioMixerUser'); }
    }
  }, []);

  const handleCreditsUpdate = (n: number) => {
    if (!user) return;
    const u = {...user, credits:n};
    setUser(u); localStorage.setItem('audioMixerUser', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null); localStorage.removeItem('audioMixerUser'); localStorage.removeItem('rememberUser');
    setCurrentScreen('dashboard'); navigate('/');
  };

  const handleUploadComplete = (files: File[]) => {
    if (!user) return;
    const proj: Project = { id:Date.now().toString(), name:`Proyecto ${projects.length+1}`, stems:files.length, status:'draft', createdAt:new Date() };
    setProjects(prev => [proj,...prev]);
    setSelectedProject(proj.id);
    setUploadedFiles(files);
    setRecommendedPresetId(recommendPresetFromFiles(files).preset.id);
    setCurrentScreen('preset'); // ← va a presets primero
  };

  // Handler del chat AI — recibe preset y files directo
  const handleChatStartMixer = (preset: MixPreset, files: File[]) => {
    const proj: Project = { id:Date.now().toString(), name:`Proyecto ${projects.length+1}`, stems:files.length, status:'draft', createdAt:new Date() };
    setProjects(prev => [proj,...prev]);
    setSelectedProject(proj.id);
    setUploadedFiles(files);
    setSelectedPreset(preset);
    setReverbOn(preset.reverbWet > 0);
    setDelayOn(preset.delayWet > 0);
    setStereoOn(preset.stereoWidth > 0.5);
    setCurrentScreen('mixer');
  };

  const handlePresetConfirm = (preset: MixPreset, rv: boolean, dl: boolean, st: boolean) => {
    setSelectedPreset(preset); setReverbOn(rv); setDelayOn(dl); setStereoOn(st);
    setCurrentScreen('mixer');
  };

  const handleExport = (data: ExportData) => {
    const wav = encodeWav24(data.audioBuffer);
    const generatedMix = new File([wav], 'mezcla-v3-mixingmusic.wav', { type:'audio/wav' });
    navigate('/mastering', { state: { file: generatedMix, fromMix: true } });
  };

  const handleBackToDashboard = () => {
    setCurrentScreen('dashboard'); setSelectedProject(null); setUploadedFiles([]);
  };

  // PANTALLA: Chat AI — pantalla principal para usuarios logueados
  if (currentScreen === 'mastering' && user)
    return <MasteringPage onExit={() => setCurrentScreen('dashboard')} />;

  // PANTALLA: Chat AI — pantalla principal para usuarios logueados
  if (currentScreen === 'chat' && user)
    return <AIChat user={user} onStartMixer={handleChatStartMixer} onStartMastering={(file) => navigate('/mastering', { state: { file } })} onCreditsUpdate={handleCreditsUpdate} />;

  // PANTALLA: Nuevo proyecto
  if (currentScreen === 'newProject' && user)
    return <NewProjectScreen user={user} onBack={() => setCurrentScreen('dashboard')} onUploadComplete={handleUploadComplete} hasUnlimitedCredits={true} />;

  // PANTALLA: Presets — NUEVA
  if (currentScreen === 'preset' && user)
    return <PresetScreen user={user} stemCount={uploadedFiles.length} recommendedPresetId={recommendedPresetId} onBack={() => setCurrentScreen('newProject')} onConfirm={handlePresetConfirm} />;

  // PANTALLA: Mezclador
  if (currentScreen === 'mixer' && selectedProject && user)
    return <MixEditor
      projectId={selectedProject} user={user} uploadedFiles={uploadedFiles}
      onBack={handleBackToDashboard} onCreditsUpdate={handleCreditsUpdate} onExport={handleExport}
      initialPreset={selectedPreset} reverbOn={reverbOn} delayOn={delayOn} stereoOn={stereoOn}
    />;

  // PANTALLA: Dashboard principal
  const S = {
    page: {minHeight:'100vh',background:'transparent',fontFamily:"'DM Sans',system-ui,sans-serif",color:'#F8F0FF'},
    card: {background:'rgba(26,16,40,0.82)',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'16px',padding:'20px'},
  };

  return (
    <div className="studio-v3-page" style={S.page}>
      <Header user={user} onLogout={handleLogout} onCreditsUpdate={handleCreditsUpdate} />
      <div className="dash-v3-shell">
        {!user ? (
          <div style={{textAlign:'center',paddingTop:'60px'}}>
            <h1 style={{fontSize:'40px',fontWeight:700,letterSpacing:'-1px',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:'12px'}}>
              MixingMusic.AI
            </h1>
            <p style={{color:'#9B7EC8',fontSize:'16px',marginBottom:'32px'}}>Mezcla profesional con inteligencia artificial</p>
            <div style={{display:'flex',flexDirection:'column',gap:'12px',maxWidth:'320px',margin:'0 auto'}}>
              <Link to="/auth/register" style={{background:'linear-gradient(135deg,#EC4899,#C026D3)',color:'#fff',padding:'14px',borderRadius:'980px',fontSize:'15px',fontWeight:600,textDecoration:'none',textAlign:'center',boxShadow:'0 0 24px rgba(192,38,211,0.4)'}}>
                Comenzar Gratis — Sin límites
              </Link>
              <Link to="/auth/login" style={{background:'transparent',border:'1px solid rgba(192,38,211,0.25)',color:'#9B7EC8',padding:'13px',borderRadius:'980px',fontSize:'14px',textDecoration:'none',textAlign:'center'}}>
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        ) : (
          <div className="dash-v3">
            <div className="dash-v3-heading">
              <span>TU ESTUDIO V3</span>
              <h1>Hola, {user.firstName}. ¿Qué quieres crear?</h1>
              <p>{(user.is_pro || user.plan === 'unlimited') ? 'Unlimited activo · mezclas, masters y álbumes sin límite.' : 'Plan Gratis · 3 mezclas desde stems + 1 master descargable en MP3.'}</p>
            </div>

            <div className="dash-v3-grid">
              <button className="dash-v3-card mix" onClick={() => setCurrentScreen('newProject')}>
                <i>≋</i><span>CREAR UNA MEZCLA</span><h2>Subir stems</h2><p>Voz, batería, bajo, guitarras y demás pistas separadas.</p><b>Hasta 12 stems <em>→</em></b>
              </button>
              <button className="dash-v3-card master" onClick={() => setCurrentScreen('mastering')}>
                <i>◇</i><span>MASTERIZAR</span><h2>Subir premezcla</h2><p>Mejora claridad, fuerza, amplitud, dinámica y loudness.</p><b>Mezcla estéreo <em>→</em></b>
              </button>
              <button className="dash-v3-card album" onClick={() => navigate('/mastering/album')}>
                <i>▦</i><span>MODO ÁLBUM</span><h2>Masterizar álbum</h2><p>Hasta 12 canciones con identidad sonora coherente.</p><b>Solo Unlimited <em>→</em></b>
              </button>
            </div>

            <button className="dash-v3-mix-assistant" onClick={() => setCurrentScreen('chat')}>
              <span className="dash-v3-ai-icon">✦</span><div><strong>¿No sabes por dónde empezar? Habla con Mix</strong><small>Tu asistente de producción te guía para mezclar o masterizar.</small></div><i>→</i>
            </button>

            {/* Proyectos recientes */}
            {projects.length > 0 && (
              <div className="dash-v3-recent">
                <div style={{fontSize:'11px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',color:'#9B7EC8',marginBottom:'12px'}}>Proyectos recientes</div>
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {projects.slice(0,3).map(p => (
                    <button key={p.id} onClick={() => { setSelectedProject(p.id); setCurrentScreen('mixer'); }}
                      style={{...S.card,display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',border:'1px solid rgba(192,38,211,0.1)',background:'rgba(26,16,40,0.82)',width:'100%',textAlign:'left'}}>
                      <div>
                        <div style={{fontSize:'14px',fontWeight:600,color:'#F8F0FF'}}>{p.name}</div>
                        <div style={{fontSize:'12px',color:'#9B7EC8',marginTop:'2px'}}>{p.stems} stems · {p.createdAt.toLocaleDateString()}</div>
                      </div>
                      <i className="ri-arrow-right-s-line" style={{color:'#9B7EC8',fontSize:'18px'}}></i>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Upload Area con el nuevo tema
function UploadArea({ onUploadComplete }: { onUploadComplete: (f: File[]) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const processFiles = async (files: File[]) => {
    setError('');
    const audio = files.filter(f => {
      const ok = f.type.startsWith('audio/') || /\.(wav|mp3|flac|aac|m4a)$/i.test(f.name);
      return ok && f.size <= 300*1024*1024;
    });
    if (!audio.length) { setError('Selecciona archivos de audio válidos (WAV, MP3, FLAC, AAC, M4A)'); return; }
    if (audio.length > 12) { setError('Máximo 12 stems por proyecto'); return; }
    setIsUploading(true); setProgress(0);
    const iv = setInterval(() => setProgress(p => p >= 90 ? (clearInterval(iv),p) : p + Math.random()*10+5), 200);
    setTimeout(() => { clearInterval(iv); setProgress(100); setTimeout(() => onUploadComplete(audio), 500); }, 2000 + Math.random()*1500);
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); processFiles(Array.from(e.dataTransfer.files)); };

  if (isUploading) return (
    <div style={{background:'rgba(26,16,40,0.82)',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'20px',padding:'40px 24px',textAlign:'center'}}>
      <div style={{width:'56px',height:'56px',margin:'0 auto 16px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'16px',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 24px rgba(192,38,211,0.5)'}}>
        <i className="ri-upload-cloud-line" style={{color:'#fff',fontSize:'22px'}}></i>
      </div>
      <h3 style={{fontSize:'18px',fontWeight:600,color:'#F8F0FF',marginBottom:'6px'}}>Subiendo stems...</h3>
      <p style={{color:'#9B7EC8',fontSize:'13px',marginBottom:'20px'}}>Procesando archivos de audio</p>
      <div style={{background:'#241636',borderRadius:'8px',height:'6px',overflow:'hidden',marginBottom:'8px'}}>
        <div style={{height:'100%',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'8px',width:`${progress}%`,transition:'width 0.3s'}}></div>
      </div>
      <div style={{fontFamily:"'DM Mono',monospace",color:'#C026D3',fontWeight:600,fontSize:'14px'}}>{Math.round(progress)}%</div>
    </div>
  );

  return (
    <>
      <input type="file" multiple accept="audio/*,.wav,.mp3,.flac,.aac,.m4a" onChange={e => { if(e.target.files) processFiles(Array.from(e.target.files)); e.target.value=''; }} id="file-upload" style={{display:'none'}} />
      <div
        style={{background:isDragging?'rgba(192,38,211,0.05)':'#1A1028',border:`2px dashed ${isDragging?'#C026D3':'rgba(192,38,211,0.25)'}`,borderRadius:'20px',padding:'48px 24px',textAlign:'center',cursor:'pointer',transition:'all 0.2s'} as any}
        onDragOver={e=>{e.preventDefault();setIsDragging(true)}} onDragLeave={e=>{e.preventDefault();setIsDragging(false)}}
        onDrop={handleDrop} onClick={() => document.getElementById('file-upload')?.click()}>
        <div style={{width:'60px',height:'60px',margin:'0 auto 16px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'16px',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 24px rgba(192,38,211,0.4)'}}>
          <i className="ri-upload-cloud-2-line" style={{color:'#fff',fontSize:'24px'}}></i>
        </div>
        <h2 style={{fontSize:'22px',fontWeight:600,color:'#F8F0FF',marginBottom:'8px'}}>Subir Stems</h2>
        <p style={{color:'#9B7EC8',fontSize:'14px',marginBottom:'16px'}}>Arrastra tus archivos aquí o haz clic para seleccionar</p>
        <div style={{fontSize:'12px',color:'rgba(155,126,200,0.6)'}}>WAV, MP3, FLAC, AAC, M4A · Hasta 300MB · Máximo 12 stems</div>
      </div>
      {error && (
        <div style={{marginTop:'12px',background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:'10px',padding:'12px 16px',display:'flex',alignItems:'center',gap:'8px'}}>
          <i className="ri-error-warning-line" style={{color:'#f87171',fontSize:'16px'}}></i>
          <span style={{color:'#f87171',fontSize:'13px'}}>{error}</span>
        </div>
      )}
    </>
  );
}
