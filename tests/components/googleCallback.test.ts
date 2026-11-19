import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import Callback from '~/pages/auth/google/callback.vue'

const { apiMock, query } = vi.hoisted(() => ({ apiMock: vi.fn(), query: { value: {} as Record<string, string> } }))

mockNuxtImport('useNuxtApp', (original) => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))
mockNuxtImport('useRoute', (original) => () => ({ ...original(), query: query.value }))

describe('/auth/google/callback', () => {
  it('"Cancelar" on Google (error=access_denied) says so, without calling the API', async () => {
    query.value = { error: 'access_denied', state: 'abc' }
    const wrapper = await mountSuspended(Callback)
    await flushPromises()
    expect(wrapper.get('[role=alert]').text()).toBe('O login com o Google foi cancelado. Tente de novo ou entre com e-mail.')
    expect(apiMock).not.toHaveBeenCalled()
  })

  it('without code nor error the link is still invalid', async () => {
    query.value = {}
    const wrapper = await mountSuspended(Callback)
    await flushPromises()
    expect(wrapper.get('[role=alert]').text()).toBe('Link de login inválido. Tente novamente.')
  })
})
