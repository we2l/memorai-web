<template>
  <header class="sticky top-0 z-nav border-b border-line bg-raised" data-testid="quiz-topbar">
    <div class="mx-auto flex max-w-prose items-center gap-3 px-gutter py-2">
      <UiButton size="sm" variant="ghost" :icon-left="ChevronLeft" class="-ml-3" @click="emit('exit')">Sair</UiButton>
      <p class="min-w-0 flex-1 text-center text-meta font-semibold text-fg-strong" aria-live="polite">
        <template v-if="total">Questão {{ current }} de {{ total }}</template>
      </p>
      <p
        v-if="timeRemaining !== null"
        class="flex min-w-16 items-center justify-end gap-1.5 text-meta font-semibold tabular-nums"
        :class="warning ? 'text-danger' : 'text-fg-strong'"
        data-testid="quiz-timer"
      >
        <Clock class="size-4" aria-hidden="true" />
        <span class="sr-only">Tempo restante:</span>
        {{ formatTime(timeRemaining) }}
        <span v-if="warning" class="sr-only">(menos de um minuto)</span>
      </p>
      <span v-else class="min-w-16" aria-hidden="true" />
    </div>
    <UiProgressBar :value="answered" :max="Math.max(total, 1)" label="Questões respondidas" :value-text="`${answered} de ${total} respondidas`" class="mx-auto max-w-prose px-gutter pb-2" />
  </header>
</template>

<script setup lang="ts">
// Top of the answer screen (prd-4e-praticar-v3 RF-F3): "‹ Sair" (pauses and goes back to the scope),
// "Questão 7 de 20", the countdown in the Prova mode (danger text under a minute, with words) and the bar of
// answered questions.
import { ChevronLeft, Clock } from 'lucide-vue-next'

const props = defineProps<{
  current: number
  total: number
  answered: number
  /** Seconds left; null without a timer */
  timeRemaining: number | null
}>()
const emit = defineEmits<{ exit: [] }>()

const warning = computed(() => props.timeRemaining !== null && props.timeRemaining < 60)
</script>
