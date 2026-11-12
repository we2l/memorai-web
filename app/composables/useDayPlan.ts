/**
 * Plan of the day on Hoje (prd-4a-hoje-v3 RF-F3, §5.2): up to 4 steps in a fixed order (Revisar,
 * Questões, Ouvir, Continuar material), each one only when there is data for it. A pure function of the
 * API answers, so the rules are tested without the screen. The first visible step carries the only
 * primary button of the screen.
 */
import type { BacklogState, BacklogStats, PendingAction, Podcast, RecentNote, Stats, TopicPerformance, TopicProgress } from '~/types'
import { cadernoPath } from '~/utils/scope'
import { REVIEW_BATCH, SECONDS_PER_CARD } from '~/utils/reviewBatch'
import { openedLabel, plural } from '~/utils/greeting'

export type DayPlanKey = 'review' | 'quiz' | 'listen' | 'material'

export interface DayPlanStep {
  key: DayPlanKey
  /** Practice mode of the icon; null = neutral document icon */
  mode: 'review' | 'quiz' | 'listen' | null
  title: string
  detail: string
  action: { label: string; to?: string; podcast?: Podcast }
  primary: boolean
  /** Revisar: overdue cards beyond today's session ("Recuperar atraso") */
  overdue?: number
  /** Revisar: survival mode is on ("Modo recuperação ligado · Desligar") */
  survival?: boolean
  /** Revisar: the backlog apart from today (prd-revisao-v5-fase-b RF-F1): the line "Atraso · Recuperar em dias" */
  backlog?: BacklogState
  /** Minutes this step adds to the day (sentence of the greeting) */
  minutes: number
}

export interface DayPlanInput {
  stats: Stats | null
  backlog: BacklogStats | null
  survivalMode?: boolean
  /** /topics/progress: flat list, cadernos and subjects */
  progress: TopicProgress[]
  /** /topics/performance: accuracy in questions by topic (prd-4b-caderno-v3 RF-F14) */
  performance?: TopicPerformance[]
  pendingActions: PendingAction[]
  /** /podcasts page 1 */
  podcasts: Podcast[]
  recentNote: RecentNote | null
  /** /me.default_learning_mode: `language` hides Questões (D11) */
  learningMode?: string | null
  /**
   * The review of the day lives in the goal block (A2, prd-visual-a2 RF-2.4): drop the Revisar step when there is
   * something due today, and then no step carries the primary (the goal block does). The "Recuperar o atraso" step
   * (nothing due, only the backlog) stays, since the goal block does not offer it.
   */
  withoutReview?: boolean
  now?: Date
}

/** Batch when /stats.goal does not say (the person picks 10, 20 or 30) */
export const BATCH_SIZE = REVIEW_BATCH
export { SECONDS_PER_CARD }
/** Questões step: one short set of questions */
export const QUIZ_MINUTES = 10
const QUIZ_MIN_CARDS = 10
const EPISODE_MAX_AGE_DAYS = 7
const MATERIAL_MAX_AGE_DAYS = 14
const DAY_MS = 86_400_000

const ageDays = (iso: string | null | undefined, now: Date) => {
  const t = iso ? new Date(iso).getTime() : Number.NaN
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : (now.getTime() - t) / DAY_MS
}

function reviewStep(input: DayPlanInput): DayPlanStep | null {
  const due = input.stats?.due_today ?? 0
  // The backlog is not in due_today when active (prd-revisao-v5-fase-b): a line of its own, never a big number
  const state = input.stats?.backlog ?? input.backlog?.backlog ?? null
  const backlogShown = !!state && (!!state.plan || (state.active && state.overdue > 0) || state.new_paused)
  if (due <= 0) {
    if (!state || !state.active || state.overdue <= 0) return null
    return {
      key: 'review',
      mode: 'review',
      title: 'Recuperar o atraso',
      detail: 'Nada novo para hoje: só os cards de dias que passaram',
      action: { label: 'Revisar o atraso', to: '/revisar?backlog=1' },
      primary: false,
      backlog: state,
      minutes: Math.ceil((Math.min(state.overdue, input.stats?.goal?.batch_size || BATCH_SIZE) * SECONDS_PER_CARD) / 60),
    }
  }
  const roots = input.progress.filter(t => !t.parent_id && (t.session_count ?? 0) > 0)
  const where = roots.length === 1 ? ` de ${roots[0]!.name}` : ''
  // The person's batch (10, 20 or 30) comes with the goal; older API builds omit it
  const size = input.stats?.goal?.batch_size || BATCH_SIZE
  const lots = Math.ceil(due / size)
  const minutes = input.stats?.goal?.minutes_left ?? Math.ceil((due * SECONDS_PER_CARD) / 60)
  // Older API builds: the overdue count still in the line (the link to "Recuperar atraso")
  const overdue = state ? 0 : input.backlog?.overdue_count ?? 0
  const parts = [due > size ? `${plural(lots, 'lote', 'lotes')} de ~${size}` : '1 lote', `≈ ${minutes} min`]
  if (overdue > due) parts.push(`${overdue} atrasados`)
  return {
    key: 'review',
    mode: 'review',
    title: `Revisar ${plural(due, 'card', 'cards')}${where}`,
    detail: parts.join(' · '),
    action: { label: 'Começar', to: '/revisar' },
    primary: false,
    overdue: overdue > due ? overdue : undefined,
    survival: input.survivalMode || undefined,
    backlog: backlogShown ? state! : undefined,
    minutes,
  }
}

/** Target 0: the worst accuracy in questions; 1: the subject with ≥ 3 errors this week; 2: the weakest topic with ≥ 10 cards and material. */
function quizStep(input: DayPlanInput): DayPlanStep | null {
  if (input.learningMode === 'language') return null
  // Target 0 (RF-F14): the lowest accuracy with ≥ 10 answered; on a tie the deepest (the assunto)
  const worst = (input.performance ?? [])
    .filter(t => t.questions?.accuracy != null)
    .sort((a, b) => a.questions.accuracy! - b.questions.accuracy! || b.depth - a.depth)[0]
  if (worst) {
    return {
      key: 'quiz',
      mode: 'quiz',
      title: `Questões de ${worst.name}`,
      detail: `Acerto de ${worst.questions.accuracy}% em ${plural(worst.questions.answered, 'questão', 'questões')}`,
      action: { label: 'Fazer', to: `/simulados?topic_id=${encodeURIComponent(worst.topic_id)}` },
      primary: false,
      minutes: QUIZ_MINUTES,
    }
  }
  const byId = new Map(input.progress.map(t => [t.id, t]))
  const errors = input.pendingActions.find(a => a.type === 'errors' && a.topic_id)
  if (errors) {
    const name = byId.get(errors.topic_id!)?.name ?? errors.label.match(/"(.+)"/)?.[1]
    const count = Number(errors.label.match(/(\d+)x/)?.[1] ?? 0)
    if (name) {
      return {
        key: 'quiz',
        mode: 'quiz',
        title: `Questões de ${name}`,
        detail: count ? `Você errou ${plural(count, 'vez', 'vezes')} esta semana` : 'Seus erros desta semana',
        action: { label: 'Fazer', to: `/simulados?topic_id=${encodeURIComponent(errors.topic_id!)}` },
        primary: false,
        minutes: QUIZ_MINUTES,
      }
    }
  }
  const weakest = input.progress
    .filter(t => t.flashcards_count >= QUIZ_MIN_CARDS && (t.notes_count === undefined || t.notes_count > 0))
    // Weakest first; on a tie the subject wins over its caderno (the most specific target)
    .sort((a, b) => a.progress - b.progress || Number(!a.parent_id) - Number(!b.parent_id))[0]
  if (!weakest) return null
  return {
    key: 'quiz',
    mode: 'quiz',
    title: `Questões de ${weakest.name}`,
    detail: `Domínio ${Math.round(weakest.progress * 100)}%`,
    action: { label: 'Fazer', to: `/simulados?topic_id=${encodeURIComponent(weakest.id)}` },
    primary: false,
    minutes: QUIZ_MINUTES,
  }
}

/**
 * A ready episode of the last 7 days not heard to the end (`completed_at` of the server, prd-4e-praticar-v3
 * RF-B7: on any device). Never offers to generate one (quota).
 */
function listenStep(input: DayPlanInput, now: Date): DayPlanStep | null {
  const episode = input.podcasts
    .filter(p => p.status === 'ready' && p.audio_url && !p.completed_at && ageDays(p.created_at, now) <= EPISODE_MAX_AGE_DAYS)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  if (!episode) return null
  const minutes = Math.max(1, Math.round((episode.duration_seconds ?? 0) / 60))
  const detail = [episode.duration_seconds ? `${minutes} min` : null, episode.topic_name].filter(Boolean).join(' · ')
  return {
    key: 'listen',
    mode: 'listen',
    title: `Ouvir: ${episode.title}`,
    detail: detail || 'Episódio pronto',
    action: { label: 'Ouvir', podcast: episode },
    primary: false,
    minutes: episode.duration_seconds ? minutes : 0,
  }
}

function materialStep(input: DayPlanInput, now: Date): DayPlanStep | null {
  const note = input.recentNote
  if (!note || ageDays(note.opened_at, now) > MATERIAL_MAX_AGE_DAYS) return null
  return {
    key: 'material',
    mode: null,
    title: `Continuar ${note.title}`,
    detail: `${note.root?.name ?? note.topic.name} · ${openedLabel(note.opened_at, now)}`,
    action: { label: 'Continuar', to: cadernoPath(note.topic.id, { note: note.id }) },
    primary: false,
    minutes: 0,
  }
}

export function buildDayPlan(input: DayPlanInput): DayPlanStep[] {
  const now = input.now ?? new Date()
  const dueToday = (input.stats?.due_today ?? 0) > 0
  const review = input.withoutReview && dueToday ? null : reviewStep(input)
  const steps = [review, quizStep(input), listenStep(input, now), materialStep(input, now)]
    .filter((s): s is DayPlanStep => s !== null)
    .slice(0, 4)
  if (steps[0] && !(input.withoutReview && dueToday)) steps[0].primary = true
  return steps
}

/**
 * The subjects with cards for today (A2, prd-visual-a2 RF-2.2): "45 cards de Direito Constitucional, Língua
 * Portuguesa e mais 2". The session of the day has no per-subject split in the API, so it reads /topics/progress:
 * each caderno with a session gives its subjects with a session (or itself when it has none), most cards first.
 */
export function daySubjects(progress: TopicProgress[]): string[] {
  const live = progress.filter(t => (t.session_count ?? 0) > 0)
  const picked = live.filter(t => !t.parent_id).flatMap((root) => {
    const children = live.filter(t => t.parent_id === root.id)
    return children.length ? children : [root]
  })
  return picked.sort((a, b) => (b.session_count ?? 0) - (a.session_count ?? 0)).map(t => t.name)
}

/** "Direito Constitucional e Língua Portuguesa", "A, B e mais 3"; empty without subjects. */
export function subjectsText(names: string[], max = 2): string {
  if (names.length <= max) return names.length === 2 ? `${names[0]} e ${names[1]}` : names[0] ?? ''
  return `${names.slice(0, max).join(', ')} e mais ${names.length - max}`
}

/** Minutes of the greeting sentence: review + 10 for Questões + the episode (§5.1). */
export function dayMinutes(steps: DayPlanStep[]): number {
  return steps.reduce((sum, s) => sum + (s.key === 'material' ? 0 : s.minutes), 0)
}
