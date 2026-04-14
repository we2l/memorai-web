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
      const cookie = useCookie('auth_token', { maxAge: 60 * 60 * 24 * 30 })
      cookie.value = token
    },

    clearAuth() {
      this.user = null
      this.token = null
      const cookie = useCookie('auth_token')
      cookie.value = null
    },

    loadFromCookie() {
      const cookie = useCookie('auth_token')
      if (cookie.value) {
        this.token = cookie.value
      }
    },
  },
})
