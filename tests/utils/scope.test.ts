import { afterEach, describe, expect, it } from 'vitest'
import { cadernoPath, canAddSubtopic, consumeScopeCleared, findImportedRoot, legacyCadernoRedirect, markScopeCleared, materialPath, scopeTopicOfRoute } from '~/utils/scope'
import { reviewPath, scopeBackPath, scopeOf, scopeQuery, sessionScopeFromQuery } from '~/utils/reviewScope'

describe('scope (prd-caderno-f1-pontes)', () => {
  afterEach(() => sessionStorage.clear())

  it('assunto até 2 níveis abaixo do caderno (RF-F6)', () => {
    expect(canAddSubtopic(0)).toBe(true) // caderno → matéria
    expect(canAddSubtopic(1)).toBe(true) // matéria → assunto
    expect(canAddSubtopic(2)).toBe(false)
    expect(canAddSubtopic(5)).toBe(false) // Anki deeper trees stay visible, without "Adicionar assunto"
  })

  it('caminhos que devolvem a pessoa ao caderno e à sessão do escopo', () => {
    expect(cadernoPath('t1')).toBe('/cadernos/t1')
    expect(cadernoPath('t1', { note: 'n1' })).toBe('/cadernos/t1/material/n1')
    expect(materialPath('t1', 'n1')).toBe('/cadernos/t1/material/n1')
    expect(cadernoPath('t1', { view: 'cards' })).toBe('/cadernos/t1/cards')
    expect(cadernoPath('t1', { view: 'cards', sourceNoteId: 'n1' })).toBe('/cadernos/t1/cards?source_note_id=n1')
    expect(cadernoPath('t1', { view: 'mapa' })).toBe('/cadernos/t1/mapa')
    expect(cadernoPath(null)).toBe('/cadernos')
    expect(reviewPath('t1')).toBe('/revisar?topic_id=t1')
    expect(reviewPath(undefined)).toBe('/revisar')
  })

  it('URLs antigas (?topic=, &note=, &tab=cards|map, &highlight=) vão para as rotas novas (4b-1 RF-F1)', () => {
    expect(legacyCadernoRedirect({})).toBeNull()
    expect(legacyCadernoRedirect({ action: 'new-notebook' })).toBeNull()
    expect(legacyCadernoRedirect({ topic: 't1' })).toBe('/cadernos/t1')
    expect(legacyCadernoRedirect({ topic: 't1', note: 'n1', tab: 'cards' })).toBe('/cadernos/t1/material/n1')
    expect(legacyCadernoRedirect({ topic: 't1', tab: 'cards' })).toBe('/cadernos/t1/cards')
    expect(legacyCadernoRedirect({ topic: 't1', tab: 'cards', highlight: 'c9' })).toBe('/cadernos/t1/cards?highlight=c9')
    expect(legacyCadernoRedirect({ topic: 't1', tab: 'map' })).toBe('/cadernos/t1/mapa')
    expect(legacyCadernoRedirect({ topic: ['t1'], tab: 'notes' })).toBe('/cadernos/t1')
  })

  it('escopo da rota: o hub e as rotas dele pelo parâmetro; revisão e simulados por ?topic_id=', () => {
    expect(scopeTopicOfRoute({ path: '/cadernos/t1', params: { id: 't1' }, query: {} })).toBe('t1')
    expect(scopeTopicOfRoute({ path: '/cadernos/t1/material/n1', params: { id: 't1', noteId: 'n1' }, query: {} })).toBe('t1')
    expect(scopeTopicOfRoute({ path: '/revisar', params: {}, query: { topic_id: 't2' } })).toBe('t2')
    expect(scopeTopicOfRoute({ path: '/cadernos', params: {}, query: {} })).toBeNull()
    expect(scopeTopicOfRoute({ path: '/hoje', params: {}, query: {} })).toBeNull()
  })

  it('recortes da F2: reviewPath com scope, card_ids, origin, ahead e errors_only', () => {
    const doc = '01a19af3-922b-70c5-89fb-feaa0e12085d'
    expect(reviewPath({ type: 'document', id: doc })).toBe(`/revisar?scope=document:${doc}`)
    expect(reviewPath({ type: 'note', id: doc }, { errorsOnly: true })).toBe(`/revisar?scope=note:${doc}&errors_only=1`)
    expect(reviewPath({ type: 'document', id: doc }, { ahead: true })).toBe(`/revisar?scope=document:${doc}&ahead=1`)
    expect(reviewPath({ type: 'topic', id: doc }, { origin: 'quiz' })).toBe(`/revisar?scope=topic:${doc}&origin=quiz`)
    expect(reviewPath({ type: 'cards', ids: ['a', 'b'] })).toBe('/revisar?scope=cards&card_ids=a,b')
    expect(reviewPath('t1', { errorsOnly: true })).toBe('/revisar?topic_id=t1&errors_only=1')
    expect(scopeQuery({ type: 'quiz', id: doc }, { errorsOnly: true })).toBe(`scope=quiz:${doc}&errors_only=1`)
  })

  it('lê o recorte da URL do /revisar (ida e volta com reviewPath)', () => {
    const doc = '01a19af3-922b-70c5-89fb-feaa0e12085d'
    expect(sessionScopeFromQuery({ scope: `document:${doc}`, ahead: '1' })).toEqual({ scope: { type: 'document', id: doc }, ahead: true })
    expect(sessionScopeFromQuery({ scope: 'cards', card_ids: 'a,b' })).toEqual({ scope: { type: 'cards', ids: ['a', 'b'] } })
    expect(sessionScopeFromQuery({ topic_id: 't1', errors_only: '1' })).toEqual({ topicId: 't1', errorsOnly: true })
    expect(sessionScopeFromQuery({ scope: 'foo:1', origin: 'x' })).toEqual({})
    expect(sessionScopeFromQuery({ scope: `topic:${doc}`, origin: 'loose' })).toEqual({ scope: { type: 'topic', id: doc }, origin: 'loose' })
  })

  it('voltar ao recorte: caderno, caderno com a nota, resultado do simulado, episódios; lista = sem destino', () => {
    const topic = { id: 't1', name: 'Constitucional' }
    expect(scopeBackPath({ type: 'topic', id: 't1', label: 'TRF', topic: null })).toBe('/cadernos/t1')
    expect(scopeBackPath({ type: 'document', id: 'd1', label: 'Apostila', topic })).toBe('/cadernos/t1')
    expect(scopeBackPath({ type: 'note', id: 'n1', label: 'Nota', topic })).toBe('/cadernos/t1/material/n1')
    expect(scopeBackPath({ type: 'quiz', id: 'q1', label: 'Simulado', topic })).toBe('/simulados/q1/resultado')
    expect(scopeBackPath({ type: 'podcast', id: 'p1', label: 'Episódio', topic })).toBe('/podcasts')
    expect(scopeBackPath({ type: 'cards', id: null, label: 'Cards selecionados', topic: null })).toBeNull()
    expect(scopeBackPath(null)).toBeNull()
    expect(scopeOf({ type: 'quiz', id: 'q1', label: 'S', topic })).toEqual({ type: 'quiz', id: 'q1' })
    expect(scopeOf({ type: 'cards', id: null, label: 'C', topic: null }, ['a'])).toEqual({ type: 'cards', ids: ['a'] })
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
