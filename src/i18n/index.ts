import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import messages from './local/index';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: typeof document !== 'undefined' ? document.documentElement.dataset.pageLanguage : undefined,
    supportedLngs: ['es', 'en', 'fr', 'zh'],
    fallbackLng: 'es',
    nonExplicitSupportedLngs: true,
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'mixingmusic_locale',
      caches: ['localStorage'],
    },
    debug: false,
    resources: messages,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
