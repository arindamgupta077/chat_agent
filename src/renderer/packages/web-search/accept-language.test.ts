import { describe, expect, it, vi } from 'vitest'
import { getSearchAcceptLanguage } from './accept-language'

const mockSettings = vi.hoisted(() => ({
  language: 'en',
}))

vi.mock('@/stores/settingActions', () => ({
  getLanguage: () => mockSettings.language,
}))

describe('getSearchAcceptLanguage', () => {
  it('maps English app language to English search preference', () => {
    mockSettings.language = 'en'

    expect(getSearchAcceptLanguage()).toBe('en-US,en;q=0.9')
  })

  it('falls back to English search preference for unknown language', () => {
    mockSettings.language = 'unknown' as any

    expect(getSearchAcceptLanguage()).toBe('en-US,en;q=0.9')
  })
})
