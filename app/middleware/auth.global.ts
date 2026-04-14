export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  auth.loadFromCookie()

  if (!auth.isAuthenticated && to.path !== '/login' && to.path !== '/register') {
    return navigateTo('/login')
  }
})
