import { describe, expect, it } from 'vitest'
import { contentsText, keepsText, organizationError, purgeText, trashKindLabel, trashMessage } from '~/utils/organization'

const refused = (status: number, data: unknown) => Object.assign(new Error('x'), { response: { status }, data })

describe('organizationError: cada code em texto legível, com o próximo passo', () => {
  it.each([
    ['cycle', /dentro dele mesmo/],
    ['depth_exceeded', /passaria de 2 níveis/],
    ['part_of_document', /Mova o PDF inteiro/],
  ])('%s', (code, text) => {
    const view = organizationError(refused(422, { code, message: 'cru' }))
    expect(view?.message).toMatch(text)
    expect(view?.message).not.toContain('cru')
  })

  it('destination_in_trash aponta a lixeira', () => {
    const view = organizationError(refused(422, { code: 'destination_in_trash' }))
    expect(view?.next).toEqual({ label: 'Abrir a lixeira', to: '/cadernos/lixeira' })
  })

  it('exam_coverage aponta a prova com título e data, no mover e no restaurar', () => {
    const data = { code: 'exam_coverage', requirement: { exam: { id: 'e1', title: 'TRF 2027', exam_date: '2026-11-12' } } }
    const move = organizationError(refused(422, data))
    expect(move?.message).toContain('A prova “TRF 2027” (12/11/2026)')
    expect(move?.message).toContain('Tire a matéria da prova')
    expect(move?.next?.to).toBe('/progresso#provas')
    expect(organizationError(refused(422, data), 'restore')?.message).toContain('Edite a cobertura da prova')
  })

  it('exam_coverage sem requirement não quebra', () => {
    expect(organizationError(refused(422, { code: 'exam_coverage' }))?.message).toMatch(/^Uma prova cobre/)
  })

  it('parent_in_trash (409) diz para restaurar o lugar de origem', () => {
    expect(organizationError(refused(409, { code: 'parent_in_trash' }), 'restore')?.message).toMatch(/Restaure-o primeiro/)
  })

  it('sem code conhecido ou com outro status: null (o texto é de quem chamou)', () => {
    expect(organizationError(refused(422, { code: 'outra_coisa' }))).toBeNull()
    expect(organizationError(refused(422, { message: 'x' }))).toBeNull()
    expect(organizationError(refused(500, { code: 'cycle' }))).toBeNull()
    expect(organizationError(new Error('rede'))).toBeNull()
  })
})

describe('prévia da exclusão', () => {
  it('caderno: matérias e assuntos, materiais e cards, com milhar', () => {
    expect(trashMessage({ subjects: 8, materials: 14, cards: 2200 })).toBe('Vão junto 8 matérias e assuntos, 14 materiais e 2.200 cards. Você pode restaurar por 30 dias.')
  })
  it('singular e matéria com assuntos', () => {
    expect(trashMessage({ cards: 1 })).toBe('Vai junto 1 card. Você pode restaurar por 30 dias.')
    expect(contentsText({ subjects: 1 })).toBe('1 matéria')
    expect(contentsText({ subjects: 3, cards: 2 }, 1)).toBe('3 assuntos e 2 cards')
  })
  it('sem nada dentro: só o que dá para fazer', () => {
    expect(trashMessage({ subjects: 0, materials: 0, cards: 0 })).toBe('Você pode restaurar por 30 dias.')
  })
  it('PDF: as partes e os cards', () => {
    expect(trashMessage({ parts: 6, cards: 148 })).toBe('Vão junto 6 partes e 148 cards. Você pode restaurar por 30 dias.')
  })
  it('simulados e episódios continuam na biblioteca', () => {
    expect(keepsText({ quizzes: 3, podcasts: 2 })).toMatch(/^3 simulados e 2 episódios continuam/)
    expect(keepsText({ quizzes: 1, podcasts: 0 })).toMatch(/^1 simulado continua/)
    expect(keepsText({ quizzes: 0, podcasts: 0 })).toBe('')
    expect(keepsText(null)).toBe('')
  })
})

describe('linha da lixeira', () => {
  const now = new Date('2026-11-04T12:00:00Z').getTime()
  it('dias até o expurgo, arredondados para cima', () => {
    expect(purgeText('2026-11-27T12:00:00Z', now)).toBe('apaga em 23 dias')
    expect(purgeText('2026-11-05T06:00:00Z', now)).toBe('apaga amanhã')
    expect(purgeText('2026-11-04T06:00:00Z', now)).toBe('apaga hoje')
  })
  it('o tipo pelo que era e onde estava', () => {
    expect(trashKindLabel({ kind: 'document' })).toBe('PDF')
    expect(trashKindLabel({ kind: 'note' })).toBe('Nota')
    expect(trashKindLabel({ kind: 'topic', origin: null })).toBe('Caderno')
    expect(trashKindLabel({ kind: 'topic', origin: { id: 'r', name: 'R', in_trash: false } })).toBe('Matéria ou assunto')
  })
})
