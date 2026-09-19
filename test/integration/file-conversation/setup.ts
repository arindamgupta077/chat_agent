import { vi } from 'vitest'
import platform from '../../../src/renderer/platform'
import type TestPlatform from '../../../src/renderer/platform/test_platform'

const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(() => null),
}
;(globalThis as any).localStorage = localStorageMock

if (typeof globalThis.window === 'undefined') {
  ;(globalThis as any).window = {
    localStorage: localStorageMock,
  }
}

vi.mock('@/stores/settingActions', () => ({
  getLicenseKey: () => process.env.CHATBOX_LICENSE_KEY || '',
  isPro: () => !!process.env.CHATBOX_LICENSE_KEY,
  getRemoteConfig: () => ({}),
}))

// Mock settingsStore
vi.mock('@/stores/settingsStore', () => ({
  settingsStore: {
    getState: () => ({
      getSettings: () => ({
        licenseKey: process.env.CHATBOX_LICENSE_KEY || '',
        language: 'en',
      }),
    }),
  },
}))

vi.mock('@/stores/uiStore', () => ({
  uiStore: {
    getState: () => ({
      inputBoxWebBrowsingMode: false,
      sessionKnowledgeBaseMap: {},
    }),
  },
}))

vi.mock('@/packages/mcp/controller', () => ({
  mcpController: {
    getAvailableTools: () => ({}),
  },
}))

// Mock router
vi.mock('@/router', () => ({
  router: {
    navigate: vi.fn(),
  },
}))

// Mock tracking
vi.mock('@/utils/track', () => ({
  trackEvent: vi.fn(),
}))

export function getTestPlatform(): TestPlatform {
  return platform as TestPlatform
}

export function resetTestPlatform(): void {
  ;(platform as TestPlatform).clear()
}
