import { useEffect } from 'react'
import { settingsStore } from '@/stores/settingsStore'

export function useSystemLanguageWhenInit() {
  useEffect(() => {
    setTimeout(() => {
      const { languageInited } = settingsStore.getState()
      if (!languageInited) {
        settingsStore.setState({
          language: 'en',
          languageInited: true,
        })
      } else {
        settingsStore.setState({
          languageInited: true,
        })
      }
    }, 2000)
  }, [])
}
