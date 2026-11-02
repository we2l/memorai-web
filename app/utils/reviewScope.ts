/**
 * Slices of the review session (prd-caderno-f2-recorte RF-F1): build the /revisar URL of a scope, read it
 * back from the query and know where the end of the session goes back to. Kept apart from utils/scope.ts,
 * which the entry chunk loads (search, "+ Adicionar"): only the screens that open a session pay for this.
 */
import { cadernoPath } from '~/utils/scope'

/** Kinds of review scope the API knows (prd-caderno-f2-recorte RF-B1). */
export type ScopeType = 'topic' | 'document' | 'note' | 'quiz' | 'podcast'

/**
 * A slice of the review session: a caderno/subject (its subtree), a PDF, a note, the cards of a quiz's
 * errors, of an episode, or an explicit list of card ids (≤ 100).
 */
export type ReviewScope = { type: ScopeType; id: string } | { type: 'cards'; ids: string[] }

export interface ReviewPathOptions {
  errorsOnly?: boolean
  /** "Praticar adiantado": every card of a container scope, by due date */
  ahead?: boolean
  /** Only with a topic: cards born from quiz errors, or loose cards */
  origin?: 'quiz' | 'loose'
}

/** The scope as the API describes it in GET /review/session (RF-B5). */
export interface SessionScopeInfo {
  type: ScopeType | 'cards'
  id: string | null
  label: string
  topic: { id: string; name: string } | null
  origin?: 'quiz' | 'loose' | null
}

/** Query of a scope for /review/session and /review/session-count (without the leading "?"). */
export function scopeQuery(scope?: string | ReviewScope | null, opts: ReviewPathOptions = {}): string {
  const params = new URLSearchParams()
  if (typeof scope === 'string') {
    if (scope) params.set('topic_id', scope)
  } else if (scope?.type === 'cards') {
    params.set('scope', 'cards')
    params.set('card_ids', scope.ids.join(','))
  } else if (scope) {
    params.set('scope', `${scope.type}:${scope.id}`)
  }
  if (opts.origin) params.set('origin', opts.origin)
  if (opts.ahead) params.set('ahead', '1')
  if (opts.errorsOnly) params.set('errors_only', '1')
  // ":" and "," are valid in a query: keep the URL readable (scope=document:<id>, card_ids=a,b)
  return params.toString().replace(/%3A/gi, ':').replace(/%2C/gi, ',')
}

/**
 * The review session of a scope. A bare id is a caderno or subject (the whole subtree on the API side,
 * `topic_id=`, as since F1); an object is any slice of the F2 (`scope=type:id`, `scope=cards&card_ids=`).
 */
export function reviewPath(scope?: string | ReviewScope | null, opts: ReviewPathOptions = {}): string {
  const query = scopeQuery(scope, opts)
  return query ? `/revisar?${query}` : '/revisar'
}

/**
 * Where "Voltar a {label}" leads after a scoped session (RF-F1): the caderno, the caderno with the note,
 * the quiz result or the episodes; null for a list of ids (the caller goes back in history, or /hoje).
 */
export function scopeBackPath(scope: SessionScopeInfo | null | undefined): string | null {
  if (!scope?.id) return null
  switch (scope.type) {
    case 'topic': return cadernoPath(scope.id)
    case 'document': return cadernoPath(scope.topic?.id)
    case 'note': return cadernoPath(scope.topic?.id, { note: scope.id })
    case 'quiz': return `/simulados/${scope.id}/resultado`
    case 'podcast': return '/podcasts'
    default: return null
  }
}

/** The same slice of the session as a ReviewScope (to reopen it, e.g. "Reforçar erros"). */
export function scopeOf(info: SessionScopeInfo | null | undefined, cardIds: string[] = []): ReviewScope | null {
  if (!info) return null
  if (info.type === 'cards') return cardIds.length ? { type: 'cards', ids: cardIds } : null
  return info.id ? { type: info.type, id: info.id } : null
}

const SCOPE_RE = /^(topic|document|note|quiz|podcast):([0-9a-f-]{36})$/i

/** The slice asked in the /revisar URL (`topic_id=`, `scope=`, `card_ids=`, `origin=`, `ahead=`, `errors_only=`). */
export function sessionScopeFromQuery(query: Record<string, unknown>): {
  topicId?: string
  scope?: ReviewScope
  origin?: 'quiz' | 'loose'
  ahead?: boolean
  errorsOnly?: boolean
} {
  const str = (v: unknown) => (typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : '')
  const out: ReturnType<typeof sessionScopeFromQuery> = {}
  const raw = str(query.scope)
  const m = raw.match(SCOPE_RE)
  if (m) out.scope = { type: m[1]!.toLowerCase() as ScopeType, id: m[2]! }
  else if (raw === 'cards') {
    const ids = str(query.card_ids).split(',').map(x => x.trim()).filter(Boolean)
    if (ids.length) out.scope = { type: 'cards', ids }
  }
  const topicId = str(query.topic_id)
  if (topicId && !out.scope) out.topicId = topicId
  const origin = str(query.origin)
  if (origin === 'quiz' || origin === 'loose') out.origin = origin
  if (str(query.ahead) === '1') out.ahead = true
  if (str(query.errors_only) === '1') out.errorsOnly = true
  return out
}
