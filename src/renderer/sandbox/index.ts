import type { SandboxProvider } from '@shared/sandbox-provider'
import { CloudSandboxProvider } from './cloud-provider'

/**
 * Create a sandbox provider based on the current platform.
 * Returns null if no sandbox is available.
 */
export function createSandboxProvider(): SandboxProvider | null {
  return new CloudSandboxProvider()
}
