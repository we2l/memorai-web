import { defineStore } from 'pinia'
import type { Document, MaterialRow, MaterialsPage, MaterialStatus, ScopeSummary } from '~/types'

/** Page size of the material list (RF-B2: 30 rows ≈ 12 KB raw, 2,5 KB gzip). */
export const MATERIALS_LIMIT = 30

export type MaterialSort = 'recent' | 'name'

export interface MaterialQuery {
  q: string
  sort: MaterialSort
  /** A matéria or assunto inside the scope; '' = the whole scope */
  subjectId: string
}

const EMPTY_QUERY: MaterialQuery = { q: '', sort: 'recent', subjectId: '' }

/** State of a PDF row, from GET /documents/{id} (the same rule as the API's MaterialService::documentStatus). */
export function documentRowStatus(doc: Pick<Document, 'status' | 'note_generation_status'> & { has_generated_note?: boolean }): MaterialStatus {
  if (doc.status === 'failed' || doc.note_generation_status === 'failed') return 'failed'
  if (doc.note_generation_status === 'generating') return doc.status === 'completed' ? 'generating' : 'processing'
  if (doc.status === 'processing') return 'processing'
  if (!doc.note_generation_status && !doc.has_generated_note) return 'blocked'
  return 'ready'
}

/**
 * The open scope of the Caderno hub (prd-4b-caderno-v3 §3.2, tasks 6.3): GET /topics/{id}/summary and the
 * pages of GET /topics/{id}/materials (cursor, q, sort, subject_id). The hub never loads note content or
 * card lists (§6 rule 6). Coming back to a scope shows what was loaded and refreshes it in the background.
 * Each block keeps its own error (RF-F12).
 */
export const useScopeStore = defineStore('scope', () => {
  const topicId = ref<string | null>(null)
  const summary = shallowRef<ScopeSummary | null>(null)
  const summaryLoading = ref(false)
  const summaryError = ref<unknown>(null)
  /** 404 of the summary: the caderno does not exist (or is someone else's) */
  const notFound = ref(false)

  const materials = ref<MaterialRow[]>([])
  const nextCursor = ref<string | null>(null)
  const total = ref(0)
  const query = ref<MaterialQuery>({ ...EMPTY_QUERY })
  const materialsLoading = ref(false)
  const loadingMore = ref(false)
  const materialsError = ref<unknown>(null)
  /** The first page of the current query arrived at least once */
  const materialsLoaded = ref(false)

  let summarySeq = 0
  let materialsSeq = 0

  const hasMore = computed(() => !!nextCursor.value)

  function materialsUrl(id: string, cursor?: string | null): string {
    const params = new URLSearchParams({ limit: String(MATERIALS_LIMIT) })
    const q = query.value.q.trim()
    if (q.length >= 2) params.set('q', q)
    if (query.value.sort !== 'recent') params.set('sort', query.value.sort)
    if (query.value.subjectId) params.set('subject_id', query.value.subjectId)
    if (cursor) params.set('cursor', cursor)
    return `/topics/${id}/materials?${params}`
  }

  async function fetchSummary(id = topicId.value) {
    if (!id) return
    const n = ++summarySeq
    summaryLoading.value = true
    summaryError.value = null
    try {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: ScopeSummary }>(`/topics/${id}/summary`)
      if (n !== summarySeq) return
      summary.value = res.data
      notFound.value = false
    } catch (e) {
      if (n !== summarySeq) return
      if (getErrorStatus(e) === 404) notFound.value = true
      else summaryError.value = e
      reportApiError(e, { silent: true })
    } finally {
      if (n === summarySeq) summaryLoading.value = false
    }
  }

  /** First page of the current query (replaces the list). */
  async function fetchMaterials(id = topicId.value) {
    if (!id) return
    const n = ++materialsSeq
    materialsLoading.value = true
    loadingMore.value = false
    materialsError.value = null
    try {
      const { $api } = useNuxtApp()
      const res = await $api<MaterialsPage>(materialsUrl(id))
      if (n !== materialsSeq) return
      materials.value = res.data
      nextCursor.value = res.meta.next_cursor
      total.value = res.meta.total
      materialsLoaded.value = true
    } catch (e) {
      if (n !== materialsSeq) return
      materialsError.value = e
      reportApiError(e, { silent: true })
    } finally {
      if (n === materialsSeq) materialsLoading.value = false
    }
  }

  /**
   * Opens a scope: the summary and the 1st page of materials in parallel. The same scope again keeps what
   * is on screen while both come again; another scope starts clean (its own query too).
   */
  function open(id: string) {
    if (topicId.value !== id) {
      topicId.value = id
      summary.value = null
      notFound.value = false
      materials.value = []
      nextCursor.value = null
      total.value = 0
      materialsLoaded.value = false
      query.value = { ...EMPTY_QUERY }
    }
    return Promise.all([fetchSummary(id), fetchMaterials(id)])
  }

  /** Search, order or matéria changed: the list starts over from the first page. */
  function setQuery(patch: Partial<MaterialQuery>) {
    query.value = { ...query.value, ...patch }
    return fetchMaterials()
  }

  /** "Carregar mais": the next page appended; resolves with how many rows came. */
  async function loadMore(): Promise<number> {
    const id = topicId.value
    if (!id || !nextCursor.value || loadingMore.value) return 0
    const n = materialsSeq
    loadingMore.value = true
    try {
      const { $api } = useNuxtApp()
      const res = await $api<MaterialsPage>(materialsUrl(id, nextCursor.value))
      if (n !== materialsSeq) return 0
      const known = new Set(materials.value.map(r => `${r.kind}:${r.id}`))
      const fresh = res.data.filter(r => !known.has(`${r.kind}:${r.id}`))
      materials.value = [...materials.value, ...fresh]
      nextCursor.value = res.meta.next_cursor
      total.value = res.meta.total
      return fresh.length
    } catch (e) {
      if (n === materialsSeq) reportApiError(e, { error: 'Não foi possível carregar mais materiais.' })
      return 0
    } finally {
      if (n === materialsSeq) loadingMore.value = false
    }
  }

  /** Patch of one row (a PDF generating updates only its own line, G4). */
  function patchRow(kind: MaterialRow['kind'], id: string, patch: Partial<MaterialRow>) {
    const i = materials.value.findIndex(r => r.kind === kind && r.id === id)
    if (i !== -1) materials.value[i] = { ...materials.value[i]!, ...patch }
  }

  /** A PDF row from GET /documents/{id}; returns its status. */
  function applyDocument(doc: Document): MaterialStatus {
    const status = documentRowStatus(doc)
    patchRow('pdf', doc.id, {
      status,
      progress: status === 'generating' ? { done: doc.note_generation_progress ?? 0, total: doc.note_total_batches ?? 0 } : null,
      auto_cards_status: doc.auto_cards_status ?? null,
      ...(doc.note_id ? { note_id: doc.note_id } : {}),
      ...(doc.pages_count ? { pages: doc.pages_count } : {}),
    })
    return status
  }

  /**
   * The fresh line of one material (the PDF finished, its cards came): asks the first page of the current
   * query again and replaces only that row. Rows already shown keep their place.
   */
  async function refreshRow(kind: MaterialRow['kind'], id: string) {
    const scope = topicId.value
    if (!scope) return
    try {
      const { $api } = useNuxtApp()
      const res = await $api<MaterialsPage>(materialsUrl(scope))
      if (topicId.value !== scope) return
      const row = res.data.find(r => r.kind === kind && r.id === id)
      if (row) patchRow(kind, id, row)
    } catch (e) {
      reportApiError(e, { silent: true })
    }
  }

  /** A material just added in this scope: on top of the list, with its state (RF-F10). */
  function prependRow(row: MaterialRow) {
    materials.value = [row, ...materials.value.filter(r => !(r.kind === row.kind && r.id === row.id))]
    total.value += 1
  }

  function removeRow(kind: MaterialRow['kind'], id: string) {
    const before = materials.value.length
    materials.value = materials.value.filter(r => !(r.kind === kind && r.id === id))
    if (materials.value.length < before) total.value = Math.max(0, total.value - 1)
  }

  /** Everything this scope shows may have changed (cards created, a note saved elsewhere): both again. */
  function refresh() {
    if (!topicId.value) return Promise.resolve()
    return Promise.all([fetchSummary(), fetchMaterials()])
  }

  function reset() {
    summarySeq++
    materialsSeq++
    topicId.value = null
    summary.value = null
    notFound.value = false
    summaryError.value = null
    summaryLoading.value = false
    materials.value = []
    nextCursor.value = null
    total.value = 0
    query.value = { ...EMPTY_QUERY }
    materialsLoading.value = false
    loadingMore.value = false
    materialsError.value = null
    materialsLoaded.value = false
  }

  return {
    topicId, summary, summaryLoading, summaryError, notFound,
    materials, nextCursor, total, query, materialsLoading, loadingMore, materialsError, materialsLoaded, hasMore,
    open, fetchSummary, fetchMaterials, setQuery, loadMore, patchRow, applyDocument, refreshRow, prependRow, removeRow, refresh, reset,
  }
})
