import { forwardRef } from 'react'

export interface LicenseKeyViewProps {
  language?: string
  onSwitchToLogin?: () => void
}

export const LicenseKeyView = forwardRef<HTMLDivElement, LicenseKeyViewProps>((_props, _ref) => {
  return null
})

LicenseKeyView.displayName = 'LicenseKeyView'
