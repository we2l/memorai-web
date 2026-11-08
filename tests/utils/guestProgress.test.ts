import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  clearGuestProgress, growthText, guestSummary, loadGuestProgress, nextGuestCard,
  pendingGuestProgress, returnText, saveGuestProgress, GUEST_STORAGE_KEY,
} from '~/utils/guestProgress'

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

  it('writes the API labels in Portuguese', () => {
    expect(returnText('10min')).toBe('em 10 min')
    expect(returnText('1d')).toBe('amanhã')
    expect(returnText('8d')).toBe('em 8 dias')
    expect(returnText('1.5m')).toBe('em 1,5 meses')
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
