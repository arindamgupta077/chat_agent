import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionMetaStorage } from '@/storage/SessionMetaStorage'
import { cleanupDefaultTemplateSessions, initData } from './init_data'

const metaStorage = vi.hoisted(() => ({
  getAllIncludingHidden: vi.fn(),
  deleteMany: vi.fn(),
}))

const storageMock = vi.hoisted(() => ({
  removeItem: vi.fn(),
}))

vi.mock('@/packages/initial_data', () => ({
  isBuiltInTemplateSessionId: (id: string) =>
    id === 'default-template-1' || id.startsWith('chatbox-chat-demo-'),
}))

vi.mock('@/storage', () => ({
  default: storageMock,
}))

vi.mock('@/storage/StoreStorage', () => ({
  StorageKeyGenerator: {
    session: (id: string) => `session:${id}`,
  },
}))

vi.mock('@/stores/sessionHelpers', () => ({
  getMetaStorage: vi.fn(() => Promise.resolve(metaStorage)),
}))

describe('initData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    metaStorage.deleteMany.mockResolvedValue(undefined)
    storageMock.removeItem.mockResolvedValue(undefined)
  })

  it('removes default template sessions when present', async () => {
    metaStorage.getAllIncludingHidden.mockResolvedValue([
      { id: 'default-template-1', name: 'Markdown 101 (Example)' },
      { id: 'user-session-1', name: 'My Real Chat' },
      { id: 'chatbox-chat-demo-artifact-1-en', name: 'Snake Game' },
    ])

    await initData()

    expect(metaStorage.deleteMany).toHaveBeenCalledWith([
      'default-template-1',
      'chatbox-chat-demo-artifact-1-en',
    ])
    expect(storageMock.removeItem).toHaveBeenCalledWith('session:default-template-1')
    expect(storageMock.removeItem).toHaveBeenCalledWith('session:chatbox-chat-demo-artifact-1-en')
    expect(storageMock.removeItem).not.toHaveBeenCalledWith('session:user-session-1')
  })

  it('does not delete anything when no template sessions exist', async () => {
    metaStorage.getAllIncludingHidden.mockResolvedValue([
      { id: 'user-session-1', name: 'My Real Chat' },
    ])

    await cleanupDefaultTemplateSessions()

    expect(metaStorage.deleteMany).not.toHaveBeenCalled()
    expect(storageMock.removeItem).not.toHaveBeenCalled()
  })
})

metaStorage satisfies Pick<SessionMetaStorage, 'getAllIncludingHidden' | 'deleteMany'>
