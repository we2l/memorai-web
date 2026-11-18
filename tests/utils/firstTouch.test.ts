import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FIRST_TOUCH_KEY, attributionPayload, captureFirstTouch, firstTouchProperties, readFirstTouch, touchFromUrl } from '~/utils/firstTouch'
import { captureReferrerTouch, referrerSource, touchFromReferrer } from '~/utils/firstTouchReferrer'

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

describe('referrerSource', () => {
  it('reduz ao host, sem www nem o redirecionador do link', () => {
    expect(referrerSource('https://l.instagram.com/?u=https%3A%2F%2Fbaigi.com.br%2Fcomecar')).toBe('instagram.com')
    expect(referrerSource('https://www.google.com.br/')).toBe('google.com.br')
    expect(referrerSource('https://m.youtube.com/watch?v=x')).toBe('youtube.com')
    expect(referrerSource('https://lm.facebook.com/l.php?u=x')).toBe('facebook.com')
    expect(referrerSource('https://t.co/abc')).toBe('t.co')
    expect(referrerSource('android-app://com.google.android.gm/')).toBe('com.google.android.gm')
  })

  it('o próprio site, o OAuth do Google e o que não é URL não contam', () => {
    expect(referrerSource('https://baigi.com.br/blog/x')).toBeNull()
    expect(referrerSource('https://api.baigi.com.br/email/click')).toBeNull()
    expect(referrerSource('https://accounts.google.com/')).toBeNull()
    expect(referrerSource('https://preview.vercel.app/', 'preview.vercel.app')).toBeNull()
    expect(referrerSource('http://localhost:3000/')).toBeNull()
    expect(referrerSource('')).toBeNull()
    expect(referrerSource('javascript:alert(1)')).toBeNull()
  })
})

describe('touchFromReferrer', () => {
  const now = new Date('2026-11-18T12:00:00Z')

  it('vira origem com meio referral nas páginas de entrada', () => {
    expect(touchFromReferrer('https://baigi.com.br/comecar', 'https://l.instagram.com/', now))
      .toEqual({ utm_source: 'instagram.com', utm_medium: 'referral', landing: '/comecar', at: '2026-11-18T12:00:00.000Z' })
    expect(touchFromReferrer('https://baigi.com.br/blog/revisoes-acumuladas', 'https://www.google.com/', now)?.landing).toBe('/blog/revisoes-acumuladas')
    expect(touchFromReferrer('https://baigi.com.br/', 'https://www.google.com/', now)?.utm_source).toBe('google.com')
  })

  it('endereço digitado e páginas fora da entrada não gravam', () => {
    expect(touchFromReferrer('https://baigi.com.br/comecar', '', now)).toBeNull()
    expect(touchFromReferrer('https://baigi.com.br/auth/google/callback?code=x', 'https://www.google.com/', now)).toBeNull()
    expect(touchFromReferrer('https://baigi.com.br/hoje?email_verificado=1', 'https://mail.google.com/', now)).toBeNull()
    expect(touchFromReferrer('https://baigi.com.br/comecarx', 'https://www.google.com/', now)).toBeNull()
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

  it('o referrer só entra sem toque guardado, e a UTM vence', () => {
    captureFirstTouch('https://baigi.com.br/comecar?utm_source=instagram&utm_medium=bio')
    captureReferrerTouch('https://baigi.com.br/comecar', 'https://l.instagram.com/')
    expect(readFirstTouch()).toMatchObject({ utm_source: 'instagram', utm_medium: 'bio' })
  })

  it('sem UTM, guarda o domínio do referrer e manda no cadastro', () => {
    captureFirstTouch('https://baigi.com.br/comecar')
    captureReferrerTouch('https://baigi.com.br/comecar', 'https://l.instagram.com/')
    captureReferrerTouch('https://baigi.com.br/blog/x', 'https://www.google.com/')
    expect(attributionPayload()).toEqual({ attribution: { utm_source: 'instagram.com', utm_medium: 'referral', landing: '/comecar' } })
  })

  it('valor estragado no storage é ignorado', () => {
    localStorage.setItem(FIRST_TOUCH_KEY, '{quebrado')
    expect(readFirstTouch()).toBeNull()
    expect(attributionPayload()).toEqual({})
  })
})
