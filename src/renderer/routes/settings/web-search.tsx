import { Button, Flex, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { IconCheck, IconX } from '@tabler/icons-react'
import { createFileRoute } from '@tanstack/react-router'
import { ofetch } from 'ofetch'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AdaptiveSelect } from '@/components/AdaptiveSelect'
import { PROVIDERS_WITH_PARSE_LINK } from '@/packages/web-search'
import { WEB_SEARCH_PROVIDERS, type WebSearchProviderValue } from '@/packages/web-search/constants'
import { useSettingsStore } from '@/stores/settingsStore'

export const Route = createFileRoute('/settings/web-search')({
  component: RouteComponent,
})

export function RouteComponent() {
  const { t } = useTranslation()
  const setSettings = useSettingsStore((state) => state.setSettings)
  const extension = useSettingsStore((state) => state.extension)

  const [checkingGoogle, setCheckingGoogle] = useState(false)
  const [googleAvailable, setGoogleAvailable] = useState<boolean>()
  const checkGoogle = async () => {
    if (extension.webSearch.googleApiKey && extension.webSearch.googleCx) {
      setCheckingGoogle(true)
      setGoogleAvailable(undefined)
      try {
        await ofetch('https://www.googleapis.com/customsearch/v1', {
          method: 'GET',
          query: {
            key: extension.webSearch.googleApiKey,
            cx: extension.webSearch.googleCx,
            q: 'AgentLab',
            num: '1',
          },
        })
        setGoogleAvailable(true)
      } catch {
        setGoogleAvailable(false)
      } finally {
        setCheckingGoogle(false)
      }
    }
  }

  return (
    <Stack p="md" gap="xxl">
      <Title order={5}>{t('Web Search')}</Title>

      <AdaptiveSelect
        comboboxProps={{ withinPortal: true, withArrow: true }}
        data={WEB_SEARCH_PROVIDERS.map((p) => ({ value: p.value, label: p.label }))}
        value={extension.webSearch.provider}
        onChange={(e) =>
          e &&
          setSettings({
            extension: {
              ...extension,
              webSearch: {
                ...extension.webSearch,
                provider: e as WebSearchProviderValue,
              },
            },
          })
        }
        label={t('Search Provider')}
        maw={320}
      />
      <Stack gap={4}>
        <Text size="xs" c="chatbox-gray">
          {t('Provided tools')}
        </Text>
        {(() => {
          const supportsParseLink = PROVIDERS_WITH_PARSE_LINK.has(extension.webSearch.provider)
          const tools: { label: string; supported: boolean }[] = [
            { label: t('Web Search'), supported: true },
            { label: t('Read Webpage'), supported: supportsParseLink },
          ]
          return tools.map(({ label, supported }) => (
            <Flex key={label} align="center" gap="xs">
              {supported ? (
                <IconCheck size={14} color="var(--mantine-color-chatbox-success-6)" />
              ) : (
                <IconX size={14} color="var(--mantine-color-chatbox-gray-5)" />
              )}
              <Text size="xs" c={supported ? undefined : 'chatbox-gray'}>
                {label}
              </Text>
            </Flex>
          ))
        })()}
      </Stack>

      {extension.webSearch.provider === 'bing' && (
        <Text size="xs" c="chatbox-gray">
          {t(
            'Bing Search is provided for free use without requiring an API key. It uses a local proxy to ensure compatibility across platforms.'
          )}
        </Text>
      )}

      {extension.webSearch.provider === 'google' && (
        <Stack gap="md">
          <Text size="xs" c="chatbox-gray">
            {t(
              'Google Search uses the Google Custom Search JSON API. You can get a free API key (100 free queries/day) and Search Engine ID (CX) from Google Cloud and Programmable Search Engine.'
            )}
          </Text>

          {/* Google API Key */}
          <Stack gap="xs">
            <Text fw="600">{t('Google API Key')}</Text>
            <PasswordInput
              maw={320}
              value={extension.webSearch.googleApiKey || ''}
              placeholder="AIzaSy..."
              autoComplete="new-password"
              name="google-search-api-key"
              data-1p-ignore="true"
              data-lpignore="true"
              data-form-type="other"
              data-bwignore="true"
              onChange={(e) => {
                setGoogleAvailable(undefined)
                setSettings({
                  extension: {
                    ...extension,
                    webSearch: {
                      ...extension.webSearch,
                      googleApiKey: e.currentTarget.value,
                    },
                  },
                })
              }}
              error={googleAvailable === false}
            />
          </Stack>

          {/* Google Search Engine ID (CX) */}
          <Stack gap="xs">
            <Text fw="600">{t('Search Engine ID (CX)')}</Text>
            <Flex align="center" gap="xs">
              <TextInput
                flex={1}
                maw={320}
                value={extension.webSearch.googleCx || ''}
                placeholder="a1b2c3d4e5f6..."
                onChange={(e) => {
                  setGoogleAvailable(undefined)
                  setSettings({
                    extension: {
                      ...extension,
                      webSearch: {
                        ...extension.webSearch,
                        googleCx: e.currentTarget.value,
                      },
                    },
                  })
                }}
                error={googleAvailable === false}
              />
              <Button
                color="blue"
                variant="light"
                onClick={checkGoogle}
                loading={checkingGoogle}
                disabled={!extension.webSearch.googleApiKey?.trim() || !extension.webSearch.googleCx?.trim()}
              >
                {t('Check')}
              </Button>
            </Flex>
            {typeof googleAvailable === 'boolean' ? (
              googleAvailable ? (
                <Text size="xs" c="chatbox-success">
                  {t('Connection successful!')}
                </Text>
              ) : (
                <Text size="xs" c="chatbox-error">
                  {t('Connection failed!')}
                </Text>
              )
            ) : null}
          </Stack>
        </Stack>
      )}
    </Stack>
  )
}
