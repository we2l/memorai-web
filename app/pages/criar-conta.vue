<template>
  <div class="flex flex-col gap-5">
    <h1 class="text-page-title-sm text-fg-strong">Criar sua conta</h1>

    <div class="flex flex-col gap-2">
      <AuthGoogleButton />
      <p class="text-label text-fg-muted">
        Ao continuar você aceita os <UiLink to="/termos" class="underline">Termos</UiLink> e a <UiLink to="/privacidade" class="underline">Privacidade</UiLink>.
      </p>
    </div>

    <div class="flex items-center gap-3" aria-hidden="true">
      <span class="h-px flex-1 bg-line" />
      <span class="text-label text-fg-muted">ou</span>
      <span class="h-px flex-1 bg-line" />
    </div>

    <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <UiInput id="name" v-model="form.name" label="Nome" autocomplete="name" :error="errors.name" />
      <UiInput id="email" v-model="form.email" label="E-mail" type="email" autocomplete="email" inputmode="email" :error="errors.email" />
      <AuthPasswordInput id="password" v-model="form.password" label="Senha" autocomplete="new-password" :hint="hint" :error="errors.password" />

      <div class="flex flex-col gap-1">
        <UiCheckbox
          id="accept_terms"
          v-model="form.accept_terms"
          :aria-invalid="errors.accept_terms ? 'true' : undefined"
          :aria-describedby="errors.accept_terms ? 'accept-terms-error' : undefined"
        >
          Li e aceito os <UiLink to="/termos" target="_blank" class="underline">Termos de Uso</UiLink>
          e a <UiLink to="/privacidade" target="_blank" class="underline">Política de Privacidade</UiLink>.
        </UiCheckbox>
        <p v-if="errors.accept_terms" id="accept-terms-error" role="alert" class="text-meta font-medium text-danger">{{ errors.accept_terms }}</p>
      </div>

      <!-- Turnstile (M3): invisible unless Cloudflare asks for a click; the Google button above has no captcha -->
      <div ref="captchaEl" data-testid="signup-captcha" />

      <p v-if="errors.general" role="alert" class="text-meta font-medium text-danger" data-testid="signup-error">{{ errors.general }}</p>

      <UiButton variant="primary" type="submit" block :loading="loading">Criar conta</UiButton>
    </form>

    <p class="text-meta text-fg-muted">
      Já tem conta? <UiLink to="/entrar" class="underline">Entrar</UiLink>
    </p>
  </div>
</template>

<script setup lang="ts">
// Sign-up v4 (prd-4g-conta-onboarding-v3 RF-F13): no "confirm password" (show/hide in its place), the hint of
// strength in text, the acceptance of the Terms unchanged. The API takes the sign-up without the confirmation.
import { MIN_PASSWORD, fieldErrors, passwordHint } from '~/utils/authMessages'
import { getErrorStatus } from '~/utils/apiErrors'
import { CAPTCHA_MESSAGES } from '~/utils/turnstile'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Criar conta · Baigi' })

const auth = useAuthStore()
const router = useRouter()

const form = reactive({ name: '', email: '', password: '', accept_terms: false })
const errors = reactive<Record<string, string>>({})
const loading = ref(false)
const hint = computed(() => (errors.password ? undefined : passwordHint(form.password)))
const captcha = useTurnstile()
const captchaEl = ref<HTMLElement | null>(null)

onMounted(() => captcha.render(captchaEl.value))

async function submit() {
  for (const k of Object.keys(errors)) delete errors[k]
  if (!form.name.trim()) errors.name = 'Informe seu nome.'
  if (!form.email.trim()) errors.email = 'Informe seu e-mail.'
  if (form.password.length < MIN_PASSWORD) errors.password = `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`
  if (!form.accept_terms) errors.accept_terms = 'Para criar a conta, aceite os Termos e a Política de Privacidade.'
  if (Object.keys(errors).length) return

  loading.value = true
  let captchaToken: string | undefined
  try {
    captchaToken = await captcha.getToken()
  } catch {
    errors.general = captcha.error.value || CAPTCHA_MESSAGES.load
    loading.value = false
    return
  }
  try {
    // Banner choice made before the account existed (prd-analytics-posthog RF-B04)
    await auth.register({
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
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
