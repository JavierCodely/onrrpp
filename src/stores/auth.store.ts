import { create } from 'zustand'
import type { AuthUser } from '@/types/database'
import { authService } from '@/services/auth.service'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  initialized: boolean
  signOutReason: string | null
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: (reason?: string) => Promise<void>
  initialize: () => Promise<void>
  clearSignOutReason: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,
  signOutReason: null,

  signIn: async (email: string, password: string) => {
    set({ loading: true, signOutReason: null })
    const { user, error } = await authService.signIn(email, password)
    set({ user, loading: false })
    return { error }
  },

  signOut: async (reason?: string) => {
    set({ loading: true })
    await authService.signOut()
    set({ user: null, loading: false, signOutReason: reason || null })
  },

  initialize: async () => {
    set({ loading: true })
    const { user } = await authService.getCurrentUser()
    set({ user, loading: false, initialized: true })
  },

  clearSignOutReason: () => {
    set({ signOutReason: null })
  },
}))
