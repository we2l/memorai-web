export default defineNuxtRouteMiddleware((to) => {
  // Session lives in an HttpOnly cookie on the API: only the client knows the user.
  if (import.meta.server) return

  const auth = useAuthStore()

  if (!isPublicRoute(to.path) && !auth.user) {
    return navigateTo({ path: '/entrar', query: { redirect: to.fullPath } })
  }

  if (['/', '/entrar', '/criar-conta'].includes(to.path) && auth.user) {
    return navigateTo('/hoje')
  }

  if (auth.user && to.path !== '/comecar' && !auth.user.onboarding_completed) {
    return navigateTo('/comecar')
  }
})
