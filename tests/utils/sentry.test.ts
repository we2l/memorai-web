import { describe, it, expect } from 'vitest'
import type { ErrorEvent } from '@sentry/browser'
import { isExpectedError, scrubBreadcrumb, scrubEvent } from '~/utils/sentry'

describe('utils/sentry', () => {
  it('drops API answers and chunk reloads, keeps real bugs', () => {
    expect(isExpectedError(Object.assign(new Error('x'), { name: 'FetchError' }))).toBe(true)
    expect(isExpectedError({ statusCode: 422 })).toBe(true)
    expect(isExpectedError(new TypeError('Failed to fetch dynamically imported module: /_nuxt/a.js'))).toBe(true)
    expect(isExpectedError(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe(false)
  })

  it('sends no user, cookies, query string or headers besides the user agent', () => {
    const event = scrubEvent({
      type: undefined,
      user: { id: 'u1', email: 'ana@baigi.com.br' },
      request: {
        url: 'https://baigi.com.br/cadernos/1/cards?q=texto+da+nota',
        cookies: { 'baigi-session': 'x' },
        query_string: 'q=texto',
        headers: { 'User-Agent': 'Firefox', Referer: 'https://baigi.com.br/?token=abc' },
      },
      breadcrumbs: [
        { category: 'console', message: 'nota inteira' },
        { category: 'fetch', data: { url: 'https://api.baigi.com.br/api/topics/1/flashcards?q=segredo', method: 'GET', status_code: 500, body: 'x' } },
        { category: 'navigation', data: { from: '/redefinir-senha?token=abc', to: '/hoje' } },
      ],
    } as ErrorEvent)

    expect(event.user).toBeUndefined()
    expect(event.request).toEqual({ url: 'https://baigi.com.br/cadernos/1/cards', headers: { 'User-Agent': 'Firefox' } })
    expect(event.breadcrumbs).toHaveLength(2)
    expect(event.breadcrumbs![0]!.data).toEqual({ url: 'https://api.baigi.com.br/api/topics/1/flashcards', method: 'GET', status_code: 500 })
    expect(JSON.stringify(event)).not.toMatch(/segredo|token=abc|texto/)
  })

  it('keeps breadcrumbs without data as they are', () => {
    expect(scrubBreadcrumb({ category: 'ui.click', message: 'button.primary' })).toEqual({ category: 'ui.click', message: 'button.primary' })
  })
})
