import { Badge, Box, Collapse, Flex, Group, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core'
import {
  IconArrowRight,
  IconBrandWhatsapp,
  IconCalendarEvent,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconDatabase,
  IconHeartRateMonitor,
  IconReceipt,
  IconServer,
  IconSparkles,
  IconWebhook,
} from '@tabler/icons-react'
import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type AutomationPromptTemplate, fetchPromptToEditor } from '@/packages/templates/automationTemplates'

interface AutomationTemplateCardProps {
  template: AutomationPromptTemplate
  onSelect?: (template: AutomationPromptTemplate) => void
  defaultExpanded?: boolean
}

const renderIcon = (type: AutomationPromptTemplate['iconType'], color: string) => {
  const iconProps = { size: 16, color, strokeWidth: 2 }
  switch (type) {
    case 'database':
      return <IconDatabase {...iconProps} />
    case 'whatsapp':
      return <IconBrandWhatsapp {...iconProps} />
    case 'webhook':
      return <IconWebhook {...iconProps} />
    case 'oracle':
      return <IconServer {...iconProps} />
    case 'sre':
      return <IconHeartRateMonitor {...iconProps} />
    case 'invoice':
      return <IconReceipt {...iconProps} />
    case 'standup':
      return <IconCalendarEvent {...iconProps} />
    default:
      return <IconSparkles {...iconProps} />
  }
}

export const AutomationTemplateCard = memo(function AutomationTemplateCard({
  template,
  onSelect,
  defaultExpanded = false,
}: AutomationTemplateCardProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [copied, setCopied] = useState(false)

  const handleUsePrompt = useCallback(() => {
    fetchPromptToEditor(template.prompt, template.title)
    onSelect?.(template)
  }, [template, onSelect])

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded((prev) => !prev)
  }, [])

  const handleCopyPrompt = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      try {
        await navigator.clipboard.writeText(template.prompt)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy prompt:', err)
      }
    },
    [template.prompt]
  )

  return (
    <Box
      className="group w-full rounded-lg border border-solid border-chatbox-border-primary bg-chatbox-background-primary transition-all duration-150 hover:border-chatbox-border-brand/70 hover:bg-chatbox-background-secondary/40 shadow-xs overflow-hidden"
    >
      {/* Main Single-Line Bar (One line one prompt format) */}
      <UnstyledButton
        onClick={handleUsePrompt}
        role="button"
        aria-label={template.title}
        className="w-full flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 text-left transition-colors cursor-pointer"
      >
        <Flex align="center" gap={10} className="min-w-0 flex-1 mr-2">
          {/* Leading Icon Badge */}
          <Box
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-transform duration-150 group-hover:scale-105"
            style={{
              backgroundColor: template.theme.badgeBg,
            }}
          >
            {renderIcon(template.iconType, template.theme.badgeText)}
          </Box>

          {/* Number Pill */}
          <span
            className="hidden sm:inline-flex text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0"
            style={{
              backgroundColor: template.theme.badgeBg,
              color: template.theme.badgeText,
            }}
          >
            #{template.number}
          </span>

          {/* Main Subject Line Only */}
          <Text
            fw={600}
            size="sm"
            className="text-chatbox-tint-primary group-hover:text-chatbox-tint-brand transition-colors truncate"
          >
            {template.title}
          </Text>
        </Flex>

        {/* Right Side: Category Pill, Use Icon & Expand Toggle */}
        <Group gap={8} className="shrink-0">
          <Badge
            size="sm"
            variant="light"
            color="gray"
            className="hidden md:inline-flex text-[11px] font-medium"
          >
            {template.categoryLabel}
          </Badge>

          {/* Expand / Collapse Chevron */}
          <Tooltip
            label={expanded ? t('Collapse prompt') : t('Expand prompt')}
            position="top"
            withArrow
          >
            <UnstyledButton
              onClick={handleToggleExpand}
              className="flex h-6 w-6 items-center justify-center rounded text-chatbox-tint-tertiary hover:bg-chatbox-background-tertiary hover:text-chatbox-tint-primary transition-colors"
              aria-label={expanded ? t('Collapse prompt') : t('Expand prompt')}
            >
              {expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            </UnstyledButton>
          </Tooltip>

          {/* Direct Use Arrow */}
          <IconArrowRight
            size={16}
            className="text-chatbox-tint-tertiary group-hover:text-chatbox-tint-brand group-hover:translate-x-0.5 transition-all"
          />
        </Group>
      </UnstyledButton>

      {/* Expandable Prompt Preview Details */}
      <Collapse in={expanded}>
        <Box className="px-4 pb-3 pt-1 border-t border-solid border-chatbox-border-primary/50 bg-chatbox-background-secondary/30">
          <Box className="rounded-md border border-solid border-chatbox-border-primary/60 bg-chatbox-background-primary p-3 select-text">
            <Text size="xs" className="font-mono text-chatbox-tint-primary leading-relaxed whitespace-pre-wrap">
              {template.prompt}
            </Text>
          </Box>

          <Flex align="center" justify="space-between" className="mt-2.5">
            <Text size="xs" c="chatbox-secondary">
              {template.summary}
            </Text>

            <Group gap={8}>
              <UnstyledButton
                onClick={handleCopyPrompt}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-chatbox-tint-secondary hover:bg-chatbox-background-tertiary hover:text-chatbox-tint-primary transition-colors"
              >
                {copied ? <IconCheck size={12} color="#10b981" /> : <IconCopy size={12} />}
                <span>{copied ? t('Copied') : t('Copy')}</span>
              </UnstyledButton>

              <UnstyledButton
                onClick={handleUsePrompt}
                className="flex items-center gap-1 rounded bg-chatbox-tint-brand px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
              >
                <span>{t('Use Prompt')}</span>
                <IconArrowRight size={12} />
              </UnstyledButton>
            </Group>
          </Flex>
        </Box>
      </Collapse>
    </Box>
  )
})
