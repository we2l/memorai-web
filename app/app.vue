<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
const { init } = useColorMode()

onMounted(() => {
  init()
})
</script>
