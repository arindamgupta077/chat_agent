import { getThemeDesign } from '@/hooks/useAppTheme'
import { navigateToDynamicPath, router } from '@/router'
import { useAppAuthStore } from '@/stores/appAuthStore'

export function navigateToSettings(path?: string) {
  let targetPath = path
  const user = useAppAuthStore.getState().user
  const isAdmin = user?.role === 'admin'

  // Restrict model provider configuration to admin users only
  if (!isAdmin) {
    if (
      !targetPath ||
      targetPath === '/provider' ||
      targetPath === 'provider' ||
      targetPath.startsWith('/provider/') ||
      targetPath.startsWith('provider/')
    ) {
      targetPath = '/general'
    }
  }

  if (window.matchMedia(`(max-width:${getThemeDesign('light', 'en').breakpoints?.values?.sm || 640}px)`).matches) {
    navigateToDynamicPath({
      to: `/settings${targetPath ? (targetPath.startsWith('/') ? targetPath : `/${targetPath}`) : ''}`,
    })
  } else {
    navigateToDynamicPath({
      to: router.state.location.pathname,
      search: {
        settings: `/settings${targetPath ? (targetPath.startsWith('/') ? targetPath : `/${targetPath}`) : ''}`,
      },
      mask: {
        to: '/settings',
      },
    })
  }
}
