<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <!-- LGPD analytics consent on every layout (prd-analytics-posthog RF-F02) -->
  <!-- The auth layouts (auth, auth-split) have it as a bar at the end of the page or of the form (prd-4g RF-F11); a focus screen never gets its answers covered, the choice waits.
       The landing, the blog and the tools get the thin bar (prd-blog-v2 RF-L1): the title and the answer stay visible -->
  <ClientOnly><LazyUiConsentBanner v-if="consent.analytics.value === null && !['auth', 'auth-split'].includes(String(route.meta.layout)) && route.meta.chrome !== 'focus'" :bar="thinBar" /></ClientOnly>
</template>

<script setup lang="ts">
const { init } = useColorMode()
// Banner chunk is only fetched while there is no decision
const consent = useConsent()
const route = useRoute()
const thinBar = computed(() => route.meta.layout === 'landing' || isReadingRoute(route.path))

onMounted(() => {
  init()
})
</script>
