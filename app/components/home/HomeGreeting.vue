<template>
  <div v-if="loading" class="greet" aria-hidden="true">
    <div class="greet-mascot greet-mascot-skeleton animate-pulse rounded-tile bg-soft" />
    <UiSkeleton variant="text" :lines="2" class="greet-text w-full max-w-xs" />
  </div>

  <header v-else class="greet" :data-testid="state === 'done' ? 'hero-up-to-date' : undefined">
    <!-- The official mascot, static (ADR-037 §7), centered on the two lines of the title and the date. It fades in
         only on the first visit of the day on this device, never with reduced motion (RN-5) -->
    <picture class="greet-mascot" :data-fade="fade || undefined" aria-hidden="true">
      <source :srcset="mascotAvif" type="image/avif">
      <img :src="mascotWebp" alt="" width="41" height="64" decoding="async">
    </picture>

    <div class="greet-text min-w-0">
      <h1 class="text-display text-fg-strong">{{ headline }}</h1>
      <!-- The streak chip sits on the date line; on the phone the weekday goes, so the chip never falls to a 3rd line -->
      <p class="greet-date mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-fg-muted">
        <span>
          <!-- Back with a backlog, the phone keeps the sentence and drops the date (the line holds the chip) -->
          <span :class="returning && 'max-sm:hidden'"><span class="max-sm:hidden">{{ weekday }}, </span>{{ day }}<template v-if="subline"> · </template></span><span v-if="subline" data-testid="hero-subline">{{ subline }}</span>
        </span>
        <!-- The flame identifies, the number stays in the text (ADR-035 §1); the shape never informs alone -->
        <UiTag v-if="showStreak" tone="streak" :icon="Flame" size="sm" class="tabular-nums" data-testid="hero-streak">
          {{ streak }}<span class="sr-only">{{ ` ${streak === 1 ? 'dia seguido' : 'dias seguidos'} de estudo` }}</span>
        </UiTag>
      </p>
    </div>

    <div v-if="state === 'done' || (atRisk && streak >= 1) || trialLine" class="greet-more">
      <p v-if="state === 'done'" class="text-meta text-fg-muted" data-testid="hero-tomorrow">{{ tomorrowLine }}</p>
      <p v-if="atRisk && streak >= 1" class="text-meta font-semibold text-metric-streak-fg" data-testid="hero-streak-risk">
        Revise hoje para manter {{ plural(streak, 'dia', 'dias') }}
      </p>
      <!-- The Intensivo trial: a line of the greeting, never a block of its own (prd-planos-lancamento RF-F1) -->
      <p v-if="trialLine" class="text-meta text-fg" data-testid="home-trial">
        {{ trialLine }}. <UiLink to="/planos">Ver planos</UiLink>
      </p>
    </div>
  </header>
</template>

<script setup lang="ts">
// Greeting of Hoje, A2 (prd-visual-a2 RF-2.1; E2 RF-3.2): the static mascot centered on two lines, "Bom dia, Ana" in
// text-display and the date with the sentence of the day ("uns 30 min hoje", "boas-vindas ao Baigi", "que bom te
// ver de volta") and the streak chip on that same line. No lilac
// any more: the one lilac block of Hoje is the exam (ADR-035 §1). Everything done: "Tudo em dia" with tomorrow.
// The numbers failed to load: the salutation alone (never "Tudo em dia").
import { Flame } from 'lucide-vue-next'
import mascotAvif from '~/assets/mascots/mascot-baigi.avif'
import mascotWebp from '~/assets/mascots/mascot-baigi.webp'
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
// "Quinta-feira, 12 de novembro": the weekday only from 640 px
const [weekday, day] = (() => {
  const text = longDate()
  const cut = text.indexOf(', ')
  return cut > 0 ? [text.slice(0, cut), text.slice(cut + 2)] : ['', text]
})()

// The mascot fades in on the first visit of the study day on this device (private mode: no fade, never an error)
const fade = (() => {
  const key = `baigi-greet-${studyDay()}`
  try {
    if (localStorage.getItem(key)) return false
    localStorage.setItem(key, '1')
    return true
  } catch {
    return false
  }
})()

const state = computed<GreetingState>(() => {
  if (props.error || !props.stats) return 'plain'
  if ((props.stats.total_cards ?? 0) === 0) return 'new'
  return (props.stats.due_today ?? 0) > 0 || props.returning ? 'plan' : 'done'
})
const headline = computed(() => (state.value === 'done' ? `Tudo em dia, ${name.value}` : `${salutation()}, ${name.value}`))
const subline = computed(() => {
  if (state.value === 'new') return 'boas-vindas ao Baigi'
  if (props.returning) return 'que bom te ver de volta'
  if (state.value === 'plan') return `uns ${roundMinutes(props.minutes ?? 0)} min hoje`
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

<style scoped>
/* The mascot spans the title and the date (centered on the two lines); the extra lines sit under the text */
.greet {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  column-gap: 0.75rem;
  row-gap: 0.25rem;
  align-items: center;
}
.greet-mascot { grid-column: 1; grid-row: 1; display: block; }
/* The standing art: 56 px tall on the phone, 64 from 640 (CSS here, not utilities: entry.css has a ceiling) */
.greet-mascot img { display: block; height: 3.5rem; width: auto; }
.greet-mascot-skeleton { height: 3.5rem; width: 2.25rem; }
.greet-text { grid-column: 2; grid-row: 1; }
.greet-more { grid-column: 2; display: flex; flex-direction: column; gap: 0.25rem; }
@media (min-width: 40rem) {
  .greet { column-gap: 1rem; }
  .greet-mascot img, .greet-mascot-skeleton { height: 4rem; }
  .greet-mascot-skeleton { width: 2.5rem; }
  .greet-date { font-size: 1rem; }
}
@media (prefers-reduced-motion: no-preference) {
  .greet-mascot[data-fade] { animation: greet-fade 240ms var(--ease-out) both; }
}
@keyframes greet-fade {
  from { opacity: 0; }
}
</style>
