<template>
  <UiSkeleton v-if="loading" variant="text" :lines="2" class="max-w-xs py-1.5" />

  <header v-else class="flex items-start justify-between gap-3" :data-testid="state === 'done' ? 'hero-up-to-date' : undefined">
    <div class="min-w-0">
      <h1 class="text-display text-fg-strong">{{ headline }}</h1>
      <p class="mt-1.5 text-meta text-fg-muted">
        {{ date }}<template v-if="subline"> · <span data-testid="hero-subline">{{ subline }}</span></template>
      </p>
      <p v-if="state === 'done'" class="mt-1 text-meta text-fg-muted" data-testid="hero-tomorrow">{{ tomorrowLine }}</p>
      <p v-if="atRisk && streak >= 1" class="mt-1 text-meta font-semibold text-metric-streak-fg" data-testid="hero-streak-risk">
        Revise hoje para manter {{ plural(streak, 'dia', 'dias') }}
      </p>
      <!-- The Intensivo trial: a line of the greeting, never a block of its own (prd-planos-lancamento RF-F1) -->
      <p v-if="trialLine" class="mt-1 text-meta text-fg" data-testid="home-trial">
        {{ trialLine }}. <UiLink to="/planos">Ver planos</UiLink>
      </p>
    </div>

    <!-- The streak in a chip (ADR-035 §1: the flame identifies, the number stays black); the shape never informs alone -->
    <UiTag v-if="showStreak" tone="streak" :icon="Flame" size="lg" class="mt-1 tabular-nums" data-testid="hero-streak">
      {{ streak }}<span class="sr-only">{{ ` ${streak === 1 ? 'dia seguido' : 'dias seguidos'} de estudo` }}</span>
    </UiTag>
  </header>
</template>

<script setup lang="ts">
// Greeting of Hoje, E2 (prd-visual-e2 RF-3.2): "Bom dia, Ana" in text-display, the date with the sentence of the
// day ("uns 30 minutos hoje", "boas-vindas ao Baigi", "que bom te ver de volta") and the streak chip. No lilac
// any more: the one lilac block of Hoje is the exam (ADR-035 §1). Everything done: "Tudo em dia" with tomorrow.
// The numbers failed to load: the salutation alone (never "Tudo em dia").
import { Flame } from 'lucide-vue-next'
import type { Stats, TomorrowForecast } from '~/types'
import type { GreetingState } from '~/utils/greeting'

const props = defineProps<{
  stats: Stats | null
  userName?: string | null
  /** Minutes of the plan (review + questions + episode) */
  minutes?: number
  loading?: boolean
  /** /stats or /review/backlog-stats failed: salutation only */
  error?: boolean
  /** Back with a backlog: "que bom te ver de volta" */
  returning?: boolean
}>()

const name = computed(() => firstName(props.userName))
const auth = useAuthStore()
const proName = useProName(() => auth.onTrial)
const trialLine = computed(() => (auth.onTrial ? trialEndsLine(proName.value, auth.user?.trial?.ends_at) : ''))
const date = longDate()

const state = computed<GreetingState>(() => {
  if (props.error || !props.stats) return 'plain'
  if ((props.stats.total_cards ?? 0) === 0) return 'new'
  return (props.stats.due_today ?? 0) > 0 || props.returning ? 'plan' : 'done'
})
const headline = computed(() => (state.value === 'done' ? `Tudo em dia, ${name.value}` : `${salutation()}, ${name.value}`))
const subline = computed(() => {
  if (state.value === 'new') return 'boas-vindas ao Baigi'
  if (props.returning) return 'que bom te ver de volta'
  if (state.value === 'plan') return `uns ${roundMinutes(props.minutes ?? 0)} minutos hoje`
  return ''
})

const streak = computed(() => (state.value === 'plain' ? 0 : props.stats?.streak ?? 0))
const showStreak = computed(() => state.value !== 'plain' && (streak.value >= 1 || state.value !== 'new'))
const atRisk = computed(() => !!props.stats?.streak_at_risk)

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
