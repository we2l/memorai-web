<template>
  <div>
    <p v-if="state === 'loading'" class="flex items-center gap-2 py-6 text-meta text-fg-muted" aria-live="polite">
      <UiSpinner size="sm" /> Carregando o formulário seguro do cartão…
    </p>
    <div v-if="state === 'failed'" class="flex flex-col items-start gap-3 py-4" role="alert">
      <p class="text-body text-fg">Não conseguimos abrir o formulário do cartão. Confira a conexão e tente de novo, ou pague no Pix.</p>
      <UiButton @click="mount">Tentar de novo</UiButton>
    </div>
    <!-- The card fields are the gateway's iframes: the number never touches the Baigi (SAQ A, ADR-034) -->
    <div :id="containerId" :class="state === 'failed' ? 'hidden' : ''" data-testid="card-brick" />
  </div>
</template>

<script setup lang="ts">
// Card Payment Brick (MercadoPago.js v2) in the DS colours. Unmounted when the screen or the tab goes away, created
// again when it comes back (doc: "destruir a instância com controller.unmount()").
import type { CardPayload } from '~/stores/subscription'
import { brickStyle, deviceId, mercadoPago, type BrickAdditionalData, type BrickController, type BrickFormData } from '~/utils/mercadoPago'

const props = withDefaults(defineProps<{
  publicKey: string
  /** In reais (the Brick works in reais, not cents) */
  amount: number
  email?: string | null
  maxInstallments?: number
  /** Text of the Brick's button ("Pagar" by default) */
  submitLabel?: string | null
  /** The submit: resolves to let the Brick end its spinner; throws to let the person fix the card */
  pay: (card: CardPayload) => Promise<void>
}>(), { email: null, maxInstallments: 1, submitLabel: null })

const containerId = `card-brick-${useId()}`
const state = ref<'loading' | 'ready' | 'failed'>('loading')
let controller: BrickController | null = null
let disposed = false

async function mount() {
  state.value = 'loading'
  controller?.unmount()
  controller = null

  try {
    const mp = await mercadoPago(props.publicKey)
    if (disposed) return
    controller = await mp.bricks().create('cardPayment', containerId, {
      initialization: { amount: props.amount, payer: props.email ? { email: props.email } : undefined },
      customization: {
        visual: { style: brickStyle(), hideFormTitle: true, ...(props.submitLabel ? { texts: { formSubmit: props.submitLabel } } : {}) },
        paymentMethods: { maxInstallments: props.maxInstallments, minInstallments: 1, types: { excluded: ['debit_card', 'prepaid_card'] } },
      },
      callbacks: {
        onReady: () => { state.value = 'ready' },
        onError: () => { if (state.value === 'loading') state.value = 'failed' },
        onSubmit: (formData: BrickFormData, additional?: BrickAdditionalData) => props.pay({
          token: formData.token,
          payment_method_id: formData.payment_method_id,
          issuer_id: formData.issuer_id == null ? null : String(formData.issuer_id),
          installments: Number(formData.installments) || 1,
          device_id: deviceId(),
          card_last_four: additional?.lastFourDigits ?? null,
          identification: formData.payer?.identification?.number
            ? { type: formData.payer.identification.type ?? 'CPF', number: formData.payer.identification.number }
            : null,
        }),
      },
    })
    if (disposed) controller.unmount()
  } catch {
    state.value = 'failed'
  }
}

watch(() => [props.amount, props.maxInstallments], () => { void mount() })

onMounted(mount)
onBeforeUnmount(() => {
  disposed = true
  controller?.unmount()
  controller = null
})
</script>
