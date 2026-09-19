import {
  createLastUsedModelStore,
  type LastUsedModelState,
  type LastUsedModelStoreState,
  useLastUsedModelStore as useSharedLastUsedModelStore,
} from '@chatbox/react/stores'
import { getSafeStorage } from './safeStorage'

export const lastUsedModelStore = createLastUsedModelStore({
  storage: getSafeStorage(),
  skipHydration: true,
})

let initLastUsedModelStorePromise: Promise<LastUsedModelState> | undefined
export function initLastUsedModelStore(): Promise<LastUsedModelState> {
  if (!initLastUsedModelStorePromise) {
    initLastUsedModelStorePromise = new Promise<LastUsedModelState>((resolve) => {
      const unsubscribe = lastUsedModelStore.persist.onFinishHydration((state) => {
        unsubscribe()
        if (state.chat?.provider === 'chatbox-ai' || state.chat?.provider === 'ChatboxAI') {
          lastUsedModelStore.setState({ chat: undefined })
        }
        if (state.picture?.provider === 'chatbox-ai' || state.picture?.provider === 'ChatboxAI') {
          lastUsedModelStore.setState({ picture: undefined })
        }
        resolve(lastUsedModelStore.getState())
      })
      void lastUsedModelStore.persist.rehydrate()
    })
  }
  return initLastUsedModelStorePromise
}

export function useLastUsedModelStore<T>(selector: (state: LastUsedModelStoreState) => T): T {
  return useSharedLastUsedModelStore(lastUsedModelStore, selector)
}
