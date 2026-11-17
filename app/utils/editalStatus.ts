/**
 * The one state of a conferred edital page (prd-paginas-edital-publicas RF-W4): inscrições and prova are told only by
 * this function, on the build (noindex, sitemap, primary call) and again on the visitor's day (the page fixes itself
 * the day after the exam, before the daily rebuild). No imports: modules/editais runs it in Node at build time.
 *
 * Days are AAAA-MM-DD strings of São Paulo (the study day); comparing them as strings is comparing dates.
 */

export type EditalState =
  | 'inscricoes_a_abrir'
  | 'inscricoes_abertas'
  | 'inscricoes_encerradas'
  | 'prova_a_frente'
  | 'sem_data'
  | 'prova_realizada'
  | 'suspenso'
  | 'cancelado'

/** The fields of the page that decide the state (modules/editais/types EditalPage has them) */
export interface EditalStatusInput {
  edital: {
    inscricoes_inicio?: string | null
    inscricoes_fim?: string | null
    prova?: string | null
    prova_prevista?: boolean | null
  }
  expires_on?: string | null
  status_override?: 'suspenso' | 'cancelado' | null
  status_date?: string | null
}

export interface EditalStatus {
  state: EditalState
  /** The line of the Situação box: the only text of the page about inscrição or prova */
  label: string
  /** Still useful to a candidate of this edital: indexable, in the sitemap, "Estudar isso no Baigi" is the primary */
  open: boolean
}

/** The study day of São Paulo (same rule as utils/greeting studyDay, copied: this file has no imports) */
export function editalToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** 2026-03-14 → "14/03" */
export function editalShortDate(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}`
}

/** 2026-03-14 → "14/03/2026" */
export function editalFullDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/** The last day the page serves a candidate of this edital: the exam, or `expires_on` without one */
export function editalLastDay(input: EditalStatusInput): string | null {
  return input.edital.prova ?? input.expires_on ?? null
}

export function editalStatus(input: EditalStatusInput, today: string): EditalStatus {
  const { edital } = input
  if (input.status_override === 'cancelado') return { state: 'cancelado', label: 'Concurso cancelado', open: false }
  if (input.status_override === 'suspenso') {
    return { state: 'suspenso', label: input.status_date ? `Concurso suspenso em ${editalFullDate(input.status_date)}` : 'Concurso suspenso', open: false }
  }
  const prova = edital.prova ?? null
  const last = editalLastDay(input)
  if (last && today > last) {
    return { state: 'prova_realizada', label: prova ? `A prova foi em ${editalFullDate(prova)}` : `Encerrado em ${editalFullDate(last)}`, open: false }
  }
  const provaText = prova ? `${edital.prova_prevista ? 'prova prevista para' : 'prova em'} ${editalShortDate(prova)}` : null
  const fim = edital.inscricoes_fim ?? null
  const inicio = edital.inscricoes_inicio ?? null
  if (fim && today <= fim) {
    if (inicio && today < inicio) return { state: 'inscricoes_a_abrir', label: `Inscrições de ${editalShortDate(inicio)} a ${editalShortDate(fim)}`, open: true }
    return { state: 'inscricoes_abertas', label: `Inscrições abertas até ${editalShortDate(fim)}`, open: true }
  }
  if (fim) return { state: 'inscricoes_encerradas', label: provaText ? `Inscrições encerradas · ${provaText}` : 'Inscrições encerradas', open: true }
  if (provaText) return { state: 'prova_a_frente', label: provaText.charAt(0).toUpperCase() + provaText.slice(1), open: true }
  return { state: 'sem_data', label: 'Data da prova ainda não divulgada', open: true }
}
