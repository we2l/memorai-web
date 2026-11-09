<template>
  <header class="flex flex-col" data-testid="scope-header">
    <!-- Path: Cadernos › {root} ▾ › {matéria}; the ▾ switches to another caderno -->
    <nav aria-label="Caminho" class="flex flex-wrap items-center gap-x-1 text-meta text-fg-muted">
      <UiLink to="/cadernos" variant="muted">Cadernos</UiLink>
      <ChevronRight class="size-3.5" aria-hidden="true" />
      <span class="inline-flex items-center">
        <UiLink :to="cadernoPath(root.id)" variant="muted" :aria-current="isRoot ? 'page' : undefined">{{ root.name }}</UiLink>
        <UiMenu v-if="otherRoots.length" :items="rootItems" label="Trocar de caderno" align="start">
          <template #trigger="{ props: trigger }">
            <UiIconButton :icon="ChevronDown" label="Trocar de caderno" size="sm" v-bind="trigger" />
          </template>
        </UiMenu>
      </span>
      <template v-for="p in middlePath" :key="p.id">
        <ChevronRight class="size-3.5" aria-hidden="true" />
        <UiLink :to="cadernoPath(p.id)" variant="muted">{{ p.name }}</UiLink>
      </template>
    </nav>

    <div class="mt-2 flex items-start gap-3">
      <UiSubjectMark v-if="!isRoot" :color="markColor" :index="markIndex" size="lg" class="mt-2.5 lg:mt-3" />
      <h1 class="min-w-0 flex-1 text-page-title break-words text-fg-strong">{{ summary.topic.name }}</h1>
      <UiTag v-if="summary.topic.is_sample" class="mt-1.5" data-testid="sample-tag">Exemplo</UiTag>
      <UiMenu :items="moreItems" :label="`Mais ações de ${summary.topic.name}`" />
    </div>

    <p v-if="contextLine" class="mt-1 text-meta text-fg-muted" data-testid="scope-context">{{ contextLine }}</p>
    <p v-if="empty" class="mt-1 text-body text-fg-muted">Comece adicionando o que você vai estudar.</p>
  </header>
</template>

<script setup lang="ts">
// Header of the scope (prd-4b-caderno-v3 RF-F3; E2 RF-4.2): path with the caderno switch, the title (with the dot of
// its color below a caderno), the context line (exam, pace, mode, cards) and the ⋯. The numbers and the actions live
// in CadernoScopeStats, the side of the hub.
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import type { MenuItem } from '~/components/ui/Menu.vue'
import type { ScopeSummary } from '~/types'
import { learningModeLabel } from '~/utils/learningModes'
import { reviewPath } from '~/utils/reviewScope'

const props = defineProps<{
  summary: ScopeSummary
  /** Other cadernos for the ▾ switch (`/topics` roots) */
  roots: { id: string; name: string }[]
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
const mode = computed(() => props.summary.topic.learning_mode)

const contextLine = computed(() => {
  const parts: string[] = []
  const exam = props.summary.exam
  if (exam) {
    parts.push(exam.days_remaining === 0 ? 'Prova hoje' : `Prova em ${exam.days_remaining} ${exam.days_remaining === 1 ? 'dia' : 'dias'}`)
    if (exam.cards_per_day) parts.push(`${exam.cards_per_day} ${exam.cards_per_day === 1 ? 'card' : 'cards'} por dia`)
    // The projection on the day if the pace is kept (prd-4f-progresso-v3 RF-F10)
    if (exam.projection) parts.push(`projeção ${exam.projection.keep_pace}%`)
  }
  const label = learningModeLabel(mode.value)
  if (label && isRoot.value) parts.push(label)
  if (hasCards.value) parts.push(`${fmt(props.summary.counts.cards)} ${props.summary.counts.cards === 1 ? 'card' : 'cards'}`)
  if (!isRoot.value) {
    const { subjects, materials } = props.summary.counts
    if (subjects) parts.push(`${subjects} ${subjects === 1 ? 'assunto' : 'assuntos'}`)
    if (materials) parts.push(`${materials} ${materials === 1 ? 'material' : 'materiais'}`)
  }
  return parts.join(' · ')
})

const moreItems = computed<MenuItem[]>(() => {
  const id = props.summary.topic.id
  const errors = props.summary.session.errors
  return [
    { label: 'Relâmpago', meta: '5 minutos, os mais urgentes', to: `/revisar?mode=blitz&topic_id=${id}`, disabled: !hasCards.value },
    { label: errors > 0 ? `Só erros (${errors})` : 'Só erros', meta: errors > 0 ? undefined : 'nenhum agora', to: errors > 0 ? reviewPath(id, { errorsOnly: true }) : undefined, disabled: errors === 0 },
    // The exam as the goal of the caderno or matéria (prd-4f-progresso-v3 RF-F10, D9)
    ...(canSetExam.value ? [{ label: 'Definir prova', meta: 'data e o que cai', separator: true, onSelect: () => emit('exam') }] : []),
    ...(canSetExam.value && props.summary.exam ? [{ label: 'Ver as provas', meta: 'em Progresso', to: '/progresso#provas' }] : []),
    { label: 'Editar', meta: isRoot.value ? 'nome, cor e modo' : 'nome e cor', separator: true, onSelect: () => emitEdit() },
    ...(props.summary.topic.is_sample ? [] : [{ label: 'Mover para…', onSelect: () => emit('move') }]),
    // The sample of the onboarding goes away the same way: nothing of the person's is in it (prd-4g RF-F9)
    { label: props.summary.topic.is_sample ? 'Apagar o exemplo' : 'Excluir', tone: 'danger', onSelect: () => emitDelete() },
  ]
})

const emit = defineEmits<{ (e: 'listen' | 'edit' | 'move' | 'delete' | 'exam'): void }>()
/** "Definir prova": the caderno or a matéria, in the modes with exams (concurso, faculdade) */
const canSetExam = computed(() => props.summary.topic.depth <= 1 && ['exam', 'academic'].includes(mode.value ?? ''))
function emitEdit() { emit('edit') }
function emitDelete() { emit('delete') }
</script>
