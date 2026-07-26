export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  const api = $fetch.create({
    baseURL: config.public.apiBase,
    onRequest({ request, options }) {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...options.headers as Record<string, string>,
      }

      // Tentar ler token de múltiplas fontes
      let token: string | null = null

      // 1. useCookie (funciona SSR + client)
      try {
        token = useCookie('auth_token').value ?? null
      } catch {}

      // 2. document.cookie fallback (client only)
      if (!token && import.meta.client) {
        const match = document.cookie.match(/auth_token=([^;]+)/)
        token = match ? match[1] : null
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      options.headers = headers
    },
    async onResponseError({ response }) {
      if (response.status === 401 && import.meta.client) {
        await navigateTo('/entrar')
      }
      if (response.status === 402 && import.meta.client) {
        const data = response._data
        window.dispatchEvent(new CustomEvent('feature-limit-reached', {
          detail: { feature: data?.feature, planRequired: data?.plan_required },
        }))
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

  return { provide: { api } }

  function getClientFriendlyMessage(status: number): string {
    switch (status) {
      case 400: return 'Requisição inválida. Verifique os dados e tente novamente.'
      case 403: return 'Você não tem permissão para esta ação.'
      case 404: return 'Recurso não encontrado.'
      case 405: return 'Ação não permitida. Tente novamente.'
      case 408: return 'Tempo esgotado. Tente novamente.'
      case 413: return 'Arquivo muito grande.'
      case 422: return 'Dados inválidos. Verifique os campos.'
      case 429: return 'Muitas tentativas. Aguarde um momento.'
      case 500: return 'Algo deu errado. Tente novamente em instantes.'
      case 502: return 'Servidor temporariamente indisponível.'
      case 503: return 'Sistema em manutenção. Tente novamente em breve.'
      default: return 'Erro inesperado. Tente novamente.'
    }
  }
})
