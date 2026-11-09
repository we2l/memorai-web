import { REVIEW_BATCH, type RatingLog } from '~/stores/review'

/**
 * Batches of the review (prd-4d-revisao-v3 RF-F1): a cut of the interface, not of the session. A batch is
 * the person's size (10, 20 or 30; /me.review_batch_size) of distinct cards rated for the 1st time; a learning card that comes back does not count again. The
 * number of batches comes from the session_count of the 1st page (the number of the button that opened
 * the session); learning extras make the last batch longer, never add a batch. The pages of 100 keep
 * going underneath. Pure functions here (tested); `useReviewBatches` ties them to the store.
 */

/** At most this many segments are drawn in the top bar; above it, only "Lote 4 de 12". */
export const MAX_SEGMENTS = 6

export function batchesTotal(sessionCount: number, size = REVIEW_BATCH): number {
  return Math.max(1, Math.ceil(Math.max(0, sessionCount) / size))
}

export interface BatchPosition {
  /** Batch open now (1-based) */
  index: number
  total: number
  /** Card on screen inside the batch (1-based) and the batch size */
  card: number
  size: number
  /** Fraction of the whole session done, in batches (for the bar: 0.7 = 70% of batch 1) */
  done: number
}

export function batchPosition(firstPass: number, acked: number, sessionCount: number, size = REVIEW_BATCH): BatchPosition {
  const total = batchesTotal(sessionCount, size)
  const index = Math.min(total, acked + 1)
  const before = (index - 1) * size
  const batchSize = index < total ? size : Math.max(1, sessionCount - before, firstPass - before)
  const inBatch = Math.max(0, firstPass - before)
  return {
    index,
    total,
    card: Math.min(batchSize, inBatch + 1),
    size: batchSize,
    done: Math.min(total, index - 1 + Math.min(1, inBatch / batchSize)),
  }
}

/**
 * The batch that just ended and waits for "Próximo lote", or null. Only between batches: the last batch
 * ends with the session (its own screen), and a session that finished never shows a batch end.
 */
export function endedBatch(firstPass: number, acked: number, sessionCount: number, finished: boolean, size = REVIEW_BATCH): number | null {
  if (finished || firstPass === 0) return null
  const total = batchesTotal(sessionCount, size)
  const completed = Math.floor(firstPass / size)
  if (completed <= acked || completed >= total) return null
  return completed
}

export interface BatchSummary {
  /** Cards of the batch (1st ratings) */
  size: number
  /** "Lembrou": 1st rating 2, 3 or 4 */
  remembered: number
  percent: number
  /** Minutes on the cards of the batch (all its ratings), at least 1 */
  minutes: number
  /** Cards of the batch whose new due date falls after the end of the study day */
  inDay: number
  /** Cards of the batch that only come back in a week or more (prd-revisao-v5-fase-a RF-F5): memory, not points */
  far: number
  /** The subject with ≥ 3 "De novo" in the batch, the most first */
  weak: { id: string; name: string; errors: number } | null
  /** Ids of the cards marked "De novo" in the batch (language mode: "Reforçar estes erros") */
  errorIds: string[]
}

/**
 * A due date at least this far after the end of the study day is "in a week or more": the API writes due = midnight
 * (UTC) of today + N days, so N = 7 lands about 6 days after the end of today in Brasília, and N = 6 about 5.
 */
const FAR_AFTER_DAY_END_MS = 5.5 * 86_400_000

/** Numbers of a batch (or of a whole session: `batch` null). `dayEnd`: end of the study day (ms). */
export function batchSummary(log: RatingLog[], batch: number | null, dayEnd: number): BatchSummary {
  const entries = batch === null ? log : log.filter(l => l.batch === batch)
  const firsts = entries.filter(l => l.first)
  const remembered = firsts.filter(l => l.rating >= 2).length
  const ms = entries.reduce((sum, l) => sum + Math.min(l.duration_ms, 5 * 60_000), 0)
  // The latest answer of each card decides where it stands
  const lastDue = new Map<string, string | null>()
  for (const l of entries) lastDue.set(l.card_id, l.due)
  const inDay = firsts.filter(l => {
    const due = lastDue.get(l.card_id)
    return !!due && Date.parse(due) > dayEnd
  }).length
  const far = firsts.filter(l => {
    const due = lastDue.get(l.card_id)
    return !!due && Date.parse(due) >= dayEnd + FAR_AFTER_DAY_END_MS
  }).length
  const errors = new Map<string, { id: string; name: string; errors: number }>()
  for (const l of entries) {
    if (l.rating !== 1 || !l.topic_id) continue
    const e = errors.get(l.topic_id) ?? { id: l.topic_id, name: l.topic_name ?? 'Assunto', errors: 0 }
    e.errors++
    errors.set(l.topic_id, e)
  }
  const weak = [...errors.values()].filter(e => e.errors >= 3).sort((a, b) => b.errors - a.errors)[0] ?? null
  return {
    size: firsts.length,
    remembered,
    percent: firsts.length ? Math.round((remembered / firsts.length) * 100) : 0,
    minutes: Math.max(1, Math.round(ms / 60_000)),
    inDay,
    far,
    weak,
    errorIds: [...new Set(entries.filter(l => l.rating === 1).map(l => l.card_id))],
  }
}

/** End of the study day (São Paulo, like StudyDay on the API): the next local midnight in Brasília. */
export function studyDayEnd(now = new Date()): number {
  const day = studyDay(now)
  // Brasília has no DST since 2019: UTC−3
  return Date.parse(`${day}T23:59:59.999-03:00`)
}

/** The batches of the open session (`blitz`: none, the timer is the end). */
export function useReviewBatches(blitz: Ref<boolean>) {
  const review = useReviewStore()
  const position = computed(() => batchPosition(review.firstPass.length, review.batchesAcked, review.sessionCount, review.batchSize))
  const ended = computed(() => (blitz.value ? null : endedBatch(review.firstPass.length, review.batchesAcked, review.sessionCount, review.finished, review.batchSize)))
  const enabled = computed(() => !blitz.value && review.sessionCount > 0)
  return { position, ended, enabled }
}

export interface GoalSnapshot { batch_size: number; target_batches: number; done_batches: number; met: boolean }

/**
 * The goal of the day at the end of a lote (prd-visual-e2 Fase 2b): the lote just finished always counts, even when
 * GET /stats has not arrived yet or came back with the count from before it (it never shows "0 de 2" after a lote).
 * `before` is the goal read when this lote started; `now` the one read after it (either may be missing).
 */
export function goalAfterBatch(before: GoalSnapshot | null | undefined, now: GoalSnapshot | null | undefined): GoalSnapshot | null {
  const base = now ?? before
  if (!base) return null
  const floor = before ? Math.min(base.target_batches, before.done_batches + 1) : 0
  const done = Math.max(base.done_batches, floor)
  return { ...base, done_batches: done, met: base.target_batches > 0 && done >= base.target_batches }
}
