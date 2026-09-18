import { forwardRef } from 'react'

export interface LoginViewProps {
  language?: string
  saveAuthTokens?: (tokens: any) => Promise<void>
  onSwitchToLicenseKey?: () => void
}

/**
 * Deprecated: Login is permanently removed.
 */
export const LoginView = forwardRef<HTMLDivElement, LoginViewProps>((_props, _ref) => {
  return null
})

LoginView.displayName = 'LoginView'
