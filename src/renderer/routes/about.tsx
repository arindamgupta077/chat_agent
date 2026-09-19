import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/about')({
  component: AboutRoute,
})

function AboutRoute() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate({ to: '/', replace: true })
  }, [navigate])
  return null
}
