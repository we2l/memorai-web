import { describe, it, expect } from 'vitest'
import { sanitizeAnalyticsUrl } from '~/utils/analyticsUrl'

describe('sanitizeAnalyticsUrl', () => {
  it('mantém só utm_* e descarta hash', () => {
    expect(sanitizeAnalyticsUrl('https://baigi.com.br/planos?utm_source=x&utm_campaign=y&ref=a#top'))
      .toBe('https://baigi.com.br/planos?utm_source=x&utm_campaign=y')
  })

  it('remove tokens de links de e-mail', () => {
    expect(sanitizeAnalyticsUrl('https://baigi.com.br/provas/resultado?exam=1&outcome=passed&t=secret'))
      .toBe('https://baigi.com.br/provas/resultado')
  })

  it('não quebra com entrada inválida', () => {
    expect(sanitizeAnalyticsUrl('/relativa?t=1')).toBe('/relativa')
  })
})
