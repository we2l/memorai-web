<template>
  <div />
</template>

<script setup lang="ts">
// The app shell (prd-revisao-offline RF-F1): prerendered empty, precached, and served by the service worker in place of
// /hoje and /revisar when there is no network; the router then renders the real route. Opened at its own URL, it has
// nothing to show: off to /hoje.
definePageMeta({ layout: false })
onMounted(() => { void navigateTo('/hoje', { replace: true }) })
</script>
