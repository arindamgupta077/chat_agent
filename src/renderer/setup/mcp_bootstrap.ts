import { getBuiltinServerConfig } from '@/packages/mcp/builtin'
import { mcpController } from '@/packages/mcp/controller'
import { getAuthHeaders, getAuthToken } from '@/stores/appAuthStore'
import { initSettingsStore, settingsStore } from '@/stores/settingsStore'
import { NODE_ENV } from '@/variables'

function monitorServerStatus() {
  setInterval(() => {
    console.debug(
      'MCP Servers:',
      JSON.stringify(
        Array.from(mcpController.servers.values()).map(({ config, instance: server }) => {
          return {
            id: config.id,
            name: config.name,
            status: server.status,
          }
        }),
        null,
        2
      )
    )
  }, 10000)
}

export function bootstrapMcpServers(settings: any) {
  const mcp = settings?.mcp
  const licenseKey = settings?.licenseKey
  const servers = [
    ...(mcp?.enabledBuiltinServers || []).map((id: string) => getBuiltinServerConfig(id, licenseKey)).filter((s: any) => !!s),
    ...(mcp?.servers || []), // user defined servers
  ]
  console.info(`mcp bootstrap ${servers.length} servers, with license key: ${!!licenseKey}`)
  mcpController.bootstrap(servers)
}

initSettingsStore()
  .then((settings) => {
    bootstrapMcpServers(settings)

    // Globally load user's isolated MCP servers from PostgreSQL if authenticated
    const token = getAuthToken()
    if (token) {
      fetch('/api/mcp/servers', {
        headers: { ...getAuthHeaders() },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.servers && Array.isArray(data.servers) && data.servers.length > 0) {
            settingsStore.getState().setSettings((draft) => {
              draft.mcp.servers = data.servers
            })
          }
        })
        .catch((err) => {
          console.warn('[mcp_bootstrap] Failed to load MCP servers from database:', err)
        })
    }

    if (NODE_ENV === 'development') {
      monitorServerStatus()
    }
  })
  .catch((err) => {
    console.error('mcp bootstrap error', err)
  })

// Keep mcpController synchronized whenever mcp settings change
let lastServersSignature = ''
settingsStore.subscribe((state) => {
  const servers = state.mcp?.servers || []
  const signature = JSON.stringify(servers.map((s) => ({ id: s.id, enabled: s.enabled, transport: s.transport })))
  if (signature !== lastServersSignature) {
    lastServersSignature = signature
    bootstrapMcpServers(state)
  }
})
