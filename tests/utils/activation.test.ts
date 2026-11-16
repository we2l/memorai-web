import { describe, expect, it } from 'vitest'
import { autoNotebookName, checklistState, hasOwnNotebook, needsOwnMaterial, notebookModeOf, ownCards, sampleTopicIds } from '~/utils/activation'
import type { Stats } from '~/types'

const stats = (over: Partial<Stats> = {}) => ({ total_cards: 8, streak: 1, cards_reviewed_today: 6, ...over }) as Stats

describe('activation (prd-ativacao-material-proprio)', () => {
  it('H1: só o exemplo e nada próprio leva ao material próprio', () => {
    expect(needsOwnMaterial(stats({ own: { materials: 0, cards: 0, sample: true } }))).toBe(true)
    expect(needsOwnMaterial(stats({ own: { materials: 1, cards: 0, sample: true } }))).toBe(false)
    expect(needsOwnMaterial(stats({ own: { materials: 0, cards: 3, sample: true } }))).toBe(false)
    expect(needsOwnMaterial(stats({ own: { materials: 0, cards: 0, sample: false } }))).toBe(false)
    // An older API without `own`: as before
    expect(needsOwnMaterial(stats())).toBe(false)
  })

  it('cards próprios: o exemplo fica de fora; API antiga conta a conta inteira', () => {
    expect(ownCards(stats({ own: { materials: 0, cards: 0, sample: true } }))).toBe(0)
    expect(ownCards(stats())).toBe(8)
    expect(ownCards(null)).toBe(0)
  })

  it('H2: os passos contam só o que não é exemplo', () => {
    const user = { first_batch_at: '2026-11-16T15:00:00Z', first_own_batch_at: null }
    expect(checklistState(stats({ own: { materials: 0, cards: 0, sample: true } }), user)).toEqual({ hasMaterial: false, hasCards: false, hasOwnBatch: false, streak: 1 })
    expect(checklistState(stats({ own: { materials: 0, cards: 2, sample: true } }), { ...user, first_own_batch_at: '2026-11-16T16:00:00Z' }))
      .toEqual({ hasMaterial: true, hasCards: true, hasOwnBatch: true, streak: 1 })
    // Without `own`: the old rule
    expect(checklistState(stats(), user, true)).toEqual({ hasMaterial: true, hasCards: true, hasOwnBatch: true, streak: 1 })
  })

  it('a subárvore dos cadernos de exemplo', () => {
    const ids = sampleTopicIds([
      { id: 'ex', parent_id: null, is_sample: true },
      { id: 'ex-a', parent_id: 'ex' },
      { id: 'ex-a-1', parent_id: 'ex-a' },
      { id: 'meu', parent_id: null },
      { id: 'meu-a', parent_id: 'meu' },
    ])
    expect([...ids].sort()).toEqual(['ex', 'ex-a', 'ex-a-1'])
  })

  it('H3: caderno próprio, nome do caderno novo e o modo', () => {
    expect(hasOwnNotebook([{ is_sample: true }])).toBe(false)
    expect(hasOwnNotebook([{ is_sample: true }, {}])).toBe(true)
    expect(autoNotebookName('Apostila_Direito Administrativo.PDF')).toBe('Apostila Direito Administrativo')
    expect(autoNotebookName(null)).toBe('Meu caderno')
    expect(autoNotebookName('a.pdf')).toBe('Meu caderno')
    const long = autoNotebookName(`${'Constitucional '.repeat(8)}.pdf`)
    expect(long.length).toBeLessThanOrEqual(60)
    expect(long.endsWith(' ')).toBe(false)
    expect(notebookModeOf('exam')).toBe('exam')
    expect(notebookModeOf('language')).toBeUndefined()
    expect(notebookModeOf(null)).toBeUndefined()
  })
})
