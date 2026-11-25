<template>
  <ul v-if="!failed" class="w-full divide-y divide-hairline rounded-card bg-soft px-1 text-left" data-testid="onboarding-tomorrow-list">
    <li class="px-3 py-3 text-body text-fg-strong" data-testid="onboarding-tomorrow">
      <UiSkeleton v-if="loading || !forecast" variant="text" :lines="1" />
      <template v-else-if="forecast.due_count > 0">
        Amanhã: <strong>{{ forecast.due_count }} {{ forecast.due_count === 1 ? 'card' : 'cards' }}</strong> · ≈ {{ forecast.estimated_minutes }} min
        <!-- The mini-lote said when its own cards come back; the rest are new ones (B4 of the audit, 25/11) -->
        <span v-if="forecast.new_count > 0 && forecast.review_count > 0" class="block text-meta font-normal text-fg-muted" data-testid="onboarding-tomorrow-split">{{ forecast.review_count }} para revisar e {{ forecast.new_count }} {{ forecast.new_count === 1 ? 'novo' : 'novos' }}</span>
      </template>
      <template v-else>Amanhã: nada pendente. Aproveite para criar cards novos.</template>
    </li>
    <!-- The reminder only goes to a confirmed e-mail with cards to review (ReviewService): nothing to promise without
         cards tomorrow, and without the confirmation the line says what is missing (auditoria 25/11, B3) -->
    <li v-if="forecast?.reminder?.enabled && !forecast.reminder.suppressed && forecast.due_count > 0" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-3" data-testid="onboarding-reminder">
      <p class="text-meta text-fg" data-testid="onboarding-reminder-text">{{ verified ? 'Lembrete diário por e-mail às' : 'Confirme o seu e-mail para receber o lembrete às' }} <strong class="text-fg-strong">{{ formatReminderHour(hour ?? forecast.reminder.hour) }}</strong></p>
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
</template>

<script setup lang="ts">
// Tomorrow and the daily reminder already on (19h, the account's default) with "Mudar horário": the end of the
// first batch of the v3 (ReviewOnboardingEnd) and the saved lote of the v4 (/comecar/pronto, prd-onboarding-v4 RF-F5).
import type { TomorrowForecast } from '~/types'

defineProps<{ forecast: TomorrowForecast | null, loading?: boolean, failed?: boolean }>()

const { $api } = useNuxtApp()
const verified = computed(() => useAuthStore().isVerified)
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
