/**
 * Cronograma de estudos (prd-cronograma RF-W1; docs/research/cronograma-planejamento-2026-11.md §4.2): a study cycle
 * (an ordered queue of sessions) projected on the calendar from TODAY. A pure function of the caderno (or of the
 * public reading), the hours of each weekday, the exam date, the weight of each matéria and the progress: no AI,
 * no clock inside (`today` comes in), so the same code serves the caderno, Hoje, the hub and the free tool.
 *
 * 1. Days from today to the eve of the exam; the last FINAL_DAYS are the final stretch (review and simulados, no new
 *    session). Each day gives (hours − card review) × SLACK minutes, accumulated from day to day, and holds at most
 *    the sessions its declared hours fit (a 2 h day with 15 min of cards alternates 1 and 2 sessions of 1 h).
 * 2. Effective weight = points (edital or manual; without them the number of assuntos) × the level factor.
 * 3. Round 1 (first contact) takes up to FIRST_PASS_SHARE of the sessions: each assunto of a matéria gets
 *    ceil(w / Σw × S₁ / assuntos) sessions, at least 1 (trimmed back to S₁, at most MAX_TOPIC_MINUTES).
 * 4. The matéria of each slot comes from a smooth weighted round-robin (nginx, deterministic); the same matéria does
 *    not come twice in a row when there is another; at most 2 matérias a day (3 with 3+ sessions). Inside a matéria,
 *    the assuntos keep the edital order.
 * 5. Round 2 (the rest): the same round-robin, weakest assunto first (accuracy < 60%, then fewer reviewed cards, then
 *    the edital order). One session per assunto.
 * 6. Done sessions leave the queue; skipped ones go to the end of their round, in the order of `done_at`.
 * 7. Without an exam date (or with the exam today or past) there is no calendar: only the queue.
 */

export type ScheduleLevel = 'beginner' | 'studied' | 'mastered'
export type ScheduleWeightSource = 'edital' | 'manual' | 'size'
export type SchedulePass = 1 | 2

export const LEVEL_FACTOR: Record<ScheduleLevel, number> = { beginner: 1.3, studied: 1, mastered: 0.6 }
export const SLACK = 0.85
export const FINAL_DAYS = 7
export const FIRST_PASS_SHARE = 0.7
export const REVIEW_SECONDS_PER_CARD = 15
export const WEAK_ACCURACY_BELOW = 60
/** One assunto never takes more than this in its first contact (the rest of the time goes to round 2) */
export const MAX_TOPIC_MINUTES = 240
export const SESSION_OPTIONS = [30, 60, 90] as const
/** Index 0 = Sunday (Date.getDay()): seg–sex 2 h, sáb 3 h, dom 0 */
export const DEFAULT_HOURS: readonly number[] = [0, 2, 2, 2, 2, 2, 3]
export const DEFAULT_SESSION_MINUTES = 60
const VIRTUAL_DAYS_MAX = 3650
const DAY_MS = 86_400_000

export interface ScheduleTopicInput {
  id: string
  name: string
  cards?: number
  reviewed?: number
  accuracy?: number | null
}

export interface ScheduleSubjectInput {
  id: string
  name: string
  /** In the edital order; empty = the matéria itself is one unit */
  topics: ScheduleTopicInput[]
  /** Points of the matéria (edital or the person's); null/undefined = by size */
  points?: number | null
  source?: 'edital' | 'manual' | null
  /** The edital's points, kept beside a manual weight ("Seu peso · no edital: 20 pontos") */
  editalPoints?: number | null
  level?: ScheduleLevel | null
}

export interface ScheduleProgressInput {
  topic_id: string
  pass: SchedulePass
  status: 'done' | 'skipped'
  done_at: string | null
}

export interface StudyScheduleInput {
  subjects: ScheduleSubjectInput[]
  /** 7 values, index 0 = Sunday, hours 0–8 */
  hoursByWeekday: readonly number[]
  /** "HH:MM" per weekday, or null */
  startTimes?: readonly (string | null)[] | null
  sessionMinutes: number
  /** AAAA-MM-DD, or null */
  examDate: string | null
  /** AAAA-MM-DD of the study day (São Paulo) */
  today: string
  /** Minutes of card review a day (reviewMinutesOf), taken from each day's hours */
  reviewMinutes?: number
  progress?: readonly ScheduleProgressInput[]
  /** When the schedule was made (ISO or AAAA-MM-DD): the base of "N sessões atrás" */
  createdAt?: string | null
}

export interface StudySession {
  /** `${topicId}:${pass}:${part}` */
  id: string
  subjectId: string
  subjectName: string
  /** The assunto (or the matéria when it has none) */
  topicId: string
  topicName: string
  /** The matéria itself is the unit (no assuntos) */
  unit: boolean
  pass: SchedulePass
  part: number
  parts: number
  minutes: number
  /** Skipped before: it came back at the end of its round */
  skipped: boolean
  /** AAAA-MM-DD; null without a calendar or beyond the plan */
  date: string | null
  /** "HH:MM" when the day has a start time */
  start: string | null
  /** Placed after the last study day (only the first contact is projected there) */
  late: boolean
}

export interface StudyDay {
  date: string
  weekday: number
  phase: 'study' | 'final'
  sessions: StudySession[]
  minutes: number
}

export interface ScheduleSubjectSummary {
  id: string
  name: string
  /** Effective weight (points × level), what the round-robin uses */
  weight: number
  points: number | null
  source: ScheduleWeightSource
  editalPoints: number | null
  level: ScheduleLevel
  topics: number
  seen: number
  plannedMinutes: number
  doneMinutes: number
}

export interface ScheduleDone {
  topicId: string
  subjectName: string
  topicName: string
  pass: SchedulePass
  doneAt: string | null
}

export interface ScheduleSummary {
  /** Sessions ahead on the calendar (or in the queue, without one) */
  sessions: number
  topics: number
  seen: number
  seenPct: number
  /** Date of the last first-contact session; null when nothing is left or it never ends (no hours) */
  firstContactEnd: string | null
  examDate: string | null
  daysLeft: number | null
  /** First day of the final stretch; null without a calendar */
  finalStart: string | null
  lastStudyDay: string | null
  /** Sessions behind what the plan placed since it was made */
  behind: number
  /** Sessions marked done today (they take today's time) */
  doneToday: number
  reviewMinutes: number
  /** Declared hours of the week, in minutes */
  weeklyMinutes: number
  calendar: boolean
}

export interface ScheduleOverflow {
  /** late = the first contact ends after the last study day; tight = it fits, but takes more than the round-1 share */
  kind: 'late' | 'tight'
  missingSessions: number
  missingHours: number
  firstContactEnd: string | null
  lateDays: number
}

export interface StudySchedule {
  /** Sessions in queue order (pending and skipped), with their date when they are on the calendar */
  sessions: StudySession[]
  days: StudyDay[]
  bySubject: ScheduleSubjectSummary[]
  done: ScheduleDone[]
  summary: ScheduleSummary
  overflow: ScheduleOverflow | null
}

/* ---- dates (AAAA-MM-DD, UTC arithmetic: no timezone in the way) ---- */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/

function toTime(iso: string): number {
  return Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)
}

export function addDays(iso: string, n: number): string {
  return new Date(toTime(iso) + n * DAY_MS).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toTime(to) - toTime(from)) / DAY_MS)
}

export function weekdayOf(iso: string): number {
  return new Date(toTime(iso)).getUTCDay()
}

/** The study day (São Paulo, UTC−3 without daylight saving since 2019) of an ISO instant; a bare date stays as is */
export function spDay(iso: string): string {
  if (!/T\d{2}:/.test(iso)) return iso.slice(0, 10)
  const t = Date.parse(iso)
  return Number.isNaN(t) ? iso.slice(0, 10) : new Date(t - 3 * 3_600_000).toISOString().slice(0, 10)
}

/** `daily_goal_batches × review_batch_size × 15 s`, in whole minutes (the same sum as Hoje) */
export function reviewMinutesOf(review: { daily_goal_batches?: number | null, review_batch_size?: number | null } | null | undefined): number {
  const batches = Math.max(0, review?.daily_goal_batches ?? 0)
  const size = Math.max(0, review?.review_batch_size ?? 0)
  return Math.ceil((batches * size * REVIEW_SECONDS_PER_CARD) / 60)
}

function addMinutes(hhmm: string, minutes: number): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  const total = (Number(m[1]) * 60 + Number(m[2]) + minutes) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/**
 * Sessions of each date: the day's minutes (hours − review) × SLACK accumulate from day to day, and a day holds at
 * most what its declared hours fit. The leftover never passes one session, so a run of free days does not pile up.
 */
function capacities(dates: readonly string[], hours: readonly number[], review: number, len: number): number[] {
  let carry = 0
  return dates.map((d) => {
    const h = Math.max(0, hours[weekdayOf(d)] ?? 0)
    if (h <= 0 || len <= 0) return 0
    carry += Math.max(0, h * 60 - review) * SLACK
    const n = Math.min(Math.floor((h * 60) / len), Math.floor(carry / len + 1e-9))
    carry = Math.min(carry - n * len, len)
    return n
  })
}

/* ---- the queue ---- */

interface Unit {
  id: string
  name: string
  order: number
  unit: boolean
  reviewed: number
  accuracy: number | null
}

interface Subject {
  id: string
  name: string
  order: number
  units: Unit[]
  weight: number
  points: number | null
  source: ScheduleWeightSource
  editalPoints: number | null
  level: ScheduleLevel
}

interface Item {
  subject: Subject
  unit: Unit
  pass: SchedulePass
  part: number
  parts: number
  skipped: boolean
}

/** A phase of the queue: a round-robin over per-matéria queues, or an ordered list (the skipped ones) */
type Phase = { kind: 'rr', pass: SchedulePass, queues: Map<string, Item[]>, current: Map<string, number> }
  | { kind: 'list', pass: SchedulePass, items: Item[] }

interface PickContext {
  /** Matérias already on this day; null = no day limit (queue only) */
  daySubjects: Set<string> | null
  maxSubjects: number
  last: string | null
}

const DAY_FULL = Symbol('day-full')

function allowed(ctx: PickContext, subjectId: string): boolean {
  return !ctx.daySubjects || ctx.daySubjects.has(subjectId) || ctx.daySubjects.size < ctx.maxSubjects
}

function pickFrom(phase: Phase, subjects: Subject[], ctx: PickContext): Item | null | typeof DAY_FULL {
  if (phase.kind === 'list') {
    if (!phase.items.length) return null
    const options = phase.items.map((it, i) => ({ it, i })).filter(({ it }) => allowed(ctx, it.subject.id))
    if (!options.length) return DAY_FULL
    const chosen = options.find(({ it }) => it.subject.id !== ctx.last) ?? options[0]!
    phase.items.splice(chosen.i, 1)
    return chosen.it
  }
  const candidates = subjects.filter(s => (phase.queues.get(s.id)?.length ?? 0) > 0)
  if (!candidates.length) return null
  let options = candidates.filter(s => allowed(ctx, s.id))
  if (!options.length) return DAY_FULL
  if (options.length > 1) options = options.filter(s => s.id !== ctx.last)
  // Smooth weighted round-robin: every candidate earns its weight, the chosen one pays the total
  const anyWeight = candidates.some(s => s.weight > 0)
  const weightOf = (s: Subject) => (anyWeight ? Math.max(0, s.weight) : 1)
  let total = 0
  for (const s of candidates) {
    phase.current.set(s.id, (phase.current.get(s.id) ?? 0) + weightOf(s))
    total += weightOf(s)
  }
  let best = options[0]!
  for (const s of options) if ((phase.current.get(s.id) ?? 0) > (phase.current.get(best.id) ?? 0) + 1e-9) best = s
  phase.current.set(best.id, (phase.current.get(best.id) ?? 0) - total)
  return phase.queues.get(best.id)!.shift()!
}

function weakFirst(a: Unit, b: Unit): number {
  const aw = a.accuracy !== null && a.accuracy < WEAK_ACCURACY_BELOW
  const bw = b.accuracy !== null && b.accuracy < WEAK_ACCURACY_BELOW
  if (aw !== bw) return aw ? -1 : 1
  if (aw && bw && a.accuracy !== b.accuracy) return a.accuracy! - b.accuracy!
  if (a.reviewed !== b.reviewed) return a.reviewed - b.reviewed
  return a.order - b.order
}

const byDoneAt = (doneAt: Map<string, string>) => (a: Item, b: Item) =>
  (doneAt.get(`${a.unit.id}:${a.pass}`) ?? '').localeCompare(doneAt.get(`${b.unit.id}:${b.pass}`) ?? '')
  || a.subject.order - b.subject.order || a.unit.order - b.unit.order

function subjectsOf(input: StudyScheduleInput): Subject[] {
  const list = input.subjects.map((s, order) => {
    const units: Unit[] = s.topics.length
      ? s.topics.map((t, i) => ({ id: t.id, name: t.name, order: i, unit: false, reviewed: Math.max(0, t.reviewed ?? 0), accuracy: t.accuracy ?? null }))
      : [{ id: s.id, name: s.name, order: 0, unit: true, reviewed: 0, accuracy: null }]
    const points = typeof s.points === 'number' && Number.isFinite(s.points) && s.points >= 0 ? s.points : null
    const level: ScheduleLevel = s.level && s.level in LEVEL_FACTOR ? s.level : 'studied'
    const source: ScheduleWeightSource = points === null ? 'size' : s.source === 'edital' ? 'edital' : 'manual'
    const editalPoints = typeof s.editalPoints === 'number' && Number.isFinite(s.editalPoints) ? s.editalPoints : null
    return { id: s.id, name: s.name, order, units, weight: 0, points, source, editalPoints, level }
  })
  // Without points, the size; next to matérias with points, the size in the same scale (their points per assunto)
  const known = list.filter(s => s.points !== null)
  const knownPoints = known.reduce((n, s) => n + s.points!, 0)
  const knownUnits = known.reduce((n, s) => n + s.units.length, 0)
  const perUnit = knownPoints > 0 && knownUnits > 0 ? knownPoints / knownUnits : 1
  for (const s of list) s.weight = (s.points ?? s.units.length * perUnit) * LEVEL_FACTOR[s.level]
  return list
}

/** Sessions per assunto in round 1, per matéria: ceil of its share, at least 1, trimmed back to max(S₁, assuntos) */
function sessionsPerTopic(subjects: Subject[], open: Map<string, number>, s1: number, len: number, calendar: boolean): Map<string, number> {
  const k = new Map<string, number>()
  const active = subjects.filter(s => (open.get(s.id) ?? 0) > 0)
  for (const s of active) k.set(s.id, 1)
  if (!calendar || !active.length) return k
  const cap = Math.max(1, Math.floor(MAX_TOPIC_MINUTES / len))
  const sumW = active.reduce((n, s) => n + Math.max(0, s.weight), 0)
  const units = active.reduce((n, s) => n + open.get(s.id)!, 0)
  const target = new Map(active.map(s => [s.id, sumW > 0 ? (Math.max(0, s.weight) / sumW) * s1 : (open.get(s.id)! / units) * s1]))
  for (const s of active) k.set(s.id, Math.min(cap, Math.max(1, Math.ceil(target.get(s.id)! / open.get(s.id)!))))
  let total = active.reduce((n, s) => n + open.get(s.id)! * k.get(s.id)!, 0)
  const limit = Math.max(s1, units)
  while (total > limit) {
    let worst: Subject | null = null
    let excess = Number.NEGATIVE_INFINITY
    for (const s of active) {
      if (k.get(s.id)! <= 1) continue
      const e = open.get(s.id)! * k.get(s.id)! - target.get(s.id)!
      if (e > excess) { excess = e; worst = s }
    }
    if (!worst) break
    k.set(worst.id, k.get(worst.id)! - 1)
    total -= open.get(worst.id)!
  }
  return k
}

function expand(subject: Subject, unit: Unit, pass: SchedulePass, parts: number, skipped: boolean): Item[] {
  return Array.from({ length: parts }, (_, i) => ({ subject, unit, pass, part: i + 1, parts, skipped }))
}

export function buildStudySchedule(input: StudyScheduleInput): StudySchedule {
  const len = SESSION_OPTIONS.includes(input.sessionMinutes as 30) ? input.sessionMinutes : DEFAULT_SESSION_MINUTES
  const review = Math.max(0, input.reviewMinutes ?? 0)
  const hours = Array.from({ length: 7 }, (_, i) => Math.min(24, Math.max(0, Number(input.hoursByWeekday[i]) || 0)))
  const today = input.today.slice(0, 10)
  const subjects = subjectsOf(input)

  const status = new Map<string, 'done' | 'skipped'>()
  const doneAt = new Map<string, string>()
  for (const p of input.progress ?? []) {
    status.set(`${p.topic_id}:${p.pass}`, p.status)
    doneAt.set(`${p.topic_id}:${p.pass}`, p.done_at ?? '')
  }
  const stateOf = (u: Unit, pass: SchedulePass) => status.get(`${u.id}:${pass}`) ?? 'pending'
  const doneToday = (input.progress ?? []).filter(p => p.status === 'done' && p.done_at && spDay(p.done_at) === today).length

  // Calendar: today .. the eve of the exam; the last FINAL_DAYS are the final stretch
  const examDate = input.examDate && ISO_DATE.test(input.examDate) ? input.examDate.slice(0, 10) : null
  const daysLeft = examDate ? daysBetween(today, examDate) : null
  const calendar = daysLeft !== null && daysLeft > 0
  const allDates = calendar ? Array.from({ length: daysLeft! }, (_, i) => addDays(today, i)) : []
  const studyDates = allDates.slice(0, Math.max(0, allDates.length - FINAL_DAYS))
  const finalDates = allDates.slice(studyDates.length)
  const caps = capacities(studyDates, hours, review, len)
  const S = caps.reduce((n, c) => n + c, 0)
  const s1 = Math.floor(S * FIRST_PASS_SHARE)

  // Round 1: open units (pending or skipped) and their sessions
  const open = new Map(subjects.map(s => [s.id, s.units.filter(u => stateOf(u, 1) !== 'done').length]))
  const k = sessionsPerTopic(subjects, open, s1, len, calendar)
  const kOf = (s: Subject) => k.get(s.id) ?? 1

  const p1Queues = new Map<string, Item[]>()
  const p2Queues = new Map<string, Item[]>()
  const p1Skipped: Item[] = []
  const p2Skipped: Item[] = []
  for (const s of subjects) {
    p1Queues.set(s.id, s.units.filter(u => stateOf(u, 1) === 'pending').flatMap(u => expand(s, u, 1, kOf(s), false)))
    p1Skipped.push(...s.units.filter(u => stateOf(u, 1) === 'skipped').flatMap(u => expand(s, u, 1, kOf(s), true)))
    p2Queues.set(s.id, s.units.filter(u => stateOf(u, 2) === 'pending').sort(weakFirst).flatMap(u => expand(s, u, 2, 1, false)))
    p2Skipped.push(...s.units.filter(u => stateOf(u, 2) === 'skipped').flatMap(u => expand(s, u, 2, 1, true)))
  }
  p1Skipped.sort(byDoneAt(doneAt))
  p2Skipped.sort(byDoneAt(doneAt))
  const pass1Total = [...p1Queues.values()].reduce((n, q) => n + q.length, 0) + p1Skipped.length

  const phases: Phase[] = [
    { kind: 'rr', pass: 1, queues: p1Queues, current: new Map() },
    { kind: 'list', pass: 1, items: p1Skipped },
    { kind: 'rr', pass: 2, queues: p2Queues, current: new Map() },
    { kind: 'list', pass: 2, items: p2Skipped },
  ]
  let phaseIndex = 0
  const ctx: PickContext = { daySubjects: null, maxSubjects: 2, last: null }

  function next(onlyPass1: boolean): Item | null | typeof DAY_FULL {
    while (phaseIndex < phases.length) {
      const phase = phases[phaseIndex]!
      if (onlyPass1 && phase.pass === 2) return null
      const r = pickFrom(phase, subjects, ctx)
      if (r !== null) return r
      phaseIndex++
    }
    return null
  }

  const toSession = (it: Item, date: string | null, start: string | null, late: boolean): StudySession => ({
    id: `${it.unit.id}:${it.pass}:${it.part}`,
    subjectId: it.subject.id,
    subjectName: it.subject.name,
    topicId: it.unit.id,
    topicName: it.unit.name,
    unit: it.unit.unit,
    pass: it.pass,
    part: it.part,
    parts: it.parts,
    minutes: len,
    skipped: it.skipped,
    date,
    start,
    late,
  })

  const sessions: StudySession[] = []
  const days: StudyDay[] = []
  let firstContactEnd: string | null = null
  let lateDays = 0

  if (!calendar) {
    // The queue only, without day limits (no exam date)
    for (;;) {
      const it = next(false)
      if (it === null || it === DAY_FULL) break
      ctx.last = it.subject.id
      sessions.push(toSession(it, null, null, false))
    }
  } else {
    const fill = (date: string, cap: number, onlyPass1: boolean, late: boolean): StudySession[] => {
      const placed: StudySession[] = []
      ctx.daySubjects = new Set()
      ctx.maxSubjects = cap >= 3 ? 3 : 2
      const startAt = input.startTimes?.[weekdayOf(date)] ?? null
      for (let slot = 0; slot < cap; slot++) {
        const it = next(onlyPass1)
        if (it === null || it === DAY_FULL) break
        ctx.daySubjects.add(it.subject.id)
        ctx.last = it.subject.id
        const start = startAt ? addMinutes(startAt, slot * len) : null
        const session = toSession(it, late ? null : date, late ? null : start, late)
        if (it.pass === 1) firstContactEnd = date
        placed.push(session)
      }
      return placed
    }
    studyDates.forEach((date, i) => {
      // What was done today already used part of today's time
      const placed = fill(date, i === 0 ? Math.max(0, caps[0]! - doneToday) : caps[i]!, false, false)
      sessions.push(...placed)
      days.push({ date, weekday: weekdayOf(date), phase: 'study', sessions: placed, minutes: placed.length * len })
    })
    for (const date of finalDates) days.push({ date, weekday: weekdayOf(date), phase: 'final', sessions: [], minutes: 0 })

    // Round 1 beyond the last study day: the same week, only to tell when the first contact would end
    const last = studyDates.at(-1) ?? addDays(today, -1)
    const weekly = hours.some(h => h * 60 >= len)
    if (weekly && phaseIndex < 2) {
      const virtualDates: string[] = []
      for (let i = 1; i <= VIRTUAL_DAYS_MAX && phaseIndex < 2; i += 30) {
        const batch = Array.from({ length: 30 }, (_, j) => addDays(last, i + j))
        const batchCaps = capacities(batch, hours, review, len)
        batch.forEach((date, j) => {
          if (phaseIndex >= 2) return
          virtualDates.push(date)
          sessions.push(...fill(date, batchCaps[j]!, true, true))
        })
      }
    }
    if (firstContactEnd && studyDates.length) lateDays = Math.max(0, daysBetween(last, firstContactEnd))
    else if (firstContactEnd) lateDays = daysBetween(today, firstContactEnd) + 1
  }

  // Done sessions (out of the queue): the same k as the open ones of their matéria
  const done: ScheduleDone[] = []
  const doneSessions = new Map<string, number>()
  for (const s of subjects) {
    for (const u of s.units) {
      for (const pass of [1, 2] as const) {
        if (stateOf(u, pass) !== 'done') continue
        done.push({ topicId: u.id, subjectName: s.name, topicName: u.name, pass, doneAt: doneAt.get(`${u.id}:${pass}`) || null })
        doneSessions.set(s.id, (doneSessions.get(s.id) ?? 0) + (pass === 1 ? kOf(s) : 1))
      }
    }
  }
  done.sort((a, b) => (a.doneAt ?? '').localeCompare(b.doneAt ?? ''))

  const onCalendar = sessions.filter(x => !x.late)
  const bySubject: ScheduleSubjectSummary[] = subjects.map(s => ({
    id: s.id,
    name: s.name,
    weight: Math.round(s.weight * 10) / 10,
    points: s.points,
    source: s.source,
    editalPoints: s.editalPoints,
    level: s.level,
    topics: s.units.length,
    seen: s.units.filter(u => stateOf(u, 1) === 'done').length,
    plannedMinutes: ((doneSessions.get(s.id) ?? 0) + onCalendar.filter(x => x.subjectId === s.id).length) * len,
    doneMinutes: (doneSessions.get(s.id) ?? 0) * len,
  }))

  const topics = bySubject.reduce((n, s) => n + s.topics, 0)
  const seen = bySubject.reduce((n, s) => n + s.seen, 0)

  // "N sessões atrás": what the plan placed from the day it was made until yesterday, minus what is done
  let behind = 0
  const created = input.createdAt && ISO_DATE.test(input.createdAt) ? input.createdAt.slice(0, 10) : null
  if (calendar && created && created < today) {
    const span = Math.min(daysBetween(created, today), 3650)
    const past = Array.from({ length: span }, (_, i) => addDays(created, i)).filter(d => daysBetween(d, examDate!) > FINAL_DAYS)
    const expected = capacities(past, hours, review, len).reduce((n, c) => n + c, 0)
    const doneTotal = [...doneSessions.values()].reduce((n, c) => n + c, 0)
    behind = Math.max(0, expected - doneTotal)
  }

  let overflow: ScheduleOverflow | null = null
  if (calendar && pass1Total > 0) {
    const pass1OnCalendar = onCalendar.filter(x => x.pass === 1).length
    const missingLate = pass1Total - pass1OnCalendar
    const missingShare = pass1Total - s1
    if (missingLate > 0 || missingShare > 0) {
      const missingSessions = missingLate > 0 ? missingLate : missingShare
      overflow = {
        kind: missingLate > 0 ? 'late' : 'tight',
        missingSessions,
        missingHours: Math.ceil((missingSessions * len) / 60 / SLACK),
        firstContactEnd,
        lateDays: missingLate > 0 ? lateDays : 0,
      }
    }
  }

  return {
    sessions,
    days,
    bySubject,
    done,
    summary: {
      sessions: calendar ? onCalendar.length : sessions.length,
      topics,
      seen,
      seenPct: topics ? Math.round((seen / topics) * 100) : 0,
      firstContactEnd,
      examDate,
      daysLeft,
      finalStart: calendar ? finalDates[0] ?? null : null,
      lastStudyDay: studyDates.at(-1) ?? null,
      behind,
      doneToday,
      reviewMinutes: review,
      weeklyMinutes: hours.reduce((n, h) => n + h * 60, 0),
      calendar,
    },
    overflow,
  }
}

/* ---- from the API (GET /topics/{id}/schedule) ---- */

export interface StudyScheduleResource {
  configured: boolean
  topic: { id: string, name: string }
  hours_by_weekday: number[] | null
  start_times: (string | null)[] | null
  session_minutes: number | null
  levels: Record<string, ScheduleLevel> | null
  weights: Record<string, { points: number, source: 'edital' | 'manual' }> | null
  exam: { id: string, title: string, date: string } | null
  /** edital_points: the edital's points even when the person's weight wins (null = the edital had none) */
  subjects: { id: string, name: string, edital_points?: number | null, topics: { id: string, name: string, cards: number, reviewed: number, accuracy: number | null }[] }[]
  progress: ScheduleProgressInput[]
  review: { daily_goal_batches: number, review_batch_size: number } | null
  created_at: string | null
  updated_at: string | null
}

export interface ScheduleSettings {
  hours: number[]
  startTimes: (string | null)[] | null
  sessionMinutes: number
}

/** The saved settings, or the defaults when there is no schedule yet */
export function scheduleSettingsOf(res: Pick<StudyScheduleResource, 'hours_by_weekday' | 'start_times' | 'session_minutes'>): ScheduleSettings {
  const hours = res.hours_by_weekday?.length === 7 ? [...res.hours_by_weekday] : [...DEFAULT_HOURS]
  return { hours, startTimes: res.start_times?.length === 7 ? [...res.start_times] : null, sessionMinutes: res.session_minutes ?? DEFAULT_SESSION_MINUTES }
}

export function scheduleInputFromResource(res: StudyScheduleResource, today: string, settings: ScheduleSettings = scheduleSettingsOf(res)): StudyScheduleInput {
  return {
    subjects: res.subjects.map(s => ({
      id: s.id,
      name: s.name,
      topics: s.topics,
      points: res.weights?.[s.id]?.points ?? null,
      source: res.weights?.[s.id]?.source ?? null,
      editalPoints: editalPointsOf(res, s.id),
      level: res.levels?.[s.id] ?? null,
    })),
    hoursByWeekday: settings.hours,
    startTimes: settings.startTimes,
    sessionMinutes: settings.sessionMinutes,
    examDate: res.exam?.date ?? null,
    today,
    reviewMinutes: reviewMinutesOf(res.review),
    progress: res.progress,
    createdAt: res.created_at,
  }
}

/* ---- words ---- */

const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const
export const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const

export function weekdayShort(iso: string): string {
  return WEEKDAYS_SHORT[weekdayOf(iso)]!
}

/** "17/11" */
export function dayMonth(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}`
}

/** "1 h", "30 min", "1 h 30" */
export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m} min`
  return m ? `${h} h ${m}` : `${h} h`
}

/** "Crase" or "Crase (1 de 2)"; the matéria alone when it has no assuntos */
export function sessionTopicLabel(s: Pick<StudySession, 'topicName' | 'part' | 'parts' | 'unit' | 'pass'>): string {
  const base = s.unit ? (s.pass === 2 ? 'Reforço' : 'Estudo da matéria') : s.topicName
  return s.parts > 1 ? `${base} (${s.part} de ${s.parts})` : base
}

/** The Monday of the week of `iso` */
export function weekStart(iso: string): string {
  const wd = weekdayOf(iso)
  return addDays(iso, wd === 0 ? -6 : 1 - wd)
}

/** The 7 days (Monday to Sunday) of the week that starts on `monday`, with the schedule's sessions */
export function weekDays(schedule: StudySchedule, monday: string): { date: string, day: StudyDay | null }[] {
  const byDate = new Map(schedule.days.map(d => [d.date, d]))
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i)
    return { date, day: byDate.get(date) ?? null }
  })
}

/** The first session on the calendar today, or the head of the queue without a calendar */
export function todaySessions(schedule: StudySchedule, today: string): StudySession[] {
  if (!schedule.summary.calendar) return schedule.sessions.slice(0, 1)
  return schedule.days.find(d => d.date === today)?.sessions ?? []
}

/** The next session after today (for "depois: …" and the hub line on a free day) */
export function nextSession(schedule: StudySchedule, today: string): StudySession | null {
  return schedule.sessions.find(s => !s.late && (s.date === null || s.date >= today)) ?? null
}

/** The progress with one (assunto, round) set or cleared, as the API keeps it (POST is idempotent, DELETE undoes) */
export function withProgress(progress: readonly ScheduleProgressInput[], topicId: string, pass: SchedulePass, status: 'done' | 'skipped' | null, at: string): ScheduleProgressInput[] {
  const rest = progress.filter(p => !(p.topic_id === topicId && p.pass === pass))
  return status ? [...rest, { topic_id: topicId, pass, status, done_at: at }] : rest
}

/** "seg a sex 2 h, sáb 3 h" (Monday first, days off left out); "nenhuma hora" when all are 0 */
export function hoursSummary(hours: readonly number[]): string {
  const order = [1, 2, 3, 4, 5, 6, 0]
  const runs: { from: number, to: number, h: number }[] = []
  for (const wd of order) {
    const h = hours[wd] ?? 0
    const last = runs.at(-1)
    if (last && last.h === h && order.indexOf(last.to) === order.indexOf(wd) - 1) last.to = wd
    else runs.push({ from: wd, to: wd, h })
  }
  const parts = runs.filter(r => r.h > 0).map((r) => {
    const days = r.from === r.to ? WEEKDAYS_SHORT[r.from] : `${WEEKDAYS_SHORT[r.from]} a ${WEEKDAYS_SHORT[r.to]}`
    return `${days} ${durationLabel(Math.round(r.h * 60))}`
  })
  return parts.length ? parts.join(', ') : 'nenhuma hora'
}

/* ---- the form (hours, session, the person's weights and levels) ---- */

export interface ScheduleDraft {
  hours: number[]
  startTimes: (string | null)[] | null
  sessionMinutes: number
  /** The person's weights only (absent = the origin: edital or size) */
  weights: Record<string, number>
  levels: Record<string, ScheduleLevel>
}

export function draftOf(res: StudyScheduleResource): ScheduleDraft {
  const settings = scheduleSettingsOf(res)
  const weights: Record<string, number> = {}
  for (const [id, w] of Object.entries(res.weights ?? {})) if (w.source === 'manual') weights[id] = w.points
  return { hours: settings.hours, startTimes: settings.startTimes, sessionMinutes: settings.sessionMinutes, weights, levels: { ...(res.levels ?? {}) } }
}

/** Points the edital gave a matéria (the person's own weight hides it: the API keeps one value) */
export function editalPointsOf(res: StudyScheduleResource, subjectId: string): number | null {
  const fromSubject = res.subjects.find(s => s.id === subjectId)?.edital_points
  if (typeof fromSubject === 'number') return fromSubject
  const w = res.weights?.[subjectId]
  return w?.source === 'edital' ? w.points : null
}

/** The input of buildStudySchedule with the form applied (the live preview of the sheet, and the first setup) */
export function inputWithDraft(res: StudyScheduleResource, draft: ScheduleDraft, today: string): StudyScheduleInput {
  const base = scheduleInputFromResource(res, today, { hours: draft.hours, startTimes: draft.startTimes, sessionMinutes: draft.sessionMinutes })
  return {
    ...base,
    subjects: base.subjects.map((s) => {
      const manual = draft.weights[s.id]
      const edital = editalPointsOf(res, s.id)
      return {
        ...s,
        points: manual ?? edital,
        source: manual !== undefined ? 'manual' as const : edital !== null ? 'edital' as const : null,
        level: draft.levels[s.id] ?? null,
      }
    }),
  }
}

/** PUT body: levels and weights are the person's edits only */
export function saveBodyOf(draft: ScheduleDraft) {
  return {
    hours_by_weekday: draft.hours,
    start_times: draft.startTimes,
    session_minutes: draft.sessionMinutes,
    levels: { ...draft.levels } as Record<string, string>,
    weights: { ...draft.weights } as Record<string, number | null>,
  }
}

/** 0 to 8 h in half hours, for a <select>: "Folga", "30 min", "1 h", "1 h 30" … */
export const HOUR_OPTIONS: { value: string, label: string }[] = Array.from({ length: 17 }, (_, i) => ({
  value: String(i / 2),
  label: i === 0 ? 'Folga' : durationLabel(i * 30),
}))
