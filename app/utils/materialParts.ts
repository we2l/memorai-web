import type { MaterialPart } from '~/types'

/** The parts of a PDF on screen (prd-4c-material-v3 4c-2, RF-F14..F15). A part is a note. */
/** "p. 1–30 · 31 cards · 62%", or the state of a part that is not ready. */
export function partMetaText(part: MaterialPart): string {
  if (part.status === 'generating' || part.status === 'processing') return 'gerando nota…'
  if (part.status === 'failed') return 'não deu para ler esta parte'
  const end = part.page_end && part.page_end !== part.page_start ? `–${part.page_end}` : ''
  const pages = part.page_start ? `p. ${part.page_start}${end} · ` : ''
  if (!part.cards) return `${pages}sem cards ainda`
  return `${pages}${part.cards} ${part.cards === 1 ? 'card' : 'cards'}${part.mastery != null ? ` · ${part.mastery}%` : ''}`
}

/** The parts around the open note, in the reading order of the list. */
export function partNeighbors(parts: readonly MaterialPart[], noteId: string): { previous: MaterialPart | null; next: MaterialPart | null } {
  const i = parts.findIndex(p => p.note_id === noteId)
  if (i < 0) return { previous: null, next: null }
  return { previous: parts[i - 1] ?? null, next: parts[i + 1] ?? null }
}
