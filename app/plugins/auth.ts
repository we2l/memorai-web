export default defineNuxtPlugin(async () => {
  const token = useCookie('auth_token').value
  if (!token) return

  const auth = useAuthStore()
  if (auth.user) return

  auth.token = token

  try {
    const { $api } = useNuxtApp()
    const res = await $api<{ data: any }>('/me')
    if (res.data) {
      auth.user = res.data
    }
  } catch {
    // Token invalid — clear auth
    auth.clearAuth()
  }
})
