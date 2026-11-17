<template>
  <UiDialog :model-value="modelValue" :title="title" size="sm" @update:model-value="emit('update:modelValue', $event)">
    <form id="edital-lead-form" class="flex flex-col gap-4" novalidate data-testid="edital-lead-form" @submit.prevent="send">
      <UiInput
        ref="emailRef"
        v-model="email"
        type="email"
        label="Seu e-mail"
        autocomplete="email"
        inputmode="email"
        placeholder="ana@exemplo.com"
        :error="error"
        data-testid="edital-lead-email"
      />
      <UiCheckbox v-model="marketing" label="Quero receber dicas de estudo e novidades do Baigi por e-mail" data-testid="edital-lead-marketing" />
      <UiButton variant="primary" type="submit" block :loading="sending" data-testid="edital-lead-submit">{{ submitLabel }}</UiButton>
      <p class="text-meta text-fg-muted">
        Usamos seu e-mail para liberar o download. Como cuidamos dele:
        <NuxtLink to="/privacidade#ferramentas" target="_blank" class="font-medium text-action-fg underline">Privacidade</NuxtLink>.
      </p>
    </form>

    <div class="my-5 flex items-center gap-3 text-meta text-fg-muted" aria-hidden="true">
      <span class="h-px flex-1 bg-line" /> ou <span class="h-px flex-1 bg-line" />
    </div>
    <!-- The Google account brings the person back to this reading, which becomes a caderno (the intent waits on the device) -->
    <AuthGoogleButton :before-redirect="() => emit('google')" />
    <p class="mt-2 text-center text-meta text-fg-muted">Crie a conta com o Google e o caderno já fica salvo.</p>
  </UiDialog>
</template>

<script setup lang="ts">
// E-mail before the PDF and the .ics of the free tool (prd-cronograma RF-W5, RN-8; estudo §4.6): the e-mail, the
// marketing box UNTICKED (LGPD art. 8º), what the e-mail is for and the Privacidade, and "Ou crie a conta com o
// Google" in the same dialog. POST /public/editais/{id}/lead; the download goes right after the 204, and also when
// the POST fails (only a 422 of the e-mail asks to fix it). No e-mail is sent.
import { getErrorStatus } from '~/utils/apiErrors'
import { isEmail, rememberLeadEmail, rememberedLeadEmail } from '~/utils/publicSchedule'

const props = defineProps<{
  modelValue: boolean
  readingId: string
  tool: 'pdf' | 'ics'
  /** What the PDF is: the list of the edital or the cronograma */
  what: 'edital' | 'schedule'
  /** Where the visitor is: a conferred page sends origin page in the event (prd-paginas-edital-publicas RF-W13) */
  origin?: string
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  /** The e-mail went (or the POST failed): download now */
  (e: 'download'): void
  (e: 'google'): void
}>()

const { $api } = useNuxtApp()
const { track } = useAnalytics()
const email = ref(rememberedLeadEmail() ?? '')
const marketing = ref(false)
const sending = ref(false)
const error = ref('')
const emailRef = ref<{ focus: () => void } | null>(null)

const title = computed(() => {
  if (props.tool === 'ics') return 'Baixar o cronograma para a agenda'
  return props.what === 'schedule' ? 'Baixar o cronograma em PDF' : 'Baixar o edital verticalizado em PDF'
})
const submitLabel = computed(() => (props.tool === 'ics' ? 'Baixar a agenda' : 'Baixar o PDF'))

watch(() => props.modelValue, (open) => {
  if (!open) return
  error.value = ''
  marketing.value = false
})

async function send() {
  const value = email.value.trim()
  if (!isEmail(value)) {
    error.value = 'Confira o e-mail: falta o @ ou o domínio.'
    emailRef.value?.focus()
    return
  }
  sending.value = true
  error.value = ''
  track('edital_public_lead', { tool: props.tool, marketing: marketing.value, ...(props.origin === 'page' ? { origin: 'page' } : {}) })
  try {
    await $api(`/public/editais/${encodeURIComponent(props.readingId)}/lead`, { method: 'POST', body: { email: value, tool: props.tool, marketing: marketing.value } })
  } catch (e) {
    if (getErrorStatus(e) === 422) {
      const data = (e as { data?: { errors?: { email?: string[] } } }).data
      error.value = data?.errors?.email?.[0] ?? 'Confira o e-mail e tente de novo.'
      sending.value = false
      return
    }
    // The download is the promise of the button: a failure of ours never holds it
    reportApiError(e, { silent: true })
  }
  sending.value = false
  rememberLeadEmail(value)
  emit('update:modelValue', false)
  emit('download')
}
</script>
