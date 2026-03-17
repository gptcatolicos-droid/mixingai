import { useState, useCallback } from 'react';
import Header from '@/components/feature/Header';

interface User {
  id: string; firstName: string; lastName: string; email: string;
  country: string; credits: number; provider?: string; createdAt: string;
  username?: string; avatar?: string;
}
interface NewProjectScreenProps {
  user: User; onBack: () => void;
  onUploadComplete: (files: File[]) => void;
  hasUnlimitedCredits: boolean;
}
interface FileUpload {
  file: File; progress: number;
  status: 'pending'|'uploading'|'complete'|'error'; id: string;
}

const S = {
  page: {minHeight:'100vh',background:'#0F0A1A',fontFamily:"'DM Sans',system-ui,sans-serif",color:'#F8F0FF',position:'relative' as const,overflow:'hidden'},
  card: {background:'#1A1028',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'16px',padding:'16px'},
  label: {fontSize:'10px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8',marginBottom:'10px',display:'block'},
  glowBtn: (disabled=false) => ({background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'12px 28px',borderRadius:'980px',fontSize:'14px',fontWeight:600,cursor:disabled?'not-allowed':'pointer',boxShadow:'0 0 20px rgba(192,38,211,0.4)',fontFamily:'inherit',opacity:disabled?0.4:1,display:'inline-flex',alignItems:'center',gap:'8px',width:'100%',justifyContent:'center'}),
  ghostBtn: {background:'transparent',border:'1px solid rgba(192,38,211,0.25)',color:'#9B7EC8',padding:'10px 20px',borderRadius:'980px',fontSize:'13px',cursor:'pointer',fontFamily:'inherit'},
  progressBar: (pct:number) => ({height:'100%',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'8px',width:`${Math.min(pct,100)}%`,transition:'width 0.3s'}),
};

export default function NewProjectScreen({ user, onBack, onUploadComplete, hasUnlimitedCredits }: NewProjectScreenProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState('');

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); processFiles(Array.from(e.dataTransfer.files)); }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { processFiles(Array.from(e.target.files)); e.target.value = ''; }
  }, []);

  const processFiles = (newFiles: File[]) => {
    setError('');
    const audio = newFiles.filter(f => {
      const ok = f.type.startsWith('audio/') || /\.(wav|mp3|flac|aac|m4a)$/i.test(f.name);
      return ok && f.size <= 300*1024*1024;
    });
    if (!audio.length) { setError('Selecciona archivos de audio válidos (WAV, MP3, FLAC, AAC, M4A)'); return; }
    if (files.length + audio.length > 12) { setError('Máximo 12 stems por proyecto'); return; }
    const uploads: FileUpload[] = audio.map(f => ({ file:f, progress:0, status:'pending', id:Math.random().toString(36).substr(2,9) }));
    setFiles(prev => [...prev, ...uploads]);
    uploads.forEach(u => simulateUpload(u.id));
  };

  const simulateUpload = (id: string) => {
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random()*15+10;
      if (p >= 100) { clearInterval(iv); setFiles(prev => prev.map(f => f.id===id?{...f,progress:100,status:'complete'}:f)); }
      else { setFiles(prev => prev.map(f => f.id===id?{...f,progress:p,status:'uploading'}:f)); }
    }, 150);
  };

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id!==id));

  const handleContinue = () => {
    const completed = files.filter(f => f.status==='complete').map(f => f.file);
    if (!completed.length) { setError('Espera a que terminen de cargar los archivos'); return; }
    setIsTransitioning(true);
    setTimeout(() => onUploadComplete(completed), 400);
  };

  const completed = files.filter(f => f.status==='complete').length;
  const uploading = files.filter(f => f.status==='uploading').length;
  const canProceed = completed > 0 && uploading === 0;

  return (
    <div style={S.page}>
      <Header user={user} onLogout={() => {}} onCreditsUpdate={() => {}} />

      <div style={{maxWidth:'620px',margin:'0 auto',padding:'32px 16px 60px'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'28px'}}>
          <button onClick={onBack} style={{...S.ghostBtn,padding:'8px 14px',fontSize:'12px'}}>← Volver</button>
          <div>
            <h1 style={{fontSize:'22px',fontWeight:700,letterSpacing:'-0.5px',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
              Nuevo Proyecto
            </h1>
            <p style={{fontSize:'12px',color:'#9B7EC8',marginTop:'2px'}}>Sube tus stems para comenzar</p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          style={{background:isDragging?'rgba(192,38,211,0.06)':'#1A1028',border:`2px dashed ${isDragging?'#C026D3':'rgba(192,38,211,0.25)'}`,borderRadius:'20px',padding:'44px 24px',textAlign:'center',cursor:'pointer',transition:'all 0.2s',marginBottom:'16px'}}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          onClick={() => document.getElementById('np-file-input')?.click()}>
          <input type="file" multiple accept="audio/*,.wav,.mp3,.flac,.aac,.m4a" onChange={handleFileSelect} id="np-file-input" style={{display:'none'}} />
          <div style={{width:'56px',height:'56px',margin:'0 auto 14px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'16px',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 24px rgba(192,38,211,0.4)'}}>
            <i className="ri-upload-cloud-2-line" style={{color:'#fff',fontSize:'22px'}}></i>
          </div>
          <h2 style={{fontSize:'20px',fontWeight:600,color:'#F8F0FF',marginBottom:'8px'}}>
            {isDragging ? 'Suelta aquí tus stems' : 'Arrastra tus stems aquí'}
          </h2>
          <p style={{fontSize:'13px',color:'#9B7EC8',marginBottom:'16px'}}>o haz clic para explorar archivos</p>
          <div style={{display:'flex',justifyContent:'center',gap:'8px',flexWrap:'wrap'}}>
            {['WAV','MP3','FLAC','AAC','M4A'].map(f => (
              <span key={f} style={{fontSize:'11px',fontWeight:600,padding:'3px 10px',borderRadius:'980px',background:'rgba(192,38,211,0.08)',border:'1px solid rgba(192,38,211,0.2)',color:'#C026D3'}}>{f}</span>
            ))}
          </div>
          <p style={{fontSize:'11px',color:'rgba(155,126,200,0.5)',marginTop:'10px'}}>Hasta 300MB por archivo · Máximo 12 stems</p>
        </div>

        {/* Lista de archivos */}
        {files.length > 0 && (
          <div style={{...S.card,marginBottom:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <span style={S.label}>Stems ({files.length})</span>
              {completed > 0 && (
                <span style={{fontSize:'12px',color:'#4ade80',fontWeight:600}}>✓ {completed} listo{completed>1?'s':''}</span>
              )}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px',maxHeight:'280px',overflowY:'auto'}}>
              {files.map(upload => (
                <div key={upload.id} style={{background:'#0F0A1A',borderRadius:'10px',padding:'10px 12px',display:'flex',alignItems:'center',gap:'10px',border:'1px solid rgba(192,38,211,0.08)'}}>
                  <div style={{width:'32px',height:'32px',background:'rgba(192,38,211,0.1)',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <i className="ri-music-2-line" style={{color:'#C026D3',fontSize:'14px'}}></i>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'12px',fontWeight:600,color:'#F8F0FF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{upload.file.name}</div>
                    <div style={{fontSize:'11px',color:'#9B7EC8'}}>{(upload.file.size/1024/1024).toFixed(1)} MB</div>
                    {upload.status==='uploading' && (
                      <div style={{background:'#241636',borderRadius:'4px',height:'3px',overflow:'hidden',marginTop:'5px'}}>
                        <div style={S.progressBar(upload.progress)}></div>
                      </div>
                    )}
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
                    {upload.status==='complete' && (
                      <div style={{width:'22px',height:'22px',background:'rgba(74,222,128,0.15)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(74,222,128,0.3)'}}>
                        <i className="ri-check-line" style={{color:'#4ade80',fontSize:'11px'}}></i>
                      </div>
                    )}
                    {upload.status==='uploading' && (
                      <div style={{width:'22px',height:'22px',background:'rgba(192,38,211,0.1)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <i className="ri-loader-4-line" style={{color:'#C026D3',fontSize:'11px',animation:'spin 1s linear infinite'}}></i>
                      </div>
                    )}
                    <button onClick={() => removeFile(upload.id)} style={{width:'22px',height:'22px',background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <i className="ri-close-line" style={{color:'#f87171',fontSize:'11px'}}></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:'10px',padding:'12px 16px',display:'flex',alignItems:'center',gap:'8px',marginBottom:'14px'}}>
            <i className="ri-error-warning-line" style={{color:'#f87171',fontSize:'16px'}}></i>
            <span style={{fontSize:'13px',color:'#f87171'}}>{error}</span>
          </div>
        )}

        {/* Botón continuar */}
        {files.length > 0 && (
          <button onClick={handleContinue} disabled={!canProceed||isTransitioning} style={S.glowBtn(!canProceed||isTransitioning)}>
            {uploading > 0 ? `Subiendo ${uploading} archivo${uploading>1?'s':`...`}` : isTransitioning ? 'Preparando...' : `✦ Elegir Estilo de Mezcla (${completed} stem${completed>1?'s':''})`}
          </button>
        )}

        {/* Info */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginTop:'20px'}}>
          {[{icon:'ri-shield-check-line',text:'Hasta 12 stems'},{icon:'ri-timer-line',text:'Mezcla en minutos'},{icon:'ri-download-line',text:'WAV 24bit / MP3'}].map(i => (
            <div key={i.text} style={{background:'rgba(192,38,211,0.04)',borderRadius:'10px',padding:'10px',textAlign:'center',border:'1px solid rgba(192,38,211,0.08)'}}>
              <i className={i.icon} style={{color:'#9B7EC8',fontSize:'16px',display:'block',marginBottom:'4px'}}></i>
              <span style={{fontSize:'11px',color:'#9B7EC8'}}>{i.text}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
