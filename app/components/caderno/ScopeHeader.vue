<template>
  <UiSection as="header" class="flex flex-col gap-5" data-testid="scope-header">
    <div class="min-w-0">
      <!-- Path: Cadernos / {root} ▾ / {matéria}; the ▾ switches to another caderno -->
      <nav aria-label="Caminho" class="flex flex-wrap items-center gap-x-1 text-meta text-fg-muted">
        <UiLink to="/cadernos" variant="muted">Cadernos</UiLink>
        <span aria-hidden="true">/</span>
        <span class="inline-flex items-center">
          <UiLink :to="cadernoPath(root.id)" variant="muted" :aria-current="isRoot ? 'page' : undefined">{{ root.name }}</UiLink>
          <UiMenu v-if="otherRoots.length" :items="rootItems" label="Trocar de caderno" align="start">
            <template #trigger="{ props: trigger }">
              <UiIconButton :icon="ChevronDown" label="Trocar de caderno" size="sm" v-bind="trigger" />
            </template>
          </UiMenu>
        </span>
        <template v-for="p in middlePath" :key="p.id">
          <span aria-hidden="true">/</span>
          <UiLink :to="cadernoPath(p.id)" variant="muted">{{ p.name }}</UiLink>
        </template>
      </nav>

      <div class="mt-3 flex items-start gap-3">
        <UiSubjectMark :color="markColor" :index="markIndex" size="lg" class="mt-2.5 sm:mt-3.5" />
        <h1 class="min-w-0 flex-1 text-page-title-sm break-words text-fg-strong sm:text-page-title">{{ summary.topic.name }}</h1>
        <UiMenu :items="moreItems" :label="`Mais ações de ${summary.topic.name}`" />
      </div>

      <p v-if="contextLine" class="mt-2 text-body text-fg-muted" data-testid="scope-context">{{ contextLine }}</p>
      <p v-if="empty" class="mt-2 text-body text-fg-muted">Comece adicionando o que você vai estudar.</p>
    </div>

    <!-- Context only: the percentages; the one number of review is on the button (RN 1) -->
    <div v-if="!empty && hasCards" class="flex flex-wrap items-end gap-x-10 gap-y-4">
      <UiStat :value="`${mastery}%`" :label="`de domínio · ${fmt(summary.mastery.in_day)} de ${fmt(summary.mastery.cards)} em dia`">
        <UiProgressBar class="mt-2 w-40" :value="mastery" :label="`Domínio de ${summary.topic.name}`" />
      </UiStat>
      <UiStat v-if="accuracy !== null" :value="`${accuracy}%`" :label="`de acerto em ${fmt(summary.questions!.answered)} questões`" />
    </div>

    <div v-if="!empty" class="flex flex-col gap-2">
      <div class="flex flex-wrap items-center gap-2.5">
        <!-- The primary of the screen; on the phone the fixed bar carries it (RF-F11) -->
        <UiButton v-if="sessionCount > 0" variant="primary" :to="reviewPath(summary.topic.id)" class="max-md:hidden" data-testid="scope-review">
          Revisar hoje · {{ sessionCount }}
        </UiButton>
        <UiButton v-else-if="generateTarget" variant="primary" :to="generateTarget.to" :icon-left="Sparkles" data-testid="scope-generate">
          {{ generateTarget.label }}
        </UiButton>
        <p v-else-if="hasCards" class="text-body text-fg-muted" data-testid="scope-done">Tudo em dia por hoje.</p>

        <UiButton v-if="quizInHeader" :icon-left="CircleHelp" icon-tone="quiz" :to="quizPath" data-testid="scope-quiz">Questões</UiButton>
        <UiButton :icon-left="Headphones" icon-tone="listen" data-testid="scope-listen" @click="$emit('listen')">{{ listenLabel }}</UiButton>
      </div>

      <p v-if="quizInHeader && quizBlocked" class="text-meta text-fg-muted">Questões: {{ quizBlocked }}</p>
      <p v-if="overdue > sessionCount" class="text-meta text-fg-muted" data-testid="scope-overdue">
        {{ fmt(overdue) }} atrasados ·
        <UiLink :to="`/revisar?topic_id=${summary.topic.id}&backlog=1`">Recuperar atraso</UiLink>
      </p>
      <p v-if="!isRoot && sessionCount > 0" class="text-meta text-fg-muted">
        O Revisar hoje de {{ root.name }} já inclui {{ sessionCount === 1 ? 'este 1' : `estes ${sessionCount}` }}.
      </p>
    </div>
  </UiSection>
</template>

<script setup lang="ts">
// Header of the scope (prd-4b-caderno-v3 RF-F3): path with the caderno switch, title with the dot of its
// color, context (exam, pace, mode) and ONE number of review: "Revisar hoje · N" = session.count, the same
// as the list, Hoje, the phone bar and the session. Mastery and accuracy are context. Questões sits next to
// Revisar in the exam mode (§0.4.1, D8); in the others Ouvir stays here and Questões goes to Praticar (D11).
import { ChevronDown, CircleHelp, Headphones, Sparkles } from 'lucide-vue-next'
import type { MenuItem } from '~/components/ui/Menu.vue'
import type { MaterialRow, ScopeSummary } from '~/types'
import { learningModeLabel } from '~/utils/learningModes'
import { requirementText } from '~/utils/studyRequirement'
import { reviewPath } from '~/utils/reviewScope'

const props = defineProps<{
  summary: ScopeSummary
  /** Other cadernos for the ▾ switch (`/topics` roots) */
  roots: { id: string; name: string }[]
  /** First material row, for "Gerar cards de…" when the server has no next step */
  firstMaterial?: MaterialRow | null
}>()

const fmt = (n: number) => n.toLocaleString('pt-BR')

const isRoot = computed(() => props.summary.topic.depth === 0)
const root = computed(() => (isRoot.value ? { id: props.summary.topic.id, name: props.summary.topic.name } : props.summary.path[0]!))
/** Ancestors between the root and the scope */
const middlePath = computed(() => props.summary.path.slice(1))
const otherRoots = computed(() => props.roots.filter(r => r.id !== root.value.id))
const rootItems = computed<MenuItem[]>(() => otherRoots.value.map(r => ({ label: r.name, to: cadernoPath(r.id) })))

const markColor = computed(() => props.summary.topic.color)
// A matéria without its own color: a stable tone from its id (the hub list uses the same position rule)
const markIndex = computed(() => (props.summary.topic.color ? undefined : [...props.summary.topic.id].reduce((a, c) => a + c.charCodeAt(0), 0)))

const hasCards = computed(() => props.summary.counts.cards > 0)
const empty = computed(() => !hasCards.value && props.summary.counts.materials === 0)
const mastery = computed(() => props.summary.mastery.percent ?? 0)
const accuracy = computed(() => props.summary.questions?.accuracy ?? null)
const sessionCount = computed(() => props.summary.session.count)
const overdue = computed(() => props.summary.session.overdue)
const mode = computed(() => props.summary.topic.learning_mode)

const contextLine = computed(() => {
  const parts: string[] = []
  const exam = props.summary.exam
  if (exam) {
    parts.push(exam.days_remaining === 0 ? 'Prova hoje' : `Prova em ${exam.days_remaining} ${exam.days_remaining === 1 ? 'dia' : 'dias'}`)
    if (exam.cards_per_day) parts.push(`${exam.cards_per_day} cards por dia`)
  }
  const label = learningModeLabel(mode.value)
  if (label && isRoot.value) parts.push(label)
  if (!isRoot.value) {
    const { subjects, materials } = props.summary.counts
    if (subjects) parts.push(`${subjects} ${subjects === 1 ? 'assunto' : 'assuntos'}`)
    if (materials) parts.push(`${materials} ${materials === 1 ? 'material' : 'materiais'}`)
  }
  return parts.join(' · ')
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

const quizInHeader = computed(() => mode.value === 'exam')
const quizPath = computed(() => `/simulados?topic_id=${props.summary.topic.id}`)
const quizBlocked = computed(() => requirementText(props.summary.can_quiz))
const listenLabel = computed(() => {
  const ep = props.summary.listen
  if (!ep) return 'Ouvir'
  const min = Math.max(1, Math.round((ep.duration_seconds ?? 0) / 60))
  return ep.duration_seconds ? `Ouvir · ${min} min` : 'Ouvir'
})

const moreItems = computed<MenuItem[]>(() => {
  const id = props.summary.topic.id
  const errors = props.summary.session.errors
  return [
    { label: 'Relâmpago', meta: '5 minutos, os mais urgentes', to: `/revisar?mode=blitz&topic_id=${id}`, disabled: !hasCards.value },
    { label: errors > 0 ? `Só erros (${errors})` : 'Só erros', meta: errors > 0 ? undefined : 'nenhum agora', to: errors > 0 ? reviewPath(id, { errorsOnly: true }) : undefined, disabled: errors === 0 },
    { label: 'Editar', meta: isRoot.value ? 'nome, cor e modo' : 'nome e cor', separator: true, onSelect: () => emitEdit() },
    { label: 'Excluir', tone: 'danger', onSelect: () => emitDelete() },
  ]
})

const emit = defineEmits<{ (e: 'listen'): void; (e: 'edit'): void; (e: 'delete'): void }>()
function emitEdit() { emit('edit') }
function emitDelete() { emit('delete') }
</script>
