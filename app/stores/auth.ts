import { defineStore } from 'pinia'
import type { User } from '~/types'

// Non-sensitive hint (not a credential): avoids calling /me for anonymous visitors.
const LOGGED_IN_HINT = 'baigi_logged_in'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    loaded: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isVerified: (state) => !!state.user?.email_verified,
  },

  actions: {
    async fetchMe(): Promise<User | null> {
      const { $api } = useNuxtApp()
      try {
        const res = await $api<{ data: User }>('/me')
        this.setUser(res.data)
        return res.data
      } catch (e: any) {
        if ((e?.response?.status ?? e?.statusCode) === 401) this.clearAuth()
        return null
      }
    },

    async login(email: string, password: string): Promise<User> {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: { user: User } }>('/login', {
        method: 'POST',
        body: { email, password },
      })
      this.setUser(res.data.user)
      return res.data.user
    },

    async register(payload: { name: string, email: string, password: string, password_confirmation: string, accept_terms: boolean }): Promise<User> {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: { user: User } }>('/register', {
        method: 'POST',
        body: payload,
      })
      this.setUser(res.data.user)
      return res.data.user
    },

    async logout(): Promise<void> {
      const { $api } = useNuxtApp()
      try {
        await $api('/logout', { method: 'POST' })
      } catch {
        // Session may already be gone — local state is cleared anyway
      }
      this.clearAuth()
    },

    async updateProfile(name: string): Promise<User> {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: User }>('/user/profile', { method: 'PUT', body: { name } })
      this.setUser(res.data)
      return res.data
    },

    setUser(user: User) {
      this.user = user
      if (import.meta.client) {
        document.cookie = `${LOGGED_IN_HINT}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
      }
    },

    clearAuth() {
      this.user = null
      if (import.meta.client) {
        document.cookie = `${LOGGED_IN_HINT}=; path=/; max-age=0`
        // Legacy Bearer cookie (pre ADR-020)
        document.cookie = 'auth_token=; path=/; max-age=0'
      }
    },
  },
})
