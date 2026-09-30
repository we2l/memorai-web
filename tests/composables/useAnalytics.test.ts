import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useAnalytics } from '~/composables/useAnalytics'

const { ph, handle } = vi.hoisted(() => {
  const ph = { capture: vi.fn(), identify: vi.fn(), register: vi.fn(), reset: vi.fn() }
  const handle = { instance: null as any, run: vi.fn((fn: (p: any) => void) => { if (handle.instance) fn(handle.instance) }) }
  return { ph, handle }
})
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$posthog' ? handle : Reflect.get(target, key)),
}))

describe('useAnalytics', () => {
  beforeEach(() => {
    Object.values(ph).forEach(f => f.mockReset())
    handle.instance = null
  })

  it('no-op sem instância (sem chave ou sem consentimento)', () => {
    useAnalytics().track('paywall_viewed', { feature: null, source: 'planos_page', plan_required: 'pro' })
    expect(ph.capture).not.toHaveBeenCalled()
  })

  it('identify envia só o plano, nunca e-mail ou nome', () => {
    handle.instance = ph
    useAnalytics().identify({ id: 'uuid-1', plan: 'pro', email: 'a@b.c', name: 'Ana' } as any)
    expect(ph.identify).toHaveBeenCalledWith('uuid-1', { plan: 'pro' })
  })

  it('nunca lança erro no chamador', () => {
    handle.instance = ph
    ph.capture.mockImplementation(() => { throw new Error('boom') })
    expect(() => useAnalytics().track('reminder_toggled', { on: true, hour: 19, source: 'settings' })).not.toThrow()
  })

  it('reset usa a instância mesmo após revogar', () => {
    handle.instance = ph
    useAnalytics().reset()
    expect(ph.reset).toHaveBeenCalled()
  })
})
