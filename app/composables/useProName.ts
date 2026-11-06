/**
 * The paid plan's name on screen ("Intensivo"), from the catalog (GET /plans, the `pro` plan): every text that
 * names the plan reads it here. Without the catalog, PRO_NAME_FALLBACK. The catalog is asked once per session,
 * on the client, and only while `when` holds (a screen that names the plan only in some state).
 */
export function useProName(when: () => boolean = () => true) {
  const { plans, fetchPlans } = usePlans()
  if (import.meta.client) watch(when, (go) => { if (go) void fetchPlans() }, { immediate: true })
  return computed(() => proPlanName(plans.value))
}
