/**
 * "Este caderno" = the topic and its whole subtree (prd-caderno-f1-pontes D1). Helpers that keep the
 * scope when one area hands the person to another: the caderno, its review session, and the tree.
 */

/** Subjects can be created down to 2 levels below the caderno (matéria → assunto; RF-F6, ADR-027). */
export const MAX_SUBTOPIC_DEPTH = 2

/** Tree depth: 0 = caderno (root). A topic at `depth` may get a child while the child stays within the limit. */
export function canAddSubtopic(depth: number): boolean {
  return depth < MAX_SUBTOPIC_DEPTH
}

/** Views of a scope that live on their own route (prd-4b-caderno-v3 §3.2): the card library and the map. */
export type ScopeView = 'cards' | 'mapa'

export interface CadernoPathExtra {
  /** Material open (`/cadernos/{id}/material/{note}`) */
  note?: string | null
  view?: ScopeView
  /** Only on the card library: the cards that came from one note or PDF ("Ver e editar cards") */
  sourceNoteId?: string | null
}

/**
 * Routes of a scope (caderno, matéria or assunto; prd-4b-caderno-v3 RF-F1): the hub `/cadernos/{id}`,
 * the material `/cadernos/{id}/material/{note}`, the library `/cadernos/{id}/cards` and the map
 * `/cadernos/{id}/mapa`. Without a topic, the list of cadernos.
 */
export function cadernoPath(topicId?: string | null, extra: CadernoPathExtra = {}): string {
  if (!topicId) return '/cadernos'
  const base = `/cadernos/${encodeURIComponent(topicId)}`
  if (extra.note) return `${base}/material/${encodeURIComponent(extra.note)}`
  if (extra.view === 'cards') return extra.sourceNoteId ? `${base}/cards?source_note_id=${encodeURIComponent(extra.sourceNoteId)}` : `${base}/cards`
  if (extra.view === 'mapa') return `${base}/mapa`
  return base
}

/** The material of a scope (a note, or the first part of a PDF). */
export function materialPath(topicId: string, noteId: string): string {
  return cadernoPath(topicId, { note: noteId })
}

/**
 * Where an old `/cadernos?topic=…` URL lands (favorites, e-mails, pending actions of the API):
 * `?topic=X` → hub, `&note=Y` → material, `&tab=cards` (with `highlight`) → library, `&tab=map` → map.
 * Null when the query has no caderno (the list stays).
 */
export function legacyCadernoRedirect(query: Record<string, unknown>): string | null {
  const str = (v: unknown) => (typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : '')
  const topic = str(query.topic)
  if (!topic) return null
  const note = str(query.note)
  if (note) return cadernoPath(topic, { note })
  const tab = str(query.tab)
  if (tab === 'map') return cadernoPath(topic, { view: 'mapa' })
  if (tab === 'cards' || str(query.highlight)) {
    const highlight = str(query.highlight)
    return cadernoPath(topic, { view: 'cards' }) + (highlight ? `?highlight=${encodeURIComponent(highlight)}` : '')
  }
  return cadernoPath(topic)
}

/** The scope a route is in: `/cadernos/{id}` and its material/cards/map routes, or `?topic_id=` (revisão, simulados). */
export function scopeTopicOfRoute(route: { path: string; params: Record<string, unknown>; query: Record<string, unknown> }): string | null {
  if (route.path.startsWith('/cadernos/') && typeof route.params.id === 'string' && route.params.id) return route.params.id
  for (const key of ['topic_id', 'topic']) {
    const v = route.query[key]
    if (typeof v === 'string' && v) return v
  }
  return null
}

interface NamedTopic { id: string; name: string; parent_id?: string | null }

/**
 * Root caderno an Anki import wrote to (N4). The job turns each root deck "A::B" into the root topic
 * "A" (underscores read as spaces) and reuses a root of the same name; the status has no topic id.
 */
export function findImportedRoot<T extends NamedTopic>(roots: T[], deckNames: string[]): T | null {
  const norm = (s: string) => s.replace(/_/g, ' ').trim().toLocaleLowerCase('pt-BR')
  for (const deck of deckNames) {
    const rootName = norm(deck.split('::')[0] ?? '')
    if (!rootName) continue
    const hit = roots.find(t => !t.parent_id && norm(t.name) === rootName)
    if (hit) return hit
  }
  return null
}

// The celebration of a caderno that the person's own session emptied (05/#11): /revisar marks the
// scope when the session ends with nothing pending; the caderno consumes the mark once.
const CLEARED_KEY = 'baigi-scope-cleared'

export function markScopeCleared(topicId: string) {
  try {
    sessionStorage.setItem(CLEARED_KEY, topicId)
  } catch {
    // intencional: private mode without storage means no celebration, nothing else changes
  }
}

/** True once, for the caderno whose session the person just finished with nothing left. */
export function consumeScopeCleared(topicId: string): boolean {
  try {
    if (sessionStorage.getItem(CLEARED_KEY) !== topicId) return false
    sessionStorage.removeItem(CLEARED_KEY)
    return true
  } catch {
    return false
  }
}

/** 3 batches of the job make a part (PARTS_BATCHES on the API), unless it closes early at 60 thousand characters. */
const PART_BATCHES = 3

/**
 * Progress of the PDF job while it writes (prd-4c-material-v3 4c-2), on the hub's line and on the material:
 * "Escrevendo a parte 2 de 6 · lote 5 de 18", an estimate; the sumário shows the real parts as each one opens.
 * A PDF of one part (up to 3 batches) has only the batches. `done` = batches already written.
 */
export function partProgressText(done: number, total: number): string {
  const current = Math.min(total, Math.max(0, done) + 1)
  if (total <= PART_BATCHES) return `Escrevendo a nota · lote ${current} de ${total}`
  return `Escrevendo a parte ${Math.ceil(current / PART_BATCHES)} de ${Math.ceil(total / PART_BATCHES)} · lote ${current} de ${total}`
}
