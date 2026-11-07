/**
 * The pasted question as the sheet edits it, and its payload for POST /pasted-questions (prd-questao-errada
 * RF-F2, §4). The limits mirror CreatePastedQuestionsRequest (RN-2); the check here only spares a round trip,
 * the API still validates.
 */
import type { Alternative, ParsedQuestion, QuestionKind } from '~/utils/questionParser'

export interface QuestionDraft {
  kind: QuestionKind
  stem: string
  alternatives: Alternative[]
  answer: string
  explanation: string
  source: string
  raw: string
  warnings: ParsedQuestion['warnings']
  error_reason: '' | ErrorReasonValue
  error_note: string
}

export type ErrorReasonValue = 'confused' | 'didnt_know' | 'forgot' | 'silly_mistake'

export const QUESTION_LIMITS = {
  questions: 20,
  raw: 8000,
  stem: 3000,
  alternative: 400,
  openAnswer: 1500,
  explanation: 2500,
  errorNote: 300,
  source: 120,
  /** The whole paste (20 questions of a long exam) */
  paste: 60000,
} as const

/** The four reasons of the error diary (ErrorReason in the API). */
export const ERROR_REASONS: { value: ErrorReasonValue, label: string }[] = [
  { value: 'confused', label: 'Confundi' },
  { value: 'didnt_know', label: 'Não sabia' },
  { value: 'forgot', label: 'Esqueci' },
  { value: 'silly_mistake', label: 'Erro bobo' },
]

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export function toDraft(q: ParsedQuestion): QuestionDraft {
  return {
    ...q,
    stem: q.stem.slice(0, QUESTION_LIMITS.stem),
    alternatives: q.alternatives.slice(0, 6).map(a => ({ ...a, text: a.text.slice(0, QUESTION_LIMITS.alternative) })),
    explanation: q.explanation.slice(0, QUESTION_LIMITS.explanation),
    source: q.source.slice(0, QUESTION_LIMITS.source),
    error_reason: '',
    error_note: '',
  }
}

/** A, B, C… in order after an alternative is added or removed. */
export function relabel(alternatives: Alternative[]): Alternative[] {
  return alternatives.slice(0, 6).map((a, i) => ({ ...a, letter: LETTERS[i]! }))
}

/** The one line the editor shows above a question the parser could not finish. */
export function draftWarning(q: QuestionDraft): string {
  if (q.kind === 'multiple_choice' && q.alternatives.length < 2) return 'Não achamos as alternativas: escreva pelo menos duas ou mude o tipo.'
  if (!q.answer.trim()) {
    if (q.warnings.includes('answer_not_in_alternatives')) return 'O gabarito colado não bate com as alternativas: marque a resposta certa.'
    return q.kind === 'open' ? 'Não achamos a resposta: escreva a resposta esperada.' : 'Não achamos o gabarito: marque a resposta certa.'
  }
  return ''
}

/** The errors the API would give, before sending (keys as in the 422: stem, answer, alternatives.0.text). */
export function draftErrors(q: QuestionDraft): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!q.stem.trim()) errors.stem = q.kind === 'true_false' ? 'Falta a afirmação.' : 'Falta o enunciado da questão.'
  if (q.kind === 'multiple_choice') {
    if (q.alternatives.length < 2) errors.alternatives = 'Escreva pelo menos duas alternativas.'
    q.alternatives.forEach((a, i) => { if (!a.text.trim()) errors[`alternatives.${i}.text`] = `Falta o texto da alternativa ${a.letter}.` })
    if (!q.alternatives.some(a => a.letter === q.answer)) errors.answer = 'Marque o gabarito.'
  } else if (q.kind === 'true_false') {
    if (q.answer !== 'certo' && q.answer !== 'errado') errors.answer = 'Marque Certo ou Errado.'
  } else if (!q.answer.trim()) {
    errors.answer = 'Escreva a resposta esperada.'
  }
  return errors
}

/** The body of one question for POST /pasted-questions. */
export function draftPayload(q: QuestionDraft) {
  return {
    kind: q.kind,
    stem: q.stem.trim(),
    ...(q.kind === 'multiple_choice' ? { alternatives: q.alternatives.map(a => ({ letter: a.letter, text: a.text.trim() })) } : {}),
    answer: q.answer.trim(),
    explanation: q.explanation.trim() || null,
    error_reason: q.error_reason || null,
    error_note: q.error_note.trim() || null,
    source: q.source.trim() || null,
    raw_text: q.raw.slice(0, QUESTION_LIMITS.raw) || null,
  }
}

/** The 422 of the API by question: {"questions.1.answer": [..]} → [{}, {answer: ".."}]. */
export function splitQuestionErrors(errors: Record<string, string>, count: number): Record<string, string>[] {
  const out: Record<string, string>[] = Array.from({ length: count }, () => ({}))
  for (const [key, message] of Object.entries(errors)) {
    const m = /^questions\.(\d+)\.(.+)$/.exec(key)
    if (m && out[Number(m[1])]) out[Number(m[1])]![m[2]!] = message
  }
  return out
}
