export default defineNuxtRouteMiddleware(() => {
  if (import.meta.prod) {
    return navigateTo('/hoje')
  }
})
