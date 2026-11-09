<template>
  <ol class="grid grid-cols-7 gap-1 text-center" aria-label="Sua semana" data-testid="ui-week-strip">
    <li v-for="(d, i) in days" :key="i" :data-state="d.state" :aria-label="`${d.name}: ${STATE_LABEL[d.state]}`">
      <span class="mx-auto mb-1.25 grid size-7.5 place-items-center rounded-full" :class="DOT[d.state]" aria-hidden="true">
        <Check v-if="d.state === 'done'" class="size-3.75" stroke-width="3" />
        <Moon v-else-if="d.state === 'rest'" class="size-3.5" stroke-width="2.4" />
      </span>
      <span class="text-label" :class="d.state === 'today' ? 'font-bold text-fg-strong' : 'text-fg-muted'" aria-hidden="true">{{ d.short }}</span>
    </li>
  </ol>
</template>

<script setup lang="ts">
// Week strip (prd-visual-e2 RF-1.3): the 7 days of the streak under the goal. done = studied (check on lilac),
// today = ring, rest = the weekly rest of the streak (prd-revisao-v5-fase-b), missed = soft and empty.
// Each day reads as "Segunda: feito" for a screen reader; the letters are only visual.
import { Check, Moon } from 'lucide-vue-next'

export type WeekDayState = 'done' | 'today' | 'rest' | 'missed' | 'future'
export interface WeekDay { short: string; name: string; state: WeekDayState }

defineProps<{ days: WeekDay[] }>()

const DOT: Record<WeekDayState, string> = {
  done: 'bg-action-subtle text-action-fg',
  today: 'ring-2 ring-inset ring-action',
  rest: 'bg-soft text-fg-muted',
  missed: 'bg-soft',
  future: 'bg-soft',
}
const STATE_LABEL: Record<WeekDayState, string> = {
  done: 'estudou',
  today: 'hoje',
  rest: 'folga da sequência',
  missed: 'sem estudo',
  future: 'ainda não chegou',
}
</script>
