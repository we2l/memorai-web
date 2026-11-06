import { defineStore } from 'pinia'
import type { User } from '~/types'
import { hasProAccess, opensTrialOnUse, trialEnded } from '~/utils/trial'

// Non-sensitive hint (not a credential): avoids calling /me for anonymous visitors.
const LOGGED_IN_HINT = 'baigi_logged_in'
let trialRefresh: Promise<unknown> | null = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    loaded: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    isVerified: (state) => !!state.user?.email_verified,
    // The Intensivo trial (utils/trial.ts): `plan` stays free during it
    onTrial: (state) => state.user?.trial?.status === 'active',
    hasProAccess: (state) => hasProAccess(state.user),
    opensTrialOnUse: (state) => opensTrialOnUse(state.user),
    trialEnded: (state) => trialEnded(state.user),
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

    async register(payload: { name: string, email: string, password: string, accept_terms: boolean, analytics_consent?: boolean }): Promise<User> {
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
      } catch (e) {
        // A session already over (401, 419) is the goal. Without network the HttpOnly cookie stays valid: whoever
        // opens this browser next must not get the account back, so the logout is finished on the next boot.
        if (getErrorStatus(e) === undefined) markPendingLogout()
      }
      this.clearAuth()
    },

    async updateProfile(name: string): Promise<User> {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: User }>('/user/profile', { method: 'PUT', body: { name } })
      this.setUser(res.data)
      return res.data
    },

    /**
     * After a POST that can open the trial (utils/trial.ts opensTrialRequest), while it is available: /me again,
     * once at a time, so the screen shows the trial the server just opened.
     */
    refreshTrialAfterUse(): Promise<unknown> | void {
      if (!opensTrialOnUse(this.user)) return
      trialRefresh ??= this.fetchMe().finally(() => { trialRefresh = null })
      return trialRefresh
    },

    setUser(user: User) {
      this.user = user
      clearPendingLogout()
      if (import.meta.client) {
        document.cookie = `${LOGGED_IN_HINT}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
        // Account consent vs. this device's cookie (RF-F01), then identify without PII (RF-F07)
        void useConsent().syncWithServer(user)
        useAnalytics().identify(user)
      }
    },

    clearAuth() {
      this.user = null
      if (import.meta.client) {
        // Next person on this browser starts a fresh anonymous id (RF-F07)
        useAnalytics().reset()
        document.cookie = `${LOGGED_IN_HINT}=; path=/; max-age=0`
        // Legacy Bearer cookie (pre ADR-020)
        document.cookie = 'auth_token=; path=/; max-age=0'
      }
    },
  },
})
