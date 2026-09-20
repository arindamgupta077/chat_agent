/**
 * AgentLab SQL User Generator CLI
 * 
 * Usage:
 *   node scripts/generate-user-sql.mjs <username> <email> <password> [role]
 * 
 * Example:
 *   node scripts/generate-user-sql.mjs john john@example.com Secret@123 user
 */

import crypto from 'node:crypto'

const [,, username, email, password, roleArg] = process.argv

if (!username || !email || !password) {
  console.log(`
Usage:
  node scripts/generate-user-sql.mjs <username> <email> <password> [role]

Parameters:
  username : Account username (e.g. "alex")
  email    : Email address (e.g. "alex@example.com")
  password : Plain text password (e.g. "Secure@2026")
  role     : Optional, 'user' (default) or 'admin'

Example:
  node scripts/generate-user-sql.mjs sarah sarah@company.com MyPassword@123 user
`)
  process.exit(1)
}

const role = roleArg?.toLowerCase() === 'admin' ? 'admin' : 'user'

// PBKDF2 hash
const salt = crypto.randomBytes(16).toString('hex')
const pbkdf2Hash = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex')
const fullPbkdf2 = `${salt}:${pbkdf2Hash}`

// Direct SHA-256
const sha256Hash = crypto.createHash('sha256').update(password).digest('hex')

// Escaping
const safeUser = username.replace(/'/g, "''").trim()
const safeEmail = email.replace(/'/g, "''").trim().toLowerCase()
const safePass = password.replace(/'/g, "''")

console.log(`
================================================================================
AgentLab PostgreSQL User SQL Generator
================================================================================
Target User : ${safeUser} (${safeEmail})
Role        : ${role}
Password    : ${password}
--------------------------------------------------------------------------------

-- [OPTION 1: Native PostgreSQL SQL with SHA-256 (Easiest)]
INSERT INTO users (id, username, email, password_hash, role)
VALUES (
    'user-' || gen_random_uuid(),
    '${safeUser}',
    '${safeEmail}',
    encode(sha256('${safePass}'::bytea), 'hex'),
    '${role}'
)
ON CONFLICT (username) DO UPDATE
SET email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;

-- [OPTION 2: Salted PBKDF2 SQL (Pre-calculated Hash)]
INSERT INTO users (id, username, email, password_hash, role)
VALUES (
    'user-' || gen_random_uuid(),
    '${safeUser}',
    '${safeEmail}',
    '${fullPbkdf2}',
    '${role}'
)
ON CONFLICT (username) DO UPDATE
SET email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;

--------------------------------------------------------------------------------
To verify insertion, run:
SELECT id, username, email, role, created_at FROM users WHERE username = '${safeUser}';
================================================================================
`)
