import { ofetch } from 'ofetch'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import platform from '@/platform'
import WebSearch from './base'

vi.mock('ofetch', () => ({
  ofetch: vi.fn().mockResolvedValue('mock-response'),
}))

vi.mock('@capacitor/core', () => ({
  CapacitorHttp: {
    request: vi.fn().mockResolvedValue({ data: 'capacitor-response' }),
  },
}))

class TestWebSearch extends WebSearch {
  async search(_query: string) {
    await Promise.resolve()
    return { items: [] }
  }
}

describe('WebSearch.fetch proxy behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rewrites Bing URLs to /proxy/bing on web platform', async () => {
    const originalType = platform.type
    try {
      ;(platform as { type: string }).type = 'web'
      const search = new TestWebSearch()
      await search.fetch('https://www.bing.com/search', {
        method: 'GET',
        query: { q: 'test query' },
      })

      expect(ofetch).toHaveBeenCalledWith(
        '/proxy/bing/search',
        expect.objectContaining({
          method: 'GET',
          query: { q: 'test query' },
        })
      )
    } finally {
      ;(platform as { type: string }).type = originalType
    }
  })

  it('does not rewrite non-Bing URLs on web platform', async () => {
    const originalType = platform.type
    try {
      ;(platform as { type: string }).type = 'web'
      const search = new TestWebSearch()
      await search.fetch('https://api.tavily.com/search', {
        method: 'POST',
      })

      expect(ofetch).toHaveBeenCalledWith(
        'https://api.tavily.com/search',
        expect.objectContaining({
          method: 'POST',
        })
      )
    } finally {
      ;(platform as { type: string }).type = originalType
    }
  })
})
