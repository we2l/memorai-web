import { defineStore } from 'pinia'
import { loadOfflineDb } from '~/utils/offlineDbLoader'

/**
 * Offline review (prd-revisao-offline RF-F6): what the screen says about the connection. `offline` comes from a
 * request that failed without an HTTP status (D10: navigator.onLine lies on a network without internet) and goes
 * back to false on the next answer from the server.
 */
export const useOfflineStore = defineStore('offline', {
  state: () => ({
    offline: false,
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
    },

    markOnline() {
      if (this.offline) this.offline = false
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

