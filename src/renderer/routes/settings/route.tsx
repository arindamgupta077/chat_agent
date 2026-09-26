import { ActionIcon, Box, Flex, Stack, Text, Title } from '@mantine/core'
import { TestId } from '@shared/automation/testids'
import {
  IconAdjustmentsHorizontal,
  IconArchive,
  IconBook,
  IconBox,
  IconCategory,
  IconChevronLeft,
  IconChevronRight,
  IconCircleDottedLetterM,
  IconFileText,
  IconMessages,
  IconRobotFace,
  IconShieldCheck,
  IconWand,
  IconWorldWww,
} from '@tabler/icons-react'
import { createFileRoute, Link, Outlet, useCanGoBack, useRouter, useRouterState } from '@tanstack/react-router'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { Toaster } from 'sonner'
import Divider from '@/components/common/Divider'
import { ScalableIcon } from '@/components/common/ScalableIcon'
import Page from '@/components/layout/Page'
import { useIsSmallScreen } from '@/hooks/useScreenChange'
import { useAppAuthStore } from '@/stores/appAuthStore'
import platform from '@/platform'
import { featureFlags } from '@/utils/feature-flags'

const ITEMS = [
  {
    key: 'provider',
    label: 'Model Provider',
    icon: <IconCategory className="w-full h-full" />,
  },
  {
    key: 'default-models',
    label: 'Default Models',
    icon: <IconBox className="w-full h-full" />,
  },
  {
    key: 'web-search',
    label: 'Web Search',
    icon: <IconWorldWww className="w-full h-full" />,
  },
  ...(featureFlags.mcp
    ? [
        {
          key: 'mcp',
          label: 'MCP',
          icon: <IconCircleDottedLetterM className="w-full h-full" />,
        },
      ]
    : []),
  ...(featureFlags.knowledgeBase
    ? [
        {
          key: 'knowledge-base',
          label: 'Knowledge Base',
          icon: <IconBook className="w-full h-full" />,
        },
      ]
    : []),
  ...(featureFlags.skills
    ? [
        {
          key: 'skills',
          label: 'Skills',
          noTranslate: true,
          icon: <IconWand className="w-full h-full" />,
        },
        // Agent settings share the skills gate: both surface only where agent mode runs.
        {
          key: 'agent',
          label: 'Agent',
          icon: <IconRobotFace className="w-full h-full" />,
        },
      ]
    : []),
  {
    key: 'document-parser',
    label: 'Document Parser',
    icon: <IconFileText className="w-full h-full" />,
  },
  {
    key: 'chat',
    label: 'Chat Settings',
    icon: <IconMessages className="w-full h-full" />,
  },
  {
    key: 'archive',
    label: 'Archived Chats',
    icon: <IconArchive className="w-full h-full" />,
  },
  {
    key: 'general',
    label: 'General Settings',
    icon: <IconAdjustmentsHorizontal className="w-full h-full" />,
  },
]

export const Route = createFileRoute('/settings')({
  component: RouteComponent,
})

export function RouteComponent() {
  const { t } = useTranslation()
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const isSmallScreen = useIsSmallScreen()

  return (
    <Page
      title={t('Settings')}
      left={
        isSmallScreen && canGoBack ? (
          <ActionIcon
            className="controls"
            variant="subtle"
            size={28}
            color="chatbox-secondary"
            mr="sm"
            onClick={() => router.history.back()}
          >
            <IconChevronLeft />
          </ActionIcon>
        ) : undefined
      }
    >
      <SettingsRoot />
      <Toaster richColors position="bottom-center" style={{ zIndex: 2147483647 }} />
    </Page>
  )
}

export function SettingsRoot() {
  const { t } = useTranslation()
  const routerState = useRouterState()
  const key = routerState.location.pathname.split('/')[2]
  const isSmallScreen = useIsSmallScreen()
  const user = useAppAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const visibleItems = ITEMS.filter((item) => {
    if (!isAdmin && (item.key === 'provider' || item.key === 'default-models' || item.key === 'document-parser')) {
      return false
    }
    return true
  })

  return (
    <Flex flex={1} h="100%" miw={isSmallScreen ? undefined : 800}>
      {(!isSmallScreen || routerState.location.pathname === '/settings') && (
        <Stack
          p={isSmallScreen ? 0 : 'xs'}
          gap={isSmallScreen ? 0 : 'xs'}
          maw={isSmallScreen ? undefined : 256}
          className={clsx(
            'border-solid border-0 border-r overflow-auto border-chatbox-border-primary',
            isSmallScreen ? 'w-full border-r-0' : 'flex-[1_0_auto]'
          )}
        >
          {visibleItems.map((item) => (
            <Link
              disabled={
                routerState.location.pathname === `/settings/${item.key}` ||
                routerState.location.pathname.startsWith(`/settings/${item.key}/`)
              }
              key={item.key}
              to={`/settings/${item.key}` as any}
              className={'block no-underline w-full'}
              data-testid={
                item.key === 'chat'
                  ? TestId.settings.navChat
                  : item.key === 'general'
                    ? TestId.settings.navGeneral
                    : item.key === 'default-models'
                      ? TestId.settings.navDefaultModels
                      : undefined
              }
            >
              <Flex
                component="span"
                gap="xs"
                p="md"
                pr="xl"
                py={isSmallScreen ? 'sm' : undefined}
                align="center"
                c={item.key === key ? 'chatbox-brand' : 'chatbox-secondary'}
                bg={item.key === key ? 'var(--chatbox-background-brand-secondary)' : 'transparent'}
                className={clsx(
                  ' cursor-pointer select-none rounded-lg',
                  item.key === key ? '' : 'hover:!bg-chatbox-background-gray-secondary'
                )}
              >
                <Box component="span" flex="0 0 auto" w={20} h={20} mr="xs">
                  {item.icon}
                </Box>
                <Text
                  flex={1}
                  lineClamp={1}
                  span={true}
                  className={`!text-inherit ${isSmallScreen ? 'min-h-[32px] leading-[32px]' : ''}`}
                >
                  {'noTranslate' in item && item.noTranslate ? item.label : t(item.label)}
                </Text>
                {isSmallScreen && (
                  <ScalableIcon icon={IconChevronRight} size={20} className="!text-chatbox-tint-tertiary" />
                )}
              </Flex>

              {isSmallScreen && <Divider />}
            </Link>
          ))}
        </Stack>
      )}
      {!(isSmallScreen && routerState.location.pathname === '/settings') && (
        <Box flex="1 1 80%" className="overflow-auto">
          {!isAdmin &&
          (routerState.location.pathname.startsWith('/settings/provider') ||
            routerState.location.pathname.startsWith('/settings/default-models') ||
            routerState.location.pathname.startsWith('/settings/document-parser')) ? (
            <Stack p="xl" align="center" justify="center" h="100%" gap="md" ta="center">
              <ScalableIcon icon={IconShieldCheck} size={48} className="text-amber-400" />
              <Title order={4}>Admin Configuration Only</Title>
              <Text size="sm" c="dimmed" maw={450}>
                AI models, providers, default model selections, and document parser settings are configured centrally by administrators. Normal users cannot view or modify these settings.
              </Text>
            </Stack>
          ) : (
            <Outlet />
          )}
        </Box>
      )}
    </Flex>
  )
}
