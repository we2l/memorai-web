import { describe, it, expect, afterEach, vi } from 'vitest'
import { isVisitor, visitEvent } from '~/utils/visits'

afterEach(() => {
  document.cookie = 'baigi_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  vi.unstubAllGlobals()
})

describe('contagem de visitas (Vercel Web Analytics)', () => {
  it('manda só o caminho e as utm_* de quem não tem conta', () => {
    vi.stubGlobal('navigator', { webdriver: false })
    const event = visitEvent({ type: 'pageview', url: 'https://baigi.com.br/redefinir-senha?token=abc&utm_source=youtube&utm_campaign=video#x' })
    expect(event).toEqual({ type: 'pageview', url: 'https://baigi.com.br/redefinir-senha?utm_source=youtube&utm_campaign=video' })
  })

  it('não conta quem entrou na conta', () => {
    vi.stubGlobal('navigator', { webdriver: false })
    document.cookie = 'baigi_logged_in=1; path=/'
    expect(isVisitor()).toBe(false)
    expect(visitEvent({ url: 'https://baigi.com.br/hoje' })).toBeNull()
  })

  it('não conta navegador automatizado', () => {
    vi.stubGlobal('navigator', { webdriver: true })
    expect(isVisitor()).toBe(false)
  })
})
