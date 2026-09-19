import type { SearchResult } from '@shared/types'
import WebSearch from './base'

export interface GoogleSearchResultItem {
  title?: string
  link?: string
  snippet?: string
}

export interface GoogleCustomSearchResponse {
  items?: GoogleSearchResultItem[]
  error?: {
    code: number
    message: string
  }
}

export class GoogleSearch extends WebSearch {
  private apiKey: string
  private cx: string

  constructor(apiKey?: string, cx?: string) {
    super()
    this.apiKey = (apiKey ?? '').trim()
    this.cx = (cx ?? '').trim()
  }

  async search(query: string, signal?: AbortSignal): Promise<SearchResult> {
    if (!this.apiKey || !this.cx) {
      throw new Error('Google Search requires an API Key and Search Engine ID (CX).')
    }

    const data = await this.fetch('https://www.googleapis.com/customsearch/v1', {
      method: 'GET',
      query: {
        key: this.apiKey,
        cx: this.cx,
        q: query,
        num: '10',
      },
      responseType: 'json',
      signal,
    })

    const payload = data as GoogleCustomSearchResponse
    if (payload?.error) {
      throw new Error(`Google Search API error: ${payload.error.message}`)
    }

    const items = (payload?.items ?? [])
      .filter((item) => Boolean(item.title && item.link))
      .map((item) => ({
        title: item.title || '',
        link: item.link || '',
        snippet: item.snippet || '',
      }))

    return { items }
  }
}
