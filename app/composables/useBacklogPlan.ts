/**
 * "Recuperar em N dias" (prd-revisao-v5-fase-b RF-F2): one sheet for the whole app (Hoje, caderno, end of the session),
 * mounted lazily by the layout. `changed` ticks after a plan is made, cancelled or the new cards come back, so the
 * screen that opened it reloads its numbers.
 */
import type { BacklogState } from '~/types'

export type BacklogOrigin = 'home' | 'caderno' | 'review_end' | 'practice'

export function useBacklogPlan() {
  const open = useState('backlog-plan-open', () => false)
  const state = useState<BacklogState | null>('backlog-plan-state', () => null)
  const changed = useState('backlog-plan-changed', () => 0)

  function show(backlog: BacklogState, origin: BacklogOrigin) {
    state.value = backlog
    open.value = true
    useAnalytics().track('backlog_plan_opened', { origin, overdue: backlog.overdue, has_plan: !!backlog.plan })
  }

  return { open, state, changed, show }
}

/** "~49 por dia": the plan's share of a day, as the API spreads it (ceil, the first days take the rest). */
export function backlogPerDay(cards: number, days: number): number {
  return days > 0 ? Math.ceil(cards / days) : cards
}
