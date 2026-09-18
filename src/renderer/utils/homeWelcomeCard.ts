export type HomeWelcomeCardMode = 'none' | 'no-provider'

export function getHomeWelcomeCardMode(params: {
  providerCount: number
  isLoggedIn?: boolean
  hasLicense?: boolean
  hasExpiredLicense?: boolean
  hideForStoreReview?: boolean
}): HomeWelcomeCardMode {
  const { providerCount, hideForStoreReview } = params

  if (hideForStoreReview || providerCount > 0) {
    return 'none'
  }

  return 'no-provider'
}
