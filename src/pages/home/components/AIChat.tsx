import { useState, useRef, useEffect } from 'react';
import { MixPreset, PRESETS } from './PresetScreen';

interface User { id: string; firstName: string; lastName: string; email: string; country: string; credits: number; provider?: string; createdAt: string; username?: string; avatar?: string; }
interface Message { id: string; role: 'ai'|'user'; text: string; bold?: {word: string; color: string}[]; presets?: MixPreset[]; stems?: File[]; showUploadCard?: boolean; showProgress?: boolean; showMixerBtn?: boolean; }
interface AIChatProps { user?: User|null; onStartMixer: (preset: MixPreset, files: File[]) => void; onCreditsUpdate?: (n: number) => void; }

const SLIDER_ICON = (size=18) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <rect x="2" y="5" width="2" height="10" rx="1" fill="white" opacity="0.5"/>
    <rect x="1" y="8" width="4" height="4" rx="2" fill="white"/>
    <rect x="9" y="3" width="2" height="14" rx="1" fill="white" opacity="0.5"/>
    <rect x="8" y="5" width="4" height="4" rx="2" fill="white"/>
    <rect x="16" y="5" width="2" height="10" rx="1" fill="white" opacity="0.5"/>
    <rect x="15" y="11" width="4" height="4" rx="2" fill="white"/>
  </svg>
);

const getAIResponse = (msg: string, preset: MixPreset|null, stemsLoaded: boolean) => {
  const m = msg.toLowerCase();
  if (stemsLoaded) return { text: `✅ ¡Pistas cargadas! Aplicando **${preset?.name || 'preset'}** ahora mismo 🔥`, showMixerBtn: true };
  const map = [
    { keys:['gospel','cristiano','catolic','iglesia','coro','worship','alabanza'], id:'gospel' },
    { keys:['reggaeton','urbano','dembow','bad bunny','maluma','perreo'], id:'reggaeton' },
    { keys:['pop','radio','comercial','taylor','ariana','brillante'], id:'pop' },
    { keys:['rock','guitarra electrica','distorsion','metal','punk'], id:'rock' },
    { keys:['hip hop','rap','trap','808','freestyle','drill'], id:'hiphop' },
    { keys:['dance','edm','electronica','club','house','techno'], id:'dance' },
    { keys:['balada','romantica','bolero','amor','lento'], id:'balada' },
    { keys:['acustico','acústico','guitarra','folk','unplugged','natural'], id:'acustico' },
    { keys:['clasica','clasico','orquesta','piano','instrumental'], id:'clasica' },
  ];
  let found: MixPreset|null = null;
  for (const m2 of map) { if (m2.keys.some(k => m.includes(k))) { found = PRESETS.find(p => p.id===m2.id)||null; break; } }
  if (found) return {
    text: `¡Perfecto para ese sonido! 🎵 El preset **${found.name}** es exactamente lo que necesitas — ${found.desc}.\n\nAhora **sube tus pistas** para empezar:`,
    presets: [found, ...PRESETS.filter(p=>p.id!==found!.id).slice(0,2)],
    showUploadCard: true,
  };
  if (m.includes('stem') || m.includes('pista') || m.includes('track') || m.includes('archivo'))
    return { text: `Toca la tarjeta de abajo para subir tus pistas 🎶`, showUploadCard: true };
  return { text: `¡Cuéntame más! ¿Qué género es tu canción? Por ejemplo: *"reggaeton estilo Bad Bunny"*, *"gospel de iglesia"*, *"balada romántica"*... 🎛️` };
};

export default function AIChat({ user, onStartMixer }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<MixPreset|null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, isTyping]);

  const renderText = (text: string) => {
    return text.split('\n').map((line, li) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return <span key={li}>{parts.map((p, i) => i%2===1 ? <strong key={i} style={{color:'#EC4899'}}>{p}</strong> : p)}{li<text.split('\n').length-1&&<br/>}</span>;
    });
  };

  const sendMessage = (text?: string) => {
    const msg = (text||input).trim();
    if (!msg||isTyping) return;
    setInput('');
    if (!chatStarted) setChatStarted(true);
    const userMsg: Message = { id:Date.now().toString(), role:'user', text:msg };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);
    setTimeout(() => {
      const res = getAIResponse(msg, selectedPreset, false);
      if (res.presets?.[0] && !selectedPreset) setSelectedPreset(res.presets[0]);
      setMessages(prev => [...prev, { id:(Date.now()+1).toString(), role:'ai', ...res }]);
      setIsTyping(false);
    }, 700 + Math.random()*400);
  };

  const handlePresetSelect = (preset: MixPreset) => {
    setSelectedPreset(preset);
    setMessages(prev => [...prev, {
      id:Date.now().toString(), role:'ai',
      text: `¡Perfecto! **${preset.name}** seleccionado 🎛️\n\nAhora **sube tus pistas** para empezar la mezcla:`,
      showUploadCard: true,
    }]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).filter(f =>
      (f.type.startsWith('audio/')||/\.(wav|mp3|flac|aac|m4a)$/i.test(f.name)) && f.size<=300*1024*1024
    ).slice(0,12);
    if (!files.length) return;
    setUploadedFiles(files);
    const names = files.slice(0,3).map(f=>f.name.replace(/\.[^.]+$/,'')).join(', ');
    setMessages(prev => [...prev, {
      id:Date.now().toString(), role:'user',
      text:`Subí ${files.length} pista${files.length>1?'s':''}: ${names}${files.length>3?'...':''}`,
      stems: files,
    }]);
    // Iniciar progreso de carga
    setIsLoading(true);
    setLoadingProgress(0);
    const preset = selectedPreset || PRESETS[0];
    if (!selectedPreset) setSelectedPreset(preset);
    // Mensaje de carga con progreso
    setMessages(prev => [...prev, {
      id:(Date.now()+1).toString(), role:'ai',
      text:`✅ ¡${files.length} pistas recibidas! Aplicando preset **${preset.name}** 🔥`,
      showProgress: true,
    }]);
    // Animar progreso
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random()*12 + 5;
      if (p >= 100) {
        p = 100;
        clearInterval(iv);
        setLoadingProgress(100);
        setIsLoading(false);
        setTimeout(() => {
          setMessages(prev => prev.map(m => m.showProgress ? {...m, showProgress:false, showMixerBtn:true} : m));
        }, 500);
      } else { setLoadingProgress(Math.min(p, 99)); }
    }, 200);
    e.target.value = '';
  };

  const handleOpenMixer = () => {
    const preset = selectedPreset || PRESETS[0];
    onStartMixer(preset, uploadedFiles);
  };

  // Estilos
  const S = {
    page: {minHeight:'100vh',background:'#0F0A1A',display:'flex',flexDirection:'column' as const,fontFamily:"'Outfit',system-ui,sans-serif",color:'#F8F0FF',position:'relative' as const,overflow:'hidden'},
    nav: {background:'rgba(15,10,26,0.97)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(192,38,211,0.15)',padding:'0 24px',display:'flex',alignItems:'center',height:'56px',flexShrink:0,position:'relative' as const,zIndex:10},
    waves: {position:'absolute' as const,inset:0,overflow:'hidden',pointerEvents:'none' as const,zIndex:0},
    // Estado 1: centrado
    centered: {flex:1,display:'flex',flexDirection:'column' as const,alignItems:'center',justifyContent:'center',padding:'32px 20px',position:'relative' as const,zIndex:1},
    // Estado 2: chat
    chatWrap: {flex:1,display:'flex',flexDirection:'column' as const,maxWidth:'680px',width:'100%',margin:'0 auto',padding:'0 16px',position:'relative' as const,zIndex:1,overflow:'hidden'},
    msgs: {flex:1,overflowY:'auto' as const,padding:'20px 0 12px',display:'flex',flexDirection:'column' as const,gap:'16px'},
    bai: {background:'linear-gradient(135deg,rgba(36,22,54,0.95),rgba(26,16,40,0.98))',border:'1px solid rgba(192,38,211,0.18)',borderRadius:'3px 18px 18px 18px',padding:'14px 18px',maxWidth:'86%',fontSize:'15px',color:'#F8F0FF',lineHeight:1.7,position:'relative' as const,overflow:'hidden'},
    busr: {background:'linear-gradient(135deg,#C026D3,#7C3AED)',borderRadius:'18px 3px 18px 18px',padding:'12px 18px',maxWidth:'74%',fontSize:'15px',color:'#fff',marginLeft:'auto',lineHeight:1.7,boxShadow:'0 4px 18px rgba(192,38,211,0.3)'},
    av: {width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 0 12px rgba(192,38,211,0.35)'},
  };

  const MixerBtn = () => (
    <button onClick={handleOpenMixer} style={{width:'100%',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',border:'none',color:'#fff',padding:'15px 20px',borderRadius:'14px',fontSize:'15px',fontWeight:700,cursor:'pointer',marginTop:'12px',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',boxShadow:'0 0 28px rgba(192,38,211,0.5)',fontFamily:'inherit',animation:'glow 2.5s infinite'}}>
      {SLIDER_ICON(16)}
      ✦ Abrir Mezclador — {selectedPreset?.name || 'Mezclador'}
      <span style={{background:'rgba(255,255,255,0.15)',borderRadius:'980px',padding:'3px 12px',fontSize:'12px'}}>Listo →</span>
    </button>
  );

  const UploadCard = () => (
    <div onClick={() => fileInputRef.current?.click()} style={{background:'linear-gradient(135deg,rgba(236,72,153,0.1),rgba(124,58,237,0.1))',border:'1.5px dashed rgba(192,38,211,0.4)',borderRadius:'16px',padding:'20px',marginTop:'12px',textAlign:'center',cursor:'pointer',transition:'all 0.2s'}}>
      <div style={{width:'48px',height:'48px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',boxShadow:'0 0 20px rgba(192,38,211,0.45)',fontSize:'22px'}}>⬆</div>
      <div style={{fontSize:'17px',fontWeight:700,color:'#F8F0FF',marginBottom:'4px',letterSpacing:'-0.3px'}}>Sube tus Pistas</div>
      <div style={{fontSize:'12px',color:'#9B7EC8',marginBottom:'12px'}}>Arrastra aquí o toca para seleccionar</div>
      <div style={{display:'flex',gap:'5px',justifyContent:'center',flexWrap:'wrap'}}>
        {['WAV','MP3','FLAC','AAC','M4A'].map(f=>(
          <span key={f} style={{fontSize:'10px',fontWeight:700,padding:'3px 9px',borderRadius:'980px',background:'rgba(192,38,211,0.1)',border:'1px solid rgba(192,38,211,0.25)',color:'#C026D3'}}>{f}</span>
        ))}
      </div>
    </div>
  );

  const ProgressCard = () => (
    <div style={{background:'rgba(36,22,54,0.9)',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'12px',padding:'14px 16px',marginTop:'12px'}}>
      <div style={{fontSize:'13px',fontWeight:600,color:'#F8F0FF',marginBottom:'3px',display:'flex',alignItems:'center',gap:'6px'}}>
        {SLIDER_ICON(13)}Cargando al mezclador...
      </div>
      <div style={{fontSize:'11px',color:'#9B7EC8',marginBottom:'10px'}}>Procesando {uploadedFiles.length} pistas de audio</div>
      <div style={{background:'#0F0A1A',borderRadius:'8px',height:'6px',overflow:'hidden',marginBottom:'6px'}}>
        <div style={{height:'100%',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'8px',width:`${loadingProgress}%`,transition:'width 0.3s'}}></div>
      </div>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:'12px',color:'#C026D3',fontWeight:600}}>{Math.round(loadingProgress)}%</div>
    </div>
  );

  return (
    <div style={S.page}>
      {/* Ondas de fondo */}
      <div style={S.waves}>
        {[300,550,800].map((s,i) => (
          <div key={i} style={{position:'absolute',width:`${s}px`,height:`${s}px`,top:'40%',left:'50%',borderRadius:'50%',border:'1px solid rgba(192,38,211,0.05)',animation:'expand 8s infinite',animationDelay:`${i*2.5}s`,transform:'translate(-50%,-50%)'}}></div>
        ))}
      </div>

      {/* Nav */}
      <div style={S.nav}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{width:'32px',height:'32px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'9px',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 12px rgba(192,38,211,0.4)'}}>
            {SLIDER_ICON(16)}
          </div>
          <span style={{fontWeight:700,fontSize:'15px',letterSpacing:'-0.5px',background:'linear-gradient(90deg,#EC4899,#C026D3)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>mixingmusic.ai</span>
        </div>
      </div>

      <input ref={fileInputRef} type="file" multiple accept="audio/*,.wav,.mp3,.flac,.aac,.m4a" onChange={handleFileUpload} style={{display:'none'}} />

      {/* ESTADO 1: Centrado — sin mensajes */}
      {!chatStarted && (
        <div style={S.centered}>
          <div style={{width:'60px',height:'60px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'18px',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',boxShadow:'0 0 28px rgba(192,38,211,0.5)'}}>
            {SLIDER_ICON(28)}
          </div>
          <h1 style={{fontSize:'clamp(22px,5vw,30px)',fontWeight:700,letterSpacing:'-0.8px',textAlign:'center',marginBottom:'10px',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
            ¡Hola! Soy Mix 🎛️
          </h1>
          <p style={{fontSize:'16px',color:'#9B7EC8',textAlign:'center',lineHeight:1.6,marginBottom:'28px',maxWidth:'420px'}}>
            ¿Cómo quieres que suene tu canción? Cuéntame el género, el vibe o los artistas que te inspiran.
          </p>
          <div style={{width:'100%',maxWidth:'560px'}}>
            {/* Input de texto */}
            <div style={{background:'rgba(36,22,54,0.9)',border:'1px solid rgba(192,38,211,0.25)',borderRadius:'16px',padding:'14px 16px',display:'flex',alignItems:'center',gap:'10px',marginBottom:'12px'}}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage()}
                placeholder="Ej: es gospel con coro potente, quiero que suene a catedral..."
                style={{flex:1,background:'none',border:'none',outline:'none',fontSize:'15px',color:'#F8F0FF',fontFamily:'inherit'}} />
              <button onClick={()=>sendMessage()} style={{width:'38px',height:'38px',background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',borderRadius:'10px',cursor:'pointer',color:'#fff',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>↑</button>
            </div>
            {/* Sugerencias de géneros */}
            <div style={{display:'flex',flexWrap:'wrap',gap:'7px',justifyContent:'center',marginBottom:'16px'}}>
              {['Gospel','Reggaeton','Pop','Rock','Balada','Acústico'].map(g=>(
                <button key={g} onClick={()=>sendMessage(`Mi canción es ${g.toLowerCase()}`)}
                  style={{background:'rgba(192,38,211,0.08)',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'980px',padding:'6px 14px',fontSize:'12px',fontWeight:600,color:'#C026D3',cursor:'pointer',fontFamily:'inherit'}}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ESTADO 2: Chat activo */}
      {chatStarted && (
        <div style={S.chatWrap}>
          <div style={S.msgs}>
            {/* Mensaje inicial de Mix */}
            <div style={{display:'flex',gap:'10px',alignItems:'flex-start'}}>
              <div style={S.av}>{SLIDER_ICON(16)}</div>
              <div style={S.bai}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:'1px',background:'linear-gradient(90deg,transparent,rgba(236,72,153,0.5),rgba(124,58,237,0.4),transparent)'}}></div>
                ¡Hola! 👋 Soy <strong style={{color:'#EC4899'}}>Mix</strong>, tu asistente de mezcla. ¿Cómo quieres que suene tu canción? 🎵
              </div>
            </div>

            {messages.map(msg => (
              <div key={msg.id}>
                {msg.role==='ai' ? (
                  <div style={{display:'flex',gap:'10px',alignItems:'flex-start'}}>
                    <div style={S.av}>{SLIDER_ICON(16)}</div>
                    <div style={{maxWidth:'86%'}}>
                      <div style={S.bai}>
                        <div style={{position:'absolute',top:0,left:0,right:0,height:'1px',background:'linear-gradient(90deg,transparent,rgba(236,72,153,0.5),rgba(124,58,237,0.4),transparent)'}}></div>
                        {renderText(msg.text)}
                        {/* Chips de presets */}
                        {msg.presets && (
                          <div style={{display:'flex',flexWrap:'wrap',gap:'7px',marginTop:'12px'}}>
                            {msg.presets.map(p=>(
                              <span key={p.id} onClick={()=>handlePresetSelect(p)}
                                style={{background:selectedPreset?.id===p.id?p.color:'rgba(192,38,211,0.08)',border:`1px solid ${selectedPreset?.id===p.id?p.color:'rgba(192,38,211,0.25)'}`,borderRadius:'980px',padding:'6px 14px',fontSize:'12px',fontWeight:600,color:selectedPreset?.id===p.id?'#fff':'#C026D3',cursor:'pointer',transition:'all 0.15s',boxShadow:selectedPreset?.id===p.id?`0 0 10px ${p.color}55`:'none'}}>
                                ✦ {p.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Tarjeta sube tus pistas */}
                        {msg.showUploadCard && !uploadedFiles.length && <UploadCard />}
                        {/* Barra de progreso */}
                        {msg.showProgress && !msg.showMixerBtn && <ProgressCard />}
                        {/* Botón mezclador */}
                        {msg.showMixerBtn && <MixerBtn />}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'6px'}}>
                    <div style={S.busr}>{msg.text}</div>
                    {msg.stems && (
                      <div style={{background:'#1A1028',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'10px',padding:'8px 14px',fontSize:'11px'}}>
                        {msg.stems.slice(0,3).map(f=>(
                          <div key={f.name} style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'2px',color:'#9B7EC8',fontFamily:"'DM Mono',monospace"}}>
                            <div style={{width:'5px',height:'5px',borderRadius:'50%',background:'#4ade80'}}></div>
                            {f.name.replace(/\.[^.]+$/,'')}
                          </div>
                        ))}
                        {msg.stems.length>3 && <div style={{color:'rgba(155,126,200,0.5)',fontFamily:"'DM Mono',monospace"}}>+{msg.stems.length-3} más</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Typing */}
            {isTyping && (
              <div style={{display:'flex',gap:'10px',alignItems:'flex-start'}}>
                <div style={S.av}>{SLIDER_ICON(16)}</div>
                <div style={{...S.bai,display:'flex',gap:'5px',alignItems:'center',padding:'16px 18px'}}>
                  {[0,150,300].map(d=>(
                    <div key={d} style={{width:'7px',height:'7px',borderRadius:'50%',background:'#9B7EC8',animation:'bounce 1s infinite',animationDelay:`${d}ms`}}></div>
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input fijo abajo */}
          <div style={{borderTop:'1px solid rgba(192,38,211,0.1)',padding:'12px 0 24px',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
              <button onClick={()=>fileInputRef.current?.click()}
                style={{width:'48px',height:'48px',background:uploadedFiles.length?'linear-gradient(135deg,#4ade80,#22c55e)':'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',borderRadius:'13px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,boxShadow:uploadedFiles.length?'0 0 14px rgba(74,222,128,0.4)':'0 0 14px rgba(192,38,211,0.4)',fontSize:'20px',color:'#fff',fontWeight:300}}>
                {uploadedFiles.length ? <span style={{fontSize:'13px',fontWeight:700}}>{uploadedFiles.length}</span> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>}
              </button>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendMessage()}
                placeholder={uploadedFiles.length?`${uploadedFiles.length} pistas listas — escribe algo más...`:'Escribe o toca ⬆ para subir pistas...'}
                style={{flex:1,background:'rgba(36,22,54,0.8)',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'13px',padding:'13px 16px',fontSize:'15px',color:'#F8F0FF',outline:'none',fontFamily:'inherit'}} />
              <button onClick={()=>sendMessage()} disabled={!input.trim()||isTyping}
                style={{width:'48px',height:'48px',background:input.trim()?'linear-gradient(135deg,#EC4899,#C026D3)':'#241636',border:'none',borderRadius:'13px',display:'flex',alignItems:'center',justifyContent:'center',cursor:input.trim()?'pointer':'default',color:'#fff',fontSize:'18px',flexShrink:0,opacity:input.trim()?1:0.4}}>
                ↑
              </button>
            </div>
            <div style={{textAlign:'center',marginTop:'8px',fontSize:'11px',color:'rgba(155,126,200,0.4)'}}>
              Toca <strong style={{color:'#C026D3'}}>⬆</strong> para subir tus pistas · WAV · MP3 · FLAC
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes expand{0%{opacity:0.6;transform:translate(-50%,-50%) scale(0.8)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.3)}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
        @keyframes glow{0%,100%{box-shadow:0 0 28px rgba(192,38,211,0.5)}50%{box-shadow:0 0 48px rgba(236,72,153,0.7)}}
      `}</style>
    </div>
  );
}
