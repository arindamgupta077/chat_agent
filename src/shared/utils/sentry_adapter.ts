export interface SentryAdapter {
  captureException(error: unknown): void
  withScope(callback: (scope: SentryScope) => void): void
}

export interface SentryScope {
  setTag(key: string, value: string): void
  setExtra(key: string, value: unknown): void
}
