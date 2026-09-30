import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { AiJobError, useAiJob } from '~/composables/useAiJob'

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }))
mockNuxtImport('useNuxtApp', original => () => new Proxy(original(), {
  get: (target, key) => (key === '$api' ? apiMock : Reflect.get(target, key)),
}))

const job = (status: string, extra: Record<string, unknown> = {}) => ({ data: { id: 'j1', type: 'cards', status, ...extra } })

describe('useAiJob', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    apiMock.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  it('POST 202 → consulta /ai/jobs/{id} até done e devolve o result', async () => {
    apiMock
      .mockResolvedValueOnce(job('pending'))
      .mockResolvedValueOnce(job('processing'))
      .mockResolvedValueOnce(job('done', { result: { cards: [{ front: 'Q' }] } }))

    const promise = useAiJob().run<{ cards: any[] }>('/ai/generate-cards', { source: 'notes' })
    await vi.advanceTimersByTimeAsync(4000)
    await expect(promise).resolves.toEqual({ cards: [{ front: 'Q' }] })

    expect(apiMock).toHaveBeenNthCalledWith(1, '/ai/generate-cards', { method: 'POST', body: { source: 'notes' } })
    expect(apiMock).toHaveBeenNthCalledWith(2, '/ai/jobs/j1', expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(apiMock).toHaveBeenCalledTimes(3)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('job failed rejeita com a mensagem do servidor em e.data.message', async () => {
    apiMock
      .mockResolvedValueOnce(job('pending'))
      .mockResolvedValueOnce(job('failed', { error: 'Não foi possível gerar agora.' }))

    const promise = useAiJob().run('/topics/t/mindmap/generate')
    const assertion = expect(promise).rejects.toMatchObject({ data: { message: 'Não foi possível gerar agora.' } })
    await vi.advanceTimersByTimeAsync(2000)
    await assertion
    await expect(promise).rejects.toBeInstanceOf(AiJobError)
  })

  it('resposta já terminal (fila síncrona) não faz polling', async () => {
    apiMock.mockResolvedValueOnce(job('done', { result: { ok: true } }))
    await expect(useAiJob().run('/ai/generate-cards')).resolves.toEqual({ ok: true })
    expect(apiMock).toHaveBeenCalledTimes(1)
  })
})
