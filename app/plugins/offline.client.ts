// Offline review (prd-revisao-offline RF-F3, RF-F4; ADR-036). Runs after plugins/auth.client (alphabetical order):
// - the ratings an earlier page left in IndexedDB go back to the queue of this account and are sent;
// - the queue is sent again on `online`, when the app comes back to the front and every 30 s (no Background Sync, D2);
// - online, the default lot of today is saved in the background, at most once every 2 hours.
// The review store and utils/offlineDb load on demand (dynamic import): this plugin is in the entry of every page.
import { studyDay } from '~/utils/greeting'
import { loadOfflineDb } from '~/utils/offlineDbLoader'

/** The server refuses older ratings (review.offline_max_days, RF-B2) */
const MAX_DAYS = 7
const LOT_EVERY_MS = 2 * 60 * 60 * 1000
const KICK_EVERY_MS = 30_000

export default defineNuxtPlugin(() => {
  const auth = useAuthStore()
  const offline = useOfflineStore()
  const reviewStore = () => import('~/stores/review').then(m => m.useReviewStore())
  const db = loadOfflineDb

  /** Sends what waits (the review store keeps offline.pending up to date) */
  const kick = (retryPaused = false) => {
    if (offline.pending === 0) return
    void reviewStore().then((review) => {
      if (retryPaused && review.queuePaused) review.retryQueue()
      else void review.processQueue()
    })
  }

  async function resume() {
    const id = auth.user?.id
    if (!id) return
    const { queueForUser, queuePurgeOlderThan, metaGet } = await db()
    void metaGet<number>('last-sync').then((t) => { if (t && !offline.lastSync) offline.lastSync = t })
    await queuePurgeOlderThan(MAX_DAYS)
    if ((await queueForUser(id)).length) await (await reviewStore()).resumeStoredQueue(id)
  }

  /** "Revisar o lote salvo" (RF-F6): a lot of today with something left to review */
  async function checkSavedLot(userId: string) {
    const { sessionGet, sessionKey } = await db()
    const saved = await sessionGet(sessionKey(userId, ''))
    offline.savedLot = !!saved && saved.day === studyDay() && saved.res.data.length > saved.rated.length
  }

  async function saveDefaultLot() {
    const id = auth.user?.id
    if (!id || !offline.enabled) return
    if (auth.offline) return checkSavedLot(id)
    const { metaGet, metaPut } = await db()
    const last = await metaGet<number>(`lot-at:${id}`)
    if (last && Date.now() - last < LOT_EVERY_MS) return checkSavedLot(id)
    try {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: unknown[] }>('/review/session')
      if (auth.user?.id !== id) return
      ;(await reviewStore()).saveLot('', res)
      await metaPut(`lot-at:${id}`, Date.now())
    } catch {
      // intencional: o lote salvo é um extra; sem rede agora, fica o de antes
    }
    await checkSavedLot(id)
  }

  onNuxtReady(() => {
    void resume()
    void saveDefaultLot()
  })

  window.addEventListener('online', () => {
    if (auth.offline) void auth.fetchMe()
    kick(true)
  })
  window.addEventListener('offline', () => offline.connectionLost())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') kick()
  })
  setInterval(() => kick(), KICK_EVERY_MS)
})
