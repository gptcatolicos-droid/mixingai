// ─── Tipos compartidos del Mixer ─────────────────────────────────────────────
export interface MixPreset {
  id: string;
  name: string;
  desc: string;
  color: string;
  bass: number;
  mid: number;
  high: number;
  compression: 'none' | 'low' | 'medium' | 'high' | 'max';
  reverbWet: number;
  delayWet: number;
  stereoWidth: number;
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
  { id:'acustico', name:'Acústico', desc:'Guitarra y voz naturales, espacio íntimo', color:'#A78BFA',
    bass:-1, mid:3, high:2, compression:'low', reverbWet:0.25, delayWet:0, stereoWidth:0.45,
    tags:['Guitarra','Natural'], wavePattern:[.4,.5,.6,.5,.4,.6,.7,.6,.5,.4,.5,.6,.5,.4,.3,.4] },
  { id:'gospel', name:'Gospel', desc:'Coro potente, voces llenas, reverb de iglesia', color:'#FBBF24',
    bass:2, mid:3, high:3, compression:'medium', reverbWet:0.45, delayWet:0.05, stereoWidth:0.7,
    tags:['Coro','Iglesia'], wavePattern:[.5,.6,.7,.8,.9,.8,.7,.8,.9,.8,.7,.6,.7,.8,.7,.6] },
];
