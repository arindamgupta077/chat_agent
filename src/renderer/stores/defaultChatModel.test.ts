import { ModelProviderEnum } from '@shared/types'
import { describe, expect, it } from 'vitest'
import {
  applyChatboxLicenseDefaultModelToSession,
  type ChatboxDefaultModelSettings,
  resolveChatboxLicenseDefaultModel,
} from './defaultChatModel'

function makeSettings(overrides: Partial<ChatboxDefaultModelSettings> = {}): ChatboxDefaultModelSettings {
  return {
    hasExpiredLicense: false,
    ...overrides,
  }
}

describe('resolveChatboxLicenseDefaultModel', () => {
  it('does not resolve Chatbox AI models as default model', () => {
    expect(resolveChatboxLicenseDefaultModel(makeSettings())).toBeUndefined()
    expect(
      resolveChatboxLicenseDefaultModel(
        makeSettings({
          licenseKey: 'license-key',
          licenseDetail: {
            name: 'Chatbox AI Pro',
            defaultModel: 'chatboxai-4',
          },
        })
      )
    ).toBeUndefined()
    expect(
      resolveChatboxLicenseDefaultModel(
        makeSettings({
          licenseKey: 'license-key',
          licensePlanName: 'Chatbox AI Pro',
        })
      )
    ).toBeUndefined()
  })
})

describe('applyChatboxLicenseDefaultModelToSession', () => {
  it('keeps preset chat sessions unchanged without applying Chatbox AI defaults', () => {
    const session = {
      type: 'chat' as const,
      settings: undefined,
    }

    expect(applyChatboxLicenseDefaultModelToSession(session, makeSettings())).toBe(session)
    expect(
      applyChatboxLicenseDefaultModelToSession(
        session,
        makeSettings({
          licenseKey: 'license-key',
          licenseDetail: {
            name: 'Chatbox AI Pro',
            defaultModel: 'chatboxai-4',
          },
        })
      )
    ).toBe(session)
  })

  it('does not override an existing preset session model', () => {
    const session = {
      type: 'chat' as const,
      settings: {
        provider: ModelProviderEnum.OpenAI,
        modelId: 'gpt-4o',
      },
    }

    expect(
      applyChatboxLicenseDefaultModelToSession(
        session,
        makeSettings({
          licenseKey: 'license-key',
          licenseDetail: {
            name: 'Chatbox AI Pro',
            defaultModel: 'chatboxai-4',
          },
        })
      )
    ).toBe(session)
  })

  it('does not apply chat defaults to picture sessions', () => {
    const session = {
      type: 'picture' as const,
      settings: undefined,
    }

    expect(
      applyChatboxLicenseDefaultModelToSession(
        session,
        makeSettings({
          licenseKey: 'license-key',
          licenseDetail: {
            name: 'Chatbox AI Pro',
            defaultModel: 'chatboxai-4',
          },
        })
      )
    ).toBe(session)
  })
})
