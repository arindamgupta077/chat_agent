import { Box, Flex, Group, Stack, Text, UnstyledButton } from '@mantine/core'
import { IconChevronDown, IconChevronUp, IconSparkles } from '@tabler/icons-react'
import { memo, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AUTOMATION_PROMPT_TEMPLATES,
  type AutomationPromptTemplate,
  TEMPLATE_CATEGORIES,
} from '@/packages/templates/automationTemplates'
import { useAppAuthStore } from '@/stores/appAuthStore'
import { AutomationTemplateCard } from './AutomationTemplateCard'

export const COMPRESSED_TEMPLATE_COUNT = 4

interface AutomationTemplateGridProps {
  onSelectTemplate?: (template: AutomationPromptTemplate) => void
  showTitle?: boolean
  defaultCompressed?: boolean
  username?: string
  className?: string
}

export const AutomationTemplateGrid = memo(function AutomationTemplateGrid({
  onSelectTemplate,
  showTitle = true,
  defaultCompressed = true,
  username: propUsername,
  className = '',
}: AutomationTemplateGridProps) {
  const { t } = useTranslation()
  const authUser = useAppAuthStore((s) => s.user)
  const username =
    propUsername !== undefined
      ? propUsername
      : authUser?.username || (authUser?.email ? authUser.email.split('@')[0] : '')

  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [isCompressed, setIsCompressed] = useState<boolean>(defaultCompressed)

  const filteredTemplates = useMemo(() => {
    if (activeCategory === 'all') return AUTOMATION_PROMPT_TEMPLATES
    return AUTOMATION_PROMPT_TEMPLATES.filter((tmpl) => tmpl.category === activeCategory)
  }, [activeCategory])

  const displayedTemplates = useMemo(() => {
    if (!isCompressed) return filteredTemplates
    return filteredTemplates.slice(0, COMPRESSED_TEMPLATE_COUNT)
  }, [filteredTemplates, isCompressed])

  const hasMore = filteredTemplates.length > COMPRESSED_TEMPLATE_COUNT

  return (
    <Stack gap="md" className={`w-full max-w-3xl mx-auto px-4 sm:px-6 ${className}`}>
      {/* Welcome Screen Header */}
      {showTitle && (
        <Stack gap={6} className="text-center sm:text-left mb-1">
          <Flex align="center" gap={8} justify={{ base: 'center', sm: 'flex-start' }}>
            <Box className="flex h-7 w-7 items-center justify-center rounded-full bg-chatbox-tint-brand/10 text-chatbox-tint-brand shrink-0">
              <IconSparkles size={16} />
            </Box>
            <Text
              component="h1"
              fw={700}
              className="text-chatbox-tint-primary text-base sm:text-lg md:text-xl lg:text-[22px] tracking-tight leading-snug whitespace-nowrap overflow-hidden text-ellipsis min-w-0"
            >
              {username ? (
                <>
                  {t('Welcome')}, <span className="text-chatbox-tint-brand">{username}</span>!{' '}
                  {t('What would you like to automate today?')}
                </>
              ) : (
                <>
                  {t('Welcome! What would you like to automate today?', {
                    defaultValue: 'Welcome! What would you like to automate today?',
                  })}
                </>
              )}
            </Text>
          </Flex>
          <Text size="sm" c="chatbox-secondary" className="pl-0 sm:pl-9 whitespace-nowrap overflow-hidden text-ellipsis">
            {t('Select a workflow template below to fetch its prompt directly into the editor, or write your own.')}
          </Text>
        </Stack>
      )}

      {/* Minimal Category Tabs */}
      <Flex wrap="wrap" gap={6} justify={{ base: 'center', sm: 'flex-start' }}>
        {TEMPLATE_CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer border border-solid ${
                isSelected
                  ? 'bg-chatbox-tint-brand text-white border-chatbox-tint-brand shadow-xs'
                  : 'bg-chatbox-background-secondary text-chatbox-tint-secondary border-chatbox-border-primary hover:bg-chatbox-background-tertiary hover:text-chatbox-tint-primary'
              }`}
            >
              {t(cat.label)}
            </button>
          )
        })}
      </Flex>

      {/* Single-Line Prompt Template Bars (One line one prompt, vertical stack format) */}
      <Stack gap={8} className="w-full">
        {displayedTemplates.map((template) => (
          <AutomationTemplateCard key={template.id} template={template} onSelect={onSelectTemplate} />
        ))}
      </Stack>

      {/* Compressed Mode Toggle Button */}
      {hasMore && (
        <UnstyledButton
          onClick={() => setIsCompressed((prev) => !prev)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-chatbox-border-primary hover:border-chatbox-tint-brand/60 bg-chatbox-background-secondary/30 hover:bg-chatbox-background-secondary/70 text-xs font-medium text-chatbox-tint-secondary hover:text-chatbox-tint-primary transition-all cursor-pointer"
          aria-label={isCompressed ? t('Expand templates') : t('Compress templates')}
        >
          {isCompressed ? (
            <>
              <span>
                {t('Show all {{total}} templates ({{remaining}} more)', {
                  total: filteredTemplates.length,
                  remaining: filteredTemplates.length - COMPRESSED_TEMPLATE_COUNT,
                  defaultValue: `Show all ${filteredTemplates.length} templates (${filteredTemplates.length - COMPRESSED_TEMPLATE_COUNT} more)`,
                })}
              </span>
              <IconChevronDown size={14} />
            </>
          ) : (
            <>
              <span>{t('Show less (compressed mode)')}</span>
              <IconChevronUp size={14} />
            </>
          )}
        </UnstyledButton>
      )}
    </Stack>
  )
})
