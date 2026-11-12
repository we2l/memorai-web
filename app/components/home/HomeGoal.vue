<template>
  <!-- Loading: the footprint of the block (ring and text), so nothing jumps when the numbers arrive (RF-2.7) -->
  <UiSection v-if="loading || !stats" :variant="primary ? 'primary' : 'raised'" aria-busy="true" data-testid="home-goal-card">
    <div class="flex items-center gap-4 sm:gap-6">
      <div class="goal-ring-skeleton shrink-0 animate-pulse rounded-full bg-soft" aria-hidden="true" />
      <UiSkeleton class="flex-1" :lines="3" />
    </div>
  </UiSection>

  <UiSection v-else :variant="primary ? 'primary' : 'raised'" aria-labelledby="home-goal-title" data-testid="home-goal-card">
    <div class="goal-grid" :class="{ 'goal-grid--solo': !cta }">
      <div class="goal-ring">
        <UiRing :value="ratio" :size="ringSize" :stroke="ringSize > 110 ? 10 : 9" :animate="draw">
          <span class="flex flex-col items-center" data-testid="home-goal">
            <UiNumber :value="`${goal.done_batches}/${goal.target_batches}`" size="m" aria-hidden="true" />
            <span class="mt-1 text-label text-fg-muted" aria-hidden="true">{{ goal.target_batches === 1 ? 'lote' : 'lotes' }}</span>
            <span class="sr-only">{{ goalText }} feitos</span>
          </span>
        </UiRing>
      </div>

      <div class="goal-head min-w-0">
        <p class="goal-overline text-label font-semibold text-fg-muted">Meta de hoje</p>
        <h2 id="home-goal-title" class="goal-title mt-1.5 text-page-title text-fg-strong">{{ title }}</h2>
      </div>

      <div v-if="cta" class="goal-body min-w-0">
        <p v-if="contentLine" class="text-body text-fg-muted" data-testid="home-goal-subjects">{{ contentLine }}</p>

        <!-- What the Revisar step of the plan carried: the backlog line, survival mode and the old overdue link -->
        <template v-if="review">
          <LazyBacklogLine v-if="review.backlog && !review.survival" :backlog="review.backlog" origin="home" class="mt-1" />
          <p v-if="review.overdue && !review.survival" class="mt-1 text-meta text-fg-muted">
            {{ review.overdue }} atrasados · <UiLink to="/praticar">Recuperar atraso</UiLink>
          </p>
          <p v-if="review.survival" class="mt-1 flex flex-wrap items-center gap-1 text-meta text-fg-muted">
            Modo recuperação ligado ·
            <UiButton variant="ghost" size="sm" :loading="survivalBusy" @click="$emit('survival-off')">Desligar</UiButton>
          </p>
        </template>

        <UiButton
          v-if="cta"
          variant="primary"
          size="lg"
          to="/revisar"
          class="mt-4 max-sm:w-full"
          data-testid="home-goal-start"
          @click="$emit('start')"
        >
          {{ cta }}
        </UiButton>
      </div>
    </div>

    <div v-if="week" class="mt-6 border-t border-hairline pt-5">
      <UiWeekStrip :days="week" />
    </div>

    <!-- Goal of the day: once a day per device, ≤ 700 ms, still with reduced motion (ADR-027 §6); lazy: rare -->
    <LazyUiCelebration v-if="celebrate" kind="goal" title="Meta cumprida" :subtitle="goalText" :mascot="false" class="mt-4" />
  </UiSection>
</template>

<script setup lang="ts">
// The goal of the day, A2 (prd-visual-a2 RF-2.2): the one primary block of Hoje. The ring of 128 px (104 on the
// phone) with "0/1 lote", the overline "Meta de hoje", the title "Falta 1 lote, cerca de 5 min" (balanced, the
// number never apart from its unit), the subjects of the day and the one primary "Começar · N cards", where N is
// /stats.due_today (RN-2: the same number as the session). The week sits under a hairline.
// Goal met: "Meta de hoje feita", with "Revisar mais um lote" while cards remain; otherwise no button here and the
// primary goes to the first step of "Também para hoje". `primary` false (the backlog card carries the screen): a
// secondary card without the button. The ring draws once a day on this device (baigi-ring-drawn-{dia}).
import type { Stats, StudyHistory } from '~/types'
import type { WeekDay } from '~/components/ui/WeekStrip.vue'
import type { DayPlanStep } from '~/composables/useDayPlan'
// Explicit: the name is exported twice (utils and composables) and the auto-import left it unresolved in the build
import { SECONDS_PER_CARD } from '~/utils/reviewBatch'

const props = withDefaults(defineProps<{
  stats: Stats | null
  history?: StudyHistory | null
  /** Names of the subjects with cards today (daySubjects) */
  subjects?: string[]
  /** The Revisar step of the plan: its backlog line, survival mode and overdue link move here */
  review?: DayPlanStep | null
  primary?: boolean
  loading?: boolean
  survivalBusy?: boolean
}>(), { history: null, subjects: () => [], review: null, primary: true, loading: false, survivalBusy: false })

defineEmits<{ (e: 'start'): void; (e: 'survival-off'): void }>()

const NBSP = ' '
const goal = computed(() => props.stats!.goal!)
const due = computed(() => props.stats?.due_today ?? 0)
const ratio = computed(() => (goal.value.target_batches > 0 ? goal.value.done_batches / goal.value.target_batches : 0))
const goalText = computed(() => `${goal.value.done_batches} de ${plural(goal.value.target_batches, 'lote', 'lotes')}`)
const minutes = computed(() => roundMinutes(goal.value.minutes_left || (goal.value.target_batches - goal.value.done_batches) * goal.value.batch_size * SECONDS_PER_CARD / 60))
const left = computed(() => Math.max(0, goal.value.target_batches - goal.value.done_batches))

const title = computed(() => (goal.value.met
  ? 'Meta de hoje feita'
  : `Falta ${left.value}${NBSP}${left.value === 1 ? 'lote' : 'lotes'}, cerca de ${minutes.value}${NBSP}min`))

const cta = computed(() => {
  if (!props.primary || due.value <= 0) return ''
  return goal.value.met ? 'Revisar mais um lote' : `Começar · ${plural(due.value, 'card', 'cards')}`
})

const contentLine = computed(() => {
  if (goal.value.met) return `${plural(due.value, 'card ainda', 'cards ainda')} para hoje`
  const where = subjectsText(props.subjects)
  return `${plural(due.value, 'card', 'cards')}${where ? ` de ${where}` : ' para hoje'}`
})

// 128 px from 640, 104 on the phone (the ring is an SVG with a fixed box)
const wide = useMediaQuery('(min-width: 40rem)')
const ringSize = computed(() => (wide.value ? 128 : 104))

const draw = ref(false)
const celebrate = ref(false)
// In setup (the app is client-only): the first frame already draws, and the celebration renders with it
;(() => {
  if (!props.stats?.goal) return
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
  if (!props.history || !props.stats) return null
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
    else if (props.stats!.streak_rest_on === iso) state = 'rest'
    return { short: SHORT[dow]!, name: NAME[dow]!, state }
  })
})
</script>

<style scoped>
/* Phone: the ring beside the overline and the title, the content and the button under both (full width).
   From 640 px: the ring on the left of the whole text column. */
.goal-grid {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-areas: "ring head" "body body";
  column-gap: 1rem;
  row-gap: 1rem;
  align-items: center;
}
.goal-ring { grid-area: ring; }
.goal-ring-skeleton { width: 6.5rem; height: 6.5rem; }
.goal-head { grid-area: head; }
.goal-body { grid-area: body; }
.goal-overline { text-transform: uppercase; letter-spacing: 0.06em; }
.goal-title { font-size: 1.5rem; line-height: 1.15; text-wrap: balance; }
/* Without a button (goal met with nothing left, or the backlog card leads): the title centered on the ring */
.goal-grid.goal-grid--solo { grid-template-areas: "ring head"; grid-template-rows: auto; }
.goal-grid--solo .goal-head { align-self: center; }
@media (min-width: 40rem) {
  .goal-grid {
    grid-template-areas: "ring head" "ring body";
    grid-template-rows: auto auto;
    align-content: center;
    column-gap: 1.75rem;
    row-gap: 0.5rem;
  }
  .goal-ring { align-self: center; }
  .goal-head, .goal-body { align-self: start; }
  .goal-title { font-size: 1.75rem; }
  .goal-ring-skeleton { width: 8rem; height: 8rem; }
}
</style>
