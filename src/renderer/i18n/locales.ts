import type { Language } from '../../shared/types'

export const languageNameMap: Record<Language, string> = {
  en: 'English',
}

export const languages = Array.from(Object.keys(languageNameMap)) as Language[]
