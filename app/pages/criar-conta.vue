<template>
  <div class="flex flex-col gap-5">
    <div>
      <h1 class="text-page-title-sm text-fg-strong">{{ guest ? 'Salve seu progresso' : 'Criar sua conta' }}</h1>
      <p v-if="guest" class="mt-1 text-body text-fg-muted" data-testid="signup-guest">Seus cards de {{ guest }} e as avaliações vão para a sua conta.</p>
    </div>

    <AuthGoogleButton />

    <div class="flex items-center gap-3" aria-hidden="true">
      <span class="h-px flex-1 bg-line" />
      <span class="text-label text-fg-muted">ou</span>
      <span class="h-px flex-1 bg-line" />
    </div>

    <form class="flex flex-col gap-4" novalidate @focusin.once="captcha.render(captchaEl)" @submit.prevent="submit">
      <UiInput id="email" v-model="form.email" label="E-mail" type="email" autocomplete="email" inputmode="email" :error="errors.email" />
      <AuthPasswordInput id="password" v-model="form.password" label="Senha" autocomplete="new-password" :hint="hint" :error="errors.password" />

      <!-- Turnstile (M3): invisible unless Cloudflare asks for a click; the Google button above has no captcha -->
      <div ref="captchaEl" class="contents" data-testid="signup-captcha" />

      <p v-if="errors.general" role="alert" class="text-meta font-medium text-danger" data-testid="signup-error">{{ errors.general }}</p>

      <UiButton variant="primary" type="submit" block :loading="loading">Criar conta</UiButton>
      <!-- One line for both ways in (prd-revisao-v5-fase-a RF-F10, D8): the click accepts, the links stay in sight -->
      <p class="text-label text-fg-muted" data-testid="signup-terms">
        Ao criar a conta, com o Google ou com o e-mail, você aceita os <UiLink to="/termos" target="_blank" class="underline">Termos de Uso</UiLink>
        e a <UiLink to="/privacidade" target="_blank" class="underline">Política de Privacidade</UiLink>.
      </p>
    </form>

    <p class="text-meta text-fg-muted">
      Já tem conta? <UiLink to="/entrar" class="underline">Entrar</UiLink>
    </p>
  </div>
</template>

<script setup lang="ts">
// Sign-up v4 (prd-4g-conta-onboarding-v3 RF-F13; lean since prd-revisao-v5-fase-a RF-F10): Google first, then e-mail
// and password only. No name (the API takes it from the e-mail; Configurações changes it) and no checkbox: one line
// says that creating the account accepts the Terms and the Privacy Policy, and the click sends accept_terms (the API
// still requires it and records terms_accepted_at). No "confirm password" (show/hide in its place).
import { MIN_PASSWORD, fieldErrors, passwordHint } from '~/utils/authMessages'
import { getErrorStatus } from '~/utils/apiErrors'
import { CAPTCHA_MESSAGES } from '~/utils/turnstile'
import { areaName, pendingGuestProgress } from '~/utils/guestProgress'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Criar conta · Baigi' })

const auth = useAuthStore()
const router = useRouter()

const form = reactive({ email: '', password: '' })
const errors = reactive<Record<string, string>>({})
const loading = ref(false)
const hint = computed(() => (errors.password ? undefined : passwordHint(form.password)))
const captcha = useTurnstile()
const captchaEl = ref<HTMLElement | null>(null)
/** The visitor's lote waiting on this device (prd-onboarding-v4 RF-F4): read after hydration, the page is prerendered */
const guest = ref('')
onMounted(() => {
  const p = pendingGuestProgress()
  if (p) guest.value = areaName(p.area)
})

// The check starts when the person starts filling the form (the script is not fetched for a visit that only looks)

async function submit() {
  for (const k of Object.keys(errors)) delete errors[k]
  if (!form.email.trim()) errors.email = 'Informe seu e-mail.'
  if (form.password.length < MIN_PASSWORD) errors.password = `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`
  if (Object.keys(errors).length) return

  loading.value = true
  let captchaToken: string | undefined
  try {
    captchaToken = await captcha.getToken(captchaEl.value)
  } catch {
    errors.general = captcha.error.value || CAPTCHA_MESSAGES.load
    loading.value = false
    return
  }
  try {
    // Banner choice made before the account existed (prd-analytics-posthog RF-B04)
    await auth.register({
      email: form.email.trim(),
      password: form.password,
      // The click on "Criar conta" under the line of the Terms is the acceptance (D8)
      accept_terms: true,
      ...useConsent().signupPayload(),
      ...(captchaToken ? { captcha_token: captchaToken } : {}),
    })
    await navigateTo(postAuthRedirect(auth.user, router.currentRoute.value.query.redirect))
  } catch (e) {
    const status = getErrorStatus(e)
    if (status === 429) {
      errors.general = 'Muitas contas criadas daqui. Tente de novo mais tarde.'
    } else if (status === 422) {
      const { captcha_token: captchaError, ...fields } = fieldErrors(e)
      Object.assign(errors, fields)
      if (captchaError) errors.general = captchaError
    } else {
      errors.general = 'Não foi possível criar a conta agora. Tente de novo.'
    }
  } finally {
    loading.value = false
    // The token is single use: a new check for the next try
    captcha.reset()
  }
}
</script>
