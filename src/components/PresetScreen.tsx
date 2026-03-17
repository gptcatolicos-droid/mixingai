import { useState, useRef, useEffect } from 'react';
import Header from '@/components/feature/Header';

interface User {
  id: string; firstName: string; lastName: string; email: string;
  country: string; credits: number; provider?: string; createdAt: string;
  username?: string; avatar?: string;
}

export interface MixPreset {
  id: string;
  name: string;
  desc: string;
  color: string;
  bass: number;    // dB -12 a +12
  mid: number;
  high: number;
  compression: 'none' | 'low' | 'medium' | 'high' | 'max';
  reverbWet: number;   // 0 a 1
  delayWet: number;    // 0 a 1
  stereoWidth: number; // 0 a 1
  tags: string[];
  wavePattern: number[];
}

export const PRESETS: MixPreset[] = [
  { id:'pop', name:'Pop', desc:'Claridad vocal, brillo en agudos, graves limpios', color:'#EC4899',
    bass:2, mid:1, high:3, compression:'medium', reverbWet:0.15, delayWet:0, stereoWidth:0.5,
    tags:['Vocal','Bright'], wavePattern:[.3,.5,.7,.9,.8,.6,.5,.7,.8,.6,.4,.5,.7,.9,.8,.6] },
  { id:'rock', name:'Rock', desc:'Graves potentes, presencia media, ataque duro', color:'#EF4444',
    bass:4, mid:-1, high:2, compression:'high', reverbWet:0.05, delayWet:0, stereoWidth:0.6,
    tags:['Punch','Heavy'], wavePattern:[.8,.9,.7,.6,.8,.9,.7,.5,.8,.9,.7,.6,.8,.9,.5,.4] },
  { id:'hiphop', name:'Hip Hop', desc:'808 profundo, snare seco, voces adelante', color:'#F59E0B',
    bass:6, mid:-2, high:1, compression:'high', reverbWet:0.08, delayWet:0.1, stereoWidth:0.4,
    tags:['808','Trap'], wavePattern:[.9,.8,.3,.2,.9,.8,.3,.2,.9,.8,.3,.2,.9,.8,.3,.2] },
  { id:'reggaeton', name:'Reggaeton', desc:'Dembow, bajos redondos, vocal seco', color:'#10B981',
    bass:5, mid:0, high:2, compression:'high', reverbWet:0.1, delayWet:0.15, stereoWidth:0.5,
    tags:['Perreo','Bajo'], wavePattern:[.5,.9,.4,.8,.5,.9,.4,.8,.5,.9,.4,.8,.5,.9,.4,.8] },
  { id:'dance', name:'Dance / EDM', desc:'Kick fuerte, compresión paralela, wide estéreo', color:'#6366F1',
    bass:4, mid:-1, high:3, compression:'max', reverbWet:0.2, delayWet:0.2, stereoWidth:0.8,
    tags:['Club','EDM'], wavePattern:[.9,.2,.9,.2,.9,.2,.9,.2,.9,.2,.9,.2,.9,.2,.9,.2] },
  { id:'clasica', name:'Clásica', desc:'Natural, dinámico, mínima compresión, reverb de sala', color:'#8B5CF6',
    bass:0, mid:1, high:2, compression:'none', reverbWet:0.4, delayWet:0, stereoWidth:0.7,
    tags:['Orquesta','Dinámico'], wavePattern:[.2,.3,.4,.5,.6,.7,.8,.9,.8,.7,.6,.5,.4,.5,.6,.7] },
  { id:'balada', name:'Balada', desc:'Vocal prominente, ambiente cálido, suave compresión', color:'#F472B6',
    bass:1, mid:2, high:2, compression:'low', reverbWet:0.35, delayWet:0.1, stereoWidth:0.5,
    tags:['Romántica','Vocal'], wavePattern:[.3,.4,.5,.6,.7,.6,.5,.7,.8,.7,.6,.5,.4,.5,.6,.5] },
  { id:'acustico', name:'Acústico', desc:'Guitarra y voz naturales, espacio íntimo, sin compresión agresiva', color:'#A78BFA',
    bass:-1, mid:3, high:2, compression:'low', reverbWet:0.25, delayWet:0, stereoWidth:0.45,
    tags:['Guitarra','Natural'], wavePattern:[.4,.5,.6,.5,.4,.6,.7,.6,.5,.4,.5,.6,.5,.4,.3,.4] },
  { id:'gospel', name:'Gospel', desc:'Coro potente, voces llenas, reverb de iglesia, warmth', color:'#FBBF24',
    bass:2, mid:3, high:3, compression:'medium', reverbWet:0.45, delayWet:0.05, stereoWidth:0.7,
    tags:['Coro','Iglesia'], wavePattern:[.5,.6,.7,.8,.9,.8,.7,.8,.9,.8,.7,.6,.7,.8,.7,.6] },
];

interface PresetScreenProps {
  user: User;
  stemCount: number;
  onBack: () => void;
  onConfirm: (preset: MixPreset, reverbOn: boolean, delayOn: boolean, stereoOn: boolean) => void;
}

const S = {
  page: {minHeight:'100vh',background:'#0F0A1A',fontFamily:"'DM Sans',system-ui,sans-serif",color:'#F8F0FF'},
  card: {background:'#1A1028',border:'1px solid rgba(192,38,211,0.15)',borderRadius:'16px',padding:'16px'},
  label: {fontSize:'10px',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase' as const,color:'#9B7EC8',marginBottom:'10px',display:'block'},
  glowBtn: {background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'14px 32px',borderRadius:'980px',fontSize:'15px',fontWeight:600,cursor:'pointer',boxShadow:'0 0 24px rgba(192,38,211,0.5)',fontFamily:'inherit'},
  ghostBtn: {background:'transparent',border:'1px solid rgba(192,38,211,0.25)',color:'#9B7EC8',padding:'12px 24px',borderRadius:'980px',fontSize:'14px',cursor:'pointer',fontFamily:'inherit'},
};

function WaveCanvas({ pattern, color, selected }: { pattern: number[], color: string, selected: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#0F0A1A';
    ctx.fillRect(0,0,w,h);
    const bw = w / pattern.length;
    pattern.forEach((p, i) => {
      const bh = p * h * 0.8;
      const x = i * bw + bw * 0.1;
      const y = (h - bh) / 2;
      ctx.fillStyle = selected ? color : 'rgba(155,126,200,0.25)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, bw * 0.8, bh, 2);
      else ctx.rect(x, y, bw * 0.8, bh);
      ctx.fill();
    });
  }, [pattern, color, selected]);
  return <canvas ref={canvasRef} width={280} height={56} style={{width:'100%',height:'40px',display:'block',borderRadius:'6px'}} />;
}

export default function PresetScreen({ user, stemCount, onBack, onConfirm }: PresetScreenProps) {
  const [selected, setSelected] = useState<string>('pop');
  const [reverbOn, setReverbOn] = useState(false);
  const [delayOn, setDelayOn] = useState(false);
  const [stereoOn, setStereoOn] = useState(false);

  const preset = PRESETS.find(p => p.id === selected)!;

  const handleConfirm = () => onConfirm(preset, reverbOn, delayOn, stereoOn);

  return (
    <div style={S.page}>
      <Header user={user} onLogout={() => {}} onCreditsUpdate={() => {}} />

      <div style={{maxWidth:'900px',margin:'0 auto',padding:'24px 16px 60px'}}>

        {/* Header */}
        <div style={{textAlign:'center',marginBottom:'28px'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'rgba(192,38,211,0.1)',border:'1px solid rgba(192,38,211,0.25)',borderRadius:'980px',padding:'5px 14px',marginBottom:'14px'}}>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#4ade80'}}></div>
            <span style={{fontSize:'12px',color:'#C026D3',fontWeight:600}}>{stemCount} stems cargados — listos para mezclar</span>
          </div>
          <h1 style={{fontSize:'clamp(22px,5vw,32px)',fontWeight:700,letterSpacing:'-0.5px',background:'linear-gradient(90deg,#EC4899,#C026D3,#7C3AED)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginBottom:'8px'}}>
            Elige tu estilo de mezcla
          </h1>
          <p style={{fontSize:'14px',color:'#9B7EC8'}}>La IA ajusta EQ, compresión y efectos según el género. Los cambios son reales.</p>
        </div>

        {/* Grid de presets */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:'10px',marginBottom:'20px'}}>
          {PRESETS.map(p => {
            const isSel = selected === p.id;
            return (
              <div key={p.id} onClick={() => setSelected(p.id)}
                style={{background:'#1A1028',border:`1.5px solid ${isSel ? p.color : 'rgba(192,38,211,0.1)'}`,borderRadius:'14px',padding:'14px',cursor:'pointer',transition:'border-color 0.2s',boxShadow:isSel?`0 0 16px ${p.color}33`:'none',position:'relative'}}>
                {isSel && (
                  <div style={{position:'absolute',top:'8px',right:'8px',width:'18px',height:'18px',borderRadius:'50%',background:p.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',color:'#fff',fontWeight:700}}>✓</div>
                )}
                <div style={{marginBottom:'10px'}}>
                  <WaveCanvas pattern={p.wavePattern} color={p.color} selected={isSel} />
                </div>
                <div style={{fontSize:'13px',fontWeight:600,color:'#F8F0FF',marginBottom:'4px'}}>{p.name}</div>
                <div style={{fontSize:'11px',color:'#9B7EC8',lineHeight:1.4,marginBottom:'8px'}}>{p.desc}</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
                  {p.tags.map(t => (
                    <span key={t} style={{fontSize:'10px',fontWeight:600,padding:'2px 7px',borderRadius:'980px',background:`${p.color}22`,color:p.color,border:`1px solid ${p.color}44`}}>{t}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Parámetros del preset seleccionado */}
        <div style={{...S.card,marginBottom:'16px'}}>
          <span style={S.label}>Parámetros de {preset.name}</span>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:'10px'}}>
            {[
              {label:'Bass',val:preset.bass,max:6},
              {label:'Mid',val:preset.mid,max:6},
              {label:'High',val:preset.high,max:6},
            ].map(eq => (
              <div key={eq.label} style={{background:'#0F0A1A',borderRadius:'10px',padding:'12px',textAlign:'center',border:'1px solid rgba(192,38,211,0.08)'}}>
                <div style={{fontSize:'10px',color:'#9B7EC8',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'6px'}}>{eq.label}</div>
                <div style={{fontSize:'20px',fontWeight:600,fontFamily:"'DM Mono',monospace",color: eq.val>0?preset.color:eq.val<0?'#f87171':'#9B7EC8'}}>
                  {eq.val>0?'+':''}{eq.val} dB
                </div>
                <div style={{marginTop:'6px',height:'3px',background:'#241636',borderRadius:'2px'}}>
                  <div style={{height:'100%',background:preset.color,borderRadius:'2px',width:`${((eq.val+12)/24)*100}%`}}></div>
                </div>
              </div>
            ))}
            <div style={{background:'#0F0A1A',borderRadius:'10px',padding:'12px',textAlign:'center',border:'1px solid rgba(192,38,211,0.08)'}}>
              <div style={{fontSize:'10px',color:'#9B7EC8',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:'6px'}}>Compresión</div>
              <div style={{fontSize:'14px',fontWeight:600,color:preset.color,textTransform:'capitalize'}}>{preset.compression}</div>
              <div style={{fontSize:'10px',color:'rgba(155,126,200,0.5)',marginTop:'4px'}}>
                {preset.compression==='none'?'Sin compresión':preset.compression==='low'?'Suave':preset.compression==='medium'?'Media':preset.compression==='high'?'Potente':'Máxima'}
              </div>
            </div>
          </div>
        </div>

        {/* Efectos adicionales */}
        <div style={{...S.card,marginBottom:'24px'}}>
          <span style={S.label}>Efectos adicionales — estos SÍ cambian el sonido</span>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'10px'}}>
            {[
              {id:'reverb',label:'Reverb',desc:`Ambiente espacial · ${Math.round(preset.reverbWet*100)}% wet`,icon:'ri-radio-line',on:reverbOn,toggle:()=>setReverbOn(!reverbOn)},
              {id:'delay',label:'Delay',desc:'Echo rítmico · 1/4 beat',icon:'ri-repeat-line',on:delayOn,toggle:()=>setDelayOn(!delayOn)},
              {id:'stereo',label:'Widener',desc:'Amplitud estéreo · 60%',icon:'ri-sound-module-line',on:stereoOn,toggle:()=>setStereoOn(!stereoOn)},
            ].map(fx => (
              <div key={fx.id} onClick={fx.toggle}
                style={{background:fx.on?'rgba(192,38,211,0.08)':'#0F0A1A',border:`1px solid ${fx.on?'rgba(192,38,211,0.4)':'rgba(192,38,211,0.08)'}`,borderRadius:'12px',padding:'14px',cursor:'pointer',transition:'all 0.2s'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'8px'}}>
                  <div style={{width:'30px',height:'30px',borderRadius:'8px',background:fx.on?'rgba(192,38,211,0.15)':'rgba(155,126,200,0.08)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <i className={fx.icon} style={{color:fx.on?'#C026D3':'#9B7EC8',fontSize:'14px'}}></i>
                  </div>
                  {/* Toggle switch */}
                  <div style={{width:'34px',height:'20px',borderRadius:'10px',background:fx.on?'#C026D3':'#241636',border:`1px solid ${fx.on?'#EC4899':'rgba(192,38,211,0.2)'}`,position:'relative',transition:'all 0.2s'}}>
                    <div style={{width:'14px',height:'14px',borderRadius:'50%',background:'#fff',position:'absolute',top:'2px',left:fx.on?'17px':'3px',transition:'left 0.2s'}}></div>
                  </div>
                </div>
                <div style={{fontSize:'13px',fontWeight:600,color:fx.on?'#F8F0FF':'#9B7EC8',marginBottom:'2px'}}>{fx.label}</div>
                <div style={{fontSize:'11px',color:'rgba(155,126,200,0.7)'}}>{fx.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Botones */}
        <div style={{display:'flex',gap:'12px',justifyContent:'center',flexWrap:'wrap'}}>
          <button onClick={onBack} style={S.ghostBtn}>← Cambiar stems</button>
          <button onClick={handleConfirm} style={S.glowBtn}>
            ✦ Abrir Mezclador con {preset.name}
          </button>
        </div>
      </div>
    </div>
  );
}
