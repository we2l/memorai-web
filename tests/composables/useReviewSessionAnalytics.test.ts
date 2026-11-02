import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { reviewModeOf, reviewScopeOf, reviewSliceOf, useReviewSessionAnalytics } from '~/composables/useReviewSessionAnalytics'

const { track } = vi.hoisted(() => ({ track: vi.fn() }))
mockNuxtImport('useAnalytics', () => () => ({ track, identify: vi.fn(), reset: vi.fn() }))

describe('analytics da sessão de revisão (/revisar)', () => {
  beforeEach(() => {
    track.mockClear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-28T19:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('mode e scoped vêm da query', () => {
    expect(reviewModeOf({ mode: 'blitz' }, false)).toBe('blitz')
    expect(reviewModeOf({ errors_only: '1' }, false)).toBe('errors_only')
    expect(reviewModeOf({ backlog: '1' }, false)).toBe('backlog')
    expect(reviewModeOf({}, true)).toBe('survival')
    expect(reviewModeOf({}, false)).toBe('normal')
    expect(reviewScopeOf({ topic_id: 'x' })).toBe('topic')
    expect(reviewScopeOf({ deck_id: 'x' })).toBe('deck')
    expect(reviewScopeOf({})).toBe('none')
  })

  it('recorte da F2: scope_type, origin, ahead e errors_only (RF-F7)', () => {
    const id = '01a19af3-922b-70c5-89fb-feaa0e12085d'
    expect(reviewSliceOf({ scope: `document:${id}`, ahead: '1' })).toEqual({ scope_type: 'document', origin: null, ahead: true, errors_only: false })
    expect(reviewSliceOf({ scope: `topic:${id}`, origin: 'quiz', errors_only: '1' })).toEqual({ scope_type: 'topic', origin: 'quiz', ahead: false, errors_only: true })
    expect(reviewSliceOf({ scope: 'cards', card_ids: 'a,b' }).scope_type).toBe('cards')
    expect(reviewSliceOf({}).scope_type).toBeNull()
    expect(reviewScopeOf({ scope: `topic:${id}` })).toBe('topic')
  })

  it('started com cards; completed 1× com duration_s e again_rate', () => {
    const s = useReviewSessionAnalytics()
    s.started({ mode: 'blitz', topic_id: 't' }, false, 12)
    expect(track).toHaveBeenCalledWith('review_session_started', { mode: 'blitz', scoped: 'topic', cards_available: 12, scope_type: 'topic', origin: null, ahead: false, errors_only: false })

    vi.setSystemTime(new Date('2026-09-28T19:03:05Z'))
    s.completed({ 1: 3, 2: 1, 3: 5, 4: 1 })
    s.completed({ 1: 3, 2: 1, 3: 5, 4: 1 })

    const calls = track.mock.calls.filter(c => c[0] === 'review_session_completed')
    expect(calls).toHaveLength(1)
    expect(calls[0][1]).toEqual({ cards: 10, duration_s: 185, mode: 'blitz', again_rate: 0.3 })
  })

  it('sessão vazia não emite nada', () => {
    const s = useReviewSessionAnalytics()
    s.started({}, false, 0)
    s.completed({ 1: 0, 2: 0, 3: 0, 4: 0 })
    expect(track).not.toHaveBeenCalled()
  })
})
