<template>
  <UiDialog v-model="open" size="md" role="alertdialog" title="Excluir sua conta?">
    <!-- Step 1: consequences -->
    <div v-if="step === 1">
      <div ref="consequences" tabindex="-1" class="outline-none" autofocus>
        <p class="text-meta text-fg mb-2">Isso apaga para sempre:</p>
        <ul class="list-disc pl-5 text-meta text-fg space-y-1 mb-3">
          <li>seus cadernos, notas, cards e histórico de revisões;</li>
          <li>PDFs, podcasts, imagens e áudios enviados;</li>
          <li>provas, simulados e conversas do Tira-dúvidas.</li>
        </ul>
        <p v-if="isMonthly" class="text-meta text-fg-strong mb-2">Sua assinatura será cancelada agora, sem reembolso proporcional.</p>
        <p v-else-if="isAnnual" class="text-meta text-fg-strong mb-2">
          Seu plano anual deixa de valer agora. Para pedir reembolso, fale com o suporte em
          <a href="mailto:contato@baigi.com.br" class="underline">contato@baigi.com.br</a> antes de excluir.
        </p>
        <p class="text-label text-fg-muted mb-4">Quer levar seus dados? Use "Exportar meus dados" antes.</p>
      </div>
      <UiCheckbox v-model="understood" label="Entendo que isso é permanente" class="mb-3" />
      <div class="flex justify-end gap-3">
        <UiButton variant="secondary" type="button" @click="open = false">Cancelar</UiButton>
        <UiButton variant="danger" type="button" :disabled="!understood" @click="step = 2">Continuar</UiButton>
      </div>
    </div>

    <!-- Step 2: confirmation -->
    <form v-else novalidate @submit.prevent="submit">
      <UiInput
        id="delete-confirmation"
        v-model="confirmation"
        :label="hasPassword ? 'Digite sua senha atual' : `Digite seu e-mail (${auth.user?.email})`"
        :type="hasPassword ? 'password' : 'email'"
        :autocomplete="hasPassword ? 'current-password' : 'email'"
        autofocus
        :error="error || undefined"
      />
      <div class="flex gap-3 justify-end mt-5">
        <UiButton variant="secondary" type="button" @click="step = 1">Voltar</UiButton>
        <UiButton variant="danger" type="submit" :loading="pending" :disabled="!confirmation">
          {{ pending ? 'Excluindo…' : 'Excluir minha conta' }}
        </UiButton>
      </div>
    </form>
  </UiDialog>
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
    // The API already ended every session: clear the local state and reload (utils/accountState.ts)
    clearAccountStorage()
    auth.clearAuth()
    flashToast('Sua conta está sendo excluída.', 'success')
    reloadTo('/', { replace: true })
  } catch (e: any) {
    const status = getErrorStatus(e)
    if (status === 422) error.value = e?.data?.errors?.confirmation?.[0] ?? 'Confirmação inválida.'
    else if (status === 502) error.value = 'Não conseguimos cancelar sua assinatura. Tente de novo ou fale com o suporte.'
    else error.value = extractApiMessage(e)
  }
}
</script>
