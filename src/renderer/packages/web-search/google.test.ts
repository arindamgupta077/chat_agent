import { describe, expect, it, vi } from 'vitest'
import { GoogleSearch } from './google'

describe('GoogleSearch', () => {
  it('throws an error if apiKey or cx is missing', async () => {
    const searchNoKey = new GoogleSearch('', 'cx')
    await expect(searchNoKey.search('query')).rejects.toThrow(
      'Google Search requires an API Key and Search Engine ID (CX).'
    )

    const searchNoCx = new GoogleSearch('key', '')
    await expect(searchNoCx.search('query')).rejects.toThrow(
      'Google Search requires an API Key and Search Engine ID (CX).'
    )
  })

  it('fetches search results and extracts items correctly', async () => {
    const search = new GoogleSearch('test-key', 'test-cx')
    const mockResponse = {
      items: [
        {
          title: 'Example Title',
          link: 'https://example.com',
          snippet: 'Example description snippet',
        },
        {
          title: 'Another Title',
          link: 'https://example.org',
          snippet: 'Another snippet',
        },
      ],
    }

    vi.spyOn(search, 'fetch').mockResolvedValue(mockResponse as never)

    const result = await search.search('n8n workflow')

    expect(search.fetch).toHaveBeenCalledWith(
      'https://www.googleapis.com/customsearch/v1',
      expect.objectContaining({
        method: 'GET',
        query: {
          key: 'test-key',
          cx: 'test-cx',
          q: 'n8n workflow',
          num: '10',
        },
        responseType: 'json',
      })
    )

    expect(result.items).toEqual([
      {
        title: 'Example Title',
        link: 'https://example.com',
        snippet: 'Example description snippet',
      },
      {
        title: 'Another Title',
        link: 'https://example.org',
        snippet: 'Another snippet',
      },
    ])
  })

  it('throws when the API returns an error payload', async () => {
    const search = new GoogleSearch('test-key', 'test-cx')
    vi.spyOn(search, 'fetch').mockResolvedValue({
      error: { code: 403, message: 'Invalid API key' },
    } as never)

    await expect(search.search('test')).rejects.toThrow('Google Search API error: Invalid API key')
  })
})
