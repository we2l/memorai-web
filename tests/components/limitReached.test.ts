import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import DefaultLayout from '~/layouts/default.vue'

// The 402 of the API plugin (feature-limit-reached) in the app's layout (prd-uso-justo RF-F4, RN-3)
const { apiMock, toastShow, trackMock } = vi.hoisted(() => ({ apiMock: vi.fn(), toastShow: vi.fn(), trackMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))
mockNuxtImport('useToast', original => () => ({ ...original(), show: toastShow }))
mockNuxtImport('useAnalytics', () => () => ({ track: trackMock, identify: vi.fn(), reset: vi.fn() }))

enableAutoUnmount(afterEach)
afterEach(() => { document.body.innerHTML = '' })

const catalog = { plans: [{ key: 'pro', name: 'Intensivo' }], features: { cards_ai: { label: 'gerações de cards com IA', unit: 'por mês', pro_benefit: '400 gerações por mês' } } }

function limitReached(detail: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent('feature-limit-reached', { detail }))
}

describe('402 no limite: toast para o Intensivo, modal para Grátis e teste', () => {
  beforeEach(() => {
    apiMock.mockReset()
    toastShow.mockReset()
    trackMock.mockReset()
    useState('plans').value = catalog
    apiMock.mockImplementation(async (url: string) => (url === '/plans' ? { data: catalog } : { data: {} }))
  })

  it('plan_required null: toast com a frase do limite e nenhum diálogo de upgrade', async () => {
    useAuthStore().user = { id: 'u', plan: 'pro' } as any
    await mountSuspended(DefaultLayout, { attachTo: document.body })
    await flushPromises()
    limitReached({ feature: 'cards_ai', used: 400, limit: 400, planRequired: null, resetsAt: '2026-12-01T00:00:00-03:00' })
    await flushPromises()
    expect(toastShow).toHaveBeenCalledWith('Você usou 400 de 400 gerações de cards com IA deste mês. A contagem recomeça em 01/12.', 'warning')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(trackMock).not.toHaveBeenCalledWith('paywall_viewed', expect.anything())
  })

  it('plan_required "pro": o UpgradeModal, sem toast', async () => {
    useAuthStore().user = { id: 'u', plan: 'free' } as any
    await mountSuspended(DefaultLayout, { attachTo: document.body })
    await flushPromises()
    limitReached({ feature: 'cards_ai', used: 0, limit: 0, planRequired: 'pro' })
    await flushPromises()
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).not.toBeNull())
    expect(document.body.textContent).toContain('Ver planos')
    expect(toastShow).not.toHaveBeenCalled()
    expect(trackMock).toHaveBeenCalledWith('paywall_viewed', expect.objectContaining({ feature: 'cards_ai', source: 'limit_402' }))
  })
})
