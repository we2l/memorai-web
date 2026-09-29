import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { usePoll } from '~/composables/usePoll'

let visibility: DocumentVisibilityState = 'visible'

function setVisibility(v: DocumentVisibilityState) {
  visibility = v
  document.dispatchEvent(new Event('visibilitychange'))
}

/** Resolves after `ms` of fake time. */
function deferred<T>(value: T, ms: number) {
  return () => new Promise<T>(resolve => setTimeout(() => resolve(value), ms))
}

beforeEach(() => {
  vi.useFakeTimers()
  visibility = 'visible'
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('usePoll', () => {
  it('não chama de novo antes da promise anterior resolver', async () => {
    const fn = vi.fn(deferred('x', 10_000)) // request slower than the interval
    const poll = usePoll(fn, { interval: 1000 })
    poll.start()
    expect(fn).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(9_000)
    expect(fn).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1_000 + 1_000) // resolves, then waits the interval
    expect(fn).toHaveBeenCalledTimes(2)
    poll.stop()
  })

  it('aba oculta: 0 chamadas em 5 min; voltar visível: 1 chamada imediata', async () => {
    const fn = vi.fn(async () => 'x')
    const poll = usePoll(fn, { interval: 4000 })
    poll.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(fn).toHaveBeenCalledTimes(1)

    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)

    setVisibility('visible')
    await vi.advanceTimersByTimeAsync(0)
    expect(fn).toHaveBeenCalledTimes(2)
    poll.stop()
  })

  it('stop() aborta o request em voo', async () => {
    let signal: AbortSignal | undefined
    const poll = usePoll((s) => {
      signal = s
      return new Promise(() => {})
    }, { interval: 1000 })
    poll.start()
    expect(signal?.aborted).toBe(false)
    poll.stop()
    expect(signal?.aborted).toBe(true)
    expect(poll.isActive.value).toBe(false)
  })

  it('timeout para o polling e chama onTimeout', async () => {
    const onTimeout = vi.fn()
    const fn = vi.fn(async () => 'pending')
    const poll = usePoll(fn, { interval: 1000, timeout: 5000, onTimeout })
    poll.start()
    await vi.advanceTimersByTimeAsync(6000)
    expect(onTimeout).toHaveBeenCalledTimes(1)
    expect(poll.isActive.value).toBe(false)
    const calls = fn.mock.calls.length
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fn).toHaveBeenCalledTimes(calls)
  })

  it('until encerra o polling', async () => {
    let n = 0
    const fn = vi.fn(async () => ++n)
    const poll = usePoll(fn, { interval: 1000, until: r => r >= 3 })
    poll.start()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fn).toHaveBeenCalledTimes(3)
    expect(poll.isActive.value).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('backoff em erro (×1,5) e guarda lastError', async () => {
    const fn = vi.fn(async () => { throw new Error('boom') })
    const poll = usePoll(fn, { interval: 1000 })
    poll.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(poll.lastError.value).toBeInstanceOf(Error)
    await vi.advanceTimersByTimeAsync(1499)
    expect(fn).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(fn).toHaveBeenCalledTimes(2)
    poll.stop()
  })

  it('start() é idempotente', async () => {
    const fn = vi.fn(async () => 'x')
    const poll = usePoll(fn, { interval: 1000 })
    poll.start()
    poll.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(1)
    poll.stop()
  })

  it('dispose do effectScope não deixa timer', async () => {
    const scope = effectScope()
    scope.run(() => {
      usePoll(async () => 'x', { interval: 1000 }).start()
    })
    await vi.advanceTimersByTimeAsync(3000)
    expect(vi.getTimerCount()).toBe(1)
    scope.stop()
    expect(vi.getTimerCount()).toBe(0)
  })
})
