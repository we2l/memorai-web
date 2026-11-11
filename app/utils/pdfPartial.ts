import type { Document } from '~/types'
import { nextMonthStartLabel } from '~/utils/billing'

export interface PartialRead {
  read: number
  total: number
}

/** Who reads the PDF: the paid plan (Intensivo), its trial or the Free. */
export type PdfReader = 'paid' | 'trial' | 'free'

/**
 * The pages the AI left out of a PDF (QA 2026-11 M1): only once the note is done (while it is being written,
 * processed_pages is still growing) and only when fewer pages than the PDF has were read. Null otherwise.
 */
export function partialRead(doc: Pick<Document, 'processed_pages' | 'pages_count' | 'note_generation_status'>): PartialRead | null {
  const status = doc.note_generation_status
  if (status === 'generating' || status === 'failed') return null
  const read = doc.processed_pages ?? 0
  const total = doc.pages_count ?? 0
  return read > 0 && total > 0 && read < total ? { read, total } : null
}

/**
 * The line of a partial read. The Free and the trial get "Desbloquear o resto" (upgrade); the paid plan never
 * (prd-uso-justo RN-3): it hit the pages per PDF or the month's pages, and the line says which one.
 */
export function partialReadNotice(
  p: PartialRead,
  reader: PdfReader,
  opts: { perPdfCap?: number | null; now?: Date } = {},
): { text: string; upgrade: boolean } {
  const base = `Parcial: ${reader === 'paid' ? 'a IA' : reader === 'trial' ? 'o teste' : 'o plano grátis'} leu ${p.read} de ${p.total} páginas.`
  if (reader !== 'paid') return { text: base, upgrade: true }
  if (opts.perPdfCap && p.read >= opts.perPdfCap) {
    return { text: `${base} O limite é de ${opts.perPdfCap} páginas por PDF.`, upgrade: false }
  }
  return { text: `${base} As páginas de PDF do mês acabaram. A contagem recomeça em ${nextMonthStartLabel(opts.now)}.`, upgrade: false }
}
