import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the settings actions before importing the module under test
vi.mock('@/stores/settingActions', () => ({
  getExtensionSettings: vi.fn(),
  getLanguage: vi.fn(() => 'en'),
  getLicenseKey: vi.fn(() => 'test-license-key'),
}))

// Mock the search providers to avoid actual network calls
vi.mock('./bing', () => {
  return {
    BingSearch: class {
      search = vi.fn().mockResolvedValue({
        items: [{ title: 'Bing Result', snippet: 'test', link: 'https://example.com' }],
      })
    },
  }
})

vi.mock('./bing-news', () => {
  return {
    BingNewsSearch: class {
      search = vi.fn().mockResolvedValue({ items: [] })
    },
  }
})

vi.mock('./google', () => {
  return {
    GoogleSearch: class {
      constructor(
        private readonly apiKey: string,
        private readonly cx: string
      ) {}
      search = vi.fn().mockImplementation(async () => {
        await Promise.resolve()
        if (this.apiKey === 'failing-key') throw new Error('Google unavailable')
        return { items: [{ title: 'Google Result', snippet: 'test', link: 'https://google.com' }] }
      })
    },
  }
})

import { getExtensionSettings } from '@/stores/settingActions'
import { webSearchExecutor } from './index'

const mockGetExtensionSettings = vi.mocked(getExtensionSettings)

describe('webSearchExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns different results for different providers with same query', async () => {
    // First call with bing
    mockGetExtensionSettings.mockReturnValue({
      webSearch: { provider: 'bing' },
    } as ReturnType<typeof getExtensionSettings>)

    const bingResult = await webSearchExecutor({ query: 'test query' }, {})
    expect(bingResult.searchResults).toHaveLength(1)
    expect(bingResult.searchResults[0].title).toBe('Bing Result')

    // Same query but different provider should NOT return cached bing results
    mockGetExtensionSettings.mockReturnValue({
      webSearch: { provider: 'google', googleApiKey: 'test-key', googleCx: 'test-cx' },
    } as ReturnType<typeof getExtensionSettings>)

    const googleResult = await webSearchExecutor({ query: 'test query' }, {})
    expect(googleResult.searchResults).toHaveLength(1)
    expect(googleResult.searchResults[0].title).toBe('Google Result')
  })

  it('returns cached results for same provider and query', async () => {
    mockGetExtensionSettings.mockReturnValue({
      webSearch: { provider: 'bing' },
    } as ReturnType<typeof getExtensionSettings>)

    const result1 = await webSearchExecutor({ query: 'cached query' }, {})
    const result2 = await webSearchExecutor({ query: 'cached query' }, {})

    // Both should return same results (cached)
    expect(result1.searchResults).toEqual(result2.searchResults)
  })

  it('throws an error if google credentials are missing', async () => {
    mockGetExtensionSettings.mockReturnValue({
      webSearch: { provider: 'google', googleApiKey: '', googleCx: '' },
    } as ReturnType<typeof getExtensionSettings>)

    await expect(webSearchExecutor({ query: 'missing credentials' }, {})).rejects.toThrow(
      'Google Search requires an API Key and Search Engine ID (CX).'
    )
  })

  it('propagates the provider error when configured provider fails', async () => {
    mockGetExtensionSettings.mockReturnValue({
      webSearch: { provider: 'google', googleApiKey: 'failing-key', googleCx: 'cx' },
    } as ReturnType<typeof getExtensionSettings>)

    await expect(webSearchExecutor({ query: 'provider failure' }, {})).rejects.toThrow('Google unavailable')
  })
})
