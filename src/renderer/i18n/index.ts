import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { authErrorOverrides } from './auth-error-overrides'
import changelogEn from './changelogs/changelog_en'
import en from './locales/en/translation.json'

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: { ...en, ...authErrorOverrides.en },
    },
  },
  fallbackLng: 'en',

  interpolation: {
    escapeValue: false,
  },

  detection: {
    caches: [],
  },
})

export default i18n

export function changelog() {
  return changelogEn
}
