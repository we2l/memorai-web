import { describe, expect, it } from 'vitest'
import { returnTextAt } from '~/utils/returnAt'

// End of an explicit-list session: when the card waiting for its learning step comes back
describe('retorno a partir de um horário', () => {
  const now = Date.parse('2026-11-19T12:00:00Z')
  it.each([
    [10 * 60_000 - 500, 'em 10 min'],
    [5_000, 'em 1 min'],
    [-5_000, 'em 1 min'],
    [3 * 3_600_000, 'em 3 h'],
    [24 * 3_600_000, 'amanhã'],
  ])('+%d ms → %s', (delta, text) => {
    expect(returnTextAt(now + delta, now)).toBe(text)
  })
})
