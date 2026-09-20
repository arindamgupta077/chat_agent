import { create } from 'zustand'

export interface AuthUser {
  id: string
  username: string
  email: string
  role: 'admin' | 'user'
}

interface AppAuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (identifier: string, password: string) => Promise<boolean>
  register: (username: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  checkAuth: () => Promise<boolean>
}

const TOKEN_KEY = 'agentlab_auth_token'

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken()
  if (!token) return {}
  return {
    Authorization: `Bearer ${token}`,
  }
}

export const useAppAuthStore = create<AppAuthState>((set, get) => ({
  user: null,
  token: getAuthToken(),
  isAuthenticated: Boolean(getAuthToken()),
  isLoading: false,
  error: null,

  login: async (identifier: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        set({ error: data.error || 'Login failed', isLoading: false })
        return false
      }

      localStorage.setItem(TOKEN_KEY, data.token)
      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
      return true
    } catch (err: any) {
      set({ error: err.message || 'Network error', isLoading: false })
      return false
    }
  },

  register: async (username: string, email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })

      const data = await res.json()
      if (!res.ok) {
        set({ error: data.error || 'Registration failed', isLoading: false })
        return false
      }

      localStorage.setItem(TOKEN_KEY, data.token)
      set({
        token: data.token,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
      return true
    } catch (err: any) {
      set({ error: err.message || 'Network error', isLoading: false })
      return false
    }
  },

  logout: () => {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // ignore
    }
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      error: null,
    })
    window.location.reload()
  },

  checkAuth: async () => {
    const token = getAuthToken()
    if (!token) {
      set({ isAuthenticated: false, user: null, token: null })
      return false
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        set({ user: data.user, isAuthenticated: true, token })
        return true
      } else {
        localStorage.removeItem(TOKEN_KEY)
        set({ isAuthenticated: false, user: null, token: null })
        return false
      }
    } catch {
      // In case of offline/network, if token exists keep user in session
      return true
    }
  },
}))
