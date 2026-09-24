/**
 * AgentLab Main REST API Router
 * 
 * Routes:
 * - /api/db/health (PostgreSQL database health check)
 * - /api/auth/* (Login, Register, Profile, Admin User Management)
 * - /api/storage/* (User-isolated Key-Value and Blob storage in PostgreSQL)
 * - /api/session-meta/* (User-isolated Session metadata queries and updates)
 * - /api/image-generations/* (User-isolated Image generation history)
 */

import { query, testConnection } from './db.mjs'
import { extractAuthUser, handleAuthRoute, parseJsonBody } from './auth.mjs'

export function sanitizeProviders(providers) {
  if (!providers || typeof providers !== 'object') return {}
  const cleaned = {}
  for (const [providerId, config] of Object.entries(providers)) {
    if (!config || typeof config !== 'object') continue
    const copy = { ...config }
    const apiKey = copy.apiKey?.toString().trim().toLowerCase()
    if (apiKey === 'admin@123' || apiKey === 'welcome@123' || apiKey === 'dummy' || apiKey === 'admin' || (apiKey && apiKey.length < 8)) {
      delete copy.apiKey
    }
    const accessKey = copy.accessKey?.toString().trim().toLowerCase()
    if (accessKey === 'admin@123' || accessKey === 'welcome@123' || accessKey === 'dummy' || accessKey === 'admin' || (accessKey && accessKey.length < 8)) {
      delete copy.accessKey
    }
    const secretKey = copy.secretKey?.toString().trim().toLowerCase()
    if (secretKey === 'admin@123' || secretKey === 'welcome@123' || secretKey === 'dummy' || secretKey === 'admin' || (secretKey && secretKey.length < 8)) {
      delete copy.secretKey
    }
    cleaned[providerId] = copy
  }
  return cleaned
}

export async function handleApiRequest(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = decodeURIComponent(parsedUrl.pathname)

  // 1. CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })
    res.end()
    return true
  }

  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(JSON.stringify(data))
  }

  // 2. Database Health Check
  if (pathname === '/api/db/health' && req.method === 'GET') {
    const health = await testConnection()
    sendJson(health.connected ? 200 : 503, health)
    return true
  }

  // 3. Delegate to Auth Routes
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/api/admin')) {
    const handled = await handleAuthRoute(req, res, pathname)
    if (handled) return true
  }

  // All storage & data routes below require authentication
  if (pathname.startsWith('/api/storage') || pathname.startsWith('/api/session-meta') || pathname.startsWith('/api/image-generations')) {
    const user = extractAuthUser(req)
    if (!user) {
      sendJson(401, { error: 'Unauthorized: Valid Bearer token required' })
      return true
    }

    const userId = user.id

    try {
      // -------------------------------------------------------------
      // Key-Value Storage APIs (/api/storage/values/*)
      // -------------------------------------------------------------
      
      // GET /api/storage/values/:key
      if (pathname.startsWith('/api/storage/values/') && req.method === 'GET') {
        const key = decodeURIComponent(pathname.slice('/api/storage/values/'.length))
        
        const result = await query(
          'SELECT value FROM app_key_value WHERE user_id = $1 AND key = $2',
          [userId, key]
        )

        let val = result.rows[0]?.value ?? null

        // If reading settings, merge admin-configured global LLM API credentials & selected AI model!
        if (key === 'settings') {
          try {
            const adminConfigRes = await query('SELECT llm_providers, selected_model FROM admin_global_config WHERE id = $1', ['global'])
            const globalConfig = adminConfigRes.rows[0]
            if (!val) val = {}
            if (user.role !== 'admin') {
              val.providers = sanitizeProviders(globalConfig?.llm_providers || {})
              if (globalConfig?.selected_model && (globalConfig.selected_model.provider || globalConfig.selected_model.modelId)) {
                val.defaultChatModel = {
                  provider: globalConfig.selected_model.provider,
                  model: globalConfig.selected_model.model || globalConfig.selected_model.modelId,
                }
              }
            } else {
              val.providers = sanitizeProviders(globalConfig?.llm_providers ?? val.providers ?? {})
              if (!val.defaultChatModel && globalConfig?.selected_model?.provider) {
                val.defaultChatModel = {
                  provider: globalConfig.selected_model.provider,
                  model: globalConfig.selected_model.model || globalConfig.selected_model.modelId,
                }
              }
            }
          } catch (e) {
            console.warn('[Storage] Failed to merge global admin LLM credentials:', e.message)
          }
        }

        sendJson(200, { value: val })
        return true
      }

      // PUT /api/storage/values/:key
      if (pathname.startsWith('/api/storage/values/') && req.method === 'PUT') {
        const key = decodeURIComponent(pathname.slice('/api/storage/values/'.length))
        const { value } = await parseJsonBody(req)

        let finalValue = value
        if (key === 'settings' && value && typeof value === 'object') {
          if (user.role !== 'admin') {
            // Normal users cannot configure LLM API models; enforce administrator's global model providers & selected model.
            try {
              const adminConfigRes = await query('SELECT llm_providers, selected_model FROM admin_global_config WHERE id = $1', ['global'])
              const globalConfig = adminConfigRes.rows[0]
              finalValue = {
                ...value,
                providers: sanitizeProviders(globalConfig?.llm_providers || {}),
                defaultChatModel: globalConfig?.selected_model?.provider
                  ? {
                      provider: globalConfig.selected_model.provider,
                      model: globalConfig.selected_model.model || globalConfig.selected_model.modelId,
                    }
                  : undefined,
              }
            } catch (err) {
              console.warn('[Storage] Failed to preserve global admin LLM config on normal user update:', err.message)
            }
          } else {
            // Admin user: sanitize credentials if providers are provided; preserve existing providers if not provided in payload!
            if (value.providers && typeof value.providers === 'object') {
              finalValue = {
                ...value,
                providers: sanitizeProviders(value.providers),
              }
            } else {
              finalValue = value
            }
          }
        }

        await query(
          `INSERT INTO app_key_value (user_id, key, value, updated_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, key) DO UPDATE
           SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
          [userId, key, JSON.stringify(finalValue)]
        )

        // If admin updates settings, propagate LLM providers and selected model to global config for all users (MCP is user-unique)
        if (key === 'settings' && user.role === 'admin' && value && typeof value === 'object') {
          try {
            const hasProvidersUpdate = Boolean(value.providers && typeof value.providers === 'object' && Object.keys(value.providers).length > 0)
            const providers = hasProvidersUpdate ? sanitizeProviders(value.providers) : null
            const selectedModel = value.defaultChatModel && value.defaultChatModel.provider
              ? {
                  provider: value.defaultChatModel.provider,
                  modelId: value.defaultChatModel.model || value.defaultChatModel.modelId,
                }
              : null

            if (hasProvidersUpdate && selectedModel) {
              await query(
                `INSERT INTO admin_global_config (id, llm_providers, selected_model, updated_by)
                 VALUES ('global', $1, $2, $3)
                 ON CONFLICT (id) DO UPDATE SET
                   llm_providers = EXCLUDED.llm_providers,
                   selected_model = EXCLUDED.selected_model,
                   updated_by = EXCLUDED.updated_by,
                   updated_at = CURRENT_TIMESTAMP`,
                [JSON.stringify(providers), JSON.stringify(selectedModel), userId]
              )
              console.log('[Admin] Automatically synchronized global LLM providers and selected model for all users.')
            } else if (hasProvidersUpdate) {
              await query(
                `INSERT INTO admin_global_config (id, llm_providers, updated_by)
                 VALUES ('global', $1, $2)
                 ON CONFLICT (id) DO UPDATE SET
                   llm_providers = EXCLUDED.llm_providers,
                   updated_by = EXCLUDED.updated_by,
                   updated_at = CURRENT_TIMESTAMP`,
                [JSON.stringify(providers), userId]
              )
              console.log('[Admin] Automatically synchronized global LLM providers for all users.')
            } else if (selectedModel) {
              await query(
                `INSERT INTO admin_global_config (id, selected_model, updated_by)
                 VALUES ('global', $1, $2)
                 ON CONFLICT (id) DO UPDATE SET
                   selected_model = EXCLUDED.selected_model,
                   updated_by = EXCLUDED.updated_by,
                   updated_at = CURRENT_TIMESTAMP`,
                [JSON.stringify(selectedModel), userId]
              )
              console.log('[Admin] Automatically synchronized selected model for all users.')
            }
          } catch (adminSyncErr) {
            console.warn('[Admin] Failed to update global config:', adminSyncErr.message)
          }
        }

        // Relational sync: if saving a session object, sync to chat_sessions & chat_messages
        if (key.startsWith('session:')) {
          const sessionId = key.slice('session:'.length)
          if (value && typeof value === 'object') {
            try {
              await syncRelationalSession(userId, sessionId, value)
            } catch (syncErr) {
              console.warn('[Storage Sync Warning]:', syncErr.message)
            }
          }
        }

        sendJson(200, { success: true })
        return true
      }

      // DELETE /api/storage/values/:key
      if (pathname.startsWith('/api/storage/values/') && req.method === 'DELETE') {
        const key = decodeURIComponent(pathname.slice('/api/storage/values/'.length))
        await query('DELETE FROM app_key_value WHERE user_id = $1 AND key = $2', [userId, key])

        if (key.startsWith('session:')) {
          const sessionId = key.slice('session:'.length)
          await query('DELETE FROM chat_sessions WHERE user_id = $1 AND id = $2', [userId, sessionId]).catch(() => {})
        }

        sendJson(200, { success: true })
        return true
      }

      // GET /api/storage/values (getAll)
      if (pathname === '/api/storage/values' && req.method === 'GET') {
        const result = await query('SELECT key, value FROM app_key_value WHERE user_id = $1', [userId])
        const valuesMap = {}
        for (const row of result.rows) {
          valuesMap[row.key] = row.value
        }
        if (valuesMap.settings) {
          try {
            const adminConfigRes = await query('SELECT llm_providers, selected_model FROM admin_global_config WHERE id = $1', ['global'])
            const globalConfig = adminConfigRes.rows[0]
            if (user.role !== 'admin') {
              valuesMap.settings.providers = sanitizeProviders(globalConfig?.llm_providers || {})
              if (globalConfig?.selected_model && (globalConfig.selected_model.provider || globalConfig.selected_model.modelId)) {
                valuesMap.settings.defaultChatModel = {
                  provider: globalConfig.selected_model.provider,
                  model: globalConfig.selected_model.model || globalConfig.selected_model.modelId,
                }
              }
            } else {
              valuesMap.settings.providers = sanitizeProviders(globalConfig?.llm_providers ?? valuesMap.settings.providers ?? {})
              if (!valuesMap.settings.defaultChatModel && globalConfig?.selected_model?.provider) {
                valuesMap.settings.defaultChatModel = {
                  provider: globalConfig.selected_model.provider,
                  model: globalConfig.selected_model.model || globalConfig.selected_model.modelId,
                }
              }
            }
          } catch (e) {
            console.warn('[Storage] Failed to merge global admin LLM credentials in getAll:', e.message)
          }
        }
        sendJson(200, valuesMap)
        return true
      }

      // POST /api/storage/values/batch (setAll)
      if (pathname === '/api/storage/values/batch' && req.method === 'POST') {
        const data = await parseJsonBody(req)
        for (let [key, value] of Object.entries(data || {})) {
          let batchValue = value
          if (key === 'settings' && value && typeof value === 'object') {
            if (user.role !== 'admin') {
              try {
                const adminConfigRes = await query('SELECT llm_providers, selected_model FROM admin_global_config WHERE id = $1', ['global'])
                const globalConfig = adminConfigRes.rows[0]
                batchValue = {
                  ...value,
                  providers: sanitizeProviders(globalConfig?.llm_providers || {}),
                  defaultChatModel: globalConfig?.selected_model?.provider
                    ? {
                        provider: globalConfig.selected_model.provider,
                        model: globalConfig.selected_model.model || globalConfig.selected_model.modelId,
                      }
                    : undefined,
                }
              } catch (err) {}
            } else {
              if (value.providers && typeof value.providers === 'object') {
                batchValue = { ...value, providers: sanitizeProviders(value.providers) }
              } else {
                batchValue = value
              }
            }
          }
          await query(
            `INSERT INTO app_key_value (user_id, key, value, updated_at)
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, key) DO UPDATE
             SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
            [userId, key, JSON.stringify(batchValue)]
          )
          if (key === 'settings' && user.role === 'admin' && value && typeof value === 'object') {
            try {
              const hasProvidersUpdate = Boolean(value.providers && typeof value.providers === 'object' && Object.keys(value.providers).length > 0)
              const providers = hasProvidersUpdate ? sanitizeProviders(value.providers) : null
              const selectedModel = value.defaultChatModel && value.defaultChatModel.provider
                ? {
                    provider: value.defaultChatModel.provider,
                    modelId: value.defaultChatModel.model || value.defaultChatModel.modelId,
                  }
                : null

              if (hasProvidersUpdate && selectedModel) {
                await query(
                  `INSERT INTO admin_global_config (id, llm_providers, selected_model, updated_by)
                   VALUES ('global', $1, $2, $3)
                   ON CONFLICT (id) DO UPDATE SET
                     llm_providers = EXCLUDED.llm_providers,
                     selected_model = EXCLUDED.selected_model,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = CURRENT_TIMESTAMP`,
                  [JSON.stringify(providers), JSON.stringify(selectedModel), userId]
                )
              } else if (hasProvidersUpdate) {
                await query(
                  `INSERT INTO admin_global_config (id, llm_providers, updated_by)
                   VALUES ('global', $1, $2)
                   ON CONFLICT (id) DO UPDATE SET
                     llm_providers = EXCLUDED.llm_providers,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = CURRENT_TIMESTAMP`,
                  [JSON.stringify(providers), userId]
                )
              } else if (selectedModel) {
                await query(
                  `INSERT INTO admin_global_config (id, selected_model, updated_by)
                   VALUES ('global', $1, $2)
                   ON CONFLICT (id) DO UPDATE SET
                     selected_model = EXCLUDED.selected_model,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = CURRENT_TIMESTAMP`,
                  [JSON.stringify(selectedModel), userId]
                )
              }
            } catch (adminSyncErr) {}
          }
        }
        sendJson(200, { success: true })
        return true
      }

      // GET /api/storage/keys (getAllKeys)
      if (pathname === '/api/storage/keys' && req.method === 'GET') {
        const result = await query('SELECT key FROM app_key_value WHERE user_id = $1', [userId])
        sendJson(200, result.rows.map((r) => r.key))
        return true
      }

      // -------------------------------------------------------------
      // Blob Storage APIs (/api/storage/blobs/*)
      // -------------------------------------------------------------

      // GET /api/storage/blobs/:key
      if (pathname.startsWith('/api/storage/blobs/') && req.method === 'GET') {
        const key = decodeURIComponent(pathname.slice('/api/storage/blobs/'.length))
        const result = await query(
          'SELECT data FROM app_blobs WHERE user_id = $1 AND key = $2',
          [userId, key]
        )
        sendJson(200, { data: result.rows[0]?.data ?? null })
        return true
      }

      // PUT /api/storage/blobs/:key
      if (pathname.startsWith('/api/storage/blobs/') && req.method === 'PUT') {
        const key = decodeURIComponent(pathname.slice('/api/storage/blobs/'.length))
        const { data } = await parseJsonBody(req)
        await query(
          `INSERT INTO app_blobs (user_id, key, data, created_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, key) DO UPDATE
           SET data = EXCLUDED.data`,
          [userId, key, data]
        )
        sendJson(200, { success: true })
        return true
      }

      // DELETE /api/storage/blobs/:key
      if (pathname.startsWith('/api/storage/blobs/') && req.method === 'DELETE') {
        const key = decodeURIComponent(pathname.slice('/api/storage/blobs/'.length))
        await query('DELETE FROM app_blobs WHERE user_id = $1 AND key = $2', [userId, key])
        sendJson(200, { success: true })
        return true
      }

      // GET /api/storage/blob-keys
      if (pathname === '/api/storage/blob-keys' && req.method === 'GET') {
        const result = await query('SELECT key FROM app_blobs WHERE user_id = $1', [userId])
        sendJson(200, result.rows.map((r) => r.key))
        return true
      }

      // -------------------------------------------------------------
      // Session Metadata APIs (/api/session-meta/*)
      // -------------------------------------------------------------

      // GET /api/session-meta/page
      if (pathname === '/api/session-meta/page' && req.method === 'GET') {
        const cursor = parsedUrl.searchParams.get('cursor') ? Number(parsedUrl.searchParams.get('cursor')) : 0
        const limit = Number(parsedUrl.searchParams.get('limit')) || 50
        const isArchived = parsedUrl.searchParams.get('archived') === 'true'

        const countQuery = isArchived
          ? 'SELECT COUNT(*) as total FROM session_meta WHERE user_id = $1 AND archived_at IS NOT NULL'
          : 'SELECT COUNT(*) as total FROM session_meta WHERE user_id = $1 AND hidden = 0 AND archived_at IS NULL'
        const countRes = await query(countQuery, [userId])
        const total = Number(countRes.rows[0]?.total || 0)

        const rowsQuery = isArchived
          ? `SELECT * FROM session_meta 
             WHERE user_id = $1 AND archived_at IS NOT NULL
             ORDER BY archived_at DESC LIMIT $2 OFFSET $3`
          : `SELECT * FROM session_meta 
             WHERE user_id = $1 AND hidden = 0 AND archived_at IS NULL
             ORDER BY starred DESC, sort_order DESC LIMIT $2 OFFSET $3`

        const rowsRes = await query(rowsQuery, [userId, limit, cursor])
        const items = rowsRes.rows
        const nextCursor = cursor + items.length < total ? cursor + items.length : null

        sendJson(200, {
          items: items.map(formatSessionMetaRow),
          nextCursor,
          total,
        })
        return true
      }

      // GET /api/session-meta/all
      if (pathname === '/api/session-meta/all' && req.method === 'GET') {
        const includingHidden = parsedUrl.searchParams.get('includingHidden') === 'true'
        const sql = includingHidden
          ? 'SELECT * FROM session_meta WHERE user_id = $1 AND archived_at IS NULL ORDER BY sort_order DESC'
          : 'SELECT * FROM session_meta WHERE user_id = $1 AND hidden = 0 AND archived_at IS NULL ORDER BY sort_order DESC'
        const result = await query(sql, [userId])
        sendJson(200, result.rows.map(formatSessionMetaRow))
        return true
      }

      // GET /api/session-meta/archived
      if (pathname === '/api/session-meta/archived' && req.method === 'GET') {
        const result = await query(
          'SELECT * FROM session_meta WHERE user_id = $1 AND archived_at IS NOT NULL ORDER BY archived_at DESC',
          [userId]
        )
        sendJson(200, result.rows.map(formatSessionMetaRow))
        return true
      }

      // GET /api/session-meta/total
      if (pathname === '/api/session-meta/total' && req.method === 'GET') {
        const type = parsedUrl.searchParams.get('type') || 'active'
        let sql = 'SELECT COUNT(*) as count FROM session_meta WHERE user_id = $1 AND hidden = 0 AND archived_at IS NULL'
        if (type === 'archived') {
          sql = 'SELECT COUNT(*) as count FROM session_meta WHERE user_id = $1 AND archived_at IS NOT NULL'
        } else if (type === 'all') {
          sql = 'SELECT COUNT(*) as count FROM session_meta WHERE user_id = $1 AND archived_at IS NULL'
        }
        const resCount = await query(sql, [userId])
        sendJson(200, { total: Number(resCount.rows[0]?.count || 0) })
        return true
      }

      // GET /api/session-meta/:id
      if (pathname.startsWith('/api/session-meta/') && req.method === 'GET') {
        const id = pathname.slice('/api/session-meta/'.length)
        const result = await query('SELECT * FROM session_meta WHERE user_id = $1 AND id = $2', [userId, id])
        sendJson(200, result.rows[0] ? formatSessionMetaRow(result.rows[0]) : null)
        return true
      }

      // POST /api/session-meta (create)
      if (pathname === '/api/session-meta' && req.method === 'POST') {
        const record = await parseJsonBody(req)
        await insertSessionMetaRow(userId, record)
        sendJson(201, { success: true })
        return true
      }

      // POST /api/session-meta/batch (createMany)
      if (pathname === '/api/session-meta/batch' && req.method === 'POST') {
        const { records } = await parseJsonBody(req)
        for (const record of records || []) {
          await insertSessionMetaRow(userId, record)
        }
        sendJson(201, { success: true })
        return true
      }

      // PUT /api/session-meta/:id (update)
      if (pathname.startsWith('/api/session-meta/') && req.method === 'PUT') {
        const id = pathname.slice('/api/session-meta/'.length)
        const updates = await parseJsonBody(req)
        await updateSessionMetaRow(userId, id, updates)
        const updated = await query('SELECT * FROM session_meta WHERE user_id = $1 AND id = $2', [userId, id])
        sendJson(200, updated.rows[0] ? formatSessionMetaRow(updated.rows[0]) : null)
        return true
      }

      // DELETE /api/session-meta/:id (delete)
      if (pathname.startsWith('/api/session-meta/') && req.method === 'DELETE') {
        const id = pathname.slice('/api/session-meta/'.length)
        await query('DELETE FROM session_meta WHERE user_id = $1 AND id = $2', [userId, id])
        await query('DELETE FROM chat_sessions WHERE user_id = $1 AND id = $2', [userId, id]).catch(() => {})
        await query('DELETE FROM app_key_value WHERE user_id = $1 AND key = $2', [userId, `session:${id}`]).catch(() => {})
        sendJson(200, { success: true })
        return true
      }

      // POST /api/session-meta/delete-batch (deleteMany)
      if (pathname === '/api/session-meta/delete-batch' && req.method === 'POST') {
        const { ids } = await parseJsonBody(req)
        if (Array.isArray(ids) && ids.length > 0) {
          await query('DELETE FROM session_meta WHERE user_id = $1 AND id = ANY($2)', [userId, ids])
          await query('DELETE FROM chat_sessions WHERE user_id = $1 AND id = ANY($2)', [userId, ids]).catch(() => {})
        }
        sendJson(200, { success: true })
        return true
      }

      // DELETE /api/session-meta (clear)
      if (pathname === '/api/session-meta' && req.method === 'DELETE') {
        await query('DELETE FROM session_meta WHERE user_id = $1', [userId])
        await query('DELETE FROM chat_sessions WHERE user_id = $1', [userId]).catch(() => {})
        sendJson(200, { success: true })
        return true
      }

      // -------------------------------------------------------------
      // Image Generation APIs (/api/image-generations/*)
      // -------------------------------------------------------------

      // GET /api/image-generations/page
      if (pathname === '/api/image-generations/page' && req.method === 'GET') {
        const cursor = parsedUrl.searchParams.get('cursor') ? Number(parsedUrl.searchParams.get('cursor')) : 0
        const limit = Number(parsedUrl.searchParams.get('limit')) || 20

        const countRes = await query('SELECT COUNT(*) as total FROM image_generations WHERE user_id = $1', [userId])
        const total = Number(countRes.rows[0]?.total || 0)

        const resImgs = await query(
          'SELECT * FROM image_generations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
          [userId, limit, cursor]
        )
        const items = resImgs.rows
        const nextCursor = cursor + items.length < total ? cursor + items.length : null

        sendJson(200, {
          items: items.map(formatImageGenRow),
          nextCursor,
          total,
        })
        return true
      }

      // POST /api/image-generations
      if (pathname === '/api/image-generations' && req.method === 'POST') {
        const rec = await parseJsonBody(req)
        await query(
          `INSERT INTO image_generations (
             id, user_id, prompt, model_provider, model_id, status,
             reference_images, generated_images, generated_image_thumbnails,
             parent_id, aspect_ratio, task_id, error, error_code, source, created_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (id) DO NOTHING`,
          [
            rec.id,
            userId,
            rec.prompt || '',
            rec.model?.provider || rec.model_provider || '',
            rec.model?.modelId || rec.model_id || '',
            rec.status || 'pending',
            JSON.stringify(rec.referenceImages || []),
            JSON.stringify(rec.generatedImages || []),
            rec.generatedImageThumbnails ? JSON.stringify(rec.generatedImageThumbnails) : null,
            rec.parentIds ? JSON.stringify(rec.parentIds) : null,
            rec.aspectRatio || null,
            rec.taskId || null,
            rec.error || null,
            rec.errorCode || null,
            rec.source || null,
            rec.createdAt || Date.now(),
          ]
        )
        sendJson(201, { success: true })
        return true
      }

      // PUT /api/image-generations/:id
      if (pathname.startsWith('/api/image-generations/') && req.method === 'PUT') {
        const id = pathname.slice('/api/image-generations/'.length)
        const updates = await parseJsonBody(req)
        await query(
          `UPDATE image_generations 
           SET status = COALESCE($1, status),
               generated_images = COALESCE($2, generated_images),
               generated_image_thumbnails = COALESCE($3, generated_image_thumbnails),
               error = COALESCE($4, error),
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $5 AND id = $6`,
          [
            updates.status || null,
            updates.generatedImages ? JSON.stringify(updates.generatedImages) : null,
            updates.generatedImageThumbnails ? JSON.stringify(updates.generatedImageThumbnails) : null,
            updates.error || null,
            userId,
            id,
          ]
        )
        const updated = await query('SELECT * FROM image_generations WHERE user_id = $1 AND id = $2', [userId, id])
        sendJson(200, updated.rows[0] ? formatImageGenRow(updated.rows[0]) : null)
        return true
      }

      // DELETE /api/image-generations/:id
      if (pathname.startsWith('/api/image-generations/') && req.method === 'DELETE') {
        const id = pathname.slice('/api/image-generations/'.length)
        await query('DELETE FROM image_generations WHERE user_id = $1 AND id = $2', [userId, id])
        sendJson(200, { success: true })
        return true
      }
    } catch (err) {
      console.error('[API Error]:', err)
      sendJson(500, { error: err.message })
      return true
    }
  }

  return false // Path not matched by API router
}

// -------------------------------------------------------------
// Database Row Helper Functions
// -------------------------------------------------------------

function formatSessionMetaRow(row) {
  return {
    id: row.id,
    name: row.name,
    starred: Boolean(row.starred),
    hidden: Boolean(row.hidden),
    archivedAt: row.archived_at ? Number(row.archived_at) : undefined,
    recoveryArchived: Boolean(row.recovery_archived),
    assistantAvatarKey: row.assistant_avatar_key || undefined,
    picUrl: row.pic_url || undefined,
    backgroundImage: row.background_image || undefined,
    type: row.type || 'chat',
    sortOrder: Number(row.sort_order),
    createdAt: Number(row.created_at),
  }
}

async function insertSessionMetaRow(userId, record) {
  await query(
    `INSERT INTO session_meta (
       id, user_id, name, starred, hidden, archived_at, recovery_archived,
       assistant_avatar_key, pic_url, background_image, type, sort_order, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (id) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       name = EXCLUDED.name,
       starred = EXCLUDED.starred,
       hidden = EXCLUDED.hidden,
       archived_at = EXCLUDED.archived_at,
       recovery_archived = EXCLUDED.recovery_archived,
       assistant_avatar_key = EXCLUDED.assistant_avatar_key,
       pic_url = EXCLUDED.pic_url,
       background_image = EXCLUDED.background_image,
       type = EXCLUDED.type,
       sort_order = EXCLUDED.sort_order,
       updated_at = CURRENT_TIMESTAMP`,
    [
      record.id,
      userId,
      record.name || '',
      record.starred ? 1 : 0,
      record.hidden ? 1 : 0,
      record.archivedAt ? Number(record.archivedAt) : null,
      record.recoveryArchived ? 1 : 0,
      record.assistantAvatarKey || null,
      record.picUrl || null,
      record.backgroundImage ? JSON.stringify(record.backgroundImage) : null,
      record.type || 'chat',
      Number(record.sortOrder || Date.now()),
      Number(record.createdAt || Date.now()),
    ]
  )
}

async function updateSessionMetaRow(userId, id, updates) {
  const fields = []
  const values = [userId, id]
  let idx = 3

  if (updates.name !== undefined) {
    fields.push(`name = $${idx++}`)
    values.push(updates.name)
  }
  if (updates.starred !== undefined) {
    fields.push(`starred = $${idx++}`)
    values.push(updates.starred ? 1 : 0)
  }
  if (updates.hidden !== undefined) {
    fields.push(`hidden = $${idx++}`)
    values.push(updates.hidden ? 1 : 0)
  }
  if (updates.archivedAt !== undefined) {
    fields.push(`archived_at = $${idx++}`)
    values.push(updates.archivedAt ? Number(updates.archivedAt) : null)
  }
  if (updates.sortOrder !== undefined) {
    fields.push(`sort_order = $${idx++}`)
    values.push(Number(updates.sortOrder))
  }
  if (updates.assistantAvatarKey !== undefined) {
    fields.push(`assistant_avatar_key = $${idx++}`)
    values.push(updates.assistantAvatarKey)
  }
  if (updates.backgroundImage !== undefined) {
    fields.push(`background_image = $${idx++}`)
    values.push(updates.backgroundImage ? JSON.stringify(updates.backgroundImage) : null)
  }
  if (updates.type !== undefined) {
    fields.push(`type = $${idx++}`)
    values.push(updates.type)
  }

  if (fields.length > 0) {
    fields.push('updated_at = CURRENT_TIMESTAMP')
    await query(`UPDATE session_meta SET ${fields.join(', ')} WHERE user_id = $1 AND id = $2`, values)
  }
}

function formatImageGenRow(row) {
  return {
    id: row.id,
    prompt: row.prompt,
    model: {
      provider: row.model_provider,
      modelId: row.model_id,
    },
    status: row.status,
    referenceImages: row.reference_images || [],
    generatedImages: row.generated_images || [],
    generatedImageThumbnails: row.generated_image_thumbnails || undefined,
    parentIds: row.parent_id ? (typeof row.parent_id === 'string' ? JSON.parse(row.parent_id) : row.parent_id) : undefined,
    aspectRatio: row.aspect_ratio || undefined,
    taskId: row.task_id || undefined,
    error: row.error || undefined,
    errorCode: row.error_code || undefined,
    source: row.source || undefined,
    createdAt: Number(row.created_at),
  }
}

async function syncRelationalSession(userId, sessionId, sessionData) {
  // Upsert chat_sessions
  await query(
    `INSERT INTO chat_sessions (id, user_id, name, type, data, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       name = EXCLUDED.name,
       type = EXCLUDED.type,
       data = EXCLUDED.data,
       updated_at = CURRENT_TIMESTAMP`,
    [
      sessionId,
      userId,
      sessionData.name || '',
      sessionData.type || 'chat',
      JSON.stringify(sessionData),
      Number(sessionData.createdAt || Date.now()),
    ]
  )

  // Collect all messages from active conversation and archived threads
  const allMessages = [...(Array.isArray(sessionData.messages) ? sessionData.messages : [])]
  if (Array.isArray(sessionData.threads)) {
    for (const thread of sessionData.threads) {
      if (Array.isArray(thread.messages)) {
        allMessages.push(...thread.messages)
      }
    }
  }

  // Sync messages into chat_messages
  for (const msg of allMessages) {
    if (!msg.id) continue
    const contentParts =
      msg.contentParts && msg.contentParts.length > 0
        ? msg.contentParts
        : msg.content
          ? [{ type: 'text', text: String(msg.content) }]
          : []
    await query(
      `INSERT INTO chat_messages (id, session_id, user_id, role, model, content_parts, timestamp, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         role = EXCLUDED.role,
         model = EXCLUDED.model,
         content_parts = EXCLUDED.content_parts,
         timestamp = EXCLUDED.timestamp`,
      [
        msg.id,
        sessionId,
        userId,
        msg.role || 'user',
        msg.model || msg.modelId || null,
        JSON.stringify(contentParts),
        Number(msg.timestamp || Date.now()),
      ]
    )
  }
}
