<template>
  <div class="flex flex-col items-center gap-4 text-center" aria-live="polite">
    <template v-if="expired">
      <Clock class="size-8 text-fg-muted" aria-hidden="true" />
      <div>
        <p class="text-body font-semibold text-fg-strong">O código Pix expirou</p>
        <p class="text-meta text-fg-muted">Nada foi cobrado. Gere um novo código para concluir.</p>
      </div>
      <UiButton variant="primary" :loading="loading" @click="$emit('regenerate')">Gerar novo Pix</UiButton>
    </template>

    <template v-else-if="payment.pix">
      <!-- The receiver the bank app will show: the person behind the Baigi, receiving through Mercado Pago -->
      <p v-if="sellerName" class="max-w-prose text-meta text-fg" data-testid="pix-receiver">
        No app do seu banco vai aparecer o nome do responsável pelo Baigi, <strong class="font-semibold text-fg-strong">{{ sellerName }}</strong>, recebendo pelo Mercado Pago.
        <NuxtLink to="/quem-faz" class="text-fg-muted underline underline-offset-2 hover:text-fg-strong">Quem faz o Baigi</NuxtLink>
      </p>
      <img
        v-if="payment.pix.qr_code_base64"
        :src="`data:image/png;base64,${payment.pix.qr_code_base64}`"
        :alt="`QR Code do Pix de ${amountLabel} para o Baigi`"
        class="size-56 rounded-row bg-qr p-2"
        width="224"
        height="224"
      >
      <UiButton block :icon-left="Copy" data-testid="pix-copy" @click="copy">Copiar código Pix</UiButton>
      <p v-if="remaining" class="text-meta text-fg-muted">
        O código expira em <span class="font-semibold tabular-nums text-fg-strong">{{ remaining }}</span>
      </p>
      <p class="text-meta text-fg-muted">Abra o app do banco, escolha Pix e leia o QR Code ou cole o código. O {{ proName }} libera aqui assim que o pagamento cair.</p>
    </template>
  </div>
</template>

<script setup lang="ts">
// Pix of the checkout (prd-pagamento-mercado-pago RF-F2): QR, copia e cola, 30 minutes, and the receiver notice right
// above the QR (the bank app shows the seller's name, not "Baigi").
import { Clock, Copy } from 'lucide-vue-next'
import type { CheckoutPayment } from '~/types'
import { formatBrl, remainingLabel } from '~/utils/checkoutState'

const props = defineProps<{
  payment: CheckoutPayment
  sellerName: string | null
  expired: boolean
  loading?: boolean
}>()
defineEmits<{ (e: 'regenerate'): void }>()

const toast = useToast()
const proName = useProName()
const now = ref(Date.now())
const remaining = computed(() => remainingLabel(props.payment.pix?.expires_at, now.value))
const amountLabel = computed(() => formatBrl(props.payment.amount_cents))

let clock: ReturnType<typeof setInterval> | null = null
onMounted(() => { clock = setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => { if (clock) clearInterval(clock) })

async function copy() {
  const code = props.payment.pix?.qr_code
  if (!code) return
  try {
    await navigator.clipboard.writeText(code)
    toast.show('Código Pix copiado.', 'success')
  } catch {
    toast.show('Não foi possível copiar. Selecione e copie o código à mão.', 'error')
  }
}
</script>
