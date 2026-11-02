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

/** The caderno hub, optionally with a note open or a tab. */
export function cadernoPath(topicId?: string | null, extra: { note?: string; tab?: 'cards' } = {}): string {
  if (!topicId) return '/cadernos'
  const params = new URLSearchParams({ topic: topicId })
  if (extra.note) params.set('note', extra.note)
  if (extra.tab) params.set('tab', extra.tab)
  return `/cadernos?${params}`
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
