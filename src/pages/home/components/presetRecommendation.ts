import { PRESETS } from './mixTypes';
import type { MixPreset } from './mixTypes';
import type { AudioFileAnalysis } from '../../mastering/audioAnalysis';

export interface PresetRecommendation {
  preset: MixPreset;
  reason: string;
  confidence: 'alta' | 'media';
}

const findPreset = (id: string) => PRESETS.find((preset) => preset.id === id) ?? PRESETS[0];

const filenameRules: Array<{ id: string; terms: string[]; reason: string }> = [
  { id: 'gospel', terms: ['gospel', 'coro', 'choir', 'worship', 'iglesia'], reason: 'Detectamos voces de coro o referencias de música gospel.' },
  { id: 'acustico', terms: ['acoustic', 'acustico', 'acústico', 'nylon', 'guitarra', 'guitar', 'voz'], reason: 'Detectamos una instrumentación íntima de guitarra o voz.' },
  { id: 'reggaeton', terms: ['reggaeton', 'dembow', 'perreo'], reason: 'Detectamos referencias rítmicas de reggaetón o dembow.' },
  { id: 'hiphop', terms: ['hiphop', 'hip hop', 'trap', '808', 'rap'], reason: 'Detectamos elementos habituales de hip hop, trap o 808.' },
  { id: 'dance', terms: ['dance', 'edm', 'house', 'techno', 'club'], reason: 'Detectamos una producción electrónica orientada a pista.' },
  { id: 'rock', terms: ['rock', 'distortion', 'distorsion', 'distorsión', 'riff'], reason: 'Detectamos guitarras o referencias de producción rock.' },
  { id: 'clasica', terms: ['clasica', 'clásica', 'classical', 'orquesta', 'orchestra', 'strings'], reason: 'Detectamos una instrumentación orquestal o clásica.' },
  { id: 'balada', terms: ['balada', 'ballad', 'romantica', 'romántica'], reason: 'Detectamos una canción vocal de carácter suave o romántico.' },
  { id: 'pop', terms: ['pop'], reason: 'Detectamos una producción pop centrada en claridad y presencia vocal.' },
];

export function recommendPresetFromFiles(files: File[]): PresetRecommendation {
  const source = files.map((file) => file.name.toLowerCase()).join(' ');
  const matched = filenameRules.find((rule) => rule.terms.some((term) => source.includes(term)));
  if (matched) return { preset: findPreset(matched.id), reason: matched.reason, confidence: 'alta' };

  const stemNames = source.split(/\s+/);
  const hasVoice = stemNames.some((name) => /vox|vocal|voice|voz/.test(name));
  const hasGuitar = stemNames.some((name) => /gtr|guitar|guitarra/.test(name));
  if (hasVoice && hasGuitar && files.length <= 5) {
    return { preset: findPreset('acustico'), reason: 'La sesión tiene pocos stems y combina voz con guitarra; recomendamos conservar un sonido natural.', confidence: 'media' };
  }
  return { preset: findPreset('pop'), reason: 'La sesión no declara un género claro; Pop ofrece un punto de partida equilibrado y fácil de ajustar.', confidence: 'media' };
}

export function recommendPresetFromAnalysis(file: File, analysis: AudioFileAnalysis): PresetRecommendation {
  const named = recommendPresetFromFiles([file]);
  if (named.confidence === 'alta') return named;

  if (analysis.crestFactorDb >= 15 && analysis.integratedLufs <= -18) {
    return { preset: findPreset('acustico'), reason: 'La mezcla conserva bastante dinámica y un nivel natural; recomendamos un master acústico y transparente.', confidence: 'media' };
  }
  if (analysis.crestFactorDb >= 18) {
    return { preset: findPreset('clasica'), reason: 'La mezcla tiene un rango dinámico amplio; recomendamos mínima compresión y mayor naturalidad.', confidence: 'media' };
  }
  if (analysis.crestFactorDb <= 8 || analysis.integratedLufs >= -11) {
    return { preset: findPreset('dance'), reason: 'La mezcla es densa y compacta; recomendamos un perfil con control firme y amplitud estéreo.', confidence: 'media' };
  }
  if (analysis.crestFactorDb <= 11) {
    return { preset: findPreset('rock'), reason: 'La mezcla tiene ataque y densidad media-alta; recomendamos un perfil con presencia y pegada.', confidence: 'media' };
  }
  return { preset: findPreset('pop'), reason: 'El balance dinámico es versátil; recomendamos Pop como punto de partida claro y equilibrado.', confidence: 'media' };
}
