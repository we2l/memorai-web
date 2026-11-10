// What is left before the readiness number shows (prd-prontidao-prova RF-F2): its own module, so the hub of the
// caderno (/cadernos/{id}) takes only this text and not the actions of the Hoje and the Progresso.
import type { ExamReadiness } from '~/types'
import { plural } from '~/utils/greeting'

/** What is left before the number shows ("Revise mais 8 cards da prova para ver sua prontidão.") */
export function readinessMissingText(readiness: ExamReadiness | null | undefined): string {
  const m = readiness?.missing
  if (!m) return 'Revise alguns cards dos assuntos da prova para ver sua prontidão.'
  const cards = Math.max(0, m.cards_needed - m.cards)
  if (cards > 0) return `Crie mais ${plural(cards, 'card', 'cards')} dos assuntos da prova para ver sua prontidão.`
  const graduated = Math.max(0, m.graduated_needed - m.graduated)
  if (graduated > 0) return `Revise mais ${plural(graduated, 'card', 'cards')} da prova para ver sua prontidão.`
  return 'Revise alguns cards dos assuntos da prova para ver sua prontidão.'
}
