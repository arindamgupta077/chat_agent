import { isBuiltInTemplateSessionId } from '@/packages/initial_data'
import storage from '@/storage'
import { StorageKeyGenerator } from '@/storage/StoreStorage'
import { getMetaStorage } from '@/stores/sessionHelpers'

export async function cleanupDefaultTemplateSessions(): Promise<void> {
  try {
    const metaStorage = await getMetaStorage()
    const allRecords = await metaStorage.getAllIncludingHidden()
    const toDelete = allRecords
      .filter((s) => isBuiltInTemplateSessionId(s.id))
      .map((s) => s.id)

    if (toDelete.length > 0) {
      await metaStorage.deleteMany(toDelete)
      for (const id of toDelete) {
        await storage.removeItem(StorageKeyGenerator.session(id)).catch(() => {})
      }
    }
  } catch (err) {
    console.error('Failed to cleanup default template sessions', err)
  }
}

export async function initData() {
  await cleanupDefaultTemplateSessions()
}
