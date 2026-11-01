/**
 * Local draft of a note's unsaved edits (prd-correcoes-experiencia RF-F8): survives a failed
 * autosave, a closed tab and an expired session. One entry per user and note in localStorage
 * (`baigi:draft:{userId}:{noteId}` → {content, title, savedAt}), expiring after 7 days.
 * Writes are debounced (no JSON.stringify per keystroke) and every storage access is guarded:
 * without localStorage (private mode, quota) the draft simply does not exist.
 */
export interface NoteDraft {
  content: Record<string, any> | null
  title: string
  savedAt: number
}

const PREFIX = 'baigi:draft:'
const TTL_MS = 7 * 24 * 60 * 60 * 1000
const DEBOUNCE_MS = 300

export function useNoteDraft() {
  const auth = useAuthStore()
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: { key: string; draft: Omit<NoteDraft, 'savedAt'> } | null = null

  const keyOf = (noteId: string) => (auth.user ? `${PREFIX}${auth.user.id}:${noteId}` : null)

  function write(key: string, draft: Omit<NoteDraft, 'savedAt'>) {
    try {
      localStorage.setItem(key, JSON.stringify({ ...draft, savedAt: Date.now() }))
    } catch {
      // intencional: sem localStorage (modo privado, cota cheia) o rascunho só não existe
    }
  }

  /** Writes the pending draft now (before switching notes or leaving the page). */
  function flush() {
    if (timer) clearTimeout(timer)
    timer = null
    const p = pending
    pending = null
    if (p) write(p.key, p.draft)
  }

  /** Schedules the draft of a note; the key is fixed now (a 401 clears the user right after). */
  function save(noteId: string, draft: Omit<NoteDraft, 'savedAt'>) {
    const key = keyOf(noteId)
    if (!key) return
    if (pending && pending.key !== key) flush()
    pending = { key, draft }
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, DEBOUNCE_MS)
  }

  function read(noteId: string): NoteDraft | null {
    const key = keyOf(noteId)
    if (!key) return null
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      const draft = JSON.parse(raw) as NoteDraft
      if (typeof draft?.savedAt !== 'number' || Date.now() - draft.savedAt > TTL_MS) {
        localStorage.removeItem(key)
        return null
      }
      return draft
    } catch {
      // intencional: rascunho ilegível ou sem localStorage equivale a não ter rascunho
      return null
    }
  }

  function clear(noteId: string) {
    const key = keyOf(noteId)
    if (!key) return
    if (pending?.key === key) {
      if (timer) clearTimeout(timer)
      timer = null
      pending = null
    }
    try {
      localStorage.removeItem(key)
    } catch {
      // intencional: sem localStorage não há rascunho para apagar
    }
  }

  /** Drops expired or unreadable drafts of any user (bounded storage). */
  function prune() {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (!key?.startsWith(PREFIX)) continue
        let savedAt = 0
        try { savedAt = JSON.parse(localStorage.getItem(key) ?? '')?.savedAt ?? 0 } catch { /* intencional: ilegível = expirado */ }
        if (Date.now() - savedAt > TTL_MS) localStorage.removeItem(key)
      }
    } catch {
      // intencional: sem localStorage não há o que limpar
    }
  }

  return { save, flush, read, clear, prune }
}
