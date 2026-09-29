<template>
  <div class="min-h-screen bg-surface flex items-center justify-center">
    <div class="text-center">
      <template v-if="!error">
        <div class="animate-spin w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full mx-auto mb-4" />
        <p class="text-base-muted">Conectando com Google...</p>
      </template>
      <template v-else>
        <p role="alert" class="text-danger text-small mb-4">{{ error }}</p>
        <NuxtLink to="/entrar" class="btn-secondary inline-block">Voltar para entrar</NuxtLink>
      </template>
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
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  const state = typeof route.query.state === 'string' ? route.query.state : ''
  if (!code || !state) {
    error.value = 'Link de login inválido. Tente novamente.'
    return
  }

  try {
    const res = await $api<{ data: { user: any } }>('/auth/google/callback', {
      method: 'POST',
      body: { code, state },
    })
    auth.setUser(res.data.user)
    await navigateTo(postAuthRedirect(res.data.user))
  } catch (e: any) {
    const errors = e?.data?.errors
    error.value = errors?.state?.[0] || errors?.email?.[0] || e?.data?.message || 'Erro ao conectar com Google. Tente novamente.'
  }
})
</script>
