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
})
