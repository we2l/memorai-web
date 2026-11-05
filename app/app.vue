<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <!-- LGPD analytics consent on every layout (prd-analytics-posthog RF-F02) -->
  <!-- The auth layout has it as a bar at the end of the page (prd-4g RF-F11); a focus screen never gets its answers covered, the choice waits -->
  <ClientOnly><LazyUiConsentBanner v-if="consent.analytics.value === null && route.meta.layout !== 'auth' && route.meta.chrome !== 'focus'" /></ClientOnly>
</template>

<script setup lang="ts">
const { init } = useColorMode()
// Banner chunk is only fetched while there is no decision
const consent = useConsent()
const route = useRoute()

onMounted(() => {
  init()
})
</script>
