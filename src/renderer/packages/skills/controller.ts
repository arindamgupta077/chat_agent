import type { MarketplaceSkill, SkillInfo, SkillMetadata } from '@shared/types/skills'
import type { UserExecApprovalSource } from '@shared/types/user-exec'

interface SkillScriptResult {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number | null
  cancelled?: boolean
  cwd?: string
  outputFile?: string
}

interface SkillInstallResult {
  success: boolean
  skillName: string
  error?: string
}

interface SkillUpdateResult {
  hasUpdate: boolean
  currentHash?: string
  latestHash?: string
  error?: string
}

const skillsChangeListeners = new Set<() => void>()

export function notifySkillsChanged(): void {
  for (const listener of skillsChangeListeners) {
    listener()
  }
}

export function subscribeSkillsChanged(listener: () => void): () => void {
  skillsChangeListeners.add(listener)
  return () => {
    skillsChangeListeners.delete(listener)
  }
}

async function invokeSkillsIpc<T>(channel: string, ...args: any[]): Promise<T> {
  if (typeof window !== 'undefined' && window.electronAPI?.invoke) {
    return window.electronAPI.invoke(channel, ...args)
  }
  throw new Error(`Skills IPC is not available in browser mode (${channel})`)
}

export const skillsController = {
  discoverSkills(): Promise<SkillInfo[]> {
    if (typeof window === 'undefined' || !window.electronAPI?.invoke) {
      return Promise.resolve([])
    }
    return window.electronAPI.invoke('skills:discover')
  },

  loadSkill(
    name: string
  ): Promise<{ metadata: SkillMetadata; body: string; skillRoot?: string; files?: string[] } | null> {
    if (typeof window === 'undefined' || !window.electronAPI?.invoke) {
      return Promise.resolve(null)
    }
    return window.electronAPI.invoke('skills:load', name)
  },

  getSkillsDirectory(): Promise<string> {
    return invokeSkillsIpc('skills:get-directory')
  },

  async openSkillsDirectory(): Promise<void> {
    await invokeSkillsIpc('skills:open-directory')
  },

  executeScript(skillName: string, scriptName: string, args?: string[]): Promise<SkillScriptResult> {
    return invokeSkillsIpc('skills:execute-script', { skillName, scriptName, args })
  },

  async installSkill(owner: string, repo: string, skillPath: string): Promise<SkillInstallResult> {
    const result = await invokeSkillsIpc<SkillInstallResult>('skills:install', { owner, repo, skillPath })
    if (result.success) notifySkillsChanged()
    return result
  },

  async installFromSandbox(sandboxPath: string, sessionId?: string, sourceInfo?: string): Promise<SkillInstallResult> {
    const result = await invokeSkillsIpc<SkillInstallResult>('skills:install-from-sandbox', {
      sandboxPath,
      sessionId,
      sourceInfo,
    })
    if (result.success) notifySkillsChanged()
    return result
  },

  userExec(
    command: string,
    options?: {
      cwd?: string
      timeout?: number
      sessionId?: string
      toolCallId?: string
      approvalSource?: UserExecApprovalSource
      retryOf?: string
      shell?: 'bash' | 'powershell'
      baseCwd?: string
      injectBundledNode?: boolean
    }
  ): Promise<SkillScriptResult> {
    return invokeSkillsIpc('skills:user-exec', { command, ...options })
  },

  resolveUserExecCwd(options: { cwd?: string; baseCwd?: string }): Promise<string> {
    return invokeSkillsIpc('skills:resolve-user-exec-cwd', options)
  },

  resolveCommandRetry(options: {
    sessionId: string
    retryOf?: string
    command: string
    cwd: string
    shell: 'bash' | 'powershell'
  }): Promise<{ valid: true; retryOf: string } | { valid: false; error: string }> {
    return invokeSkillsIpc('skills:resolve-command-retry', options)
  },

  cancelUserExec(options: { sessionId?: string; toolCallId: string }): Promise<{ killed: boolean }> {
    return invokeSkillsIpc('skills:user-exec-cancel', options)
  },

  async installMarketplaceSkill(skill: MarketplaceSkill): Promise<SkillInstallResult> {
    const result = await invokeSkillsIpc<SkillInstallResult>('skills:install-marketplace', skill)
    if (result.success) notifySkillsChanged()
    return result
  },

  async deleteSkill(name: string): Promise<{ success: boolean; error?: string }> {
    const result = await invokeSkillsIpc<{ success: boolean; error?: string }>('skills:delete', name)
    if (result.success) notifySkillsChanged()
    return result
  },

  scanRepo(owner: string, repo: string): Promise<Array<{ name: string; path: string; description?: string }>> {
    return invokeSkillsIpc('skills:scan-repo', owner, repo)
  },

  checkForUpdate(name: string): Promise<SkillUpdateResult> {
    return invokeSkillsIpc('skills:check-update', name)
  },

  checkForUpdatesBatch(): Promise<Record<string, { hasUpdate: boolean; error?: string }>> {
    if (typeof window === 'undefined' || !window.electronAPI?.invoke) {
      return Promise.resolve({})
    }
    return window.electronAPI.invoke('skills:check-updates-batch')
  },

  async syncBuiltinSkills(lang?: string): Promise<{ changed: boolean }> {
    if (typeof window === 'undefined' || !window.electronAPI?.invoke) {
      return Promise.resolve({ changed: false })
    }
    const result = await window.electronAPI.invoke('skills:sync-builtin', lang)
    if (result?.changed) notifySkillsChanged()
    return result ?? { changed: false }
  },
}

if (typeof window !== 'undefined' && window.electronAPI?.onSkillsBuiltinUpdated) {
  window.electronAPI.onSkillsBuiltinUpdated(() => notifySkillsChanged())
}
