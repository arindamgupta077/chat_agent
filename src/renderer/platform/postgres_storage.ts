/**
 * AgentLab PostgreSQL Remote Storage Adapter
 * 
 * Routes all key-value, blob, session metadata, and image generation storage operations
 * through the Node.js backend to the local PostgreSQL database.
 * Every request includes Bearer JWT authentication for multi-user isolation.
 */

import type { ImageGeneration, ImageGenerationPage, SessionMetaPage, SessionMetaRecord } from '@shared/types'
import type { ImageGenerationStorage } from '@/storage/ImageGenerationStorage'
import type { SessionMetaStorage } from '@/storage/SessionMetaStorage'
import { getAuthHeaders, getAuthToken } from '@/stores/appAuthStore'
import type { Storage } from './interfaces'

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options.headers || {}),
  }

  const res = await fetch(url, { ...options, headers })
  return res
}

// -------------------------------------------------------------
// 1. Core Key-Value Storage Implementation
// -------------------------------------------------------------
export class PostgresStorage implements Storage {
  private memoryFallback = new Map<string, any>()

  public getStorageType(): string {
    return 'POSTGRES_REMOTE'
  }

  public async setStoreValue(key: string, value: any): Promise<void> {
    const token = getAuthToken()
    if (!token) {
      this.memoryFallback.set(key, value)
      return
    }
    try {
      const res = await apiFetch(`/api/storage/values/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
      })
      if (!res.ok && res.status !== 401) {
        console.error(`[PostgresStorage] Failed to set key "${key}": HTTP ${res.status}`)
      }
    } catch (err) {
      console.error(`[PostgresStorage] Error setting key "${key}":`, err)
    }
  }

  public async getStoreValue(key: string): Promise<any> {
    const token = getAuthToken()
    if (!token) {
      return this.memoryFallback.get(key) ?? null
    }
    try {
      const res = await apiFetch(`/api/storage/values/${encodeURIComponent(key)}`)
      if (res.status === 404 || res.status === 401) return null
      if (!res.ok) return null
      const data = await res.json()
      return data.value ?? null
    } catch (err) {
      console.error(`[PostgresStorage] Error getting key "${key}":`, err)
      return null
    }
  }

  public async delStoreValue(key: string): Promise<void> {
    const token = getAuthToken()
    if (!token) {
      this.memoryFallback.delete(key)
      return
    }
    try {
      await apiFetch(`/api/storage/values/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      })
    } catch (err) {
      console.error(`[PostgresStorage] Error deleting key "${key}":`, err)
    }
  }

  public async getAllStoreValues(): Promise<{ [key: string]: any }> {
    const token = getAuthToken()
    if (!token) {
      return Object.fromEntries(this.memoryFallback.entries())
    }
    try {
      const res = await apiFetch('/api/storage/values')
      if (!res.ok) return {}
      return await res.json()
    } catch (err) {
      console.error('[PostgresStorage] Error getting all values:', err)
      return {}
    }
  }

  public async getAllStoreKeys(): Promise<string[]> {
    const token = getAuthToken()
    if (!token) {
      return Array.from(this.memoryFallback.keys())
    }
    try {
      const res = await apiFetch('/api/storage/keys')
      if (!res.ok) return []
      return await res.json()
    } catch (err) {
      console.error('[PostgresStorage] Error getting all keys:', err)
      return []
    }
  }

  public async setAllStoreValues(data: { [key: string]: any }): Promise<void> {
    const token = getAuthToken()
    if (!token) {
      for (const [k, v] of Object.entries(data)) {
        this.memoryFallback.set(k, v)
      }
      return
    }
    try {
      await apiFetch('/api/storage/values/batch', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    } catch (err) {
      console.error('[PostgresStorage] Error batch setting values:', err)
    }
  }

  // Blob storage methods
  public async getStoreBlob(key: string): Promise<string | null> {
    try {
      const res = await apiFetch(`/api/storage/blobs/${encodeURIComponent(key)}`)
      if (!res.ok) return null
      const json = await res.json()
      return json.data ?? null
    } catch {
      return null
    }
  }

  public async setStoreBlob(key: string, value: string): Promise<void> {
    try {
      await apiFetch(`/api/storage/blobs/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({ data: value }),
      })
    } catch (err) {
      console.error(`[PostgresStorage] Failed to store blob "${key}":`, err)
    }
  }

  public async delStoreBlob(key: string): Promise<void> {
    try {
      await apiFetch(`/api/storage/blobs/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      })
    } catch (err) {
      console.error(`[PostgresStorage] Failed to delete blob "${key}":`, err)
    }
  }

  public async listStoreBlobKeys(): Promise<string[]> {
    try {
      const res = await apiFetch('/api/storage/blob-keys')
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  }
}

// -------------------------------------------------------------
// 2. Session Metadata Storage Implementation
// -------------------------------------------------------------
export class PostgresSessionMetaStorage implements SessionMetaStorage {
  public async initialize(): Promise<void> {
    return Promise.resolve()
  }

  public async create(record: SessionMetaRecord): Promise<void> {
    await apiFetch('/api/session-meta', {
      method: 'POST',
      body: JSON.stringify(record),
    })
  }

  public async createMany(records: SessionMetaRecord[]): Promise<void> {
    await apiFetch('/api/session-meta/batch', {
      method: 'POST',
      body: JSON.stringify({ records }),
    })
  }

  public async update(id: string, updates: Partial<SessionMetaRecord>): Promise<SessionMetaRecord | null> {
    const res = await apiFetch(`/api/session-meta/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    if (!res.ok) return null
    return await res.json()
  }

  public async getById(id: string): Promise<SessionMetaRecord | null> {
    const res = await apiFetch(`/api/session-meta/${encodeURIComponent(id)}`)
    if (!res.ok) return null
    return await res.json()
  }

  public async delete(id: string): Promise<void> {
    await apiFetch(`/api/session-meta/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }

  public async deleteMany(ids: string[]): Promise<void> {
    await apiFetch('/api/session-meta/delete-batch', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  }

  public async getAll(): Promise<SessionMetaRecord[]> {
    const res = await apiFetch('/api/session-meta/all?includingHidden=false')
    if (!res.ok) return []
    return await res.json()
  }

  public async getAllIncludingHidden(): Promise<SessionMetaRecord[]> {
    const res = await apiFetch('/api/session-meta/all?includingHidden=true')
    if (!res.ok) return []
    return await res.json()
  }

  public async getArchived(): Promise<SessionMetaRecord[]> {
    const res = await apiFetch('/api/session-meta/archived')
    if (!res.ok) return []
    return await res.json()
  }

  public async getArchivedPage(cursor: number, limit: number = 50): Promise<SessionMetaPage> {
    const res = await apiFetch(`/api/session-meta/page?archived=true&cursor=${cursor}&limit=${limit}`)
    if (!res.ok) return { items: [], nextCursor: null, total: 0 }
    return await res.json()
  }

  public async getPage(cursor: number, limit: number = 50): Promise<SessionMetaPage> {
    const res = await apiFetch(`/api/session-meta/page?archived=false&cursor=${cursor}&limit=${limit}`)
    if (!res.ok) return { items: [], nextCursor: null, total: 0 }
    return await res.json()
  }

  public async getTotal(): Promise<number> {
    const res = await apiFetch('/api/session-meta/total?type=active')
    if (!res.ok) return 0
    const data = await res.json()
    return data.total || 0
  }

  public async getAllTotal(): Promise<number> {
    const res = await apiFetch('/api/session-meta/total?type=all')
    if (!res.ok) return 0
    const data = await res.json()
    return data.total || 0
  }

  public async getArchivedTotal(): Promise<number> {
    const res = await apiFetch('/api/session-meta/total?type=archived')
    if (!res.ok) return 0
    const data = await res.json()
    return data.total || 0
  }

  public async clear(): Promise<void> {
    await apiFetch('/api/session-meta', { method: 'DELETE' })
  }
}

// -------------------------------------------------------------
// 3. Image Generation Storage Implementation
// -------------------------------------------------------------
export class PostgresImageGenerationStorage implements ImageGenerationStorage {
  public async initialize(): Promise<void> {
    return Promise.resolve()
  }

  public async create(record: ImageGeneration): Promise<void> {
    await apiFetch('/api/image-generations', {
      method: 'POST',
      body: JSON.stringify(record),
    })
  }

  public async update(id: string, updates: Partial<ImageGeneration>): Promise<ImageGeneration | null> {
    const res = await apiFetch(`/api/image-generations/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    if (!res.ok) return null
    return await res.json()
  }

  public async getById(id: string): Promise<ImageGeneration | null> {
    const res = await apiFetch(`/api/image-generations/${encodeURIComponent(id)}`)
    if (!res.ok) return null
    return await res.json()
  }

  public async delete(id: string): Promise<void> {
    await apiFetch(`/api/image-generations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  }

  public async getPage(cursor: number, limit: number = 20): Promise<ImageGenerationPage> {
    const res = await apiFetch(`/api/image-generations/page?cursor=${cursor}&limit=${limit}`)
    if (!res.ok) return { items: [], nextCursor: null, total: 0 }
    return await res.json()
  }

  public async getTotal(): Promise<number> {
    const res = await apiFetch('/api/image-generations/total')
    if (!res.ok) return 0
    const data = await res.json()
    return data.total || 0
  }
}
