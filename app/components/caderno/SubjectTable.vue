<template>
  <UiSection :title="title" data-testid="scope-subjects">
    <template v-if="canAdd" #action>
      <UiButton size="sm" variant="outline" :icon-left="Plus" data-testid="scope-add-subject" @click="$emit('add')">{{ addLabel }}</UiButton>
    </template>

    <p v-if="!rows.length" class="text-body text-fg-muted">Organize por matéria, como no edital.</p>

    <template v-else>
      <!-- Column names (desktop); each row says its own numbers to a screen reader -->
      <div class="hidden grid-cols-[minmax(0,1fr)_8.5rem_8.5rem_3rem] gap-4 pb-2 pl-2 pr-13 text-label text-fg-muted md:grid" aria-hidden="true">
        <span>{{ depthLabel }}</span>
        <span>Domínio dos cards</span>
        <span>Acerto em questões</span>
        <span class="text-right">Hoje</span>
      </div>
      <ul class="-mx-2 divide-y divide-hairline" :aria-label="title">
        <li v-for="row in rows" :key="row.s.id" class="flex items-center gap-1">
          <NuxtLink
            :to="cadernoPath(row.s.id)"
            :aria-label="accessibleName(row.s)"
            class="block min-h-touch min-w-0 flex-1 rounded-row px-2 py-3 transition-colors duration-fast hover:bg-soft md:grid md:grid-cols-[minmax(0,1fr)_8.5rem_8.5rem_3rem] md:items-center md:gap-4"
            data-testid="subject-row"
            @click="$emit('open', row.s)"
          >
            <span class="flex min-w-0 items-center gap-2.5" :class="row.level === 2 && 'pl-5'">
              <UiSubjectMark v-if="row.level === 1" :color="row.s.color" :index="row.index" />
              <span class="min-w-0 line-clamp-2 break-words" :class="row.level === 1 ? 'font-semibold text-fg-strong' : 'text-fg'">{{ row.s.name }}</span>
              <UiTag v-if="row.s.weak" tone="warning" class="shrink-0">ponto fraco</UiTag>
              <span class="ml-auto font-semibold tabular-nums text-fg-strong md:hidden" aria-hidden="true">{{ row.s.session_count }}</span>
            </span>

            <!-- Phone: the two bars under the name (no horizontal scroll) -->
            <span class="mt-2 grid grid-cols-2 gap-4 md:hidden" :class="row.level === 2 && 'pl-5'" aria-hidden="true">
              <UiProgressBar v-if="row.s.mastery !== null" :value="row.s.mastery" :subject="toneOf(row)" label="" show-value />
              <span v-else class="text-meta text-fg-muted">Sem cards</span>
              <UiProgressBar v-if="row.s.questions?.accuracy != null" :value="row.s.questions.accuracy" tone="neutral" label="" show-value />
              <span v-else class="text-meta text-fg-muted">Questões —</span>
            </span>

            <span class="hidden md:block" aria-hidden="true">
              <UiProgressBar v-if="row.s.mastery !== null" :value="row.s.mastery" :subject="toneOf(row)" label="" show-value />
              <span v-else class="text-meta text-fg-muted">—</span>
            </span>
            <span class="hidden md:block" aria-hidden="true">
              <UiProgressBar v-if="row.s.questions?.accuracy != null" :value="row.s.questions.accuracy" tone="neutral" label="" show-value />
              <span v-else class="block text-meta text-fg-muted">— <span class="text-label">{{ questionsHint(row.s) }}</span></span>
            </span>
            <span class="hidden text-right font-semibold tabular-nums text-fg-strong md:block" aria-hidden="true">{{ row.s.session_count }}</span>
          </NuxtLink>
          <UiMenu :items="menuOf(row.s)" :label="`Mais ações de ${row.s.name}`" />
        </li>
      </ul>
    </template>
  </UiSection>
</template>

<script setup lang="ts">
// Matérias e assuntos of the scope (prd-4b-caderno-v3 RF-F5): up to 2 levels below it, each with the
// mastery of its cards (purple bar), the accuracy in questions (neutral bar, only with ≥ 10 answered) and
// "Hoje" (its session, a black number). The row is a link to the same hub with the smaller scope, with a ⋯ beside
// it (Mover para…, Excluir); on the phone the numbers go to a second line (no horizontal scroll).
import { Plus } from 'lucide-vue-next'
import type { MenuItem } from '~/components/ui/Menu.vue'
import type { ScopeSubject } from '~/types'

const props = defineProps<{
  subjects: ScopeSubject[]
  /** Depth of the open scope (0 = caderno) */
  scopeDepth: number
  canAdd: boolean
}>()
const emit = defineEmits<{
  (e: 'add'): void
  (e: 'open' | 'move' | 'delete', subject: ScopeSubject): void
}>()

const title = computed(() => (props.scopeDepth === 0 ? 'Matérias' : 'Assuntos'))
const depthLabel = computed(() => (props.scopeDepth === 0 ? 'Matéria e assunto' : 'Assunto'))
const addLabel = computed(() => (props.scopeDepth === 0 ? 'Matéria' : 'Assunto'))

/** Each first-level subject followed by its children, in the API order (position). */
const rows = computed(() => {
  const top = props.subjects.filter(s => s.depth === props.scopeDepth + 1)
  const out: { s: ScopeSubject; level: 1 | 2; index: number }[] = []
  top.forEach((s, index) => {
    out.push({ s, level: 1, index })
    for (const child of props.subjects) if (child.parent_id === s.id) out.push({ s: child, level: 2, index })
  })
  return out
})

const menuOf = (s: ScopeSubject): MenuItem[] => [
  { label: 'Mover para…', onSelect: () => emit('move', s) },
  { label: 'Excluir', tone: 'danger', onSelect: () => emit('delete', s) },
]

const questionsHint = (s: ScopeSubject) => ((s.questions?.answered ?? 0) > 0 ? `${s.questions!.answered} de 10 questões` : 'faça 10 questões')

/** The bar of mastery in the color of the matéria (its dot); an assunto takes its matéria's (ADR-035 §1) */
function toneOf(row: { s: ScopeSubject; level: 1 | 2; index: number }): number {
  const top = row.level === 1 ? row.s : props.subjects.find(p => p.id === row.s.parent_id)
  return subjectTone(top?.color, row.index)
}

function accessibleName(s: ScopeSubject): string {
  const parts = [s.name]
  if (s.weak) parts.push('ponto fraco')
  parts.push(s.mastery !== null ? `domínio ${s.mastery}%` : 'sem cards')
  parts.push(s.questions?.accuracy != null ? `acerto em questões ${s.questions.accuracy}%` : 'acerto em questões: faça 10 questões')
  parts.push(`${s.session_count} para hoje`)
  return parts.join(', ')
}
</script>
