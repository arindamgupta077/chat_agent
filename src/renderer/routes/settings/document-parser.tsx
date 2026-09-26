import { Stack, Title, Text } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { DocumentParserSettings } from '@/components/settings/DocumentParserSettings'
import { ScalableIcon } from '@/components/common/ScalableIcon'
import { IconShieldCheck } from '@tabler/icons-react'
import { useAppAuthStore } from '@/stores/appAuthStore'

export const Route = createFileRoute('/settings/document-parser')({
  component: RouteComponent,
})

export function RouteComponent() {
  const user = useAppAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  if (!isAdmin) {
    return (
      <Stack p="xl" align="center" justify="center" h="100%" gap="md" ta="center">
        <ScalableIcon icon={IconShieldCheck} size={48} className="text-amber-400" />
        <Title order={4}>Admin Configuration Only</Title>
        <Text size="sm" c="dimmed" maw={450}>
          Document parser settings are configured centrally by administrators. Normal users cannot view or modify these settings.
        </Text>
      </Stack>
    )
  }

  return <DocumentParserSettings showTitle={false} />
}
