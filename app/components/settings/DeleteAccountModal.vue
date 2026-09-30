<template>
  <UiModal v-model="open" size="md" role="alertdialog">
    <h2 class="text-headline mb-3 text-[var(--badge-danger-text)]">Excluir sua conta?</h2>

    <!-- Step 1: consequences -->
    <div v-if="step === 1">
      <div ref="consequences" tabindex="-1" class="focus:outline-none" autofocus>
        <p class="text-small text-base-secondary mb-2">Isso apaga para sempre:</p>
        <ul class="list-disc pl-5 text-small text-base-secondary space-y-1 mb-3">
          <li>seus cadernos, notas, cards e histórico de revisões;</li>
          <li>PDFs, podcasts, imagens e áudios enviados;</li>
          <li>provas, simulados e conversas do Tira-dúvidas.</li>
        </ul>
        <p v-if="isMonthly" class="text-small text-base-primary mb-2">Sua assinatura será cancelada agora, sem reembolso proporcional.</p>
        <p v-else-if="isAnnual" class="text-small text-base-primary mb-2">
          Seu plano anual deixa de valer agora. Para pedir reembolso, fale com o suporte em
          <a href="mailto:contato@baigi.com.br" class="underline">contato@baigi.com.br</a> antes de excluir.
        </p>
        <p class="text-micro text-base-muted mb-4">Quer levar seus dados? Use "Exportar meus dados" antes.</p>
      </div>
      <label class="flex items-start gap-2 text-small text-base-primary cursor-pointer mb-5">
        <input v-model="understood" type="checkbox" class="mt-0.5 w-4 h-4 accent-[var(--color-accent-primary)]" />
        Entendo que isso é permanente
      </label>
      <div class="flex gap-3 justify-end">
        <button type="button" class="btn-secondary" @click="open = false">Cancelar</button>
        <button type="button" class="btn-danger" :disabled="!understood" @click="step = 2">Continuar</button>
      </div>
    </div>

    <!-- Step 2: confirmation -->
    <form v-else novalidate @submit.prevent="submit">
      <label for="delete-confirmation" class="text-label mb-1 block">
        {{ hasPassword ? 'Digite sua senha atual' : `Digite seu e-mail (${auth.user?.email})` }}
      </label>
      <input
        id="delete-confirmation"
        v-model="confirmation"
        :type="hasPassword ? 'password' : 'email'"
        class="input-base w-full"
        :autocomplete="hasPassword ? 'current-password' : 'email'"
        autofocus
        :aria-invalid="!!error"
        :aria-describedby="error ? 'delete-error' : undefined"
      />
      <p v-if="error" id="delete-error" role="alert" class="text-micro text-[var(--badge-danger-text)] mt-1">{{ error }}</p>
      <div class="flex gap-3 justify-end mt-5">
        <button type="button" class="btn-secondary" @click="step = 1">Voltar</button>
        <button type="submit" class="btn-danger" :disabled="!confirmation || pending">
          {{ pending ? 'Excluindo...' : 'Excluir minha conta' }}
        </button>
      </div>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>({ required: true })

const auth = useAuthStore()
const subscription = useSubscriptionStore()
const { $api } = useNuxtApp()
const { run, pending } = useApiAction()

const step = ref<1 | 2>(1)
const understood = ref(false)
const confirmation = ref('')
const error = ref('')

const hasPassword = computed(() => auth.user?.has_password !== false)
const isMonthly = computed(() => subscription.info?.billing === 'monthly' && !!subscription.info?.has_subscription)
const isAnnual = computed(() => subscription.isAnnual)

watch(open, (v) => {
  if (!v) return
  step.value = 1
  understood.value = false
  confirmation.value = ''
  error.value = ''
}, { immediate: true })

async function submit() {
  error.value = ''
  try {
    await run(() => $api('/user', { method: 'DELETE', body: { confirmation: confirmation.value } }), { error: false, rethrow: true })
    open.value = false
    // The API already ended every session: just clear the local state
    auth.clearAuth()
    useToast().show('Sua conta está sendo excluída.', 'success')
    await navigateTo('/')
  } catch (e: any) {
    const status = getErrorStatus(e)
    if (status === 422) error.value = e?.data?.errors?.confirmation?.[0] ?? 'Confirmação inválida.'
    else if (status === 502) error.value = 'Não conseguimos cancelar sua assinatura. Tente de novo ou fale com o suporte.'
    else error.value = extractApiMessage(e)
  }
}
</script>
