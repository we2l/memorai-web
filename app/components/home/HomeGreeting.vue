<template>
  <UiSkeleton v-if="loading" variant="block" size="lg" />

  <UiSection v-else variant="tinted" :data-testid="state === 'done' ? 'hero-up-to-date' : undefined">
    <div class="flex items-center gap-4 sm:gap-6">
      <picture class="shrink-0">
        <source :srcset="goalMet ? celebratingAvif : mascotAvif" type="image/avif">
        <img :src="goalMet ? celebratingWebp : mascotWebp" alt="" width="51" height="80" class="h-20 w-auto" decoding="async">
      </picture>

      <div class="min-w-0 flex-1">
        <p class="text-meta text-fg-muted">{{ date }}</p>
        <h1 class="mt-1 text-page-title-sm text-fg-strong sm:text-page-title">{{ headline }}</h1>

        <!-- Goal and streak wrap as one line of items: the shape never informs alone (ADR-027 §4) -->
        <div v-if="showGoal || streak >= 1" class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-meta text-fg">
          <template v-if="showGoal">
            <span>Meta de hoje</span>
            <UiProgressBar
              class="w-32"
              size="md"
              :segments="goal!.target_batches"
              :value="goal!.done_batches"
              :max="goal!.target_batches"
              :label="`Meta de hoje: ${goalText}`"
              :value-text="goalText"
            />
            <span class="font-semibold text-fg-strong" data-testid="home-goal">{{ goal!.met ? 'Meta de hoje cumprida' : goalText }}</span>
          </template>
          <span v-if="streak >= 1" class="inline-flex items-center gap-1.5 font-semibold text-streak-fg" data-testid="hero-streak">
            <Flame class="size-4 fill-current text-streak" aria-hidden="true" />
            <template v-if="atRisk">Revise hoje para manter {{ plural(streak, 'dia', 'dias') }}</template>
            <template v-else>{{ plural(streak, 'dia', 'dias') }}<span class="sr-only"> seguidos de estudo</span></template>
          </span>
        </div>

        <p v-if="state === 'done'" class="mt-2 text-meta text-fg-muted" data-testid="hero-tomorrow">{{ tomorrowLine }}</p>
        <!-- The Intensivo trial: a line of the greeting, never a block of its own (prd-planos-lancamento RF-F1) -->
        <p v-if="trialLine" class="mt-2 text-meta text-fg" data-testid="home-trial">
          {{ trialLine }}. <UiLink to="/planos">Ver planos</UiLink>
        </p>
      </div>
    </div>

    <!-- Goal of the day: once a day per device, ≤ 700 ms, still with reduced motion (ADR-027 §6); lazy: rare -->
    <LazyUiCelebration v-if="celebrate" kind="goal" title="Meta cumprida" :subtitle="goalText" :mascot="false" class="mt-4" />
  </UiSection>
</template>

<script setup lang="ts">
// Greeting of Hoje (prd-4a-hoje-v3 RF-F1): the only tinted block of the screen, with the mascot, the date,
// the sentence of the day, the goal in batches and the streak. States: plan, everything done (with
// tomorrow), new account, and the salutation alone when the numbers failed to load (never "Tudo em dia").
import { Flame } from 'lucide-vue-next'
import type { Stats, TomorrowForecast } from '~/types'
import type { GreetingState } from '~/utils/greeting'
import mascotAvif from '~/assets/mascots/mascot-baigi.avif'
import mascotWebp from '~/assets/mascots/mascot-baigi.webp'
import celebratingAvif from '~/assets/mascots/mascot-baigi-celebrating.avif'
import celebratingWebp from '~/assets/mascots/mascot-baigi-celebrating.webp'

const props = defineProps<{
  stats: Stats | null
  userName?: string | null
  /** Minutes of the plan (review + questions + episode) */
  minutes?: number
  loading?: boolean
  /** /stats or /review/backlog-stats failed: salutation only */
  error?: boolean
}>()

const name = computed(() => firstName(props.userName))
const auth = useAuthStore()
const proName = useProName(() => auth.onTrial)
const trialLine = computed(() => (auth.onTrial ? trialEndsLine(proName.value, auth.user?.trial?.ends_at) : ''))
const date = longDate()

const state = computed<GreetingState>(() => {
  if (props.error || !props.stats) return 'plain'
  if ((props.stats.total_cards ?? 0) === 0) return 'new'
  return (props.stats.due_today ?? 0) > 0 ? 'plan' : 'done'
})
const headline = computed(() => greetingHeadline(state.value, name.value, props.minutes ?? 0))

const goal = computed(() => props.stats?.goal)
const showGoal = computed(() => state.value !== 'plain' && state.value !== 'new' && (goal.value?.target_batches ?? 0) > 0)
const goalMet = computed(() => showGoal.value && !!goal.value?.met)
const goalText = computed(() => (goal.value ? `${goal.value.done_batches} de ${plural(goal.value.target_batches, 'lote', 'lotes')}` : ''))

const streak = computed(() => (state.value === 'plain' ? 0 : props.stats?.streak ?? 0))
const atRisk = computed(() => !!props.stats?.streak_at_risk)

// Celebration of the goal: once per study day on this device (key in localStorage, private mode = no party)
const celebrate = ref(false)
watch(goalMet, (met) => {
  if (!met || celebrate.value) return
  const key = `baigi-goal-celebrated-${studyDay()}`
  try {
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
  } catch {
    return
  }
  celebrate.value = true
  useAnalytics().track('home_goal_met', { target_batches: goal.value!.target_batches })
}, { immediate: true })

// Everything done: tomorrow's load (prd-retencao-lembretes RF-F07)
const tomorrow = ref<TomorrowForecast | null>(null)
const tomorrowLine = computed(() => {
  if (!tomorrow.value) return 'Que tal adicionar material novo?'
  const n = tomorrow.value.due_count
  if (n === 0) return 'Amanhã: nada pendente. Que tal adicionar material novo?'
  return `Amanhã: ${plural(n, 'card', 'cards')} · ≈${tomorrow.value.estimated_minutes} min`
})
watch(() => state.value === 'done', async (done) => {
  if (!done || tomorrow.value) return
  try {
    tomorrow.value = (await useNuxtApp().$api<{ data: TomorrowForecast }>('/review/tomorrow')).data
  } catch (e) {
    reportApiError(e, { silent: true })
  }
}, { immediate: true })
</script>
