<template>
  <UiSection title="Desempenho por matéria e assunto" data-testid="progress-performance">
    <template #action>
      <UiSelect v-model="order" :options="ORDERS" label="Ordem" hide-label class="w-52" data-testid="performance-order" />
    </template>

    <p v-if="!lines.length" class="text-body text-fg-muted">Crie matérias no caderno para ver o desempenho de cada uma.</p>
    <div v-else role="table" aria-label="Desempenho por matéria e assunto" class="-mx-1">
      <div role="row" class="hidden grid-cols-12 gap-4 border-b border-hairline px-1 pb-2 text-label text-fg-muted sm:grid">
        <span role="columnheader" class="col-span-4">Matéria e assunto</span>
        <span role="columnheader" class="col-span-3">Domínio dos cards</span>
        <span role="columnheader" class="col-span-3">Acerto em questões</span>
        <span role="columnheader" class="col-span-2 text-right"><span class="sr-only">Ação</span></span>
      </div>
      <div role="rowgroup" class="divide-y divide-hairline">
        <div v-for="line in lines" :key="line.row.topic_id" role="row" class="grid grid-cols-12 items-center gap-x-4 gap-y-1.5 px-1 py-3" :data-testid="`performance-${line.row.topic_id}`">
          <span role="rowheader" class="col-span-9 flex min-w-0 items-center gap-2 sm:col-span-4" :class="line.indent && 'pl-6'">
            <UiIconButton
              v-if="line.expandable"
              :icon="expanded.has(line.row.topic_id) ? ChevronDown : ChevronRight"
              :label="`${expanded.has(line.row.topic_id) ? 'Esconder' : 'Ver'} as matérias de ${line.row.name}`"
              :pressed="expanded.has(line.row.topic_id)"
              size="sm"
              class="-ml-2"
              @click="toggle(line.row.topic_id)"
            />
            <UiSubjectMark v-else-if="!line.indent" :index="line.index" />
            <span class="min-w-0 break-words" :class="line.indent ? 'text-fg' : 'font-medium text-fg-strong'">{{ line.row.name }}</span>
          </span>
          <span role="cell" class="col-span-6 flex items-center gap-2 text-meta tabular-nums text-fg-strong sm:col-span-3">
            <span class="sm:hidden text-fg-muted">Domínio</span>
            <template v-if="line.row.mastery !== null">
              <span class="w-9">{{ line.row.mastery }}%</span>
              <UiProgressBar :value="line.row.mastery" :label="`Domínio de ${line.row.name}`" class="flex-1" />
            </template>
            <span v-else class="text-fg-muted">sem cards</span>
          </span>
          <span role="cell" class="col-span-6 flex items-center gap-2 text-meta tabular-nums text-fg-strong sm:col-span-3">
            <span class="sm:hidden text-fg-muted">Questões</span>
            <template v-if="line.row.questions.accuracy !== null">
              <span class="w-9">{{ line.row.questions.accuracy }}%</span>
              <UiProgressBar :value="line.row.questions.accuracy" tone="neutral" :label="`Acerto em questões de ${line.row.name}`" class="flex-1" />
            </template>
            <span v-else class="text-fg-muted">— <span class="text-label">faça 10 questões</span></span>
          </span>
          <span role="cell" class="col-span-3 col-start-10 row-start-1 flex justify-end sm:col-span-2 sm:col-start-auto sm:row-start-auto">
            <UiButton v-if="line.action.kind === 'train'" size="sm" variant="ghost" :icon-left="CircleHelp" icon-tone="quiz" @click="act(line.action.kind, line.row)">Treinar</UiButton>
            <UiButton v-else size="sm" variant="ghost" :to="line.action.to" class="whitespace-nowrap" @click="act(line.action.kind, line.row)">{{ line.action.label }}</UiButton>
          </span>
        </div>
      </div>
    </div>
  </UiSection>
</template>

<script setup lang="ts">
// Performance by matéria and assunto (prd-4f-progresso-v3 RF-F5): mastery of the cards (purple bar) and
// accuracy in questions (neutral bar, "—" under 10 answered), with the right action per line: "Treinar" (accuracy
// below 60% with ≥ 10 answered: 20 questions of it), "Revisar N" (its session) or "Abrir". A caderno shows its
// matérias and assuntos; "Todos os cadernos" one line per caderno that expands its matérias. On the phone each
// line is 2 rows, no horizontal scroll.
import { ChevronDown, ChevronRight, CircleHelp } from 'lucide-vue-next'
import type { TopicPerformance } from '~/types'
import { cadernoPath } from '~/utils/scope'
import { reviewPath } from '~/utils/reviewScope'

const props = defineProps<{
  rows: TopicPerformance[]
  /** The caderno of the scope; null = all cadernos */
  rootId: string | null
}>()
const emit = defineEmits<{ train: [topicId: string] }>()

const ORDERS = [
  { value: 'tree', label: 'Ordem do caderno' },
  { value: 'weak', label: 'Mais fracos primeiro' },
]
const order = ref('tree')
const expanded = ref(new Set<string>())

type Action = { kind: 'train' } | { kind: 'review' | 'open'; to: string; label: string }

function actionOf(r: TopicPerformance): Action {
  if (r.questions.accuracy !== null && r.questions.answered >= 10 && r.questions.accuracy < 60) return { kind: 'train' }
  if (r.session_count > 0) return { kind: 'review', to: reviewPath(r.topic_id), label: `Revisar ${r.session_count}` }
  return { kind: 'open', to: cadernoPath(r.topic_id), label: 'Abrir' }
}

/** The weakest first: the lower of accuracy and mastery (a line without both goes last) */
const weakness = (r: TopicPerformance) => Math.min(r.questions.accuracy ?? 101, r.mastery ?? 101)

const lines = computed(() => {
  const byParent = new Map<string | null, TopicPerformance[]>()
  for (const r of props.rows) byParent.set(r.parent_id, [...(byParent.get(r.parent_id) ?? []), r])
  const sort = (list: TopicPerformance[]) => (order.value === 'weak' ? [...list].sort((a, b) => weakness(a) - weakness(b)) : list)
  const out: { row: TopicPerformance; indent: boolean; expandable: boolean; index: number; action: Action }[] = []
  if (props.rootId) {
    sort(byParent.get(props.rootId) ?? []).forEach((m, i) => {
      out.push({ row: m, indent: false, expandable: false, index: i, action: actionOf(m) })
      for (const a of sort(byParent.get(m.topic_id) ?? [])) out.push({ row: a, indent: true, expandable: false, index: i, action: actionOf(a) })
    })
  } else {
    sort(props.rows.filter(r => r.depth === 0)).forEach((root, i) => {
      out.push({ row: root, indent: false, expandable: (byParent.get(root.topic_id) ?? []).length > 0, index: i, action: actionOf(root) })
      if (expanded.value.has(root.topic_id)) {
        for (const m of sort(byParent.get(root.topic_id) ?? [])) out.push({ row: m, indent: true, expandable: false, index: i, action: actionOf(m) })
      }
    })
  }
  return out
})

function toggle(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function act(kind: Action['kind'], row: TopicPerformance) {
  useAnalytics().track('performance_action', { action: kind === 'train' ? 'train' : kind })
  if (kind === 'train') emit('train', row.topic_id)
}
</script>
