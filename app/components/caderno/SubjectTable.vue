<template>
  <UiSection :title="title" data-testid="scope-subjects">
    <template v-if="canAdd" #action>
      <UiButton size="sm" variant="ghost" :icon-left="Plus" data-testid="scope-add-subject" @click="$emit('add')">{{ addLabel }}</UiButton>
    </template>

    <p v-if="!rows.length" class="text-body text-fg-muted">Organize por matéria, como no edital.</p>

    <template v-else>
      <!-- Column names (desktop); each row says its own numbers to a screen reader -->
      <div class="hidden grid-cols-[minmax(0,1fr)_9rem_9rem_4rem] gap-4 border-b border-line px-3 pb-2 text-label text-fg-muted md:grid" aria-hidden="true">
        <span>{{ depthLabel }}</span>
        <span>Domínio</span>
        <span>Questões</span>
        <span class="text-right">Hoje</span>
      </div>
      <ul class="-mx-3 divide-y divide-line md:mx-0" :aria-label="title">
        <li v-for="row in rows" :key="row.s.id">
          <NuxtLink
            :to="cadernoPath(row.s.id)"
            :aria-label="accessibleName(row.s)"
            class="block min-h-touch rounded-row px-3 py-3 transition-colors duration-nav hover:bg-subtle md:grid md:grid-cols-[minmax(0,1fr)_9rem_9rem_4rem] md:items-center md:gap-4"
            data-testid="subject-row"
            @click="$emit('open', row.s)"
          >
            <span class="flex min-w-0 items-center gap-2.5" :class="row.level === 2 && 'pl-5'">
              <UiSubjectMark v-if="row.level === 1" :color="row.s.color" :index="row.index" />
              <span class="min-w-0 break-words" :class="row.level === 1 ? 'font-medium text-fg-strong' : 'text-fg'">{{ row.s.name }}</span>
              <UiTag v-if="row.s.weak" tone="warning" class="shrink-0">ponto fraco</UiTag>
            </span>

            <!-- Phone: one line of numbers under the name -->
            <span class="mt-1 block text-meta text-fg-muted md:hidden" :class="row.level === 2 && 'pl-5'" aria-hidden="true">{{ compactLine(row.s) }}</span>

            <span class="hidden md:block" aria-hidden="true">
              <UiProgressBar v-if="row.s.mastery !== null" :value="row.s.mastery" label="" show-value />
              <span v-else class="text-meta text-fg-muted">—</span>
            </span>
            <span class="hidden md:block" aria-hidden="true">
              <UiProgressBar v-if="row.s.questions?.accuracy != null" :value="row.s.questions.accuracy" tone="neutral" label="" show-value />
              <span v-else class="block text-meta text-fg-muted">— <span class="text-label">{{ questionsHint(row.s) }}</span></span>
            </span>
            <span class="hidden text-right font-semibold tabular-nums text-fg-strong md:block" aria-hidden="true">{{ row.s.session_count }}</span>
          </NuxtLink>
        </li>
      </ul>
    </template>
  </UiSection>
</template>

<script setup lang="ts">
// Matérias e assuntos of the scope (prd-4b-caderno-v3 RF-F5): up to 2 levels below it, each with the
// mastery of its cards (purple bar), the accuracy in questions (neutral bar, only with ≥ 10 answered) and
// "Hoje" (its session, a black number). The row is a link to the same hub with the smaller scope; on the
// phone the numbers go to a second line (no horizontal scroll). A subject being deleted (10 s to undo)
// is hidden with its children.
import { Plus } from 'lucide-vue-next'
import type { ScopeSubject } from '~/types'

const props = defineProps<{
  subjects: ScopeSubject[]
  /** Depth of the open scope (0 = caderno) */
  scopeDepth: number
  canAdd: boolean
}>()
defineEmits<{ (e: 'add'): void; (e: 'open', subject: ScopeSubject): void }>()

const topicStore = useTopicStore()

const title = computed(() => (props.scopeDepth === 0 ? 'Matérias' : 'Assuntos'))
const depthLabel = computed(() => (props.scopeDepth === 0 ? 'Matéria e assunto' : 'Assunto'))
const addLabel = computed(() => (props.scopeDepth === 0 ? 'Matéria' : 'Assunto'))

/** Each first-level subject followed by its children, in the API order (position). */
const rows = computed(() => {
  const hidden = new Set(topicStore.pendingDeletes.keys())
  const visible = props.subjects.filter(s => !hidden.has(s.id) && !(s.parent_id && hidden.has(s.parent_id)))
  const top = visible.filter(s => s.depth === props.scopeDepth + 1)
  const out: { s: ScopeSubject; level: 1 | 2; index: number }[] = []
  top.forEach((s, index) => {
    out.push({ s, level: 1, index })
    for (const child of visible) if (child.parent_id === s.id) out.push({ s: child, level: 2, index })
  })
  return out
})

const questionsHint = (s: ScopeSubject) => ((s.questions?.answered ?? 0) > 0 ? `${s.questions!.answered} de 10 questões` : 'faça 10 questões')

function compactLine(s: ScopeSubject): string {
  const parts = [s.mastery !== null ? `Domínio ${s.mastery}%` : 'Sem cards']
  parts.push(s.questions?.accuracy != null ? `Questões ${s.questions.accuracy}%` : 'Questões —')
  parts.push(`${s.session_count} hoje`)
  return parts.join(' · ')
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
