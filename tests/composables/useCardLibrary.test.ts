import { describe, expect, it } from 'vitest'
import { filtersFromQuery, filtersToQuery, hasFilters, libraryParams } from '~/composables/useCardLibrary'

const NOTE = '01a19844-6b35-7268-a625-2191f1f88201'

describe('filtros da biblioteca na URL (prd-4c-material-v3 RF-F10)', () => {
  it('lê a URL e descarta valores desconhecidos; ?source_note_id= antigo vira origin=note:', () => {
    expect(filtersFromQuery({ q: ' difuso ', state: 'due,foo,learning,due', origin: 'quiz', errors: '1', tag: 'pegadinha', sort: 'lapses' }))
      .toEqual({ q: 'difuso', state: ['due', 'learning'], origin: 'quiz', errors: true, leech: false, tag: 'pegadinha', sort: 'lapses' })
    expect(filtersFromQuery({ source_note_id: NOTE }).origin).toBe(`note:${NOTE}`)
    expect(filtersFromQuery({ origin: 'note:nao-e-uuid', sort: 'x' })).toMatchObject({ origin: '', sort: 'due' })
  })

  it('escreve só o que difere do padrão (ida e volta)', () => {
    const f = filtersFromQuery({ state: 'new', origin: `document:${NOTE}` })
    expect(filtersToQuery(f)).toEqual({ state: 'new', origin: `document:${NOTE}` })
    expect(filtersFromQuery(filtersToQuery(f))).toEqual(f)
    expect(hasFilters(filtersFromQuery({ sort: 'created' }))).toBe(false)
    expect(hasFilters(f)).toBe(true)
  })

  it('pedido em modo cursor: limit, sort e filtros; busca de 1 letra não vai (a API pede ≥ 2)', () => {
    const f = filtersFromQuery({ q: 'a', state: 'due', errors: '1' })
    expect(libraryParams(f)).toEqual({ limit: 50, sort: 'due', state: 'due', errors: 1 })
    expect(libraryParams(filtersFromQuery({ q: 'ab' }), 'CUR', 8)).toEqual({ limit: 8, sort: 'due', cursor: 'CUR', q: 'ab' })
  })

  it('"Não estão colando" e "Pausados" (prd-revisao-v5-fase-b RF-F8)', () => {
    const f = filtersFromQuery({ leech: '1', state: 'suspended' })
    expect(f).toMatchObject({ leech: true, state: ['suspended'] })
    expect(filtersToQuery(f)).toEqual({ state: 'suspended', leech: '1' })
    expect(libraryParams(f)).toEqual({ limit: 50, sort: 'due', state: 'suspended', leech: 1 })
    expect(hasFilters(filtersFromQuery({ leech: '1' }))).toBe(true)
  })
})
