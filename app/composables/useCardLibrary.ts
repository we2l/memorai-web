import type { LibraryCard, LibraryPage } from '~/types'

/** Page of the library ("Carregar mais" of 50, RF-F11). */
export const LIBRARY_LIMIT = 50
/** The most cards a session by ids takes (scope=cards, F2). */
export const REVIEW_SELECTION_MAX = 100
/** The most cards POST /flashcards/move takes at once (prd-4b-caderno-v3 RF-B7). */
export const MOVE_SELECTION_MAX = 500

export type LibrarySort = 'due' | 'created' | 'lapses'
export type LibraryState = 'new' | 'learning' | 'due' | 'in_day' | 'suspended'

export const LIBRARY_STATES: { value: LibraryState; label: string }[] = [
  { value: 'new', label: 'Novos' },
  { value: 'learning', label: 'Aprendendo' },
  { value: 'due', label: 'Vencidos' },
  { value: 'in_day', label: 'Em dia' },
  // Paused in the review (prd-revisao-v5-fase-b RF-F8); the other states leave them out
  { value: 'suspended', label: 'Pausados' },
]

export const LIBRARY_SORTS: { value: LibrarySort; label: string }[] = [
  { value: 'due', label: 'Vencimento' },
  { value: 'created', label: 'Mais novos' },
  { value: 'lapses', label: 'Mais errados' },
]

/** Filters of the library, mirrored in the URL (?q=&state=&origin=&errors=1&leech=1&tag=&sort=). */
export interface LibraryFilters {
  q: string
  state: LibraryState[]
  /** '' (all) · note:<id> · document:<id> · quiz · loose */
  origin: string
  errors: boolean
  /** "Não estão colando": the leech mark of the API (prd-revisao-v5-fase-b RF-F8) */
  leech: boolean
  tag: string
  sort: LibrarySort
}

const ORIGIN_RE = /^(?:(?:note|document):[0-9a-f-]{36}|quiz|question|loose)$/i
const str = (v: unknown) => (typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : '')

/** The filters a URL asks for (unknown values dropped; the old ?source_note_id= is origin=note:). */
export function filtersFromQuery(query: Record<string, unknown>): LibraryFilters {
  const states = str(query.state).split(',').filter((s): s is LibraryState => LIBRARY_STATES.some(o => o.value === s))
  const sort = str(query.sort)
  let origin = str(query.origin)
  const legacy = str(query.source_note_id)
  if (!origin && legacy) origin = `note:${legacy}`
  return {
    q: str(query.q).trim(),
    state: [...new Set(states)],
    origin: ORIGIN_RE.test(origin) ? origin : '',
    errors: str(query.errors) === '1',
    leech: str(query.leech) === '1',
    tag: str(query.tag).trim(),
    sort: LIBRARY_SORTS.some(o => o.value === sort) ? sort as LibrarySort : 'due',
  }
}

/** The URL query of a set of filters (only what differs from the default). */
export function filtersToQuery(f: LibraryFilters): Record<string, string> {
  const out: Record<string, string> = {}
  if (f.q) out.q = f.q
  if (f.state.length) out.state = f.state.join(',')
  if (f.origin) out.origin = f.origin
  if (f.errors) out.errors = '1'
  if (f.leech) out.leech = '1'
  if (f.tag) out.tag = f.tag
  if (f.sort !== 'due') out.sort = f.sort
  return out
}

/** The query of GET /topics/{id}/flashcards (cursor mode). A 1-letter search is not sent (the API asks ≥ 2). */
export function libraryParams(f: LibraryFilters, cursor?: string | null, limit = LIBRARY_LIMIT): Record<string, string | number> {
  const out: Record<string, string | number> = { limit, sort: f.sort }
  if (cursor) out.cursor = cursor
  if (f.q.length >= 2) out.q = f.q
  if (f.state.length) out.state = f.state.join(',')
  if (f.origin) out.origin = f.origin
  if (f.errors) out.errors = 1
  if (f.leech) out.leech = 1
  if (f.tag) out.tag = f.tag
  return out
}

export function hasFilters(f: LibraryFilters): boolean {
  return !!(f.q || f.state.length || f.origin || f.errors || f.leech || f.tag)
}

/**
 * The card library of a scope (prd-4c-material-v3 RF-F9..F12, tasks 9.1): the filters live in the URL, the
 * list in pages of 50 by cursor ("Carregar mais"; `total` only on the 1st page), and a selection of ids
 * that reviews (≤ 100, scope=cards of the F2) or deletes (POST /flashcards/delete) many at once.
 */
export function useCardLibrary(topicId: Ref<string>) {
  const { $api } = useNuxtApp()
  const route = useRoute()
  const router = useRouter()

  const filters = computed(() => filtersFromQuery(route.query))
  const cards = shallowRef<LibraryCard[]>([])
  const total = ref<number | null>(null)
  const nextCursor = ref<string | null>(null)
  const loading = ref(false)
  const loadingMore = ref(false)
  const failed = ref(false)
  const selected = shallowRef<Set<string>>(new Set())
  let requestId = 0
  let anchor: string | null = null

  async function load() {
    const id = ++requestId
    loading.value = true
    failed.value = false
    try {
      const res = await $api<LibraryPage>(`/topics/${topicId.value}/flashcards`, { query: libraryParams(filters.value) })
      if (id !== requestId) return
      cards.value = res.data
      total.value = res.meta.total ?? res.data.length
      nextCursor.value = res.meta.next_cursor
      clearSelection()
    } catch (e) {
      if (id !== requestId) return
      failed.value = true
      reportApiError(e, { silent: true })
    } finally {
      if (id === requestId) loading.value = false
    }
  }

  /** The next 50; resolves with the number of new rows (the caller moves the focus to the first one). */
  async function loadMore(): Promise<number> {
    if (!nextCursor.value || loadingMore.value) return 0
    const id = requestId
    loadingMore.value = true
    try {
      const res = await $api<LibraryPage>(`/topics/${topicId.value}/flashcards`, { query: libraryParams(filters.value, nextCursor.value) })
      if (id !== requestId) return 0
      const known = new Set(cards.value.map(c => c.id))
      const fresh = res.data.filter(c => !known.has(c.id))
      cards.value = [...cards.value, ...fresh]
      nextCursor.value = res.meta.next_cursor
      return fresh.length
    } catch (e) {
      reportApiError(e, { error: 'Não foi possível carregar mais cards.' })
      return 0
    } finally {
      loadingMore.value = false
    }
  }

  // Query written but not in the route yet: two quick changes (a box, then the order) both survive
  let pendingQuery: Record<string, unknown> | null = null

  /** Writes the filters to the URL (the watcher reloads). */
  function setFilters(patch: Partial<LibraryFilters>) {
    const base = pendingQuery ?? route.query
    const next = { ...filtersFromQuery(base), ...patch }
    const { q: _q, state: _s, origin: _o, errors: _e, leech: _l, tag: _t, sort: _so, source_note_id: _legacy, ...rest } = base
    const query = { ...rest, ...filtersToQuery(next) }
    pendingQuery = query
    void router.replace({ query: query as Record<string, string> }).finally(() => { if (pendingQuery === query) pendingQuery = null })
  }

  function clearFilters() {
    setFilters({ q: '', state: [], origin: '', errors: false, leech: false, tag: '' })
  }

  // === Selection ===
  function setSelection(ids: Iterable<string>) {
    selected.value = new Set(ids)
  }
  function clearSelection() {
    anchor = null
    if (selected.value.size) selected.value = new Set()
  }
  function toggle(id: string, range = false) {
    const next = new Set(selected.value)
    if (range && anchor) {
      const ids = cards.value.map(c => c.id)
      const [a, b] = [ids.indexOf(anchor), ids.indexOf(id)].sort((x, y) => x - y)
      if (a !== -1 && b !== -1) {
        const on = !next.has(id) || next.has(anchor)
        for (const cid of ids.slice(a!, b! + 1)) on ? next.add(cid) : next.delete(cid)
        selected.value = next
        anchor = id
        return
      }
    }
    next.has(id) ? next.delete(id) : next.add(id)
    selected.value = next
    anchor = id
  }
  const allSelected = computed(() => cards.value.length > 0 && cards.value.every(c => selected.value.has(c.id)))
  function toggleAll() {
    setSelection(allSelected.value ? [] : cards.value.map(c => c.id))
  }

  /** "Revisar" of the selection: the session of those ids (≤ 100), null above that. */
  const reviewSelectionPath = computed(() => {
    const ids = [...selected.value]
    if (!ids.length || ids.length > REVIEW_SELECTION_MAX) return null
    return `/revisar?scope=cards&card_ids=${ids.join(',')}`
  })

  /** Deletes the selected cards (definitive); resolves with how many the API deleted. */
  async function deleteSelected(): Promise<number> {
    const ids = [...selected.value]
    if (!ids.length) return 0
    const res = await $api<{ deleted: number }>('/flashcards/delete', { method: 'POST', body: { card_ids: ids } })
    const gone = new Set(ids)
    cards.value = cards.value.filter(c => !gone.has(c.id))
    if (total.value !== null) total.value = Math.max(0, total.value - res.deleted)
    clearSelection()
    return res.deleted
  }

  function removeCard(id: string) {
    cards.value = cards.value.filter(c => c.id !== id)
    if (total.value !== null) total.value = Math.max(0, total.value - 1)
    if (selected.value.has(id)) {
      const next = new Set(selected.value)
      next.delete(id)
      selected.value = next
    }
  }

  function replaceCard(card: Partial<LibraryCard> & { id: string }) {
    cards.value = cards.value.map(c => (c.id === card.id ? { ...c, ...card } : c))
  }

  watch([topicId, () => JSON.stringify(libraryParams(filters.value))], () => { void load() })

  return {
    filters, cards, total, nextCursor, loading, loadingMore, failed, selected, allSelected, reviewSelectionPath,
    load, loadMore, setFilters, clearFilters, toggle, toggleAll, clearSelection, deleteSelected, removeCard, replaceCard,
  }
}
