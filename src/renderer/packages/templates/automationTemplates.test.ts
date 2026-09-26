// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { uiStore } from '@/stores/uiStore'
import { AUTOMATION_PROMPT_TEMPLATES, fetchPromptToEditor, TEMPLATE_CATEGORIES } from './automationTemplates'

describe('automationTemplates', () => {
  beforeEach(() => {
    uiStore.setState({ pendingPromptTemplate: null, toasts: [] })
  })

  it('contains exactly 7 workflow prompt templates with numbers 1 through 7', () => {
    expect(AUTOMATION_PROMPT_TEMPLATES).toHaveLength(7)
    const numbers = AUTOMATION_PROMPT_TEMPLATES.map((t) => t.number)
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('verifies Template 1: PostgreSQL Uptime Monitor & Alert', () => {
    const t = AUTOMATION_PROMPT_TEMPLATES.find((x) => x.number === 1)
    expect(t).toBeDefined()
    expect(t?.title).toBe('PostgreSQL Uptime Monitor & Alert')
    expect(t?.prompt).toContain('monitors PostgreSQL uptime every 2 minutes')
    expect(t?.prompt).toContain('SELECT 1')
    expect(t?.prompt).toContain('Continue On Fail')
    expect(t?.prompt).toContain('SMTP')
  })

  it('verifies Template 2: Outlook Morning Digest to WhatsApp via AI', () => {
    const t = AUTOMATION_PROMPT_TEMPLATES.find((x) => x.number === 2)
    expect(t).toBeDefined()
    expect(t?.title).toBe('Outlook Morning Digest to WhatsApp via AI')
    expect(t?.prompt).toContain('runs every weekday morning')
    expect(t?.prompt).toContain('Microsoft Outlook')
    expect(t?.prompt).toContain('concise 3-part briefing')
    expect(t?.prompt).toContain('WhatsApp')
  })

  it('verifies Template 3: Webhook PDF Ingestion, AI Extraction & Postgres Storage', () => {
    const t = AUTOMATION_PROMPT_TEMPLATES.find((x) => x.number === 3)
    expect(t).toBeDefined()
    expect(t?.title).toBe('Webhook PDF Ingestion, AI Extraction & Postgres Storage')
    expect(t?.prompt).toContain('POST webhook to accept PDF files')
    expect(t?.prompt).toContain('OpenAI node')
    expect(t?.prompt).toContain('PostgreSQL database table')
  })

  it('verifies Template 4: Oracle Tablespace Monitor (>90% Alert)', () => {
    const t = AUTOMATION_PROMPT_TEMPLATES.find((x) => x.number === 4)
    expect(t).toBeDefined()
    expect(t?.title).toBe('Oracle Tablespace Monitor (>90% Alert)')
    expect(t?.prompt).toContain('Oracle database every 30 minutes')
    expect(t?.prompt).toContain('dba_tablespace_usage_metrics')
    expect(t?.prompt).toContain('90% capacity')
    expect(t?.prompt).toContain('HTML alert table and dispatch it via SMTP')
  })

  it('verifies Template 5: Infrastructure Health Aggregator & AI Reporter', () => {
    const t = AUTOMATION_PROMPT_TEMPLATES.find((x) => x.number === 5)
    expect(t).toBeDefined()
    expect(t?.title).toBe('Infrastructure Health Aggregator & AI Reporter')
    expect(t?.prompt).toContain('server check health endpoint')
    expect(t?.prompt).toContain('MS SQL database status metrics in parallel')
    expect(t?.prompt).toContain('AI agent acting as an SRE')
    expect(t?.prompt).toContain('Microsoft Teams or Email')
  })

  it('verifies Template 6: Automated Invoice Capture & Cloud Archival', () => {
    const t = AUTOMATION_PROMPT_TEMPLATES.find((x) => x.number === 6)
    expect(t).toBeDefined()
    expect(t?.title).toBe('Automated Invoice Capture & Cloud Archival')
    expect(t?.prompt).toContain('incoming outlook mails with PDF attachments')
    expect(t?.prompt).toContain('YYYY-MM_VendorName.pdf')
    expect(t?.prompt).toContain('One Drive')
    expect(t?.prompt).toContain('teams with a link to the uploaded document')
  })

  it('verifies Template 7: Automated End-of-Day Standup Aggregator', () => {
    const t = AUTOMATION_PROMPT_TEMPLATES.find((x) => x.number === 7)
    expect(t).toBeDefined()
    expect(t?.title).toBe('Automated End-of-Day Standup Aggregator')
    expect(t?.prompt).toContain('scheduled every weekday at 5:30 PM')
    expect(t?.prompt).toContain('Outlook Calendar')
    expect(t?.prompt).toContain('GitLab')
    expect(t?.prompt).toContain('ServiceNow')
    expect(t?.prompt).toContain("Accomplished, Blockers, Tomorrow's Focus")
    expect(t?.prompt).toContain('private Teams DM')
  })

  it('verifies fetchPromptToEditor updates uiStore and sets toast', () => {
    const t = AUTOMATION_PROMPT_TEMPLATES[0]
    fetchPromptToEditor(t.prompt, t.title)

    const state = uiStore.getState()
    expect(state.pendingPromptTemplate).toBe(t.prompt)
    expect(state.toasts.length).toBeGreaterThan(0)
    expect(state.toasts[0].content).toContain(t.title)
  })

  it('has categories including All and organized categories', () => {
    expect(TEMPLATE_CATEGORIES.length).toBeGreaterThanOrEqual(4)
    expect(TEMPLATE_CATEGORIES.some((c) => c.id === 'all')).toBe(true)
    expect(TEMPLATE_CATEGORIES.some((c) => c.id === 'monitoring')).toBe(true)
    expect(TEMPLATE_CATEGORIES.some((c) => c.id === 'ai')).toBe(true)
    expect(TEMPLATE_CATEGORIES.some((c) => c.id === 'operations')).toBe(true)
  })
})
