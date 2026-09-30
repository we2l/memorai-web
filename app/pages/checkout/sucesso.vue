<template>
  <div class="p-4 sm:p-6 pb-20 lg:pb-6 max-w-md mx-auto">
    <UiConfetti :trigger="state === 'active'" />

    <div class="card p-6 text-center" aria-live="polite" aria-atomic="true">
      <!-- Loading -->
      <template v-if="state === 'loading'">
        <Loader2 :size="32" class="mx-auto mb-4 text-accent-primary animate-spin" aria-hidden="true" />
        <p class="text-base-muted text-small">Carregando pagamento…</p>
      </template>

      <!-- Pro active -->
      <template v-else-if="state === 'active'">
        <CheckCircle2 :size="40" class="mx-auto mb-4 text-[var(--badge-success-text)]" aria-hidden="true" />
        <h1 class="text-headline mb-2">Pro ativado até {{ formatBillingDate(session?.plan_expires_at) }}</h1>
        <p class="text-small text-base-muted mb-6">Obrigado! Enviamos o recibo para o seu e-mail.</p>
        <NuxtLink to="/hoje" class="btn-primary w-full justify-center">Ir para Hoje</NuxtLink>
      </template>

      <!-- Paid, webhook not processed yet -->
      <template v-else-if="state === 'confirming'">
        <Loader2 :size="32" class="mx-auto mb-4 text-accent-primary animate-spin" aria-hidden="true" />
        <h1 class="text-headline mb-2">Confirmando pagamento…</h1>
        <p class="text-small text-base-muted">Isso leva poucos segundos.</p>
      </template>

      <!-- Waiting for Pix -->
      <template v-else-if="state === 'waiting'">
        <h1 class="text-headline mb-2">Aguardando o Pix</h1>
        <p class="text-small text-base-muted mb-5">Abra o app do seu banco e pague com o QR Code ou o código copia e cola.</p>

        <template v-if="session?.pix_qr">
          <img
            v-if="session.pix_qr.image_url_png"
            :src="session.pix_qr.image_url_png"
            alt="QR Code do Pix para pagar o Baigi Pro anual"
            class="w-56 h-56 mx-auto mb-4 rounded-lg bg-white p-2"
            width="224"
            height="224"
          >
          <button
            v-if="session.pix_qr.data"
            class="btn-secondary w-full justify-center mb-3"
            @click="copyPixCode"
          >
            <Copy :size="16" aria-hidden="true" /> Copiar código Pix
          </button>
          <p v-if="remainingLabel" class="text-micro text-base-muted mb-4">
            O código expira em <span class="font-medium text-base-primary tabular-nums">{{ remainingLabel }}</span>
          </p>
        </template>

        <p class="text-micro text-base-muted">Pode fechar esta página: avisaremos por e-mail quando o pagamento cair.</p>
      </template>

      <!-- Pix expired -->
      <template v-else-if="state === 'expired'">
        <Clock :size="36" class="mx-auto mb-4 text-[var(--badge-warning-text)]" aria-hidden="true" />
        <h1 class="text-headline mb-2">O código Pix expirou</h1>
        <p class="text-small text-base-muted mb-6">Nada foi cobrado. Gere um novo código para concluir.</p>
        <button class="btn-primary w-full justify-center" :disabled="restarting" @click="newPix">
          {{ restarting ? 'Abrindo checkout...' : 'Gerar novo Pix' }}
        </button>
      </template>

      <!-- Not found / error -->
      <template v-else>
        <AlertCircle :size="36" class="mx-auto mb-4 text-[var(--badge-danger-text)]" aria-hidden="true" />
        <h1 class="text-headline mb-2">Não encontramos este pagamento</h1>
        <p class="text-small text-base-muted mb-6">Se você já pagou, o Pro aparece em instantes na sua conta.</p>
        <NuxtLink to="/planos" class="btn-secondary w-full justify-center">Voltar para os planos</NuxtLink>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertCircle, CheckCircle2, Clock, Copy, Loader2 } from 'lucide-vue-next'
import type { CheckoutSessionInfo } from '~/types'

type ViewState = 'loading' | 'active' | 'confirming' | 'waiting' | 'expired' | 'error'

const POLL_MS = 3000
const MAX_POLL_MS = 30 * 60 * 1000

const route = useRoute()
const toast = useToast()
const auth = useAuthStore()
const subscription = useSubscriptionStore()

const sessionId = typeof route.query.session_id === 'string' ? route.query.session_id : ''
const session = ref<CheckoutSessionInfo | null>(null)
const failed = ref(false)
const now = ref(Date.now())
const restarting = ref(false)
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

async function newPix() {
  restarting.value = true
  try {
    await subscription.checkoutAnnual()
  } catch (e: any) {
    toast.show(e?.data?.message || 'Erro ao iniciar checkout.', 'error')
    restarting.value = false
  }
}

onMounted(() => {
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
