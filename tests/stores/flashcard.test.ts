import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFlashcardStore } from '~/stores/flashcard'

describe('useFlashcardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with empty flashcards', () => {
    const store = useFlashcardStore()
    expect(store.flashcards).toEqual([])
    expect(store.loading).toBe(false)
  })
})
