<template>
  <div v-if="subscription.isPastDue" class="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 flex items-center justify-between gap-3" role="alert">
    <p class="text-micro text-red-600 font-medium">Seu pagamento falhou. Atualize seu método de pagamento.</p>
    <button class="text-micro font-semibold text-red-600 hover:text-red-700 underline shrink-0" @click="subscription.openPortal()">
      Resolver
    </button>
  </div>
  <!-- Annual expired, still Pro during the grace days (RN-02) -->
  <div
    v-else-if="subscription.inGracePeriod && !subscription.info?.monthly_scheduled"
    class="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between gap-3"
    role="alert"
  >
    <p class="text-micro text-amber-700 dark:text-amber-400 font-medium">
      Seu anual venceu em {{ formatBillingDayMonth(subscription.info?.plan_expires_at) }}.
      Renove até {{ formatBillingDayMonth(subscription.info?.grace_ends_at) }} para não perder o Pro.
    </p>
    <NuxtLink :to="ANNUAL_RENEWAL_PATH" class="text-micro font-semibold text-amber-700 dark:text-amber-400 underline shrink-0">
      Renovar
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
const subscription = useSubscriptionStore()
</script>
