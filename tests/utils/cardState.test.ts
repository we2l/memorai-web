import { describe, expect, it } from 'vitest'
import { cardState, dueLabel, documentTitle, originShort } from '~/utils/cardState'

const NOW = new Date(2026, 10, 2, 15, 0)
const at = (days: number, hour = 12) => new Date(2026, 10, 2 + days, hour).toISOString()

describe('cardState (prd-4c-material-v3 RF-F4/RF-F11: o estado sempre em palavras)', () => {
  it('novo, atrasado, vence hoje e em dia pelo dia do calendário', () => {
    expect(cardState({ state: 'new', due: at(3) }, NOW)).toMatchObject({ standing: 'new', label: 'novo' })
    expect(cardState({ state: 'review', due: at(-1, 23) }, NOW)).toMatchObject({ standing: 'overdue', label: 'atrasado', tone: 'danger' })
    expect(cardState({ state: 'learning', due: at(0, 1) }, NOW)).toMatchObject({ standing: 'today', label: 'vence hoje' })
    expect(cardState({ state: 'review', due: at(0, 23) }, NOW).standing).toBe('today')
    expect(cardState({ state: 'review', due: at(1, 0) }, NOW)).toMatchObject({ standing: 'ok', label: 'em dia', tone: 'success' })
  })

  it('"vence em 3 d", "vence hoje", "venceu há 2 d"; vazio para card novo', () => {
    expect(dueLabel({ state: 'review', due: at(3) }, NOW)).toBe('vence em 3 d')
    expect(dueLabel({ state: 'review', due: at(0) }, NOW)).toBe('vence hoje')
    expect(dueLabel({ state: 'review', due: at(-2) }, NOW)).toBe('venceu há 2 d')
    expect(dueLabel({ state: 'new', due: null }, NOW)).toBe('')
  })

  it('origem curta: apostila com parte só quando há mais de uma, nota e questão', () => {
    expect(documentTitle('Apostila.PDF')).toBe('Apostila')
    expect(originShort({ kind: 'document', note_id: 'n', title: 'P', document_id: 'd', document_name: 'Apostila.pdf', part: { index: 2, total: 6 }, page: null })).toBe('Apostila · parte 2')
    expect(originShort({ kind: 'document', note_id: 'n', title: 'P', document_id: 'd', document_name: 'Apostila.pdf', part: { index: 1, total: 1 }, page: null })).toBe('Apostila')
    expect(originShort({ kind: 'note', note_id: 'n', title: 'Resumo', topic_id: null })).toBe('Resumo')
    expect(originShort({ kind: 'quiz', quiz_id: 'q', title: 'Simulado', question_number: 7 })).toBe('Questão 7 · Simulado')
    expect(originShort(null)).toBe('')
  })
})
