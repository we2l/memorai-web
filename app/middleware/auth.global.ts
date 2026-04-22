export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie('auth_token').value
  const publicRoutes = ['/login', '/register']

  if (!token && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }

  // Redirect to onboarding if not completed
  if (token && to.path !== '/onboarding') {
    const auth = useAuthStore()
    if (auth.user && auth.user.onboarding_completed === false) {
      return navigateTo('/onboarding')
    }
  }
})
