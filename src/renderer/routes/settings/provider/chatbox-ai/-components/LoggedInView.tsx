import { forwardRef } from 'react'

export interface LoggedInViewProps {
  onLogout?: () => void
  onSwitchToLicenseKey?: () => void
  language?: string
  initialAccountData?: any
  onShowLicenseSelectionModal?: (params: any) => void
}

/**
 * Deprecated: Login is permanently removed.
 */
export const LoggedInView = forwardRef<HTMLDivElement, LoggedInViewProps>((_props, _ref) => {
  return null
})

LoggedInView.displayName = 'LoggedInView'
