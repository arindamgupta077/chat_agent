import { registerPlugin } from '@capacitor/core'
import NiceModal from '@ebay/nice-modal-react'
import { ActionIcon, Badge, Box, Button, Flex, Image, NavLink, Stack, Text } from '@mantine/core'
import SwipeableDrawer from '@mui/material/SwipeableDrawer'
import { TestId } from '@shared/automation/testids'
import {
  IconArchive,
  IconCirclePlus,
  IconDownload,
  IconLayoutSidebarLeftCollapse,
  IconLogout,
  IconPhotoPlus,
  IconRoute,
  IconSearch,
  IconSettingsFilled,
  IconShieldCheck,
  IconUser,
  IconUsers,
} from '@tabler/icons-react'
import platform from '@/platform'
import { useAppAuthStore } from './stores/appAuthStore'
import { AdminUserModal } from './components/admin/AdminUserModal'
import { useNavigate } from '@tanstack/react-router'
import clsx from 'clsx'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppTooltip as Tooltip } from '@/components/ui/tooltip'
import Divider from './components/common/Divider'
import { ScalableIcon } from './components/common/ScalableIcon'
import SessionList from './components/session/SessionList'
import { useIsSmallScreen, useSidebarWidth } from './hooks/useScreenChange'
import { navigateToSettings } from './modals/settings-navigation'
import { trackingEvent } from './packages/event'
import { getSidebarModalSx } from './sidebar-drawer'
import icon from './static/icon.png'
import { useLanguage } from './stores/settingsStore'
import { useUIStore } from './stores/uiStore'
import { installUpdate, useUpdateStore } from './stores/updateStore'
import { CHATBOX_BUILD_PLATFORM, CHATBOX_BUILD_TARGET } from './variables'

interface ChatboxWebViewPlugin {
  setTextInteractionEnabled(options: { enabled: boolean }): Promise<void>
}

const ChatboxWebView = registerPlugin<ChatboxWebViewPlugin>('ChatboxWebView')

function setIosTextInteractionEnabled(enabled: boolean) {
  if (CHATBOX_BUILD_TARGET !== 'mobile_app' || CHATBOX_BUILD_PLATFORM !== 'ios') {
    return
  }

  void ChatboxWebView.setTextInteractionEnabled({ enabled }).catch((error: unknown) => {
    console.warn('Failed to update iOS text interaction:', error)
  })
}

export default function Sidebar() {
  const { t } = useTranslation()
  const language = useLanguage()
  const navigate = useNavigate()
  const showSidebar = useUIStore((s) => s.showSidebar)
  const setShowSidebar = useUIStore((s) => s.setShowSidebar)
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth)
  const setOpenSearchDialog = useUIStore((s) => s.setOpenSearchDialog)

  const sessionListViewportRef = useRef<HTMLDivElement>(null)

  const user = useAppAuthStore((s) => s.user)
  const logout = useAppAuthStore((s) => s.logout)
  const isAdmin = user?.role === 'admin'

  const sidebarWidth = useSidebarWidth()

  const isSmallScreen = useIsSmallScreen()

  const [isResizing, setIsResizing] = useState(false)
  const [adminModalOpened, setAdminModalOpened] = useState(false)
  const resizeStartX = useRef<number>(0)
  const resizeStartWidth = useRef<number>(0)

  const handleCreateNewSession = useCallback(() => {
    navigate({ to: `/` })

    if (isSmallScreen) {
      setShowSidebar(false)
    }
    trackingEvent('create_new_conversation', { event_category: 'user' })
  }, [navigate, setShowSidebar, isSmallScreen])

  const handleCreateNewPictureSession = useCallback(() => {
    if (!isAdmin) return
    navigate({ to: '/image-creator' })
    if (isSmallScreen) {
      setShowSidebar(false)
    }
    trackingEvent('open_image_creator', { event_category: 'user' })
  }, [isSmallScreen, setShowSidebar, navigate, isAdmin])

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (isSmallScreen) return
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)
      resizeStartX.current = e.clientX
      resizeStartWidth.current = sidebarWidth
    },
    [isSmallScreen, sidebarWidth]
  )

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartX.current
      const newWidth = Math.max(260, Math.min(500, resizeStartWidth.current + deltaX))
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, setSidebarWidth])

  useEffect(() => {
    setIosTextInteractionEnabled(!(isSmallScreen && showSidebar))

    return () => {
      setIosTextInteractionEnabled(true)
    }
  }, [isSmallScreen, showSidebar])

  return (
    <SwipeableDrawer
      anchor="left"
      variant={isSmallScreen ? 'temporary' : 'persistent'}
      open={showSidebar}
      onClose={() => setShowSidebar(false)}
      onOpen={() => setShowSidebar(true)}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile.
        disableEnforceFocus: true,
        sx: getSidebarModalSx(showSidebar),
      }}
      sx={{
        '& .MuiDrawer-paper': {
          backgroundColor: 'transparent',
          backgroundImage: 'none',
          border: 0,
          boxSizing: 'border-box',
          width: isSmallScreen ? '75vw' : sidebarWidth,
          maxWidth: '75vw',
        },
      }}
      PaperProps={{ sx: { overflowY: 'initial' } }}
      disableSwipeToOpen={CHATBOX_BUILD_PLATFORM !== 'ios'}
    >
      <Stack
        data-testid={TestId.sidebar.root}
        h="100%"
        gap={0}
        pt="var(--mobile-safe-area-inset-top, 0px)"
        pb="var(--mobile-safe-area-inset-bottom, 0px)"
        className="relative"
      >
        <Flex align="center" justify="space-between" gap="xs" px="md" py="sm" className="border-0">
          <Flex align="center" gap="sm" style={{ minWidth: 0, flex: 1 }}>
            <Flex
              align="center"
              gap="sm"
              style={{ minWidth: 0 }}
            >
              <Image src={icon} w={20} h={20} style={{ flexShrink: 0 }} />
              <Text span c="chatbox-secondary" size="xl" lh={1.2} fw="700" truncate>
                AgentLab
              </Text>
            </Flex>
          </Flex>

          <Flex align="center" gap={2} style={{ flexShrink: 0 }}>
            <Tooltip label={t('Search')} openDelay={1000} withArrow>
              <ActionIcon
                variant="subtle"
                color="chatbox-tertiary"
                size={26}
                radius="md"
                onClick={() => setOpenSearchDialog(true, true)}
              >
                <IconSearch size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t('Clear Conversation List')} openDelay={1000} withArrow>
              <ActionIcon
                variant="subtle"
                color="chatbox-tertiary"
                size={26}
                radius="md"
                onClick={() => NiceModal.show('clear-session-list')}
              >
                <IconArchive size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t('Collapse')} openDelay={1000} withArrow>
              <ActionIcon
                data-testid={TestId.sidebar.collapse}
                aria-label={t('Collapse') || undefined}
                variant="subtle"
                color="chatbox-tertiary"
                size={26}
                radius="md"
                onClick={() => setShowSidebar(false)}
              >
                <IconLayoutSidebarLeftCollapse size={18} />
              </ActionIcon>
            </Tooltip>
          </Flex>
        </Flex>

        <SessionList sessionListViewportRef={sessionListViewportRef} />

        <Stack gap={0} px="xs" pb="xs">
          <Divider />
          <Stack gap="xs" pt="xs" mb="xs">
            <Button
              variant="light"
              fullWidth
              radius="lg"
              data-testid={TestId.sidebar.newChat}
              onClick={handleCreateNewSession}
            >
              <ScalableIcon icon={IconCirclePlus} className="mr-2" />
              {t('New Chat')}
            </Button>
            {isAdmin && (
              <Button
                variant="light"
                fullWidth
                radius="lg"
                data-testid={TestId.sidebar.newImage}
                onClick={handleCreateNewPictureSession}
              >
                <ScalableIcon icon={IconPhotoPlus} className="mr-2" />
                {t('Create Image')}
              </Button>
            )}
          </Stack>

          {isSmallScreen ? (
            <Flex gap="md" align="center">
              <NavLink
                c="chatbox-secondary"
                className="rounded-lg"
                label={t('My workflows')}
                leftSection={<ScalableIcon icon={IconRoute} size={20} />}
                onClick={() => {
                  platform.openLink('http://10.10.66.209:5678/home/workflows')
                  setShowSidebar(false)
                }}
                variant="light"
                p="xs"
              />

              <ActionIcon
                data-testid={TestId.sidebar.settingsTrigger}
                variant="transparent"
                color="chatbox-secondary"
                size={24}
                onClick={() => {
                  navigateToSettings()
                  setShowSidebar(false)
                }}
              >
                <ScalableIcon icon={IconSettingsFilled} size={20} />
              </ActionIcon>
            </Flex>
          ) : (
            <>
              <NavLink
                c="chatbox-secondary"
                className="rounded-lg"
                label={t('My workflows')}
                leftSection={<ScalableIcon icon={IconRoute} size={20} />}
                onClick={() => {
                  platform.openLink('http://10.10.66.209:5678/home/workflows')
                  if (isSmallScreen) {
                    setShowSidebar(false)
                  }
                }}
                variant="light"
                p="xs"
              />
              <NavLink
                data-testid={TestId.sidebar.settingsTrigger}
                c="chatbox-secondary"
                className="rounded-lg"
                label={t('Settings')}
                leftSection={<ScalableIcon icon={IconSettingsFilled} size={20} />}
                onClick={() => navigateToSettings()}
                variant="light"
                p="xs"
              />
              {user && (
                <Box
                  p="xs"
                  className="rounded-lg border border-solid mt-2"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    borderColor: 'var(--chatbox-border-primary, rgba(255, 255, 255, 0.1))',
                  }}
                >
                  <Flex justify="space-between" align="center" gap="xs">
                    <Flex align="center" gap="xs" style={{ minWidth: 0, flex: 1 }}>
                      <ScalableIcon
                        icon={isAdmin ? IconShieldCheck : IconUser}
                        size={16}
                        className={isAdmin ? 'text-amber-400' : 'text-blue-400'}
                      />
                      <Box style={{ minWidth: 0, flex: 1 }}>
                        <Flex align="center" gap="xs">
                          <Tooltip label={user.username}>
                            <Text size="xs" fw={600} truncate style={{ minWidth: 0, flex: 1 }}>
                              {user.username}
                            </Text>
                          </Tooltip>
                          {isAdmin && (
                            <Badge size="xs" color="yellow" variant="light" style={{ flexShrink: 0 }}>
                              ADMIN
                            </Badge>
                          )}
                        </Flex>
                      </Box>
                    </Flex>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={logout}
                      title="Sign Out"
                      style={{ flexShrink: 0 }}
                    >
                      <ScalableIcon icon={IconLogout} size={15} />
                    </ActionIcon>
                  </Flex>

                  {isAdmin && (
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="yellow"
                      fullWidth
                      leftSection={<ScalableIcon icon={IconUsers} size={13} />}
                      onClick={() => setAdminModalOpened(true)}
                      mt="xs"
                      style={{ fontSize: '11px', fontWeight: 600 }}
                    >
                      Manage users
                    </Button>
                  )}
                </Box>
              )}

              {isAdmin && (
                <AdminUserModal
                  opened={adminModalOpened}
                  onClose={() => setAdminModalOpened(false)}
                />
              )}
            </>
          )}
        </Stack>
        {!isSmallScreen && (
          <Box
            onMouseDown={handleResizeStart}
            className={clsx(
              'sidebar-resizer absolute top-0 bottom-0 w-1 cursor-col-resize z-[1] bg-chatbox-border-primary opacity-0 hover:opacity-70 transition-opacity duration-200 -right-1'
            )}
          />
        )}
      </Stack>
    </SwipeableDrawer>
  )
}
