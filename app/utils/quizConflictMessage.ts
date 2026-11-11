import type { QuizConflict } from '~/utils/quizConflict'

// Apart from utils/quizConflict: the quiz store (in the result's chunk) only needs the code, the page the words
/** What the screen says when the quiz is not finished yet (a finished one opens the result, no message). */
export function quizConflictMessage(code: QuizConflict): string {
  if (code === 'question_already_graded') return 'Esta questão já foi corrigida: no Treino a resposta não muda depois da correção.'
  if (code === 'quiz_completed') return 'Este simulado já foi finalizado.'
  return 'Este simulado não está mais em andamento.'
}
