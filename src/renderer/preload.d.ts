import type { ElectronIPC } from '../shared/electron-types'

declare global {
  interface File {
    path?: string
  }
  interface Window {
    electronAPI?: ElectronIPC
  }
}
