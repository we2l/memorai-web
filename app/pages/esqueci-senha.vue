<template>
  <div>
    <div class="flex justify-center mb-4">
      <UiLogo :icon-size="36" text-class="text-page-title-sm lg:text-page-title text-fg-strong" />
    </div>
    <h1 class="text-fg-strong text-body font-semibold text-center mb-1">Esqueci minha senha</h1>
    <p class="text-fg-muted text-meta text-center mb-8">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>

    <UiSection v-if="sent" as="div" role="status" class="text-center">
      <p class="text-fg-strong text-meta">
        Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha. Confira também o spam.
      </p>
    </UiSection>

    <form v-else class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <UiInput id="email" v-model="email" label="E-mail" type="email" autocomplete="email" placeholder="seu@email.com" required :error="error || undefined" />

      <UiButton variant="primary" type="submit" block class="mt-2" :loading="loading">
        {{ loading ? 'Enviando...' : 'Enviar link' }}
      </UiButton>
    </form>

    <p class="text-meta text-center mt-6">
      <NuxtLink to="/entrar" class="text-action-fg hover:underline">Voltar para entrar</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Esqueci minha senha — BAIGI' })

const { $api } = useNuxtApp()

const email = ref('')
const error = ref('')
const loading = ref(false)
const sent = ref(false)

async function submit() {
  error.value = ''
  if (!email.value.trim()) {
    error.value = 'Informe seu e-mail.'
    return
  }

  loading.value = true
  try {
    await $api('/forgot-password', { method: 'POST', body: { email: email.value.trim() } })
    sent.value = true
  } catch (e: any) {
    const status = e?.response?.status ?? e?.statusCode
    if (status === 429) {
      error.value = 'Aguarde alguns minutos para pedir outro link.'
    } else {
      error.value = e?.data?.errors?.email?.[0] || e?.data?.message || 'Não foi possível enviar o link.'
    }
  } finally {
    loading.value = false
  }
}
</script>
