import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import Page from '~/pages/comecar/pronto.vue'
import { GUEST_STORAGE_KEY } from '~/utils/guestProgress'

// QA 2026-11 M2: a 422 is a data error, not "no server"; the exam date alone never blocks the lote
const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))

mockNuxtImport('useNuxtApp', (original) => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const store = new Map<string, string>()
const lote = (exam_date: string) => JSON.stringify({ v: 1, area: 'oab', version: 'v', reviews: [{ index: 0, rating: 3, reviewed_at: 'x' }], done: true, exam_date })
const unprocessable = (errors: Record<string, string[]>) => Object.assign(new Error('422'), { response: { status: 422 }, data: { errors } })

describe('/comecar/pronto', () => {
  beforeEach(() => {
    apiMock.mockReset()
    store.clear()
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) })
    useAuthStore().user = { id: 'u1', name: 'Ana', onboarding_completed: false } as never
  })

  // First: a saved lote is kept in module scope for the rest of the file
  it('another 422 offers the ways on, never a retry that fails forever', async () => {
    store.set(GUEST_STORAGE_KEY, lote('2099-01-10'))
    apiMock.mockImplementation((url: string) => url === '/onboarding/guest' ? Promise.reject(unprocessable({ version: ['x'] })) : Promise.resolve({ data: null }))

    const wrapper = await mountSuspended(Page, { route: '/comecar/pronto' })
    await flushPromises()

    expect(wrapper.find('[data-testid="saved-error"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Não conseguimos falar com o servidor')
    expect(wrapper.find('[data-testid="saved-retry"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="saved-redo"]').exists()).toBe(true)
  })

  it('a 422 on the exam date saves the lote again without it and says so', async () => {
    store.set(GUEST_STORAGE_KEY, lote('2099-01-10'))
    const bodies: Record<string, unknown>[] = []
    apiMock.mockImplementation((url: string, opts?: { body?: Record<string, unknown> }) => {
      if (url !== '/onboarding/guest') return Promise.resolve({ data: null })
      bodies.push(opts!.body!)
      return bodies.length === 1
        ? Promise.reject(unprocessable({ exam_date: ['A data da prova deve ser no futuro.'] }))
        : Promise.resolve({ data: { card_ids: ['a', 'b'], reviews_applied: 1, created: true } })
    })

    const wrapper = await mountSuspended(Page, { route: '/comecar/pronto' })
    await flushPromises()

    expect(bodies[0]).toMatchObject({ exam_date: '2099-01-10' })
    expect(bodies[1]).not.toHaveProperty('exam_date')
    expect(wrapper.find('[data-testid="saved"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="saved-exam-skipped"]').exists()).toBe(true)
    expect(store.has(GUEST_STORAGE_KEY)).toBe(false)
  })
})
