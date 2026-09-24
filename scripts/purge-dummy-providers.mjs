import { query } from '../server/db.mjs'

async function purge() {
  console.log('[Purge] Starting removal of dummy model provider credentials...')

  const r1 = await query(`
    UPDATE admin_global_config
    SET llm_providers = (llm_providers - 'openai' - 'gemini' - 'claude')
    WHERE id = 'global'
  `)
  console.log('[Purge] Cleaned admin_global_config rows:', r1.rowCount)

  const r2 = await query(`
    UPDATE app_key_value
    SET value = jsonb_set(
      value,
      '{providers}',
      COALESCE((value->'providers') - 'openai' - 'gemini' - 'claude', '{}'::jsonb)
    )
    WHERE key = 'settings'
  `)
  console.log('[Purge] Cleaned app_key_value rows:', r2.rowCount)

  const adminRes = await query("SELECT llm_providers FROM admin_global_config WHERE id = 'global'")
  console.log('[Purge] admin_global_config remaining keys:', Object.keys(adminRes.rows[0]?.llm_providers || {}))

  const kvRes = await query("SELECT user_id, value->'providers' as providers FROM app_key_value WHERE key = 'settings'")
  for (const r of kvRes.rows) {
    console.log('[Purge] user:', r.user_id, 'remaining keys:', Object.keys(r.providers || {}))
  }

  process.exit(0)
}

purge().catch((err) => {
  console.error('[Purge Error]:', err)
  process.exit(1)
})
