import { describe, expect, it } from 'vitest'
import { answerLetter, formatAnswer, optionParts } from '~/utils/quizAnswer'

const mc = { type: 'multiple_choice' as const, options: ['a) Entre as partes', 'b) Para todos', 'c) Só no STF', 'd) Nenhuma'] }
const tf = { type: 'true_false' as const, options: null }

describe('respostas das questões (a regra da API)', () => {
  it('a letra e o texto de cada alternativa', () => {
    expect(optionParts('b) Para todos', 1)).toEqual({ marker: 'B', text: 'Para todos' })
    expect(optionParts('Sem letra', 2)).toEqual({ marker: 'C', text: 'Sem letra' })
  })

  it('compara pela letra, como QuizService::normalizeAnswer', () => {
    expect(answerLetter(mc, 'b) Para todos')).toBe('b')
    expect(answerLetter(mc, 'B')).toBe('b')
    expect(answerLetter(tf, 'True')).toBe('true')
  })

  it('mostra a resposta como a pessoa leu', () => {
    expect(formatAnswer(mc, 'a')).toBe('A) Entre as partes')
    expect(formatAnswer(mc, 'c) Só no STF')).toBe('C) Só no STF')
    expect(formatAnswer(tf, 'false')).toBe('Falso')
    expect(formatAnswer(mc, null)).toBe('nada')
  })
})
