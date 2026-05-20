import { useState, useCallback } from 'react';
import CreditsPurchaseModal from './CreditsPurchaseModal';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (files: File[]) => void;
  userCredits: number;
  onCreditsUpdate: (newCredits: number) => void;
}

interface FileUpload {
  file: File; progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  id: string;
}

const S = {
  overlay: {position:'fixed' as const,inset:0,background:'rgba(15,10,26,0.92)',backdropFilter:'blur(12px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'},
  modal: {background:'#1A1028',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'24px',padding:'28px',maxWidth:'560px',width:'100%',maxHeight:'90vh',overflowY:'auto' as const},
  label: {fontSize:'10px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8'},
  mono: {fontFamily:"'DM Mono',monospace"},
  glowBtn: {background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'12px 24px',borderRadius:'980px',fontSize:'13px',fontWeight:600,cursor:'pointer',boxShadow:'0 0 20px rgba(192,38,211,0.4)',fontFamily:'inherit'},
  ghostBtn: {background:'transparent',border:'1px solid rgba(192,38,211,0.25)',color:'#9B7EC8',padding:'12px 20px',borderRadius:'980px',fontSize:'13px',cursor:'pointer',fontFamily:'inherit'},
  surface2: {background:'#241636',border:'1px solid rgba(192,38,211,0.1)',borderRadius:'12px',padding:'14px'},
  progressTrack: {background:'#0F0A1A',borderRadius:'8px',height:'4px',overflow:'hidden' as const,marginTop:'6px'},
};

export default function UploadModal({ isOpen, onClose, onUploadComplete, userCredits, onCreditsUpdate }: UploadModalProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  }, []);

  const processFiles = (newFiles: File[]) => {
    const audioFiles = newFiles.filter(f => f.type.startsWith('audio/') && f.size <= 300*1024*1024);
    if (files.length + audioFiles.length > 12) { alert('Máximo 12 stems'); return; }
    const uploads: FileUpload[] = audioFiles.map(f => ({ file:f, progress:0, status:'pending', id:Math.random().toString(36).substr(2,9) }));
    setFiles(prev => [...prev, ...uploads]);
    uploads.forEach(u => simulateUpload(u.id));
  };

  const simulateUpload = (id: string) => {
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 100) {
        clearInterval(iv);
        setFiles(prev => prev.map(f => f.id===id ? {...f,progress:100,status:'complete'} : f));
      } else {
        setFiles(prev => prev.map(f => f.id===id ? {...f,progress:p,status:'uploading'} : f));
      }
    }, 200);
  };

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));
  const getCredits = (n: number) => n <= 5 ? 100 : 500;
  const completedCount = files.filter(f => f.status === 'complete').length;
  const creditsNeeded = completedCount > 0 ? getCredits(completedCount) : 0;
  const canProceed = completedCount > 0 && userCredits >= creditsNeeded;

  const handleUpload = () => {
    if (userCredits < creditsNeeded) { setShowPurchaseModal(true); return; }
    onUploadComplete(files.filter(f => f.status === 'complete').map(f => f.file));
    setFiles([]); onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={S.overlay} onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
        <div style={S.modal}>

          {/* Header */}
          <div style={{textAlign:'center',marginBottom:'24px'}}>
            <div style={{width:'60px',height:'60px',margin:'0 auto 16px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'18px',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 28px rgba(192,38,211,0.5)'}}>
              <i className="ri-music-2-line" style={{color:'#fff',fontSize:'24px'}}></i>
            </div>
            <h2 style={{fontSize:'22px',fontWeight:600,color:'#F8F0FF',letterSpacing:'-0.5px',marginBottom:'6px'}}>Agregar Stems</h2>
            <p style={{fontSize:'13px',color:'#9B7EC8'}}>Hasta 12 stems totales · WAV, MP3, FLAC, AAC, M4A</p>
          </div>

          {/* Créditos */}
          <div style={{...S.surface2,display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <div style={{width:'36px',height:'36px',background:'linear-gradient(135deg,#EC4899,#C026D3)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="ri-coin-line" style={{color:'#fff',fontSize:'16px'}}></i>
              </div>
              <div>
                <div style={{fontSize:'12px',color:'#9B7EC8'}}>Créditos disponibles</div>
                <div style={{...S.mono,fontSize:'16px',fontWeight:600,background:'linear-gradient(90deg,#EC4899,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{userCredits.toLocaleString()}</div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',textAlign:'center'}}>
              <div style={{background:'rgba(192,38,211,0.08)',borderRadius:'8px',padding:'6px 10px'}}>
                <div style={{...S.mono,fontSize:'13px',color:'#C026D3',fontWeight:600}}>100</div>
                <div style={{fontSize:'10px',color:'#9B7EC8',marginTop:'1px'}}>1–5 stems</div>
              </div>
              <div style={{background:'rgba(124,58,237,0.08)',borderRadius:'8px',padding:'6px 10px'}}>
                <div style={{...S.mono,fontSize:'13px',color:'#7C3AED',fontWeight:600}}>500</div>
                <div style={{fontSize:'10px',color:'#9B7EC8',marginTop:'1px'}}>6+ stems</div>
              </div>
            </div>
          </div>

          {/* Drop zone */}
          <div
            style={{border:`2px dashed ${isDragging?'#C026D3':'rgba(192,38,211,0.25)'}`,borderRadius:'16px',padding:'32px 20px',textAlign:'center',background:isDragging?'rgba(192,38,211,0.06)':'transparent',transition:'all 0.2s',marginBottom:'16px',cursor:'pointer'}}
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            onClick={() => document.getElementById('stem-file-input')?.click()}
          >
            <div style={{width:'52px',height:'52px',margin:'0 auto 14px',background:'linear-gradient(135deg,#EC4899,#7C3AED)',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 20px rgba(192,38,211,0.3)'}}>
              <i className="ri-upload-cloud-2-line" style={{color:'#fff',fontSize:'22px'}}></i>
            </div>
            <p style={{fontSize:'16px',fontWeight:600,color:'#F8F0FF',marginBottom:'6px'}}>Arrastra tus stems aquí</p>
            <p style={{fontSize:'13px',color:'#9B7EC8',marginBottom:'14px'}}>o haz clic para explorar archivos</p>
            <span style={{background:'rgba(192,38,211,0.1)',border:'1px solid rgba(192,38,211,0.3)',color:'#C026D3',padding:'7px 18px',borderRadius:'980px',fontSize:'12px',fontWeight:600}}>
              Explorar Archivos
            </span>
            <input type="file" multiple accept="audio/*" onChange={handleFileSelect} id="stem-file-input" style={{display:'none'}} />
          </div>

          {/* Lista de archivos */}
          {files.length > 0 && (
            <div style={{marginBottom:'20px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                <span style={{...S.label}}>Stems ({files.length})</span>
                {completedCount > 0 && (
                  <span style={{...S.mono,fontSize:'12px',color: userCredits >= creditsNeeded ? '#C026D3' : '#f87171',fontWeight:600}}>
                    {creditsNeeded} créditos
                  </span>
                )}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'8px',maxHeight:'200px',overflowY:'auto'}}>
                {files.map(upload => (
                  <div key={upload.id} style={{...S.surface2,display:'flex',alignItems:'center',gap:'10px',padding:'10px 14px'}}>
                    <div style={{width:'32px',height:'32px',background:'rgba(192,38,211,0.1)',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <i className="ri-music-2-line" style={{color:'#C026D3',fontSize:'14px'}}></i>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'12px',fontWeight:600,color:'#F8F0FF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{upload.file.name}</div>
                      <div style={{fontSize:'11px',color:'#9B7EC8'}}>{(upload.file.size/1024/1024).toFixed(1)} MB</div>
                      {upload.status === 'uploading' && (
                        <div style={S.progressTrack}>
                          <div style={{height:'100%',background:'linear-gradient(90deg,#EC4899,#7C3AED)',borderRadius:'8px',width:`${upload.progress}%`,transition:'width 0.2s'}}></div>
                        </div>
                      )}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
                      {upload.status === 'complete' && (
                        <div style={{width:'22px',height:'22px',background:'rgba(74,222,128,0.15)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid rgba(74,222,128,0.3)'}}>
                          <i className="ri-check-line" style={{color:'#4ade80',fontSize:'11px'}}></i>
                        </div>
                      )}
                      {upload.status === 'uploading' && (
                        <div style={{width:'22px',height:'22px',background:'rgba(192,38,211,0.15)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <i className="ri-loader-4-line ri-spin" style={{color:'#C026D3',fontSize:'11px'}}></i>
                        </div>
                      )}
                      <button onClick={() => removeFile(upload.id)} style={{width:'22px',height:'22px',background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <i className="ri-close-line" style={{color:'#f87171',fontSize:'11px'}}></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones */}
          <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
            <button onClick={onClose} style={S.ghostBtn}>Cancelar</button>
            <button onClick={handleUpload} disabled={!canProceed}
              style={{...S.glowBtn,opacity:canProceed?1:0.4,cursor:canProceed?'pointer':'not-allowed'}}>
              {!canProceed && completedCount > 0 && userCredits < creditsNeeded
                ? 'Sin créditos'
                : `Agregar ${completedCount} stem${completedCount!==1?'s':''}`}
            </button>
          </div>
        </div>
      </div>

      <CreditsPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        onPurchaseSuccess={(credits) => { onCreditsUpdate(userCredits + credits); setShowPurchaseModal(false); }}
        currentCredits={userCredits}
      />
    </>
  );
}
