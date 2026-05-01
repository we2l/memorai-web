<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="close"
      >
        <div
          class="card w-full mx-4 p-6 max-h-[90vh] overflow-y-auto relative"
          :class="sizeClass"
          :role="role"
          :aria-label="ariaLabel"
        >
          <button
            class="absolute top-4 right-4 p-1.5 text-base-muted hover:text-base-primary rounded-lg hover:bg-surface-tertiary transition-colors"
            aria-label="Fechar"
            @click="close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
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
  xl: 'max-w-4xl',
}[props.size]))

function close() {
  emit('update:modelValue', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) close()
}

watch(() => props.modelValue, (val) => {
  if (val) {
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
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
