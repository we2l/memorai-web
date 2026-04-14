<template>
  <div class="min-h-screen bg-surface">
    <UiSidebar />
    <UiBottomNav />

    <main class="lg:ml-[220px] pb-20 lg:pb-0">
      <slot />
    </main>

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
