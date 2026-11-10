/**
 * The edital's proposal while the person edits it (prd-edital-caderno RF-F1): local keys for v-for, the caps of
 * config/edital.php (the API checks them again) and the body of POST /editais/{aiJob}/apply.
 */
import type { EditalProposal } from '~/types'

/** config/edital.php: max_subjects, max_topics_per_subject, max_topics, name_max_chars */
export const EDITAL_LIMITS = { subjects: 40, topicsPerSubject: 60, topics: 400, name: 120 } as const

export interface DraftTopic { key: number; name: string; description: string | null }
export interface DraftSubject { key: number; name: string; topics: DraftTopic[] }
export interface EditalDraft { name: string; examDate: string; subjects: DraftSubject[] }

let nextKey = 1
const key = () => nextKey++

export function toEditalDraft(proposal: EditalProposal): EditalDraft {
  return {
    name: proposal.name,
    examDate: proposal.exam_date ?? '',
    subjects: proposal.subjects.map(s => ({
      key: key(),
      name: s.name,
      topics: s.topics.map(t => ({ key: key(), name: t.name, description: t.description ?? null })),
    })),
  }
}

export function newEditalSubject(): DraftSubject {
  return { key: key(), name: '', topics: [] }
}

export function newEditalTopic(): DraftTopic {
  return { key: key(), name: '', description: null }
}

export function editalTopicsCount(draft: EditalDraft): number {
  return draft.subjects.reduce((n, s) => n + s.topics.length, 0)
}

export function canAddEditalSubject(draft: EditalDraft): boolean {
  return draft.subjects.length < EDITAL_LIMITS.subjects
}

export function canAddEditalTopic(draft: EditalDraft, subject: DraftSubject): boolean {
  return subject.topics.length < EDITAL_LIMITS.topicsPerSubject && editalTopicsCount(draft) < EDITAL_LIMITS.topics
}

/** "10 matérias, 64 assuntos" */
export function editalCountsLabel(subjects: number, topics: number): string {
  return `${subjects} ${subjects === 1 ? 'matéria' : 'matérias'}, ${topics} ${topics === 1 ? 'assunto' : 'assuntos'}`
}

/** The body of apply: names trimmed; a nameless assunto goes, a nameless matéria too (with its assuntos). */
export function editalPayload(draft: EditalDraft): { name: string; exam_date: string | null; subjects: { name: string; topics: { name: string; description: string | null }[] }[] } {
  return {
    name: draft.name.trim(),
    exam_date: draft.examDate || null,
    subjects: draft.subjects
      .filter(s => s.name.trim() !== '')
      .map(s => ({
        name: s.name.trim(),
        topics: s.topics.filter(t => t.name.trim() !== '').map(t => ({ name: t.name.trim(), description: t.description })),
      })),
  }
}

/** Whether the person changed the AI's proposal (analytics edital_applied.edited). */
export function isEditalEdited(draft: EditalDraft, original: EditalProposal): boolean {
  const now = editalPayload(draft)
  const before = { subjects: original.subjects.map(s => ({ name: s.name, topics: s.topics.map(t => ({ name: t.name, description: t.description ?? null })) })) }
  return now.name !== original.name.trim() || JSON.stringify(now.subjects) !== JSON.stringify(before.subjects)
}
