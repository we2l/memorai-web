<template>
  <div class="w-full text-left" data-testid="session-tomorrow">
    <!-- Fixed height: no layout shift when the data arrives -->
    <div v-if="loading || !forecast" class="h-22 space-y-3 rounded-card bg-subtle p-4" aria-hidden="true">
      <UiSkeleton :lines="2" />
    </div>

    <ul v-else class="divide-y divide-line rounded-card bg-subtle px-1">
      <li class="px-3 py-3 text-body text-fg-strong" data-testid="tomorrow-load">
        <template v-if="forecast.due_count > 0">
          Amanhã: <strong>{{ pluralCards(forecast.due_count) }}</strong> · ≈{{ forecast.estimated_minutes }} min
        </template>
        <template v-else>Amanhã: nada pendente. Aproveite para criar cards novos.</template>
      </li>

      <li v-if="forecast.streak.current >= 1" class="px-3 py-3" data-testid="tomorrow-streak">
        <p v-if="forecast.streak.current === 1" class="text-meta text-fg">
          1º dia. Volte amanhã para começar uma sequência.
        </p>
        <template v-else>
          <p class="flex items-center gap-1.5 text-meta text-fg">
            <Flame class="size-4 fill-current text-streak" aria-hidden="true" /><strong class="text-streak-fg">{{ forecast.streak.current }} dias seguidos</strong>
          </p>
          <template v-if="milestone">
            <UiProgressBar class="mt-2" :value="forecast.streak.current" :max="milestone" tone="action" size="md" :label="`Dias seguidos até a meta de ${milestone}`" :value-text="`${forecast.streak.current} de ${milestone}`" />
            <p class="mt-1 text-label text-fg-muted">Faltam {{ milestone - forecast.streak.current }} para {{ milestone }} dias</p>
          </template>
        </template>
      </li>

      <li v-if="showCta" class="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center" data-testid="tomorrow-reminder-cta">
        <p class="flex-1 text-meta text-fg-strong">Quer um lembrete amanhã às {{ formatReminderHour(forecast.reminder.hour) }}?</p>
        <UiButton size="sm" :loading="enabling" @click="$emit('enable-reminder')">
          {{ enabling ? 'Ativando…' : 'Ativar lembrete' }}
        </UiButton>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
// "Amanhã: N cards · ≈ M min", the streak and the reminder offer at the end of the session (prd-4d-revisao-v3
// RF-F6; prd-retencao-lembretes RF-F04), as rows of the session end.
import { Flame } from 'lucide-vue-next'
import type { TomorrowForecast } from '~/types'

const props = defineProps<{ forecast: TomorrowForecast | null; loading: boolean; enabling?: boolean }>()
defineEmits<{ (e: 'enable-reminder'): void }>()

const milestone = computed(() => props.forecast?.streak.next_milestone ?? null)
const showCta = computed(() => !!props.forecast && !props.forecast.reminder.enabled && !props.forecast.reminder.suppressed)

function pluralCards(n: number) {
  return n === 1 ? '1 card' : `${n} cards`
}
</script>
