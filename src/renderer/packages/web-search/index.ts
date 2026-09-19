import { cachified } from '@epic-web/cachified'
import type { SearchResultItem } from '@shared/types'
import { truncate } from 'lodash'
import platform from '@/platform'
import { getExtensionSettings, getLanguage } from '@/stores/settingActions'
import type WebSearch from './base'
import { BingSearch } from './bing'
import { BingNewsSearch } from './bing-news'
import { GoogleSearch } from './google'

const MAX_CONTEXT_ITEMS = 10

// 根据配置的搜索提供方来选择搜索服务
function getSearchProviders() {
  const settings = getExtensionSettings()

  const selectedProviders: WebSearch[] = []
  const provider = settings.webSearch.provider
  const language = getLanguage()

  switch (provider) {
    case 'google':
      if (!settings.webSearch.googleApiKey || !settings.webSearch.googleCx) {
        throw new Error('Google Search requires an API Key and Search Engine ID (CX).')
      }
      selectedProviders.push(new GoogleSearch(settings.webSearch.googleApiKey, settings.webSearch.googleCx))
      break
    case 'bing':
    default:
      selectedProviders.push(new BingSearch())
      if (language !== 'zh-Hans' && platform.type !== 'mobile') {
        selectedProviders.push(new BingNewsSearch()) // 国内和移动端容易被重定向到 Bing 首页
      }
      break
  }

  return selectedProviders
}

async function _searchRelatedResults(query: string, signal?: AbortSignal) {
  const providers = getSearchProviders()
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        const result = await provider.search(query, signal)
        console.debug(`web search result for "${query}":`, result.items)
        return { result }
      } catch (err) {
        console.error(err)
        return { error: err }
      }
    })
  )

  const successfulResults = results.flatMap((entry) => (entry.result ? [entry.result] : []))
  if (successfulResults.length === 0) {
    throw results[0]?.error ?? new Error('Web search failed')
  }

  const items: SearchResultItem[] = []

  // add items in turn
  let i = 0
  let hasMore = false
  do {
    hasMore = false
    for (const result of successfulResults) {
      const item = result.items[i]
      if (item) {
        hasMore = true
        items.push(item)
      } else {
      }
    }
    i++
  } while (hasMore && items.length < MAX_CONTEXT_ITEMS)

  console.debug('web search items', items)

  return items.map((item) => ({
    title: item.title,
    snippet: truncate(item.snippet, { length: 150 }),
    link: item.link,
  }))
}

const cache = new Map()

export const webSearchExecutor = async (
  { query }: { query: string },
  { abortSignal }: { abortSignal?: AbortSignal }
) => {
  const webSearch = getExtensionSettings().webSearch
  const provider = webSearch.provider
  const cacheIdentity = provider
  const searchResults = await cachified({
    cache,
    key: `search-context:${cacheIdentity}:${query}`,
    ttl: 1000 * 60 * 5,
    getFreshValue: () => _searchRelatedResults(query, abortSignal),
  })
  return { query, searchResults }
}

/**
 * Single source of truth: which configured providers offer the parse_link tool.
 * Keep in sync with the provider classes' `supportsParseLink` flags.
 */
export const PROVIDERS_WITH_PARSE_LINK: ReadonlySet<string> = new Set()

/**
 * Returns the first configured search provider that supports parseLink.
 * Throws the underlying provider error (e.g. missing API key) — caller decides how to handle.
 */
export function getParseLinkProvider(): WebSearch | null {
  const providers = getSearchProviders()
  return providers.find((p) => p.supportsParseLink) ?? null
}

export type { SearchResultItem }
