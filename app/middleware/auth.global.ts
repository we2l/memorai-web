export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie('auth_token').value
  const publicRoutes = ['/', '/entrar', '/criar-conta']
  const isPublic = publicRoutes.includes(to.path) || to.path.startsWith('/auth/')

  if (!token && !isPublic) {
    return navigateTo('/entrar')
  }

  if (token && to.path !== '/comecar') {
    const auth = useAuthStore()
    if (auth.user && !auth.user.onboarding_completed) {
      return navigateTo('/comecar')
    }
  }
})
