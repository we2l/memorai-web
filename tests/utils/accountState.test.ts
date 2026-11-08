import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { clearAccountStorage, resetUserScopedState } from '~/utils/accountState'
import { useAuthStore } from '~/stores/auth'
import { useTopicStore } from '~/stores/topic'
import { useScopeStore } from '~/stores/scope'
import { useDocumentStore } from '~/stores/document'
import { usePlayerStore } from '~/stores/player'

const { apiMock, analyticsMock } = vi.hoisted(() => ({
  apiMock: vi.fn(),
  analyticsMock: { track: vi.fn(), identify: vi.fn(), reset: vi.fn() },
}))
mockNuxtImport('useAnalytics', () => () => analyticsMock)
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

// Every store of app/stores: a new store is covered without editing this list
const storeModules = import.meta.glob<Record<string, unknown>>('../../app/stores/*.ts', { eager: true })

describe('resetUserScopedState (troca de conta sem recarregar, 2026-11-08)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('todo store do app aceita o $reset (setup stores definem o seu)', () => {
    const uses = Object.values(storeModules).flatMap(m => Object.entries(m).filter(([k, v]) => /^use\w+Store$/.test(k) && typeof v === 'function').map(([, v]) => v as () => { $reset: () => void }))
    expect(uses.length).toBeGreaterThanOrEqual(15)
    for (const use of uses) use()
    expect(() => resetUserScopedState()).not.toThrow()
  })

  it('apaga os dados da conta anterior e mantém o auth', () => {
    const auth = useAuthStore()
    auth.loaded = true
    const topic = useTopicStore()
    topic.tree = [{ id: 't1', name: 'Arquitetura de software' } as never]
    const scope = useScopeStore()
    scope.topicId = 't1'
    scope.materials = [{ id: 'n1', title: 'AWS' } as never]
    const docs = useDocumentStore()
    docs.documents = [{ id: 'd1' } as never]

    resetUserScopedState()

    expect(topic.tree).toEqual([])
    expect(scope.topicId).toBeNull()
    expect(scope.materials).toEqual([])
    expect(docs.documents).toEqual([])
    expect(auth.loaded).toBe(true)
  })

  it('para o áudio do episódio sem mandar a posição (a sessão acabou)', () => {
    const player = usePlayerStore()
    const audio = player.getAudio()
    const pause = vi.spyOn(audio, 'pause').mockImplementation(() => {})
    audio.setAttribute('src', 'https://example.test/a.mp3')
    player.currentPodcast = { id: 'p1' } as never
    player.currentTime = 40

    resetUserScopedState()

    expect(pause).toHaveBeenCalled()
    expect(audio.hasAttribute('src')).toBe(false)
    expect(player.currentPodcast).toBeNull()
    expect(apiMock).not.toHaveBeenCalled()
  })

  it('clearAuth (401 ou logout) zera os stores', () => {
    const topic = useTopicStore()
    topic.tree = [{ id: 't1', name: 'AWS' } as never]
    useAuthStore().clearAuth()
    expect(topic.tree).toEqual([])
  })
})

describe('clearAccountStorage', () => {
  function fakeStorage(entries: Record<string, string>): Storage {
    const m = new Map(Object.entries(entries))
    return {
      get length() { return m.size },
      key: (i: number) => [...m.keys()][i] ?? null,
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => { m.set(k, v) },
      removeItem: (k: string) => { m.delete(k) },
      clear: () => m.clear(),
    }
  }

  const ACCOUNT_LOCAL = {
    'baigi:draft:u1:n1': '{"title":"x"}',
    'baigi-add-last-topic': 't1',
    'baigi-podcast-progress-pending': '{}',
    'baigi-material-mode-n1': 'edit',
    'baigi-exam-move-dismissed-e1': '1',
    'baigi-first-material-pending': 'u1',
  }
  const DEVICE_LOCAL = {
    'color-mode': 'dark',
    'baigi-auto-cards': '1',
    'baigi-guest-progress': '{"area":"x"}',
    'baigi-pending-logout': '1',
    'review-shortcut-tip': '2',
  }

  let local: Storage
  let session: Storage
  beforeEach(() => {
    local = fakeStorage({ ...ACCOUNT_LOCAL, ...DEVICE_LOCAL })
    session = fakeStorage({ 'baigi-card-workshop-t1': '{}', 'baigi-scope-cleared': 't1', relogin: '1' })
    vi.stubGlobal('localStorage', local)
    vi.stubGlobal('sessionStorage', session)
  })

  it('apaga ids e rascunhos da conta e mantém as preferências do aparelho', () => {
    clearAccountStorage()
    for (const k of Object.keys(ACCOUNT_LOCAL)) expect(local.getItem(k), k).toBeNull()
    for (const [k, v] of Object.entries(DEVICE_LOCAL)) expect(local.getItem(k), k).toBe(v)
    expect(session.getItem('baigi-card-workshop-t1')).toBeNull()
    expect(session.getItem('baigi-scope-cleared')).toBeNull()
    expect(session.getItem('relogin')).toBe('1')
  })

  it('o logout explícito limpa o storage; o 401 (só clearAuth) mantém o rascunho da própria nota', async () => {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    auth.clearAuth()
    expect(local.getItem('baigi:draft:u1:n1')).not.toBeNull()

    apiMock.mockResolvedValue(undefined)
    await auth.logout()
    expect(local.getItem('baigi:draft:u1:n1')).toBeNull()
    expect(local.getItem('baigi-guest-progress')).not.toBeNull()
  })
})
