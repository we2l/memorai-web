import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useReviewStore } from '~/stores/review'

describe('useReviewStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with empty state', () => {
    const store = useReviewStore()
    expect(store.cards).toEqual([])
    expect(store.currentIndex).toBe(0)
    expect(store.flipped).toBe(false)
    expect(store.finished).toBe(false)
    expect(store.noteSnippet).toBeNull()
  })

  it('currentCard returns null when empty', () => {
    const store = useReviewStore()
    expect(store.currentCard).toBeNull()
  })

  it('progress is 0 when empty', () => {
    const store = useReviewStore()
    expect(store.progress).toBe(0)
  })

  it('flip sets flipped to true', () => {
    const store = useReviewStore()
    store.flip()
    expect(store.flipped).toBe(true)
  })

  it('currentCard returns from main queue', () => {
    const store = useReviewStore()
    const card = { id: '1', next_intervals: { again: '1min', hard: '1min', good: '10min', easy: '8d' } } as any
    store.cards = [card]
    expect(store.currentCard?.id).toBe('1')
  })

  it('currentCard returns due learning card over main queue', () => {
    const store = useReviewStore()
    const mainCard = { id: 'main', next_intervals: {} } as any
    const learnCard = { id: 'learn', next_intervals: {} } as any
    store.cards = [mainCard]
    store.learningQueue = [{ card: learnCard, dueAt: Date.now() - 1000 }]
    expect(store.currentCard?.id).toBe('learn')
  })

  it('currentCard skips future learning cards', () => {
    const store = useReviewStore()
    const mainCard = { id: 'main', next_intervals: {} } as any
    const futureCard = { id: 'future', next_intervals: {} } as any
    store.cards = [mainCard]
    store.learningQueue = [{ card: futureCard, dueAt: Date.now() + 60000 }]
    expect(store.currentCard?.id).toBe('main')
  })

  it('checkFinished does not finish when learning queue has items', () => {
    const store = useReviewStore()
    store.cards = [{ id: '1' } as any]
    store.currentIndex = 1
    store.learningQueue = [{ card: { id: '2' } as any, dueAt: Date.now() + 60000 }]
    store.checkFinished()
    expect(store.finished).toBe(false)
  })

  it('checkFinished finishes when both queues empty', () => {
    const store = useReviewStore()
    store.cards = [{ id: '1' } as any]
    store.currentIndex = 1
    store.learningQueue = []
    store.checkFinished()
    expect(store.finished).toBe(true)
  })

  it('pendingLearning returns queue length', () => {
    const store = useReviewStore()
    store.learningQueue = [
      { card: {} as any, dueAt: Date.now() },
      { card: {} as any, dueAt: Date.now() },
    ]
    expect(store.pendingLearning).toBe(2)
  })

  it('_tick is reactive for learning queue re-evaluation', () => {
    const store = useReviewStore()
    expect(store._tick).toBe(0)
    store._tick++
    expect(store._tick).toBe(1)
  })
})
