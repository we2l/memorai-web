<template>
  <div class="flex flex-col gap-5">
    <div>
      <h1 class="text-page-title-sm text-fg-strong">Esqueci a senha</h1>
      <p v-if="!sent" class="mt-1 text-body text-fg-muted">Enviamos um link para você criar uma nova.</p>
    </div>

    <!-- The same answer whether the account exists or not (RN 6) -->
    <p v-if="sent" role="status" class="text-body text-fg" data-testid="forgot-sent">
      Se houver uma conta com <span class="font-semibold break-all text-fg-strong">{{ sentTo }}</span>, enviamos um link (vale por 60 min). Confira também o spam.
    </p>

    <form v-else class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <UiInput id="email" v-model="email" label="E-mail" type="email" autocomplete="email" inputmode="email" :error="emailError || undefined" />
      <!-- Turnstile (M4): invisible unless Cloudflare asks for a click -->
      <div ref="captchaEl" data-testid="forgot-captcha" />
      <p v-if="captchaError" role="alert" class="text-meta font-medium text-danger" data-testid="forgot-captcha-error">{{ captchaError }}</p>
      <UiButton variant="primary" type="submit" block :loading="loading">Enviar link</UiButton>
    </form>

    <p class="text-meta">
      <UiLink to="/entrar">Voltar para entrar</UiLink>
    </p>
  </div>
</template>

<script setup lang="ts">
// "Esqueci a senha" v4 (prd-4g-conta-onboarding-v3 RF-F14). Prerendered.
import { fieldErrors, retryAfterSeconds, waitLabel } from '~/utils/authMessages'
import { getErrorStatus } from '~/utils/apiErrors'
import { CAPTCHA_MESSAGES } from '~/utils/turnstile'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Esqueci a senha · Baigi' })

const { $api } = useNuxtApp()

const email = ref('')
const sentTo = ref('')
const emailError = ref('')
const captchaError = ref('')
const loading = ref(false)
const sent = ref(false)
const captcha = useTurnstile()
const captchaEl = ref<HTMLElement | null>(null)

onMounted(() => captcha.render(captchaEl.value))

async function submit() {
  emailError.value = ''
  captchaError.value = ''
  const address = email.value.trim()
  if (!address) {
    emailError.value = 'Informe seu e-mail.'
    return
  }

  loading.value = true
  let captchaToken: string | undefined
  try {
    captchaToken = await captcha.getToken()
  } catch {
    captchaError.value = captcha.error.value || CAPTCHA_MESSAGES.load
    loading.value = false
    return
  }
  try {
    await $api('/forgot-password', { method: 'POST', body: { email: address, ...(captchaToken ? { captcha_token: captchaToken } : {}) } })
    sentTo.value = address
    sent.value = true
  } catch (e) {
    const status = getErrorStatus(e)
    if (status === 429) emailError.value = `Muitos pedidos. Tente de novo em ${waitLabel(retryAfterSeconds(e))}.`
    else if (status === 422) {
      const fields = fieldErrors(e)
      if (fields.captcha_token) captchaError.value = fields.captcha_token
      else emailError.value = fields.email || 'Confira o e-mail.'
    } else emailError.value = 'Não foi possível enviar o link. Tente de novo.'
  } finally {
    loading.value = false
    // Single-use token: a new check for the next try (the form is gone once sent)
    if (!sent.value) captcha.reset()
  }
}
</script>
