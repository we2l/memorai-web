import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { hasPendingLogout } from '~/utils/pendingLogout'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

describe('logout sem rede', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) })
    apiMock.mockReset()
  })

  it('sem resposta da API: limpa o estado e deixa o logout pendente', async () => {
    apiMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const auth = useAuthStore()
    auth.user = { id: 'u' } as never
    await auth.logout()
    expect(auth.user).toBeNull()
    expect(hasPendingLogout()).toBe(true)
  })

  it('a API respondeu, mesmo com erro (401): nada pendente', async () => {
    apiMock.mockRejectedValue(Object.assign(new Error('x'), { statusCode: 401 }))
    await useAuthStore().logout()
    expect(hasPendingLogout()).toBe(false)
  })

  it('entrar de novo limpa o pendente', async () => {
    apiMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const auth = useAuthStore()
    await auth.logout()
    auth.setUser({ id: 'u', plan: 'free' } as never)
    expect(hasPendingLogout()).toBe(false)
  })
})
