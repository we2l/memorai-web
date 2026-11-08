import { getActivePinia, type Pinia, type StoreGeneric } from 'pinia'

/**
 * What this browser keeps of an account, and how it goes away when the account changes.
 *
 * The app is a SPA (ssr:false): a login or logout that only navigates keeps every Pinia store and every
 * module of the previous account in memory, and the next account saw its cadernos until a reload
 * (docs/licoes-aprendidas.md, 2026-11-08). So every change of account ends in a full page load
 * (`reloadTo`), and `clearAuth` also resets the stores in case some future flow navigates without it.
 */

/** Kept on account change: auth clears its own user (and `loaded` must stay true). */
const KEPT_STORES = new Set(['auth'])
/** Side effects stopped before a store's state goes: polling, timers, the audio element. */
const TEARDOWN = ['stopPolling', 'stopTimer', 'release'] as const

/**
 * `$reset()` on every store already created (a store never used holds nothing). Setup stores define their
 * own `$reset` (stores/document.ts, stores/scope.ts); tests/utils/accountState.test.ts checks every store.
 */
export function resetUserScopedState(pinia: Pinia | undefined = getActivePinia()) {
  if (!pinia) return
  const stores = (pinia as unknown as { _s: Map<string, StoreGeneric> })._s
  for (const [id, store] of stores) {
    if (KEPT_STORES.has(id)) continue
    for (const name of TEARDOWN) {
      const fn = (store as Record<string, unknown>)[name]
      if (typeof fn === 'function') fn.call(store)
    }
    store.$reset()
  }
}

/**
 * Browser storage that names content of an account (ids of caderno, nota, prova, episódio; text of drafts).
 * Removed on an explicit logout or account deletion; an involuntary 401 keeps it (the draft of the same
 * person's note must survive the new login). Device preferences stay: color-mode, baigi-auto-cards,
 * review-shortcut-tip, baigi-goal-celebrated-{dia}, the visitor's lote (baigi-guest-progress goes to the next account on purpose) and
 * baigi-pending-logout (its own flow, utils/pendingLogout.ts).
 *
 * | chave                                   | onde                        | o que guarda                    |
 * |-----------------------------------------|-----------------------------|---------------------------------|
 * | baigi:draft:{user}:{nota} (local)       | composables/useNoteDraft    | texto não salvo da nota         |
 * | baigi-card-workshop-{caderno} (session) | composables/useCardWorkshop | cards gerados na oficina        |
 * | baigi-add-last-topic (local)            | composables/useAddSheet     | último caderno do + Adicionar   |
 * | baigi-podcast-progress-pending (local)  | stores/player               | posição offline por episódio    |
 * | baigi-material-mode-{nota} (local)      | material/[noteId].vue       | leitura ou edição da nota       |
 * | baigi-exam-move-dismissed-{prova} (local) | exam/MoveOffer           | oferta de mover dispensada      |
 * | baigi-first-material-pending (local)    | utils/firstMaterial         | id da conta (analytics)         |
 * | baigi-scope-cleared (session)           | utils/scope                 | caderno zerado (confete)        |
 */
export const ACCOUNT_STORAGE_KEYS = ['baigi-add-last-topic', 'baigi-podcast-progress-pending', 'baigi-first-material-pending', 'baigi-scope-cleared'] as const
export const ACCOUNT_STORAGE_PREFIXES = ['baigi:draft:', 'baigi-card-workshop-', 'baigi-material-mode-', 'baigi-exam-move-dismissed-'] as const

function clearStorage(storage: Storage) {
  const doomed: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key && ((ACCOUNT_STORAGE_KEYS as readonly string[]).includes(key) || ACCOUNT_STORAGE_PREFIXES.some(p => key.startsWith(p)))) doomed.push(key)
  }
  for (const key of doomed) storage.removeItem(key)
}

/** Explicit logout or account deletion: the next person on this browser finds nothing of this account. */
export function clearAccountStorage() {
  if (!import.meta.client) return
  for (const get of [() => localStorage, () => sessionStorage]) {
    try {
      clearStorage(get())
    } catch {
      // intencional: sem storage (modo privado, bloqueado) não há nada guardado para apagar
    }
  }
}

/**
 * The account changed (login, logout, expired session): a full page load to `to`, so no memory of the
 * previous account survives. `replace` keeps the page left behind out of the history (logout, callback).
 */
export function reloadTo(to: string, { replace = false } = {}) {
  if (replace) window.location.replace(to)
  else window.location.assign(to)
}
