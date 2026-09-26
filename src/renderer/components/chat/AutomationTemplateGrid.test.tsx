// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { uiStore } from '@/stores/uiStore'
import { AUTOMATION_PROMPT_TEMPLATES } from '@/packages/templates/automationTemplates'
import { AutomationTemplateGrid } from './AutomationTemplateGrid'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
  }),
}))

describe('AutomationTemplateGrid', () => {
  beforeEach(() => {
    uiStore.setState({ pendingPromptTemplate: null, toasts: [] })
  })

  it('renders welcome screen greeting with username', () => {
    render(
      <MantineProvider>
        <AutomationTemplateGrid username="Alex" />
      </MantineProvider>
    )

    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.getByText(/What would you like to automate today\?/i)).toBeInTheDocument()
  })

  it('renders fallback welcome screen when no username provided', () => {
    render(
      <MantineProvider>
        <AutomationTemplateGrid username="" />
      </MantineProvider>
    )

    expect(screen.getByText(/What would you like to automate today\?/i)).toBeInTheDocument()
  })

  it('renders 4 templates in compressed mode by default', () => {
    render(
      <MantineProvider>
        <AutomationTemplateGrid />
      </MantineProvider>
    )

    // First 4 templates should be visible
    expect(screen.getByText('PostgreSQL Uptime Monitor & Alert')).toBeInTheDocument()
    expect(screen.getByText('Outlook Morning Digest to WhatsApp via AI')).toBeInTheDocument()
    expect(screen.getByText('Webhook PDF Ingestion, AI Extraction & Postgres Storage')).toBeInTheDocument()
    expect(screen.getByText('Oracle Tablespace Monitor (>90% Alert)')).toBeInTheDocument()

    // 5th, 6th, and 7th templates should not be visible yet in compressed mode
    expect(screen.queryByText('Infrastructure Health Aggregator & AI Reporter')).not.toBeInTheDocument()
    expect(screen.queryByText('Automated Invoice Capture & Cloud Archival')).not.toBeInTheDocument()
    expect(screen.queryByText('Automated End-of-Day Standup Aggregator')).not.toBeInTheDocument()

    // Expand button should be visible
    expect(screen.getByRole('button', { name: /expand templates/i })).toBeInTheDocument()
  })

  it('expands to show all 7 templates when expand button is clicked, and collapses back', () => {
    render(
      <MantineProvider>
        <AutomationTemplateGrid />
      </MantineProvider>
    )

    const expandBtn = screen.getByRole('button', { name: /expand templates/i })
    fireEvent.click(expandBtn)

    // Now all 7 templates should be visible
    expect(screen.getByText('PostgreSQL Uptime Monitor & Alert')).toBeInTheDocument()
    expect(screen.getByText('Outlook Morning Digest to WhatsApp via AI')).toBeInTheDocument()
    expect(screen.getByText('Webhook PDF Ingestion, AI Extraction & Postgres Storage')).toBeInTheDocument()
    expect(screen.getByText('Oracle Tablespace Monitor (>90% Alert)')).toBeInTheDocument()
    expect(screen.getByText('Infrastructure Health Aggregator & AI Reporter')).toBeInTheDocument()
    expect(screen.getByText('Automated Invoice Capture & Cloud Archival')).toBeInTheDocument()
    expect(screen.getByText('Automated End-of-Day Standup Aggregator')).toBeInTheDocument()

    // Collapse back
    const collapseBtn = screen.getByRole('button', { name: /compress templates/i })
    fireEvent.click(collapseBtn)

    expect(screen.queryByText('Infrastructure Health Aggregator & AI Reporter')).not.toBeInTheDocument()
  })

  it('renders all templates directly if defaultCompressed is false', () => {
    render(
      <MantineProvider>
        <AutomationTemplateGrid defaultCompressed={false} />
      </MantineProvider>
    )

    expect(screen.getByText('PostgreSQL Uptime Monitor & Alert')).toBeInTheDocument()
    expect(screen.getByText('Automated End-of-Day Standup Aggregator')).toBeInTheDocument()
  })

  it('fetches prompt into uiStore when a template is clicked', () => {
    const onSelect = vi.fn()
    render(
      <MantineProvider>
        <AutomationTemplateGrid onSelectTemplate={onSelect} />
      </MantineProvider>
    )

    const card = screen.getByText('PostgreSQL Uptime Monitor & Alert').closest('button')
    expect(card).toBeDefined()
    if (card) {
      fireEvent.click(card)
    }

    const state = uiStore.getState()
    expect(state.pendingPromptTemplate).toBe(AUTOMATION_PROMPT_TEMPLATES[0].prompt)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(AUTOMATION_PROMPT_TEMPLATES[0])
  })

  it('filters templates by category tab', () => {
    render(
      <MantineProvider>
        <AutomationTemplateGrid />
      </MantineProvider>
    )

    const monitoringTab = screen.getByRole('button', { name: 'Monitoring' })
    fireEvent.click(monitoringTab)

    expect(screen.getByText('Oracle Tablespace Monitor (>90% Alert)')).toBeInTheDocument()
    expect(screen.getByText('PostgreSQL Uptime Monitor & Alert')).toBeInTheDocument()
    expect(screen.queryByText('Outlook Morning Digest to WhatsApp via AI')).not.toBeInTheDocument()
  })
})
