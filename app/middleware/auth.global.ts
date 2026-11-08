export default defineNuxtRouteMiddleware((to) => {
  // Session lives in an HttpOnly cookie on the API: only the client knows the user.
  if (import.meta.server) return

  const auth = useAuthStore()

  // A wrong address is a 404 for everyone (error.vue), not a login screen (prd-4g RF-F15)
  if (to.matched.length === 0) return

  if (!isPublicRoute(to.path) && !auth.user) {
    return navigateTo({ path: '/entrar', query: { redirect: to.fullPath } })
  }

  if (['/', '/entrar', '/criar-conta'].includes(to.path) && auth.user) {
    return navigateTo('/hoje')
  }

  // Finished: "Voltar" never reopens the visitor's lote. /comecar/pronto stays: it is where the lote just arrived.
  if (isGuestOnboardingRoute(to.path) && auth.user?.onboarding_completed) return navigateTo('/hoje', { replace: true })

  // An account without the onboarding starts it; the legal pages and the whole /comecar/** stay open during it
  if (auth.user && !to.path.startsWith('/comecar') && !isPublicRoute(to.path) && !auth.user.onboarding_completed) {
    return navigateTo('/comecar')
  }
})
