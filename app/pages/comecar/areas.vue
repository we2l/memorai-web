<template>
  <LazyOnboardingAreaPicker :logged-in="false" />
</template>

<script setup lang="ts">
// The 6 cards of an area for the visitor who wants more than the one card of the tour (prd-entrada-comecar RF-F3):
// the grid that /comecar showed before the entry. Prerendered, public (utils/routes isGuestOnboardingRoute); an
// account with the onboarding done goes to /hoje (middleware).
definePageMeta({ layout: 'auth', wide: true })
useHead({ title: 'Escolha a sua área · Baigi' })
</script>
