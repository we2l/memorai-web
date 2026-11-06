import { describe, expect, it } from 'vitest'
import type { Topic } from '~/types'
import { filterTargets, moveTargets, NEW_CADERNO, type MoveItem } from '~/utils/moveTargets'

const t = (id: string, children: Topic[] = [], parent_id: string | null = null) => ({ id, name: id.toUpperCase(), parent_id, children }) as unknown as Topic

// A (caderno) > B (matéria) > C (assunto); A > D (matéria); E (caderno) > F (matéria) > G (assunto)
const tree = [
  t('a', [t('b', [t('c', [], 'b')], 'a'), t('d', [], 'a')]),
  t('e', [t('f', [t('g', [], 'f')], 'e')]),
]

const reasons = (item: MoveItem) => Object.fromEntries(moveTargets(tree, item).map(x => [x.value, x.reason ?? 'ok']))

describe('destinos de "Mover para…"', () => {
  it('nota: qualquer lugar, menos o atual', () => {
    const r = reasons({ kind: 'note', id: 'n', name: 'N', topicId: 'b' })
    expect(r.b).toBe('é o lugar atual')
    expect(r.a).toBe('ok')
    expect(r.c).toBe('ok')
    expect(r[NEW_CADERNO]).toBeUndefined()
  })

  it('PDF igual à nota', () => {
    expect(reasons({ kind: 'pdf', id: 'p', name: 'P', topicId: 'a' }).a).toBe('é o lugar atual')
  })

  it('matéria com assunto: não cabe embaixo de outra matéria (passaria de 2 níveis)', () => {
    const r = reasons({ kind: 'topic', id: 'b', name: 'B', parentId: 'a' })
    expect(r.a).toBe('é o lugar atual')
    expect(r.b).toBe('é o que você está movendo')
    expect(r.c).toBe('fica dentro do que você está movendo')
    expect(r.d).toBe('passaria de 2 níveis')
    expect(r.e).toBe('ok')
    expect(r.f).toBe('passaria de 2 níveis')
    expect(r[NEW_CADERNO]).toBe('ok')
  })

  it('assunto sem filhos: cabe embaixo de matéria e de caderno, não de outro assunto', () => {
    const r = reasons({ kind: 'topic', id: 'c', name: 'C', parentId: 'b' })
    expect(r.d).toBe('ok')
    expect(r.e).toBe('ok')
    expect(r.g).toBe('passaria de 2 níveis')
  })

  it('caderno (raiz): sem "Virar um caderno", e com 2 níveis dentro não cabe em lugar nenhum', () => {
    const r = reasons({ kind: 'topic', id: 'e', name: 'E', parentId: null })
    expect(r[NEW_CADERNO]).toBeUndefined()
    expect(r.a).toBe('passaria de 2 níveis')
    expect(r.d).toBe('passaria de 2 níveis')
  })

  it('cards: o lugar atual só quando todos já estão nele', () => {
    expect(reasons({ kind: 'cards', ids: ['1', '2'], topicIds: ['b'] }).b).toBe('é o lugar atual')
    expect(reasons({ kind: 'cards', ids: ['1', '2'], topicIds: ['b', 'c'] }).b).toBe('ok')
    expect(reasons({ kind: 'cards', ids: ['1'], topicIds: [] }).b).toBe('ok')
  })

  it('ordem da árvore, com o nível e o caminho', () => {
    const list = moveTargets(tree, { kind: 'note', id: 'n', name: 'N', topicId: 'd' })
    expect(list.map(x => x.value)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    expect(list[2]).toMatchObject({ level: 2, path: ['A', 'B'] })
  })

  it('busca sem acento nem caixa', () => {
    const list = moveTargets([t('x', [{ ...t('y'), name: 'Direito Constitucional' }])], { kind: 'note', id: 'n', name: 'N', topicId: 'x' })
    expect(filterTargets(list, 'constitu').map(x => x.value)).toEqual(['y'])
    expect(filterTargets([{ value: 'z', name: 'Matéria', level: 0, path: [] }], 'MATERIA')).toHaveLength(1)
    expect(filterTargets(list, ' ')).toHaveLength(2)
  })
})
