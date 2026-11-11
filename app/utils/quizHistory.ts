import type { Quiz } from '~/types'

/** Ceiling of the history /praticar reads: 20 pages of 15 = 300 quizzes. */
export const QUIZ_HISTORY_MAX_PAGES = 20

type Page = { data: Quiz[]; meta?: { last_page?: number } }

/**
 * The whole history: GET /quizzes pages 15 at a time (in progress first, then the newest). /praticar filters it by
 * caderno and counts it, so page 1 alone lost quizzes after the 15th (auditoria 2026-11 BUG-16). The other pages come
 * in parallel, up to QUIZ_HISTORY_MAX_PAGES. Imported on demand by the quiz store: the result's chunk is at its budget.
 */
export async function fetchQuizHistory(get: (page: number) => Promise<Page>): Promise<Quiz[]> {
  const first = await get(1)
  const last = Math.min(first.meta?.last_page ?? 1, QUIZ_HISTORY_MAX_PAGES)
  const rest = await Promise.all(Array.from({ length: last - 1 }, (_, i) => get(i + 2)))
  const seen = new Set<string>()
  return [first, ...rest].flatMap(r => r.data).filter(q => !seen.has(q.id) && seen.add(q.id))
}
