export interface EmailCodeLoginModalProps {
  opened?: boolean
  onClose?: () => void
  language?: string
  onLoginSuccess?: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>
}

/**
 * Deprecated: Login is permanently removed.
 */
export function EmailCodeLoginModal(_props: EmailCodeLoginModalProps) {
  return null
}
