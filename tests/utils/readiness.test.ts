import { describe, expect, it } from 'vitest'
import type { ExamReadiness, ReadinessAction, ReadinessPart } from '~/types'
import { readinessActionLink, readinessMissingText, readinessPartsText } from '~/utils/readiness'
import { readinessPartText } from '~/utils/readinessExplain'

// Prontidão para a prova (prd-prontidao-prova RF-F1, §5.5): the texts and links of GET /exams readiness
const part = (over: Partial<ReadinessPart> & Pick<ReadinessPart, 'key'>): ReadinessPart => ({ label: over.key, value: 50, weight: 0.2, enabled: true, ...over })

describe('readinessPartsText', () => {
  it('as partes ligadas numa linha; questões sem dado dizem que falta medir; desligada some', () => {
    expect(readinessPartsText([
      part({ key: 'memory', value: 88 }),
      part({ key: 'on_track', value: 95 }),
      part({ key: 'questions', value: null }),
      part({ key: 'coverage', value: null, enabled: false }),
    ])).toBe('Memória 88 · Em dia 95 · Questões: falta medir')
  })
})

describe('readinessPartText', () => {
  it('cada parte com o peso e o detalhe', () => {
    expect(readinessPartText(part({ key: 'memory', label: 'Memória no dia da prova', value: 88, weight: 0.5, keep_pace: 88, stop_today: 61 })))
      .toBe('Memória no dia da prova (peso 50%): 88 (lembrando 88% mantendo o ritmo, 61% se parar hoje).')
    expect(readinessPartText(part({ key: 'on_track', label: 'Revisões em dia', value: 95, weight: 0.15, late: 1, in_review: 20 })))
      .toBe('Revisões em dia (peso 15%): 95 (1 card atrasado de 20).')
    expect(readinessPartText(part({ key: 'questions', label: 'Acerto em questões', value: null, answered: 4, min_answered: 10 })))
      .toBe('Acerto em questões (peso 20%): aparece com 10 questões respondidas (você tem 4).')
  })
})

describe('readinessMissingText', () => {
  const missing = (cards: number, graduated: number) => ({ missing: { cards, cards_needed: 20, graduated, graduated_needed: 10 } }) as ExamReadiness

  it('primeiro os cards que faltam, depois as revisões', () => {
    expect(readinessMissingText(missing(19, 0))).toBe('Crie mais 1 card dos assuntos da prova para ver sua prontidão.')
    expect(readinessMissingText(missing(30, 3))).toBe('Revise mais 7 cards da prova para ver sua prontidão.')
    expect(readinessMissingText(null)).toBe('Revise alguns cards dos assuntos da prova para ver sua prontidão.')
  })
})

describe('readinessActionLink', () => {
  it.each<[ReadinessAction, string, string]>([
    [{ kind: 'review_late', count: 12, topic_id: 't' }, '/revisar?scope=topic:t&backlog=1', 'Revise os 12 cards atrasados da prova'],
    [{ kind: 'review_late', count: 1, topic_id: null }, '/revisar?backlog=1', 'Revise o card atrasado da prova'],
    [{ kind: 'follow_plan', count: 8 }, '/revisar', 'Siga o plano do atraso: 8 cards'],
    [{ kind: 'raise_new', per_day: 25, new_cards: 180 }, '/configuracoes#estudo', 'Veja 25 cards novos por dia para alcançar todos até a prova'],
    [{ kind: 'practice_weak', topic_id: 'a', topic_name: 'Direito Administrativo', accuracy: 45 }, '/simulados?topic_id=a&count=10', 'Faça 10 questões de Direito Administrativo: acerto 45%'],
    [{ kind: 'practice_start', topic_id: 'r', answered: 3, min_answered: 10 }, '/simulados?topic_id=r&count=10', 'Faça 10 questões da prova para medir seu acerto'],
    [{ kind: 'review_weak', topic_id: 'p', topic_name: 'Português', mastery: 31.6 }, '/revisar?scope=topic:p', 'Revise Português: domínio 32%'],
    [{ kind: 'create_cards', topic_id: 'c', topic_name: 'Ética' }, '/cadernos/c', 'Crie cards de Ética: nenhum card cobre esse assunto'],
  ])('%o', (action, to, label) => {
    expect(readinessActionLink(action)).toEqual({ to, label })
  })

  it('nenhum texto fala em chance ou aprovação (DD2)', () => {
    const all = [
      readinessActionLink({ kind: 'practice_start', topic_id: null, answered: 0, min_answered: 10 }).label,
      readinessMissingText(null),
      readinessPartsText([part({ key: 'memory' })]),
    ].join(' ')
    expect(all).not.toMatch(/chance|aprova/i)
  })
})
