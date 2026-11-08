<template>
  <div class="lp-sticky" :data-show="String(visible)" :aria-hidden="!visible" data-testid="landing-sticky-cta">
    <LandingCta to="/comecar" position="sticky" :tabindex="visible ? undefined : -1">Começar grátis</LandingCta>
  </div>
</template>

<script setup lang="ts">
// The call in the thumb zone (prd-landing-d RF-D12), phone only: the page shows it after the hero, while no call of
// a section is on screen and the consent banner is answered. Slides with transform only.
defineProps<{ visible: boolean }>()
</script>
