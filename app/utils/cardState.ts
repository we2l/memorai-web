/**
 * How a card stands today, said in words (prd-4c-material-v3 RF-F4/RF-F11: the state always has text, the
 * tag color never informs alone). Pure: the material panel, the library and their tests share it.
 */
import type { CardOrigin } from '~/types'

export type CardStanding = 'new' | 'overdue' | 'today' | 'ok'

export interface CardStateInfo {
  standing: CardStanding
  label: string
  tone: 'info' | 'danger' | 'warning' | 'success'
}

const DAY = 86_400_000

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Whole days from today to the due date (negative: overdue), by the local calendar day. */
export function daysFromToday(due: string, now = new Date()): number {
  return Math.round((startOfDay(new Date(due)) - startOfDay(now)) / DAY)
}

/** "novo" · "atrasado" · "vence hoje" · "em dia". */
export function cardState(card: { state: string; due: string | null }, now = new Date()): CardStateInfo {
  if (card.state === 'new' || !card.due) return { standing: 'new', label: 'novo', tone: 'info' }
  const days = daysFromToday(card.due, now)
  if (days < 0) return { standing: 'overdue', label: 'atrasado', tone: 'danger' }
  if (days === 0) return { standing: 'today', label: 'vence hoje', tone: 'warning' }
  return { standing: 'ok', label: 'em dia', tone: 'success' }
}

/** "vence em 3 d" · "vence hoje" · "venceu há 2 d"; empty for a new card. */
export function dueLabel(card: { state: string; due: string | null }, now = new Date()): string {
  if (card.state === 'new' || !card.due) return ''
  const days = daysFromToday(card.due, now)
  if (days === 0) return 'vence hoje'
  if (days > 0) return `vence em ${days} d`
  return `venceu há ${-days} d`
}

/** Name of a PDF without the extension ("Apostila.pdf" → "Apostila"). */
export function documentTitle(name: string): string {
  return name.replace(/\.pdf$/i, '')
}

/** Short origin of a library row: "Apostila · parte 2", the note title, or "Questão 7 · Simulado". */
export function originShort(origin: CardOrigin | null | undefined): string {
  if (!origin) return ''
  if (origin.kind === 'quiz') return origin.question_number ? `Questão ${origin.question_number} · ${origin.title}` : origin.title
  if (origin.kind === 'document') {
    const name = documentTitle(origin.document_name)
    return origin.part && origin.part.total > 1 ? `${name} · parte ${origin.part.index}` : name
  }
  return origin.title || 'Nota'
}
