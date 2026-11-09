<template>
  <div
    class="pointer-events-auto flex items-center gap-3 rounded-control border border-line bg-float py-1 pl-4 pr-1 text-meta font-medium text-fg-strong shadow-float"
    @mouseenter="action && emit('pause')"
    @mouseleave="action && emit('resume')"
    @focusin="action && emit('pause')"
    @focusout="action && emit('resume')"
  >
    <component :is="TONES[tone].icon" class="size-4.5 shrink-0" :class="TONES[tone].color" aria-hidden="true" />
    <span class="min-w-0 flex-1 py-2">
      <span class="sr-only">{{ TONES[tone].label }}: </span>{{ message }}
    </span>
    <button
      v-if="action"
      type="button"
      class="min-h-touch shrink-0 rounded-row px-3 font-semibold text-action-fg -outline-offset-2 hover:bg-soft"
      @click="emit('action')"
    >
      {{ action.label }}
    </button>
    <UiIconButton :icon="X" label="Fechar aviso" size="sm" @click="emit('dismiss')" />
  </div>
</template>

<script setup lang="ts">
// Toast (raio-X §D, tasks 12.3, rewritten on the tokens): a floating surface with the state only in the
// icon (v4: no colored fill) and the tone named for screen readers. The host (ShellToastHost) owns the
// live regions, the queue and the timers; a toast with an action pauses while hovered or focused.
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-vue-next'

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

withDefaults(defineProps<{
  message: string
  tone?: ToastTone
  action?: { label: string }
}>(), { tone: 'success', action: undefined })

const emit = defineEmits<{
  (e: 'action' | 'dismiss' | 'pause' | 'resume'): void
}>()

const TONES = {
  success: { icon: CircleCheck, color: 'text-success', label: 'Sucesso' },
  error: { icon: CircleX, color: 'text-danger', label: 'Erro' },
  warning: { icon: TriangleAlert, color: 'text-warning', label: 'Atenção' },
  info: { icon: Info, color: 'text-info', label: 'Aviso' },
}
</script>
