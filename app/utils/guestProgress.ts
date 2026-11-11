/**
 * The visitor's mini-lote (prd-onboarding-v4, ADR-032): kept on this device until the account exists, then sent to
 * POST /onboarding/guest, which replays each rating through the session's own scheduler. Pure functions plus a
 * try/catch around localStorage: a blocked storage still lets the lote run, it just is not carried.
 */

import { returnText } from '~/utils/intervalLabel'
import { getErrorStatus } from '~/utils/apiErrors'
import { studyDay } from '~/utils/greeting'

export { returnText }

export const GUEST_AREAS = [
  { key: 'concurso', name: 'Concurso', hint: 'INSS, tribunais, polícia' },
  { key: 'enem', name: 'ENEM e vestibular', hint: 'Linguagens, exatas, humanas' },
  { key: 'medicina', name: 'Medicina', hint: 'Fisiologia, ciclo básico' },
  { key: 'oab', name: 'OAB', hint: 'Exame de Ordem' },
  { key: 'ingles', name: 'Inglês', hint: 'Vocabulário e expressões' },
  { key: 'faculdade', name: 'Faculdade', hint: 'Qualquer curso' },
] as const

export type GuestArea = typeof GUEST_AREAS[number]['key']
export type GuestRating = 1 | 2 | 3 | 4
type IntervalKey = 'again' | 'hard' | 'good' | 'easy'

export interface GuestCard { index: number, front: string, back: string, source: string }
export interface GuestDeck {
  area: GuestArea
  name: string
  learning_mode: string
  version: string
  topic_name: string
  note_title: string
  cards: GuestCard[]
  intervals: Record<IntervalKey, string>
  /** "Lembrei" after a "Não lembrei" in the same lote (the card that came back): the FSRS's label, "1d" */
  relearned_interval?: string
  growth_days: number[]
  /** The result's curve (prd-revisao-v5-fase-a RF-F8): R from 0 to 1, without reviews and with "Lembrei" on each due day */
  forgetting_curve?: ForgettingCurve
}
export interface ForgettingCurve { days: number, without: [number, number][], with: [number, number][], reviews: number[] }
export interface GuestReview { index: number, rating: GuestRating, reviewed_at: string }
export interface GuestProgress {
  v: 1
  area: GuestArea
  version: string
  reviews: GuestReview[]
  done: boolean
  /** The commitment before the sign-up (prd-revisao-v5-fase-a RF-F9): lotes per day, 1–3 */
  goal_batches?: GuestGoal
  /** The exam date (YYYY-MM-DD), null = "ainda não"; absent = not answered */
  exam_date?: string | null
}
export type GuestGoal = 1 | 2 | 3
export const GUEST_GOALS: GuestGoal[] = [1, 2, 3]

export const GUEST_STORAGE_KEY = 'baigi-guest-progress'
/** "De novo" or "Difícil" brings a card back at the end of the lote, at most this many times in all. */
export const MAX_SHOWS = 3
const RATING_KEY: Record<GuestRating, IntervalKey> = { 1: 'again', 2: 'hard', 3: 'good', 4: 'easy' }

export function isGuestArea(value: unknown): value is GuestArea {
  return typeof value === 'string' && GUEST_AREAS.some(a => a.key === value)
}

export function areaName(area: GuestArea): string {
  return GUEST_AREAS.find(a => a.key === area)!.name
}

export function loadGuestProgress(): GuestProgress | null {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as GuestProgress
    if (p?.v !== 1 || !isGuestArea(p.area) || !Array.isArray(p.reviews) || typeof p.version !== 'string') return null
    return p
  } catch {
    return null
  }
}

export function saveGuestProgress(p: GuestProgress): void {
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(p))
  } catch {
    // intencional: private window or blocked storage, the lote runs anyway
  }
}

export function clearGuestProgress(): void {
  try {
    localStorage.removeItem(GUEST_STORAGE_KEY)
  } catch {
    // intencional: nothing to clear
  }
}

/** A finished lote waiting for an account (what the sign-up pages and the redirect look at). */
export function pendingGuestProgress(): GuestProgress | null {
  const p = loadGuestProgress()
  return p?.done && p.reviews.length > 0 ? p : null
}

/**
 * The next card of the lote: every card once, in order; then those whose last rating was "De novo" or "Difícil"
 * (the 1 min learning step), in the order they were rated, until each was shown MAX_SHOWS times.
 */
export function nextGuestCard(cards: number[], reviews: Pick<GuestReview, 'index' | 'rating'>[]): number | null {
  const shows = new Map<number, number>()
  const last = new Map<number, GuestRating>()
  for (const r of reviews) {
    shows.set(r.index, (shows.get(r.index) ?? 0) + 1)
    last.set(r.index, r.rating)
  }
  const unseen = cards.find(i => !shows.has(i))
  if (unseen !== undefined) return unseen
  // The card rated longest ago comes back first
  for (const r of reviews) {
    if (last.get(r.index)! <= 2 && shows.get(r.index)! < MAX_SHOWS && lastPosition(reviews, r.index) === reviews.indexOf(r)) return r.index
  }
  return null
}

function lastPosition(reviews: Pick<GuestReview, 'index'>[], index: number): number {
  for (let i = reviews.length - 1; i >= 0; i--) if (reviews[i]!.index === index) return i
  return -1
}

export interface GuestSummary {
  total: number
  /** Rated 2–4 the first time (FSRS: anything but a lapse) */
  remembered: number
  /** Cards that came back at the end of the lote */
  repeated: number
  /** Of those, the ones whose last rating was 2–4 */
  rememberedOnRepeat: number
  /** When each card comes back, by its last rating, grouped and in the order of the ratings */
  agenda: { label: string, count: number }[]
  /** The label of each card's return, by index */
  returns: Record<number, string>
}

export function guestSummary(reviews: Pick<GuestReview, 'index' | 'rating'>[], intervals: Record<IntervalKey, string>, relearned?: string): GuestSummary {
  const first = new Map<number, GuestRating>()
  const last = new Map<number, GuestRating>()
  const shows = new Map<number, number>()
  const forgot = new Set<number>()
  for (const r of reviews) {
    if (!first.has(r.index)) first.set(r.index, r.rating)
    last.set(r.index, r.rating)
    shows.set(r.index, (shows.get(r.index) ?? 0) + 1)
    if (r.rating === 1) forgot.add(r.index)
  }
  const repeatedIdx = [...shows].filter(([, n]) => n > 1).map(([i]) => i)
  const returns: Record<number, string> = {}
  const byLabel = new Map<string, number>()
  for (const [index, rating] of last) {
    // Remembered after a "Não lembrei" in the same lote: the FSRS keeps it short (relearned_interval)
    const label = rating >= 2 && forgot.has(index) && relearned ? relearned : intervals[RATING_KEY[rating]]
    returns[index] = label
    byLabel.set(label, (byLabel.get(label) ?? 0) + 1)
  }
  return {
    total: first.size,
    remembered: [...first.values()].filter(r => r >= 2).length,
    repeated: repeatedIdx.length,
    rememberedOnRepeat: repeatedIdx.filter(i => last.get(i)! >= 2).length,
    agenda: [...byLabel].sort((a, b) => labelMinutes(a[0]) - labelMinutes(b[0])).map(([label, count]) => ({ label, count })),
    returns,
  }
}

/** Minutes of an API label, to order the agenda ("10min" < "1d" < "2d" < "1.5m"). */
function labelMinutes(label: string): number {
  const m = /^([\d.]+)(min|h|d|m|a)$/.exec(label.trim())
  if (!m) return 0
  const unit = { min: 1, h: 60, d: 1440, m: 43_200, a: 525_600 }[m[2] as 'min' | 'h' | 'd' | 'm' | 'a']
  return Number(m[1]) * unit
}

/** The growth estimate: "10 min, 2 dias, 11 dias, 46 dias e 5 meses" (the 1st step plus "Bom" every time). */
export function growthText(firstStep: string, days: number[]): string {
  const parts = [returnText(firstStep).replace(/^em /, ''), ...days.map(dayText)]
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} e ${parts.at(-1)}` : parts[0] ?? ''
}

function dayText(d: number): string {
  if (d < 1) return 'menos de 1 dia'
  if (d === 1) return '1 dia'
  if (d < 60) return `${d} dias`
  if (d < 365) return `${Math.round(d / 30)} meses`
  const y = Math.round(d / 36.5) / 10
  return y === 1 ? '1 ano' : `${String(y).replace('.', ',')} anos`
}


export interface GuestImportBody {
  area: GuestArea
  version: string
  reviews: GuestReview[]
  daily_goal_batches?: GuestGoal
  exam_date?: string
}

/**
 * The body of POST /onboarding/guest (QA 2026-11 M2). The lote waits on the device, so the exam chosen "for
 * tomorrow" can be today or past by the sign-up: an exam date that is no longer after today (Brasília's study day,
 * the API's rule) is left out and the lote is saved without the exam (examDropped). `withoutExam` drops it anyway.
 */
export function guestImportBody(p: GuestProgress, opts: { now?: Date, withoutExam?: boolean } = {}): { body: GuestImportBody, examDropped: boolean } {
  const body: GuestImportBody = { area: p.area, version: p.version, reviews: p.reviews }
  if (p.goal_batches) body.daily_goal_batches = p.goal_batches
  const exam = p.exam_date ?? null
  const future = !!exam && /^\d{4}-\d{2}-\d{2}$/.test(exam) && exam > studyDay(opts.now)
  if (exam && future && !opts.withoutExam) body.exam_date = exam
  return { body, examDropped: !!exam && !body.exam_date }
}

/**
 * Why POST /onboarding/guest failed: `exam_date` (422 on the exam alone: saved again without it), `invalid` (any
 * other 422: trying again fails the same way), `rate` (429) or `network` (no answer, 5xx: trying again can work).
 */
export type GuestImportFailure = 'exam_date' | 'invalid' | 'rate' | 'network'

export function guestImportFailure(e: unknown): GuestImportFailure {
  const status = getErrorStatus(e)
  if (status === 429) return 'rate'
  if (status === 422) {
    const err = e as { data?: { errors?: Record<string, unknown> }, response?: { _data?: { errors?: Record<string, unknown> } } } | null
    const fields = Object.keys(err?.data?.errors ?? err?.response?._data?.errors ?? {})
    return fields.length > 0 && fields.every(f => f === 'exam_date') ? 'exam_date' : 'invalid'
  }
  // Other 4xx (403, 404…) do not change on a retry either
  if (status && status >= 400 && status < 500 && status !== 408 && status !== 419) return 'invalid'
  return 'network'
}

/** Why the lote's exam was not created: the API's exam_skipped (#179) or our own check of the date. */
export type GuestExamSkipped = 'exam_date_past' | 'exam_limit_reached'

export function guestExamSkipped(apiValue: unknown, examDropped: boolean): GuestExamSkipped | null {
  if (apiValue === 'exam_limit_reached') return 'exam_limit_reached'
  if (apiValue || examDropped) return 'exam_date_past'
  return null
}

/** The quiet line under "Seu progresso está salvo" (the link "Marcar a prova" goes after it). */
export function guestExamSkippedText(reason: GuestExamSkipped): string {
  return reason === 'exam_limit_reached'
    ? 'A prova não foi marcada: o plano Grátis já tem o máximo de provas ativas.'
    : 'A data da prova já passou, então ela não foi marcada.'
}
