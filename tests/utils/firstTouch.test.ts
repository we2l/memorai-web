import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FIRST_TOUCH_KEY, attributionPayload, captureFirstTouch, firstTouchProperties, readFirstTouch, touchFromUrl } from '~/utils/firstTouch'

describe('touchFromUrl', () => {
  it('lê os utm_* e a página de entrada, em minúsculas', () => {
    const t = touchFromUrl('https://baigi.com.br/comecar?utm_source=Instagram&utm_medium=social&utm_campaign=bio&utm_content=c01-curva&x=1', new Date('2026-11-11T12:00:00Z'))
    expect(t).toEqual({ utm_source: 'instagram', utm_medium: 'social', utm_campaign: 'bio', utm_content: 'c01-curva', landing: '/comecar', at: '2026-11-11T12:00:00.000Z' })
  })

  it('sem utm_source não é campanha', () => {
    expect(touchFromUrl('https://baigi.com.br/?utm_content=x')).toBeNull()
    expect(touchFromUrl('https://baigi.com.br/hoje')).toBeNull()
    expect(touchFromUrl('não é url')).toBeNull()
  })

  it('descarta valor que não é slug', () => {
    const t = touchFromUrl('https://baigi.com.br/?utm_source=reddit&utm_content=%3Cscript%3E')
    expect(t?.utm_source).toBe('reddit')
    expect(t?.utm_content).toBeUndefined()
  })
})

describe('primeiro toque guardado', () => {
  // Node 25 brings a localStorage of its own without methods: a Map stands in (as in staleState.test.ts)
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) })
  })

  it('guarda o primeiro e nunca sobrescreve', () => {
    captureFirstTouch('https://baigi.com.br/?utm_source=instagram&utm_content=c01-curva')
    captureFirstTouch('https://baigi.com.br/blog/x?utm_source=reddit')
    expect(readFirstTouch()?.utm_source).toBe('instagram')
  })

  it('visita sem campanha não guarda nada', () => {
    captureFirstTouch('https://baigi.com.br/hoje')
    expect(localStorage.getItem(FIRST_TOUCH_KEY)).toBeNull()
    expect(attributionPayload()).toEqual({})
    expect(firstTouchProperties()).toEqual({})
  })

  it('vira o attribution do cadastro (sem a data) e as propriedades do PostHog', () => {
    captureFirstTouch('https://baigi.com.br/comecar?utm_source=instagram&utm_medium=social&utm_content=c01-curva')
    expect(attributionPayload()).toEqual({ attribution: { utm_source: 'instagram', utm_medium: 'social', utm_content: 'c01-curva', landing: '/comecar' } })
    expect(firstTouchProperties()).toEqual({ first_landing: '/comecar', first_utm_source: 'instagram', first_utm_medium: 'social', first_utm_content: 'c01-curva' })
  })

  it('valor estragado no storage é ignorado', () => {
    localStorage.setItem(FIRST_TOUCH_KEY, '{quebrado')
    expect(readFirstTouch()).toBeNull()
    expect(attributionPayload()).toEqual({})
  })
})
