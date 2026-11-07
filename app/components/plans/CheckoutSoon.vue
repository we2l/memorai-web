<template>
  <!-- In place of the paying button while the checkout is closed: a notice, never a disabled button -->
  <p class="flex min-h-touch items-center justify-center rounded-control border border-line-strong text-meta font-semibold text-fg-muted" data-testid="plan-checkout-soon">{{ CHECKOUT_SOON }}</p>
</template>

<script setup lang="ts">
import { CHECKOUT_SOON } from '~/utils/checkout'
</script>
