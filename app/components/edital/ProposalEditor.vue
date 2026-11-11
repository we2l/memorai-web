<template>
  <div class="flex flex-col gap-4">
    <UiSection>
      <div class="flex flex-col gap-4">
        <UiInput v-model="draft.name" label="Nome do caderno" :error="draft.name.trim() ? undefined : 'Dê um nome ao caderno.'" maxlength="255" data-testid="edital-name" />
        <UiInput
          v-model="draft.examDate"
          type="date"
          label="Data da prova"
          optional
          :min="minDate"
          :hint="examHint"
          data-testid="edital-exam-date"
        />
        <p class="text-meta text-fg-muted" data-testid="edital-source">{{ sourceLine }}</p>
        <p v-if="source.truncated" class="rounded-tile bg-warning-subtle p-3 text-meta text-fg-strong">
          O conteúdo passou do limite de uma leitura e lemos só o começo. Se faltar matéria, acrescente aqui.
        </p>
      </div>
    </UiSection>

    <ul class="flex flex-col gap-3" :aria-label="`Matérias do caderno, ${countsText}`">
      <EditalSubjectBlock
        v-for="(subject, i) in draft.subjects"
        :key="subject.key"
        v-model="draft.subjects[i]!"
        :index="i"
        :start-open="i === 0"
        :can-add="canAddEditalTopic(draft, subject)"
        @remove="removeSubject(i)"
      />
    </ul>

    <div>
      <UiButton variant="outline" :icon-left="Plus" :disabled="!canAddEditalSubject(draft)" data-testid="edital-add-subject" @click="addSubject">
        Matéria
      </UiButton>
      <p v-if="!canAddEditalSubject(draft)" class="mt-1 text-meta text-fg-muted">O caderno vai até {{ EDITAL_LIMITS.subjects }} matérias.</p>
      <p v-else-if="overTopics" class="mt-1 text-meta text-danger">O caderno vai até {{ EDITAL_LIMITS.topics }} assuntos. Tire alguns antes de criar.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// The proposal of an edital, editable before the caderno exists (prd-edital-caderno RF-F1, estado 3): name, exam date
// (only when the edital says it; the person checks), where it was read from, and the matérias with their assuntos.
import { Plus } from 'lucide-vue-next'
import type { EditalReadResult } from '~/types'
import { canAddEditalSubject, canAddEditalTopic, editalCountsLabel, EDITAL_LIMITS, newEditalSubject, editalTopicsCount, type EditalDraft } from '~/utils/editalProposal'

const props = defineProps<{ source: EditalReadResult['source']; hadDate: boolean }>()
const draft = defineModel<EditalDraft>({ required: true })

const minDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
})
const examHint = computed(() => (props.hadDate ? 'Veio do edital. Confira antes de criar.' : 'Com a data, o caderno ganha a prova, a projeção e a reta final.'))
const countsText = computed(() => editalCountsLabel(draft.value.subjects.length, editalTopicsCount(draft.value)))
const overTopics = computed(() => editalTopicsCount(draft.value) > EDITAL_LIMITS.topics)

const sourceLine = computed(() => {
  const s = props.source
  if (s.kind === 'text') return 'Lemos o texto colado.'
  const pages = s.pages ? (s.pages.from === s.pages.to ? `a página ${s.pages.from}` : `as páginas ${s.pages.from} a ${s.pages.to}`) : 'o PDF'
  return `Lemos ${pages}${s.total_pages ? ` de ${s.total_pages}` : ''}.`
})

function addSubject() {
  draft.value.subjects.push(newEditalSubject())
  void nextTick(() => {
    const names = document.querySelectorAll<HTMLInputElement>('[data-testid="edital-subject-name"]')
    names[names.length - 1]?.focus()
  })
}

function removeSubject(i: number) {
  draft.value.subjects.splice(i, 1)
}
</script>
