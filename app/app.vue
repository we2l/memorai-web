<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <!-- LGPD analytics consent on every layout (prd-analytics-posthog RF-F02) -->
  <ClientOnly><LazyUiConsentBanner v-if="consent.analytics.value === null" /></ClientOnly>
</template>

<script setup lang="ts">
const { init } = useColorMode()
// Banner chunk is only fetched while there is no decision
const consent = useConsent()

onMounted(() => {
  init()
})
</script>
