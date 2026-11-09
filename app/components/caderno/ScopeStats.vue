<template>
  <UiSection aria-label="Números e ações" class="flex flex-col gap-4" data-testid="scope-stats">
    <!-- Context only: the percentages; the one number of review is on the button (RN 1). On the phone the button lives in
         the fixed bar, so the number of today is a tile here -->
    <div v-if="hasCards" class="grid gap-3" :class="tiles === 3 ? 'grid-cols-3 lg:grid-cols-2' : 'grid-cols-2'">
      <div class="min-w-0 rounded-tile bg-soft p-3 lg:bg-transparent lg:p-0">
        <UiNumber :value="`${mastery}%`" size="s" />
        <p class="mt-1 text-meta text-fg-muted">domínio<span class="max-lg:hidden"> · {{ fmt(summary.mastery.in_day) }} de {{ fmt(summary.mastery.cards) }} em dia</span></p>
        <UiProgressBar class="mt-2 max-lg:hidden" :value="mastery" :label="`Domínio de ${summary.topic.name}`" />
      </div>
      <div v-if="accuracy !== null" class="min-w-0 rounded-tile bg-soft p-3 lg:bg-transparent lg:p-0">
        <UiNumber :value="`${accuracy}%`" size="s" />
        <p class="mt-1 text-meta text-fg-muted">acerto em {{ fmt(summary.questions!.answered) }} questões</p>
        <UiProgressBar class="mt-2 max-lg:hidden" :value="accuracy" tone="neutral" :label="`Acerto de ${summary.topic.name}`" />
      </div>
      <div class="min-w-0 rounded-tile bg-soft p-3 lg:hidden">
        <UiNumber :value="sessionCount" size="s" />
        <p class="mt-1 text-meta text-fg-muted">para revisar hoje</p>
      </div>
    </div>

    <div class="flex flex-col gap-2.5">
      <!-- The primary of the screen; on the phone the fixed bar carries it (RF-F11) -->
      <UiButton v-if="sessionCount > 0" variant="primary" block :to="reviewPath(summary.topic.id)" class="max-md:hidden" data-testid="scope-review">
        Revisar hoje · {{ sessionCount }}
      </UiButton>
      <UiButton v-else-if="generateTarget" variant="primary" block :to="generateTarget.to" :icon-left="Sparkles" data-testid="scope-generate">
        {{ generateTarget.label }}
      </UiButton>
      <p v-else-if="hasCards" class="text-body text-fg-muted" data-testid="scope-done">Tudo em dia por hoje.</p>

      <div class="grid gap-2.5" :class="quizInHeader ? 'grid-cols-2' : 'grid-cols-1'">
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
</template>

<script setup lang="ts">
// The numbers and the actions of a scope, E2 (prd-visual-e2 RF-4.2; prd-4b-caderno-v3 RF-F3): mastery and accuracy in
// the Fraunces (context), ONE number of review on the primary ("Revisar hoje · N" = session.count, the same as the list,
// Hoje, the phone bar and the session), Questões next to it in the exam mode (D8) and Ouvir. On the desktop it is the
// top of the side column of the hub; on the phone, the tiles under the title (the button goes to the fixed bar).
import { CircleHelp, Headphones, Sparkles } from 'lucide-vue-next'
import type { MaterialRow, ScopeSummary } from '~/types'
import { requirementText } from '~/utils/studyRequirement'
import { reviewPath } from '~/utils/reviewScope'

const props = defineProps<{
  summary: ScopeSummary
  /** First material row, for "Gerar cards de…" when the server has no next step */
  firstMaterial?: MaterialRow | null
}>()
defineEmits<{ (e: 'listen'): void }>()

const fmt = (n: number) => n.toLocaleString('pt-BR')

const isRoot = computed(() => props.summary.topic.depth === 0)
const rootName = computed(() => props.summary.path[0]?.name ?? props.summary.topic.name)
const hasCards = computed(() => props.summary.counts.cards > 0)
const mastery = computed(() => props.summary.mastery.percent ?? 0)
const accuracy = computed(() => props.summary.questions?.accuracy ?? null)
const sessionCount = computed(() => props.summary.session.count)
const overdue = computed(() => props.summary.session.overdue)
const tiles = computed(() => (accuracy.value !== null ? 3 : 2))

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
