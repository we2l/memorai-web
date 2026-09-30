import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import ConsentBanner from '~/components/ui/ConsentBanner.vue'
import { CONSENT_COOKIE, CURRENT_CONSENT_VERSION } from '~/composables/useConsent'

describe('ConsentBanner', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    document.cookie = `${CONSENT_COOKIE}=; path=/; max-age=0`
    clearNuxtState('consent')
  })

  it('aparece sem decisão, com Recusar e Aceitar do mesmo peso', async () => {
    const w = await mountSuspended(ConsentBanner)
    const banner = w.get('[data-testid="consent-banner"]')
    expect(banner.attributes('role')).toBe('dialog')
    expect(banner.attributes('aria-labelledby')).toBe('consent-title')
    const reject = w.get('[data-testid="consent-reject"]')
    const accept = w.get('[data-testid="consent-accept"]')
    expect(reject.classes()).toEqual(accept.classes())
    expect(w.find('a[href="/privacidade"]').exists()).toBe(true)
  })

  it('Recusar grava false e o banner some', async () => {
    const w = await mountSuspended(ConsentBanner)
    await w.get('[data-testid="consent-reject"]').trigger('click')
    expect(useConsent().analytics.value).toBe(false)
    expect(w.find('[data-testid="consent-banner"]').exists()).toBe(false)
  })

  it('Aceitar grava true e o banner some', async () => {
    const w = await mountSuspended(ConsentBanner)
    await w.get('[data-testid="consent-accept"]').trigger('click')
    expect(useConsent().analytics.value).toBe(true)
    expect(w.find('[data-testid="consent-banner"]').exists()).toBe(false)
  })

  it('versão antiga no cookie → banner reaparece', async () => {
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify({ v: '2025-01', analytics: true, ts: 1 }))}; path=/`
    const w = await mountSuspended(ConsentBanner)
    expect(w.find('[data-testid="consent-banner"]').exists()).toBe(true)
  })

  it('não aparece com a escolha atual já feita', async () => {
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify({ v: CURRENT_CONSENT_VERSION, analytics: false, ts: 1 }))}; path=/`
    const w = await mountSuspended(ConsentBanner)
    expect(w.find('[data-testid="consent-banner"]').exists()).toBe(false)
  })

  it('não aparece em /privacidade', async () => {
    const w = await mountSuspended(ConsentBanner, { route: '/privacidade' })
    expect(w.find('[data-testid="consent-banner"]').exists()).toBe(false)
  })
})
