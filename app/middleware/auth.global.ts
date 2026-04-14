export default defineNuxtRouteMiddleware((to) => {
  const token = useCookie('auth_token').value
  const publicRoutes = ['/login', '/register']

  if (!token && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }
})
