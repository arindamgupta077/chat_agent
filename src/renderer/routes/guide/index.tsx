import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/guide/')({
  component: GuideRoute,
})

function GuideRoute() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate({ to: '/', replace: true })
  }, [navigate])
  return null
}
