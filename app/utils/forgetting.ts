/**
 * FSRS-6 with the default parameters, for the free tools of the blog (prd-blog-seo RF-T1, RF-T2). The same W as
 * memorai-api/app/Domain/Flashcard/Services/FsrsService.php: the estimate on the page is the one the app would make
 * for a new card answered "Bom". tests/utils/forgetting.test.ts pins the numbers.
 */
const W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001,
  1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014,
  1.8729, 0.5425, 0.0912, 0.0658, 0.1542,
] as const

export const DECAY = -W[20]
export const FACTOR = 0.9 ** (1 / DECAY) - 1
/** Stability (days) of a new card whose first answer was "Bom" (Good) */
export const FIRST_STABILITY: number = W[2]

const clampD = (d: number) => Math.min(10, Math.max(1, d))
/** Initial difficulty for rating g (1..4) */
export function initDifficulty(g: number): number {
  return W[4] - Math.exp(W[5] * (g - 1)) + 1
}

/** Probability of recalling after `t` days with stability `s` (days): R(t, S) = (1 + FACTOR·t/S)^DECAY */
export function retrievability(t: number, s: number): number {
  if (t <= 0) return 1
  return (1 + FACTOR * t / s) ** DECAY
}

/** Days until R falls to `r` */
export function intervalFor(s: number, r = 0.9): number {
  return (s / FACTOR) * (r ** (1 / DECAY) - 1)
}

/** Stability after a successful "Bom" review done when R was `r` */
export function stabilityAfterGood(s: number, d: number, r: number): number {
  return s * (1 + Math.exp(W[8]) * (11 - d) * s ** -W[9] * (Math.exp(W[10] * (1 - r)) - 1))
}

/** Difficulty after a "Bom": ΔD = 0, mean reversion towards D0(4) */
export function difficultyAfterGood(d: number): number {
  return clampD(W[7] * clampD(initDifficulty(4)) + (1 - W[7]) * d)
}

export interface MemoryState { stability: number, difficulty: number }

/** Card studied once ("Bom") and then reviewed `reviews` times, each on the day R reached `r` */
export function stateAfterReviews(reviews: number, r = 0.9): MemoryState {
  let s = FIRST_STABILITY
  let d = clampD(initDifficulty(3))
  for (let i = 0; i < reviews; i++) {
    s = stabilityAfterGood(s, d, r)
    d = difficultyAfterGood(d)
  }
  return { stability: s, difficulty: d }
}

/** Curve points from day 0 to `days` (inclusive), percent rounded to 1 decimal */
export function curve(stability: number, days: number, step = 1): { day: number, percent: number }[] {
  const out: { day: number, percent: number }[] = []
  for (let day = 0; day <= days; day += step) out.push({ day, percent: Math.round(retrievability(day, stability) * 1000) / 10 })
  return out
}

/** Ebbinghaus (1885), savings in relearning nonsense syllables, as replicated by Murre & Dros (2015). Hours → %. */
export const EBBINGHAUS_1885 = [
  { hours: 0.33, percent: 58.2 },
  { hours: 1, percent: 44.2 },
  { hours: 8.8, percent: 35.8 },
  { hours: 24, percent: 33.7 },
  { hours: 48, percent: 27.8 },
  { hours: 144, percent: 25.4 },
  { hours: 744, percent: 21.1 },
] as const
