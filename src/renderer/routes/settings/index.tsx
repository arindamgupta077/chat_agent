import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { useEffect } from 'react'
import { z } from 'zod'
import { useIsSmallScreen } from '@/hooks/useScreenChange'
import { useAppAuthStore } from '@/stores/appAuthStore'

const searchSchema = z.object({
  settings: z.string().optional(), // b64 encoded config
})

export const Route = createFileRoute('/settings/')({
  component: RouteComponent,
  validateSearch: zodValidator(searchSchema),
})

export function RouteComponent() {
  const isSmallScreen = useIsSmallScreen()
  const navigate = useNavigate()
  const user = useAppAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!isSmallScreen) {
      navigate({
        to: isAdmin ? '/settings/provider' : '/settings/general',
        replace: true,
      })
    }
  }, [isSmallScreen, navigate, isAdmin])

  return null
}
