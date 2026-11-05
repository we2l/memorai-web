<template>
  <div class="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-gutter py-10 text-center" data-testid="onboarding-end">
    <UiCelebration kind="milestone" title="Primeiro lote concluído!" subtitle="Seu primeiro marco no Baigi" :level="1" />
    <p class="-mt-2 max-w-md text-body text-fg" data-testid="onboarding-remembered">Você lembrou {{ summary.remembered }} de {{ summary.size }}.</p>

    <ul class="w-full divide-y divide-line rounded-card bg-subtle px-1 text-left">
      <li class="px-3 py-3 text-body text-fg-strong" data-testid="onboarding-tomorrow">
        <UiSkeleton v-if="loading || !forecast" variant="text" :lines="1" />
        <template v-else-if="forecast.due_count > 0">
          Amanhã: <strong>{{ forecast.due_count }} {{ forecast.due_count === 1 ? 'card' : 'cards' }}</strong> · ≈ {{ forecast.estimated_minutes }} min
        </template>
        <template v-else>Amanhã: nada pendente. Aproveite para criar cards novos.</template>
      </li>
      <li v-if="forecast?.reminder.enabled && !forecast.reminder.suppressed" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-3" data-testid="onboarding-reminder">
        <p class="text-meta text-fg">Lembrete diário às <strong class="text-fg-strong">{{ formatReminderHour(hour ?? forecast.reminder.hour) }}</strong></p>
        <UiSelect
          v-if="changing"
          id="onboarding-reminder-hour"
          class="w-32"
          label="Horário do lembrete"
          hide-label
          :model-value="String(hour ?? forecast.reminder.hour)"
          :options="REMINDER_HOUR_OPTIONS"
          :disabled="pending"
          @update:model-value="setHour"
        />
        <UiButton v-else size="sm" variant="ghost" data-testid="onboarding-reminder-change" @click="changing = true">Mudar horário</UiButton>
      </li>
    </ul>

    <UiButton variant="primary" to="/hoje" class="w-full max-w-xs" data-testid="onboarding-home">Ir para o Hoje</UiButton>
  </div>
</template>

<script setup lang="ts">
// End of the first batch of the onboarding (prd-4g-conta-onboarding-v3 RF-F8): the celebration, "Você lembrou",
// tomorrow, and the daily reminder already on (19h, the account's default) with "Mudar horário". Its own lazy
// component: every other session never downloads it.
import type { TomorrowForecast } from '~/types'
import type { BatchSummary } from '~/composables/useReviewBatches'

defineProps<{ summary: BatchSummary; forecast: TomorrowForecast | null; loading?: boolean }>()

const { $api } = useNuxtApp()
const { run, pending } = useApiAction()

const changing = ref(false)
const hour = ref<number | null>(null)

async function setHour(value: string) {
  const next = Number(value)
  const ok = await run(() => $api('/settings', { method: 'PUT', body: { reminder_hour: next } }), {
    success: `Lembrete às ${formatReminderHour(next)}.`,
    error: 'Não foi possível salvar o lembrete.',
  })
  if (ok === undefined) return
  hour.value = next
  changing.value = false
  useAnalytics().track('reminder_toggled', { on: true, hour: next, source: 'onboarding' })
}
</script>
