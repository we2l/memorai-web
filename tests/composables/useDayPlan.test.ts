import { describe, expect, it } from 'vitest'
import { buildDayPlan, dayMinutes, type DayPlanInput } from '~/composables/useDayPlan'
import type { Podcast, RecentNote, Stats, TopicProgress } from '~/types'

const NOW = new Date('2026-11-02T12:00:00Z')

const stats = (over: Partial<Stats> = {}): Stats => ({
  total_cards: 900, total_decks: 1, due_today: 45, reviewed_today: 20, cards_reviewed_today: 20, streak: 6,
  ratings_today: { again: 0, hard: 0, good: 0, easy: 0 },
  goal: { batch_size: 20, target_batches: 3, done_batches: 1, met: false, minutes_left: 12 },
  ...over,
})

const topic = (over: Partial<TopicProgress> & { id: string }): TopicProgress => ({
  name: over.id, parent_id: null, flashcards_count: 50, notes_count: 3, review_count: 0, progress: 0.5, session_count: 0, ...over,
})

const podcast = (over: Partial<Podcast> = {}): Podcast => ({
  id: 'p1', title: 'Seus erros de Constitucional', status: 'ready', audio_url: 'https://x/a.mp3', duration_seconds: 720,
  topic_name: 'TRF 4ª Região', created_at: '2026-11-01T10:00:00Z', ...over,
})

const note: RecentNote = {
  id: 'n1', title: 'Apostila de Direito Constitucional', topic: { id: 't-const', name: 'Direito Constitucional' },
  root: { id: 'trf', name: 'TRF 4ª Região', color: 'purple' }, source_document_id: 'd1', opened_at: '2026-11-01T21:00:00Z',
}

const input = (over: Partial<DayPlanInput> = {}): DayPlanInput => ({
  stats: stats(),
  backlog: { overdue_count: 0 } as DayPlanInput['backlog'],
  progress: [topic({ id: 'trf', name: 'TRF 4ª Região', session_count: 45 }), topic({ id: 'ing', name: 'Inglês', session_count: 0 })],
  pendingActions: [],
  podcasts: [podcast()],
  recentNote: note,
  learningMode: 'concurso',
  now: NOW,
  ...over,
})

describe('buildDayPlan (prd-4a-hoje-v3 §5.2)', () => {
  it('os 4 passos na ordem fixa, com um único primário no primeiro', () => {
    const steps = buildDayPlan(input())
    expect(steps.map(s => s.key)).toEqual(['review', 'quiz', 'listen', 'material'])
    expect(steps.filter(s => s.primary).map(s => s.key)).toEqual(['review'])
  })

  it('Revisar: o número é due_today, lotes de ~20 e minutos da meta; "de <caderno>" quando só um tem sessão', () => {
    const [review] = buildDayPlan(input())
    expect(review!.title).toBe('Revisar 45 cards de TRF 4ª Região')
    expect(review!.detail).toBe('3 lotes de ~20 · ≈ 12 min')
    expect(review!.action).toEqual({ label: 'Começar', to: '/revisar' })

    const two = buildDayPlan(input({ progress: [topic({ id: 'a', session_count: 3 }), topic({ id: 'b', session_count: 9 })] }))
    expect(two[0]!.title).toBe('Revisar 45 cards')
    // Subjects do not count as a second caderno
    const sub = buildDayPlan(input({ progress: [topic({ id: 'a', session_count: 3 }), topic({ id: 'b', parent_id: 'a', session_count: 3 })] }))
    expect(sub[0]!.title).toBe('Revisar 45 cards de a')
  })

  it('Revisar: um card, um lote; sem meta na API, minutos por 15 s por card', () => {
    const [review] = buildDayPlan(input({ stats: stats({ due_today: 1, goal: undefined }) }))
    expect(review!.title).toBe('Revisar 1 card de TRF 4ª Região')
    expect(review!.detail).toBe('1 lote · ≈ 1 min')
  })

  it('Revisar: atraso maior que a sessão aparece com "Recuperar atraso"; sobrevivência ligada também', () => {
    const [late] = buildDayPlan(input({ backlog: { overdue_count: 893 } as DayPlanInput['backlog'] }))
    expect(late!.detail).toBe('3 lotes de ~20 · ≈ 12 min · 893 atrasados')
    expect(late!.overdue).toBe(893)
    const [small] = buildDayPlan(input({ backlog: { overdue_count: 30 } as DayPlanInput['backlog'] }))
    expect(small!.overdue).toBeUndefined()
    const [survival] = buildDayPlan(input({ survivalMode: true }))
    expect(survival!.survival).toBe(true)
  })

  it('sem nada para hoje não há Revisar e o primário passa para o próximo passo', () => {
    const steps = buildDayPlan(input({ stats: stats({ due_today: 0 }) }))
    expect(steps[0]!.key).toBe('quiz')
    expect(steps[0]!.primary).toBe(true)
    expect(steps.filter(s => s.primary)).toHaveLength(1)
  })

  it('Questões: 1º alvo é a ação de erros (com o nome do assunto); depois o tópico mais fraco com ≥ 10 cards', () => {
    const progress = [
      topic({ id: 'trf', name: 'TRF', session_count: 45, progress: 0.4 }),
      topic({ id: 'ctrl', parent_id: 'trf', name: 'Controle de constitucionalidade', progress: 0.31 }),
      topic({ id: 'tiny', parent_id: 'trf', name: 'Pequeno', flashcards_count: 4, progress: 0.01 }),
      topic({ id: 'nomat', parent_id: 'trf', name: 'Sem material', notes_count: 0, progress: 0.02 }),
    ]
    const errors = buildDayPlan(input({
      progress,
      pendingActions: [{ type: 'errors', label: 'Você errou 5x em "Controle"', action_label: 'Reforçar', url: '/revisar?topic_id=ctrl&errors_only=1', topic_id: 'ctrl' }],
    })).find(s => s.key === 'quiz')!
    expect(errors.title).toBe('Questões de Controle de constitucionalidade')
    expect(errors.detail).toBe('Você errou 5 vezes esta semana')
    expect(errors.action.to).toBe('/simulados?topic_id=ctrl')

    const weakest = buildDayPlan(input({ progress })).find(s => s.key === 'quiz')!
    expect(weakest.title).toBe('Questões de Controle de constitucionalidade')
    expect(weakest.detail).toBe('Domínio 31%')
  })

  it('Questões: no empate de domínio, o assunto ganha do caderno', () => {
    const quiz = buildDayPlan(input({ progress: [
      topic({ id: 'root', name: 'TRF', progress: 0 }),
      topic({ id: 'sub', parent_id: 'root', name: 'Controle', progress: 0 }),
    ] })).find(s => s.key === 'quiz')!
    expect(quiz.title).toBe('Questões de Controle')
  })

  it('Questões não aparece no modo idiomas nem sem tópico elegível', () => {
    expect(buildDayPlan(input({ learningMode: 'language' })).map(s => s.key)).not.toContain('quiz')
    expect(buildDayPlan(input({ progress: [topic({ id: 'a', flashcards_count: 9 })] })).map(s => s.key)).not.toContain('quiz')
  })

  it('Ouvir: episódio pronto dos últimos 7 dias e não terminado; nunca oferece gerar', () => {
    const listen = buildDayPlan(input()).find(s => s.key === 'listen')!
    expect(listen.title).toBe('Ouvir: Seus erros de Constitucional')
    expect(listen.detail).toBe('12 min · TRF 4ª Região')
    expect(listen.action.podcast?.id).toBe('p1')
    expect(listen.action.to).toBeUndefined()
    expect(listen.minutes).toBe(12)

    const keys = (over: Partial<DayPlanInput>) => buildDayPlan(input(over)).map(s => s.key)
    expect(keys({ podcasts: [podcast({ completed_at: '2026-11-02T10:00:00Z' })] })).not.toContain('listen')
    expect(keys({ podcasts: [podcast({ created_at: '2026-10-20T10:00:00Z' })] })).not.toContain('listen')
    expect(keys({ podcasts: [podcast({ status: 'generating_audio' })] })).not.toContain('listen')
    expect(keys({ podcasts: [] })).not.toContain('listen')
  })

  it('Continuar material: nota dos últimos 14 dias abre o caderno com a nota', () => {
    const material = buildDayPlan(input()).find(s => s.key === 'material')!
    expect(material.mode).toBeNull()
    expect(material.title).toBe('Continuar Apostila de Direito Constitucional')
    expect(material.detail).toBe('TRF 4ª Região · aberto ontem')
    expect(material.action.to).toBe('/cadernos/t-const/material/n1')
    expect(buildDayPlan(input({ recentNote: { ...note, opened_at: '2026-10-10T10:00:00Z' } })).map(s => s.key)).not.toContain('material')
  })

  it('minutos do dia: revisão + 10 de questões + o episódio (material não conta)', () => {
    expect(dayMinutes(buildDayPlan(input()))).toBe(12 + 10 + 12)
    expect(dayMinutes([])).toBe(0)
  })

  it('sem stats não há plano', () => {
    expect(buildDayPlan(input({ stats: null, podcasts: [], recentNote: null, progress: [] }))).toEqual([])
  })

  it('Questões pelo acerto (4b-1 RF-F14): o menor acerto com ≥ 10 respondidas; no empate, o assunto', () => {
    const steps = buildDayPlan({
      stats: { due_today: 0 } as any, backlog: null, progress: [], pendingActions: [], podcasts: [], recentNote: null,
      performance: [
        { topic_id: 'root', parent_id: null, depth: 0, name: 'TRF', cards: 900, mastery: 50, questions: { answered: 40, correct: 20, accuracy: 50 }, session_count: 9 },
        { topic_id: 'sub', parent_id: 'root', depth: 2, name: 'Controle', cards: 90, mastery: 30, questions: { answered: 12, correct: 6, accuracy: 50 }, session_count: 2 },
        { topic_id: 'few', parent_id: 'root', depth: 1, name: 'Poucas', cards: 90, mastery: 30, questions: { answered: 5, correct: 0, accuracy: null }, session_count: 2 },
      ],
    })
    const quiz = steps.find(s => s.key === 'quiz')!
    expect(quiz.title).toBe('Questões de Controle')
    expect(quiz.detail).toBe('Acerto de 50% em 12 questões')
    expect(quiz.action.to).toBe('/simulados?topic_id=sub')
  })
})
