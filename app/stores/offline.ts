import { defineStore } from 'pinia'
import { loadOfflineDb } from '~/utils/offlineDbLoader'

/**
 * Offline review (prd-revisao-offline RF-F6): what the screen says about the connection. `offline` comes from a
 * request that failed without an HTTP status (D10: navigator.onLine lies on a network without internet) and goes
 * back to false on the next answer from the server. `serverDown` tells why (QA 2026-11 M3): the browser says it is
 * online, so the API did not answer (down, timeout of a proxy) and "Sem internet" would be false; the bar then offers
 * "Tentar de novo". Either way the ratings stay in the queue and the review goes on (ADR-036).
 */
export const useOfflineStore = defineStore('offline', {
  state: () => ({
    offline: false,
    /** Offline with the browser online: the server did not answer, not the connection */
    serverDown: false,
    /** Ratings waiting in the queue (memory + IndexedDB of this account) */
    pending: 0,
    /** Last time the queue reached the server empty (ms) */
    lastSync: null as number | null,
    /** Went offline with something to send: "Avaliações sincronizadas" when the queue drains (RF-F6) */
    hadOfflineWork: false,
    /** A saved lot of today exists for the default slice ("Revisar o lote salvo") */
    savedLot: false,
    /** navigator.storage.persist() already asked in this page (D13) */
    persistAsked: false,
  }),

  getters: {
    /** The kill switch (RF-F10): without it, no saved lot, no saved user, no bar. The queue stays. */
    enabled: () => {
      const v = useRuntimeConfig().public.offlineReview as unknown
      return v !== false && v !== '0' && v !== 0
    },
  },

  actions: {
    markOffline() {
      if (!this.offline) this.offline = true
      // navigator.onLine false is reliable (no connection at all); true only says there is a network
      const down = typeof navigator === 'undefined' || navigator.onLine !== false
      if (this.serverDown !== down) this.serverDown = down
    },

    markOnline() {
      if (this.offline) this.offline = false
      if (this.serverDown) this.serverDown = false
    },

    /** The browser lost the connection (window `offline`): "Sem internet" from now on */
    connectionLost() {
      if (this.serverDown) this.serverDown = false
    },

    /** "Tentar de novo" of the bar: sends the queue now, a paused one included (stores/review loads on demand) */
    async retryNow() {
      const review = (await import('~/stores/review')).useReviewStore()
      if (review.queuePaused) review.retryQueue()
      else await review.processQueue()
    },

    setPending(n: number) {
      this.pending = n
      if (n > 0 && this.offline) this.hadOfflineWork = true
    },

    /** The queue drained on the server */
    synced() {
      this.lastSync = Date.now()
      const at = this.lastSync
      void loadOfflineDb().then(m => m.metaPut('last-sync', at))
      if (this.hadOfflineWork) {
        this.hadOfflineWork = false
        useToast().show('Avaliações sincronizadas.', 'success')
      }
    },
  },
})

