// "Como calculamos" of the readiness (prd-prontidao-prova RF-F4): only the agenda of Progresso reads it, so it lives
// apart from utils/readiness.ts and stays out of the static closure of /hoje (bundle budget).
import type { ReadinessPart } from '~/types'
import { plural } from '~/utils/greeting'

/** One part in full, for "Como calculamos" */
export function readinessPartText(part: ReadinessPart): string {
  const weight = `${Math.round(part.weight * 100)}%`
  if (part.value === null) {
    if (part.key === 'questions') {
      return `${part.label} (peso ${weight}): aparece com ${part.min_answered ?? 10} questões respondidas (você tem ${part.answered ?? 0}).`
    }
    return `${part.label} (peso ${weight}): sem dados ainda.`
  }
  const detail = part.key === 'memory'
    ? ` (lembrando ${part.keep_pace}% mantendo o ritmo, ${part.stop_today}% se parar hoje)`
    : part.key === 'on_track' && part.late
      ? ` (${plural(part.late, 'card atrasado', 'cards atrasados')} de ${part.in_review})`
      : part.key === 'questions'
        ? ` (${plural(part.answered ?? 0, 'questão respondida', 'questões respondidas')})`
        : ''
  return `${part.label} (peso ${weight}): ${part.value}${detail}.`
}

