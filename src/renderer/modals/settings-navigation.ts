import { getThemeDesign } from '@/hooks/useAppTheme'
import { navigateToDynamicPath, router } from '@/router'
import { useAppAuthStore } from '@/stores/appAuthStore'

export function navigateToSettings(path?: string) {
  let targetPath = path
  const user = useAppAuthStore.getState().user
  const isAdmin = user?.role === 'admin'

  // Restrict model provider, default models, and document parser configuration to admin users only
  if (!isAdmin) {
    if (
      !targetPath ||
      targetPath === '/provider' ||
      targetPath === 'provider' ||
      targetPath.startsWith('/provider/') ||
      targetPath.startsWith('provider/') ||
      targetPath === '/default-models' ||
      targetPath === 'default-models' ||
      targetPath.startsWith('/default-models/') ||
      targetPath.startsWith('default-models/') ||
      targetPath === '/document-parser' ||
      targetPath === 'document-parser' ||
      targetPath.startsWith('/document-parser/') ||
      targetPath.startsWith('document-parser/')
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
