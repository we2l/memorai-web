/**
 * Plan of the day on Hoje (prd-4a-hoje-v3 RF-F3, §5.2): up to 4 steps in a fixed order (Revisar,
 * Questões, Ouvir, Continuar material), each one only when there is data for it. A pure function of the
 * API answers, so the rules are tested without the screen. The first visible step carries the only
 * primary button of the screen.
 */
import type { BacklogStats, PendingAction, Podcast, RecentNote, Stats, TopicProgress } from '~/types'
import { cadernoPath } from '~/utils/scope'
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
  /** Minutes this step adds to the day (sentence of the greeting) */
  minutes: number
}

export interface DayPlanInput {
  stats: Stats | null
  backlog: BacklogStats | null
  survivalMode?: boolean
  /** /topics/progress: flat list, cadernos and subjects */
  progress: TopicProgress[]
  pendingActions: PendingAction[]
  /** /podcasts page 1 */
  podcasts: Podcast[]
  recentNote: RecentNote | null
  /** /me.default_learning_mode: `language` hides Questões (D11) */
  learningMode?: string | null
  /** Episodes the player played to the end on this device */
  finishedPodcastIds?: Iterable<string>
  now?: Date
}

export const BATCH_SIZE = 20
export const SECONDS_PER_CARD = 15
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
  if (due <= 0) return null
  const roots = input.progress.filter(t => !t.parent_id && (t.session_count ?? 0) > 0)
  const where = roots.length === 1 ? ` de ${roots[0]!.name}` : ''
  const lots = Math.ceil(due / BATCH_SIZE)
  const minutes = input.stats?.goal?.minutes_left ?? Math.ceil((due * SECONDS_PER_CARD) / 60)
  const overdue = input.backlog?.overdue_count ?? 0
  const parts = [due > BATCH_SIZE ? `${plural(lots, 'lote', 'lotes')} de ~${BATCH_SIZE}` : '1 lote', `≈ ${minutes} min`]
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
    minutes,
  }
}

/** Target 1: the subject with ≥ 3 errors this week; target 2: the weakest topic with ≥ 10 cards and material. */
function quizStep(input: DayPlanInput): DayPlanStep | null {
  if (input.learningMode === 'language') return null
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

/** A ready episode of the last 7 days not played to the end. Never offers to generate one (quota). */
function listenStep(input: DayPlanInput, now: Date): DayPlanStep | null {
  const finished = new Set(input.finishedPodcastIds ?? [])
  const episode = input.podcasts
    .filter(p => p.status === 'ready' && p.audio_url && !finished.has(p.id) && ageDays(p.created_at, now) <= EPISODE_MAX_AGE_DAYS)
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
  const steps = [reviewStep(input), quizStep(input), listenStep(input, now), materialStep(input, now)]
    .filter((s): s is DayPlanStep => s !== null)
    .slice(0, 4)
  if (steps[0]) steps[0].primary = true
  return steps
}

/** Minutes of the greeting sentence: review + 10 for Questões + the episode (§5.1). */
export function dayMinutes(steps: DayPlanStep[]): number {
  return steps.reduce((sum, s) => sum + (s.key === 'material' ? 0 : s.minutes), 0)
}
