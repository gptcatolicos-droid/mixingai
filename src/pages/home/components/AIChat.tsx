import { useState, useRef, useEffect } from 'react';
import Header from '@/components/feature/Header';
import { MixPreset, PRESETS } from './PresetScreen';

interface User {
  id: string; firstName: string; lastName: string; email: string;
  country: string; credits: number; provider?: string; createdAt: string;
  username?: string; avatar?: string;
}

interface Message {
  id: string;
  role: 'ai' | 'user';
  text: string;
  presets?: MixPreset[];
  selectedPreset?: MixPreset;
  stems?: File[];
  showUploadBtn?: boolean;
  showMixerBtn?: boolean;
}

interface AIChatProps {
  user?: User | null;
  onStartMixer: (preset: MixPreset, files: File[]) => void;
  onCreditsUpdate?: (n: number) => void;
}

const SYSTEM_PROMPT = `Eres el asistente de mezcla de MixingMusic.AI. Tu nombre es Mix.
Ayudas a productores y artistas a mezclar sus canciones con inteligencia artificial.

Tienes 9 presets disponibles:
- Pop: Claridad vocal, brillo en agudos, graves limpios. Bass +2, Mid +1, High +3.
- Rock: Graves potentes, presencia media, ataque duro. Bass +4, Mid -1, High +2.
- Hip Hop: 808 profundo, snare seco, voces adelante. Bass +6, Mid -2, High +1.
- Reggaeton: Dembow marcado, bajos redondos, vocal seco. Bass +5, Mid 0, High +2.
- Dance/EDM: Kick fuerte, compresión máxima, estéreo amplio. Bass +4, Mid -1, High +3.
- Clásica: Natural, dinámico, mínima compresión, reverb de sala. Bass 0, Mid +1, High +2.
- Balada: Vocal prominente, ambiente cálido, suave compresión. Bass +1, Mid +2, High +2.
- Acústico: Guitarra y voz naturales, espacio íntimo. Bass -1, Mid +3, High +2.
- Gospel: Coro potente, voces llenas, reverb de iglesia. Bass +2, Mid +3, High +3.

FLUJO OBLIGATORIO:
1. Saluda al usuario y pregunta cómo quiere que suene su canción.
2. Cuando describa el sonido, recomienda 1-2 presets específicos con una breve explicación.
3. Confirma el preset elegido y dile EXACTAMENTE: "¡Perfecto! Ahora sube tus stems con el botón +"
4. Cuando confirme que subió los stems, di que están listos y que puede abrir el mezclador.

Reglas:
- Respuestas cortas, máximo 3 líneas. Eres amigable y conoces música.
- Siempre termina recomendando un preset específico antes de pedir los stems.
- Habla en español siempre.
- NO inventes presets que no existen en la lista.`;

const S = {
  page: {minHeight:'100vh',background:'#0F0A1A',fontFamily:"'DM Sans',system-ui,sans-serif",color:'#F8F0FF',display:'flex',flexDirection:'column' as const},
  bubble_ai: {background:'#241636',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'4px 14px 14px 14px',padding:'12px 14px',maxWidth:'85%',fontSize:'14px',color:'#F8F0FF',lineHeight:1.6},
  bubble_user: {background:'linear-gradient(135deg,#C026D3,#7C3AED)',borderRadius:'14px 4px 14px 14px',padding:'12px 14px',maxWidth:'75%',fontSize:'14px',color:'#fff',marginLeft:'auto',lineHeight:1.6},
  chip: (selected: boolean, color: string) => ({background:selected?color:'rgba(192,38,211,0.08)',border:`1px solid ${selected?color:'rgba(192,38,211,0.25)'}`,borderRadius:'980px',padding:'5px 14px',fontSize:'12px',fontWeight:600,color:selected?'#fff':'#C026D3',cursor:'pointer',transition:'all 0.15s',display:'inline-block'}),
};

export default function AIChat({ user, onStartMixer, onCreditsUpdate }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<MixPreset | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [stemsReady, setStemsReady] = useState(false);
  const [history, setHistory] = useState<{role:'user'|'assistant',content:string}[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Mensaje de bienvenida al montar
    const welcome: Message = {
      id: '0', role: 'ai',
      text: `¡Hola! 👋 Soy Mix, tu asistente de mezcla con IA.\n\n¿Cómo quieres que suene tu canción? Cuéntame el vibe, el género o los artistas que te inspiran.`,
    };
    setMessages([welcome]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const callClaudeAPI = async (userMessage: string): Promise<string> => {
    const newHistory = [...history, { role: 'user' as const, content: userMessage }];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: newHistory,
      }),
    });

    const data = await response.json();
    const aiText = data.content?.[0]?.text || 'Lo siento, hubo un error. Intenta de nuevo.';
    setHistory([...newHistory, { role: 'assistant', content: aiText }]);
    return aiText;
  };

  const detectPresetFromResponse = (text: string): MixPreset | null => {
    const lower = text.toLowerCase();
    for (const preset of PRESETS) {
      if (lower.includes(preset.name.toLowerCase()) ||
          lower.includes(preset.id.toLowerCase())) {
        return preset;
      }
    }
    return null;
  };

  const detectStemsRequest = (text: string): boolean => {
    const lower = text.toLowerCase();
    return lower.includes('sube tus stems') || lower.includes('subir los stems') ||
           lower.includes('botón +') || lower.includes('boton +') ||
           lower.includes('stems con el +');
  };

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isTyping) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: msg };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const aiText = await callClaudeAPI(msg);
      const detectedPreset = detectPresetFromResponse(aiText);
      const showUpload = detectStemsRequest(aiText);

      if (detectedPreset && !selectedPreset) setSelectedPreset(detectedPreset);

      const aiMsg: Message = {
        id: (Date.now()+1).toString(), role: 'ai', text: aiText,
        presets: detectedPreset ? [detectedPreset] : undefined,
        showUploadBtn: showUpload,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: 'Hubo un error de conexión. Intenta de nuevo.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handlePresetSelect = (preset: MixPreset) => {
    setSelectedPreset(preset);
    sendMessage(`Quiero el preset ${preset.name}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).filter(f => {
      return (f.type.startsWith('audio/') || /\.(wav|mp3|flac|aac|m4a)$/i.test(f.name)) && f.size <= 300*1024*1024;
    }).slice(0, 12);
    if (!files.length) return;
    setUploadedFiles(files);

    const stemNames = files.slice(0,3).map(f => f.name.replace(/\.[^.]+$/,'')).join(', ');
    const userMsg: Message = {
      id: Date.now().toString(), role: 'user',
      text: `Subí ${files.length} stem${files.length>1?'s':''}: ${stemNames}${files.length>3?'...':''}`,
      stems: files,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(async () => {
      try {
        const aiText = await callClaudeAPI(`Acabo de subir ${files.length} stems: ${files.map(f=>f.name).join(', ')}`);
        setStemsReady(true);
        setMessages(prev => [...prev, {
          id: (Date.now()+1).toString(), role: 'ai', text: aiText, showMixerBtn: true,
        }]);
      } catch {
        setStemsReady(true);
        setMessages(prev => [...prev, {
          id: (Date.now()+1).toString(), role: 'ai',
          text: `¡${files.length} stems cargados! 🎛️ Todo listo con el preset ${selectedPreset?.name || 'seleccionado'}. Abre el mezclador para ajustar y exportar.`,
          showMixerBtn: true,
        }]);
      } finally {
        setIsTyping(false);
      }
    }, 800);
    e.target.value = '';
  };

  const handleOpenMixer = () => {
    if (!selectedPreset || !uploadedFiles.length) return;
    onStartMixer(selectedPreset, uploadedFiles);
  };

  return (
    <div style={S.page}>
      {/* Mini nav sin login */}
      <div style={{background:'rgba(26,16,40,0.97)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(192,38,211,0.15)',padding:'0 16px',display:'flex',alignItems:'center',justifyContent:'space-between',height:'56px',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <div style={{width:'28px',height:'28px',background:'linear-gradient(135deg,#EC4899,#C026D3,#7C3AED)',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <i className="ri-equalizer-fill" style={{color:'#fff',fontSize:'14px'}}></i>
          </div>
          <span style={{fontWeight:600,fontSize:'14px',background:'linear-gradient(90deg,#EC4899,#C026D3)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>mixingmusic.ai</span>
        </div>
      </div>

      {/* Chat messages */}
      <div style={{flex:1,overflowY:'auto',padding:'16px 12px',display:'flex',flexDirection:'column',gap:'14px',maxWidth:'680px',width:'100%',margin:'0 auto'}}>
        {messages.map(msg => (
          <div key={msg.id}>
            {msg.role === 'ai' ? (
              <div style={{display:'flex',gap:'8px',alignItems:'flex-start'}}>
                <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'linear-gradient(135deg,#EC4899,#7C3AED)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:700,color:'#fff',flexShrink:0}}>M</div>
                <div style={{maxWidth:'85%'}}>
                  <div style={S.bubble_ai}>
                    {msg.text.split('\n').map((line, i) => (
                      <span key={i}>{line}{i < msg.text.split('\n').length-1 && <br/>}</span>
                    ))}

                    {/* Chips de presets recomendados */}
                    {msg.presets && msg.presets.length > 0 && (
                      <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginTop:'10px'}}>
                        {msg.presets.map(p => (
                          <span key={p.id} onClick={() => handlePresetSelect(p)}
                            style={S.chip(selectedPreset?.id===p.id, p.color)}>
                            ✦ {p.name}
                          </span>
                        ))}
                        {/* También mostrar alternativas */}
                        {PRESETS.filter(p => !msg.presets!.find(mp => mp.id===p.id)).slice(0,2).map(p => (
                          <span key={p.id} onClick={() => handlePresetSelect(p)}
                            style={S.chip(selectedPreset?.id===p.id, p.color)}>
                            {p.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Botón abrir mezclador */}
                    {msg.showMixerBtn && selectedPreset && uploadedFiles.length > 0 && (
                      <button onClick={handleOpenMixer}
                        style={{marginTop:'12px',background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'12px 20px',borderRadius:'980px',fontSize:'13px',fontWeight:700,cursor:'pointer',width:'100%',boxShadow:'0 0 20px rgba(192,38,211,0.5)',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                        <i className="ri-equalizer-fill"></i>
                        Abrir Mezclador — {selectedPreset.name}
                        <span style={{background:'rgba(255,255,255,0.2)',borderRadius:'980px',padding:'2px 8px',fontSize:'11px'}}>→</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'4px'}}>
                <div style={S.bubble_user}>{msg.text}</div>
                {msg.stems && (
                  <div style={{background:'#241636',border:'1px solid rgba(192,38,211,0.1)',borderRadius:'10px',padding:'8px 12px',fontSize:'11px',color:'#9B7EC8'}}>
                    {msg.stems.slice(0,3).map(f => (
                      <div key={f.name} style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'3px'}}>
                        <div style={{width:'5px',height:'5px',borderRadius:'50%',background:'#4ade80'}}></div>
                        {f.name.replace(/\.[^.]+$/,'')}
                      </div>
                    ))}
                    {msg.stems.length > 3 && <div style={{color:'#9B7EC8'}}>+{msg.stems.length-3} más...</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div style={{display:'flex',gap:'8px',alignItems:'flex-start'}}>
            <div style={{width:'30px',height:'30px',borderRadius:'50%',background:'linear-gradient(135deg,#EC4899,#7C3AED)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:700,color:'#fff',flexShrink:0}}>M</div>
            <div style={{...S.bubble_ai,display:'flex',gap:'4px',alignItems:'center',padding:'14px'}}>
              {[0,150,300].map(d => (
                <div key={d} style={{width:'6px',height:'6px',borderRadius:'50%',background:'#9B7EC8',animation:'bounce 1s infinite',animationDelay:`${d}ms`}}></div>
              ))}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Botón exportar flotante cuando stems están listos */}
      {stemsReady && selectedPreset && (
        <div style={{maxWidth:'680px',width:'100%',margin:'0 auto',padding:'0 12px 8px'}}>
          <button onClick={handleOpenMixer}
            style={{width:'100%',background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'16px',borderRadius:'14px',fontSize:'15px',fontWeight:700,cursor:'pointer',boxShadow:'0 0 28px rgba(192,38,211,0.6)',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',animation:'pulse 2s infinite'}}>
            <i className="ri-equalizer-fill" style={{fontSize:'18px'}}></i>
            ✦ Abrir Mezclador — {selectedPreset.name}
            <span style={{background:'rgba(255,255,255,0.15)',borderRadius:'980px',padding:'3px 10px',fontSize:'12px'}}>Listo →</span>
          </button>
        </div>
      )}

      {/* Input area */}
      <div style={{maxWidth:'680px',width:'100%',margin:'0 auto',padding:'8px 12px 16px',borderTop:'1px solid rgba(192,38,211,0.1)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          {/* Botón + para subir stems */}
          <input ref={fileInputRef} type="file" multiple accept="audio/*,.wav,.mp3,.flac,.aac,.m4a" onChange={handleFileUpload} style={{display:'none'}} />
          <button onClick={() => fileInputRef.current?.click()}
            style={{width:'42px',height:'42px',background:uploadedFiles.length?'linear-gradient(135deg,#4ade80,#22c55e)':'rgba(192,38,211,0.1)',border:`1px solid ${uploadedFiles.length?'rgba(74,222,128,0.4)':'rgba(192,38,211,0.25)'}`,borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,fontSize:'20px',color:uploadedFiles.length?'#fff':'#C026D3',fontWeight:300,transition:'all 0.2s',position:'relative' as const}}>
            {uploadedFiles.length ? (
              <span style={{fontSize:'11px',fontWeight:700}}>{uploadedFiles.length}</span>
            ) : '+'}
          </button>

          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key==='Enter' && sendMessage()}
            placeholder={selectedPreset ? `Preset ${selectedPreset.name} seleccionado · Sube tus stems con +` : 'Describe cómo quieres que suene...'}
            style={{flex:1,background:'#1A1028',border:'1px solid rgba(192,38,211,0.2)',borderRadius:'12px',padding:'10px 14px',fontSize:'14px',color:'#F8F0FF',outline:'none',fontFamily:'inherit'}} />

          <button onClick={() => sendMessage()}
            disabled={!input.trim() || isTyping}
            style={{width:'42px',height:'42px',background:input.trim()?'linear-gradient(135deg,#EC4899,#C026D3)':'#241636',border:'none',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',cursor:input.trim()?'pointer':'default',color:'#fff',fontSize:'16px',flexShrink:0,transition:'all 0.2s',opacity:input.trim()?1:0.4}}>
            ↑
          </button>
        </div>

        {/* Hint de stems cargados */}
        {uploadedFiles.length > 0 && !stemsReady && (
          <div style={{marginTop:'6px',fontSize:'11px',color:'#4ade80',display:'flex',alignItems:'center',gap:'4px'}}>
            <div style={{width:'5px',height:'5px',borderRadius:'50%',background:'#4ade80'}}></div>
            {uploadedFiles.length} stem{uploadedFiles.length>1?'s':''} listo{uploadedFiles.length>1?'s':''} — cuéntale a Mix cuál preset quieres
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-4px)} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 28px rgba(192,38,211,0.6)} 50%{box-shadow:0 0 40px rgba(236,72,153,0.8)} }
      `}</style>
    </div>
  );
}
