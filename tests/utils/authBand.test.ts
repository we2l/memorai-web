import { describe, expect, it } from 'vitest'
import { guestReturnLine } from '~/utils/authBand'

describe('guestReturnLine', () => {
  it('sem agenda, a linha que não promete data', () => {
    expect(guestReturnLine(null)).toBe('Crie a conta e esses cards voltam no dia certo.')
    expect(guestReturnLine([])).toBe('Crie a conta e esses cards voltam no dia certo.')
  })

  it('a volta mais longa primeiro, com os rótulos da API em português', () => {
    expect(guestReturnLine([{ label: '1d', count: 2 }, { label: '2d', count: 4 }]))
      .toBe('Crie a conta e esses cards voltam no dia certo: 4 em 2 dias e 2 amanhã.')
    expect(guestReturnLine([{ label: '1d', count: 1 }, { label: '2d', count: 3 }, { label: '8d', count: 2 }]))
      .toBe('Crie a conta e esses cards voltam no dia certo: 2 em 8 dias, 3 em 2 dias e 1 amanhã.')
  })

  it('um grupo só', () => {
    expect(guestReturnLine([{ label: '2d', count: 6 }])).toBe('Crie a conta e os 6 voltam em 2 dias, no dia certo.')
    expect(guestReturnLine([{ label: '1d', count: 1 }])).toBe('Crie a conta e ele volta amanhã, no dia certo.')
  })
})
