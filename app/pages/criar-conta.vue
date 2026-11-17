<template>
  <AuthSplit v-bind="band">
    <div>
      <h1 v-if="guest">Salve seu <span class="au-grifo">progresso.</span></h1>
      <h1 v-else>Crie sua conta <span class="au-grifo">grátis.</span></h1>
      <p v-if="guest" class="au-lead" data-testid="signup-guest">Seus cards de {{ guest.area }} e as avaliações vão para a sua conta.</p>
    </div>

    <AuthGoogleButton variant="outline" size="lg" />

    <p class="au-or" aria-hidden="true">ou com e-mail</p>

    <form class="flex flex-col gap-4" novalidate @focusin.once="captcha.render(captchaEl)" @submit.prevent="submit">
      <UiInput id="email" v-model="form.email" label="E-mail" type="email" autocomplete="email" inputmode="email" spellcheck="false" :error="errors.email" />
      <AuthPasswordInput id="password" v-model="form.password" label="Senha" autocomplete="new-password" :hint="hint" :error="errors.password" />

      <!-- Turnstile (M3): invisible unless Cloudflare asks for a click; the Google button above has no captcha -->
      <div ref="captchaEl" class="contents" data-testid="signup-captcha" />

      <p v-if="errors.general" role="alert" class="text-meta font-medium text-danger" data-testid="signup-error">{{ errors.general }}</p>

      <UiButton variant="primary" size="lg" type="submit" block :loading="loading">{{ guest ? 'Criar conta e salvar' : 'Criar conta' }}</UiButton>
      <!-- One line for both ways in (prd-revisao-v5-fase-a RF-F10, D8): the click accepts, the links stay in sight -->
      <p class="au-meta" data-testid="signup-terms">
        Ao criar a conta, com o Google ou com o e-mail, você aceita os <UiLink to="/termos" target="_blank" class="underline">Termos de Uso</UiLink>
        e a <UiLink to="/privacidade" target="_blank" class="underline">Política de Privacidade</UiLink>.
      </p>
    </form>

    <p class="au-switch">
      Já tem conta? <UiLink to="/entrar" class="underline">{{ guest ? 'Entrar e salvar' : 'Entrar' }}</UiLink>
    </p>

    <template #extra>
      <!-- The visitor's own lote: one card they rated, with its real return (GET /onboarding/areas/{area}); decorative -->
      <div v-if="guest?.card" class="au-mock" aria-hidden="true" data-testid="signup-guest-card">
        <p class="au-meta">Seu exemplo · {{ guest.area }}</p>
        <p class="au-mock-q">{{ guest.card.front }}</p>
        <span class="au-chip" :class="!guest.card.remembered && 'au-chip-again'">{{ guest.card.remembered ? 'Lembrei' : 'Não lembrei' }} · volta {{ guest.card.when }}</span>
      </div>
      <ul v-else-if="!guest" class="au-ticks">
        <li v-for="t in TICKS" :key="t.title">
          <span class="au-tick" aria-hidden="true"><Check /></span>
          <div>{{ t.title }}<span>{{ t.text }}</span></div>
        </li>
      </ul>
    </template>
  </AuthSplit>
</template>

<script setup lang="ts">
// Sign-up v4 in the skin of the landing (components/auth/Split.vue, 17/11) (prd-4g-conta-onboarding-v3 RF-F13; lean since prd-revisao-v5-fase-a RF-F10): Google first, then e-mail
// and password only. No name (the API takes it from the e-mail; Configurações changes it) and no checkbox: one line
// says that creating the account accepts the Terms and the Privacy Policy, and the click sends accept_terms (the API
// still requires it and records terms_accepted_at). No "confirm password" (show/hide in its place).
import { MIN_PASSWORD, fieldErrors, passwordHint } from '~/utils/authMessages'
import { getErrorStatus } from '~/utils/apiErrors'
import { CAPTCHA_MESSAGES } from '~/utils/turnstile'
import { Check } from 'lucide-vue-next'
import { areaName, guestSummary, pendingGuestProgress, returnText, type GuestDeck } from '~/utils/guestProgress'
import { guestReturnLine } from '~/utils/authBand'

definePageMeta({ layout: 'auth-split' })
useHead({ title: 'Criar conta · Baigi' })

const auth = useAuthStore()
const router = useRouter()
const { $api } = useNuxtApp()

const form = reactive({ email: '', password: '' })
const errors = reactive<Record<string, string>>({})
const loading = ref(false)
const hint = computed(() => (errors.password ? undefined : passwordHint(form.password)))
const captcha = useTurnstile()
const captchaEl = ref<HTMLElement | null>(null)
/**
 * What the band claims for a new account, checked against GET /plans on 17/11: review has no quota in any plan
 * ("Cadernos, notas e cards sem limite"); the Free's preview of the AI reads 1 PDF into a note and cards; 1 reading of
 * an edital (feature-limits `edital`) and the cronograma, which has no AI and no quota.
 */
const TICKS = [
  { title: 'Revisar é grátis para sempre', text: 'Seus cards voltam no dia certo, quantos você tiver.' },
  { title: 'Uma prévia da IA', text: 'Mande um PDF e ele vira nota e cards.' },
  { title: 'O edital vira caderno', text: 'Matérias e assuntos prontos, com cronograma até a prova.' },
] as const

interface GuestBand { area: string, remembered: number, total: number, returns: string, card: { front: string, remembered: boolean, when: string } | null }
/** The visitor's lote waiting on this device (prd-onboarding-v4 RF-F4): read after hydration, the page is prerendered */
const guest = ref<GuestBand | null>(null)
const band = computed(() => guest.value
  ? { headline: `Você lembrou ${guest.value.remembered} de ${guest.value.total}.`, sub: guest.value.returns, mascot: 'feliz' as const }
  : { headline: 'Estude uma vez. O Baigi te chama na hora de revisar.', sub: 'Grátis para começar, sem cartão.', mascot: 'comemorando' as const })

onMounted(async () => {
  const p = pendingGuestProgress()
  if (!p) return
  // Remembered = the first rating of each card (guestSummary); the intervals only matter for the agenda below
  const first = guestSummary(p.reviews, { again: '', hard: '', good: '', easy: '' })
  guest.value = { area: areaName(p.area), remembered: first.remembered, total: first.total, returns: guestReturnLine(null), card: null }
  // When they come back: the deck's own intervals (public, cached 300 s; the lote just fetched it). A deck of another
  // version replays differently on the server, so it keeps the generic line
  try {
    const deck = (await $api<{ data: GuestDeck }>(`/onboarding/areas/${p.area}`)).data
    if (deck.version !== p.version || !guest.value) return
    const s = guestSummary(p.reviews, deck.intervals, deck.relearned_interval)
    const lastRating = new Map(p.reviews.map(r => [r.index, r.rating]))
    const shown = deck.cards.find(c => (lastRating.get(c.index) ?? 0) >= 2) ?? deck.cards.find(c => lastRating.has(c.index))
    guest.value = {
      ...guest.value,
      returns: guestReturnLine(s.agenda),
      card: shown ? { front: shown.front, remembered: lastRating.get(shown.index)! >= 2, when: returnText(s.returns[shown.index]!) } : null,
    }
  } catch {
    // intencional: the generic line stays; the sign-up does not depend on the deck
  }
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
    // Full page load: no memory of a previous account on this tab (utils/accountState.ts)
    reloadTo(postAuthRedirect(auth.user, router.currentRoute.value.query.redirect))
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
