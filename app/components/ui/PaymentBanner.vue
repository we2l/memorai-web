<template>
  <div v-if="subscription.isPastDue" class="bg-danger-subtle border-b border-danger/20 px-4 py-2.5 flex items-center justify-between gap-3" role="alert">
    <p class="text-label text-danger font-medium">A cobrança do cartão não passou. Troque o cartão para não perder o {{ proName }}.</p>
    <NuxtLink to="/configuracoes#plano" class="text-label font-semibold text-danger underline shrink-0">Trocar cartão</NuxtLink>
  </div>
  <!-- Prepaid expired (annual or 30-day Pix), still Pro during the grace days (RN-02) -->
  <div
    v-else-if="subscription.inGracePeriod && !subscription.info?.monthly_scheduled"
    class="bg-warning-subtle border-b border-warning/20 px-4 py-2.5 flex items-center justify-between gap-3"
    role="alert"
  >
    <p class="text-label text-warning font-medium">
      {{ pix30 ? 'Seus 30 dias venceram' : 'Seu anual venceu' }} em {{ formatBillingDayMonth(subscription.info?.plan_expires_at) }}.
      Renove até {{ formatBillingDayMonth(subscription.info?.grace_ends_at) }} para não perder o {{ proName }}.
    </p>
    <NuxtLink :to="pix30 ? PIX_RENEWAL_PATH : ANNUAL_RENEWAL_PATH" class="text-label font-semibold text-warning underline shrink-0">
      {{ pix30 ? 'Renovar com Pix' : 'Renovar' }}
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
const subscription = useSubscriptionStore()
const proName = useProName()
const pix30 = computed(() => subscription.info?.billing === 'monthly_pix')
</script>
