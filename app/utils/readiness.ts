// Prontidão para a prova (prd-prontidao-prova RF-F1): the texts and links of the readiness of GET /exams and
// /exams/upcoming. The number is an estimate of the preparation, never a chance of passing (DD2): no text here says
// "chance" or "aprovação".
import type { ReadinessAction, ReadinessPart } from '~/types'
import { plural } from '~/utils/greeting'

// The text of the missing number lives apart (the hub of the caderno imports only it)
export { readinessMissingText } from '~/utils/readinessMissing'

/** Short names of the parts for the one-line summary ("Memória 88 · Em dia 95 · Questões 64") */
const SHORT: Record<ReadinessPart['key'], string> = {
  memory: 'Memória',
  on_track: 'Em dia',
  questions: 'Questões',
  coverage: 'Assuntos',
}

/** The enabled parts with a value, in one line; a part without data says so ("Questões: falta medir") */
export function readinessPartsText(parts: ReadinessPart[]): string {
  return parts
    .filter(p => p.enabled)
    .map(p => (p.value === null ? `${SHORT[p.key]}: ${p.key === 'questions' ? 'falta medir' : 'sem dados'}` : `${SHORT[p.key]} ${p.value}`))
    .join(' · ')
}

/** Where an action leads and its sentence (§5.5) */
export function readinessActionLink(action: ReadinessAction): { to: string; label: string } {
  switch (action.kind) {
    case 'review_late':
      return {
        to: action.topic_id ? `/revisar?scope=topic:${action.topic_id}&backlog=1` : '/revisar?backlog=1',
        label: action.count === 1 ? 'Revise o card atrasado da prova' : `Revise os ${action.count} cards atrasados da prova`,
      }
    case 'follow_plan':
      return { to: '/revisar', label: `Siga o plano do atraso: ${plural(action.count, 'card', 'cards')}` }
    case 'raise_new':
      return { to: '/configuracoes#estudo', label: `Veja ${plural(action.per_day, 'card novo', 'cards novos')} por dia para alcançar todos até a prova` }
    case 'practice_weak':
      return { to: `/simulados?topic_id=${action.topic_id}&count=10`, label: `Faça 10 questões de ${action.topic_name}: acerto ${action.accuracy}%` }
    case 'practice_start':
      return {
        to: action.topic_id ? `/simulados?topic_id=${action.topic_id}&count=10` : '/simulados',
        label: 'Faça 10 questões da prova para medir seu acerto',
      }
    case 'review_weak':
      return {
        to: `/revisar?scope=topic:${action.topic_id}`,
        label: action.mastery === null ? `Revise ${action.topic_name}` : `Revise ${action.topic_name}: domínio ${Math.round(action.mastery)}%`,
      }
    case 'create_cards':
      return { to: `/cadernos/${action.topic_id}`, label: `Crie cards de ${action.topic_name}: nenhum card cobre esse assunto` }
  }
}
