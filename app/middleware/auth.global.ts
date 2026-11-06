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

  // Finished: "Voltar" never reopens the assistant (it would charge again). The legal pages stay open during it.
  if (to.path === '/comecar' && auth.user?.onboarding_completed) return navigateTo('/hoje', { replace: true })

  if (auth.user && to.path !== '/comecar' && !isPublicRoute(to.path) && !auth.user.onboarding_completed) {
    return navigateTo('/comecar')
  }
})
