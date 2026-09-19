import { describe, expect, it } from 'vitest'
import { getWebSearchConfigurationIssue } from './configuration-issue'

describe('getWebSearchConfigurationIssue', () => {
  it('reports no configuration issue for bing', () => {
    expect(getWebSearchConfigurationIssue({ provider: 'bing' })).toBeNull()
  })

  it('reports missing credentials for google when apiKey or cx is missing', () => {
    expect(getWebSearchConfigurationIssue({ provider: 'google' })).toBe('google-credentials')
    expect(getWebSearchConfigurationIssue({ provider: 'google', googleApiKey: 'test-key' })).toBe('google-credentials')
    expect(getWebSearchConfigurationIssue({ provider: 'google', googleCx: 'test-cx' })).toBe('google-credentials')
    expect(
      getWebSearchConfigurationIssue({ provider: 'google', googleApiKey: 'test-key', googleCx: 'test-cx' })
    ).toBeNull()
  })
})
