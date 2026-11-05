import { describe, expect, it } from 'vitest'
import { partMetaText, partNeighbors } from '~/utils/materialParts'
import { partProgressText } from '~/utils/scope'
import type { MaterialPart } from '~/types'

const part = (over: Partial<MaterialPart> = {}): MaterialPart => ({ note_id: 'n1', index: 1, title: 'Princípios', page_start: 1, page_end: 30, cards: 31, mastery: 62, session_count: 4, status: 'ready', ...over })

describe('materialParts (prd-4c-material-v3 4c-2)', () => {
  it('meta da parte: páginas, cards e domínio', () => {
    expect(partMetaText(part())).toBe('p. 1–30 · 31 cards · 62%')
    expect(partMetaText(part({ cards: 1, mastery: null }))).toBe('p. 1–30 · 1 card')
    expect(partMetaText(part({ page_end: 1 }))).toBe('p. 1 · 31 cards · 62%')
    expect(partMetaText(part({ cards: 0 }))).toBe('p. 1–30 · sem cards ainda')
    expect(partMetaText(part({ page_start: null, page_end: null, cards: 0 }))).toBe('sem cards ainda')
  })

  it('meta da parte: estados', () => {
    expect(partMetaText(part({ status: 'generating' }))).toBe('gerando nota…')
    expect(partMetaText(part({ status: 'processing' }))).toBe('gerando nota…')
    expect(partMetaText(part({ status: 'failed' }))).toBe('não deu para ler esta parte')
  })

  it('vizinhas: na ordem da lista, sem passar das pontas; nota fora da lista não tem vizinhas', () => {
    const parts = [part({ note_id: 'a', index: 1 }), part({ note_id: 'b', index: 2 }), part({ note_id: 'c', index: 3 })]
    expect(partNeighbors(parts, 'b').previous?.note_id).toBe('a')
    expect(partNeighbors(parts, 'b').next?.note_id).toBe('c')
    expect(partNeighbors(parts, 'a').previous).toBeNull()
    expect(partNeighbors(parts, 'c').next).toBeNull()
    expect(partNeighbors(parts, 'x')).toEqual({ previous: null, next: null })
  })

  it('progresso por parte: 3 lotes por parte; até 3 lotes é uma parte só', () => {
    expect(partProgressText(0, 3)).toBe('Escrevendo a nota · lote 1 de 3')
    expect(partProgressText(0, 18)).toBe('Escrevendo a parte 1 de 6 · lote 1 de 18')
    expect(partProgressText(2, 18)).toBe('Escrevendo a parte 1 de 6 · lote 3 de 18')
    expect(partProgressText(3, 18)).toBe('Escrevendo a parte 2 de 6 · lote 4 de 18')
    expect(partProgressText(17, 18)).toBe('Escrevendo a parte 6 de 6 · lote 18 de 18')
    expect(partProgressText(18, 18)).toBe('Escrevendo a parte 6 de 6 · lote 18 de 18')
    expect(partProgressText(0, 4)).toBe('Escrevendo a parte 1 de 2 · lote 1 de 4')
  })
})
