<template>
  <div class="flex flex-col gap-5">
    <!-- Invalid or used link: one way forward -->
    <template v-if="!token || !email || expired">
      <div>
        <h1 class="text-page-title-sm text-fg-strong">Este link expirou</h1>
        <p class="mt-1 text-body text-fg-muted">O link vale por 60 minutos e só pode ser usado uma vez.</p>
      </div>
      <UiButton variant="primary" to="/esqueci-senha" block data-testid="reset-ask-again">Pedir outro</UiButton>
    </template>

    <template v-else>
      <h1 class="text-page-title-sm text-fg-strong">Criar nova senha</h1>
      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <UiInput id="email" :model-value="email" label="E-mail" type="email" autocomplete="username" readonly />
        <AuthPasswordInput id="password" v-model="password" label="Nova senha" autocomplete="new-password" :hint="errors.password ? undefined : hint" :error="errors.password" />
        <p v-if="errors.general" role="alert" class="text-meta font-medium text-danger">{{ errors.general }}</p>
        <UiButton variant="primary" type="submit" block :loading="loading">Salvar nova senha</UiButton>
      </form>
    </template>

    <p class="text-meta">
      <UiLink to="/entrar">Voltar para entrar</UiLink>
    </p>
  </div>
</template>

<script setup lang="ts">
// Reset of the password v4 (prd-4g-conta-onboarding-v3 RF-F14): one field with show/hide. The API still asks
// for the confirmation, so the same value goes in both.
import { MIN_PASSWORD, fieldErrors, passwordHint, retryAfterSeconds, waitLabel } from '~/utils/authMessages'
import { getErrorStatus } from '~/utils/apiErrors'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Nova senha · Baigi' })

const { $api } = useNuxtApp()
const route = useRoute()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const email = computed(() => (typeof route.query.email === 'string' ? route.query.email : ''))

const password = ref('')
const loading = ref(false)
const expired = ref(false)
const errors = reactive<Record<string, string>>({})
const hint = computed(() => passwordHint(password.value))

async function submit() {
  for (const k of Object.keys(errors)) delete errors[k]
  if (password.value.length < MIN_PASSWORD) {
    errors.password = `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`
    return
  }

  loading.value = true
  try {
    await $api('/reset-password', {
      method: 'POST',
      body: { token: token.value, email: email.value, password: password.value, password_confirmation: password.value },
    })
    await navigateTo({ path: '/entrar', query: { senha_redefinida: '1' } })
  } catch (e) {
    const status = getErrorStatus(e)
    const fields = fieldErrors(e)
    if (status === 422 && fields.password) errors.password = fields.password
    else if (status === 422) expired.value = true
    else if (status === 429) errors.general = `Muitas tentativas. Tente de novo em ${waitLabel(retryAfterSeconds(e))}.`
    else errors.general = 'Não foi possível salvar a senha. Tente de novo.'
  } finally {
    loading.value = false
  }
}
</script>
