import { isUsingOAuth, mergeSharedOAuthProviderSettings } from '@shared/oauth'
import { ModelProviderEnum } from '@shared/types'
import { getDefaultStore } from 'jotai'
import platform from '@/platform'
import * as atoms from './atoms'
import { isChatboxAIProPlan } from './licensePlan'
import { settingsStore } from './settingsStore'

export function needEditSetting() {
  const settings = settingsStore.getState()

  if (settings.licenseKey) {
    return false
  }

  if (settings.providers && Object.keys(settings.providers).length > 0) {
    const providers = settings.providers
    const keys = Object.keys(settings.providers)
    if (
      keys.filter((key) => {
        const providerSettings = mergeSharedOAuthProviderSettings(key, providers)
        return !!providerSettings.apiKey || isUsingOAuth(providerSettings, platform.type)
      }).length > 0
    ) {
      return false
    }
    // Bedrock configured with AWS credentials
    if (providers[ModelProviderEnum.Bedrock]?.accessKey && providers[ModelProviderEnum.Bedrock]?.secretKey) {
      return false
    }
    if (
      keys.filter(
        (key) =>
          (key === ModelProviderEnum.Ollama ||
            key === ModelProviderEnum.LMStudio ||
            key.startsWith('custom-provider')) &&
          providers[key].models?.length
      ).length > 0
    ) {
      return false
    }
  }
  return true
}

export function getLanguage() {
  return settingsStore.getState().language
}

export function getProxy() {
  return settingsStore.getState().proxy
}

export function getLicenseKey() {
  return settingsStore.getState().licenseKey
}

export function getLicenseDetail() {
  return settingsStore.getState().licenseDetail
}

export function isPaid() {
  return !!getLicenseKey()
}

export function isPro() {
  const settings = settingsStore.getState()
  return !!settings.licenseKey && isChatboxAIProPlan(settings.licenseDetail, settings.licensePlanName)
}

export function getRemoteConfig() {
  const store = getDefaultStore()
  return store.get(atoms.remoteConfigAtom)
}

export function getAutoGenerateTitle() {
  return settingsStore.getState().autoGenerateTitle
}

export function getExtensionSettings() {
  return settingsStore.getState().extension
}
