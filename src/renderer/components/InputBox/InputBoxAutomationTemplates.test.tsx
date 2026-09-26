// @vitest-environment jsdom
import '@testing-library/jest-dom'
import NiceModal from '@ebay/nice-modal-react'
import { MantineProvider } from '@mantine/core'
import { TooltipProvider } from '@radix-ui/react-tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { uiStore } from '@/stores/uiStore'
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

vi.mock('@ebay/nice-modal-react', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@ebay/nice-modal-react')
  return {
    ...actual,
    default: {
      ...(actual.default as object),
      show: vi.fn(),
    },
  }
})

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
    dispatchEvent: vi.fn(),
  })),
})

describe('InputBox Automation Templates Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    uiStore.setState({ pendingPromptTemplate: null, toasts: [] })
    vi.clearAllMocks()
  })

  it('renders the Automation Templates toolbar button', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <TooltipProvider>
            <InputBox sessionId="new" sessionType="chat" />
          </TooltipProvider>
        </MantineProvider>
      </QueryClientProvider>
    )

    const templatesBtn = screen.getByTestId('automation-templates-button')
    expect(templatesBtn).toBeInTheDocument()
  })

  it('opens automation-templates modal when toolbar button is clicked', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <TooltipProvider>
            <InputBox sessionId="new" sessionType="chat" />
          </TooltipProvider>
        </MantineProvider>
      </QueryClientProvider>
    )

    const templatesBtn = screen.getByTestId('automation-templates-button')
    fireEvent.click(templatesBtn)

    expect(NiceModal.show).toHaveBeenCalledWith('automation-templates')
  })

  it('automatically fetches prompt into input textarea when pendingPromptTemplate is set', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <TooltipProvider>
            <InputBox sessionId="new" sessionType="chat" />
          </TooltipProvider>
        </MantineProvider>
      </QueryClientProvider>
    )

    const promptText = 'Create an workflow that monitors PostgreSQL uptime every 2 minutes.'
    act(() => {
      uiStore.getState().setPendingPromptTemplate(promptText)
    })

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toBe(promptText)
    expect(uiStore.getState().pendingPromptTemplate).toBeNull()
  })
})
