-- ==============================================================================
-- AgentLab - PostgreSQL Create User SQL Template
--
-- Target Database:
--   DATABASE_URL=postgresql://agent_db:welcome@123@localhost:5432/app_db?schema=public
--
-- How to run this file:
--   Option A: Run with psql CLI:
--     psql -U agent_db -d app_db -f scripts/create_user.sql
--   Option B: Open in pgAdmin / DBeaver / VS Code SQL tool and execute the statement.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- METHOD 1: Direct PostgreSQL Native SQL (Easiest - Built-in SHA-256)
--
-- The AgentLab backend automatically recognizes standard 64-character SHA-256
-- hashes and transparently upgrades them to salted PBKDF2 upon first user login!
--
-- Replace:
--   <username>  -> e.g. 'john_doe'
--   <email>     -> e.g. 'john@example.com'
--   <password>  -> e.g. 'John@123'
--   <role>      -> 'user' or 'admin'
-- ------------------------------------------------------------------------------

-- Example 1: Creating a standard Application User
INSERT INTO users (id, username, email, password_hash, role)
VALUES (
    'user-' || gen_random_uuid(),
    'john_doe',
    'john@example.com',
    encode(sha256('John@123'::bytea), 'hex'),
    'user'
)
ON CONFLICT (username) DO UPDATE
SET email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;

-- Example 2: Creating a second Administrator Account
INSERT INTO users (id, username, email, password_hash, role)
VALUES (
    'user-' || gen_random_uuid(),
    'secondary_admin',
    'admin2@agentlab.local',
    encode(sha256('AdminPass@2026'::bytea), 'hex'),
    'admin'
)
ON CONFLICT (username) DO UPDATE
SET email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;


-- ------------------------------------------------------------------------------
-- METHOD 2: Salted PBKDF2 (Pre-computed format: <salt_hex>:<hash_hex>)
--
-- If you prefer salted PBKDF2 directly in SQL without waiting for first login:
-- You can run `node scripts/generate-user-sql.mjs <username> <email> <password> <role>`
-- to generate exact PBKDF2 hashes for any password.
--
-- Below is a pre-computed PBKDF2 example for:
--   Username: demo_user
--   Password: User@123
-- ------------------------------------------------------------------------------
INSERT INTO users (id, username, email, password_hash, role)
VALUES (
    'user-' || gen_random_uuid(),
    'demo_user',
    'demo@agentlab.local',
    '7a4f9b2c1d3e5f60:9c1659f8ea7dc261b0c005bfae155bc6b5952db7159c9ba25c61457fb1e0b571',
    'user'
)
ON CONFLICT (username) DO NOTHING;


-- ------------------------------------------------------------------------------
-- VERIFICATION QUERY
-- Run this query to view all users currently in the database
-- ------------------------------------------------------------------------------
SELECT id, username, email, role, created_at, updated_at
FROM users
ORDER BY created_at DESC;
