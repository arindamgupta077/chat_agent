import { getAuthHeaders } from './appAuthStore'

export async function syncAdminSelectedModel(provider: string, modelId: string) {
  try {
    await fetch('/api/admin/selected-model', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        selected_model: { provider, modelId, model: modelId },
      }),
    })
  } catch (err) {
    console.warn('[AdminModelSync] Failed to post selected-model:', err)
  }
}

export async function syncAdminGlobalSystemInstruction(instruction: string) {
  try {
    const res = await fetch('/api/admin/global-system-instruction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        global_system_instruction: instruction,
      }),
    })
    return res.ok
  } catch (err) {
    console.warn('[AdminInstructionSync] Failed to post global-system-instruction:', err)
    return false
  }
}

