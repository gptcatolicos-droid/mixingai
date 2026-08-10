import { useTranslation } from 'react-i18next';

const languages = [
  ['es', 'ES', 'Español'], ['en', 'EN', 'English'], ['fr', 'FR', 'Français'], ['zh', '中文', '中文'],
] as const;

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage || 'es';
  const change = (language: string) => {
    i18n.changeLanguage(language);
    localStorage.setItem('mixingmusic_locale', language);
    const stored = JSON.parse(localStorage.getItem('audioMixerUser') || '{}');
    if (stored?.id) {
      const updated = { ...stored, preferred_locale: language };
      localStorage.setItem('audioMixerUser', JSON.stringify(updated));
      const url = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_URL;
      const key = (import.meta as any).env?.VITE_PUBLIC_SUPABASE_ANON_KEY;
      if (url && key && updated.accessToken) fetch(`${url}/rest/v1/users?id=eq.${updated.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${updated.accessToken}` },
        body: JSON.stringify({ preferred_locale: language }),
      }).catch(() => undefined);
    }
    document.documentElement.lang = language === 'zh' ? 'zh-Hans' : language;
  };
  return <label className="site-language" title={t('language')}>
    <span className="sr-only">{t('language')}</span>
    <select value={current} onChange={(event) => change(event.target.value)} aria-label={t('language')}>
      {languages.map(([code, short, name]) => <option key={code} value={code}>{short} · {name}</option>)}
    </select>
  </label>;
}
