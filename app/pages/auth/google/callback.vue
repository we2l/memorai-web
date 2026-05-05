<template>
  <div class="min-h-screen bg-surface flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full mx-auto mb-4" />
      <p class="text-base-muted">Conectando com Google...</p>
      <p v-if="error" role="alert" class="text-danger text-small mt-4">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { $api } = useNuxtApp()
const auth = useAuthStore()
const route = useRoute()
const error = ref('')

onMounted(async () => {
  const code = route.query.code as string
  if (!code) {
    error.value = 'Código de autorização não encontrado.'
    return
  }

  try {
    const res = await $api<any>('/auth/google/callback', {
      method: 'POST',
      body: { code, device_name: 'web' },
    })
    auth.setAuth(res.data.user, res.data.token)
    await navigateTo('/hoje')
  } catch (e: any) {
    error.value = e.data?.message || 'Erro ao conectar com Google. Tente novamente.'
  }
})
</script>
