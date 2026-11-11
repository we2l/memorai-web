import { describe, expect, it } from 'vitest'
import { partialRead, partialReadNotice } from '~/utils/pdfPartial'

const now = new Date('2026-11-11T15:00:00Z')

describe('partialRead (QA M1)', () => {
  it('is null when every page was read', () => {
    expect(partialRead({ processed_pages: 3, pages_count: 3, note_generation_status: 'completed' })).toBeNull()
  })

  it('is null while the note is still being written or failed', () => {
    expect(partialRead({ processed_pages: 1, pages_count: 3, note_generation_status: 'generating' })).toBeNull()
    expect(partialRead({ processed_pages: 1, pages_count: 3, note_generation_status: 'failed' })).toBeNull()
  })

  it('is null without the counts', () => {
    expect(partialRead({ processed_pages: null, pages_count: 3, note_generation_status: 'completed' })).toBeNull()
    expect(partialRead({ processed_pages: 2, pages_count: null, note_generation_status: null })).toBeNull()
  })

  it('reports the pages left out once the note is done', () => {
    expect(partialRead({ processed_pages: 100, pages_count: 240, note_generation_status: 'completed' })).toEqual({ read: 100, total: 240 })
  })
})

describe('partialReadNotice (QA M1)', () => {
  const p = { read: 100, total: 240 }

  it('offers the upgrade to the Free and the trial', () => {
    expect(partialReadNotice(p, 'free', { now })).toEqual({ text: 'Parcial: o plano grátis leu 100 de 240 páginas.', upgrade: true })
    expect(partialReadNotice(p, 'trial', { now })).toEqual({ text: 'Parcial: o teste leu 100 de 240 páginas.', upgrade: true })
  })

  it('never offers the upgrade to the paid plan: the month ran out', () => {
    const n = partialReadNotice(p, 'paid', { perPdfCap: 500, now })
    expect(n.upgrade).toBe(false)
    expect(n.text).toBe('Parcial: a IA leu 100 de 240 páginas. As páginas de PDF do mês acabaram. A contagem recomeça em 01/12.')
  })

  it('says the pages per PDF when the paid plan read up to that cap', () => {
    const n = partialReadNotice({ read: 500, total: 800 }, 'paid', { perPdfCap: 500, now })
    expect(n).toEqual({ text: 'Parcial: a IA leu 500 de 800 páginas. O limite é de 500 páginas por PDF.', upgrade: false })
  })
})
