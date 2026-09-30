/**
 * review_session_started / review_session_completed (prd-analytics-posthog §4.3) for /revisar.
 * Completed fires once per session, on the transition to finished with ≥ 1 card reviewed.
 */
import type { LocationQuery } from 'vue-router'
import type { ReviewMode, ReviewScope } from '~/types/analytics'

export function reviewModeOf(query: LocationQuery, survival: boolean): ReviewMode {
  if (query.mode === 'blitz') return 'blitz'
  if (query.errors_only === '1') return 'errors_only'
  if (query.backlog === '1') return 'backlog'
  return survival ? 'survival' : 'normal'
}

export function reviewScopeOf(query: LocationQuery): ReviewScope {
  if (query.topic_id) return 'topic'
  if (query.deck_id) return 'deck'
  return 'none'
}

export function useReviewSessionAnalytics() {
  const { track } = useAnalytics()
  let startedAt = 0
  let mode: ReviewMode = 'normal'
  let completedSent = false

  function started(query: LocationQuery, survival: boolean, cardsAvailable: number) {
    if (cardsAvailable < 1) return
    startedAt = Date.now()
    mode = reviewModeOf(query, survival)
    completedSent = false
    track('review_session_started', { mode, scoped: reviewScopeOf(query), cards_available: cardsAvailable })
  }

  /** @param ratings count per rating (1 = Errei) of the finished session */
  function completed(ratings: Record<1 | 2 | 3 | 4, number>) {
    if (completedSent || !startedAt) return
    const cards = ratings[1] + ratings[2] + ratings[3] + ratings[4]
    if (cards < 1) return
    completedSent = true
    track('review_session_completed', {
      cards,
      duration_s: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
      mode,
      again_rate: Math.round((ratings[1] / cards) * 100) / 100,
    })
  }

  return { started, completed }
}
