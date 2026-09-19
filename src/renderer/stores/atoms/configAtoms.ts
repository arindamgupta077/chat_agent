import { atomWithStorage } from 'jotai/utils'
import storage, { StorageKey } from '../../storage'

// export const configVersionAtom = atomWithStorage<number>(StorageKey.ConfigVersion, 0, storage) // Keep commented out if original was

export const remoteConfigAtom = atomWithStorage<{ setting_chatboxai_first?: boolean; current_version?: string }>(
  StorageKey.RemoteConfig,
  {},
  storage
)
