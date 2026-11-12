<template>
  <li :data-testid="`plan-step-${step.key}`">
    <!-- A row with a control inside (the primary, the backlog line, "Desligar"): text and button wrap on one line -->
    <div v-if="!asRow" class="flex items-start gap-3.5 px-2 py-3.5">
      <UiIconTile :icon="icon" :tone="tone" />
      <div class="flex min-w-0 flex-1 items-center justify-between gap-x-3 gap-y-2" :class="step.primary ? '' : 'flex-wrap'">
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
          :size="step.primary ? undefined : 'sm'"
          :to="step.action.to"
          :aria-describedby="titleId"
          @click="$emit('act', step)"
        >
          {{ step.action.label }}
        </UiButton>
      </div>
    </div>

    <!-- The other steps: the whole row is the link (or the button of the episode) -->
    <component
      :is="step.action.to ? NuxtLink : 'button'"
      v-else
      v-bind="step.action.to ? { to: step.action.to } : { type: 'button' }"
      class="flex w-full items-center gap-3.5 rounded-row px-2 py-3.5 text-left transition-colors duration-fast hover:bg-hover"
      @click="$emit('act', step)"
    >
      <UiIconTile :icon="icon" :tone="tone" />
      <span class="min-w-0 flex-1">
        <span class="block font-semibold break-words text-fg-strong">{{ step.title }}</span>
        <span class="block text-meta text-fg-muted">{{ step.detail }}</span>
      </span>
      <ChevronRight class="size-4.5 shrink-0 text-fg-muted" aria-hidden="true" />
    </component>
  </li>
</template>

<script setup lang="ts">
// One step of the plan of the day, E2 (prd-visual-e2 RF-3.4, ADR-035 §1): the icon of the mode on its tinted tile
// (Revisar purple, Questões amber, Ouvir petrol, Continuar neutral), the title and one support line. The first step
// carries the primary; the others are whole-row links with a chevron (named by their title and line). A step with a
// control of its own (the backlog line, "Desligar") keeps a small button instead (no control inside a link).
import { ChevronRight, CircleHelp, FileText, Headphones, Layers } from 'lucide-vue-next'
import type { DayPlanStep } from '~/composables/useDayPlan'
import type { IconTileTone } from '~/components/ui/IconTile.vue'

const props = defineProps<{ step: DayPlanStep; busy?: boolean }>()
defineEmits<{ (e: 'act', step: DayPlanStep): void; (e: 'survival-off'): void }>()

const NuxtLink = resolveComponent('NuxtLink')
const titleId = useId()

const MODES = {
  review: { icon: Layers, tone: 'action' },
  quiz: { icon: CircleHelp, tone: 'quiz' },
  listen: { icon: Headphones, tone: 'listen' },
} as const
const icon = computed(() => (props.step.mode ? MODES[props.step.mode].icon : FileText))
const tone = computed<IconTileTone>(() => (props.step.mode ? MODES[props.step.mode].tone : 'neutral'))
const asRow = computed(() => !props.step.primary && !props.step.backlog && !props.step.survival && !props.step.overdue)
</script>
