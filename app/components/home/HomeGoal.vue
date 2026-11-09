<template>
  <UiSection aria-label="Meta de hoje" data-testid="home-goal-card">
    <div class="flex items-center gap-4">
      <UiRing :value="ratio" :size="60" :stroke="6" :animate="draw">
        <Check class="size-5.5 text-action-fg" stroke-width="3" aria-hidden="true" />
      </UiRing>
      <div class="min-w-0">
        <p data-testid="home-goal"><UiNumber :value="goal.done_batches" :unit="`/ ${plural(goal.target_batches, 'lote', 'lotes')}`" size="s" /></p>
        <p class="mt-1 text-meta text-fg-muted">{{ goal.met ? 'Meta de hoje cumprida' : `Meta de hoje · cerca de ${minutes} min` }}</p>
      </div>
    </div>

    <UiWeekStrip v-if="week" class="mt-5" :days="week" />

    <!-- Goal of the day: once a day per device, ≤ 700 ms, still with reduced motion (ADR-027 §6); lazy: rare -->
    <LazyUiCelebration v-if="celebrate" kind="goal" title="Meta cumprida" :subtitle="goalText" :mascot="false" class="mt-4" />
  </UiSection>
</template>

<script setup lang="ts">
// The goal of the day, E2 (prd-visual-e2 RF-3.3): the ring with the check, "1 / 3 lotes" in the Fraunces, the minutes
// it asks and the week under it (studied, today, the weekly rest of the streak, missed). The ring draws once a day
// on this device (baigi-ring-drawn-{dia}); with reduced motion it shows ready (UiRing). The week comes from
// GET /stats/history?days=7 (study day of São Paulo); without it, the strip hides.
import { Check } from 'lucide-vue-next'
import type { Stats, StudyHistory } from '~/types'
import type { WeekDay } from '~/components/ui/WeekStrip.vue'

const props = defineProps<{ stats: Stats; history: StudyHistory | null }>()

const goal = computed(() => props.stats.goal!)
const ratio = computed(() => (goal.value.target_batches > 0 ? goal.value.done_batches / goal.value.target_batches : 0))
const goalText = computed(() => `${goal.value.done_batches} de ${plural(goal.value.target_batches, 'lote', 'lotes')}`)
const minutes = computed(() => roundMinutes(goal.value.minutes_left || (goal.value.target_batches - goal.value.done_batches) * goal.value.batch_size * SECONDS_PER_CARD / 60))

const draw = ref(false)
const celebrate = ref(false)
// In setup (the app is client-only): the first frame already draws, and the celebration renders with it
;(() => {
  const day = studyDay()
  try {
    if (!localStorage.getItem(`baigi-ring-drawn-${day}`)) {
      localStorage.setItem(`baigi-ring-drawn-${day}`, '1')
      draw.value = true
    }
  } catch {
    // intencional: modo privado sem storage; o anel aparece pronto
  }
  // Celebration of the goal: once per study day on this device (private mode = no party)
  if (!goal.value.met) return
  const key = `baigi-goal-celebrated-${day}`
  try {
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
  } catch {
    return
  }
  celebrate.value = true
  useAnalytics().track('home_goal_met', { target_batches: goal.value.target_batches })
})()

const SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const NAME = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

// The last 7 study days, today last
const week = computed<WeekDay[] | null>(() => {
  if (!props.history) return null
  const studied = new Set(props.history.days.filter(d => d.reviews > 0).map(d => d.date))
  const today = studyDay()
  const base = Date.parse(`${today}T12:00:00Z`)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(base - (6 - i) * 86_400_000)
    const iso = date.toISOString().slice(0, 10)
    const dow = date.getUTCDay()
    let state: WeekDay['state'] = 'missed'
    if (studied.has(iso)) state = 'done'
    else if (iso === today) state = 'today'
    else if (props.stats.streak_rest_on === iso) state = 'rest'
    return { short: SHORT[dow]!, name: NAME[dow]!, state }
  })
})
</script>
