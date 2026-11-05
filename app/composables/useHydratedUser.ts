/**
 * The signed-in user for the template of a prerendered page: null until the page has hydrated, because the HTML
 * was generated without a session and the auth plugin already knows the user before hydration (rendering by
 * auth.user straight away is a hydration mismatch). The session-hint script of nuxt.config keeps the page hidden
 * until then, so a signed-in person never sees the anonymous version.
 */
export function useHydratedUser() {
  const auth = useAuthStore()
  const hydrated = ref(false)
  onMounted(() => { hydrated.value = true })
  return computed(() => (hydrated.value ? auth.user : null))
}
