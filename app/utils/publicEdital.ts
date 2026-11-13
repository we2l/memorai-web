// Edital verticalizado grátis (prd-edital-verticalizado-publico): types of the API (§4), the messages of its
// errors with the next step, the "estudado" state kept on the device and the exam countdown.
import type { EditalProposal } from '~/types'
import { getErrorStatus } from '~/utils/apiErrors'
import { studyDay } from '~/utils/greeting'
import { EDITAL_INTENT_KEY } from '~/utils/editalIntent'

export type PublicEditalStatus = 'pending' | 'processing' | 'choose' | 'ready' | 'failed' | 'expired'
export type PublicEditalErrorCode = 'edital_not_found' | 'pdf_image' | 'no_subjects' | 'pages_out_of_range'

export interface PublicEditalAlternative {
  section: number
  label: string
  /** "154-156" (or {from, to}) */
  pages?: string | { from: number, to: number } | null
}

export interface PublicEditalReading {
  id: string
  status: PublicEditalStatus
  cached?: boolean
  proposal?: EditalProposal | null
  alternatives?: PublicEditalAlternative[]
  error?: { code: string, message?: string } | null
  counts?: { subjects: number, topics: number }
  curated?: { slug: string, source_url: string, checked_at: string } | null
  created_at?: string
  expires_at?: string
}

export const PUBLIC_EDITAL_LIMITS = { fileMb: 20, textMin: 200, textMax: 60_000, pageSpan: 40 } as const

/** Where the person goes to fix the input after a refusal */
export type PublicEditalNext = 'text' | 'pages' | 'account' | null

export interface PublicEditalMessage { code: string, message: string, next: PublicEditalNext }

const FALLBACK = 'Não foi possível ler o edital agora. Tente de novo.'

/** What a failed reading (status failed) says, with the way on: the API's code decides, its text is the fallback. */
export function failedReading(error: PublicEditalReading['error'], input: 'pdf' | 'text' = 'pdf'): PublicEditalMessage {
  const code = error?.code ?? 'unknown'
  switch (code) {
    case 'edital_not_found':
      return input === 'text'
        ? { code, next: null, message: 'Não achamos matérias e assuntos neste texto. Cole a parte do edital com o conteúdo programático.' }
        : { code, next: 'pages', message: 'Não achamos o conteúdo programático neste PDF. Diga as páginas em que ele está ou cole o texto.' }
    case 'pdf_image':
      return { code, next: 'text', message: 'Este PDF parece ser uma imagem, sem texto para ler. Cole o texto do conteúdo programático.' }
    case 'no_subjects':
      return { code, next: 'text', message: 'Achamos o trecho, mas não deu para separar as matérias. Cole só a parte com a lista de matérias e assuntos.' }
    case 'pages_out_of_range':
      return { code, next: 'pages', message: 'O PDF não tem essas páginas. Confira os números e tente de novo.' }
    case 'unavailable':
      return { code, next: null, message: 'Não conseguimos ler agora. Tente de novo em instantes.' }
    default:
      return { code, next: input === 'pdf' ? 'text' : null, message: error?.message || FALLBACK }
  }
}

interface ErrorData { message?: string, code?: string, errors?: Record<string, string[] | string> }

function dataOf(e: unknown): ErrorData {
  const err = e as { data?: ErrorData, response?: { _data?: ErrorData } } | null
  return err?.data ?? err?.response?._data ?? {}
}

function firstError(errors: ErrorData['errors']): string {
  for (const key of ['file', 'text', 'captcha_token', 'page_from', 'page_to', 'section']) {
    const v = errors?.[key]
    const first = Array.isArray(v) ? v[0] : v
    if (typeof first === 'string' && first) return first
  }
  return ''
}

/** What a refused POST /public/editais (or the report) says, with the next step. */
export function submitFailure(e: unknown): PublicEditalMessage {
  const status = getErrorStatus(e)
  const data = dataOf(e)
  const code = data.code ?? (status ? `http_${status}` : 'network')
  const text = typeof data.message === 'string' ? data.message : ''
  if (status === undefined) return { code, next: null, message: 'Sem conexão. Confira a internet e tente de novo.' }
  if (status === 429) {
    if (code === 'edital_public_busy') return { code, next: null, message: 'Já estamos lendo um edital seu. Espere terminar e tente de novo.' }
    if (code === 'edital_public_ip_limit') {
      return { code, next: 'account', message: text || 'Você já verticalizou 2 editais hoje. Volte amanhã ou crie uma conta grátis para usar no Baigi.' }
    }
    return { code, next: null, message: 'Muitas tentativas. Espere um minuto.' }
  }
  if (status === 503) {
    if (code === 'edital_public_daily_cap') return { code, next: null, message: text || 'Muita gente usando agora. Tente de novo amanhã.' }
    return { code: code === 'http_503' ? 'captcha_unavailable' : code, next: null, message: 'Não conseguimos verificar agora. Tente de novo em instantes.' }
  }
  if (status === 404) return { code, next: null, message: 'Ferramenta indisponível no momento.' }
  if (status === 413) return { code, next: 'text', message: `O PDF passa de ${PUBLIC_EDITAL_LIMITS.fileMb} MB. Cole o texto do conteúdo programático.` }
  if (status === 422) return { code, next: null, message: firstError(data.errors) || text || 'Confira o arquivo ou o texto e tente de novo.' }
  return { code, next: null, message: text || FALLBACK }
}

/** "154-156" or {from, to} → "Páginas 154 a 156" */
export function alternativePages(pages: PublicEditalAlternative['pages']): string | null {
  if (!pages) return null
  if (typeof pages === 'object') return `Páginas ${pages.from} a ${pages.to}`
  const m = /^(\d+)\s*[-–]\s*(\d+)$/.exec(pages.trim())
  if (m) return m[1] === m[2] ? `Página ${m[1]}` : `Páginas ${m[1]} a ${m[2]}`
  return pages.trim() ? `Páginas ${pages.trim()}` : null
}

/** "10 matérias · 148 assuntos" */
export function countsLine(subjects: number, topics: number): string {
  return `${subjects} ${subjects === 1 ? 'matéria' : 'matérias'} · ${topics} ${topics === 1 ? 'assunto' : 'assuntos'}`
}

/* ---- Intent: "Estudar isso no Baigi" before the account ---- */

export function saveEditalIntent(id: string): void {
  try { localStorage.setItem(EDITAL_INTENT_KEY, id) } catch { /* intencional: sem localStorage a pessoa só repete o clique depois do cadastro */ }
}

export function clearEditalIntent(): void {
  try { localStorage.removeItem(EDITAL_INTENT_KEY) } catch { /* intencional: nada a limpar sem localStorage */ }
}

/* ---- Estudado (per device, localStorage `baigi-edital-{id}`) ---- */

export const checkedKey = (id: string) => `baigi-edital-${id}`
/** One assunto = "matéria.assunto" by position: the reading never changes once it exists */
export const topicKey = (subject: number, topic: number) => `${subject}.${topic}`

export function loadChecked(id: string): Set<string> {
  try {
    const raw = localStorage.getItem(checkedKey(id))
    const v: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(v) ? v.filter((k): k is string => typeof k === 'string') : [])
  } catch {
    // intencional: sem localStorage (ou valor ilegível) a lista abre toda desmarcada
    return new Set()
  }
}

export function saveChecked(id: string, checked: Set<string>): void {
  try {
    if (checked.size === 0) localStorage.removeItem(checkedKey(id))
    else localStorage.setItem(checkedKey(id), JSON.stringify([...checked]))
  } catch { /* intencional: sem localStorage a marcação só dura enquanto a página estiver aberta */ }
}

export function topicsTotal(proposal: EditalProposal): number {
  return proposal.subjects.reduce((n, s) => n + s.topics.length, 0)
}

/** Marked assuntos that still exist in the proposal (a stale key from another shape counts for nothing) */
export function studiedCount(proposal: EditalProposal, checked: ReadonlySet<string>): number {
  let n = 0
  proposal.subjects.forEach((s, si) => s.topics.forEach((_, ti) => { if (checked.has(topicKey(si, ti))) n++ }))
  return n
}

export function subjectStudied(subject: { topics: unknown[] }, subjectIndex: number, checked: ReadonlySet<string>): number {
  return subject.topics.filter((_, ti) => checked.has(topicKey(subjectIndex, ti))).length
}

let checkEventSent = false

/** The analytics `edital_public_check` goes once per session: true the first time it is asked */
export function claimCheckEvent(): boolean {
  if (checkEventSent) return false
  checkEventSent = true
  return true
}

/** Bucket of the percentage studied for the analytics (never the exact number) */
export function pctBucket(studied: number, total: number): string {
  if (total <= 0 || studied <= 0) return '0'
  const pct = Math.round((studied / total) * 100)
  if (pct >= 100) return '100'
  if (pct <= 25) return '1-25'
  if (pct <= 50) return '26-50'
  if (pct <= 75) return '51-75'
  return '76-99'
}

/* ---- Prova ---- */

/** Whole days from today (study day of São Paulo) to `iso` (AAAA-MM-DD); negative when it passed, null if invalid. */
export function daysToExam(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null
  const exam = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(exam)) return null
  return Math.round((exam - Date.parse(`${studyDay(now)}T00:00:00Z`)) / 86_400_000)
}

/** "21/02/2027" from AAAA-MM-DD, with no timezone in the way */
export function examDateLabel(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/** "Prova em 21/02/2027 · faltam 100 dias"; null without a valid date */
export function examLine(iso: string | null | undefined, now: Date = new Date()): string | null {
  const days = daysToExam(iso, now)
  if (days === null || !iso) return null
  const date = `Prova em ${examDateLabel(iso)}`
  if (days < 0) return `${date} · já passou`
  if (days === 0) return `${date} · é hoje`
  if (days === 1) return `${date} · falta 1 dia`
  return `${date} · faltam ${days} dias`
}
