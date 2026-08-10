import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type Dictionary = Record<string, Record<string, string>>;
const copy: Dictionary = {
  'Probar gratis': { en: 'Try for free', fr: 'Essayer gratuitement', zh: '免费试用' },
  'Crear una mezcla': { en: 'Create a mix', fr: 'Créer un mix', zh: '创建混音' },
  'Mejorar una mezcla': { en: 'Enhance a mix', fr: 'Améliorer un mix', zh: '改善混音' },
  'Masterizar una mezcla': { en: 'Master a mix', fr: 'Masteriser un mix', zh: '为混音做母带' },
  'Guardar y salir': { en: 'Save and exit', fr: 'Enregistrer et quitter', zh: '保存并退出' },
  'Master individual': { en: 'Single master', fr: 'Master individuel', zh: '单曲母带' },
  'MODO ÁLBUM · UNLIMITED': { en: 'ALBUM MODE · UNLIMITED', fr: 'MODE ALBUM · UNLIMITED', zh: '专辑模式 · UNLIMITED' },
  'Un álbum. Una identidad sonora.': { en: 'One album. One sonic identity.', fr: 'Un album. Une identité sonore.', zh: '一张专辑，一个声音身份。' },
  'Sube las mezclas de tu álbum': { en: 'Upload your album mixes', fr: 'Importez les mixes de votre album', zh: '上传你的专辑混音' },
  'Configuración del álbum': { en: 'Album settings', fr: 'Réglages de l’album', zh: '专辑设置' },
  'Descargar álbum completo': { en: 'Download complete album', fr: 'Télécharger l’album complet', zh: '下载完整专辑' },
  'ORIGINAL': { en: 'ORIGINAL', fr: 'ORIGINAL', zh: '原始文件' },
  'MASTER V3': { en: 'MASTER V3', fr: 'MASTER V3', zh: '母带 V3' },
  'Escucha el resultado.': { en: 'Listen to the result.', fr: 'Écoutez le résultat.', zh: '聆听结果。' },
  'Comparar con volumen igualado': { en: 'Compare at matched loudness', fr: 'Comparer à volume égalisé', zh: '匹配音量后比较' },
  'Ajustar sonido': { en: 'Adjust sound', fr: 'Ajuster le son', zh: '调整声音' },
  'Descargar MP3 320 kbps': { en: 'Download MP3 320 kbps', fr: 'Télécharger MP3 320 kbps', zh: '下载 MP3 320 kbps' },
  'Descargar WAV 24-bit': { en: 'Download WAV 24-bit', fr: 'Télécharger WAV 24-bit', zh: '下载 24-bit WAV' },
  'Modo álbum es una función premium': { en: 'Album mode is a premium feature', fr: 'Le mode album est une fonction premium', zh: '专辑模式是高级功能' },
  'Blog': { en: 'Blog', fr: 'Blog', zh: '博客' },
  'Precios': { en: 'Pricing', fr: 'Tarifs', zh: '价格' },
};

function translateTree(language: string) {
  if (language === 'es') return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach((node) => {
    const parent = node.parentElement;
    if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'OPTION'].includes(parent.tagName)) return;
    const raw = node.nodeValue || '';
    const trimmed = raw.trim();
    const replacement = copy[trimmed]?.[language];
    if (replacement && replacement !== trimmed) node.nodeValue = raw.replace(trimmed, replacement);
  });
}

export default function RuntimeLocaleTranslator() {
  const { i18n } = useTranslation();
  useEffect(() => {
    translateTree(i18n.resolvedLanguage || 'es');
    const observer = new MutationObserver(() => translateTree(i18n.resolvedLanguage || 'es'));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [i18n.resolvedLanguage]);
  return null;
}
