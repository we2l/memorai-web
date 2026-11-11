/**
 * The 409 of a simulado (API #177): `quiz_not_in_progress` (answer, pause or finish outside in_progress, e.g. the
 * Prova's timer finished it a moment before the click), `question_already_graded` (Treino: the correction is
 * final) and `quiz_completed`. Null for any other error.
 */
export type QuizConflict = 'quiz_not_in_progress' | 'question_already_graded' | 'quiz_completed'

const CODES: QuizConflict[] = ['quiz_not_in_progress', 'question_already_graded', 'quiz_completed']

export function quizConflict(e: unknown): QuizConflict | null {
  // The status read here (not utils/apiErrors): the quiz store is in the result's chunk (budget 19.5 KB)
  const err = e as { data?: { code?: unknown }, response?: { status?: number, _data?: { code?: unknown } }, status?: number, statusCode?: number } | null
  if ((err?.response?.status ?? err?.statusCode ?? err?.status) !== 409) return null
  const code = err?.data?.code ?? err?.response?._data?.code
  return CODES.includes(code as QuizConflict) ? code as QuizConflict : null
}
