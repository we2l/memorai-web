import type { QuizQuestion } from '~/types'

/**
 * Answers of a question, as the API grades them (QuizService::normalizeAnswer): a multiple choice option is
 * "b) texto" and its answer is the letter; true/false is "true" | "false"; a short answer is free text.
 */
const OPTION = /^\s*([a-e])\)\s*(.*)$/is

/** "b) Texto" → { marker: "B", text: "Texto" }; an option without a letter takes the letter of its index. */
export function optionParts(option: string, index: number): { marker: string; text: string } {
  const m = option.match(OPTION)
  if (m) return { marker: m[1]!.toUpperCase(), text: m[2]!.trim() }
  return { marker: String.fromCharCode(65 + index), text: option.trim() }
}

/** The letter (multiple choice), "true"/"false", or the text itself, lowercased: what the API compares. */
export function answerLetter(q: Pick<QuizQuestion, 'type' | 'options'>, answer: string): string {
  const a = answer.trim().toLowerCase()
  if (q.type !== 'multiple_choice') return a
  const m = a.match(/^([a-e])(\)|$)/)
  if (m) return m[1]!
  const index = (q.options ?? []).findIndex(o => o.trim().toLowerCase() === a)
  return index >= 0 ? optionParts(q.options![index]!, index).marker.toLowerCase() : a
}

/** "B) Texto", "Verdadeiro", or the text: how an answer reads on screen. */
export function formatAnswer(q: Pick<QuizQuestion, 'type' | 'options'>, answer: string | null | undefined): string {
  if (!answer) return 'nada'
  if (q.type === 'true_false') return answer.trim().toLowerCase() === 'true' ? 'Verdadeiro' : 'Falso'
  if (q.type === 'multiple_choice' && q.options) {
    const letter = answerLetter(q, answer)
    const index = q.options.findIndex((o, i) => optionParts(o, i).marker.toLowerCase() === letter)
    if (index >= 0) {
      const { marker, text } = optionParts(q.options[index]!, index)
      return `${marker}) ${text}`
    }
  }
  return answer
}
