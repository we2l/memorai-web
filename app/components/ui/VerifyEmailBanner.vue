<template>
  <div>
    <!-- The discreet line of the onboarding (prd-4g RF-F6): it never competes with the sample -->
    <p v-if="compact" class="text-meta text-fg-muted" data-testid="verify-email-line">
      Confirme seu e-mail quando puder: enviamos um link para <span class="break-all">{{ auth.user?.email }}</span> ·
      <button type="button" class="font-semibold text-action-fg underline disabled:text-fg-muted" :disabled="sending || cooldown > 0" @click="resend">{{ cooldown > 0 ? `reenviar em ${cooldown}s` : 'reenviar' }}</button>
    </p>
    <div
      v-else-if="!modalOnly && (inline || !dismissed)"
      role="status"
      class="relative px-4 py-2.5 flex flex-col gap-2 bg-warning-subtle border-line"
      :class="inline ? 'rounded-control border' : 'border-b sm:flex-row sm:items-center sm:gap-3'"
    >
      <p id="verify-email-notice" class="text-label text-fg-strong font-medium flex-1" :class="{ 'pr-8 sm:pr-0': !inline }">
        Confirme seu e-mail para usar <template v-if="hasPreviewOffer">a prévia grátis da IA</template><template v-else>a IA</template><template v-if="trialDays"> e ganhar {{ trialDays }} dias do {{ proName }} no primeiro material</template>: enviamos um link para <span class="break-all">{{ auth.user?.email }}</span>.
      </p>
      <div class="flex gap-2 shrink-0">
        <UiButton size="sm" class="flex-1 sm:flex-none" :loading="sending" :disabled="cooldown > 0" @click="resend">
          {{ buttonLabel }}
        </UiButton>
        <UiButton size="sm" class="flex-1 sm:flex-none" :loading="checking" @click="checkVerified">
          {{ checking ? 'Verificando…' : 'Já confirmei' }}
        </UiButton>
      </div>
      <UiIconButton
        v-if="!inline"
        :icon="X"
        label="Fechar aviso"
        size="sm"
        class="absolute right-1 top-1 sm:static"
        @click="dismiss"
      />
    </div>

    <UiDialog v-model="showModal" size="sm" title="Confirme seu e-mail">
      <p class="text-meta text-fg-muted">
        <template v-if="hasPreviewOffer">A prévia grátis da IA fica disponível</template><template v-else>Os recursos de IA<template v-if="trialDays"> e o teste de {{ trialDays }} dias do {{ proName }}</template> ficam disponíveis</template> depois que você confirmar <span class="break-all">{{ auth.user?.email }}</span>.
        Confira sua caixa de entrada e o spam.
      </p>
      <template #footer>
        <UiButton variant="primary" type="button" block :loading="sending" :disabled="cooldown > 0" @click="resend">
          {{ buttonLabel }}
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
// inline: persistent box for pages without the default layout (onboarding), no dismiss; compact: one line;
// modalOnly: focus screens (the review) keep their whole height, only the modal of the blocked action stays
defineProps<{ inline?: boolean; compact?: boolean; modalOnly?: boolean }>()

const COOLDOWN_SECONDS = 60
const DISMISS_KEY = 'verify_email_banner_dismissed'

const auth = useAuthStore()
const toast = useToast()
const { $api } = useNuxtApp()

// The trial asks for a verified e-mail (prd-planos-lancamento RF-F2): said while it is available
const { plans } = usePlans()
// The catalog is read while the e-mail is not confirmed: the preview of the AI asks for it (prd-uso-justo §9)
const proName = useProName(() => auth.user?.trial?.status === 'available' || auth.user?.email_verified === false)
const hasPreviewOffer = computed(() => !trialDays.value && !!plans.value?.preview && auth.user?.plan !== 'pro')
const trialDays = computed(() => (auth.user?.trial?.status === 'available' ? offeredTrial(plans.value)?.days ?? null : null))

const dismissed = ref(false)
const showModal = ref(false)
const sending = ref(false)
const checking = ref(false)
const cooldown = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

const buttonLabel = computed(() => {
  if (sending.value) return 'Enviando…'
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
