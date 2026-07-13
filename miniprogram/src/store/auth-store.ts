import { create } from 'zustand'

import { getStoredToken, setStoredToken } from '@/services/api'
import { getCurrentUser, loginWithWechat, logout as logoutService } from '@/services/auth'
import type { UserProfile } from '@/services/types'

type AuthState = {
  token: string
  user: UserProfile | null
  loading: boolean
  login: () => Promise<void>
  refreshProfile: () => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getStoredToken(),
  user: null,
  loading: false,
  login: async () => {
    set({ loading: true })
    try {
      const token = await loginWithWechat()
      set({ token: token.access_token })
      await get().refreshProfile()
    } finally {
      set({ loading: false })
    }
  },
  refreshProfile: async () => {
    const token = getStoredToken()
    if (!token) {
      set({ token: '', user: null })
      return
    }
    try {
      const user = await getCurrentUser()
      set({ token, user })
    } catch {
      setStoredToken('')
      set({ token: '', user: null })
    }
  },
  logout: () => {
    logoutService()
    set({ token: '', user: null })
  }
}))
