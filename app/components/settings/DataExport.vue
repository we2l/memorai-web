<template>
  <div>
    <p v-if="sentTo" role="status" class="text-small text-[var(--badge-success-text)] bg-[var(--badge-success-bg)] rounded-lg px-3 py-2">
      Pedido recebido. Enviaremos o link para {{ sentTo }} em alguns minutos. O link vale 7 dias.
    </p>
    <p v-else-if="limited" role="status" class="text-small text-[var(--badge-warning-text)] bg-[var(--badge-warning-bg)] rounded-lg px-3 py-2">
      Você já pediu uma exportação nas últimas 24h.
    </p>
    <template v-else>
      <p class="text-small text-base-muted mb-3">
        Um arquivo .zip com seu perfil, cadernos e notas, cards, revisões, provas, simulados e assinatura.
      </p>
      <button type="button" class="btn-secondary" :disabled="pending" @click="confirmOpen = true">
        {{ pending ? 'Enviando pedido...' : 'Exportar meus dados' }}
      </button>
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
