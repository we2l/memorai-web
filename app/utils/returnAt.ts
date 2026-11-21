/**
 * When a moment (ms) comes back, said like returnText: in 3 min → "em 3 min", in 5 h → "em 5 h", tomorrow → "amanhã".
 * Kept apart from utils/intervalLabel (shared by the review and the visitor's batch): only the end of a session uses it.
 */
import { returnText } from '~/utils/intervalLabel'

export function returnTextAt(at: number, now = Date.now()): string {
  const minutes = Math.max(1, Math.ceil((at - now) / 60_000))
  if (minutes < 60) return returnText(`${minutes}min`)
  if (minutes < 24 * 60) return returnText(`${Math.round(minutes / 60)}h`)
  return returnText(`${Math.round(minutes / (24 * 60))}d`)
}
