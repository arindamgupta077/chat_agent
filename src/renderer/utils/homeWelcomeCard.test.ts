import { describe, expect, it } from 'vitest'

import { getHomeWelcomeCardMode } from './homeWelcomeCard'

describe('getHomeWelcomeCardMode', () => {
  it('returns "none" when providerCount > 0', () => {
    expect(
      getHomeWelcomeCardMode({
        providerCount: 1,
      })
    ).toBe('none')
  })

  it('returns "no-provider" when providerCount is 0', () => {
    expect(
      getHomeWelcomeCardMode({
        providerCount: 0,
      })
    ).toBe('no-provider')
  })

  it('returns "none" during store review even when welcome card would otherwise show', () => {
    expect(
      getHomeWelcomeCardMode({
        providerCount: 0,
        hideForStoreReview: true,
      })
    ).toBe('none')
  })
})
