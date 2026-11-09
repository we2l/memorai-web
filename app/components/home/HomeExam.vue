<template>
  <template v-if="exam">
    <!-- With a projection: the one lilac block of Hoje, the sentence of the E1 (ADR-035 §1, §2) -->
    <UiSection v-if="exam.projection" variant="tinted" aria-label="Próxima prova" data-testid="home-exam" class="flex flex-col">
      <div class="flex items-start justify-between gap-3">
        <p class="pt-1 text-label font-semibold text-action-fg">
          {{ exam.title }} · {{ when }}
          <UiTag v-if="exam.reta_final_active" tone="action" class="ml-1 align-middle">Reta final</UiTag>
        </p>
        <span class="inline-flex shrink-0 items-center gap-1.5 rounded-chip bg-raised px-2.5 py-1 text-label font-semibold text-fg-strong shadow-0">
          <CalendarDays class="size-3.5" aria-hidden="true" />{{ shortDate }}
        </span>
      </div>

      <p class="mt-2.5 text-section text-fg-strong" data-testid="home-exam-pace">
        <em class="exam-it">Mantendo o ritmo</em>, você chega à prova lembrando
        <UiNumber :value="`${exam.projection.keep_pace}%`" size="s" class="exam-num" />
      </p>

      <ul v-if="subjects.length" class="mt-4 flex flex-col gap-2.5" aria-label="Domínio por matéria">
        <li v-for="s in subjects" :key="s.id" class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] items-center gap-3 text-meta">
          <span class="truncate text-fg">{{ s.name }}</span>
          <span class="h-1.5 overflow-hidden rounded-full bg-raised" role="progressbar" :aria-label="`Domínio de ${s.name}`" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="s.mastery">
            <span class="block h-full rounded-full" :class="SUBJECT_BG[s.tone - 1]" :style="{ width: `${s.mastery}%` }" />
          </span>
          <span class="w-10 text-right font-semibold tabular-nums text-fg-strong" aria-hidden="true">{{ s.mastery }}%</span>
        </li>
      </ul>

      <UiLink to="/progresso#provas" standalone class="mt-4 self-start" @click="track">Ver o plano da prova →</UiLink>
    </UiSection>

    <!-- Without a projection yet (< 20 cards): a plain row, no lilac -->
    <UiSection v-else aria-label="Próxima prova" data-testid="home-exam">
      <div class="flex items-center gap-3.5">
        <UiIconTile :icon="CalendarDays" tone="action" />
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-fg-strong">{{ exam.title }} {{ when }}</p>
          <p class="text-meta text-fg-muted" data-testid="home-exam-pace">{{ pace }}</p>
        </div>
        <UiLink to="/progresso#provas" standalone class="max-sm:hidden" @click="track">Ver provas</UiLink>
      </div>
    </UiSection>
  </template>

  <!-- The onboarding's exam stuck on the sample (prd-revisao-v5-fase-b RF-F12) -->
  <LazyExamMoveOffer
    v-if="offer?.move_offer"
    :exam-id="offer.id"
    :exam-title="offer.title"
    :target="offer.move_offer"
    origin="home"
    @moved="examStore.fetchUpcoming()"
  />
</template>

<script setup lang="ts">
// Next exam on Hoje, E2 (prd-visual-e2 RF-3.5): the lilac card with "Mantendo o ritmo, você chega à prova lembrando
// 90%" (keep_pace of the projection, the one number in purple; the italic only here, ADR-035 §2) and the mastery of
// up to 3 subjects of the exam from /topics/performance (the weakest last; no new API). Without a projection
// (< 20 cards): a plain row with the pace. Nothing without an exam.
import { CalendarDays } from 'lucide-vue-next'
import type { ExamUpcoming, TopicPerformance, TopicProgress } from '~/types'

const props = defineProps<{ exams: ExamUpcoming[]; performance?: TopicPerformance[]; progress?: TopicProgress[] }>()

// Full class names: Tailwind only generates what it finds written (the subject's own color, ADR-035 §1)
const SUBJECT_BG = ['bg-subject-1', 'bg-subject-2', 'bg-subject-3', 'bg-subject-4', 'bg-subject-5', 'bg-subject-6', 'bg-subject-7', 'bg-subject-8']

const exam = computed(() => [...props.exams]
  .filter(e => e.days_remaining >= 0)
  .sort((a, b) => a.days_remaining - b.days_remaining)[0] ?? null)

const offer = computed(() => props.exams.find(e => e.move_offer) ?? null)
const examStore = useExamStore()

const when = computed(() => {
  const d = exam.value?.days_remaining ?? 0
  if (d === 0) return 'é hoje'
  if (d === 1) return 'é amanhã'
  return `em ${d} dias`
})
const shortDate = computed(() => (exam.value
  ? new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${exam.value.exam_date.slice(0, 10)}T12:00:00Z`)).replace('.', '')
  : ''))

const pace = computed(() => {
  const n = exam.value?.cards_per_day ?? 0
  return n > 0 ? `Ritmo: ${plural(n, 'card', 'cards')} por dia até lá` : 'A projeção aparece depois de 20 cards revisados.'
})

// The subjects of the exam: the children of its topics (or the topics themselves), with mastery
const subjects = computed(() => {
  const covered = new Set((exam.value?.topics ?? []).map(t => t.id))
  const perf = props.performance ?? []
  const children = perf.filter(p => p.parent_id && covered.has(p.parent_id) && p.mastery !== null)
  const list = children.length ? children : perf.filter(p => covered.has(p.topic_id) && p.mastery !== null)
  const color = new Map((props.progress ?? []).map(t => [t.id, t.color]))
  return list
    .map((p, i) => ({ id: p.topic_id, name: p.name, mastery: Math.round(p.mastery!), tone: subjectTone(color.get(p.topic_id), i) }))
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 3)
})

function track() {
  useAnalytics().track('home_exam_click', {})
}
</script>

<style scoped>
/* The italic of the exam card (ADR-035 §2): Fraunces Italic 500, out of the precache; without it, the Inter */
.exam-it { font-family: var(--font-it); font-weight: 500; font-size: 1.08em; letter-spacing: -0.01em; }
.exam-num { color: var(--action-fg); vertical-align: -0.12em; }
</style>
