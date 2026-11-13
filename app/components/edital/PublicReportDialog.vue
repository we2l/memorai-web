<template>
  <UiDialog :model-value="modelValue" title="Denunciar este resultado" description="Se não é um edital ou tem conteúdo que não deveria estar aqui, conte para a gente." size="sm" @update:model-value="emit('update:modelValue', $event)">
    <form id="edital-report-form" class="flex flex-col gap-4" novalidate @submit.prevent="send">
      <UiRadioGroup v-model="reason" :options="REASONS" label="Motivo" />
      <UiTextarea v-model="detail" label="Quer contar mais?" optional :rows="3" :maxlength="500" hint="Até 500 caracteres." />
      <div ref="captchaEl" class="contents" data-testid="edital-report-captcha" />
      <p v-if="error" role="alert" class="text-meta text-danger" data-testid="edital-report-error">{{ error }}</p>
    </form>
    <template #footer="{ close }">
      <UiButton variant="ghost" :disabled="sending" @click="close">Cancelar</UiButton>
      <UiButton variant="primary" type="submit" form="edital-report-form" :loading="sending" :disabled="!reason">Enviar denúncia</UiButton>
    </template>
  </UiDialog>
</template>

<script setup lang="ts">
// "Denunciar" of the result (prd-edital-verticalizado-publico RF-F6): POST /public/editais/{id}/report with the
// reason, an optional note and the Turnstile token (normal mode). 204 → "Recebemos. Vamos olhar."
import { submitFailure } from '~/utils/publicEdital'
import { CAPTCHA_MESSAGES } from '~/utils/turnstile'

const props = defineProps<{ modelValue: boolean, readingId: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'ofensivo', label: 'Conteúdo ofensivo' },
  { value: 'nao_e_edital', label: 'Não é um edital' },
  { value: 'outro', label: 'Outro motivo' },
]

const { $api } = useNuxtApp()
const toast = useToast()
const captcha = useTurnstile()
const captchaEl = ref<HTMLElement | null>(null)
const reason = ref('')
const detail = ref('')
const sending = ref(false)
const error = ref('')

watch(() => props.modelValue, (open) => {
  if (!open) return
  error.value = ''
  void nextTick(() => captcha.render(captchaEl.value))
})

async function send() {
  if (!reason.value || sending.value) return
  sending.value = true
  error.value = ''
  try {
    let token: string | undefined
    try {
      token = await captcha.getToken(captchaEl.value)
    } catch {
      error.value = captcha.error.value || CAPTCHA_MESSAGES.load
      return
    }
    try {
      await $api(`/public/editais/${encodeURIComponent(props.readingId)}/report`, {
        method: 'POST',
        body: { reason: reason.value, ...(detail.value.trim() ? { detail: detail.value.trim() } : {}), ...(token ? { captcha_token: token } : {}) },
      })
      toast.show('Recebemos. Vamos olhar.', 'success')
      reason.value = ''
      detail.value = ''
      emit('update:modelValue', false)
    } catch (e) {
      error.value = submitFailure(e).message
      reportApiError(e, { silent: true })
    } finally {
      captcha.reset()
    }
  } finally {
    sending.value = false
  }
}
</script>
