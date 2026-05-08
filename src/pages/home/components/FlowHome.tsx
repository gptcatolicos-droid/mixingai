import FlowNav from '@/components/flow/FlowNav';
import { useState } from 'react';

interface User { id:string; firstName:string; credits:number; is_pro?:boolean; plan?:string; genre?:string; level?:string; }
interface Props { user:User|null; onNavigate:(id:string)=>void; onLogout?:()=>void; }

const TABS = [
  {
    id:'stems', icon:'⊞', label:'Mezclar stems con IA',
    color:'#ec4899', colorDim:'rgba(236,72,153,0.15)',
    cost:'1 crédito / mezcla',
    title:'Mezclar stems con IA',
    sub:'Sube tus pistas · EQ · Efectos · -10 LUFS',
    desc:'Sube hasta 12 stems (voz, batería, bajo, guitarra…). El DAW los balancea, comprime y exporta listos para Spotify en WAV 24-bit.',
    cta:'Abrir MixingStudio AI',
    preview:{
      label:'MEZCLA CON IA — PREVIEW',
      tracks:[{n:'Vocals',v:-2,fx:'Reverb 15%',c:'#ec4899'},{n:'Drums',v:1,fx:'Comp High',c:'#a855f7'},{n:'Bass',v:0,fx:'EQ +4',c:'#f59e0b'}],
    }
  },
  {
    id:'create', icon:'✦', label:'Crear canciones con IA',
    color:'#a3e635', colorDim:'rgba(163,230,53,0.1)',
    cost:'10 créditos / canción',
    title:'Crear canciones con IA',
    sub:'Prompt de texto · letra · audio referencia',
    desc:'Escribe lo que quieres, sube una letra o un audio de referencia. ACE-Step genera una canción completa que aparece directamente en el DAW.',
    cta:'Crear mi canción',
    preview:{
      label:'PREVIEW DE CANCIÓN IA',
      badges:['Indie pop','115 BPM','La menor','Calidad alta'],
      quote:'"Una canción indie pop soñadora, con guitarras suaves y letra nostálgica sobre nuevos comienzos."',
    }
  },
  {
    id:'separate', icon:'⊣', label:'Separar stems',
    color:'#a855f7', colorDim:'rgba(168,85,247,0.1)',
    cost:'3 créditos / separación',
    title:'Separar stems',
    sub:'Vocals · Drums · Bass · Other',
    desc:'Sube cualquier canción y Demucs la separa en 4 pistas con calidad profesional. Procesa 100% en tu dispositivo — sin enviar audio a servidores.',
    cta:'Separar canción',
    preview:{
      label:'SEPARAR STEMS — PREVIEW',
      stems:[{l:'Vocals',c:'#ec4899'},{l:'Drums',c:'#10b981'},{l:'Bass',c:'#f59e0b'},{l:'Other',c:'#3b82f6'}],
    }
  },
];

// Mini bar chart for preview
function Bars({color,n=20}:{color:string;n?:number}){
  const heights=[0.4,0.6,0.9,0.7,0.5,0.8,1.0,0.6,0.4,0.7,0.9,0.5,0.8,0.6,1.0,0.7,0.5,0.8,0.6,0.4];
  return(
    <div style={{display:'flex',alignItems:'flex-end',gap:3,height:80}}>
      {heights.slice(0,n).map((h,i)=>(
        <div key={i} style={{flex:1,height:`${h*100}%`,borderRadius:'2px 2px 0 0',background:`linear-gradient(180deg,${color},${color}66)`,boxShadow:`0 0 4px ${color}44`}}/>
      ))}
    </div>
  );
}

export default function FlowHome({user,onNavigate,onLogout}:Props){
  const [tab,setTab]=useState(0);
  const t=TABS[tab];
  const isPro=user?.is_pro||user?.plan==='unlimited';

  const RECENT=[
    {t:'Gospel — domingo',s:'Hace 2 horas · 7 stems',type:'Mezcla',c:'#ec4899',screen:'studio'},
    {t:'Generación: pop electrónico',s:'Ayer · 3:00 · 10 créditos',type:'Creación',c:'#a3e635',screen:'create'},
    {t:'Beat trap 808',s:'Hace 3 días · 5 stems',type:'Separación',c:'#a855f7',screen:'separate'},
  ];

  return(
    <div style={{width:'100%',minHeight:'100vh',background:'radial-gradient(ellipse at 80% 0%,rgba(192,38,211,0.12),transparent 50%),radial-gradient(ellipse at 0% 100%,rgba(162,89,255,0.1),transparent 50%),#0a0612',fontFamily:'-apple-system,BlinkMacSystemFont,"DM Sans",system-ui,sans-serif',color:'#F8F0FF'}}>
      <FlowNav active="home" onNavigate={onNavigate} user={user} onLogout={onLogout}/>

      <div style={{maxWidth:1140,margin:'0 auto',padding:'36px 24px 60px'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:28,flexWrap:'wrap',gap:14}}>
          <div>
            <h1 style={{fontSize:'clamp(28px,5vw,40px)',fontWeight:700,margin:0,letterSpacing:-0.8}}>
              Hola, <span style={{color:t.color}}>{user?.firstName||'Músico'}</span> 👋
            </h1>
            <p style={{fontSize:14,color:'rgba(248,240,255,0.5)',margin:'6px 0 0'}}>Tu estudio de música con Inteligencia Artificial</p>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
            <button onClick={()=>onNavigate('billing')} style={{padding:'8px 16px',borderRadius:980,background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.25)',color:'#fbbf24',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
              {isPro?'∞':'⚡'} {isPro?'∞':''+user?.credits} créditos
            </button>
            <button onClick={()=>onNavigate('billing')} style={{padding:'8px 16px',borderRadius:980,background:'rgba(192,38,211,0.1)',border:'1px solid rgba(192,38,211,0.3)',color:'#C026D3',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
              {isPro?'∞ Plan Creador Pro':'Plan Gratis'}
            </button>
            <button onClick={()=>onNavigate('create')} style={{padding:'9px 20px',borderRadius:980,background:'linear-gradient(135deg,#C026D3,#ec4899)',border:'none',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 0 20px rgba(192,38,211,0.4)',display:'flex',alignItems:'center',gap:6}}>
              <span>✦</span> Crear canción
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,marginBottom:20,background:'rgba(26,16,40,0.4)',borderRadius:12,padding:5,flexWrap:'wrap'}}>
          {TABS.map((tb,i)=>(
            <button key={tb.id} onClick={()=>setTab(i)}
              style={{flex:1,minWidth:120,padding:'10px 8px',borderRadius:9,background:tab===i?tb.colorDim:'transparent',border:tab===i?`1px solid ${tb.color}44`:'1px solid transparent',color:tab===i?tb.color:'rgba(248,240,255,0.45)',fontSize:11.5,fontWeight:tab===i?600:400,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'all 0.15s'}}>
              <span style={{fontSize:14}}>{tb.icon}</span>
              <span style={{whiteSpace:'nowrap'}}>{tb.label}</span>
            </button>
          ))}
        </div>

        {/* Feature card */}
        <div style={{borderRadius:16,background:'rgba(15,9,28,0.8)',border:`1px solid ${t.color}22`,overflow:'hidden',marginBottom:32,backdropFilter:'blur(12px)'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',minHeight:240}}>
            {/* Left */}
            <div style={{padding:'28px 32px',display:'flex',flexDirection:'column',justifyContent:'space-between'}}>
              <div>
                <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 12px',borderRadius:980,background:`${t.color}18`,border:`0.5px solid ${t.color}44`,marginBottom:14}}>
                  <span style={{fontSize:11,color:'#fbbf24'}}>⭐</span>
                  <span style={{fontSize:11,fontWeight:500,color:t.color}}>{t.cost}</span>
                </div>
                <h2 style={{fontSize:28,fontWeight:700,margin:'0 0 8px',letterSpacing:-0.5}}>{t.title}</h2>
                <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
                  {t.sub.split(' · ').map(s=>(
                    <span key={s} style={{fontSize:11,color:t.color,fontFamily:'monospace'}}>{s} ·</span>
                  ))}
                </div>
                <p style={{fontSize:14,color:'rgba(248,240,255,0.6)',lineHeight:1.6,margin:0}}>{t.desc}</p>
              </div>
              <div style={{marginTop:20,display:'flex',flexDirection:'column',gap:8}}>
                <button onClick={()=>onNavigate(t.id)}
                  style={{padding:'12px 28px',borderRadius:980,background:`linear-gradient(135deg,${t.color},${t.color}cc)`,border:'none',color:t.id==='create'?'#000':'#fff',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 0 24px ${t.color}55`,display:'inline-flex',alignItems:'center',gap:7,alignSelf:'flex-start'}}>
                  {t.cta} →
                </button>
                <span style={{fontSize:11,color:'rgba(248,240,255,0.35)',display:'flex',alignItems:'center',gap:5}}>
                  <span style={{color:'#10b981'}}>✓</span> Sin tarjeta de crédito
                </span>
              </div>
            </div>
            {/* Right preview */}
            <div style={{padding:'24px',background:`linear-gradient(135deg,${t.color}08,rgba(8,4,16,0.4))`,borderLeft:`1px solid ${t.color}18`,display:'flex',flexDirection:'column',gap:16}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:1.5,color:t.color,textTransform:'uppercase'}}>{t.preview.label}</div>
              <Bars color={t.color}/>
              {'tracks' in t.preview&&(
                <div style={{display:'flex',flexDirection:'column',gap:7}}>
                  {t.preview.tracks.map((tr,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:11}}>
                      <div style={{display:'flex',alignItems:'center',gap:7}}>
                        <div style={{width:7,height:7,borderRadius:'50%',background:tr.c}}/>
                        <span style={{color:'rgba(248,240,255,0.7)'}}>{tr.n}</span>
                        <span style={{color:'rgba(248,240,255,0.35)'}}>{tr.v>0?'+':''}{tr.v}dB · {tr.fx}</span>
                      </div>
                      <div style={{padding:'2px 8px',borderRadius:4,border:`0.5px solid ${tr.c}44`,fontSize:9,color:tr.c,fontWeight:600}}>stem.wav ✓</div>
                    </div>
                  ))}
                </div>
              )}
              {'badges' in t.preview&&(
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                    {t.preview.badges.map(b=>(
                      <span key={b} style={{padding:'4px 10px',borderRadius:980,background:`${t.color}12`,border:`0.5px solid ${t.color}33`,fontSize:11,color:t.color,fontWeight:500}}>{b}</span>
                    ))}
                  </div>
                  {'quote' in t.preview&&<div style={{fontSize:12,color:'rgba(248,240,255,0.5)',fontStyle:'italic',lineHeight:1.5,padding:'10px 14px',background:'rgba(0,0,0,0.2)',borderRadius:8,border:`0.5px solid ${t.color}18`}}>{t.preview.quote}</div>}
                </div>
              )}
              {'stems' in t.preview&&(
                <div style={{display:'flex',flexDirection:'column',gap:7}}>
                  {t.preview.stems.map((s,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:11}}>
                      <div style={{display:'flex',alignItems:'center',gap:7}}>
                        <div style={{width:7,height:7,borderRadius:'50%',background:s.c}}/>
                        <span style={{color:'rgba(248,240,255,0.7)'}}>{s.l}</span>
                      </div>
                      <div style={{padding:'2px 8px',borderRadius:4,border:`0.5px solid ${s.c}44`,fontSize:9,color:s.c,fontWeight:600}}>stem.wav ✓</div>
                    </div>
                  ))}
                </div>
              )}
              {'insts' in t.preview&&(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                  {t.preview.insts.map(inst=>(
                    <div key={inst} style={{padding:'8px 12px',borderRadius:8,background:'rgba(168,85,247,0.08)',border:'0.5px solid rgba(168,85,247,0.2)',fontSize:11,color:'rgba(248,240,255,0.7)',fontWeight:500}}>{inst}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom 4 mini cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:36}}>
          {TABS.map((tb,i)=>(
            <button key={tb.id} onClick={()=>{setTab(i);onNavigate(tb.id);}}
              style={{padding:'14px 12px',borderRadius:12,background:'rgba(15,9,28,0.6)',border:`1px solid ${tab===i?tb.color+'55':tb.color+'18'}`,cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all 0.15s'}}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=tb.color+'66';}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=tab===i?tb.color+'55':tb.color+'18';}}>
              <div style={{fontSize:18,marginBottom:7}}>{tb.icon}</div>
              <div style={{fontSize:12,fontWeight:600,color:'#F8F0FF',marginBottom:3}}>{tb.label}</div>
              <div style={{fontSize:10,color:tb.color}}>{tb.cost}</div>
            </button>
          ))}
        </div>

        {/* Recientes */}
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <span style={{fontSize:16,fontWeight:600}}>Recientes</span>
            <button style={{fontSize:11,color:t.color,background:'transparent',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Ver todo →</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
            {RECENT.map(r=>(
              <div key={r.t} onClick={()=>onNavigate(r.screen)}
                style={{padding:'14px',borderRadius:12,background:'rgba(15,9,28,0.6)',border:'1px solid rgba(192,38,211,0.12)',cursor:'pointer',display:'flex',alignItems:'center',gap:12,transition:'all 0.15s'}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(192,38,211,0.3)';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='rgba(192,38,211,0.12)';}}>
                {/* Thumbnail */}
                <div style={{width:48,height:48,borderRadius:10,background:`linear-gradient(135deg,${r.c}33,${r.c}11)`,border:`1px solid ${r.c}33`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <div style={{display:'flex',alignItems:'flex-end',gap:1.5,height:24}}>
                    {[0.4,0.8,1,0.6,0.9,0.5,0.7].map((h,i)=>(
                      <div key={i} style={{width:3,height:`${h*100}%`,background:r.c,borderRadius:1}}/>
                    ))}
                  </div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,color:'#F8F0FF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.t}</div>
                  <div style={{fontSize:11,color:'rgba(248,240,255,0.45)',marginTop:2}}>{r.s}</div>
                  <div style={{fontSize:10,color:r.c,marginTop:4,fontWeight:500}}>{r.type}</div>
                </div>
                <button style={{width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'0.5px solid rgba(255,255,255,0.1)',color:'#F8F0FF',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,fontSize:12}}>▶</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
