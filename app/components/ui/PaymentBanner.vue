<template>
  <div v-if="subscription.isPastDue" class="bg-[var(--badge-danger-bg)] border-b border-[var(--badge-danger-text)]/20 px-4 py-2.5 flex items-center justify-between gap-3" role="alert">
    <p class="text-micro text-[var(--badge-danger-text)] font-medium">Seu pagamento falhou. Atualize seu método de pagamento.</p>
    <button class="text-micro font-semibold text-[var(--badge-danger-text)] hover:text-[var(--badge-danger-text)] underline shrink-0" @click="subscription.openPortal()">
      Resolver
    </button>
  </div>
  <!-- Annual expired, still Pro during the grace days (RN-02) -->
  <div
    v-else-if="subscription.inGracePeriod && !subscription.info?.monthly_scheduled"
    class="bg-[var(--badge-warning-bg)] border-b border-[var(--badge-warning-text)]/20 px-4 py-2.5 flex items-center justify-between gap-3"
    role="alert"
  >
    <p class="text-micro text-[var(--badge-warning-text)] font-medium">
      Seu anual venceu em {{ formatBillingDayMonth(subscription.info?.plan_expires_at) }}.
      Renove até {{ formatBillingDayMonth(subscription.info?.grace_ends_at) }} para não perder o Pro.
    </p>
    <NuxtLink :to="ANNUAL_RENEWAL_PATH" class="text-micro font-semibold text-[var(--badge-warning-text)] underline shrink-0">
      Renovar
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
const subscription = useSubscriptionStore()
</script>
