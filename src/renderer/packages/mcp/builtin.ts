import { getLicenseKey } from '@/stores/settingActions'
import type { MCPServerConfig } from './types'

export interface BuildinMCPServerConfig {
  id: string
  name: string
  description: string
  url: string
}

export const BUILTIN_MCP_SERVERS: BuildinMCPServerConfig[] = []

export function getBuiltinServerConfig(id: string, licenseKey?: string): MCPServerConfig | null {
  const config = BUILTIN_MCP_SERVERS.find((s) => s.id === id)
  if (!config) {
    return null
  }
  const license = licenseKey || getLicenseKey()
  return {
    id,
    name: config.name,
    enabled: true,
    protocolMode: 'legacy',
    transport: {
      type: 'http',
      url: config.url,
      headers: license ? { 'x-chatbox-license': license } : undefined,
    },
  }
}
