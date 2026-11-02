<template>
  <div v-if="subscription.isPastDue" class="bg-danger-subtle border-b border-danger/20 px-4 py-2.5 flex items-center justify-between gap-3" role="alert">
    <p class="text-label text-danger font-medium">Seu pagamento falhou. Atualize seu método de pagamento.</p>
    <button class="text-label font-semibold text-danger hover:text-danger underline shrink-0" @click="subscription.openPortal()">
      Resolver
    </button>
  </div>
  <!-- Annual expired, still Pro during the grace days (RN-02) -->
  <div
    v-else-if="subscription.inGracePeriod && !subscription.info?.monthly_scheduled"
    class="bg-warning-subtle border-b border-warning/20 px-4 py-2.5 flex items-center justify-between gap-3"
    role="alert"
  >
    <p class="text-label text-warning font-medium">
      Seu anual venceu em {{ formatBillingDayMonth(subscription.info?.plan_expires_at) }}.
      Renove até {{ formatBillingDayMonth(subscription.info?.grace_ends_at) }} para não perder o Pro.
    </p>
    <NuxtLink :to="ANNUAL_RENEWAL_PATH" class="text-label font-semibold text-warning underline shrink-0">
      Renovar
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
const subscription = useSubscriptionStore()
</script>
