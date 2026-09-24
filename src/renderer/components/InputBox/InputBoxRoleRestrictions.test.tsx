// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import { TestId } from '@shared/automation/testids'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppAuthStore } from '@/stores/appAuthStore'
import InputBox from './InputBox'

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/', search: {} }),
}))

vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (k: string) => k }),
}))

vi.mock('@/platform', () => ({
  default: {
    type: 'desktop',
    isDesktopLike: true,
    getLocalFilePath: vi.fn(),
    getSessionAttachmentRagController: vi.fn(() => ({
      deleteAttachment: vi.fn(),
    })),
  },
}))

vi.mock('./AgentModeButton', () => ({
  default: () => <div data-testid="agent-mode-button" />,
}))

vi.mock('./ReasoningControlButton', () => ({
  default: () => <div data-testid="reasoning-control-button" />,
  ReasoningControlButton: () => <div data-testid="reasoning-control-button" />,
}))

vi.mock('./TokenCountMenu', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TokenCountMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ModelSelectorV2', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ModelSelectorV2: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

describe('InputBox role restrictions for non-admin users', () => {
  const queryClient = new QueryClient()

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('hides attachment menu, file inputs, and selected model for regular users', () => {
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
            <InputBox sessionType="chat" />
          </MantineProvider>
        </TooltipProvider>
      </QueryClientProvider>
    )

    expect(screen.queryByTestId(TestId.chat.attachmentMenuTrigger)).toBeNull()
    expect(screen.queryByTestId(TestId.chat.attachmentImageInput)).toBeNull()
    expect(screen.queryByTestId(TestId.chat.attachmentFileInput)).toBeNull()
    expect(screen.queryByTestId(TestId.model.selectorTrigger)).toBeNull()
  })

  it('hides attachment menu, file inputs, and selected model when user is unauthenticated', () => {
    useAppAuthStore.setState({
      user: null,
      isAuthenticated: false,
    })

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MantineProvider>
            <InputBox sessionType="chat" />
          </MantineProvider>
        </TooltipProvider>
      </QueryClientProvider>
    )

    expect(screen.queryByTestId(TestId.chat.attachmentMenuTrigger)).toBeNull()
    expect(screen.queryByTestId(TestId.chat.attachmentImageInput)).toBeNull()
    expect(screen.queryByTestId(TestId.chat.attachmentFileInput)).toBeNull()
    expect(screen.queryByTestId(TestId.model.selectorTrigger)).toBeNull()
  })

  it('shows attachment menu, file inputs, and selected model for admin users', () => {
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
            <InputBox sessionType="chat" />
          </MantineProvider>
        </TooltipProvider>
      </QueryClientProvider>
    )

    expect(screen.getByTestId(TestId.chat.attachmentMenuTrigger)).toBeTruthy()
    expect(screen.getByTestId(TestId.chat.attachmentImageInput)).toBeTruthy()
    expect(screen.getByTestId(TestId.chat.attachmentFileInput)).toBeTruthy()
    expect(screen.getByTestId(TestId.model.selectorTrigger)).toBeTruthy()
  })
})
