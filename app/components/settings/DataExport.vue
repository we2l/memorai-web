<template>
  <div>
    <p v-if="sentTo" role="status" class="text-meta text-success bg-success-subtle rounded-control px-3 py-2">
      Pedido recebido. Enviaremos o link para {{ sentTo }} em alguns minutos. O link vale 7 dias.
    </p>
    <p v-else-if="limited" role="status" class="text-meta text-warning bg-warning-subtle rounded-control px-3 py-2">
      Você já pediu uma exportação nas últimas 24h.
    </p>
    <template v-else>
      <p class="text-meta text-fg-muted mb-3">
        Um arquivo .zip com seu perfil, cadernos e notas, cards, revisões, provas, simulados e assinatura.
      </p>
      <UiButton variant="secondary" type="button" :disabled="pending" @click="confirmOpen = true">
        {{ pending ? 'Enviando pedido...' : 'Exportar meus dados' }}
      </UiButton>
    </template>

    <UiConfirmModal
      v-model="confirmOpen"
      title="Exportar seus dados?"
      message="Vamos preparar o arquivo e enviar um link de download para o seu e-mail."
      confirm-label="Exportar"
      variant="primary"
      :loading="pending"
      @confirm="request"
    />
  </div>
</template>

<script setup lang="ts">
const { $api } = useNuxtApp()
const { run, pending } = useApiAction()
const confirmOpen = ref(false)
const sentTo = ref('')
const limited = ref(false)

async function request() {
  try {
    const res = await run(() => $api<{ data: { email: string } }>('/user/export', { method: 'POST' }), { error: false, rethrow: true })
    sentTo.value = res?.data.email ?? ''
  } catch (e) {
    if (getErrorStatus(e) === 429) limited.value = true
    else reportApiError(e)
  } finally {
    confirmOpen.value = false
  }
}
</script>
