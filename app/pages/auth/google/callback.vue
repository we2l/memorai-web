<template>
  <div class="flex justify-center py-6">
    <div class="text-center">
      <template v-if="!error">
        <UiSpinner class="mx-auto mb-4 text-action-fg" />
        <p role="status" class="text-fg-muted">Conectando com Google...</p>
      </template>
      <template v-else>
        <p role="alert" class="text-danger text-meta mb-4">{{ error }}</p>
        <UiButton variant="secondary" to="/entrar">Voltar para entrar</UiButton>
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
      // Banner choice applies only if this creates the account (RF-B04)
      body: { code, state, ...useConsent().signupPayload() },
    })
    auth.setUser(res.data.user)
    // Full page load (utils/accountState.ts), replacing the callback: Voltar does not reuse the spent code
    reloadTo(postAuthRedirect(res.data.user), { replace: true })
  } catch (e: any) {
    const errors = e?.data?.errors
    error.value = errors?.state?.[0] || errors?.email?.[0] || e?.data?.message || 'Erro ao conectar com Google. Tente novamente.'
  }
})
</script>
