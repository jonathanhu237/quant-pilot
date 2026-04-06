import { getLocales } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import zhCN from '@/locales/zh-CN.json';

function normalizeLanguageTag(languageTag?: string) {
  if (!languageTag) {
    return 'en';
  }

  return languageTag.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

const resources = {
  en: {
    translation: en,
  },
  'zh-CN': {
    translation: zhCN,
  },
} as const;

const i18n = i18next;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: normalizeLanguageTag(getLocales()[0]?.languageTag),
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh-CN'],
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export default i18n;
