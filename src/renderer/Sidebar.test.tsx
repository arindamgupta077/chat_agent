// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import { TestId } from '@shared/automation/testids'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Sidebar from './Sidebar'
import { useAppAuthStore } from './stores/appAuthStore'
import { uiStore } from './stores/uiStore'

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => vi.fn(),
}))

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (k: string) => k }),
}))

vi.mock('./components/SessionList', () => ({
  SessionList: () => <div data-testid="session-list" />,
  default: () => <div data-testid="session-list" />,
}))

vi.mock('./components/session/SessionList', () => ({
  SessionList: () => <div data-testid="session-list" />,
  default: () => <div data-testid="session-list" />,
}))

vi.mock('./components/admin/AdminUserModal', () => ({
  AdminUserModal: () => null,
}))

vi.mock('./packages/event', () => ({
  trackingEvent: vi.fn(),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  })),
})

describe('Sidebar admin restrictions', () => {
  const queryClient = new QueryClient()

  beforeEach(() => {
    uiStore.setState({ showSidebar: true })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('hides Create Image button for regular users', () => {
    useAppAuthStore.setState({
      user: {
        id: 'user-1',
        username: 'regular_user',
        email: 'user@test.com',
        role: 'user',
      },
      isAuthenticated: true,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MantineProvider>
            <Sidebar />
          </MantineProvider>
        </TooltipProvider>
      </QueryClientProvider>
    )

    expect(screen.getByTestId(TestId.sidebar.newChat)).toBeTruthy()
    expect(screen.queryByTestId(TestId.sidebar.newImage)).toBeNull()
  })

  it('hides Create Image button when user is unauthenticated', () => {
    useAppAuthStore.setState({
      user: null,
      isAuthenticated: false,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MantineProvider>
            <Sidebar />
          </MantineProvider>
        </TooltipProvider>
      </QueryClientProvider>
    )

    expect(screen.getByTestId(TestId.sidebar.newChat)).toBeTruthy()
    expect(screen.queryByTestId(TestId.sidebar.newImage)).toBeNull()
  })

  it('shows Create Image button for admin users', () => {
    useAppAuthStore.setState({
      user: {
        id: 'admin-1',
        username: 'admin_user',
        email: 'admin@test.com',
        role: 'admin',
      },
      isAuthenticated: true,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MantineProvider>
            <Sidebar />
          </MantineProvider>
        </TooltipProvider>
      </QueryClientProvider>
    )

    expect(screen.getByTestId(TestId.sidebar.newChat)).toBeTruthy()
    expect(screen.getByTestId(TestId.sidebar.newImage)).toBeTruthy()
  })
})
