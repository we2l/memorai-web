<template>
  <li class="flex items-start gap-4 py-3.5" :data-testid="`plan-step-${step.key}`">
    <UiPracticeIcon v-if="step.mode" :mode="step.mode" />
    <span v-else class="flex size-9 shrink-0 items-center justify-center rounded-control bg-subtle text-fg-muted" aria-hidden="true">
      <FileText class="size-4.5" stroke-width="2.2" />
    </span>

    <!-- Text and button share a wrapping line: the button drops below the text when it does not fit -->
    <div class="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div class="min-w-0">
        <p :id="titleId" class="font-semibold break-words text-fg-strong">{{ step.title }}</p>
        <p class="text-meta text-fg-muted">
          {{ step.detail }}<template v-if="step.overdue && !step.survival"> · <UiLink to="/praticar">Recuperar atraso</UiLink></template>
        </p>
        <LazyBacklogLine v-if="step.backlog && !step.survival" :backlog="step.backlog" origin="home" class="mt-1" />
        <p v-if="step.survival" class="flex flex-wrap items-center gap-1 text-meta text-fg-muted">
          Modo recuperação ligado ·
          <UiButton variant="ghost" size="sm" :loading="busy" @click="$emit('survival-off')">Desligar</UiButton>
        </p>
      </div>

      <UiButton
        :variant="step.primary ? 'primary' : 'secondary'"
        :to="step.action.to"
        :aria-describedby="titleId"
        @click="$emit('act', step)"
      >
        {{ step.action.label }}
      </UiButton>
    </div>
  </li>
</template>

<script setup lang="ts">
// One step of the plan of the day (prd-4a-hoje-v3 RF-F3): practice icon (the mode color lives only
// there), title, one support line and the button. On the phone the button drops below the text when it
// does not fit (natural wrap, no horizontal scroll). The button names its step through aria-describedby.
import { FileText } from 'lucide-vue-next'
import type { DayPlanStep } from '~/composables/useDayPlan'

defineProps<{ step: DayPlanStep; busy?: boolean }>()
defineEmits<{ (e: 'act', step: DayPlanStep): void; (e: 'survival-off'): void }>()

const titleId = useId()
</script>
