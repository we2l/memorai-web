<template>
  <UiDialog v-model="open" size="md" title="Pedir o reembolso?" :description="message">
    <form :id="formId" class="flex flex-col gap-4" novalidate @submit.prevent="submit">
      <div>
        <UiRadioGroup
          v-model="reason"
          :options="REFUND_REASONS"
          label="Por que você está pedindo o reembolso?"
          name="refund-reason"
          data-testid="refund-reasons"
        />
        <p v-if="reasonError" :id="reasonErrorId" class="mt-1 text-meta text-danger" role="alert" data-testid="refund-reason-error">{{ reasonError }}</p>
      </div>
      <UiTextarea
        v-model="detail"
        label="Quer contar mais?"
        optional
        :rows="3"
        :maxlength="REFUND_DETAIL_MAX"
        :hint="`${detail.length} de ${REFUND_DETAIL_MAX} caracteres`"
        data-testid="refund-detail"
      />
      <p v-if="error" class="rounded-control bg-danger-subtle px-3 py-2 text-meta text-danger" role="alert" data-testid="refund-error">{{ error }}</p>
    </form>
    <template #footer>
      <UiButton variant="ghost" @click="open = false">Voltar</UiButton>
      <UiButton type="submit" :form="formId" variant="danger" :loading="loading" data-testid="refund-confirm">
        {{ loading ? 'Aguarde…' : 'Pedir reembolso' }}
      </UiButton>
    </template>
  </UiDialog>
</template>

<script setup lang="ts">
// The 7-day refund (CDC art. 49) from the screen: one required reason and an optional text, in one step (no second
// "tem certeza?"). The reason is kept on the purchase and, with consent, goes to analytics (refund_requested).
import { REFUND_DETAIL_MAX, REFUND_REASONS, type RefundRequest } from '~/utils/refund'

defineProps<{
  message: string
  loading?: boolean
  error?: string
}>()

const emit = defineEmits<{ (e: 'confirm', body: RefundRequest): void }>()

const open = defineModel<boolean>({ required: true })
const reason = ref('')
const detail = ref('')
const reasonError = ref('')
const formId = useId()
const reasonErrorId = `${formId}-reason-error`

watch(open, (v) => {
  if (!v) return
  reason.value = ''
  detail.value = ''
  reasonError.value = ''
})
watch(reason, (v) => { if (v) reasonError.value = '' })

function submit() {
  if (!reason.value) {
    reasonError.value = 'Escolha um motivo para continuar.'
    nextTick(() => document.querySelector<HTMLInputElement>('input[name="refund-reason"]')?.focus())
    return
  }
  const text = detail.value.trim()
  emit('confirm', { reason: reason.value as RefundRequest['reason'], reason_detail: text ? text.slice(0, REFUND_DETAIL_MAX) : null })
}
</script>
