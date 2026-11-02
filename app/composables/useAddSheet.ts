/**
 * "+ Adicionar" of the shell (prd-navegacao-v3 RF-5). One sheet for the whole app: the TopNav, the page
 * header on the phone, Alt+N and the search open it. It writes into the open scope (the caderno of the
 * route) or asks which caderno, with the last one used as the default.
 *
 * The flows that need the caderno screen (PDF, photo, blank note) are handed to /cadernos as an
 * intent: the sheet picks the file inside the click (the browser only opens the file picker on a user
 * gesture), stores the intent and opens the caderno, which runs its existing flow and clears it.
 */
import type { LocationQuery } from 'vue-router'
import type { AddOpenOrigin } from '~/types/analytics'

export type AddKind = 'pdf' | 'text' | 'photo' | 'note' | 'anki'
/** Where the sheet was opened (analytics: add_opened.origin) */
export type AddOrigin = AddOpenOrigin

export interface AddIntent {
  kind: 'pdf' | 'photo' | 'note'
  topicId: string
  file?: File
}

const LAST_TOPIC_KEY = 'baigi-add-last-topic'

export function useAddSheet() {
  const open = useState('add-sheet-open', () => false)
  /** Opened straight on one option (Alt+N = blank note) */
  const preset = useState<AddKind | null>('add-sheet-preset', () => null)

  function show(origin: AddOrigin, kind: AddKind | null = null) {
    if (!useAuthStore().isAuthenticated) return
    preset.value = kind
    open.value = true
    useAnalytics().track('add_opened', { origin })
  }

  function close() {
    open.value = false
  }

  return { open, preset, show, close }
}

/** Intent handed from the sheet to /cadernos (consumed once by the caderno that matches). */
export function useAddIntent() {
  return useState<AddIntent | null>('add-intent', () => null)
}

/** The caderno (or subject) of the route: /cadernos?topic=, /revisar?topic_id=, /simulados?topic_id=. */
export function scopeTopicFromQuery(query: LocationQuery): string | null {
  for (const key of ['topic', 'topic_id']) {
    const v = query[key]
    if (typeof v === 'string' && v) return v
  }
  return null
}

export function lastAddTopic(): string | null {
  try {
    return localStorage.getItem(LAST_TOPIC_KEY)
  } catch {
    return null
  }
}

export function rememberAddTopic(id: string) {
  try {
    localStorage.setItem(LAST_TOPIC_KEY, id)
  } catch {
    // intencional: sem storage (modo privado) o padrão volta a ser o 1º caderno
  }
}
