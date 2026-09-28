<template>
  <div class="min-h-screen bg-surface flex items-center justify-center">
    <div class="w-full max-w-md px-4">
      <slot />
    </div>

    <UiToast
      :message="toast.state.message"
      :type="toast.state.type"
      :visible="toast.state.visible"
    />
  </div>
</template>

<script setup lang="ts">
const toast = useToast()
</script>
