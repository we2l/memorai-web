import { describe, expect, it } from 'vitest'
import { gateFromError, requirementText } from '~/utils/studyRequirement'

describe('requirementText (prd-caderno-f1-pontes RF-F5)', () => {
  it('nada a dizer quando o caderno já pode', () => {
    expect(requirementText({ ok: true })).toBeNull()
    expect(requirementText(null)).toBeNull()
    expect(requirementText(undefined)).toBeNull()
  })

  it('revisões: "Revise 5 cards para liberar · faltam 3"', () => {
    expect(requirementText({ ok: false, code: 'needs_reviewed_cards', requirement: { required: 5, current: 2 } }))
      .toBe('Revise 5 cards para liberar · faltam 3')
    expect(requirementText({ ok: false, code: 'needs_reviewed_cards', requirement: { required: 5, current: 4 } }))
      .toBe('Revise 5 cards para liberar · falta 1')
  })

  it('cards (podcast): criar e revisar, sem a conta "faltam 1" de 1', () => {
    expect(requirementText({ ok: false, code: 'needs_cards', requirement: { required: 1, current: 0 } }))
      .toBe('Crie cards e faça 5 revisões para liberar')
  })

  it('material: palavras em notas, com o que falta', () => {
    expect(requirementText({ ok: false, code: 'needs_material', requirement: { required: 100, current: 60 } }))
      .toBe('Escreva 100 palavras em notas para liberar · faltam 40')
  })

  it('código desconhecido: a mensagem da API, nunca vazio', () => {
    expect(requirementText({ ok: false, code: 'needs_future_thing', message: 'Falta algo.' })).toBe('Falta algo.')
    expect(requirementText({ ok: false })).toBe('Este caderno ainda não tem material suficiente.')
  })
})

describe('gateFromError', () => {
  // ofetch FetchError: status + data (the body)
  const fetchError = (status: number, data: unknown) => Object.assign(new Error('x'), { status, statusCode: status, data })

  it('422 com code vira o mesmo requisito do /details', () => {
    const e = fetchError(422, {
      message: 'Revise mais cards neste caderno antes de gerar um podcast: mínimo 5 revisões (faltam 3).',
      code: 'needs_reviewed_cards',
      requirement: { required: 5, current: 2 },
      errors: { topic_id: ['…'] },
    })
    const gate = gateFromError(e)
    expect(gate).toMatchObject({ ok: false, code: 'needs_reviewed_cards', requirement: { required: 5, current: 2 } })
    expect(requirementText(gate)).toBe('Revise 5 cards para liberar · faltam 3')
  })

  it('outros erros não são requisito: 422 de validação sem code, 500, rede', () => {
    expect(gateFromError(fetchError(422, { message: 'Dados inválidos', errors: { types: ['x'] } }))).toBeNull()
    expect(gateFromError(fetchError(500, { message: 'Server Error', code: 'needs_cards' }))).toBeNull()
    expect(gateFromError(new TypeError('Failed to fetch'))).toBeNull()
  })

  it('requisito sem números continua um requisito', () => {
    expect(gateFromError(fetchError(422, { code: 'needs_material' }))).toEqual({ ok: false, code: 'needs_material', requirement: undefined, message: undefined })
  })
})
