<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const { init } = useColorMode()

onMounted(() => {
  init()
})
</script>
