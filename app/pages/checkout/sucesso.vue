<template>
  <div class="mx-auto max-w-md px-gutter py-8">
    <UiSection as="div" class="text-center" aria-live="polite" aria-atomic="true">
      <p v-if="state === 'loading'" class="flex items-center justify-center gap-2 py-6 text-meta text-fg-muted">
        <UiSpinner size="sm" /> Carregando pagamento…
      </p>

      <!-- Paid: the milestone of the page -->
      <UiCelebration
        v-else-if="state === 'active'"
        kind="milestone"
        :title="`Bem-vindo ao ${proName}!`"
        :subtitle="activeLine"
        :level="1"
      >
        <div class="flex w-full flex-col items-center gap-4">
          <p class="text-meta text-fg-muted">Obrigado! Enviamos o recibo para o seu e-mail.</p>
          <UiButton variant="primary" to="/hoje">Ir para o Hoje</UiButton>
        </div>
      </UiCelebration>

      <template v-else-if="state === 'waiting'">
        <UiSpinner class="mx-auto mb-4 text-fg-muted" />
        <h1 class="mb-2 text-section text-fg-strong">Confirmando pagamento…</h1>
        <p class="mb-5 text-meta text-fg-muted">Isso costuma levar poucos segundos. Pode fechar esta página: avisamos por e-mail quando o pagamento cair.</p>
        <UiButton v-if="payment?.method === 'pix'" block :to="checkoutPath">Ver o QR Code do Pix</UiButton>
      </template>

      <template v-else-if="state === 'ended'">
        <Clock class="mx-auto mb-4 size-8 text-fg-muted" aria-hidden="true" />
        <h1 class="mb-2 text-section text-fg-strong">{{ payment?.method === 'pix' ? 'O código Pix expirou' : 'O pagamento não foi aprovado' }}</h1>
        <p class="mb-6 text-meta text-fg-muted">Nada foi cobrado. Tente de novo quando quiser.</p>
        <UiButton v-if="checkoutOpen" variant="primary" block :to="checkoutPath">Tentar de novo</UiButton>
        <PlansCheckoutSoon v-else />
      </template>

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
// After the checkout (prd-pagamento-mercado-pago RF-F3): reads our endpoint (never the gateway) until the payment
// settles, and UiCelebration once the Intensivo is active. Stays in the app shell: only a signed-in person gets here.
import { AlertCircle, Clock } from 'lucide-vue-next'
import type { CheckoutPayment } from '~/types'
import { isSettled } from '~/utils/checkoutState'

const route = useRoute()
const proName = useProName()
const auth = useAuthStore()
const subscription = useSubscriptionStore()
const checkoutOpen = useCheckout().available

const checkoutId = typeof route.query.checkout === 'string' ? route.query.checkout : ''
const payment = ref<CheckoutPayment | null>(null)
const failed = ref(false)

const state = computed<'loading' | 'active' | 'waiting' | 'ended' | 'error'>(() => {
  if (failed.value || !checkoutId) return 'error'
  const p = payment.value
  if (!p) return 'loading'
  if (p.status === 'approved') return 'active'
  return isSettled(p) ? 'ended' : 'waiting'
})

const activeLine = computed(() => {
  const p = payment.value
  if (p?.plan_expires_at) return `${proName.value} ativo até ${formatBillingDate(p.plan_expires_at)}`
  if (p?.renews_at) return `Próxima cobrança em ${formatBillingDate(p.renews_at)}`
  return `${proName.value} ativo`
})

const checkoutPath = computed(() => {
  const p = payment.value
  const plano = p?.product.startsWith('annual') ? 'anual' : 'mensal'
  return `/checkout?plano=${plano}&metodo=${p?.method === 'pix' ? 'pix' : 'cartao'}`
})

const poller = usePoll(() => subscription.fetchPayment(checkoutId), {
  interval: 3000,
  timeout: 30 * 60 * 1000,
  until: (p: CheckoutPayment) => {
    payment.value = p
    if (p.status === 'approved') void refreshUser()
    return isSettled(p)
  },
  onError: () => { if (!payment.value) failed.value = true },
})

async function refreshUser() {
  try {
    const { $api } = useNuxtApp()
    const res = await $api<{ data: any }>('/me')
    if (res.data) auth.setUser(res.data)
  } catch (e) {
    reportApiError(e, { silent: true })
  }
}

onMounted(() => {
  void usePlans().fetchPlans()
  if (checkoutId) poller.start()
})
</script>
