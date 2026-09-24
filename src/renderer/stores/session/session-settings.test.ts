import { describe, expect, it, beforeEach } from 'vitest'
import { useAppAuthStore } from '../appAuthStore'
import { settingsStore } from '../settingsStore'
import { getSessionTokenModel } from './session-settings'
import type { Session } from '@shared/types'

describe('session-settings admin model enforcement', () => {
  beforeEach(() => {
    // Reset settingsStore
    settingsStore.setState({
      defaultChatModel: {
        provider: 'openrouter',
        model: 'openai/gpt-5.4-mini',
      },
    })
  })

  it('enforces admin defaultChatModel for non-admin users regardless of session settings', () => {
    // Set non-admin user
    useAppAuthStore.setState({
      user: {
        id: 'user-123',
        username: 'regular_user',
        email: 'user@example.com',
        role: 'user',
      },
      isAuthenticated: true,
    })

    const session: Session = {
      id: 'session-1',
      name: 'Test Chat',
      type: 'chat',
      threadName: '',
      messages: [],
      settings: {
        provider: 'some-other-provider',
        modelId: 'legacy-model',
      },
    }

    const tokenModel = getSessionTokenModel(session)
    expect(tokenModel).toEqual({
      provider: 'openrouter',
      modelId: 'openai/gpt-5.4-mini',
    })
  })

  it('allows admin users to maintain their session-specific model choices', () => {
    // Set admin user
    useAppAuthStore.setState({
      user: {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@agentlab.local',
        role: 'admin',
      },
      isAuthenticated: true,
    })

    const session: Session = {
      id: 'session-2',
      name: 'Admin Chat',
      type: 'chat',
      threadName: '',
      messages: [],
      settings: {
        provider: 'custom-provider',
        modelId: 'custom-model',
      },
    }

    const tokenModel = getSessionTokenModel(session)
    expect(tokenModel).toEqual({
      provider: 'custom-provider',
      modelId: 'custom-model',
    })
  })
})
