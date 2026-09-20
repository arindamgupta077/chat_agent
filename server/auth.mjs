/**
 * AgentLab Authentication & Authorization Manager
 * 
 * Implements:
 * - PBKDF2 Password Hashing & Verification
 * - Built-in JWT Token Generation & Verification (Zero External Dependency)
 * - User Authentication APIs (Login, Register, Me)
 * - Admin Credential APIs (Manage system-wide LLM & MCP credentials)
 */

import crypto from 'node:crypto'
import { query } from './db.mjs'

const JWT_SECRET = process.env.JWT_SECRET || 'agentlab-secret-key-2026-secure'
const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60 // 7 days

// Helper for Base64URL encoding
function base64UrlEncode(data) {
  return Buffer.from(data)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  return Buffer.from(base64, 'base64').toString('utf8')
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false

  // Format 1: PBKDF2 format (salt:hash) - Default used by AgentLab
  if (storedHash.includes(':')) {
    const [salt, hash] = storedHash.split(':')
    if (salt && hash && hash.length === 64) {
      try {
        const calculatedHash = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex')
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(calculatedHash, 'hex'))
      } catch {
        return false
      }
    }
  }

  // Format 2: Direct SHA-256 hex string (used for direct PostgreSQL SQL inserts: encode(sha256('pass'::bytea), 'hex'))
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const calculatedHash = crypto.createHash('sha256').update(password).digest('hex')
    return crypto.timingSafeEqual(Buffer.from(storedHash.toLowerCase(), 'hex'), Buffer.from(calculatedHash.toLowerCase(), 'hex'))
  }

  return false
}

export function createToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRY_SECONDS,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload))
  const dataToSign = `${encodedHeader}.${encodedPayload}`

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${dataToSign}.${signature}`
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [encodedHeader, encodedPayload, signature] = parts
  const dataToSign = `${encodedHeader}.${encodedPayload}`

  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload))
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return null // Expired
    }
    return payload
  } catch {
    return null
  }
}

export function extractAuthUser(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization']
  if (!authHeader || typeof authHeader !== 'string') return null

  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) return null

  const token = match[1].trim()
  return verifyToken(token)
}

/**
 * Handle incoming JSON request body
 */
export async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 50 * 1024 * 1024) { // 50MB max
        req.destroy()
        reject(new Error('Request body too large'))
      }
    })
    req.on('end', () => {
      if (!body) return resolve({})
      try {
        resolve(JSON.parse(body))
      } catch (err) {
        reject(new Error('Invalid JSON body: ' + err.message))
      }
    })
    req.on('error', reject)
  })
}

/**
 * Auth Request Router
 */
export async function handleAuthRoute(req, res, pathname) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  // 1. POST /api/auth/login
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const { identifier, password } = await parseJsonBody(req)
      if (!identifier || !password) {
        sendJson(400, { error: 'Username/Email and Password are required' })
        return true
      }

      const result = await query(
        'SELECT id, username, email, password_hash, role FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1) LIMIT 1',
        [identifier.trim()]
      )

      if (result.rows.length === 0) {
        sendJson(401, { error: 'Invalid username or password' })
        return true
      }

      const user = result.rows[0]
      const isValid = verifyPassword(password, user.password_hash)
      if (!isValid) {
        sendJson(401, { error: 'Invalid username or password' })
        return true
      }

      // Automatically upgrade direct SHA-256 hash to PBKDF2 in the background
      if (!user.password_hash.includes(':')) {
        const upgradedHash = hashPassword(password)
        query('UPDATE users SET password_hash = $1 WHERE id = $2', [upgradedHash, user.id]).catch((err) => {
          console.warn('[Auth] Could not auto-upgrade password hash to PBKDF2:', err.message)
        })
      }

      const token = createToken({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      })

      sendJson(200, {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      })
      return true
    } catch (err) {
      console.error('[Auth Login Error]:', err)
      sendJson(500, { error: 'Login failed: ' + err.message })
      return true
    }
  }

  // 2. POST /api/auth/register
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    try {
      const { username, email, password } = await parseJsonBody(req)
      if (!username || !email || !password) {
        sendJson(400, { error: 'Username, Email and Password are required' })
        return true
      }

      if (username.length < 3) {
        sendJson(400, { error: 'Username must be at least 3 characters long' })
        return true
      }
      if (password.length < 6) {
        sendJson(400, { error: 'Password must be at least 6 characters long' })
        return true
      }

      // Check uniqueness
      const existing = await query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2) LIMIT 1',
        [username.trim(), email.trim()]
      )
      if (existing.rows.length > 0) {
        sendJson(409, { error: 'Username or email already exists' })
        return true
      }

      const id = 'user-' + crypto.randomUUID()
      const passwordHash = hashPassword(password)
      const role = 'user'

      await query(
        'INSERT INTO users (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
        [id, username.trim(), email.trim().toLowerCase(), passwordHash, role]
      )

      const token = createToken({
        id,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        role,
      })

      sendJson(201, {
        success: true,
        token,
        user: {
          id,
          username: username.trim(),
          email: email.trim().toLowerCase(),
          role,
        },
      })
      return true
    } catch (err) {
      console.error('[Auth Register Error]:', err)
      sendJson(500, { error: 'Registration failed: ' + err.message })
      return true
    }
  }

  // 3. GET /api/auth/me
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const userPayload = extractAuthUser(req)
    if (!userPayload) {
      sendJson(401, { error: 'Unauthorized' })
      return true
    }

    try {
      const result = await query(
        'SELECT id, username, email, role, created_at FROM users WHERE id = $1 LIMIT 1',
        [userPayload.id]
      )
      if (result.rows.length === 0) {
        sendJson(404, { error: 'User not found' })
        return true
      }

      sendJson(200, { user: result.rows[0] })
      return true
    } catch (err) {
      sendJson(500, { error: 'Failed to fetch user: ' + err.message })
      return true
    }
  }

  // 4. GET /api/admin/users (Admin Only)
  if (pathname === '/api/admin/users' && req.method === 'GET') {
    const authUser = extractAuthUser(req)
    if (!authUser || authUser.role !== 'admin') {
      sendJson(403, { error: 'Forbidden: Admin access required' })
      return true
    }

    try {
      const result = await query(
        'SELECT id, username, email, role, created_at FROM users ORDER BY created_at ASC'
      )
      sendJson(200, { users: result.rows })
      return true
    } catch (err) {
      sendJson(500, { error: 'Failed to list users: ' + err.message })
      return true
    }
  }

  // 4b. POST /api/admin/users (Admin creates a new user)
  if (pathname === '/api/admin/users' && req.method === 'POST') {
    const authUser = extractAuthUser(req)
    if (!authUser || authUser.role !== 'admin') {
      sendJson(403, { error: 'Forbidden: Admin access required' })
      return true
    }

    try {
      const { username, email, password, role } = await parseJsonBody(req)
      if (!username || !email || !password) {
        sendJson(400, { error: 'Username, Email, and Password are required' })
        return true
      }

      const assignedRole = role === 'admin' ? 'admin' : 'user'

      const existing = await query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2) LIMIT 1',
        [username.trim(), email.trim()]
      )
      if (existing.rows.length > 0) {
        sendJson(409, { error: 'Username or email already exists' })
        return true
      }

      const id = 'user-' + crypto.randomUUID()
      const passwordHash = hashPassword(password)

      const insertRes = await query(
        `INSERT INTO users (id, username, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, email, role, created_at`,
        [id, username.trim(), email.trim().toLowerCase(), passwordHash, assignedRole]
      )

      sendJson(201, {
        success: true,
        user: insertRes.rows[0],
      })
      return true
    } catch (err) {
      sendJson(500, { error: 'Failed to create user: ' + err.message })
      return true
    }
  }

  // 4c. DELETE /api/admin/users/:id (Admin deletes a user)
  if (pathname.startsWith('/api/admin/users/') && req.method === 'DELETE') {
    const authUser = extractAuthUser(req)
    if (!authUser || authUser.role !== 'admin') {
      sendJson(403, { error: 'Forbidden: Admin access required' })
      return true
    }

    const targetUserId = pathname.slice('/api/admin/users/'.length)
    if (targetUserId === authUser.id) {
      sendJson(400, { error: 'Cannot delete the currently logged-in administrator account' })
      return true
    }

    try {
      await query('DELETE FROM users WHERE id = $1', [targetUserId])
      sendJson(200, { success: true })
      return true
    } catch (err) {
      sendJson(500, { error: 'Failed to delete user: ' + err.message })
      return true
    }
  }

  // 5. GET /api/admin/credentials (Admin Only)
  if (pathname === '/api/admin/credentials' && req.method === 'GET') {
    const authUser = extractAuthUser(req)
    if (!authUser || authUser.role !== 'admin') {
      sendJson(403, { error: 'Forbidden: Admin access required' })
      return true
    }

    try {
      const result = await query(
        'SELECT llm_providers, updated_at FROM admin_global_config WHERE id = $1',
        ['global']
      )
      const config = result.rows[0] || { llm_providers: {} }
      sendJson(200, config)
      return true
    } catch (err) {
      sendJson(500, { error: 'Failed to fetch admin credentials: ' + err.message })
      return true
    }
  }

  // 6. PUT /api/admin/credentials (Admin Only)
  if (pathname === '/api/admin/credentials' && req.method === 'PUT') {
    const authUser = extractAuthUser(req)
    if (!authUser || authUser.role !== 'admin') {
      sendJson(403, { error: 'Forbidden: Admin access required' })
      return true
    }

    try {
      const { llm_providers } = await parseJsonBody(req)

      const result = await query(
        `INSERT INTO admin_global_config (id, llm_providers, updated_by)
         VALUES ('global', $1, $2)
         ON CONFLICT (id) DO UPDATE
         SET llm_providers = EXCLUDED.llm_providers,
             updated_by = EXCLUDED.updated_by,
             updated_at = CURRENT_TIMESTAMP
         RETURNING llm_providers, updated_at`,
        [
          JSON.stringify(llm_providers || {}),
          authUser.id,
        ]
      )

      sendJson(200, {
        success: true,
        config: result.rows[0],
      })
      return true
    } catch (err) {
      sendJson(500, { error: 'Failed to update admin credentials: ' + err.message })
      return true
    }
  }

  return false // Route not handled by auth
}
