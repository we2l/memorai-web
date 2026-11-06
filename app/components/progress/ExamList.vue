<template>
  <UiSection id="provas" title="Provas" class="scroll-mt-24" data-testid="progress-exams">
    <template #action>
      <UiButton size="sm" :icon-left="Plus" data-testid="exam-new" @click="emit('create')">Nova prova</UiButton>
    </template>

    <p v-if="limitReached" role="status" class="mb-3 flex flex-wrap items-center gap-x-2 rounded-row bg-subtle px-3 py-2 text-meta text-fg" data-testid="exam-limit">
      No plano Grátis, até 2 provas futuras ao mesmo tempo.
      <UiLink to="/planos">No Pro, sem limite</UiLink>
    </p>

    <p v-if="!exams.length" class="text-body text-fg-muted" data-testid="exams-empty">
      Defina sua prova para ver o ritmo e a projeção.
    </p>
    <template v-else>
      <ul v-if="future.length" class="-my-2 divide-y divide-line">
        <ProgressExamRow
          v-for="e in future"
          :key="e.id"
          :exam="e"
          @edit="emit('edit', e)"
          @delete="emit('delete', e)"
          @reta="emit('reta', e)"
          @ics="emit('ics', e)"
          @google="emit('google', e)"
        />
      </ul>
      <template v-if="past.length">
        <h3 class="mt-5 text-meta font-semibold text-fg-muted">Já passaram</h3>
        <ul class="divide-y divide-line">
          <ProgressExamRow
            v-for="e in past"
            :key="e.id"
            :exam="e"
            :saving="savingOutcome?.id === e.id ? savingOutcome.outcome : null"
            @edit="emit('edit', e)"
            @delete="emit('delete', e)"
            @outcome="emit('outcome', e, $event)"
            @ics="emit('ics', e)"
            @google="emit('google', e)"
          />
        </ul>
      </template>
    </template>
  </UiSection>
</template>

<script setup lang="ts">
// The agenda of exams in Progresso (prd-4f-progresso-v3 RF-F3): future ones by date, then the past ones; the
// month calendar left (the list is the agenda and the export reaches the phone's calendar). Free: the limit of
// 2 future exams is said before the form.
import { Plus } from 'lucide-vue-next'
import type { Exam, ExamOutcome } from '~/types'

const props = defineProps<{
  exams: Exam[]
  limitReached?: boolean
  savingOutcome?: { id: string; outcome: ExamOutcome } | null
}>()
const emit = defineEmits<{
  create: []
  edit: [e: Exam]
  delete: [e: Exam]
  reta: [e: Exam]
  ics: [e: Exam]
  google: [e: Exam]
  outcome: [e: Exam, o: ExamOutcome]
}>()

const future = computed(() => props.exams.filter(e => !e.is_past).sort((a, b) => a.exam_date.localeCompare(b.exam_date)))
const past = computed(() => props.exams.filter(e => e.is_past).sort((a, b) => b.exam_date.localeCompare(a.exam_date)))
</script>
