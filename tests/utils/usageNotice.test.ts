import { describe, expect, it } from 'vitest'
import { isAtLimit, isNearLimit, limitReachedRoute } from '~/utils/usageLimit'
import { limitReachedText, usageNotice, usageNoticeShort } from '~/utils/usageNotice'
import { nextMonthStartLabel } from '~/utils/billing'

const RESETS = '2026-12-01T00:00:00-03:00'
const label = 'gerações de cards com IA'

describe('isNearLimit (prd-uso-justo RN-2)', () => {
  it('sem near_limit (API antiga): used >= ceil(limit × 0,8)', () => {
    expect(isNearLimit({ used: 319, limit: 400, remaining: 81 })).toBe(false)
    expect(isNearLimit({ used: 320, limit: 400, remaining: 80 })).toBe(true)
    // ceil: 7 × 0,8 = 5,6 → 6
    expect(isNearLimit({ used: 5, limit: 7, remaining: 2 })).toBe(false)
    expect(isNearLimit({ used: 6, limit: 7, remaining: 1 })).toBe(true)
  })

  it('o near_limit da API vale quando vem', () => {
    expect(isNearLimit({ used: 10, limit: 400, remaining: 390, near_limit: true })).toBe(true)
    expect(isNearLimit({ used: 399, limit: 400, remaining: 1, near_limit: false })).toBe(false)
  })

  it('limite 0 ou null: nunca', () => {
    expect(isNearLimit({ used: 0, limit: 0, remaining: 0, near_limit: true })).toBe(false)
    expect(isNearLimit({ used: 900, limit: null, remaining: null })).toBe(false)
    expect(isNearLimit(undefined)).toBe(false)
  })
})

describe('usageNotice', () => {
  it('abaixo de 80%: nada', () => {
    expect(usageNotice({ used: 100, limit: 400, remaining: 300 }, label, RESETS)).toBeNull()
  })

  it('aos 80%: "Restam N de M <rótulo> este mês." (e "Resta 1")', () => {
    expect(usageNotice({ used: 321, limit: 400, remaining: 79, near_limit: true }, label, RESETS))
      .toEqual({ kind: 'near', text: 'Restam 79 de 400 gerações de cards com IA este mês.' })
    expect(usageNotice({ used: 399, limit: 400, remaining: 1 }, label, RESETS)!.text).toBe('Resta 1 de 400 gerações de cards com IA este mês.')
  })

  it('no limite: a frase do 402, com o dia em que a contagem recomeça (fuso de Brasília)', () => {
    expect(usageNotice({ used: 400, limit: 400, remaining: 0, near_limit: true }, label, RESETS))
      .toEqual({ kind: 'limit', text: 'Você usou 400 de 400 gerações de cards com IA deste mês. A contagem recomeça em 01/12.' })
    expect(isAtLimit({ used: 400, limit: 400, remaining: 0 })).toBe(true)
  })

  it('limite 0 (Grátis) ou null: nada, o comportamento de antes', () => {
    expect(usageNotice({ used: 0, limit: 0, remaining: 0 }, label, RESETS)).toBeNull()
    expect(usageNotice({ used: 3, limit: null, remaining: null }, label, RESETS)).toBeNull()
    expect(isAtLimit({ used: 0, limit: 0, remaining: 0 })).toBe(false)
  })

  it('forma curta para o menu', () => {
    expect(usageNoticeShort({ used: 50, limit: 60, remaining: 10 }, RESETS)).toBe('restam 10 este mês')
    expect(usageNoticeShort({ used: 60, limit: 60, remaining: 0 }, RESETS)).toBe('recomeça em 01/12')
    expect(usageNoticeShort({ used: 1, limit: 60, remaining: 59 }, RESETS)).toBeNull()
  })
})

describe('limitReachedText', () => {
  it('sem used/limit (evento local): a frase sem os números', () => {
    expect(limitReachedText(null, null, 'podcasts', RESETS)).toBe('Você chegou ao limite de podcasts deste mês. A contagem recomeça em 01/12.')
  })

  it('sem resets_at: o dia 1 do mês seguinte em Brasília', () => {
    // 30/11 23h em Brasília = 01/12 02h UTC: ainda novembro em SP
    expect(nextMonthStartLabel(new Date('2026-12-01T02:00:00Z'))).toBe('01/12')
    expect(nextMonthStartLabel(new Date('2026-12-15T12:00:00Z'))).toBe('01/01')
  })
})

describe('limitReachedRoute (RF-F4, RN-3)', () => {
  it('plan_required null (Intensivo no limite): toast; "pro" ou ausente (Grátis, teste): modal', () => {
    expect(limitReachedRoute({ feature: 'cards_ai', planRequired: null })).toBe('toast')
    expect(limitReachedRoute({ feature: 'cards_ai', planRequired: 'pro' })).toBe('modal')
    expect(limitReachedRoute({ feature: 'cards_ai' })).toBe('modal')
  })
})
