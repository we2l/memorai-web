import { describe, expect, it } from 'vitest'
import { FACTOR, FIRST_STABILITY, curve, intervalFor, retrievability, stateAfterReviews } from '~/utils/forgetting'
import { buildExamPlan, daysUntilExam } from '~/utils/examPlan'

describe('forgetting (FSRS-6 padrão, igual ao FsrsService)', () => {
  it('a curva do card acertado uma vez bate com os números publicados no conteúdo (94,7 / 80,8 / 66,8)', () => {
    expect(FACTOR).toBeCloseTo(0.9805, 3)
    expect(retrievability(1, FIRST_STABILITY) * 100).toBeCloseTo(94.7, 1)
    expect(retrievability(7, FIRST_STABILITY) * 100).toBeCloseTo(80.8, 1)
    expect(retrievability(30, FIRST_STABILITY) * 100).toBeCloseTo(66.8, 1)
  })

  it('R(S) = 90% por definição, e cada revisão aumenta a estabilidade', () => {
    expect(retrievability(FIRST_STABILITY, FIRST_STABILITY)).toBeCloseTo(0.9, 6)
    expect(intervalFor(FIRST_STABILITY, 0.9)).toBeCloseTo(FIRST_STABILITY, 6)
    const s = [0, 1, 2, 3].map(n => stateAfterReviews(n).stability)
    expect(s[1]).toBeGreaterThan(10)
    expect(s[1]).toBeLessThan(14)
    expect(s[2]).toBeGreaterThan(s[1]! * 3)
    expect(s[3]).toBeGreaterThan(s[2]!)
  })

  it('curve vai de 100% no dia 0 e só desce', () => {
    const c = curve(FIRST_STABILITY, 60)
    expect(c[0]).toEqual({ day: 0, percent: 100 })
    expect(c).toHaveLength(61)
    for (let i = 1; i < c.length; i++) expect(c[i]!.percent).toBeLessThanOrEqual(c[i - 1]!.percent)
  })
})

describe('examPlan', () => {
  it('divide os novos até 3 dias antes e estima as revisões', () => {
    const p = buildExamPlan({ days: 90, cards: 600 })
    expect(p.newDays).toBe(87)
    expect(p.newPerDay).toBe(7)
    expect(p.reviewsAvg).toBeGreaterThan(0)
    expect(p.reviewsPeak).toBeGreaterThanOrEqual(p.reviewsAvg)
    expect(p.recallOnExam).toBeGreaterThan(0.8)
    expect(p.recallOnExam).toBeLessThan(1)
    expect(p.heavy).toBe(false)
    expect(p.daily).toHaveLength(90)
  })

  it('volume grande em pouco tempo fica pesado; já estudados reduzem os novos', () => {
    expect(buildExamPlan({ days: 10, cards: 5000 }).heavy).toBe(true)
    expect(buildExamPlan({ days: 90, cards: 600, studied: 300 }).newPerDay).toBe(4)
  })

  it('daysUntilExam conta dias de calendário', () => {
    expect(daysUntilExam('2026-11-18', new Date(2026, 10, 8, 23, 30))).toBe(10)
    expect(daysUntilExam('', new Date())).toBe(0)
  })
})
