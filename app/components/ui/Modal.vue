<template>
  <Teleport to="body">
    <Transition :name="variant === 'sheet' ? 'sheet' : 'modal'">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex bg-overlay"
        :class="variant === 'sheet' ? 'items-end justify-center' : 'items-center justify-center'"
        @click.self="close"
      >
        <div
          ref="panel"
          :class="panelClass"
          :role="role"
          aria-modal="true"
          :aria-labelledby="ariaLabel ? undefined : labelledBy"
          :aria-label="ariaLabel"
        >
          <div v-if="variant === 'sheet'" class="flex justify-center pt-1 pb-3" aria-hidden="true">
            <span class="w-10 h-1.5 rounded-full bg-line-strong" />
          </div>
          <button
            v-if="!hideClose"
            data-modal-close="1"
            class="absolute top-3 right-3 w-11 h-11 inline-flex items-center justify-center text-fg-muted hover:text-fg-strong rounded-control hover:bg-line transition-colors"
            aria-label="Fechar"
            @click="close"
          >
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
// Legacy modal (24 uses): migrates to UiDialog/UiSheet screen by screen in Phase 4. The layer behaviour
// (Esc stack, scroll lock, focus trap) lives in useModalLayer, shared with UiDialog/UiSheet.
const props = withDefaults(defineProps<{
  modelValue: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  role?: string
  ariaLabel?: string
  noOverflow?: boolean
  variant?: 'center' | 'sheet'
  hideClose?: boolean
}>(), {
  size: 'md',
  role: 'dialog',
  ariaLabel: undefined,
  noOverflow: false,
  variant: 'center',
  hideClose: false,
})

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const panel = ref<HTMLElement | null>(null)
const labelledBy = ref<string | undefined>(undefined)

const sizeClass = computed(() => ({
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}[props.size]))

const panelClass = computed(() => {
  const overflow = props.noOverflow ? 'overflow-visible' : 'overflow-y-auto'
  if (props.variant === 'sheet') {
    return ['sheet-panel w-full bg-float shadow-float rounded-t-float px-4 pt-2 max-h-[80dvh] relative', sizeClass.value, overflow]
  }
  return ['w-full mx-4 p-6 bg-float shadow-float rounded-float max-h-[90vh] relative', sizeClass.value, overflow]
})

function close() {
  emit('update:modelValue', false)
}

useModalLayer({
  open: () => props.modelValue,
  panel,
  onEscape: close,
  // Label by the first heading in the slot when no explicit aria-label is given
  onOpened() {
    const heading = panel.value?.querySelector<HTMLElement>('h1, h2, h3')
    if (heading) {
      if (!heading.id) heading.id = `modal-title-${Math.random().toString(36).slice(2, 9)}`
      labelledBy.value = heading.id
    }
  },
})
</script>

<style scoped>
.sheet-panel {
  padding-bottom: calc(1rem + env(safe-area-inset-bottom));
}
.modal-enter-active,
.modal-leave-active {
  transition: opacity 150ms ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 200ms ease;
}
.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform 200ms ease;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}
</style>
