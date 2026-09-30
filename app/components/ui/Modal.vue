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
            <span class="w-10 h-1.5 rounded-full bg-[var(--border-hover)]" />
          </div>
          <button
            v-if="!hideClose"
            data-modal-close="1"
            class="absolute top-3 right-3 w-11 h-11 inline-flex items-center justify-center text-base-muted hover:text-base-primary rounded-lg hover:bg-[var(--border-divider)] transition-colors"
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

<script lang="ts">
// Stack of open modals: Esc only closes the topmost one
const openStack: symbol[] = []
</script>

<script setup lang="ts">
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
const token = Symbol('modal')
const trap = useFocusTrap(panel)
const scroll = useScrollLock()

const sizeClass = computed(() => ({
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}[props.size]))

const panelClass = computed(() => {
  const overflow = props.noOverflow ? 'overflow-visible' : 'overflow-y-auto'
  if (props.variant === 'sheet') {
    return ['sheet-panel card w-full rounded-b-none rounded-t-2xl px-4 pt-2 max-h-[80dvh] relative', sizeClass.value, overflow]
  }
  return ['card w-full mx-4 p-6 max-h-[90vh] relative', sizeClass.value, overflow]
})

function close() {
  emit('update:modelValue', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !props.modelValue) return
  if (openStack[openStack.length - 1] !== token) return
  e.stopPropagation()
  close()
}

async function onOpen() {
  openStack.push(token)
  document.addEventListener('keydown', onKeydown)
  scroll.lock()
  await nextTick()
  // Label by the first heading in the slot when no explicit aria-label is given
  const heading = panel.value?.querySelector<HTMLElement>('h1, h2, h3')
  if (heading) {
    if (!heading.id) heading.id = `modal-title-${Math.random().toString(36).slice(2, 9)}`
    labelledBy.value = heading.id
  }
  await trap.activate()
}

function onClose() {
  const idx = openStack.indexOf(token)
  if (idx !== -1) openStack.splice(idx, 1)
  document.removeEventListener('keydown', onKeydown)
  scroll.unlock()
}

watch(() => props.modelValue, (val) => {
  if (val) onOpen()
  else {
    onClose()
    trap.deactivate()
  }
})

onMounted(() => {
  if (props.modelValue) onOpen()
})

onUnmounted(() => {
  onClose()
  trap.deactivate()
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
