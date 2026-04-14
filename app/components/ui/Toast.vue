<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="visible"
        role="alert"
        class="fixed top-4 right-4 z-[100] max-w-sm px-4 py-3 rounded-xl text-small font-medium shadow-lg"
        :class="typeClasses"
      >
        {{ message }}
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  visible: boolean
}>()

const typeClasses = computed(() => {
  const map: Record<string, string> = {
    success: 'bg-success/15 text-success',
    error: 'bg-danger/15 text-danger',
    warning: 'bg-warning/15 text-warning',
    info: 'bg-info/15 text-info',
  }
  return map[props.type ?? 'success']
})
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 200ms ease-in-out;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
