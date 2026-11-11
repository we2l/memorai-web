import { describe, expect, it } from 'vitest'
import { canAddEditalTopic, editalCountsLabel, EDITAL_LIMITS, isEditalEdited, newEditalSubject, newEditalTopic, toEditalDraft, editalPayload, editalTopicsCount } from '~/utils/editalProposal'

const proposal = {
  name: 'TJ-SP · Escrevente',
  exam_date: null,
  subjects: [
    { name: 'Língua Portuguesa', topics: [{ name: 'Crase', description: null }, { name: 'Pontuação', description: null }] },
    { name: 'Direito Penal', topics: [{ name: 'Código Penal', description: 'Artigos 1º a 12' }] },
  ],
}

describe('editalProposal', () => {
  it('round-trips the proposal and counts', () => {
    const draft = toEditalDraft(proposal)
    expect(editalTopicsCount(draft)).toBe(3)
    expect(editalPayload(draft)).toEqual({ ...proposal, exam_date: null })
    expect(isEditalEdited(draft, proposal)).toBe(false)
    expect(editalCountsLabel(1, 1)).toBe('1 matéria, 1 assunto')
    expect(editalCountsLabel(2, 3)).toBe('2 matérias, 3 assuntos')
  })

  it('drops nameless items and flags the edit', () => {
    const draft = toEditalDraft(proposal)
    draft.subjects[0]!.topics[0]!.name = '  '
    draft.subjects.push(newEditalSubject())
    draft.subjects[1]!.topics.push({ ...newEditalTopic(), name: ' Lei 9.099 ' })
    draft.examDate = '2027-03-14'
    const body = editalPayload(draft)
    expect(body.subjects.map(s => s.name)).toEqual(['Língua Portuguesa', 'Direito Penal'])
    expect(body.subjects[0]!.topics.map(t => t.name)).toEqual(['Pontuação'])
    expect(body.subjects[1]!.topics.map(t => t.name)).toEqual(['Código Penal', 'Lei 9.099'])
    expect(body.exam_date).toBe('2027-03-14')
    expect(isEditalEdited(draft, proposal)).toBe(true)
  })

  it('stops adding at the caps', () => {
    const draft = toEditalDraft(proposal)
    const subject = draft.subjects[0]!
    subject.topics = Array.from({ length: EDITAL_LIMITS.topicsPerSubject }, () => newEditalTopic())
    expect(canAddEditalTopic(draft, subject)).toBe(false)
    expect(canAddEditalTopic(draft, draft.subjects[1]!)).toBe(true)
  })
})
