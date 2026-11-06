import { describe, expect, it } from 'vitest'
import type { AnkiImportMapping } from '~/types'
import { cadernoLines, tagsLine } from '~/utils/ankiMapping'

const materia = (name: string, assuntos: string[] = []) => ({ name, cards: 1, assuntos: assuntos.map(a => ({ name: a, cards: 1 })) })
const mapping = (over: Partial<AnkiImportMapping> = {}): AnkiImportMapping => ({
  destination: { type: 'new' }, caderno: 'Inglês', materias: [], deep_paths: 0, tags: 0, cards: 3,
  cadernos: [{ name: 'Inglês', cards: 3, materias: [materia('Vocabulary', ['Food', 'Travel']), materia('Grammar'), materia('Listening')] }],
  ...over,
})

describe('prévia do Anki', () => {
  it('uma linha por caderno, com as matérias e os assuntos', () => {
    expect(cadernoLines(mapping())).toEqual(['Caderno: Inglês · Matérias: Vocabulary, Grammar, Listening · 2 assuntos'])
  })
  it('sem matérias e com muitas', () => {
    expect(cadernoLines(mapping({ cadernos: [{ name: 'A', cards: 1, materias: [] }] }))).toEqual(['Caderno: A'])
    const many = Array.from({ length: 8 }, (_, i) => materia(`M${i + 1}`))
    expect(cadernoLines(mapping({ cadernos: [{ name: 'A', cards: 8, materias: many }] }))[0]).toBe('Caderno: A · Matérias: M1, M2, M3, M4, M5, M6 e mais 2')
  })
  it('caminhos fundos e etiquetas', () => {
    expect(tagsLine({ deep_paths: 14, tags: 230 })).toBe('14 caminhos mais fundos e 230 etiquetas viram etiquetas')
    expect(tagsLine({ deep_paths: 1, tags: 0 })).toBe('1 caminho mais fundo vira etiqueta')
    expect(tagsLine({ deep_paths: 0, tags: 2 })).toBe('2 etiquetas do Anki continuam etiquetas')
    expect(tagsLine({ deep_paths: 0, tags: 0 })).toBe('')
  })
})
