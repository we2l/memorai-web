import { describe, expect, it } from 'vitest'
import { feedbackTitle, feedbackWhen, isOkKind, type FeedbackKind } from '~/utils/reviewFeedback'

// The feedback band of the review (prd-visual-e2 RF-2.4, tasks 9.1)
describe('reviewFeedback', () => {
  const kinds: FeedbackKind[] = ['ok', 'again', 'tf-ok', 'tf-again', 'typed-ok', 'typed-again']

  it('a variação é estável por card e muda entre cards', () => {
    expect(feedbackTitle('ok', 'card-1')).toBe(feedbackTitle('ok', 'card-1'))
    const seen = new Set(Array.from({ length: 40 }, (_, i) => feedbackTitle('ok', `card-${i}`)))
    expect(seen.size).toBe(4)
  })

  it('cada tipo tem 4 frases, nenhuma de culpa ou de "errado" seco', () => {
    for (const k of kinds) {
      const all = new Set(Array.from({ length: 80 }, (_, i) => feedbackTitle(k, `c${i}`)))
      expect(all.size, k).toBe(4)
      for (const t of all) expect(t).not.toMatch(/errad|ruim|falhou/i)
    }
  })

  it('onde o card vai, em frase', () => {
    expect(feedbackWhen('ok', '16d')).toBe('Volta em 16 dias.')
    expect(feedbackWhen('ok', '1d')).toBe('Volta amanhã.')
    expect(feedbackWhen('again', '10min')).toBe('Ele volta daqui a 10 minutos.')
    expect(feedbackWhen('again', '1min')).toBe('Ele volta daqui a 1 minuto.')
    expect(feedbackWhen('tf-again', '1d')).toBe('Ele volta amanhã.')
    expect(feedbackWhen('ok', '')).toBe('')
  })

  it('acerto x erro', () => {
    expect(kinds.filter(isOkKind)).toEqual(['ok', 'tf-ok', 'typed-ok'])
  })
})
