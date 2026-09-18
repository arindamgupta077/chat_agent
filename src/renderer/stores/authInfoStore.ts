import {
  type AuthInfoStoreState,
  type AuthTokens,
  createAuthInfoStore,
  useAuthInfoStore as useSharedAuthInfoStore,
} from '@chatbox/react/stores'
import { getSafeStorage } from './safeStorage'

export type { AuthTokens }

export const authInfoStore = createAuthInfoStore({
  storage: getSafeStorage(),
})

// Ensure all authentication tokens are permanently cleared
try {
  authInfoStore.getState().clearTokens()
} catch (e) {
  // safe ignore
}

export function useAuthInfoStore<T>(selector: (state: AuthInfoStoreState) => T): T {
  return useSharedAuthInfoStore(authInfoStore, selector)
}

export function useAuthTokens() {
  return {
    accessToken: '',
    refreshToken: '',
    isLoggedIn: false,
    setTokens: async () => {},
    clearTokens: () => {},
    getTokens: () => null,
  }
}
