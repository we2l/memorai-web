import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getXsrfToken, ensureCsrfCookie } from '~/utils/xsrf'

function clearXsrf() {
  document.cookie = 'XSRF-TOKEN=; path=/; max-age=0'
}

describe('xsrf utils', () => {
  beforeEach(clearXsrf)
  afterEach(() => {
    clearXsrf()
    vi.unstubAllGlobals()
  })

  it('getXsrfToken decodes the cookie value', () => {
    document.cookie = 'XSRF-TOKEN=abc%3D%3D; path=/'
    expect(getXsrfToken()).toBe('abc==')
  })

  it('getXsrfToken returns null without cookie', () => {
    expect(getXsrfToken()).toBeNull()
  })

  it('ensureCsrfCookie calls the endpoint once for concurrent calls', async () => {
    const fetchMock = vi.fn(() => new Promise<void>(resolve => setTimeout(resolve, 5)))
    vi.stubGlobal('$fetch', fetchMock)

    await Promise.all([ensureCsrfCookie(), ensureCsrfCookie(), ensureCsrfCookie()])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]).toEqual([
      expect.stringMatching(/\/sanctum\/csrf-cookie$/),
      { credentials: 'include' },
    ])
  })

  it('ensureCsrfCookie skips the request when the token exists, unless forced', async () => {
    document.cookie = 'XSRF-TOKEN=abc; path=/'
    const fetchMock = vi.fn(() => Promise.resolve())
    vi.stubGlobal('$fetch', fetchMock)

    await ensureCsrfCookie()
    expect(fetchMock).not.toHaveBeenCalled()

    await ensureCsrfCookie(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
