import { describe, it, expect, vi } from 'vitest'
import type { $Fetch } from 'ofetch'
import { withCsrfRetry } from '~/utils/apiClient'

function csrfError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), { response: { status } })
}

describe('$api CSRF retry', () => {
  it('ensures the CSRF cookie before mutating requests only', async () => {
    const raw = vi.fn(async () => ({ ok: true })) as unknown as $Fetch
    const ensure = vi.fn(async () => {})
    const api = withCsrfRetry(raw, ensure)

    await api('/me')
    expect(ensure).not.toHaveBeenCalled()

    await api('/flashcards', { method: 'POST' })
    expect(ensure).toHaveBeenCalledWith()
  })

  it('renews the CSRF cookie and retries once on 419', async () => {
    const raw = vi.fn()
      .mockRejectedValueOnce(csrfError(419))
      .mockResolvedValueOnce({ ok: true }) as unknown as $Fetch
    const ensure = vi.fn(async () => {})
    const api = withCsrfRetry(raw, ensure)

    await expect(api('/flashcards', { method: 'POST' })).resolves.toEqual({ ok: true })
    expect(ensure).toHaveBeenLastCalledWith(true)
    expect(raw).toHaveBeenCalledTimes(2)
  })

  it('throws when the retry also fails with 419', async () => {
    const raw = vi.fn().mockRejectedValue(csrfError(419)) as unknown as $Fetch
    const api = withCsrfRetry(raw, vi.fn(async () => {}))

    await expect(api('/flashcards', { method: 'POST' })).rejects.toThrow('HTTP 419')
    expect(raw).toHaveBeenCalledTimes(2)
  })

  it('does not retry other errors', async () => {
    const raw = vi.fn().mockRejectedValue(csrfError(422)) as unknown as $Fetch
    const api = withCsrfRetry(raw, vi.fn(async () => {}))

    await expect(api('/flashcards', { method: 'POST' })).rejects.toThrow('HTTP 422')
    expect(raw).toHaveBeenCalledTimes(1)
  })
})
