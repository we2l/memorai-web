import { describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { batchesTotal, batchPosition, batchSummary, endedBatch, studyDayEnd } from '~/composables/useReviewBatches'
import { useReviewStore, type RatingLog } from '~/stores/review'
import { reviewBatchSizeOf } from '~/utils/reviewBatch'

const log = (i: number, extra: Partial<RatingLog> = {}): RatingLog => ({
  client_id: `c${i}`, card_id: `k${i}`, rating: 3, duration_ms: 30_000, topic_id: 't1', topic_name: 'Controle', first: true, batch: 1, due: null, ...extra,
})

describe('fim do lote com memória (prd-revisao-v5-fase-a RF-F5)', () => {
  it('conta os que só voltam daqui a 1 semana ou mais pelo due novo de cada card', () => {
    const dayEnd = Date.parse('2026-11-08T23:59:59.999-03:00')
    // The API writes due = midnight UTC of today + N days
    const due = (days: number) => new Date(Date.UTC(2026, 10, 8 + days)).toISOString()
    const s = batchSummary([
      log(1, { due: due(7) }), log(2, { due: due(30) }), log(3, { due: due(6) }), log(4, { due: due(1) }),
      log(5, { rating: 1, due: null }), log(5, { first: false, due: due(9) }),
    ], null, dayEnd)
    expect(s.far).toBe(3)
    expect(s.remembered).toBe(4)
  })
})

describe('lotes da revisão (prd-4d-revisao-v3 RF-F1)', () => {
  it('total de lotes pelo session_count do botão (45 → 3; 20 → 1; 0 → 1)', () => {
    expect(batchesTotal(45)).toBe(3)
    expect(batchesTotal(20)).toBe(1)
    expect(batchesTotal(21)).toBe(2)
    expect(batchesTotal(0)).toBe(1)
  })

  it('posição: "Lote 1 de 3 · card 14 de 20"; o último lote tem o resto e cresce com extras', () => {
    expect(batchPosition(13, 0, 45)).toMatchObject({ index: 1, total: 3, card: 14, size: 20 })
    expect(batchPosition(13, 0, 45).done).toBeCloseTo(0.65)
    expect(batchPosition(40, 2, 45)).toMatchObject({ index: 3, card: 1, size: 5 })
    // Learning extras: the last batch gets longer, never a 4th
    expect(batchPosition(47, 2, 45)).toMatchObject({ index: 3, total: 3, size: 7, card: 7 })
  })

  it('fim do lote só entre lotes, até o "Próximo lote"; nunca no último nem com a sessão acabada', () => {
    expect(endedBatch(19, 0, 45, false)).toBeNull()
    expect(endedBatch(20, 0, 45, false)).toBe(1)
    expect(endedBatch(20, 1, 45, false)).toBeNull()
    expect(endedBatch(40, 1, 45, false)).toBe(2)
    expect(endedBatch(20, 0, 20, false)).toBeNull()
    expect(endedBatch(20, 0, 45, true)).toBeNull()
  })

  it('resumo: "lembrou" = 1ª avaliação 2–4; retorno de aprendizagem não conta; em dia pelo due novo; ponto fraco com ≥ 3', () => {
    const end = Date.parse('2026-11-02T23:59:59.999-03:00')
    const entries: RatingLog[] = [
      ...Array.from({ length: 17 }, (_, i) => log(i, { due: '2026-11-08T12:00:00Z' })),
      log(17, { rating: 1, topic_id: 't2', topic_name: 'Difuso', due: '2026-11-02T13:10:00Z' }),
      log(18, { rating: 1, topic_id: 't2', topic_name: 'Difuso' }),
      log(19, { rating: 1, topic_id: 't2', topic_name: 'Difuso' }),
      // the card 17 came back from learning: a 2nd rating, not a new card of the batch
      log(17, { client_id: 'r17', rating: 3, first: false, topic_id: 't2', due: '2026-11-03T12:00:00Z' }),
    ]
    const s = batchSummary(entries, 1, end)
    expect(s).toMatchObject({ size: 20, remembered: 17, percent: 85, inDay: 18 })
    expect(s.minutes).toBe(11)
    expect(s.weak).toEqual({ id: 't2', name: 'Difuso', errors: 3 })
    expect(s.errorIds).toEqual(['k17', 'k18', 'k19'])
    expect(batchSummary(entries.slice(0, 18), 1, end).weak).toBeNull()
  })

  it('fim do dia de estudo em Brasília', () => {
    expect(new Date(studyDayEnd(new Date('2026-11-02T15:00:00Z'))).toISOString()).toBe('2026-11-03T02:59:59.999Z')
  })
})

describe('store: avaliações por lote', () => {
  beforeEach(() => setActivePinia(createPinia()))
  const card = (id: string) => ({ id, state: 'review', due: null, is_learning: false, topic_id: 't', topic_name: 'T', next_intervals: { again: '', hard: '', good: '', easy: '' } }) as any

  it('conta cada card uma vez; o retorno de aprendizagem vai para o lote aberto; desfazer devolve', () => {
    const store = useReviewStore()
    store.cards = [card('a'), card('b')]
    store.reviewQueue = []
    store.processing = true // the queue is not sent in this test
    store.errorDiaryMode = 'never'
    store.rate(1)
    store.rate(3)
    expect(store.firstPass).toEqual(['a', 'b'])
    store.learningQueue = [{ card: card('a'), dueAt: 0 }]
    store.rate(3)
    expect(store.firstPass).toEqual(['a', 'b'])
    expect(store.log.map(l => [l.card_id, l.first, l.batch])).toEqual([['a', true, 1], ['b', true, 1], ['a', false, 1]])
    const last = store.undoStack.at(-1)!
    store.forgetRating(last)
    expect(store.log).toHaveLength(2)
    store.forgetRating(store.undoStack.at(-2)!)
    expect(store.firstPass).toEqual(['a'])
  })

  it('lote de 10 escolhido pela pessoa: o 11º card abre o lote 2', () => {
    const store = useReviewStore()
    store.batchSize = 10
    store.cards = Array.from({ length: 11 }, (_, i) => card(`c${i}`))
    store.reviewQueue = []
    store.processing = true
    store.errorDiaryMode = 'never'
    for (let i = 0; i < 11; i++) store.rate(3)
    expect(store.log.map(l => l.batch)).toEqual([...Array(10).fill(1), 2])
    expect(endedBatch(10, 0, 25, false, store.batchSize)).toBe(1)
    expect(batchPosition(11, 1, 25, store.batchSize)).toMatchObject({ index: 2, total: 3, card: 2, size: 10 })
  })
})

describe('tamanho do lote (/me.review_batch_size)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('10, 20 ou 30; ausente ou outro valor = 20', () => {
    expect([10, 20, 30, undefined, null, 15, 0].map(reviewBatchSizeOf)).toEqual([10, 20, 30, 20, 20, 20, 20])
  })

  it('lotes de 30: 45 cards = 2 lotes, o último com 15', () => {
    expect(batchesTotal(45, 30)).toBe(2)
    expect(batchPosition(30, 1, 45, 30)).toMatchObject({ index: 2, total: 2, card: 1, size: 15 })
  })
})
