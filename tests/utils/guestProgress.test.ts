import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  clearGuestProgress, growthText, guestSummary, loadGuestProgress, nextGuestCard,
  pendingGuestProgress, returnText, saveGuestProgress, GUEST_STORAGE_KEY,
} from '~/utils/guestProgress'
import { guestExamSkipped, guestExamSkippedText, guestImportBody, guestImportFailure } from '~/utils/guestImport'

const INTERVALS = { again: '1min', hard: '1min', good: '10min', easy: '8d' }
const CARDS = [0, 1, 2]

describe('guestProgress: the lote queue', () => {
  it('shows every card once, in order', () => {
    expect(nextGuestCard(CARDS, [])).toBe(0)
    expect(nextGuestCard(CARDS, [{ index: 0, rating: 3 }])).toBe(1)
  })

  it('brings "De novo" and "Difícil" back at the end, the oldest first, at most 3 shows', () => {
    const r = [{ index: 0, rating: 1 }, { index: 1, rating: 2 }, { index: 2, rating: 3 }] as const
    expect(nextGuestCard(CARDS, [...r])).toBe(0)
    expect(nextGuestCard(CARDS, [...r, { index: 0, rating: 3 }])).toBe(1)
    expect(nextGuestCard(CARDS, [...r, { index: 0, rating: 3 }, { index: 1, rating: 4 }])).toBeNull()
    const stubborn = [{ index: 0, rating: 1 }, { index: 1, rating: 3 }, { index: 2, rating: 3 }, { index: 0, rating: 1 }, { index: 0, rating: 1 }] as const
    expect(nextGuestCard(CARDS, [...stubborn])).toBeNull()
  })
})

describe('guestProgress: the result', () => {
  it('counts the first answer and the second chance, and groups the agenda by return', () => {
    const s = guestSummary([
      { index: 0, rating: 1 }, { index: 1, rating: 3 }, { index: 2, rating: 4 }, { index: 0, rating: 3 },
    ], INTERVALS)
    expect(s).toMatchObject({ total: 3, remembered: 2, repeated: 1, rememberedOnRepeat: 1 })
    expect(s.agenda).toEqual([{ label: '10min', count: 2 }, { label: '8d', count: 1 }])
    expect(s.returns).toEqual({ 0: '10min', 1: '10min', 2: '8d' })
  })

  it('binary lote of the sample (no learning steps): "Lembrei" in 2 days, the relearned card tomorrow (prd-revisao-v5-fase-a)', () => {
    const SAMPLE = { again: '1d', hard: '1d', good: '2d', easy: '8d' }
    const s = guestSummary([
      { index: 0, rating: 3 }, { index: 1, rating: 1 }, { index: 2, rating: 3 }, { index: 1, rating: 3 },
    ], SAMPLE, '1d')
    expect(s).toMatchObject({ total: 3, remembered: 2, repeated: 1, rememberedOnRepeat: 1 })
    expect(s.agenda).toEqual([{ label: '1d', count: 1 }, { label: '2d', count: 2 }])
    expect(s.returns).toEqual({ 0: '2d', 1: '1d', 2: '2d' })
  })

  it('writes the API labels in Portuguese', () => {
    expect(returnText('10min')).toBe('em 10 min')
    expect(returnText('1d')).toBe('amanhã')
    expect(returnText('8d')).toBe('em 8 dias')
    expect(returnText('1.5m')).toBe('em 45 dias')
    expect(growthText('10min', [2, 11, 46, 163])).toBe('10 min, 2 dias, 11 dias, 46 dias e 5 meses')
  })

})

describe('guestProgress: storage', () => {
  // Node 25 brings a localStorage of its own without methods: a Map stands in (as in staleState.test.ts)
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) })
  })

  it('keeps a finished lote until the account takes it', () => {
    saveGuestProgress({ v: 1, area: 'oab', version: 'v', reviews: [{ index: 0, rating: 3, reviewed_at: 'x' }], done: false })
    expect(pendingGuestProgress()).toBeNull()
    saveGuestProgress({ v: 1, area: 'oab', version: 'v', reviews: [{ index: 0, rating: 3, reviewed_at: 'x' }], done: true })
    expect(pendingGuestProgress()?.area).toBe('oab')
    clearGuestProgress()
    expect(loadGuestProgress()).toBeNull()
  })

  it('ignores what it does not recognize', () => {
    localStorage.setItem(GUEST_STORAGE_KEY, '{"v":2}')
    expect(loadGuestProgress()).toBeNull()
    localStorage.setItem(GUEST_STORAGE_KEY, 'nope')
    expect(loadGuestProgress()).toBeNull()
  })
})

describe('landing: the call of each area', () => {
  it('starts the mini-lote of the area, or the choice for medicina e faculdade', async () => {
    const { areaStartPath } = await import('~/utils/landing')
    expect(areaStartPath('idiomas')).toBe('/comecar/ingles?from=landing')
    expect(areaStartPath('oab')).toBe('/comecar/oab?from=landing')
    expect(areaStartPath('faculdade')).toBe('/comecar')
  })
})

describe('guestProgress: POST /onboarding/guest (QA M2)', () => {
  const lote = { v: 1 as const, area: 'oab' as const, version: 'v', reviews: [{ index: 0, rating: 3 as const, reviewed_at: 'x' }], done: true, goal_batches: 2 as const }
  // 11/11 01:00 in Brasília is still 11/11 there (04:00 UTC)
  const now = new Date('2026-11-11T04:00:00Z')

  it('sends a future exam date and the goal', () => {
    expect(guestImportBody({ ...lote, exam_date: '2026-11-12' }, { now })).toEqual({
      body: { area: 'oab', version: 'v', reviews: lote.reviews, daily_goal_batches: 2, exam_date: '2026-11-12' },
      examDropped: false,
    })
  })

  it('leaves out an exam date that is today or past in Brasília, and says so', () => {
    for (const exam_date of ['2026-11-11', '2026-11-10', 'nope']) {
      const { body, examDropped } = guestImportBody({ ...lote, exam_date }, { now })
      expect(body.exam_date).toBeUndefined()
      expect(examDropped).toBe(true)
    }
  })

  it('uses the study day of Brasília, not UTC', () => {
    // 10/11 22:00 in Brasília = 11/11 01:00 UTC: an exam on 11/11 is still tomorrow
    expect(guestImportBody({ ...lote, exam_date: '2026-11-11' }, { now: new Date('2026-11-11T01:00:00Z') }).body.exam_date).toBe('2026-11-11')
  })

  it('without an exam, nothing is dropped; withoutExam drops it on purpose', () => {
    expect(guestImportBody({ ...lote, exam_date: null }, { now }).examDropped).toBe(false)
    expect(guestImportBody(lote, { now }).examDropped).toBe(false)
    expect(guestImportBody({ ...lote, exam_date: '2027-01-01' }, { now, withoutExam: true })).toMatchObject({ examDropped: true })
  })

  it('tells a data error from a network one', () => {
    const err = (status?: number, errors?: Record<string, string[]>) => ({ response: { status }, data: errors ? { errors } : undefined })
    expect(guestImportFailure(err(422, { exam_date: ['A data da prova deve ser no futuro.'] }))).toBe('exam_date')
    expect(guestImportFailure(err(422, { exam_date: ['x'], version: ['y'] }))).toBe('invalid')
    expect(guestImportFailure(err(422))).toBe('invalid')
    expect(guestImportFailure(err(403))).toBe('invalid')
    expect(guestImportFailure(err(429))).toBe('rate')
    expect(guestImportFailure(err(500))).toBe('network')
    expect(guestImportFailure(new TypeError('fetch failed'))).toBe('network')
    expect(guestImportFailure(err(419))).toBe('network')
  })
})

describe('guestProgress: exam_skipped (API #179)', () => {
  it('a razão da API vence; sem o campo, o nosso descarte da data', () => {
    expect(guestExamSkipped('exam_limit_reached', false)).toBe('exam_limit_reached')
    expect(guestExamSkipped('exam_date_past', false)).toBe('exam_date_past')
    expect(guestExamSkipped(undefined, true)).toBe('exam_date_past')
    expect(guestExamSkipped(null, false)).toBeNull()
  })

  it('uma linha por razão', () => {
    expect(guestExamSkippedText('exam_date_past')).toBe('A data da prova já passou, então ela não foi marcada.')
    expect(guestExamSkippedText('exam_limit_reached')).toMatch(/máximo de provas/)
  })
})
