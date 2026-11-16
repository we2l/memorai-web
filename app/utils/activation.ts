import type { Stats, TopicProgress, User } from '~/types'

/**
 * Activation by the person's own material (prd-ativacao-material-proprio): the onboarding sample (topics.is_sample and
 * its subtree) never counts as progress. The numbers come from GET /stats → own (the API's one rule, RN-1); an older
 * API without `own` falls back to the whole account, as before.
 */

/** Own cards: outside the sample cadernos (the whole account on an older API). */
export function ownCards(stats: Stats | null | undefined): number {
  return stats?.own ? stats.own.cards : stats?.total_cards ?? 0
}

/** H1: the account has the sample and nothing of its own yet, so "Agora com o seu material" leads the Hoje. */
export function needsOwnMaterial(stats: Stats | null | undefined): boolean {
  const own = stats?.own
  return !!own && own.sample && own.materials === 0 && own.cards === 0
}

/** Ids of the sample cadernos and everything under them, from the flat GET /topics/progress. */
export function sampleTopicIds(progress: Pick<TopicProgress, 'id' | 'parent_id' | 'is_sample'>[]): Set<string> {
  const ids = new Set(progress.filter(t => !t.parent_id && t.is_sample).map(t => t.id))
  let grew = ids.size > 0
  while (grew) {
    grew = false
    for (const t of progress) {
      if (t.parent_id && ids.has(t.parent_id) && !ids.has(t.id)) {
        ids.add(t.id)
        grew = true
      }
    }
  }
  return ids
}

export interface ChecklistState {
  hasMaterial: boolean
  hasCards: boolean
  hasOwnBatch: boolean
  streak: number
}

/**
 * H2: the first steps count only what is not the sample. `fallbackMaterial` is the old rule (notes of the roots or a
 * document) for an API without `own`.
 */
export function checklistState(stats: Stats | null | undefined, user: Pick<User, 'first_own_batch_at' | 'first_batch_at'> | null | undefined, fallbackMaterial = false): ChecklistState {
  const own = stats?.own
  const cards = ownCards(stats)
  return {
    hasMaterial: own ? own.materials > 0 || own.cards > 0 : fallbackMaterial,
    hasCards: cards > 0,
    hasOwnBatch: own ? !!user?.first_own_batch_at : (stats?.cards_reviewed_today ?? 0) > 0 || (stats?.streak ?? 0) > 0,
    streak: stats?.streak ?? 0,
  }
}

/** H3: the account has a caderno of its own (a root that is not the sample). */
export function hasOwnNotebook(tree: { is_sample?: boolean }[]): boolean {
  return tree.some(t => !t.is_sample)
}

export const NEW_NOTEBOOK = '__new__'
export const DEFAULT_NOTEBOOK_NAME = 'Meu caderno'
const NAME_MAX = 60

/** H3: the caderno made with the first material: the PDF's name without the extension, else "Meu caderno". */
export function autoNotebookName(fileName?: string | null): string {
  const base = (fileName ?? '').replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (base.length < 2) return DEFAULT_NOTEBOOK_NAME
  if (base.length <= NAME_MAX) return base
  const cut = base.slice(0, NAME_MAX)
  const space = cut.lastIndexOf(' ')
  return (space > 20 ? cut.slice(0, space) : cut).trim()
}

/** The learning mode a new caderno takes from the account; `language` asks for the language, so it stays out. */
export function notebookModeOf(mode: string | null | undefined): string | undefined {
  return mode && ['exam', 'academic', 'technical', 'professional', 'general'].includes(mode) ? mode : undefined
}
