<template>
  <div v-if="subscription.isPastDue" class="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 flex items-center justify-between gap-3" role="alert">
    <p class="text-micro text-red-600 font-medium">Seu pagamento falhou. Atualize seu método de pagamento.</p>
    <button class="text-micro font-semibold text-red-600 hover:text-red-700 underline shrink-0" @click="subscription.openPortal()">
      Resolver
    </button>
  </div>
</template>

<script setup lang="ts">
const subscription = useSubscriptionStore()
</script>
