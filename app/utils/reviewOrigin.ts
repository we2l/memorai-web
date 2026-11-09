/**
 * The link of a card's origin in the review (prd-4d-revisao-v3 RF-F3): the quiz question, or the material (PDF part
 * or note) inside its caderno, opened with ?from=review and the way back to this session. Null for a pasted question
 * (it opens a dialog over the session) and without a topic. Pure; shared by ReviewOrigin and the desktop side column
 * (prd-visual-e2 RF-2.6).
 */
import type { CardOrigin } from '~/types'
import { cadernoPath } from '~/utils/scope'

export function reviewOriginLink(origin: CardOrigin | null | undefined, topicId: string | null | undefined, backTo: string): string | null {
  if (!origin) return null
  if (origin.kind === 'quiz') return `/simulados/${origin.quiz_id}/resultado${origin.question_number ? `#q${origin.question_number}` : ''}`
  if (origin.kind === 'question') return null
  const topic = (origin.kind === 'note' && origin.topic_id) || topicId
  if (!topic) return null
  return `${cadernoPath(topic, { note: origin.note_id })}?from=review&back=${encodeURIComponent(backTo)}`
}
