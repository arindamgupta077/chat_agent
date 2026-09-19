import type { Language } from '@shared/types'
import { getLanguage } from '@/stores/settingActions'

const ACCEPT_LANGUAGE_BY_APP_LANGUAGE: Record<Language, string> = {
  en: 'en-US,en;q=0.9',
}

export function getSearchAcceptLanguage() {
  return ACCEPT_LANGUAGE_BY_APP_LANGUAGE[getLanguage()] ?? ACCEPT_LANGUAGE_BY_APP_LANGUAGE.en
}
