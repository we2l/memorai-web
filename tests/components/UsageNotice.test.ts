import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import UsageNotice from '~/components/plans/UsageNotice.vue'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

enableAutoUnmount(afterEach)

describe('PlansUsageNotice', () => {
  it('relê /usage quando a tela avisa que gastou um uso (foto → cards)', async () => {
    let used = 320
    apiMock.mockImplementation((url: string) => {
      if (url === '/usage') return Promise.resolve({ data: { tier: 'pro', period: 'month', resets_at: '2026-12-01', features: { cards_ai: { used, limit: 400, remaining: 400 - used } } } })
      return Promise.resolve({ data: { plans: [], features: { cards_ai: { label: 'gerações de cards com IA' } } } })
    })
    useAuthStore().user = { id: 'u', plan: 'pro', name: 'Ana', email_verified: true } as any
    const w = await mountSuspended(UsageNotice, { props: { feature: 'cards_ai', refreshKey: 0 } })
    await flushPromises()
    const usageCalls = () => apiMock.mock.calls.filter(c => c[0] === '/usage').length
    expect(usageCalls()).toBe(1)
    const before = w.text()
    used = 321
    await w.setProps({ refreshKey: 1 })
    await flushPromises()
    expect(usageCalls()).toBe(2)
    expect(w.text()).not.toBe(before)
    expect(w.text()).toContain('79')
  })
})
