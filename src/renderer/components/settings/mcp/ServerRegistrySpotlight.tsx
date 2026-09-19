import { Spotlight, type SpotlightActionData, type SpotlightActionGroupData } from '@mantine/spotlight'
import { IconSearch, IconSquareRoundedPlusFilled } from '@tabler/icons-react'
import { type FC, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ScalableIcon } from '@/components/common/ScalableIcon'
import type { MCPRegistryEntry } from './registries'

const ServerRegistrySpotlight: FC<{
  triggerAddServer: (entry?: MCPRegistryEntry) => void
  triggerImportJson?: () => void
}> = (props) => {
  const { t } = useTranslation()
  const actions: (SpotlightActionGroupData | SpotlightActionData)[] = useMemo(() => {
    return [
      {
        id: 'custom',
        label: t('Add custom MCP Server')!,
        description: t('Configure MCP server manually')!,
        keywords: ['mcp', 'custom', 'server', 'add', 'custom mcp server'],
        onClick: () => props.triggerAddServer(),
        leftSection: <ScalableIcon icon={IconSquareRoundedPlusFilled} size={24} className="text-chatbox-tint-brand" />,
      },
    ]
  }, [props.triggerAddServer, t])

  return (
    <Spotlight
      actions={actions}
      nothingFound={t('Nothing found...')!}
      scrollable
      maxHeight={600}
      shortcut={null}
      searchProps={{
        leftSection: <ScalableIcon icon={IconSearch} size={20} stroke={1.5} />,
        placeholder: t('Search...')!,
      }}
    />
  )
}

export default ServerRegistrySpotlight
