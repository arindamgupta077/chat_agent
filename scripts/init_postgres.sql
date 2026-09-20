-- ==============================================================================
-- AgentLab PostgreSQL Database Initialization Script
-- 
-- Connection:
-- DATABASE_URL=postgresql://agent_db:welcome@123@localhost:5432/app_db?schema=public
--
-- How to run this script:
--   psql -U agent_db -d app_db -f scripts/init_postgres.sql
--   or execute inside pgAdmin / DBeaver / your SQL client.
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Trigger Function for Auto-Updating Timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- ==============================================================================
-- 3. Users Table (Authentication & Role-Based Access Control)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'user', -- 'admin' or 'user'
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 4. Admin Global Credentials Table (LLM APIs Only)
-- Admin can only set global LLM AI API keys (OpenAI, Claude, DeepSeek, etc.).
-- Admin does not set global MCP server settings.
-- Every user configures their own unique MCP servers in the app_key_value table.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS admin_global_config (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'global',
    llm_providers JSONB NOT NULL DEFAULT '{}'::jsonb, -- Global Model providers
    mcp_servers JSONB NOT NULL DEFAULT '[]'::jsonb,   -- Deprecated/Unused (MCP is now unique per user)
    updated_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed global config row if missing
INSERT INTO admin_global_config (id, llm_providers, mcp_servers)
VALUES ('global', '{}'::jsonb, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 5. User-Scoped Key-Value Store
-- Stores configs, settings, copilots, active selections per user
-- ==============================================================================
CREATE TABLE IF NOT EXISTS app_key_value (
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_app_key_value_user_key ON app_key_value(user_id, key);

DROP TRIGGER IF EXISTS trg_app_key_value_updated_at ON app_key_value;
CREATE TRIGGER trg_app_key_value_updated_at
BEFORE UPDATE ON app_key_value
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 6. Session Metadata Table
-- Fast indexed sidebar navigation and session directory per user
-- ==============================================================================
CREATE TABLE IF NOT EXISTS session_meta (
    id VARCHAR(255) PRIMARY KEY NOT NULL,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    starred INTEGER NOT NULL DEFAULT 0,
    hidden INTEGER NOT NULL DEFAULT 0,
    archived_at BIGINT,
    recovery_archived INTEGER NOT NULL DEFAULT 0,
    assistant_avatar_key TEXT,
    pic_url TEXT,
    background_image JSONB,
    type VARCHAR(64) DEFAULT 'chat',
    sort_order DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_meta_user ON session_meta(user_id);
CREATE INDEX IF NOT EXISTS idx_session_meta_sort_order ON session_meta(user_id, sort_order DESC);
CREATE INDEX IF NOT EXISTS idx_session_meta_archived ON session_meta(user_id, archived_at);

DROP TRIGGER IF EXISTS trg_session_meta_updated_at ON session_meta;
CREATE TRIGGER trg_session_meta_updated_at
BEFORE UPDATE ON session_meta
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 7. Chat Sessions (Full Documents)
-- Stores complete session data, threads, compaction points per user
-- ==============================================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR(255) PRIMARY KEY NOT NULL,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    type VARCHAR(64) DEFAULT 'chat',
    data JSONB NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);

DROP TRIGGER IF EXISTS trg_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER trg_chat_sessions_updated_at
BEFORE UPDATE ON chat_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 8. Chat Messages (Relational Decomposition)
-- Stores individual message history per session and user
-- ==============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(255) PRIMARY KEY NOT NULL,
    session_id VARCHAR(255) NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL,
    model VARCHAR(128),
    content_parts JSONB NOT NULL DEFAULT '[]'::jsonb,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_parts_gin ON chat_messages USING gin(content_parts);

-- ==============================================================================
-- 9. Application Binary / Text Blobs
-- Stores attachments, uploaded documents, OCR results, and images per user
-- ==============================================================================
CREATE TABLE IF NOT EXISTS app_blobs (
    key VARCHAR(512) NOT NULL,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_app_blobs_user ON app_blobs(user_id);

-- ==============================================================================
-- 10. AI Image Generations History
-- Stores image creation prompts, models, and results per user
-- ==============================================================================
CREATE TABLE IF NOT EXISTS image_generations (
    id VARCHAR(255) PRIMARY KEY NOT NULL,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    model_provider VARCHAR(128) NOT NULL,
    model_id VARCHAR(128) NOT NULL,
    status VARCHAR(64) NOT NULL,
    reference_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    generated_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    generated_image_thumbnails JSONB,
    parent_id TEXT,
    aspect_ratio VARCHAR(64),
    task_id VARCHAR(128),
    error TEXT,
    error_code VARCHAR(64),
    source VARCHAR(64),
    created_at BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_image_generations_user ON image_generations(user_id, created_at DESC);

-- ==============================================================================
-- 11. Initial Admin User Seed
-- Username: admin
-- Email:    admin@agentlab.local
-- Password: Admin@123 (Salted PBKDF2-SHA256)
-- Role:     admin
-- ==============================================================================
INSERT INTO users (id, username, email, password_hash, role)
VALUES (
    'admin-root-0000-000000000001',
    'admin',
    'admin@agentlab.local',
    'd6f83b2e7c1a409f:a4a163abd80bbde75acd1903f249b5a2c6a001f8ac742ff8cbf8ec90f5a96ee9',
    'admin'
)
ON CONFLICT (username) DO NOTHING;

-- Verification query
SELECT id, username, email, role, created_at FROM users;
