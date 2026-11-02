import { describe, expect, it } from 'vitest'
import { daysAgo, firstName, greetingHeadline, longDate, openedLabel, roundMinutes, salutation, studyDay } from '~/utils/greeting'

const at = (h: number) => new Date(2026, 10, 1, h, 30)

describe('greeting (prd-4a-hoje-v3 §5.1)', () => {
  it('saudação pela hora do aparelho', () => {
    expect(salutation(at(7))).toBe('Bom dia')
    expect(salutation(at(11))).toBe('Bom dia')
    expect(salutation(at(12))).toBe('Boa tarde')
    expect(salutation(at(17))).toBe('Boa tarde')
    expect(salutation(at(18))).toBe('Boa noite')
    expect(salutation(at(2))).toBe('Bom dia')
  })

  it('primeiro nome, com fallback', () => {
    expect(firstName('Rafael Souza')).toBe('Rafael')
    expect(firstName('  Ana  ')).toBe('Ana')
    expect(firstName('')).toBe('estudante')
    expect(firstName(null)).toBe('estudante')
  })

  it('data por extenso no dia de Brasília', () => {
    expect(longDate(new Date('2026-11-01T15:00:00Z'))).toBe('Domingo, 1 de novembro')
    // 01:00 UTC on Nov 2 is still Nov 1 in Brasília (UTC-3)
    expect(longDate(new Date('2026-11-02T01:00:00Z'))).toBe('Domingo, 1 de novembro')
    expect(studyDay(new Date('2026-11-02T01:00:00Z'))).toBe('2026-11-01')
  })

  it('minutos de 5 em 5, no mínimo 5', () => {
    expect(roundMinutes(0)).toBe(5)
    expect(roundMinutes(2)).toBe(5)
    expect(roundMinutes(12)).toBe(10)
    expect(roundMinutes(13)).toBe(15)
    expect(roundMinutes(41)).toBe(40)
  })

  it('frase com plano, tudo em dia, conta nova e só a saudação; nunca "apenas"', () => {
    const morning = at(9)
    expect(greetingHeadline('plan', 'Rafael', 41, morning)).toBe('Bom dia, Rafael. Hoje são uns 40 minutos.')
    expect(greetingHeadline('plan', 'Rafael', 1, morning)).toBe('Bom dia, Rafael. Hoje são uns 5 minutos.')
    expect(greetingHeadline('done', 'Rafael')).toBe('Tudo em dia, Rafael.')
    expect(greetingHeadline('new', 'Rafael')).toBe('Que bom ter você aqui, Rafael.')
    expect(greetingHeadline('plain', 'Rafael', 99, at(20))).toBe('Boa noite, Rafael.')
    for (const s of ['plan', 'done', 'new', 'plain'] as const) expect(greetingHeadline(s, 'X', 500)).not.toMatch(/apenas/)
  })

  it('dias atrás contam dias de estudo, não 24 h', () => {
    const now = new Date('2026-11-02T12:00:00Z')
    expect(daysAgo('2026-11-02T10:00:00Z', now)).toBe(0)
    expect(daysAgo('2026-11-01T23:00:00Z', now)).toBe(1) // 20:00 of Nov 1 in Brasília, 13 h before
    expect(daysAgo('2026-11-01T02:00:00Z', now)).toBe(2) // 23:00 of Oct 31 in Brasília
    expect(openedLabel('2026-11-02T13:00:00Z', now)).toBe('aberto hoje')
    expect(openedLabel('2026-11-01T15:00:00Z', now)).toBe('aberto ontem')
    expect(openedLabel('2026-10-29T15:00:00Z', now)).toBe('aberto há 4 dias')
    expect(daysAgo('nada', now)).toBeNull()
  })
})
