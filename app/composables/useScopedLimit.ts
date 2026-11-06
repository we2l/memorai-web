import { onBeforeUnmount, onMounted, watch } from 'vue'

/**
 * Composition guard of the DS v3 (ADR-027 §6): counts the mounted instances of a kind ("primary" of
 * UiButton, "tinted" of UiSection) per screen and warns above `max`. Dev and tests only: the production
 * build drops it. A screen is the closest dialog or `[data-ds-scope]` (the /_ds catalog), else the route
 * path: a dialog is a screen of its own and may carry its own primary.
 */
type Scope = Element | string

const registry = new Map<string, Map<Scope, Set<symbol>>>()
const SCOPE_SELECTOR = '[data-ds-scope],[role="dialog"],[role="alertdialog"]'

/** Mounted instances of `kind` in `scope` (tests and the /_ds page). */
export function scopedCount(kind: string, scope: Scope): number {
  return registry.get(kind)?.get(scope)?.size ?? 0
}

export function useScopedLimit(
  kind: string,
  el: () => Element | null | undefined,
  active: () => boolean,
  max = 1,
) {
  if (!import.meta.dev && !import.meta.test) return
  const route = useRoute()
  const id = Symbol(kind)
  let scope: Scope | null = null

  function enter() {
    if (scope !== null || !active()) return
    const own: Scope = el()?.closest?.(SCOPE_SELECTOR) ?? route.path
    const byScope = registry.get(kind) ?? new Map<Scope, Set<symbol>>()
    registry.set(kind, byScope)
    const set = byScope.get(own) ?? new Set<symbol>()
    byScope.set(own, set)
    set.add(id)
    scope = own
    if (set.size > max) {
      const where = typeof own === 'string' ? own : 'um diálogo ou [data-ds-scope]'
      console.warn(`[DS v3] ${set.size} × ${kind} em ${where}: no máximo ${max} por tela (ADR-027 §6).`)
    }
  }

  function leave() {
    if (scope === null) return
    const byScope = registry.get(kind)
    const set = byScope?.get(scope)
    set?.delete(id)
    if (set && !set.size) byScope?.delete(scope)
    scope = null
  }

  onMounted(enter)
  onBeforeUnmount(leave)
  watch(active, v => (v ? enter() : leave()))
}
