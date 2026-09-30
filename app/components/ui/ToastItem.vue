<template>
  <div
    class="pointer-events-auto flex items-center gap-2 pl-4 pr-1 py-1 rounded-xl text-small font-medium shadow-lg border"
    :class="typeClasses"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @focusin="onEnter"
    @focusout="onLeave"
  >
    <span class="flex-1 py-2">{{ item.message }}</span>
    <button
      v-if="item.action"
      type="button"
      class="min-h-[44px] px-3 rounded-lg font-semibold underline underline-offset-2 hover:opacity-80 focus-visible:outline focus-visible:outline-2"
      @click="toast.runAction(item.id)"
    >
      {{ item.action.label }}
    </button>
    <button
      type="button"
      aria-label="Fechar aviso"
      class="shrink-0 w-11 h-11 inline-flex items-center justify-center rounded-lg hover:opacity-80 focus-visible:outline focus-visible:outline-2"
      @click="toast.dismiss(item.id)"
    >
      <X class="w-4 h-4" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
import type { ToastItem } from '~/composables/useToast'

const props = defineProps<{ item: ToastItem }>()
const toast = useToast()

// Toasts with an action must not vanish while the user is reaching for them
function onEnter() {
  if (props.item.action) toast.pause(props.item.id)
}
function onLeave() {
  if (props.item.action) toast.resume(props.item.id)
}

const typeClasses = computed(() => {
  const map: Record<string, string> = {
    success: 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] border-[var(--badge-success-text)]/20',
    error: 'bg-[var(--badge-danger-bg)] text-[var(--badge-danger-text)] border-[var(--badge-danger-text)]/20',
    warning: 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border-[var(--badge-warning-text)]/20',
    info: 'bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] border-[var(--badge-info-text)]/20',
  }
  return map[props.item.type] ?? map.success
})
</script>
