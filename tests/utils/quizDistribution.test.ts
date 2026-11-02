import { describe, expect, it } from 'vitest'
import { distributionLabel, splitQuestions, suggestedTimer, timerLabel } from '~/utils/quizDistribution'

const w = (cards: Record<string, number>) => Object.entries(cards).map(([id, n]) => ({ id, cards: n }))
const obj = (m: Map<string, number>) => Object.fromEntries(m)

// The same cases as the API (memorai-api tests/Feature/Domain/Quiz/QuizBlocksTest.php, QuizDistribution::split)
describe('splitQuestions (prd-4e-praticar-v3 RF-B2, a regra da API)', () => {
  it('proporcional aos cards, pelo maior resto (empate: mais cards)', () => {
    expect(obj(splitQuestions(30, w({ a: 30, b: 10 })))).toEqual({ a: 23, b: 7 })
  })

  it('matéria com material e sem cards recebe pelo menos 1, tirado da maior', () => {
    expect(obj(splitQuestions(10, w({ a: 50, b: 0 })))).toEqual({ a: 9, b: 1 })
  })

  it('pesos iguais: soma o total e o resto vai na ordem da árvore', () => {
    const out = splitQuestions(10, w({ a: 1, b: 1, c: 1 }))
    expect([...out.values()].reduce((x, y) => x + y, 0)).toBe(10)
    expect(obj(out)).toEqual({ a: 4, b: 3, c: 3 })
  })

  it('menos questões que matérias: as de mais cards, 1 cada, na ordem da árvore', () => {
    expect(obj(splitQuestions(2, w({ a: 1, b: 9, c: 5 })))).toEqual({ b: 1, c: 1 })
  })

  it('sem matérias: nada', () => {
    expect(obj(splitQuestions(5, []))).toEqual({})
  })

  it('60 questões em 3 matérias somam 60', () => {
    const out = splitQuestions(60, w({ pt: 400, const: 500, adm: 600 }))
    expect([...out.values()].reduce((x, y) => x + y, 0)).toBe(60)
    expect(obj(out)).toEqual({ pt: 16, const: 20, adm: 24 })
  })
})

describe('rótulos do simulado', () => {
  it('a prévia da distribuição', () => {
    expect(distributionLabel([{ name: 'Português', questions: 12 }, { name: 'Constitucional', questions: 15 }, { name: 'Vazia', questions: 0 }]))
      .toBe('Português 12 · Constitucional 15')
  })

  it('cronômetro sugerido: 3 min por questão, a menor opção que cabe, até 3 h', () => {
    expect(suggestedTimer(10)).toBe(1800)
    expect(suggestedTimer(30)).toBe(7200)
    expect(suggestedTimer(60)).toBe(10800)
    expect(suggestedTimer(120)).toBe(10800)
    expect(timerLabel(1800)).toBe('30 min')
    expect(timerLabel(7200)).toBe('2 h')
  })
})
