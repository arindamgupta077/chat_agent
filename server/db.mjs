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
