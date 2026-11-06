import { describe, expect, it } from 'vitest'
import { outlineOf } from '~/composables/useNoteOutline'

describe('sumário "Nesta parte" (prd-4c-material-v3 RF-F3)', () => {
  it('H1–H3 do JSON, em ordem, inclusive dentro de blocos; H4+ e parágrafos ficam fora', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Conceito' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'texto' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Espécies ' }, { type: 'text', marks: [{ type: 'bold' }], text: 'quanto ao momento' }] },
        { type: 'callout', content: [{ type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Pegadinha' }] }] },
        { type: 'heading', attrs: { level: 4 }, content: [{ type: 'text', text: 'Fora' }] },
        { type: 'heading', attrs: { level: 2 } },
      ],
    }
    expect(outlineOf(doc)).toEqual([
      { index: 0, level: 1, text: 'Conceito' },
      { index: 1, level: 2, text: 'Espécies quanto ao momento' },
      { index: 2, level: 3, text: 'Pegadinha' },
      { index: 3, level: 2, text: 'Sem título' },
    ])
  })

  it('nota vazia ou sem títulos: nada', () => {
    expect(outlineOf(null)).toEqual([])
    expect(outlineOf({ type: 'doc', content: [{ type: 'paragraph' }] })).toEqual([])
  })
})
