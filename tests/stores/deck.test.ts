import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDeckStore } from '~/stores/deck'

describe('useDeckStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with empty decks', () => {
    const store = useDeckStore()
    expect(store.decks).toEqual([])
    expect(store.loading).toBe(false)
  })
})
