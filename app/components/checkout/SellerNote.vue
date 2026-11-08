<template>
  <div class="flex flex-col gap-1 text-meta text-fg-muted" data-testid="checkout-seller">
    <p v-if="seller">Vendido por {{ seller }}, responsável pelo Baigi. Pagamento processado pelo Mercado Pago.</p>
    <p v-else>Pagamento processado pelo Mercado Pago.</p>
    <p v-if="method === 'card' && descriptor">Na fatura do cartão, a compra aparece como <span class="font-semibold text-fg">{{ descriptor }}</span>.</p>
    <p>
      Mudou de ideia? Você tem {{ refundDays }} dias para pedir o reembolso total: na primeira compra, em Configurações; nas seguintes, pelo suporte.
      <NuxtLink to="/termos" class="underline underline-offset-2 hover:text-fg-strong">Termos de uso</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
// Seller identification (Decreto 7.962/2013 art. 2) and the withdrawal right (CDC art. 49): in the checkout and the
// Termos, never on the landing. Everything from the catalog (config/env of the API).
import { sellerLine } from '~/utils/checkoutState'

defineProps<{ method: 'card' | 'pix' }>()

const { plans } = usePlans()
const seller = computed(() => sellerLine(plans.value))
const descriptor = computed(() => plans.value?.checkout?.statement_descriptor ?? '')
const refundDays = computed(() => plans.value?.checkout?.refund_window_days ?? 7)
</script>
