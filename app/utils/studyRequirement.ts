import { getErrorStatus } from './apiErrors'

/**
 * What a caderno still needs before a quiz or a podcast (prd-caderno-f1-pontes RF-B6/RF-F5).
 * Same shape in `/topics/{id}/details` (`can_quiz`, `can_podcast`) and in the 422 of POST /quizzes
 * and POST /podcasts, so the screen says the requirement before the action and never shows a raw 422.
 */
export type StudyRequirementCode = 'needs_material' | 'needs_cards' | 'needs_reviewed_cards'

export interface StudyGate {
  ok: boolean
  code?: StudyRequirementCode | string
  requirement?: { required: number; current: number }
  message?: string
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function missingText(req?: StudyGate['requirement']): string {
  if (!req) return ''
  const missing = Math.max(0, req.required - req.current)
  if (!missing) return ''
  return ` · ${missing === 1 ? 'falta' : 'faltam'} ${missing}`
}

/** "Revise 5 cards para liberar · faltam 3"; null when nothing is missing. */
export function requirementText(gate: StudyGate | null | undefined): string | null {
  if (!gate || gate.ok) return null
  const req = gate.requirement
  switch (gate.code) {
    case 'needs_reviewed_cards':
      return `Revise ${plural(req?.required ?? 5, 'card', 'cards')} para liberar${missingText(req)}`
    case 'needs_cards':
      // Only the podcast asks for it, and the 5 reviews come right after (same rule as the API)
      return 'Crie cards e faça 5 revisões para liberar'
    case 'needs_material':
      return `Escreva ${req?.required ?? 100} palavras em notas para liberar${missingText(req)}`
    default:
      return gate.message || 'Este caderno ainda não tem material suficiente.'
  }
}

/** A 422 with `code` from POST /quizzes or POST /podcasts as a gate; null for any other error. */
export function gateFromError(e: unknown): StudyGate | null {
  if (getErrorStatus(e) !== 422) return null
  const err = e as { data?: any; response?: { _data?: any } } | null
  const data = err?.data ?? err?.response?._data
  if (!data || typeof data.code !== 'string') return null
  const req = data.requirement
  const requirement = req && typeof req.required === 'number' && typeof req.current === 'number'
    ? { required: req.required, current: req.current }
    : undefined
  return { ok: false, code: data.code, requirement, message: typeof data.message === 'string' ? data.message : undefined }
}
