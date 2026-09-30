<template>
  <div class="w-full max-w-sm sm:max-w-md mx-auto mt-6 text-left" data-testid="session-tomorrow">
    <!-- Fixed height: no layout shift when the data arrives -->
    <div v-if="loading || !forecast" class="card p-4 space-y-3 h-[5.5rem]" aria-hidden="true">
      <div class="skeleton h-4 w-3/4 rounded" />
      <div class="skeleton h-4 w-1/2 rounded" />
    </div>

    <template v-else>
      <div class="card p-4 space-y-3">
        <p class="text-body text-base-primary" data-testid="tomorrow-load">
          <template v-if="forecast.due_count > 0">
            Amanhã: <strong>{{ pluralCards(forecast.due_count) }}</strong> · ≈{{ forecast.estimated_minutes }} min
          </template>
          <template v-else>Amanhã: nada pendente. Aproveite para criar cards novos.</template>
        </p>

        <div v-if="forecast.streak.current >= 1" data-testid="tomorrow-streak">
          <p v-if="forecast.streak.current === 1" class="text-small text-base-secondary">
            <span aria-hidden="true">🔥 </span>1º dia. Volte amanhã para começar uma sequência.
          </p>
          <template v-else>
            <p class="text-small text-base-secondary">
              <span aria-hidden="true">🔥 </span><strong class="text-base-primary">{{ forecast.streak.current }} dias seguidos</strong>
            </p>
            <template v-if="milestone">
              <div
                class="h-2 mt-2 rounded-full bg-[var(--border-divider)] overflow-hidden"
                role="progressbar"
                :aria-valuenow="forecast.streak.current"
                aria-valuemin="0"
                :aria-valuemax="milestone"
                :aria-label="`Dias seguidos até a meta de ${milestone}`"
              >
                <div class="h-full rounded-full bg-[var(--color-accent-primary)]" :style="{ width: progressPct + '%' }" />
              </div>
              <p class="text-micro text-base-muted mt-1">Faltam {{ milestone - forecast.streak.current }} para {{ milestone }} dias</p>
            </template>
          </template>
        </div>
      </div>

      <div
        v-if="showCta"
        class="card p-4 mt-3 flex flex-col sm:flex-row sm:items-center gap-3"
        data-testid="tomorrow-reminder-cta"
      >
        <p class="text-small text-base-primary flex-1">Quer um lembrete amanhã às {{ formatReminderHour(forecast.reminder.hour) }}?</p>
        <button
          type="button"
          class="btn-secondary justify-center w-full sm:w-auto min-h-[2.75rem] shrink-0"
          :disabled="enabling"
          @click="$emit('enable-reminder')"
        >
          {{ enabling ? 'Ativando…' : 'Ativar lembrete' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { TomorrowForecast } from '~/types'

const props = defineProps<{ forecast: TomorrowForecast | null; loading: boolean; enabling?: boolean }>()
defineEmits<{ (e: 'enable-reminder'): void }>()

const milestone = computed(() => props.forecast?.streak.next_milestone ?? null)
const progressPct = computed(() => {
  const f = props.forecast
  if (!f || !milestone.value) return 0
  return Math.min(100, Math.round((f.streak.current / milestone.value) * 100))
})
const showCta = computed(() => !!props.forecast && !props.forecast.reminder.enabled && !props.forecast.reminder.suppressed)

function pluralCards(n: number) {
  return n === 1 ? '1 card' : `${n} cards`
}
</script>
