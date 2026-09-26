import { add as addToast } from '@/stores/toastActions'
import { uiStore } from '@/stores/uiStore'

export type TemplateCategory = 'monitoring' | 'ai' | 'operations'

export interface AutomationPromptTemplate {
  id: string
  number: number
  title: string
  prompt: string
  summary: string
  category: TemplateCategory
  categoryLabel: string
  iconType: 'database' | 'whatsapp' | 'webhook' | 'oracle' | 'sre' | 'invoice' | 'standup'
  theme: {
    badgeBg: string
    badgeText: string
  }
}

export const AUTOMATION_PROMPT_TEMPLATES: AutomationPromptTemplate[] = [
  {
    id: 'postgres-uptime-monitor',
    number: 1,
    title: 'PostgreSQL Uptime Monitor & Alert',
    prompt: `Create an workflow that monitors PostgreSQL uptime every 2 minutes. Execute a lightweight query like "SELECT 1" with "Continue On Fail" enabled. If the connection fails or returns an error, immediately send a high-priority alert email via SMTP containing the error message and timestamp.`,
    summary: 'Monitor uptime every 2m with query check & instant SMTP alert',
    category: 'monitoring',
    categoryLabel: 'Monitoring',
    iconType: 'database',
    theme: {
      badgeBg: 'rgba(59, 130, 246, 0.12)',
      badgeText: '#2563eb',
    },
  },
  {
    id: 'outlook-morning-digest',
    number: 2,
    title: 'Outlook Morning Digest to WhatsApp via AI',
    prompt: `Create an workflow that runs every weekday morning, retrieves unread or important emails from Microsoft Outlook received in the last 24 hours, uses an basic LLM node to synthesize them into a concise 3-part briefing (Action Items, Key Updates, Low Priority), and sends the final formatted summary to WhatsApp.`,
    summary: 'Synthesize unread emails into a 3-part WhatsApp morning digest',
    category: 'ai',
    categoryLabel: 'AI & Data',
    iconType: 'whatsapp',
    theme: {
      badgeBg: 'rgba(16, 185, 129, 0.12)',
      badgeText: '#059669',
    },
  },
  {
    id: 'webhook-pdf-ingestion',
    number: 3,
    title: 'Webhook PDF Ingestion, AI Extraction & Postgres Storage',
    prompt: `Create an workflow that exposes a POST webhook to accept PDF files, extracts the plain text from the document, uses an OpenAI node to generate an executive summary with key findings, and stores the filename, extracted summary, and timestamp into a PostgreSQL database table.`,
    summary: 'POST webhook to extract PDF text, summarize with AI & store in Postgres',
    category: 'ai',
    categoryLabel: 'AI & Data',
    iconType: 'webhook',
    theme: {
      badgeBg: 'rgba(139, 92, 246, 0.12)',
      badgeText: '#7c3aed',
    },
  },
  {
    id: 'oracle-tablespace-monitor',
    number: 4,
    title: 'Oracle Tablespace Monitor (>90% Alert)',
    prompt: `Create an workflow that queries an Oracle database every 30 minutes for tablespaces exceeding 90% capacity using dba_tablespace_usage_metrics. If any tablespace crosses the threshold, compile the affected names, percentage used, and allocated sizes into an HTML alert table and dispatch it via SMTP.`,
    summary: 'Check tablespaces >90% every 30m & dispatch HTML alert email',
    category: 'monitoring',
    categoryLabel: 'Monitoring',
    iconType: 'oracle',
    theme: {
      badgeBg: 'rgba(245, 158, 11, 0.12)',
      badgeText: '#d97706',
    },
  },
  {
    id: 'infra-health-reporter',
    number: 5,
    title: 'Infrastructure Health Aggregator & AI Reporter',
    prompt: `Create an workflow that runs on a schedule, polls server check health endpoint and MS SQL database status metrics in parallel, merges the diagnostics, and passes them to an AI agent acting as an SRE. Have the AI evaluate systemic bottlenecks and dispatch an executive status report to Microsoft Teams or Email.`,
    summary: 'Poll server & MS SQL health in parallel with AI SRE report to Teams/Email',
    category: 'ai',
    categoryLabel: 'AI & Data',
    iconType: 'sre',
    theme: {
      badgeBg: 'rgba(236, 72, 153, 0.12)',
      badgeText: '#db2777',
    },
  },
  {
    id: 'invoice-capture-archival',
    number: 6,
    title: 'Automated Invoice Capture & Cloud Archival',
    prompt: `Create an workflow triggered by incoming outlook mails with PDF attachments. Extract the PDF, rename it dynamically using the format "YYYY-MM_VendorName.pdf", upload it to a target One Drive folder, and notify in teams with a link to the uploaded document.`,
    summary: 'Extract Outlook invoice PDFs, format filename & upload to OneDrive',
    category: 'operations',
    categoryLabel: 'Operations',
    iconType: 'invoice',
    theme: {
      badgeBg: 'rgba(6, 182, 212, 0.12)',
      badgeText: '#0891b2',
    },
  },
  {
    id: 'standup-aggregator',
    number: 7,
    title: 'Automated End-of-Day Standup Aggregator',
    prompt: `Create an  workflow scheduled every weekday at 5:30 PM that queries Outlook Calendar for attended meetings, GitLab for pushed commits and merged PRs, and ServiceNow for tickets updated today. Merge these logs, pass them to an AI Agent node to format a clean 3-part standup summary (Accomplished, Blockers, Tomorrow's Focus), and send it as a private Teams DM.`,
    summary: '5:30 PM weekday standup merging Calendar, GitLab & ServiceNow to Teams',
    category: 'operations',
    categoryLabel: 'Operations',
    iconType: 'standup',
    theme: {
      badgeBg: 'rgba(99, 102, 241, 0.12)',
      badgeText: '#4f46e5',
    },
  },
]

export const TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'monitoring', label: 'Monitoring' },
  { id: 'ai', label: 'AI & Data' },
  { id: 'operations', label: 'Operations' },
] as const

/**
 * Automatically fetch/inject prompt template into the chatbot editor panel
 */
export function fetchPromptToEditor(prompt: string, title?: string) {
  uiStore.getState().setPendingPromptTemplate(prompt)
  addToast(title ? `Template loaded: ${title}` : 'Prompt loaded into editor')
}
