/**
 * AgentLab PostgreSQL Connection Manager
 * 
 * Manages database connection pool using node-postgres (pg).
 * Includes robust connection string parsing to cleanly handle passwords with '@' characters
 * (e.g., 'welcome@123').
 */

import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
const { Pool } = pg

// Auto-load .env.local or .env if present
function loadEnv() {
  const candidates = ['.env.local', '.env']
  for (const file of candidates) {
    const filePath = path.resolve(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      try {
        if (typeof process.loadEnvFile === 'function') {
          process.loadEnvFile(filePath)
        }
        break
      } catch (err) {
        console.warn(`[DB] Failed to load ${file}:`, err.message)
      }
    }
  }
}
loadEnv()

/**
 * Robust connection parser that safely handles '@' in passwords.
 * Example: postgresql://agent_db:welcome@123@localhost:5432/app_db?schema=public
 */
export function parseConnectionString(connStr) {
  if (!connStr) {
    return {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      database: process.env.PGDATABASE || 'app_db',
      user: process.env.PGUSER || 'agent_db',
      password: process.env.PGPASSWORD || 'welcome@123',
    }
  }

  // Regex pattern matching: postgres[ql]://username:password@host[:port]/database[?query]
  const match = connStr.match(/^(?:postgresql|postgres):\/\/([^:]+):(.*)@([^@\/:?]+)(?::(\d+))?\/([^?]+)(?:\?(.*))?$/)

  if (match) {
    const [, user, password, host, portStr, database, queryStr] = match
    const port = portStr ? Number(portStr) : 5432
    return {
      user: decodeURIComponent(user),
      password: password, // Keep exact password even if it has '@'
      host,
      port,
      database,
      ssl: queryStr?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    }
  }

  // Fallback to standard URL parser if regex doesn't match
  try {
    const parsed = new URL(connStr)
    return {
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      host: parsed.hostname,
      port: Number(parsed.port) || 5432,
      database: parsed.pathname.replace(/^\//, ''),
      ssl: parsed.searchParams.get('sslmode') === 'require' ? { rejectUnauthorized: false } : false,
    }
  } catch (err) {
    console.warn('[DB] Fallback URL parsing failed, using default localhost config:', err.message)
    return {
      host: 'localhost',
      port: 5432,
      database: 'app_db',
      user: 'agent_db',
      password: 'welcome@123',
    }
  }
}

const dbConfig = parseConnectionString(
  process.env.DATABASE_URL || 'postgresql://agent_db:welcome@123@localhost:5432/app_db?schema=public'
)

console.log(`[DB] Initializing PostgreSQL pool for database "${dbConfig.database}" at ${dbConfig.host}:${dbConfig.port} (user: ${dbConfig.user})`)

export const pool = new Pool({
  ...dbConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err.message)
})

export async function query(text, params) {
  try {
    const res = await pool.query(text, params)
    return res
  } catch (err) {
    console.error(`[DB Query Error] ${text.slice(0, 100)}...`, err.message)
    throw err
  }
}

export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as current_time, current_database() as db')
    
    // Check if tables are created
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    const tables = tablesRes.rows.map(r => r.table_name)
    const requiredTables = ['users', 'admin_global_config', 'app_key_value', 'session_meta', 'chat_sessions', 'chat_messages', 'app_blobs', 'image_generations']
    const missingTables = requiredTables.filter(t => !tables.includes(t))

    if (tables.includes('admin_global_config')) {
      try {
        await pool.query('ALTER TABLE admin_global_config ADD COLUMN IF NOT EXISTS global_system_instruction TEXT NOT NULL DEFAULT \'\'')
      } catch (colErr) {
        console.warn('[DB] Auto-migration for global_system_instruction column failed:', colErr.message)
      }
    }

    if (tables.includes('users')) {
      try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS mcp_servers JSONB NOT NULL DEFAULT \'[]\'::jsonb')
      } catch (colErr) {
        console.warn('[DB] Auto-migration for users.mcp_servers column failed:', colErr.message)
      }
    }

    // Drop separate user_mcp_servers table if present (user MCP servers are stored exclusively in users table)
    try {
      await pool.query('DROP TABLE IF EXISTS user_mcp_servers CASCADE')
    } catch (dropErr) {
      console.warn('[DB] Notice on dropping user_mcp_servers:', dropErr.message)
    }

    // Auto-backfill existing MCP servers into users.mcp_servers
    try {
      // 1. Backfill from admin_global_config for admin user
      const adminGlobal = await pool.query('SELECT mcp_servers, updated_by FROM admin_global_config WHERE id = \'global\'')
      const adminServers = adminGlobal.rows[0]?.mcp_servers
      const adminUserId = adminGlobal.rows[0]?.updated_by || 'admin-root-0000-000000000001'
      if (Array.isArray(adminServers) && adminServers.length > 0) {
        await pool.query(
          `UPDATE users SET mcp_servers = $1 WHERE id = $2 AND (mcp_servers IS NULL OR mcp_servers = '[]'::jsonb)`,
          [JSON.stringify(adminServers), adminUserId]
        )
      }

      // 2. Backfill from app_key_value settings for any user
      const kvRows = await pool.query("SELECT user_id, value->'mcp'->'servers' as mcp_servers FROM app_key_value WHERE key = 'settings' AND value->'mcp'->'servers' IS NOT NULL")
      for (const row of kvRows.rows) {
        const uId = row.user_id
        const servers = row.mcp_servers
        if (Array.isArray(servers) && servers.length > 0) {
          await pool.query(
            `UPDATE users SET mcp_servers = $1 WHERE id = $2 AND (mcp_servers IS NULL OR mcp_servers = '[]'::jsonb)`,
            [JSON.stringify(servers), uId]
          )
        }
      }
    } catch (bfErr) {
      console.warn('[DB] Auto-backfill for users.mcp_servers failed:', bfErr.message)
    }

    return {
      connected: true,
      time: result.rows[0].current_time,
      database: result.rows[0].db,
      tables,
      tablesReady: missingTables.length === 0,
      missingTables,
    }
  } catch (err) {
    return {
      connected: false,
      error: err.message,
      tablesReady: false,
    }
  }
}
