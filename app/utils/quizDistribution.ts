/**
 * How the simulado of a caderno splits its questions (prd-4e-praticar-v3 RF-B2), the same rule as the API
 * (`App\Domain\Quiz\Support\QuizDistribution::split`): by matéria, in proportion to its cards, at least 1 for
 * each matéria with material, rounding by the largest remainder (ties: more cards, then tree order). With
 * fewer questions than matérias, the ones with the most cards get 1 each. The sheet shows this preview
 * before the POST; the API answers the real split, which the answer screen shows.
 */
export interface DistributionWeight {
  id: string
  /** Cards of the matéria's subtree */
  cards: number
}

/** @returns id → questions, in tree order, summing to `total` (matérias left out when `total` is smaller) */
export function splitQuestions(total: number, weights: DistributionWeight[]): Map<string, number> {
  const out = new Map<string, number>()
  if (total <= 0 || !weights.length) return out
  const order = weights.map(w => w.id)
  const cards = new Map(weights.map(w => [w.id, w.cards]))
  const index = (id: string) => order.indexOf(id)

  if (total < weights.length) {
    const chosen = new Set([...order].sort((a, b) => cards.get(b)! - cards.get(a)! || index(a) - index(b)).slice(0, total))
    for (const id of order) if (chosen.has(id)) out.set(id, 1)
    return out
  }

  const sum = weights.reduce((acc, w) => acc + w.cards, 0)
  const exact = new Map(order.map(id => [id, sum > 0 ? (total * cards.get(id)!) / sum : total / order.length]))
  const shares = new Map(order.map(id => [id, Math.floor(exact.get(id)!)]))
  const rem = (id: string) => exact.get(id)! - Math.floor(exact.get(id)!)
  const ranked = [...order].sort((a, b) => rem(b) - rem(a) || cards.get(b)! - cards.get(a)! || index(a) - index(b))
  const left = total - [...shares.values()].reduce((a, b) => a + b, 0)
  for (const id of ranked.slice(0, left)) shares.set(id, shares.get(id)! + 1)

  // Every matéria with material gets at least 1, taken from the largest share (the first one, in order)
  for (const id of order) {
    if (shares.get(id) === 0) {
      const max = Math.max(...shares.values())
      const largest = order.find(k => shares.get(k) === max)!
      shares.set(largest, max - 1)
      shares.set(id, 1)
    }
  }
  for (const id of order) out.set(id, shares.get(id)!)
  return out
}

/** "Português 12 · Constitucional 15 · Administrativo 18" */
export function distributionLabel(rows: { name: string; questions: number }[]): string {
  return rows.filter(r => r.questions > 0).map(r => `${r.name} ${r.questions}`).join(' · ')
}

/** Suggested timer of the simulado: 3 min per question, the smallest option that fits, at most 3 h. */
export const EXAM_TIMERS = [1800, 3600, 7200, 10800] as const
export function suggestedTimer(questions: number): number {
  const need = questions * 180
  return EXAM_TIMERS.find(t => t >= need) ?? EXAM_TIMERS[EXAM_TIMERS.length - 1]!
}

/** "30 min", "1 h", "2 h" */
export function timerLabel(seconds: number): string {
  return seconds < 3600 ? `${Math.round(seconds / 60)} min` : `${Math.round(seconds / 3600)} h`
}
