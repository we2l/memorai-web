<template>
  <div class="flex flex-col gap-3" data-testid="billing-manage">
    <p v-if="info?.card?.last_four" class="text-meta text-fg-muted" data-testid="billing-card">
      Cartão {{ brandLabel }} final {{ info.card.last_four }}
    </p>
    <p v-if="subscription.isPastDue" class="rounded-control bg-danger-subtle px-3 py-2 text-meta text-danger" role="status">
      A última cobrança não passou. Troque o cartão: o Mercado Pago tenta de novo nos próximos dias.
    </p>

    <div class="flex flex-wrap gap-2">
      <UiButton v-if="pixRenew" :to="PIX_RENEWAL_PATH" data-testid="billing-renew-pix">Renovar com Pix</UiButton>
      <UiButton v-else-if="annualRenew" :to="ANNUAL_RENEWAL_PATH" data-testid="billing-renew-annual">Renovar anual</UiButton>
      <UiButton v-if="info?.can_change_card" data-testid="billing-change-card" @click="cardOpen = true">Trocar cartão</UiButton>
      <UiButton v-if="info?.can_cancel" variant="ghost" data-testid="billing-cancel" @click="cancelOpen = true">Cancelar assinatura</UiButton>
      <UiButton v-if="info?.refundable" variant="ghost" data-testid="billing-refund" @click="refundOpen = true">Pedir reembolso</UiButton>
    </div>
    <p v-if="info?.refundable" class="text-meta text-fg-muted">Reembolso total até {{ formatBillingDate(info.refundable.until) }}, sem precisar explicar.</p>

    <UiSheet v-model="cardOpen" title="Trocar cartão" description="O próximo mês já é cobrado no cartão novo.">
      <p v-if="cardError" class="mb-3 rounded-control bg-danger-subtle px-3 py-2 text-meta text-danger" role="alert">{{ cardError }}</p>
      <CheckoutCardBrick
        v-if="cardOpen && publicKey && monthlyPrice"
        :public-key="publicKey"
        :amount="monthlyPrice / 100"
        :email="auth.user?.email"
        :max-installments="1"
        submit-label="Salvar cartão"
        :pay="changeCard"
      />
    </UiSheet>

    <UiConfirmModal
      v-model="cancelOpen"
      title="Cancelar a assinatura?"
      :message="cancelMessage"
      confirm-label="Cancelar assinatura"
      cancel-label="Manter"
      variant="danger"
      :loading="action.pending.value"
      @confirm="cancel"
    />
    <UiConfirmModal
      v-model="refundOpen"
      title="Pedir o reembolso?"
      :message="refundMessage"
      confirm-label="Pedir reembolso"
      cancel-label="Voltar"
      variant="danger"
      :loading="action.pending.value"
      @confirm="refund"
    />
  </div>
</template>

<script setup lang="ts">
// Manage the paid plan without a portal (prd-pagamento-mercado-pago RF-F4): change card (the Brick in a sheet), cancel
// in two clicks, the 7-day refund (CDC art. 49) and renewing the prepaid. Every action through useApiAction.
import type { CardPayload } from '~/stores/subscription'
import { formatBrl } from '~/utils/checkoutState'
import { extractApiMessage } from '~/utils/apiErrors'

const auth = useAuthStore()
const subscription = useSubscriptionStore()
const { plans } = usePlans()
const proName = useProName()
const action = useApiAction()

const info = computed(() => subscription.info)
const publicKey = computed(() => plans.value?.checkout?.public_key ?? null)
const monthlyPrice = computed(() => plans.value?.plans.find(p => p.key === 'pro')?.prices.monthly?.amount_cents ?? null)
const pixRenew = computed(() => info.value?.billing === 'monthly_pix' && !!info.value.can_buy?.monthly_pix)
const annualRenew = computed(() => info.value?.billing === 'annual' && !!info.value.can_buy?.annual)
const brandLabel = computed(() => {
  const brand = info.value?.card?.brand ?? ''
  return ({ master: 'Mastercard', visa: 'Visa', elo: 'Elo', amex: 'Amex', hipercard: 'Hipercard' } as Record<string, string>)[brand] ?? brand
})

const cardOpen = ref(false)
const cancelOpen = ref(false)
const refundOpen = ref(false)
const cardError = ref('')

const cancelMessage = computed(() => {
  const renews = info.value?.subscription_renews_at
  return renews
    ? `O cartão não é mais cobrado. O ${proName.value} continua até ${formatBillingDate(renews)} e depois a conta volta ao Grátis, com tudo o que você criou.`
    : `O cartão não é mais cobrado e a conta volta ao Grátis, com tudo o que você criou.`
})

const refundMessage = computed(() => {
  const r = info.value?.refundable
  if (!r) return ''
  const where = r.product === 'annual_pix' || r.product === 'monthly_pix' ? 'para a conta de onde saiu o Pix' : 'na fatura do cartão'
  return `Devolvemos ${formatBrl(r.amount_cents)} ${where}. O acesso desta compra acaba agora; cadernos, notas e cards continuam com você.`
})

async function changeCard(card: CardPayload): Promise<void> {
  cardError.value = ''
  try {
    await subscription.changeCard({ token: card.token, payment_method_id: card.payment_method_id, card_last_four: card.card_last_four })
    cardOpen.value = false
    useToast().show('Cartão trocado.', 'success')
  } catch (e) {
    cardError.value = extractApiMessage(e, 'Não foi possível trocar o cartão. Confira os dados e tente de novo.')
    throw e
  }
}

function cancel() {
  return action.run(async () => {
    await subscription.cancel()
    cancelOpen.value = false
  }, { success: 'Assinatura cancelada. Nada mais será cobrado.', error: 'Não foi possível cancelar agora. Tente de novo em instantes.' })
}

function refund() {
  const id = info.value?.refundable?.checkout_id
  if (!id) return
  return action.run(async () => {
    await subscription.refund(id)
    refundOpen.value = false
    const { $api } = useNuxtApp()
    const res = await $api<{ data: any }>('/me')
    if (res.data) auth.setUser(res.data)
  }, { success: 'Reembolso pedido. Enviamos a confirmação por e-mail.', error: 'Não foi possível pedir o reembolso agora. Fale com o suporte.' })
}
</script>
