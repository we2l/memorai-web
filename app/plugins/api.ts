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
        if (/method is not supported|Route \[|Target class|No query results|SQLSTATE|Undefined|Call to/i.test(msg)) {
          response._data.message = getClientFriendlyMessage(response.status)
        }
      }
    },
  })

  const api = withCsrfRetry(raw, ensureCsrfCookie)

  return { provide: { api } }

  function getClientFriendlyMessage(status: number): string {
    switch (status) {
      case 400: return 'Requisição inválida. Verifique os dados e tente novamente.'
      case 403: return 'Você não tem permissão para esta ação.'
      case 404: return 'Recurso não encontrado.'
      case 405: return 'Ação não permitida. Tente novamente.'
      case 408: return 'Tempo esgotado. Tente novamente.'
      case 413: return 'Arquivo muito grande.'
      case 419: return 'Sessão expirada. Recarregue a página.'
      case 422: return 'Dados inválidos. Verifique os campos.'
      case 429: return 'Muitas tentativas. Aguarde um momento.'
      case 500: return 'Algo deu errado. Tente novamente em instantes.'
      case 502: return 'Servidor temporariamente indisponível.'
      case 503: return 'Sistema em manutenção. Tente novamente em breve.'
      default: return 'Erro inesperado. Tente novamente.'
    }
  }
})
