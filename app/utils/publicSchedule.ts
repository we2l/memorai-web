// Cronograma of the free tool (prd-cronograma RF-W5): the same pure function as the caderno over the public reading.
// Matérias and assuntos have no ids, so they go by position ("s0", "0.3" = topicKey); the weight of the edital comes
// by the matéria's name; the hours, the session, the weights and the typed exam date stay on this device; the
// assuntos marked "estudado" count as seen (the first contact is done).
import type { EditalProposal, EditalWeight } from '~/types'
import { topicKey } from '~/utils/publicEdital'
import { DEFAULT_HOURS, DEFAULT_SESSION_MINUTES, type ScheduleDraft, type ScheduleProgressInput, type StudyScheduleInput } from '~/utils/studySchedule'

export interface PublicScheduleState {
  hours: number[]
  startTimes: (string | null)[] | null
  sessionMinutes: number
  /** The visitor's weights, by matéria position */
  weights: Record<string, number>
  /** Typed when the edital has no date */
  examDate: string | null
}

export const publicScheduleKey = (id: string) => `baigi-edital-schedule-${id}`
export const subjectKey = (index: number) => `s${index}`

export function defaultPublicSchedule(): PublicScheduleState {
  return { hours: [...DEFAULT_HOURS], startTimes: null, sessionMinutes: DEFAULT_SESSION_MINUTES, weights: {}, examDate: null }
}

export function loadPublicSchedule(id: string): PublicScheduleState {
  const base = defaultPublicSchedule()
  try {
    const raw = localStorage.getItem(publicScheduleKey(id))
    const v = raw ? JSON.parse(raw) as Partial<PublicScheduleState> : null
    if (!v || typeof v !== 'object') return base
    const hours = Array.isArray(v.hours) && v.hours.length === 7 && v.hours.every(h => typeof h === 'number' && h >= 0 && h <= 8) ? v.hours : base.hours
    const startTimes = Array.isArray(v.startTimes) && v.startTimes.length === 7 ? v.startTimes.map(t => (typeof t === 'string' && /^\d{2}:\d{2}$/.test(t) ? t : null)) : null
    const sessionMinutes = [30, 60, 90].includes(Number(v.sessionMinutes)) ? Number(v.sessionMinutes) : base.sessionMinutes
    const weights: Record<string, number> = {}
    for (const [k, n] of Object.entries(v.weights ?? {})) if (typeof n === 'number' && n >= 0 && n <= 1000) weights[k] = n
    const examDate = typeof v.examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.examDate) ? v.examDate : null
    return { hours, startTimes, sessionMinutes, weights, examDate }
  } catch {
    // intencional: sem localStorage (ou valor ilegível) o cronograma abre com os padrões
    return base
  }
}

export function savePublicSchedule(id: string, state: PublicScheduleState): void {
  try {
    localStorage.setItem(publicScheduleKey(id), JSON.stringify(state))
  } catch { /* intencional: sem localStorage as horas só duram enquanto a página estiver aberta */ }
}

const fold = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** The edital's points of a matéria, by its name (no accents, case or punctuation) */
export function editalPointsByName(weights: readonly EditalWeight[] | null | undefined, name: string): number | null {
  const target = fold(name)
  const hit = (weights ?? []).find(w => fold(w.subject) === target)
  return hit && Number.isFinite(hit.points) ? hit.points : null
}

export function publicFormSubjects(proposal: EditalProposal, weights: readonly EditalWeight[] | null | undefined) {
  return proposal.subjects.map((s, si) => ({ id: subjectKey(si), name: s.name, topics: Math.max(1, s.topics.length), editalPoints: editalPointsByName(weights, s.name) }))
}

export function publicDraft(state: PublicScheduleState): ScheduleDraft {
  return { hours: state.hours, startTimes: state.startTimes, sessionMinutes: state.sessionMinutes, weights: state.weights, levels: {} }
}

export function publicScheduleInput(
  proposal: EditalProposal,
  weights: readonly EditalWeight[] | null | undefined,
  state: PublicScheduleState,
  checked: ReadonlySet<string>,
  today: string,
): StudyScheduleInput {
  const progress: ScheduleProgressInput[] = []
  const subjects = proposal.subjects.map((s, si) => {
    const id = subjectKey(si)
    const manual = state.weights[id]
    const edital = editalPointsByName(weights, s.name)
    // A matéria without assuntos is its own unit: its key is the matéria's
    const topics = s.topics.map((t, ti) => ({ id: topicKey(si, ti), name: t.name }))
    for (const t of topics) if (checked.has(t.id)) progress.push({ topic_id: t.id, pass: 1, status: 'done', done_at: null })
    return { id, name: s.name, topics, points: manual ?? edital, source: manual !== undefined ? 'manual' as const : edital !== null ? 'edital' as const : null }
  })
  return {
    subjects,
    hoursByWeekday: state.hours,
    startTimes: state.startTimes,
    sessionMinutes: state.sessionMinutes,
    examDate: proposal.exam_date ?? state.examDate,
    today,
    reviewMinutes: 0,
    progress,
  }
}

/** "Peso do edital: LP 10, RL 5 e mais 3" */
export function weightsLine(weights: readonly EditalWeight[] | null | undefined): string {
  const w = weights ?? []
  if (!w.length) return 'Peso pelo tamanho de cada matéria (o número de assuntos).'
  const shown = w.slice(0, 4).map(x => `${x.subject} ${x.points.toLocaleString('pt-BR')}`).join(', ')
  return `Peso do edital: ${shown}${w.length > 4 ? ` e mais ${w.length - 4}` : ''}.`
}

/* ---- the e-mail before the PDF and the .ics (once per visit) ---- */

let leadEmail: string | null = null

export function rememberLeadEmail(email: string): void {
  leadEmail = email
}

export function rememberedLeadEmail(): string | null {
  return leadEmail
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

/** Where the PDF's invite sends the reader */
export const PDF_INVITE_PATH = '/comecar?utm_source=edital&utm_medium=pdf'
