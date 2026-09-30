<template>
  <div>
    <div class="flex justify-center mb-4">
      <UiLogo :icon-size="36" text-class="text-display text-base-primary" />
    </div>
    <h1 class="text-base-primary text-lg font-semibold text-center mb-1">Esqueci minha senha</h1>
    <p class="text-base-muted text-small text-center mb-8">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>

    <div v-if="sent" role="status" class="card p-5 text-center">
      <p class="text-base-primary text-small">
        Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha. Confira também o spam.
      </p>
    </div>

    <form v-else class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <div>
        <label for="email" class="text-label mb-1 block">E-mail</label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="seu@email.com"
          class="input-base"
          required
          :aria-invalid="!!error"
          :aria-describedby="error ? 'email-error' : undefined"
        />
        <p v-if="error" id="email-error" role="alert" class="text-danger text-micro mt-1">{{ error }}</p>
      </div>

      <button type="submit" class="btn-primary w-full mt-2" :disabled="loading">
        {{ loading ? 'Enviando...' : 'Enviar link' }}
      </button>
    </form>

    <p class="text-small text-center mt-6">
      <NuxtLink to="/entrar" class="text-accent-primary hover:underline">Voltar para entrar</NuxtLink>
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
