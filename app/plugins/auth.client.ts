// Client-only auth bootstrap (ADR-020): the app shell is SPA, so /me never runs on the server.
export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  const route = useRoute()

  // Legacy Bearer cookie from the old front-end: drop it and ask for a fresh login once.
  if (/(?:^|;\s*)auth_token=/.test(document.cookie)) {
    document.cookie = 'auth_token=; path=/; max-age=0'
    try { sessionStorage.setItem('relogin', '1') } catch {}
  }

  const hasHint = /(?:^|;\s*)baigi_logged_in=1/.test(document.cookie)
  if (!auth.user && (!isPublicRoute(route.path) || hasHint)) {
    await auth.fetchMe()
  }

  auth.loaded = true
})
