/**
 * Checks whether an API key string is considered a dummy or invalid placeholder.
 */
export function isDummyApiKey(key: string | undefined | null): boolean {
  if (!key || typeof key !== 'string') return false
  const lower = key.trim().toLowerCase()
  return (
    lower === 'admin@123' ||
    lower === 'welcome@123' ||
    lower === 'admin' ||
    lower === 'password' ||
    lower === 'dummy' ||
    lower === 'test'
  )
}

/**
 * Checks whether an API key string is considered a valid, non-dummy key.
 * Disallows dummy values like 'Admin@123', default passwords, or short placeholders,
 * while allowing local model keys like 'ollama' or short custom provider keys when allowed.
 */
export function isValidApiKey(key: string | undefined | null, allowShort = false): boolean {
  if (!key || typeof key !== 'string') return false
  const trimmed = key.trim()
  if (trimmed.toLowerCase() === 'ollama') return true
  if (allowShort) {
    return trimmed.length > 0 && !isDummyApiKey(trimmed)
  }
  if (trimmed.length < 8) return false
  if (isDummyApiKey(trimmed)) return false
  return true
}
