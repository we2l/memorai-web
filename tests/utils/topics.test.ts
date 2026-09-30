import { describe, expect, it } from 'vitest'
import { flattenTopics } from '~/utils/topics'

type T = { id: string, children?: T[] }

describe('flattenTopics', () => {
  it('achata árvore de 3 níveis em ordem de profundidade', () => {
    const tree: T[] = [
      { id: 'a', children: [{ id: 'a1', children: [{ id: 'a1x' }] }, { id: 'a2' }] },
      { id: 'b', children: [] },
    ]
    expect(flattenTopics(tree).map(t => t.id)).toEqual(['a', 'a1', 'a1x', 'a2', 'b'])
  })

  it('árvore vazia', () => {
    expect(flattenTopics([])).toEqual([])
  })
})
