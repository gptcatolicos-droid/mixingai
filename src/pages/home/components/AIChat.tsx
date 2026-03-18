import { useState, useRef, useEffect } from 'react';
import { MixPreset, PRESETS } from './PresetScreen';

interface User { id: string; firstName: string; lastName: string; email: string; country: string; credits: number; provider?: string; createdAt: string; username?: string; avatar?: string; }
interface Message { id: string; role: 'ai'|'user'; text: string; presets?: MixPreset[]; stems?: File[]; showUploadCard?: boolean; showProgress?: boolean; showMixerBtn?: boolean; }
interface AIChatProps { user?: User|null; onStartMixer: (preset: MixPreset, files: File[]) => void; onCreditsUpdate?: (n: number) => void; }

const ICON = (size=18) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <rect x="2" y="5" width="2" height="10" rx="1" fill="white" opacity="0.5"/>
    <rect x="1" y="8" width="4" height="4" rx="2" fill="white"/>
    <rect x="9" y="3" width="2" height="14" rx="1" fill="white" opacity="0.5"/>
    <rect x="8" y="5" width="4" height="4" rx="2" fill="white"/>
    <rect x="16" y="5" width="2" height="10" rx="1" fill="white" opacity="0.5"/>
    <rect x="15" y="11" width="4" height="4" rx="2" fill="white"/>
  </svg>
);

const getResponse = (msg: string, preset: MixPreset|null) => {
  const m = msg.toLowerCase();
  const map = [
    {keys:['gospel','cristiano','catolic','iglesia','coro','worship','alabanza'],id:'gospel'},
    {keys:['reggaeton','urbano','dembow','bad bunny','maluma','perreo'],id:'reggaeton'},
    {keys:['pop','radio','comercial','taylor','ariana','brillante'],id:'pop'},
    {keys:['rock','guitarra electrica','distorsion','metal','punk'],id:'rock'},
    {keys:['hip hop','rap','trap','808','freestyle','drill'],id:'hiphop'},
    {keys:['dance','edm','electronica','club','house','techno'],id:'dance'},
    {keys:['balada','romantica','bolero','amor','lento'],id:'balada'},
    {keys:['acustico','acústico','guitarra','folk','unplugged','natural'],id:'acustico'},
    {keys:['clasica','clasico','orquesta','piano','instrumental'],id:'clasica'},
  ];
  let found: MixPreset|null = null;
  for (const r of map) { if (r.keys.some(k=>m.includes(k))) { found=PRESETS.find(p=>p.id===r.id)||null; break; } }
  if (found) return { text:`¡Perfecto para ese sonido! 🎵 El preset **${found.name}** es exactamente lo que necesitas — ${found.desc}.\n\nAhora **sube tus pistas** para empezar:`, presets:[found,...PRESETS.filter(p=>p.id!==found!.id).slice(0,2)], showUploadCard:true };
  if (m.includes('stem')||m.includes('pista')||m.includes('track')) return { text:`Toca la tarjeta de abajo para subir tus pistas 🎶`, showUploadCard:true };
  return { text:`¡Cuéntame más! ¿Qué género es tu canción?\n\nPor ejemplo: *"reggaeton estilo Bad Bunny"*, *"gospel de iglesia"*, *"balada romántica"*... 🎛️` };
};

export default function AIChat({ user, onStartMixer }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<MixPreset|null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [chatStarted, setChatStarted] = useState(false);

  // Clase en body para fondo más visible en home
  useEffect(() => {
    document.body.classList.add('page-home');
    return () => document.body.classList.remove('page-home');
  }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages, isTyping]);

  const bold = (text: string) => text.split('\n').map((line,li) => (
    <span key={li}>{line.split(/\*\*(.*?)\*\*/g).map((p,i)=>i%2===1?<strong key={i} style={{color:'#EC4899'}}>{p}</strong>:p)}{li<text.split('\n').length-1&&<br/>}</span>
  ));

  const send = (text?: string) => {
    const msg = (text||input).trim(); if (!msg||isTyping) return;
    setInput(''); if (!chatStarted) setChatStarted(true);
    setMessages(prev=>[...prev,{id:Date.now().toString(),role:'user',text:msg}]);
    setIsTyping(true);
    setTimeout(()=>{
      const res = getResponse(msg, selectedPreset);
      if (res.presets?.[0]&&!selectedPreset) setSelectedPreset(res.presets[0]);
      setMessages(prev=>[...prev,{id:(Date.now()+1).toString(),role:'ai',...res}]);
      setIsTyping(false);
    }, 700+Math.random()*400);
  };

  const selectPreset = (p: MixPreset) => {
    setSelectedPreset(p);
    setMessages(prev=>[...prev,{id:Date.now().toString(),role:'ai',text:`¡Perfecto! **${p.name}** seleccionado 🎛️ — ${p.desc}.\n\nAhora **sube tus pistas**:`,showUploadCard:true}]);
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).filter(f=>(f.type.startsWith('audio/')||/\.(wav|mp3|flac|aac|m4a)$/i.test(f.name))&&f.size<=300*1024*1024).slice(0,12);
    if (!files.length) return;
    setUploadedFiles(files);
    const names = files.slice(0,3).map(f=>f.name.replace(/\.[^.]+$/,'')).join(', ');
    setMessages(prev=>[...prev,{id:Date.now().toString(),role:'user',text:`Subí ${files.length} pista${files.length>1?'s':''}: ${names}${files.length>3?'...':''}`,stems:files}]);
    const preset = selectedPreset||PRESETS[0];
    if (!selectedPreset) setSelectedPreset(preset);
    setLoadingProgress(0);
    setMessages(prev=>[...prev,{id:(Date.now()+1).toString(),role:'ai',text:`✅ ¡${files.length} pistas recibidas! Aplicando **${preset.name}** 🔥`,showProgress:true}]);
    let p=0; const iv=setInterval(()=>{
      p+=Math.random()*12+5;
      if (p>=100) { clearInterval(iv); setLoadingProgress(100);
        setTimeout(()=>setMessages(prev=>prev.map(m=>m.showProgress?{...m,showProgress:false,showMixerBtn:true}:m)),400);
      } else setLoadingProgress(Math.min(p,99));
    },180);
    e.target.value='';
  };

  const S = {
    page:{minHeight:'100vh',background:'transparent',display:'flex',flexDirection:'column' as const,fontFamily:"'Outfit',system-ui,sans-serif",color:'#F8F0FF',position:'relative' as const,overflow:'hidden'},
    nav:{background:'rgba(15,10,26,0.88)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(192,38,211,0.15)',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:'56px',flexShrink:0,position:'relative' as const,zIndex:10},
    bai:{background:'linear-gradient(135deg,rgba(36,22,54,0.88),rgba(26,16,40,0.88))',border:'1px solid rgba(192,38,211,0.18)',borderRadius:'3px 18px 18px 18px',padding:'14px 18px',maxWidth:'86%',fontSize:'15px',color:'#F8F0FF',lineHeight:1.7,position:'relative' as const,overflow:'hidden'},
    busr:{background:'linear-gradient(135deg,#C026D3,#7C3AED)',borderRadius:'18px 3px 18px 18px',padding:'12px 18px',maxWidth:'74%',fontSize:'15px',color:'#fff',marginLeft:'auto',lineHeight:1.7},
    av:{width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 0 12px rgba(192,38,211,0.35)'},
  };

  const MixerBtn = () => (
    <button onClick={()=>onStartMixer(selectedPreset||PRESETS[0],uploadedFiles)}
      style={{width:'100%',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',border:'none',color:'#fff',padding:'15px 20px',borderRadius:'14px',fontSize:'15px',fontWeight:700,cursor:'pointer',marginTop:'12px',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',boxShadow:'0 0 28px rgba(192,38,211,0.5)',fontFamily:'inherit',animation:'glow 2.5s infinite'}}>
      {ICON(16)} ✦ Abrir Mezclador — {(selectedPreset||PRESETS[0]).name}
      <span style={{background:'rgba(255,255,255,0.15)',borderRadius:'980px',padding:'3px 12px',fontSize:'12px'}}>Listo →</span>
    </button>
  );

  const UploadCard = () => (
    <div onClick={()=>fileInputRef.current?.click()}
      style={{background:'linear-gradient(135deg,rgba(236,72,153,0.08),rgba(124,58,237,0.08))',border:'1.5px dashed rgba(192,38,211,0.35)',borderRadius:'16px',padding:'20px',marginTop:'12px',textAlign:'center',cursor:'pointer'}}>
      <div style={{width:'48px',height:'48px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px',boxShadow:'0 0 18px rgba(192,38,211,0.4)',fontSize:'22px'}}>⬆</div>
      <div style={{fontSize:'17px',fontWeight:700,color:'#F8F0FF',marginBottom:'4px',letterSpacing:'-0.3px'}}>Sube tus Pistas</div>
      <div style={{fontSize:'12px',color:'#9B7EC8',marginBottom:'10px'}}>Arrastra aquí o toca para seleccionar</div>
      <div style={{display:'flex',gap:'4px',justifyContent:'center',flexWrap:'wrap'}}>
        {['WAV','MP3','FLAC','AAC','M4A'].map(f=><span key={f} style={{fontSize:'10px',fontWeight:700,padding:'2px 8px',borderRadius:'980px',background:'rgba(192,38,211,0.1)',border:'1px solid rgba(192,38,211,0.25)',color:'#C026D3'}}>{f}</span>)}
      </div>
    </div>
  );

  const ProgressCard = () => (
    <div style={{background:'rgba(36,22,54,0.82)',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'12px',padding:'14px 16px',marginTop:'12px'}}>
      <div style={{fontSize:'13px',fontWeight:600,color:'#F8F0FF',marginBottom:'3px',display:'flex',alignItems:'center',gap:'6px'}}>{ICON(13)} Cargando al mezclador...</div>
      <div style={{fontSize:'11px',color:'#9B7EC8',marginBottom:'10px'}}>Procesando {uploadedFiles.length} pistas</div>
      <div style={{background:'rgba(8,4,16,0.88)',borderRadius:'8px',height:'6px',overflow:'hidden',marginBottom:'6px'}}>
        <div style={{height:'100%',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'8px',width:`${loadingProgress}%`,transition:'width 0.3s'}}></div>
      </div>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:'12px',color:'#C026D3',fontWeight:600}}>{Math.round(loadingProgress)}%</div>
    </div>
  );

  return (
    <div style={S.page}>
      {/* Ondas de audio sobre el fondo */}
      {[300,550,800].map((s,i)=>(
        <div key={i} style={{position:'fixed',width:`${s}px`,height:`${s}px`,top:'40%',left:'50%',borderRadius:'50%',border:'1px solid rgba(192,38,211,0.05)',animation:'expand 8s infinite',animationDelay:`${i*2.5}s`,transform:'translate(-50%,-50%)',pointerEvents:'none',zIndex:0}}></div>
      ))}

      {/* Nav */}
      <div style={S.nav}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{width:'32px',height:'32px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'9px',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 12px rgba(192,38,211,0.4)'}}>
            {ICON(16)}
          </div>
          <span style={{fontWeight:700,fontSize:'15px',letterSpacing:'-0.5px',background:'linear-gradient(90deg,#EC4899,#C026D3)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>mixingmusic.ai</span>
        </div>
      </div>

      <input ref={fileInputRef} type="file" multiple accept="audio/*,.wav,.mp3,.flac,.aac,.m4a" onChange={handleFiles} style={{display:'none'}} />

      {/* HERO + CHAT — todo en una sola columna centrada */}
      <div style={{flex:1,display:'flex',flexDirection:'column',maxWidth:'680px',width:'100%',margin:'0 auto',padding:'0 16px',position:'relative',zIndex:1}}>

        {/* HERO — visible siempre hasta que haya mensajes */}
        {!chatStarted && (
          <div style={{paddingTop:'clamp(40px,8vh,80px)',paddingBottom:'32px',textAlign:'center'}}>
            {/* Badge */}
            <div style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'rgba(192,38,211,0.1)',border:'1px solid rgba(192,38,211,0.25)',borderRadius:'980px',padding:'5px 16px',marginBottom:'24px'}}>
              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#4ade80'}}></div>
              <span style={{fontSize:'12px',color:'#C026D3',fontWeight:700}}>Mezclas Ilimitadas — Completamente Gratis</span>
            </div>
            {/* Título grande */}
            <h1 style={{fontSize:'clamp(32px,7vw,64px)',fontWeight:700,letterSpacing:'-2px',lineHeight:1.05,marginBottom:'20px'}}>
              <span style={{background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Mezcla tu música</span>
              <br/>
              <span style={{color:'#F8F0FF'}}>como un profesional</span>
            </h1>
            <p style={{fontSize:'clamp(14px,2vw,18px)',color:'#9B7EC8',marginBottom:'36px',lineHeight:1.6,maxWidth:'520px',margin:'0 auto 36px'}}>
              Sube tus pistas, nuestra IA las mezcla con calidad de estudio. Sin límites, sin costo, sin complicaciones.
            </p>
            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',maxWidth:'420px',margin:'0 auto 40px'}}>
              {[{val:'∞',label:'Mezclas ilimitadas'},{val:'100%',label:'Completamente gratis'},{val:'-14',label:'LUFS Streaming'}].map(s=>(
                <div key={s.label} style={{background:'rgba(26,16,40,0.8)',border:'1px solid rgba(192,38,211,0.12)',borderRadius:'12px',padding:'14px 8px',textAlign:'center',backdropFilter:'blur(8px)'}}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:'22px',fontWeight:600,background:'linear-gradient(90deg,#EC4899,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{s.val}</div>
                  <div style={{fontSize:'11px',color:'#9B7EC8',marginTop:'3px'}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MENSAJES — aparecen cuando el chat empieza */}
        {chatStarted && (
          <div style={{flex:1,overflowY:'auto',padding:'20px 0 12px',display:'flex',flexDirection:'column',gap:'16px'}}>
            {/* Primer mensaje de Mix */}
            <div style={{display:'flex',gap:'10px',alignItems:'flex-start'}}>
              <div style={S.av}>{ICON(16)}</div>
              <div style={S.bai}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:'1px',background:'linear-gradient(90deg,transparent,rgba(236,72,153,0.5),rgba(124,58,237,0.4),transparent)'}}></div>
                ¡Hola! 👋 Soy <strong style={{color:'#EC4899'}}>Mix</strong>. ¿Cómo quieres que suene tu canción? 🎵
              </div>
            </div>
            {messages.map(msg=>(
              <div key={msg.id}>
                {msg.role==='ai'?(
                  <div style={{display:'flex',gap:'10px',alignItems:'flex-start'}}>
                    <div style={S.av}>{ICON(16)}</div>
                    <div style={{maxWidth:'86%'}}>
                      <div style={S.bai}>
                        <div style={{position:'absolute',top:0,left:0,right:0,height:'1px',background:'linear-gradient(90deg,transparent,rgba(236,72,153,0.5),rgba(124,58,237,0.4),transparent)'}}></div>
                        {bold(msg.text)}
                        {msg.presets&&(
                          <div style={{display:'flex',flexWrap:'wrap',gap:'7px',marginTop:'12px'}}>
                            {msg.presets.map(p=>(
                              <span key={p.id} onClick={()=>selectPreset(p)}
                                style={{background:selectedPreset?.id===p.id?p.color:'rgba(192,38,211,0.08)',border:`1px solid ${selectedPreset?.id===p.id?p.color:'rgba(192,38,211,0.25)'}`,borderRadius:'980px',padding:'6px 14px',fontSize:'12px',fontWeight:600,color:selectedPreset?.id===p.id?'#fff':'#C026D3',cursor:'pointer',transition:'all 0.15s'}}>
                                ✦ {p.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {msg.showUploadCard&&!uploadedFiles.length&&<UploadCard/>}
                        {msg.showProgress&&!msg.showMixerBtn&&<ProgressCard/>}
                        {msg.showMixerBtn&&<MixerBtn/>}
                      </div>
                    </div>
                  </div>
                ):(
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'6px'}}>
                    <div style={S.busr}>{msg.text}</div>
                    {msg.stems&&(
                      <div style={{background:'rgba(26,16,40,0.82)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:'10px',padding:'8px 14px',fontSize:'11px'}}>
                        {msg.stems.slice(0,3).map(f=>(
                          <div key={f.name} style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'2px',color:'#9B7EC8',fontFamily:"'DM Mono',monospace"}}>
                            <div style={{width:'5px',height:'5px',borderRadius:'50%',background:'#4ade80'}}></div>
                            {f.name.replace(/\.[^.]+$/,'')}
                          </div>
                        ))}
                        {msg.stems.length>3&&<div style={{color:'rgba(155,126,200,0.5)',fontFamily:"'DM Mono',monospace"}}>+{msg.stems.length-3} más</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isTyping&&(
              <div style={{display:'flex',gap:'10px',alignItems:'flex-start'}}>
                <div style={S.av}>{ICON(16)}</div>
                <div style={{...S.bai,display:'flex',gap:'5px',alignItems:'center',padding:'16px 18px'}}>
                  {[0,150,300].map(d=><div key={d} style={{width:'7px',height:'7px',borderRadius:'50%',background:'#9B7EC8',animation:'bounce 1s infinite',animationDelay:`${d}ms'`}}></div>)}
                </div>
              </div>
            )}
            <div ref={messagesEndRef}/>
          </div>
        )}

        {/* INPUT — siempre abajo, pégado debajo del hero o del chat */}
        <div style={{borderTop:chatStarted?'1px solid rgba(192,38,211,0.1)':'none',padding:chatStarted?'12px 0 24px':'0 0 24px',flexShrink:0}}>
          {/* Chips de género rápido — solo antes de chatear */}
          {!chatStarted&&(
            <div style={{display:'flex',flexWrap:'wrap',gap:'7px',justifyContent:'center',marginBottom:'14px'}}>
              {['Gospel','Reggaeton','Pop','Rock','Hip Hop','Balada','Acústico','Dance'].map(g=>(
                <button key={g} onClick={()=>send(`Mi canción es ${g.toLowerCase()}`)}
                  style={{background:'rgba(192,38,211,0.08)',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'980px',padding:'6px 14px',fontSize:'12px',fontWeight:600,color:'#C026D3',cursor:'pointer',fontFamily:'inherit',backdropFilter:'blur(8px)'}}>
                  {g}
                </button>
              ))}
            </div>
          )}
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <button onClick={()=>fileInputRef.current?.click()}
              style={{width:'50px',height:'50px',background:uploadedFiles.length?'linear-gradient(135deg,#4ade80,#22c55e)':'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,boxShadow:uploadedFiles.length?'0 0 14px rgba(74,222,128,0.4)':'0 0 14px rgba(192,38,211,0.4)',color:'#fff',fontSize:'20px'}}>
              {uploadedFiles.length?<span style={{fontSize:'13px',fontWeight:700}}>{uploadedFiles.length}</span>:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>}
            </button>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
              placeholder={chatStarted?'Escribe o toca ⬆ para subir pistas...':'¿Cómo quieres que suene tu canción? Ej: gospel con coro potente...'}
              style={{flex:1,background:'rgba(26,16,40,0.78)',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'14px',padding:'14px 18px',fontSize:'15px',color:'#F8F0FF',outline:'none',fontFamily:'inherit',backdropFilter:'blur(8px)'}} />
            <button onClick={()=>send()} disabled={!input.trim()||isTyping}
              style={{width:'50px',height:'50px',background:input.trim()?'linear-gradient(135deg,#EC4899,#C026D3)':'#241636',border:'none',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',cursor:input.trim()?'pointer':'default',color:'#fff',fontSize:'18px',flexShrink:0,opacity:input.trim()?1:0.4}}>↑</button>
          </div>
          <div style={{textAlign:'center',marginTop:'8px',fontSize:'11px',color:'rgba(155,126,200,0.4)'}}>
            Toca <strong style={{color:'#C026D3'}}>⬆</strong> para subir tus pistas · WAV · MP3 · FLAC · AAC · M4A
          </div>
        </div>
      </div>

      <style>{`
        @keyframes expand{0%{opacity:0.6;transform:translate(-50%,-50%) scale(0.8)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.3)}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
        @keyframes glow{0%,100%{box-shadow:0 0 28px rgba(192,38,211,0.5)}50%{box-shadow:0 0 48px rgba(236,72,153,0.7)}}
      `}</style>
    </div>
  );
}
