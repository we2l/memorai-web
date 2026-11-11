import { defineStore } from 'pinia'
import type { User } from '~/types'
import { hasProAccess, opensTrialOnUse, trialEnded } from '~/utils/trial'
import { useOfflineStore } from '~/stores/offline'
import { loadOfflineDb } from '~/utils/offlineDbLoader'
import { attributionPayload } from '~/utils/firstTouch'

// utils/offlineDb and the review store load on demand: this store is in the entry of every page
const offlineDb = loadOfflineDb

// Non-sensitive hint (not a credential): avoids calling /me for anonymous visitors.
const LOGGED_IN_HINT = 'baigi_logged_in'
let trialRefresh: Promise<unknown> | null = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    loaded: false,
    /** The user on screen is the one saved on this device: /me failed for lack of network (prd-revisao-offline RF-F2) */
    offline: false,
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
        const status = getErrorStatus(e)
        if (status === 401) this.clearAuth()
        else if (status === undefined && !this.user) await this.useSavedUser()
        return null
      }
    },

    /**
     * Boot without network (RF-F2): with the session hint, the last /me saved on this device opens the app, so the
     * saved lot can be reviewed. /me runs again on `online` (plugins/offline).
     */
    async useSavedUser() {
      if (!import.meta.client || !useOfflineStore().enabled || !/(?:^|;\s*)baigi_logged_in=1/.test(document.cookie)) return
      const { metaGet } = await offlineDb()
      const id = await metaGet<string>('user')
      const saved = id ? await metaGet<User>(`user:${id}`) : undefined
      if (!saved) return
      this.user = saved
      this.offline = true
      useOfflineStore().markOffline()
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

    async register(payload: { name?: string, email: string, password: string, accept_terms: boolean, analytics_consent?: boolean, captcha_token?: string }): Promise<User> {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: { user: User } }>('/register', {
        method: 'POST',
        // First touch of this device (utm_* of the first visit): sign-ups per post without PostHog
        body: { ...payload, ...attributionPayload() },
      })
      this.setUser(res.data.user)
      return res.data.user
    },

    async logout(): Promise<void> {
      const { $api } = useNuxtApp()
      // Ratings still waiting get up to 3 s to reach the server; the rest stays queued (ids and notes only) until this
      // account signs in again, and the saved lot and user go now (prd-revisao-offline RF-F8, D11)
      const userId = this.user?.id
      if (userId) {
        const flush = useOfflineStore().pending > 0
          ? import('~/stores/review').then(m => m.useReviewStore().processQueue())
          : Promise.resolve()
        await Promise.race([flush, new Promise(r => setTimeout(r, 3000))])
        await (await offlineDb()).forgetAccountCache(userId)
      }
      // Cleared first: a 401 of /logout itself (session already over) then finds no user to send to /entrar?redirect.
      // An explicit logout: the next person on this browser finds no ids nor drafts of this account either.
      clearAccountStorage()
      this.clearAuth()
      try {
        await $api('/logout', { method: 'POST' })
      } catch (e) {
        // A session already over (401, 419) is the goal. Without network the HttpOnly cookie stays valid: whoever
        // opens this browser next must not get the account back, so the logout is finished on the next boot.
        if (getErrorStatus(e) === undefined) markPendingLogout()
      }
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
      this.offline = false
      clearPendingLogout()
      if (import.meta.client) {
        document.cookie = `${LOGGED_IN_HINT}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
        // Account consent vs. this device's cookie (RF-F01), then identify without PII (RF-F07)
        void useConsent().syncWithServer(user)
        useAnalytics().identify(user)
        // To open without network next time (RF-F2); nothing with the kill switch off (RF-F10)
        if (useOfflineStore().enabled) {
          void offlineDb().then(({ metaPut }) => Promise.all([metaPut(`user:${user.id}`, user), metaPut('user', user.id)]))
        }
      }
    },

    clearAuth() {
      this.user = null
      // No data of this account stays on screen even if someone navigates without the full page load (accountState.ts)
      resetUserScopedState()
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
