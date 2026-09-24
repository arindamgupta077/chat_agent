import { type Session, type SessionSettings, SessionSettingsSchema } from '@shared/types'
import { useMemo } from 'react'
import { rendererApplication } from '@/app/renderer-application'
import type { TokenModel } from '@/packages/token'
import * as defaults from '../../../shared/defaults'
import { useAppAuthStore } from '../appAuthStore'
import { settingsStore, useSettingsStore } from '../settingsStore'

const useSession = (sessionId: string | null) => rendererApplication.sessionHooks.useSession(sessionId)

function mergeDefaultSessionSettings(session: Session): SessionSettings {
  const user = useAppAuthStore.getState().user
  const isAdmin = user?.role === 'admin'
  const defaultChatModel = settingsStore.getState().getSettings().defaultChatModel

  if (session.type === 'picture') {
    return SessionSettingsSchema.parse({
      ...defaults.pictureSessionSettings(),
      ...session.settings,
    })
  } else {
    const chatSettings = {
      ...defaults.chatSessionSettings(),
      ...session.settings,
    }
    // If not admin, strictly enforce administrator's chosen model
    if (!isAdmin && defaultChatModel?.provider && defaultChatModel?.model) {
      chatSettings.provider = defaultChatModel.provider
      chatSettings.modelId = defaultChatModel.model
    }
    return SessionSettingsSchema.parse(chatSettings)
  }
}

// session settings is copied from global settings when session is created, so no need to merge global settings here
export function useSessionSettings(sessionId: string | null) {
  const { session } = useSession(sessionId)
  const globalSettings = useSettingsStore((state) => state)

  const sessionSettings = useMemo(() => {
    if (!session) {
      const parsed = SessionSettingsSchema.parse(globalSettings)
      const user = useAppAuthStore.getState().user
      if (user?.role !== 'admin' && globalSettings.defaultChatModel?.provider && globalSettings.defaultChatModel?.model) {
        parsed.provider = globalSettings.defaultChatModel.provider
        parsed.modelId = globalSettings.defaultChatModel.model
      }
      return parsed
    }
    return mergeDefaultSessionSettings(session)
  }, [session, globalSettings])

  return { sessionSettings }
}

export async function getSessionSettings(sessionId: string) {
  const session = await rendererApplication.sessionQueryBridge.getSession(sessionId)
  if (!session) {
    const globalSettings = settingsStore.getState().getSettings()
    const parsed = SessionSettingsSchema.parse(globalSettings)
    const user = useAppAuthStore.getState().user
    if (user?.role !== 'admin' && globalSettings.defaultChatModel?.provider && globalSettings.defaultChatModel?.model) {
      parsed.provider = globalSettings.defaultChatModel.provider
      parsed.modelId = globalSettings.defaultChatModel.model
    }
    return parsed
  }
  return mergeDefaultSessionSettings(session)
}

/**
 * The session's chat model as a token-estimation model ref. This is the same
 * resolution the InputBox feeds into useTokenEstimation, so counts cached
 * against it (e.g. the draft worker's) stay addressable from non-React code.
 */
export function getSessionTokenModel(session: Session): TokenModel | undefined {
  const { provider, modelId } = mergeDefaultSessionSettings(session)
  return provider && modelId ? { provider, modelId } : undefined
}
