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
        await navigateTo('/login')
      }
    },
  })

  return { provide: { api } }
})
