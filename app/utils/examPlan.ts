/**
 * "Plano até a prova" (prd-blog-seo RF-T2): how many new cards and reviews per day fit before the exam, and how much
 * one should remember on the day. Deterministic estimate with FSRS-6 defaults (utils/forgetting): every answer is
 * "Bom", a card comes back when R reaches the target, new cards are spread until REVIEW_ONLY_DAYS before the exam,
 * and LAPSE_EXTRA more reviews account for the ones that are forgotten. Nothing leaves the browser.
 */
import { FIRST_STABILITY, difficultyAfterGood, initDifficulty, intervalFor, retrievability, stabilityAfterGood } from './forgetting'

/** Seconds per card review used for the minutes (a premise shown on the page) */
export const SECONDS_PER_CARD = 8
export const BATCH_SIZE = 20
export const REVIEW_ONLY_DAYS = 3
export const LAPSE_EXTRA = 0.1
export const TARGET_RETENTION = 0.9

export interface ExamPlanInput {
  /** Whole days from today to the exam (exam day not counted as a study day) */
  days: number
  /** Cards (or questions) to master, including the ones already studied */
  cards: number
  /** Of those, already studied (they enter as reviewed once, on day 0) */
  studied?: number
}

export interface ExamPlan {
  days: number
  newPerDay: number
  /** Days with new cards */
  newDays: number
  reviewsAvg: number
  reviewsPeak: number
  minutesAvg: number
  minutesPeak: number
  /** Batches of 20 cards on an average day (new + reviews) */
  batchesAvg: number
  /** Mean probability of recalling a card on the exam day, 0..1 */
  recallOnExam: number
  /** New cards per day above which it gets heavy (> 60 min on an average day) */
  heavy: boolean
  /** Daily work (new + reviews) for each study day, for the chart */
  daily: number[]
}

export function daysUntil(examDate: string, today = new Date()): number {
  const [y, m, d] = examDate.split('-').map(Number)
  if (!y || !m || !d) return 0
  const exam = Date.UTC(y, m - 1, d)
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((exam - now) / 86_400_000)
}

export function buildExamPlan({ days, cards, studied = 0 }: ExamPlanInput): ExamPlan {
  const studyDays = Math.max(1, Math.floor(days))
  const fresh = Math.max(0, Math.round(cards) - Math.max(0, Math.round(studied)))
  const newDays = Math.max(1, studyDays - REVIEW_ONLY_DAYS)
  const newPerDay = Math.ceil(fresh / newDays)

  const reviews = new Array<number>(studyDays).fill(0)
  const work = new Array<number>(studyDays).fill(0)
  let recallSum = 0
  let total = 0

  // One cohort per introduction day: every card of a cohort shares the same schedule
  const cohorts: { day: number, size: number }[] = []
  if (studied > 0) cohorts.push({ day: 0, size: Math.min(Math.round(studied), Math.round(cards)) })
  let left = fresh
  for (let day = 0; day < newDays && left > 0; day++) {
    const size = Math.min(newPerDay, left)
    cohorts.push({ day, size })
    work[day] = (work[day] ?? 0) + size
    left -= size
  }

  const d0 = Math.min(10, Math.max(1, initDifficulty(3)))
  for (const { day, size } of cohorts) {
    let s = FIRST_STABILITY
    let d = d0
    let last = day
    for (;;) {
      const next = last + Math.max(1, Math.round(intervalFor(s, TARGET_RETENTION)))
      if (next >= studyDays) break
      reviews[next] = (reviews[next] ?? 0) + size * (1 + LAPSE_EXTRA)
      s = stabilityAfterGood(s, d, TARGET_RETENTION)
      d = difficultyAfterGood(d)
      last = next
    }
    recallSum += size * retrievability(studyDays - last, s)
    total += size
  }

  for (let i = 0; i < studyDays; i++) work[i] = (work[i] ?? 0) + (reviews[i] ?? 0)
  const reviewsAvg = reviews.reduce((a, b) => a + b, 0) / studyDays
  const workAvg = work.reduce((a, b) => a + b, 0) / studyDays
  const workPeak = Math.max(...work)
  const minutesAvg = Math.round(workAvg * SECONDS_PER_CARD / 60)

  return {
    days: studyDays,
    newPerDay,
    newDays,
    reviewsAvg: Math.round(reviewsAvg),
    reviewsPeak: Math.round(Math.max(...reviews)),
    minutesAvg,
    minutesPeak: Math.round(workPeak * SECONDS_PER_CARD / 60),
    batchesAvg: Math.max(1, Math.ceil(workAvg / BATCH_SIZE)),
    recallOnExam: total ? recallSum / total : 0,
    heavy: minutesAvg > 60,
    daily: work.map(n => Math.round(n)),
  }
}
