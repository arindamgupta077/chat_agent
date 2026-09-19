import { describe, expect, it } from 'vitest'
import { PROVIDERS_WITH_PARSE_LINK } from '@/packages/web-search'
import { BingSearch } from '@/packages/web-search/bing'
import { BingNewsSearch } from '@/packages/web-search/bing-news'
import { GoogleSearch } from '@/packages/web-search/google'

describe('parse_link capability consistency', () => {
  const providers: { id: string; instance: { supportsParseLink: boolean } }[] = [
    { id: 'bing', instance: new BingSearch() },
    { id: 'bing-news', instance: new BingNewsSearch() },
    { id: 'google', instance: new GoogleSearch('stub-api-key', 'stub-cx') },
  ]

  it.each(providers)('$id: PROVIDERS_WITH_PARSE_LINK matches supportsParseLink flag', ({ id, instance }) => {
    const inSet = PROVIDERS_WITH_PARSE_LINK.has(id)
    const flag = instance.supportsParseLink
    expect(inSet).toBe(flag)
  })

  it('PROVIDERS_WITH_PARSE_LINK only contains known provider ids', () => {
    const knownIds = new Set(providers.map((p) => p.id))
    for (const id of PROVIDERS_WITH_PARSE_LINK) {
      expect(knownIds.has(id)).toBe(true)
    }
  })
})
