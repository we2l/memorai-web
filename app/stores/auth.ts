import { defineStore } from 'pinia'
import type { User } from '~/types'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
  },

  actions: {
    setAuth(user: User, token: string) {
      this.user = user
      this.token = token
      if (import.meta.client) {
        document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
      }
    },

    clearAuth() {
      this.user = null
      this.token = null
      if (import.meta.client) {
        document.cookie = 'auth_token=; path=/; max-age=0'
      }
    },

    loadFromCookie() {
      const cookie = useCookie('auth_token')
      if (cookie.value) {
        this.token = cookie.value
      }
    },
  },
})
