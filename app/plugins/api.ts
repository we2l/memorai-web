export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  // Sanctum SPA (ADR-020): the session travels in an HttpOnly cookie; the
  // front never handles credentials. Mutations send X-XSRF-TOKEN.
  const raw = $fetch.create({
    baseURL: config.public.apiBase,
    credentials: 'include',
    onRequest({ options }) {
      const headers = new Headers(options.headers as HeadersInit | undefined)
      headers.set('Accept', 'application/json')
      headers.set('X-Requested-With', 'XMLHttpRequest')
      const xsrf = getXsrfToken()
      if (xsrf) headers.set('X-XSRF-TOKEN', xsrf)
      options.headers = headers
    },
    async onResponseError({ response }) {
      if (response.status === 401 && import.meta.client) {
        useAuthStore().clearAuth()
        const route = useRouter().currentRoute.value
        if (!isPublicRoute(route.path)) {
          await navigateTo({ path: '/entrar', query: { redirect: route.fullPath } })
        }
      }
      if (response.status === 402 && import.meta.client) {
        const data = response._data
        window.dispatchEvent(new CustomEvent('feature-limit-reached', {
          detail: {
            feature: data?.feature,
            used: data?.used ?? null,
            limit: data?.limit ?? null,
            planRequired: data?.plan_required ?? null,
            resetsAt: data?.resets_at ?? null,
          },
        }))
      }
      if (response.status === 403 && import.meta.client && response._data?.code === 'email_unverified') {
        window.dispatchEvent(new CustomEvent('email-unverified'))
      }

      // Sanitize technical messages — never show raw English errors to user
      if (response._data && typeof response._data.message === 'string') {
        const msg = response._data.message
        // If message looks technical (English, contains HTTP jargon), replace
        if (isTechnicalMessage(msg)) {
          response._data.message = getClientFriendlyMessage(response.status)
        }
      }
    },
  })

  const api = withCsrfRetry(raw, ensureCsrfCookie)

  return { provide: { api } }
})
