import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { useExamStore } from '~/stores/exam'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))

mockNuxtImport('useNuxtApp', (original) => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

describe('useExamStore.recordOutcome', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
  })

  it('faz o POST e atualiza a prova na lista', async () => {
    const store = useExamStore()
    store.exams = [
      { id: 'e1', title: 'TJ', outcome: null } as any,
      { id: 'e2', title: 'TRT', outcome: null } as any,
    ]
    apiMock.mockResolvedValueOnce({ data: { id: 'e1', title: 'TJ', outcome: 'passed', outcome_answered_at: '2026-10-02T13:00:00Z' } })

    await store.recordOutcome('e1', 'passed')

    expect(apiMock).toHaveBeenCalledWith('/exams/e1/outcome', { method: 'POST', body: { outcome: 'passed' } })
    expect(store.exams[0].outcome).toBe('passed')
    expect(store.exams[1].outcome).toBeNull()
  })
})
