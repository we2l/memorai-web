// Offline review (prd-revisao-offline §6, ADR-036): the IndexedDB "baigi-offline" with 3 stores:
// - queue: ratings not yet on the server (ids and notes only, never card text; D11), one row per client_id;
// - session: the 1st page of GET /review/session per account and slice, to review without network;
// - meta: the last /me (`user:{id}` + `user` = the id of the last one) and the last sync time.
// Every call is fail-safe: no IndexedDB (private window, old browser, blocked storage) = no offline, never an error.

const DB_NAME = 'baigi-offline'
const DB_VERSION = 1

export interface StoredRating {
  client_id: string
  user_id: string
  flashcard_id: string
  rating: 1 | 2 | 3 | 4
  answer?: { answer_mode: string; answer_outcome?: string; typed_match?: boolean }
  /** When the person answered (ISO, device clock); the server corrects it by client_sent_at */
  reviewed_at: string
}

export interface StoredSession {
  /** `{user}|{query}` */
  key: string
  user_id: string
  /** The study day (São Paulo, Y-m-d) the lot was saved on: another day = stale */
  day: string
  /** The GET /review/session answer (1st page) */
  res: { data: unknown[]; [k: string]: unknown }
  /** Card ids already rated since it was saved */
  rated: string[]
  saved_at: number
}

let opening: Promise<IDBDatabase | null> | null = null

function open(): Promise<IDBDatabase | null> {
  if (opening) return opening
  opening = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null)
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'client_id' }).createIndex('user_id', 'user_id')
        if (!db.objectStoreNames.contains('session')) db.createObjectStore('session', { keyPath: 'key' }).createIndex('user_id', 'user_id')
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' })
      }
      req.onsuccess = () => {
        const db = req.result
        // Another tab deleting the database (account deletion) closes this one
        db.onversionchange = () => { db.close(); opening = null }
        resolve(db)
      }
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null) // intencional: sem IndexedDB não há offline
    }
  })
  return opening
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return open().then(db => new Promise<T | undefined>((resolve) => {
    if (!db) return resolve(undefined)
    try {
      const tx = db.transaction(store, mode)
      const req = fn(tx.objectStore(store))
      tx.oncomplete = () => resolve(req ? req.result : undefined)
      tx.onerror = () => resolve(undefined)
      tx.onabort = () => resolve(undefined)
    } catch {
      resolve(undefined) // intencional: banco fechado ou apagado por outra aba
    }
  }))
}

/** The queue survives a closed tab only when IndexedDB opens (private windows and blocked storage do not). */
export const offlineDbReady = () => open().then(db => db !== null)

// ---------- queue ----------

export const queuePut = (item: StoredRating) => run('queue', 'readwrite', s => s.put(item)).then(() => undefined)
export const queueDelete = (clientId: string) => run('queue', 'readwrite', s => s.delete(clientId)).then(() => undefined)

/** The account's ratings, oldest answer first (the order they must reach the server). */
export async function queueForUser(userId: string): Promise<StoredRating[]> {
  const rows = await run<StoredRating[]>('queue', 'readonly', s => s.index('user_id').getAll(userId))
  return (rows ?? []).sort((a, b) => a.reviewed_at.localeCompare(b.reviewed_at))
}

/** Ratings older than the server accepts (review.offline_max_days) are gone for good: drop them. */
export async function queuePurgeOlderThan(days: number): Promise<number> {
  const rows = await run<StoredRating[]>('queue', 'readonly', s => s.getAll())
  const limit = new Date(Date.now() - days * 86_400_000).toISOString()
  const old = (rows ?? []).filter(r => r.reviewed_at < limit)
  await Promise.all(old.map(r => queueDelete(r.client_id)))
  return old.length
}

// ---------- session ----------

export const sessionKey = (userId: string, query: string) => `${userId}|${query}`
export const sessionGet = (key: string) => run<StoredSession>('session', 'readonly', s => s.get(key))
export const sessionPut = (row: StoredSession) => run('session', 'readwrite', s => s.put(row)).then(() => undefined)

/** Marks a card as rated in every saved lot of the account (it may be in the default lot and in a caderno's). */
export async function sessionMarkRated(userId: string, cardId: string): Promise<void> {
  const rows = await run<StoredSession[]>('session', 'readonly', s => s.index('user_id').getAll(userId))
  await Promise.all((rows ?? [])
    .filter(r => !r.rated.includes(cardId) && r.res.data.some(c => (c as { id?: string }).id === cardId))
    .map(r => sessionPut({ ...r, rated: [...r.rated, cardId] })))
}

// ---------- meta ----------

export const metaGet = <T>(key: string) => run<{ key: string; value: T }>('meta', 'readonly', s => s.get(key)).then(r => r?.value)
export const metaPut = (key: string, value: unknown) => run('meta', 'readwrite', s => s.put({ key, value })).then(() => undefined)
export const metaDelete = (key: string) => run('meta', 'readwrite', s => s.delete(key)).then(() => undefined)

// ---------- account ----------

/** Logout (RF-F8, D11): the saved lot and the saved user go; the queue stays until the same account signs in again. */
export async function forgetAccountCache(userId: string): Promise<void> {
  const rows = await run<StoredSession[]>('session', 'readonly', s => s.index('user_id').getAll(userId))
  await Promise.all((rows ?? []).map(r => run('session', 'readwrite', s => s.delete(r.key))))
  await metaDelete(`user:${userId}`)
  if ((await metaGet<string>('user')) === userId) await metaDelete('user')
}

/** Account deletion: the whole database goes. */
export function deleteOfflineDb(): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve()
      void open().then((db) => {
        db?.close()
        opening = null
        const req = indexedDB.deleteDatabase(DB_NAME)
        req.onsuccess = req.onerror = req.onblocked = () => resolve()
      })
    } catch {
      resolve() // intencional: nada a apagar
    }
  })
}

/** Asks the browser to keep this storage (D13): once, when the 1st rating waits offline. */
export function askPersistentStorage(): void {
  try {
    void navigator.storage?.persist?.()
  } catch {
    // intencional: sem a API, o navegador decide sozinho
  }
}
