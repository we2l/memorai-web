<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="close"
        @keydown.escape="close"
      >
        <div
          class="card w-full mx-4 p-6"
          :class="sizeClass"
          :role="role"
          :aria-label="ariaLabel"
        >
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  size?: 'sm' | 'md' | 'lg'
  role?: string
  ariaLabel?: string
}>(), {
  size: 'md',
  role: 'dialog',
  ariaLabel: undefined,
})

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const sizeClass = computed(() => ({
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}[props.size]))

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 150ms ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
