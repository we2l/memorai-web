<template>
  <!-- Two blocks in the side column (contents: the column's own gap spaces them) -->
  <div class="contents">
    <!-- 1. "Revisar hoje": the one primary block of the hub (A2 RF-3.2) -->
    <UiSection variant="primary" aria-label="Revisar hoje" class="flex flex-col gap-4" data-testid="scope-stats">
      <div v-if="sessionCount > 0" data-testid="scope-today">
        <p class="text-label font-semibold uppercase tracking-logo text-fg-muted" aria-hidden="true">Revisar hoje</p>
        <p class="mt-2 flex flex-wrap items-baseline gap-x-3">
          <UiNumber :value="fmt(sessionCount)" size="hero" />
          <span class="text-body text-fg-muted">{{ todayDetail }}</span>
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <!-- The primary of the screen; on the phone the fixed bar carries it (RF-F11) -->
        <UiButton v-if="sessionCount > 0" variant="primary" block :to="reviewPath(summary.topic.id)" class="max-md:hidden" data-testid="scope-review">
          Revisar hoje · {{ cardsLabel(sessionCount) }}
        </UiButton>
        <UiButton v-else-if="generateTarget" variant="primary" block :to="generateTarget.to" :icon-left="Sparkles" data-testid="scope-generate">
          {{ generateTarget.label }}
        </UiButton>
        <p v-else-if="hasCards" class="text-body text-fg-muted" data-testid="scope-done">Tudo em dia por hoje.</p>

        <!-- Equal widths: two columns when Questões sits here (exam mode, D8) -->
        <div class="grid gap-2" :class="quizInHeader ? 'grid-cols-2' : 'grid-cols-1'">
          <UiButton v-if="quizInHeader" variant="outline" block :icon-left="CircleHelp" icon-tone="quiz" :to="quizPath" data-testid="scope-quiz">Questões</UiButton>
          <UiButton variant="outline" block :icon-left="Headphones" icon-tone="listen" data-testid="scope-listen" @click="$emit('listen')">{{ listenLabel }}</UiButton>
        </div>
      </div>

      <p v-if="quizInHeader && quizBlocked" class="-mt-1 text-meta text-fg-muted">Questões: {{ quizBlocked }}</p>
      <!-- The backlog apart from "Revisar hoje" (prd-revisao-v5-fase-b RF-F3); older API builds: the old line -->
      <LazyBacklogLine
        v-if="summary.backlog"
        :backlog="summary.backlog"
        :count="summary.session.backlog ?? 0"
        scope="caderno"
        origin="caderno"
      />
      <p v-else-if="overdue > sessionCount" class="text-meta text-fg-muted" data-testid="scope-overdue">
        {{ fmt(overdue) }} atrasados ·
        <UiLink :to="`/revisar?topic_id=${summary.topic.id}&backlog=1`">Recuperar atraso</UiLink>
      </p>
      <p v-if="!isRoot && sessionCount > 0" class="text-meta text-fg-muted">
        O Revisar hoje de {{ rootName }} já inclui {{ sessionCount === 1 ? 'este 1' : `estes ${sessionCount}` }}.
      </p>
    </UiSection>

    <!-- 2. Domínio and acerto: context, secondary, the number lighter than the one above -->
    <UiSection v-if="hasCards" aria-label="Domínio e acerto" class="grid grid-cols-2 gap-6" data-testid="scope-mastery">
      <div class="min-w-0">
        <p class="text-label font-semibold uppercase tracking-logo text-fg-muted">Domínio</p>
        <p class="mt-2 flex flex-wrap items-baseline gap-x-1.5">
          <UiNumber :value="`${mastery}%`" size="s" weight="normal" />
          <span class="text-meta text-fg-muted">{{ fmt(summary.mastery.in_day) }} de {{ fmt(summary.mastery.cards) }} em dia</span>
        </p>
        <UiProgressBar class="mt-3" :value="mastery" :label="`Domínio de ${summary.topic.name}`" />
      </div>
      <div class="min-w-0">
        <p class="text-label font-semibold uppercase tracking-logo text-fg-muted">Acerto</p>
        <template v-if="accuracy !== null">
          <p class="mt-2 flex flex-wrap items-baseline gap-x-1.5">
            <UiNumber :value="`${accuracy}%`" size="s" weight="normal" />
            <span class="text-meta text-fg-muted">em {{ fmt(summary.questions!.answered) }} questões</span>
          </p>
          <UiProgressBar class="mt-3" :value="accuracy" tone="neutral" :label="`Acerto de ${summary.topic.name}`" />
        </template>
        <p v-else class="mt-2 text-meta text-fg-muted" data-testid="scope-accuracy-empty">{{ accuracyHint }}</p>
      </div>
    </UiSection>
  </div>
</template>

<script setup lang="ts">
// The side of the hub, A2 (prd-visual-a2 RF-3.2; prd-4b-caderno-v3 RF-F3): "Revisar hoje" is the one primary block,
// with ONE number of review ("8 cards · 1 lote · 2 min", the button "Revisar hoje · 8 cards" = session.count, the same
// as the list, Hoje, the phone bar and the session), Questões next to Ouvir at equal widths in the exam mode (D8);
// below it, mastery and accuracy as context (Fraunces of normal weight). On the phone the button goes to the fixed bar.
import { CircleHelp, Headphones, Sparkles } from 'lucide-vue-next'
import type { MaterialRow, ScopeSummary } from '~/types'
import { requirementText } from '~/utils/studyRequirement'
import { reviewPath } from '~/utils/reviewScope'
import { cardsMinutes, reviewBatchSizeOf } from '~/utils/reviewBatch'

const props = defineProps<{
  summary: ScopeSummary
  /** First material row, for "Gerar cards de…" when the server has no next step */
  firstMaterial?: MaterialRow | null
}>()
defineEmits<{ (e: 'listen'): void }>()

const auth = useAuthStore()
const fmt = (n: number) => n.toLocaleString('pt-BR')
const cardsLabel = (n: number) => `${fmt(n)} ${n === 1 ? 'card' : 'cards'}`

const isRoot = computed(() => props.summary.topic.depth === 0)
const rootName = computed(() => props.summary.path[0]?.name ?? props.summary.topic.name)
const hasCards = computed(() => props.summary.counts.cards > 0)
const mastery = computed(() => props.summary.mastery.percent ?? 0)
const accuracy = computed(() => props.summary.questions?.accuracy ?? null)
const sessionCount = computed(() => props.summary.session.count)
const overdue = computed(() => props.summary.session.overdue)

/** "cards · 1 lote · 2 min": the batches of the account's size (/me.review_batch_size) and ~15 s a card */
const todayDetail = computed(() => {
  const n = sessionCount.value
  const batches = Math.ceil(n / reviewBatchSizeOf(auth.user?.review_batch_size))
  const minutes = Math.max(1, cardsMinutes(n))
  return `${n === 1 ? 'card' : 'cards'} · ${batches} ${batches === 1 ? 'lote' : 'lotes'} · ${minutes} min`
})

/** Under 10 answered there is no percentage: what is missing, the same words as the table of matérias */
const accuracyHint = computed(() => {
  const answered = props.summary.questions?.answered ?? 0
  return answered > 0 ? `${answered} de 10 questões` : 'Faça 10 questões'
})

/** "Gerar cards de {material}": the server's next step, else the first material of the list */
const generateTarget = computed(() => {
  if (hasCards.value || props.summary.counts.materials === 0) return null
  const step = props.summary.next_step
  if (step?.kind === 'generate_cards' && step.target.type === 'note') {
    return { label: step.title, to: `${cadernoPath(step.target.topic_id, { note: step.target.id })}?workshop=1` }
  }
  const first = props.firstMaterial
  if (first?.note_id && first.status === 'ready') {
    return { label: `Gerar cards de ${first.title}`, to: `${cadernoPath(first.topic.id, { note: first.note_id })}?workshop=1` }
  }
  return null
})

const quizInHeader = computed(() => props.summary.topic.learning_mode === 'exam')
const quizPath = computed(() => `/simulados?topic_id=${props.summary.topic.id}`)
const quizBlocked = computed(() => requirementText(props.summary.can_quiz))
const listenLabel = computed(() => {
  const ep = props.summary.listen
  if (!ep) return 'Ouvir'
  const min = Math.max(1, Math.round((ep.duration_seconds ?? 0) / 60))
  return ep.duration_seconds ? `Ouvir · ${min} min` : 'Ouvir'
})
</script>
