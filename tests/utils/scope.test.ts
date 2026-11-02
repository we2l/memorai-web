import { afterEach, describe, expect, it } from 'vitest'
import { cadernoPath, canAddSubtopic, consumeScopeCleared, findImportedRoot, markScopeCleared, reviewPath } from '~/utils/scope'

describe('scope (prd-caderno-f1-pontes)', () => {
  afterEach(() => sessionStorage.clear())

  it('assunto até 2 níveis abaixo do caderno (RF-F6)', () => {
    expect(canAddSubtopic(0)).toBe(true) // caderno → matéria
    expect(canAddSubtopic(1)).toBe(true) // matéria → assunto
    expect(canAddSubtopic(2)).toBe(false)
    expect(canAddSubtopic(5)).toBe(false) // Anki deeper trees stay visible, without "Adicionar assunto"
  })

  it('caminhos que devolvem a pessoa ao caderno e à sessão do escopo', () => {
    expect(cadernoPath('t1')).toBe('/cadernos?topic=t1')
    expect(cadernoPath('t1', { note: 'n1' })).toBe('/cadernos?topic=t1&note=n1')
    expect(cadernoPath('t1', { tab: 'cards' })).toBe('/cadernos?topic=t1&tab=cards')
    expect(cadernoPath(null)).toBe('/cadernos')
    expect(reviewPath('t1')).toBe('/revisar?topic_id=t1')
    expect(reviewPath(undefined)).toBe('/revisar')
  })

  it('fim do import: o caderno raiz do 1º baralho importado, pelo nome (N4)', () => {
    const roots = [
      { id: 'a', name: 'Português', parent_id: null },
      { id: 'b', name: 'Inglês B2', parent_id: null },
    ]
    expect(findImportedRoot(roots, ['Inglês_B2::Vocabulary'])?.id).toBe('b')
    expect(findImportedRoot(roots, ['inglês b2'])?.id).toBe('b')
    expect(findImportedRoot(roots, ['Alemão', 'Português::Crase'])?.id).toBe('a')
    expect(findImportedRoot(roots, ['Alemão'])).toBeNull()
    expect(findImportedRoot(roots, [])).toBeNull()
  })

  it('celebração: só o caderno marcado pela própria sessão, uma vez (05/#11)', () => {
    expect(consumeScopeCleared('t1')).toBe(false)
    markScopeCleared('t1')
    expect(consumeScopeCleared('t2')).toBe(false) // switching to another caderno is no achievement
    expect(consumeScopeCleared('t1')).toBe(true)
    expect(consumeScopeCleared('t1')).toBe(false)
  })
})
