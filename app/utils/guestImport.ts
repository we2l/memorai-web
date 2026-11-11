import { getErrorStatus } from '~/utils/apiErrors'
import { studyDay } from '~/utils/greeting'
import type { GuestArea, GuestGoal, GuestProgress, GuestReview } from '~/utils/guestProgress'

/*
 * POST /onboarding/guest from /comecar/pronto (QA 2026-11 M2, API #179). Apart from utils/guestProgress so the
 * sign-up pages, which only read the lote, do not carry it (budget of /entrar).
 */
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
