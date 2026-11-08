import { describe, expect, it } from 'vitest'
import { feedbackText, returnText } from '~/utils/intervalLabel'

// The one Portuguese reading of the API's interval labels (ReviewService::formatMinutes / formatDays)
describe('intervalos em português', () => {
  it.each([
    ['10min', 'em 10 min'],
    ['1min', 'em 1 min'],
    ['1.5h', 'em 1,5 h'],
    ['< 1d', 'hoje'],
    ['1d', 'amanhã'],
    ['2d', 'em 2 dias'],
    ['29d', 'em 29 dias'],
    ['1.3m', 'em 40 dias'],
    ['1.5m', 'em 45 dias'],
    ['1.6m', 'em 2 meses'],
    ['2.5m', 'em 3 meses'],
    ['11.9m', 'em 1 ano'],
    ['1a', 'em 1 ano'],
    ['1.4a', 'em 1 ano'],
    ['2.6a', 'em 3 anos'],
  ])('%s → %s', (label, text) => {
    expect(returnText(label)).toBe(text)
  })

  it('o que não reconhece volta como veio; o retorno usa a mesma leitura', () => {
    expect(returnText('·')).toBe('·')
    expect(feedbackText('Lembrei', '1.3m')).toBe('Lembrei · volta em 40 dias')
    expect(feedbackText('Não lembrei', '10min')).toBe('Não lembrei · volta em 10 min')
  })
})
