import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Box, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { AdaptiveModal } from '@/components/common/AdaptiveModal'
import { AutomationTemplateGrid } from '@/components/chat/AutomationTemplateGrid'
import type { AutomationPromptTemplate } from '@/packages/templates/automationTemplates'

export const AutomationTemplateModal = NiceModal.create(() => {
  const modal = useModal()
  const { t } = useTranslation()

  const handleSelectTemplate = (_template: AutomationPromptTemplate) => {
    modal.resolve()
    modal.hide()
  }

  return (
    <AdaptiveModal
      opened={modal.visible}
      onClose={() => modal.hide()}
      size="lg"
      centered
      title={
        <Text fw={700} size="md" className="text-chatbox-tint-primary">
          {t('Workflow Templates')}
        </Text>
      }
    >
      <Box className="max-h-[75vh] overflow-y-auto px-1 py-1">
        <AutomationTemplateGrid
          showTitle={false}
          defaultCompressed={false}
          className="!px-0 !py-0"
          onSelectTemplate={handleSelectTemplate}
        />
      </Box>
    </AdaptiveModal>
  )
})
