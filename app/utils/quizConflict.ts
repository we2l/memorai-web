import { getErrorStatus } from '~/utils/apiErrors'

/**
 * The 409 of a simulado (API #177): `quiz_not_in_progress` (answer, pause or finish outside in_progress, e.g. the
 * Prova's timer finished it a moment before the click), `question_already_graded` (Treino: the correction is
 * final) and `quiz_completed`. Null for any other error.
 */
export type QuizConflict = 'quiz_not_in_progress' | 'question_already_graded' | 'quiz_completed'

const CODES: QuizConflict[] = ['quiz_not_in_progress', 'question_already_graded', 'quiz_completed']

export function quizConflict(e: unknown): QuizConflict | null {
  if (getErrorStatus(e) !== 409) return null
  const err = e as { data?: { code?: unknown }, response?: { _data?: { code?: unknown } } } | null
  const code = err?.data?.code ?? err?.response?._data?.code
  return CODES.includes(code as QuizConflict) ? code as QuizConflict : null
}

/** What the screen says when the quiz is not finished yet (a finished one opens the result, no message). */
export function quizConflictMessage(code: QuizConflict): string {
  if (code === 'question_already_graded') return 'Esta questão já foi corrigida: no Treino a resposta não muda depois da correção.'
  if (code === 'quiz_completed') return 'Este simulado já foi finalizado.'
  return 'Este simulado não está mais em andamento.'
}
