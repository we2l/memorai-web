import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { useConsent, CONSENT_COOKIE, CURRENT_CONSENT_VERSION } from '~/composables/useConsent'
import type { User } from '~/types'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const user = (over: Partial<User> = {}): User => ({
  id: 'u1', name: 'Ana', email: 'a@b.c', email_verified: true, plan: 'free',
  default_learning_mode: 'general', onboarding_completed: true, analytics_consent: null, analytics_consent_at: null, ...over,
})

function setCookie(value: object | null) {
  document.cookie = value
    ? `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; path=/`
    : `${CONSENT_COOKIE}=; path=/; max-age=0`
}

function cookieValue() {
  const raw = document.cookie.split('; ').find(c => c.startsWith(`${CONSENT_COOKIE}=`))?.split('=')[1]
  return raw ? JSON.parse(decodeURIComponent(raw)) : null
}

describe('useConsent', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset().mockResolvedValue({ data: { analytics_consent: true, analytics_consent_at: '2026-09-28T19:00:00Z' } })
    setCookie(null)
    clearNuxtState('consent')
  })

  it('sem cookie: não decidido (banner)', () => {
    expect(useConsent().analytics.value).toBeNull()
  })

  it('recusar grava false no cookie com versão e ts', async () => {
    const c = useConsent()
    await c.reject()
    expect(c.analytics.value).toBe(false)
    await nextTick()
    expect(cookieValue()).toMatchObject({ v: CURRENT_CONSENT_VERSION, analytics: false })
    expect(apiMock).not.toHaveBeenCalled() // anonymous visitor: cookie only
  })

  it('cookie de versão antiga conta como não decidido', () => {
    setCookie({ v: '2025-01', analytics: true, ts: 1 })
    expect(useConsent().analytics.value).toBeNull()
  })

  it('logado: set envia PUT /consent', async () => {
    useAuthStore().user = user()
    await useConsent().accept()
    expect(apiMock).toHaveBeenCalledWith('/consent', { method: 'PUT', body: { analytics: true, version: CURRENT_CONSENT_VERSION } })
  })

  it('sync: servidor null + cookie true → PUT', async () => {
    useAuthStore().user = user()
    setCookie({ v: CURRENT_CONSENT_VERSION, analytics: true, ts: 100 })
    await useConsent().syncWithServer(user())
    expect(apiMock).toHaveBeenCalledWith('/consent', expect.objectContaining({ body: { analytics: true, version: CURRENT_CONSENT_VERSION } }))
  })

  it('sync: servidor true + sem cookie → escreve o cookie', async () => {
    const c = useConsent()
    await c.syncWithServer(user({ analytics_consent: true, analytics_consent_at: '2026-09-28T19:00:00Z' }))
    expect(c.analytics.value).toBe(true)
    await nextTick()
    expect(cookieValue()).toMatchObject({ analytics: true, ts: Date.parse('2026-09-28T19:00:00Z') / 1000 })
    expect(apiMock).not.toHaveBeenCalled()
  })

  it('sync: divergência → vence o ts mais recente', async () => {
    useAuthStore().user = user()
    const serverAt = '2026-09-28T19:00:00Z'
    const serverTs = Date.parse(serverAt) / 1000

    // Cookie newer than the account → the account is updated
    setCookie({ v: CURRENT_CONSENT_VERSION, analytics: false, ts: serverTs + 60 })
    await useConsent().syncWithServer(user({ analytics_consent: true, analytics_consent_at: serverAt }))
    expect(apiMock).toHaveBeenCalledWith('/consent', expect.objectContaining({ body: { analytics: false, version: CURRENT_CONSENT_VERSION } }))

    // Account newer than the cookie → the cookie follows the account
    apiMock.mockClear()
    clearNuxtState('consent')
    setCookie({ v: CURRENT_CONSENT_VERSION, analytics: false, ts: serverTs - 60 })
    const c = useConsent()
    await c.syncWithServer(user({ analytics_consent: true, analytics_consent_at: serverAt }))
    expect(apiMock).not.toHaveBeenCalled()
    expect(c.analytics.value).toBe(true)
  })

  it('signupPayload leva a escolha do banner', async () => {
    const c = useConsent()
    expect(c.signupPayload()).toEqual({})
    await c.accept()
    expect(c.signupPayload()).toEqual({ analytics_consent: true })
  })
})
