import type { JSONRPCMessage, Transport, TransportSendOptions } from '@modelcontextprotocol/client'
import type { StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js'

export class IPCStdioTransport implements Transport {
  static async create(serverParams: StdioServerParameters) {
    if (typeof window === 'undefined' || !window.electronAPI?.invoke) {
      throw new Error('Local (stdio) MCP servers are only supported in the desktop application.')
    }
    const ipcTransportId = await window.electronAPI.invoke('mcp:stdio-transport:create', serverParams)
    return new IPCStdioTransport(ipcTransportId)
  }

  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage) => void

  // The MCP client classifies custom transports structurally so discovery timeouts
  // can fall back to the legacy handshake on a local stdio pipe.
  readonly stderr = null
  readonly pid = undefined

  private readonly removeEventListeners: Array<() => void> = []
  private closedNotified = false

  constructor(private readonly ipcTransportId: string) {
    if (typeof window !== 'undefined' && window.electronAPI?.addMcpStdioTransportEventListener) {
      this.removeEventListeners.push(
        window.electronAPI.addMcpStdioTransportEventListener(
          this.ipcTransportId,
          'onclose',
          (stderrMessage: string) => {
            try {
              if (stderrMessage) {
                this.onerror?.(new Error(stderrMessage))
              }
            } finally {
              this.notifyClosed()
            }
          }
        ),
        window.electronAPI.addMcpStdioTransportEventListener(this.ipcTransportId, 'onerror', (error: Error) => {
          this.onerror?.(error)
        }),
        window.electronAPI.addMcpStdioTransportEventListener(
          this.ipcTransportId,
          'onmessage',
          (message: JSONRPCMessage) => {
            this.onmessage?.(message)
          }
        )
      )
    }
  }

  private disposeEventListeners() {
    for (const removeListener of this.removeEventListeners.splice(0)) {
      removeListener()
    }
  }

  private notifyClosed() {
    if (this.closedNotified) {
      this.disposeEventListeners()
      return
    }
    this.closedNotified = true
    try {
      this.onclose?.()
    } finally {
      this.disposeEventListeners()
    }
  }

  async start(): Promise<void> {
    if (typeof window === 'undefined' || !window.electronAPI?.invoke) {
      throw new Error('Local (stdio) MCP servers are only supported in the desktop application.')
    }
    await window.electronAPI.invoke('mcp:stdio-transport:start', this.ipcTransportId)
  }

  async send(message: JSONRPCMessage, _options?: TransportSendOptions): Promise<void> {
    if (typeof window === 'undefined' || !window.electronAPI?.invoke) {
      throw new Error('Local (stdio) MCP servers are only supported in the desktop application.')
    }
    await window.electronAPI.invoke('mcp:stdio-transport:send', this.ipcTransportId, message)
  }

  async close(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.invoke) {
        await window.electronAPI.invoke('mcp:stdio-transport:close', this.ipcTransportId)
      }
    } finally {
      this.notifyClosed()
    }
  }
}
