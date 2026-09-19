import type { CopilotDetail, Session } from '@shared/types'
import { getDefaultStore } from 'jotai'
import { collectGlobalResourceReferences, collectSessionResourceReferences } from '@/packages/backup/resources'
import { StorageKey, StorageKeyGenerator } from '@/storage/StoreStorage'
import { inputBoxPreConstructedMessageFamily } from '@/stores/atoms/uiAtoms'
import { getMetaStorage } from '@/stores/sessionHelpers'
import { settingsStore } from '@/stores/settingsStore'
import platform from '../platform'
import storage from '../storage'
import { getRecentlyWrittenBlobKeys, isBlobRecentlyWritten } from '../storage/blob-write-tracker'

const CLEANABLE_BLOB_PREFIXES = [
  'picture:',
  'file:',
  'parseUrl-',
  'parseFile-',
  'link:',
  'tool-result:',
  'generation-request:',
]

/**
 * Blobs written within this window are treated as in-flight and never deleted:
 * a producer may write a blob before persisting its durable reference (e.g.
 * image generation stores the picture first, then updates the record), and a
 * quota-triggered cleanup can run inside that gap.
 */
const IN_FLIGHT_BLOB_PROTECTION_MS = 10 * 60 * 1000

/**
 * Default overall time budget per cleanup run (quota-recovery path: the user is
 * actively waiting). If the reference scan exceeds it, the run aborts safely
 * without deleting anything; if it expires during deletion, deletion stops
 * early and remaining orphans are reclaimed by a later run.
 */
const DEFAULT_CLEANUP_DEADLINE_MS = 30 * 1000
/** Startup cleanup is not user-blocking, allow a generous budget. */
const STARTUP_CLEANUP_DEADLINE_MS = 5 * 60 * 1000
/** Max continuous work before yielding back to the event loop. */
const WORK_SLICE_MS = 50
/** Delete in small batches (AGENTS.md: chunk bulk storage cleanup on mobile). */
const DELETE_BATCH_SIZE = 25

type CleanupOptions = {
  extraProtectedKeys?: Iterable<string>
  /** Overall time budget for this run. Defaults to DEFAULT_CLEANUP_DEADLINE_MS. */
  deadlineMs?: number
}

if (platform.type !== 'desktop') {
  setTimeout(() => {
    cleanupOrphanedBlobs({ deadlineMs: STARTUP_CLEANUP_DEADLINE_MS }).catch((e) =>
      console.error('storage_clear: startup cleanup failed', e)
    )
  }, 10 * 1000)
}

/**
 * Attachments and pasted images living in the input box drafts are not referenced by
 * any session yet. They must survive a cleanup triggered while the user is composing
 * (e.g. the storage-quota recovery path), so collect their storage keys here.
 */
function collectDraftAttachmentKeys(): Set<string> {
  const protectedKeys = new Set<string>()
  try {
    const store = getDefaultStore()
    for (const sessionId of inputBoxPreConstructedMessageFamily.getParams?.() ?? []) {
      const draft = store.get(inputBoxPreConstructedMessageFamily(sessionId))
      for (const key of draft.pictureKeys) {
        protectedKeys.add(key)
      }
      for (const preprocessedFile of draft.preprocessedFiles) {
        if (preprocessedFile.storageKey) protectedKeys.add(preprocessedFile.storageKey)
        if (preprocessedFile.rawStorageKey) protectedKeys.add(preprocessedFile.rawStorageKey)
      }
      for (const link of draft.preprocessedLinks) {
        if (link.storageKey) protectedKeys.add(link.storageKey)
      }
      // In-flight preprocessing entries are keyed by the attachment's blob uniqKey
      // (StorageKeyGenerator.fileUniqKey / linkUniqKey), so protecting the status map
      // also protects blobs written by a preprocess that has not completed yet.
      for (const key of Object.keys(draft.preprocessingStatus.files)) {
        if (draft.preprocessingStatus.files[key]) {
          protectedKeys.add(key)
          protectedKeys.add(`${key}_raw`)
        }
      }
      for (const key of Object.keys(draft.preprocessingStatus.links)) {
        if (draft.preprocessingStatus.links[key]) {
          protectedKeys.add(key)
        }
      }
    }
  } catch (error) {
    console.error('storage_clear: failed to collect draft attachment keys', error)
  }
  return protectedKeys
}

async function doCleanupOrphanedBlobs(options?: CleanupOptions): Promise<number> {
  const deadline = Date.now() + (options?.deadlineMs ?? DEFAULT_CLEANUP_DEADLINE_MS)
  // Cooperative time slicing: the reference scan competes with interactive
  // storage reads (switching sessions, sending messages), so yield to the event
  // loop after every WORK_SLICE_MS of continuous work.
  let sliceStart = Date.now()
  const yieldIfNeeded = async () => {
    if (Date.now() - sliceStart >= WORK_SLICE_MS) {
      await new Promise((resolve) => setTimeout(resolve, 0))
      sliceStart = Date.now()
    }
  }

  const allBlobKeys = await storage.getBlobKeys()
  const storageKeys = allBlobKeys.filter((key) => CLEANABLE_BLOB_PREFIXES.some((prefix) => key.startsWith(prefix)))
  if (storageKeys.length === 0) {
    return 0
  }
  const needDeletedSet = new Set<string>(storageKeys)

  for (const key of options?.extraProtectedKeys ?? []) {
    needDeletedSet.delete(key)
  }
  for (const key of collectDraftAttachmentKeys()) {
    needDeletedSet.delete(key)
  }
  for (const key of getRecentlyWrittenBlobKeys(IN_FLIGHT_BLOB_PROTECTION_MS)) {
    needDeletedSet.delete(key)
  }
  if (needDeletedSet.size === 0) return 0

  const metaStorage = await getMetaStorage()
  const allSessionsMeta = await metaStorage.getAllIncludingHidden()
  for (const sessionMeta of allSessionsMeta) {
    if (Date.now() > deadline) {
      console.warn(
        `storage_clear: reference scan exceeded its time budget (${allSessionsMeta.length} sessions), aborting without deleting`
      )
      return 0
    }
    await yieldIfNeeded()
    const session = await storage.getItem<Session | null>(StorageKeyGenerator.session(sessionMeta.id), null)
    if (!session) {
      continue
    }
    for (const reference of collectSessionResourceReferences(session).references) {
      needDeletedSet.delete(reference.storageKey)
    }
    if (needDeletedSet.size === 0) return 0
  }

  const settings = settingsStore.getState().getSettings()
  const copilots = await storage.getItem<CopilotDetail[]>(StorageKey.MyCopilots, [])
  for (const reference of collectGlobalResourceReferences(settings, copilots)) {
    needDeletedSet.delete(reference.storageKey)
  }

  try {
    const imageGenStorage = platform.getImageGenerationStorage()
    await imageGenStorage.initialize()
    const total = await imageGenStorage.getTotal()
    let cursor = 0
    const pageSize = 100
    while (cursor < total) {
      if (Date.now() > deadline) {
        console.warn(
          'storage_clear: reference scan exceeded its time budget (image records), aborting without deleting'
        )
        return 0
      }
      await yieldIfNeeded()
      const page = await imageGenStorage.getPage(cursor, pageSize)
      for (const record of page.items) {
        for (const k of record.generatedImages) needDeletedSet.delete(k)
        for (const k of record.referenceImages) needDeletedSet.delete(k)
      }
      if (page.nextCursor === null) break
      cursor = page.nextCursor
    }
  } catch (e) {
    console.error('storage_clear: failed to scan image generation storage', e)
    return 0
  }

  for (const key of collectDraftAttachmentKeys()) {
    needDeletedSet.delete(key)
  }
  for (const key of getRecentlyWrittenBlobKeys(IN_FLIGHT_BLOB_PROTECTION_MS)) {
    needDeletedSet.delete(key)
  }

  let deletedCount = 0
  let processed = 0
  for (const key of needDeletedSet) {
    if (Date.now() > deadline) {
      console.warn(`storage_clear: deletion stopped early by time budget after ${deletedCount} blobs`)
      break
    }
    // Content-addressed blob reuse (generation request definitions) touches
    // the key without rewriting it, so recheck the in-flight window right
    // before each delete instead of only once after the scan.
    if (isBlobRecentlyWritten(key, IN_FLIGHT_BLOB_PROTECTION_MS)) continue
    try {
      await storage.delBlob(key)
      deletedCount++
      totalDeletedCount++
    } catch (e) {
      console.error(`storage_clear: failed to delete blob ${key}`, e)
    }
    if (++processed % DELETE_BATCH_SIZE === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }
  return deletedCount
}

let cleanupQueue: Promise<unknown> = Promise.resolve()
/** Monotonic count of blobs deleted by any cleanup run since startup. */
let totalDeletedCount = 0

/**
 * Remove orphaned attachment/image blobs that are no longer referenced by any
 * session (including hidden/archived ones), draft, avatar/background setting or
 * Image Creator record.
 *
 * Runs are serialized so the startup task and the storage-quota recovery path
 * (see prepareFileAttachment) never scan/delete concurrently. Each run is
 * cooperatively time-sliced and bounded by a deadline: an over-budget scan
 * aborts without deleting; an over-budget deletion stops early (safe — orphan
 * status is established by the completed scan).
 *
 * @returns the number of blobs freed since this call was made — including
 * deletions by queued runs that executed ahead of this one, so concurrent
 * quota-recovery callers still observe the space just freed for them.
 */
export function cleanupOrphanedBlobs(options?: CleanupOptions): Promise<number> {
  const deletedBefore = totalDeletedCount
  const run = cleanupQueue.catch(() => undefined).then(() => doCleanupOrphanedBlobs(options))
  cleanupQueue = run.catch(() => undefined)
  return run.then(() => totalDeletedCount - deletedBefore)
}
