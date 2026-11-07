<template>
  <div class="mx-auto max-w-md px-gutter py-8">
    <UiSection as="div" class="text-center" aria-live="polite" aria-atomic="true">
      <!-- Loading -->
      <p v-if="state === 'loading'" class="flex items-center justify-center gap-2 py-6 text-meta text-fg-muted">
        <UiSpinner size="sm" /> Carregando pagamento…
      </p>

      <!-- Pro active: the milestone of the page -->
      <UiCelebration
        v-else-if="state === 'active'"
        kind="milestone"
        :title="`Bem-vindo ao ${proName}!`"
        :subtitle="`${proName} ativo até ${formatBillingDate(session?.plan_expires_at)}`"
        :level="1"
      >
        <div class="flex w-full flex-col items-center gap-4">
          <p class="text-meta text-fg-muted">Obrigado! Enviamos o recibo para o seu e-mail.</p>
          <UiButton variant="primary" to="/hoje">Ir para o Hoje</UiButton>
        </div>
      </UiCelebration>

      <!-- Paid, webhook not processed yet -->
      <template v-else-if="state === 'confirming'">
        <UiSpinner class="mx-auto mb-4 text-fg-muted" />
        <h1 class="mb-2 text-section text-fg-strong">Confirmando pagamento…</h1>
        <p class="text-meta text-fg-muted">Isso leva poucos segundos.</p>
      </template>

      <!-- Waiting for Pix -->
      <template v-else-if="state === 'waiting'">
        <h1 class="mb-2 text-section text-fg-strong">Aguardando o Pix</h1>
        <p class="mb-5 text-meta text-fg-muted">Abra o app do seu banco e pague com o QR Code ou o código copia e cola.</p>

        <template v-if="session?.pix_qr">
          <img
            v-if="session.pix_qr.image_url_png"
            :src="session.pix_qr.image_url_png"
            :alt="`QR Code do Pix para pagar o Baigi ${proName} anual`"
            class="mx-auto mb-4 size-56 rounded-row bg-qr p-2"
            width="224"
            height="224"
          >
          <UiButton v-if="session.pix_qr.data" block class="mb-3" :icon-left="Copy" @click="copyPixCode">Copiar código Pix</UiButton>
          <p v-if="remainingLabel" class="mb-4 text-meta text-fg-muted">
            O código expira em <span class="font-semibold text-fg-strong tabular-nums">{{ remainingLabel }}</span>
          </p>
        </template>

        <p class="text-meta text-fg-muted">Pode fechar esta página: avisaremos por e-mail quando o pagamento cair.</p>
      </template>

      <!-- Pix expired -->
      <template v-else-if="state === 'expired'">
        <Clock class="mx-auto mb-4 size-8 text-warning" aria-hidden="true" />
        <h1 class="mb-2 text-section text-fg-strong">O código Pix expirou</h1>
        <p class="mb-6 text-meta text-fg-muted">Nada foi cobrado. Gere um novo código para concluir.</p>
        <UiButton v-if="restart.available.value" variant="primary" block :loading="restart.pending.value" @click="newPix">Gerar novo Pix</UiButton>
        <PlansCheckoutSoon v-else />
      </template>

      <!-- Not found / error -->
      <template v-else>
        <AlertCircle class="mx-auto mb-4 size-8 text-danger" aria-hidden="true" />
        <h1 class="mb-2 text-section text-fg-strong">Não encontramos este pagamento</h1>
        <p class="mb-6 text-meta text-fg-muted">Se você já pagou, o {{ proName }} aparece em instantes na sua conta.</p>
        <UiButton block to="/planos">Voltar para os planos</UiButton>
      </template>
    </UiSection>
  </div>
</template>

<script setup lang="ts">
// Return of the annual checkout (prd-4h-landing-v3 RF-F13): the states of the payment polling, and UiCelebration
// when the Pro is active. Stays in the app shell: only a signed-in person gets here.
import { AlertCircle, Clock, Copy } from 'lucide-vue-next'
import type { CheckoutSessionInfo } from '~/types'

type ViewState = 'loading' | 'active' | 'confirming' | 'waiting' | 'expired' | 'error'

const POLL_MS = 3000
const MAX_POLL_MS = 30 * 60 * 1000

const route = useRoute()
const toast = useToast()
const proName = useProName()
const auth = useAuthStore()
const subscription = useSubscriptionStore()

const sessionId = typeof route.query.session_id === 'string' ? route.query.session_id : ''
const session = ref<CheckoutSessionInfo | null>(null)
const failed = ref(false)
const now = ref(Date.now())
// The checkout may have closed since ("Assinatura em breve"): the notice in place of a new Pix
const restart = useCheckout()
const startedAt = Date.now()

let pollTimer: ReturnType<typeof setTimeout> | null = null
let clockTimer: ReturnType<typeof setInterval> | null = null

const pixExpiresAt = computed(() => session.value?.pix_qr?.expires_at ? new Date(session.value.pix_qr.expires_at).getTime() : null)

const state = computed<ViewState>(() => {
  if (failed.value) return 'error'
  const s = session.value
  if (!s) return 'loading'
  if (s.payment_status === 'paid') return s.plan_active ? 'active' : 'confirming'
  if (s.status === 'expired' || (pixExpiresAt.value !== null && now.value >= pixExpiresAt.value)) return 'expired'
  return 'waiting'
})

const isFinal = computed(() => ['active', 'expired', 'error'].includes(state.value))

const remainingLabel = computed(() => {
  if (pixExpiresAt.value === null) return ''
  const seconds = Math.max(0, Math.floor((pixExpiresAt.value - now.value) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
})

async function poll() {
  pollTimer = null
  if (!sessionId) {
    failed.value = true
    return
  }

  try {
    session.value = await subscription.fetchCheckoutSession(sessionId)
  } catch {
    failed.value = true
  }

  if (state.value === 'active') {
    refreshUser()
    return
  }
  schedule()
}

function schedule() {
  if (isFinal.value || document.hidden || pollTimer) return
  if (Date.now() - startedAt > MAX_POLL_MS) return
  pollTimer = setTimeout(poll, POLL_MS)
}

function stopPolling() {
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = null
}

function onVisibilityChange() {
  if (document.hidden) {
    stopPolling()
  } else if (!isFinal.value) {
    stopPolling()
    poll()
  }
}

async function refreshUser() {
  try {
    const { $api } = useNuxtApp()
    const res = await $api<{ data: any }>('/me')
    if (res.data) auth.setUser(res.data)
  } catch (e) {
    reportApiError(e, { silent: true })
  }
}

async function copyPixCode() {
  const code = session.value?.pix_qr?.data
  if (!code) return
  try {
    await navigator.clipboard.writeText(code)
    toast.show('Código Pix copiado.', 'success')
  } catch {
    toast.show('Não foi possível copiar. Selecione e copie manualmente.', 'error')
  }
}

function newPix() {
  return restart.run(() => subscription.checkoutAnnual(), { error: 'Não foi possível abrir o checkout. Tente de novo.' })
}

onMounted(() => {
  void usePlans().fetchPlans()
  poll()
  clockTimer = setInterval(() => { now.value = Date.now() }, 1000)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onScopeDispose(() => {
  stopPolling()
  if (clockTimer) clearInterval(clockTimer)
  if (import.meta.client) document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>
