<template>
  <div>
    <div
      v-if="inline || !dismissed"
      role="status"
      class="relative px-4 py-2.5 flex flex-col gap-2 bg-[var(--badge-warning-bg)] border-[var(--border-divider)]"
      :class="inline ? 'rounded-xl border' : 'border-b sm:flex-row sm:items-center sm:gap-3'"
    >
      <p id="verify-email-notice" class="text-micro text-base-primary font-medium flex-1" :class="{ 'pr-8 sm:pr-0': !inline }">
        Confirme seu e-mail para gerar com IA. Enviamos um link para <span class="break-all">{{ auth.user?.email }}</span>.
      </p>
      <div class="flex gap-2 shrink-0">
        <button
          type="button"
          class="btn-secondary text-micro px-3 py-1.5 flex-1 sm:flex-none"
          :disabled="sending || cooldown > 0"
          @click="resend"
        >
          {{ buttonLabel }}
        </button>
        <button
          type="button"
          class="btn-secondary text-micro px-3 py-1.5 flex-1 sm:flex-none"
          :disabled="checking"
          @click="checkVerified"
        >
          {{ checking ? 'Verificando...' : 'Já confirmei' }}
        </button>
      </div>
      <button
        v-if="!inline"
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
// inline: persistent box for pages without the default layout (onboarding), no dismiss
defineProps<{ inline?: boolean }>()

const COOLDOWN_SECONDS = 60
const DISMISS_KEY = 'verify_email_banner_dismissed'

const auth = useAuthStore()
const toast = useToast()
const { $api } = useNuxtApp()

const dismissed = ref(false)
const showModal = ref(false)
const sending = ref(false)
const checking = ref(false)
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

/** Re-reads /me: once verified the parent's v-if removes the notice and the AI actions unlock. */
async function checkVerified() {
  checking.value = true
  const user = await auth.fetchMe()
  checking.value = false
  if (user?.email_verified) toast.show('E-mail confirmado!', 'success')
  else if (user) toast.show('Ainda não recebemos a confirmação. Abra o link do e-mail e tente de novo.', 'warning')
  else if (auth.user) toast.show('Não foi possível verificar agora. Tente de novo.', 'error')
}

function dismiss() {
  dismissed.value = true
  try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* intencional: sessionStorage indisponível */ }
}

function onUnverified() {
  showModal.value = true
}

onMounted(() => {
  try { dismissed.value = sessionStorage.getItem(DISMISS_KEY) === '1' } catch { /* intencional: sessionStorage indisponível */ }
  window.addEventListener('email-unverified', onUnverified)
})

onBeforeUnmount(() => {
  window.removeEventListener('email-unverified', onUnverified)
  clearInterval(timer)
})

defineExpose({ resend, cooldown, checkVerified })
</script>
