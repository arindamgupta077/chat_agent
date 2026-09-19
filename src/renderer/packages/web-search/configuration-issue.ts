import type { WebSearchProviderValue } from './constants'

type WebSearchConfiguration = {
  provider: WebSearchProviderValue
  googleApiKey?: string
  googleCx?: string
  tavilyApiKey?: string
  bochaApiKey?: string
  queritApiKey?: string
  searxngBaseUrl?: string
}

export type WebSearchConfigurationIssue =
  | 'google-credentials'
  | 'chatbox-ai-sign-in'
  | 'tavily-api-key'
  | 'bocha-api-key'
  | 'querit-api-key'
  | 'searxng-instance'

export function getWebSearchConfigurationIssue(
  configuration: WebSearchConfiguration,
  licenseKey?: string
): WebSearchConfigurationIssue | null {
  switch (configuration.provider) {
    case 'build-in':
      return licenseKey ? null : 'chatbox-ai-sign-in'
    case 'google':
      return configuration.googleApiKey?.trim() && configuration.googleCx?.trim() ? null : 'google-credentials'
    default:
      return null
  }
}
