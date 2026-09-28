<template>
  <div>
    <div
      v-if="!dismissed"
      role="status"
      class="relative border-b px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-[var(--badge-warning-bg)] border-[var(--border-divider)]"
    >
      <p class="text-micro text-base-primary font-medium flex-1 pr-8 sm:pr-0">
        Confirme seu e-mail (<span class="break-all">{{ auth.user?.email }}</span>) para usar os recursos de IA.
      </p>
      <button
        type="button"
        class="btn-secondary text-micro px-3 py-1.5 w-full sm:w-auto shrink-0"
        :disabled="sending || cooldown > 0"
        @click="resend"
      >
        {{ buttonLabel }}
      </button>
      <button
        type="button"
        class="absolute right-2 top-2 sm:static p-1.5 text-base-muted hover:text-base-primary rounded-lg shrink-0"
        aria-label="Fechar aviso"
        @click="dismiss"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>

    <UiModal v-model="showModal" size="sm" aria-label="Confirme seu e-mail">
      <h2 class="text-lg font-semibold text-base-primary mb-2 pr-8">Confirme seu e-mail</h2>
      <p class="text-small text-base-muted mb-6">
        Os recursos de IA ficam disponíveis depois que você confirmar <span class="break-all">{{ auth.user?.email }}</span>.
        Confira sua caixa de entrada e o spam.
      </p>
      <button type="button" class="btn-primary w-full" :disabled="sending || cooldown > 0" @click="resend">
        {{ buttonLabel }}
      </button>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
const COOLDOWN_SECONDS = 60
const DISMISS_KEY = 'verify_email_banner_dismissed'

const auth = useAuthStore()
const toast = useToast()
const { $api } = useNuxtApp()

const dismissed = ref(false)
const showModal = ref(false)
const sending = ref(false)
const cooldown = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

const buttonLabel = computed(() => {
  if (sending.value) return 'Enviando...'
  if (cooldown.value > 0) return `Reenviar em ${cooldown.value}s`
  return 'Reenviar e-mail'
})

function startCooldown() {
  cooldown.value = COOLDOWN_SECONDS
  clearInterval(timer)
  timer = setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0) clearInterval(timer)
  }, 1000)
}

async function resend() {
  if (sending.value || cooldown.value > 0) return
  sending.value = true
  try {
    await $api('/email/verification-notification', { method: 'POST' })
    toast.show('Link enviado. Confira sua caixa de entrada e o spam.', 'success', 5000)
    startCooldown()
  } catch (e: any) {
    const status = e?.response?.status ?? e?.statusCode
    if (status === 429) {
      toast.show('Aguarde alguns minutos.', 'warning')
      startCooldown()
    } else {
      toast.show(e?.data?.message || 'Não foi possível enviar o link.', 'error')
    }
  } finally {
    sending.value = false
  }
}

function dismiss() {
  dismissed.value = true
  try { sessionStorage.setItem(DISMISS_KEY, '1') } catch {}
}

function onUnverified() {
  showModal.value = true
}

onMounted(() => {
  try { dismissed.value = sessionStorage.getItem(DISMISS_KEY) === '1' } catch {}
  window.addEventListener('email-unverified', onUnverified)
})

onBeforeUnmount(() => {
  window.removeEventListener('email-unverified', onUnverified)
  clearInterval(timer)
})

defineExpose({ resend, cooldown })
</script>
