import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FIRST_TOUCH_KEY } from '~/utils/firstTouch'
import { COMECAR_MIN_VISIBLE_MS, countComecarViewed, countFunnelStep, funnelSource, resetFunnelCount } from '~/utils/funnelCount'

const API = 'https://api.baigi.test/api'

function sentBodies(beacon: ReturnType<typeof vi.fn>): Record<string, string>[] {
  return beacon.mock.calls.map(([, body]) => Object.fromEntries(new URLSearchParams(body as URLSearchParams)))
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('funnelCount', () => {
  let beacon: ReturnType<typeof vi.fn>

  beforeEach(() => {
    resetFunnelCount()
    // Node 25 brings a localStorage of its own without methods: a Map stands in (as in firstTouch.test.ts)
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) })
    document.cookie = 'baigi_logged_in=; path=/; max-age=0'
    beacon = vi.fn(() => true)
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: beacon })
    Object.defineProperty(navigator, 'webdriver', { configurable: true, get: () => false })
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    Object.defineProperty(document, 'prerendering', { configurable: true, get: () => false })
    Object.defineProperty(document, 'referrer', { configurable: true, get: () => '' })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('manda o passo com a origem do primeiro toque, sem cookie', () => {
    localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify({ utm_source: 'instagram', landing: '/comecar', at: '2026-11-19T12:00:00Z' }))

    countFunnelStep(API, 'guest_batch_done', false)

    expect(beacon).toHaveBeenCalledTimes(1)
    expect(beacon.mock.calls[0]![0]).toBe(`${API}/public/funnel`)
    expect(sentBodies(beacon)).toEqual([{ step: 'guest_batch_done', source: 'instagram' }])
  })

  it('sem primeiro toque usa o host do referrer e, sem ele, vazio', () => {
    expect(funnelSource()).toBe('')
    Object.defineProperty(document, 'referrer', { configurable: true, get: () => 'https://l.instagram.com/?u=x' })
    expect(funnelSource()).toBe('instagram.com')
  })

  it('cada passo conta 1 vez por carregamento', () => {
    countFunnelStep(API, 'entry_card_rated', false)
    countFunnelStep(API, 'entry_card_rated', false)
    countFunnelStep(API, 'entry_tour_done', false)

    expect(sentBodies(beacon).map(b => b.step)).toEqual(['entry_card_rated', 'entry_tour_done'])
  })

  it('não manda em navegador automatizado', () => {
    Object.defineProperty(navigator, 'webdriver', { configurable: true, get: () => true })
    countFunnelStep(API, 'entry_tour_done', false)
    expect(beacon).not.toHaveBeenCalled()
  })

  it('não manda para quem tem conta (store ou dica de sessão)', () => {
    countFunnelStep(API, 'entry_tour_done', true)
    document.cookie = 'baigi_logged_in=1; path=/'
    countFunnelStep(API, 'guest_batch_done', false)
    expect(beacon).not.toHaveBeenCalled()
  })

  it('sem sendBeacon usa fetch keepalive sem credenciais', () => {
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: undefined })
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('fetch', fetchMock)

    countFunnelStep(API, 'entry_tour_done', false)

    expect(fetchMock).toHaveBeenCalledWith(`${API}/public/funnel`, expect.objectContaining({ method: 'POST', keepalive: true, credentials: 'omit' }))
  })

  describe('comecar_viewed', () => {
    it('só depois de 1,5 s visível, com o ms real', () => {
      vi.useFakeTimers()
      countComecarViewed(API, () => false)

      vi.advanceTimersByTime(COMECAR_MIN_VISIBLE_MS - 100)
      expect(beacon).not.toHaveBeenCalled()
      vi.advanceTimersByTime(200)

      const [body] = sentBodies(beacon)
      expect(body!.step).toBe('comecar_viewed')
      expect(Number(body!.ms)).toBeGreaterThanOrEqual(COMECAR_MIN_VISIBLE_MS)
    })

    it('saiu antes de 1,5 s: nada (nunca manda ms curto)', () => {
      vi.useFakeTimers()
      const stop = countComecarViewed(API, () => false)
      vi.advanceTimersByTime(800)
      stop()
      vi.advanceTimersByTime(5000)
      expect(beacon).not.toHaveBeenCalled()
    })

    it('tempo com a aba escondida não conta', () => {
      vi.useFakeTimers()
      countComecarViewed(API, () => false)
      vi.advanceTimersByTime(1000)
      setVisibility('hidden')
      vi.advanceTimersByTime(10_000)
      expect(beacon).not.toHaveBeenCalled()
      setVisibility('visible')
      vi.advanceTimersByTime(600)
      expect(Number(sentBodies(beacon)[0]!.ms)).toBeGreaterThanOrEqual(COMECAR_MIN_VISIBLE_MS)
    })

    it('página em pré-renderização do navegador não conta', () => {
      vi.useFakeTimers()
      Object.defineProperty(document, 'prerendering', { configurable: true, get: () => true })
      countComecarViewed(API, () => false)
      vi.advanceTimersByTime(5000)
      expect(beacon).not.toHaveBeenCalled()
    })

    it('logado não manda', () => {
      vi.useFakeTimers()
      countComecarViewed(API, () => true)
      vi.advanceTimersByTime(5000)
      expect(beacon).not.toHaveBeenCalled()
    })
  })
})
