<template>
  <li class="rounded-card bg-raised p-4 shadow-1" data-testid="edital-subject">
    <div class="flex items-end gap-2">
      <UiInput
        v-model="subject.name"
        :label="`Matéria ${index + 1}`"
        :error="subject.name.trim() ? undefined : 'Dê um nome ou tire a matéria.'"
        class="min-w-0 flex-1"
        :maxlength="EDITAL_LIMITS.name"
        data-testid="edital-subject-name"
      />
      <UiIconButton :icon="Trash2" :label="`Tirar a matéria ${subject.name || index + 1}`" @click="emit('remove')" />
    </div>

    <button
      type="button"
      class="mt-3 flex min-h-touch w-full items-center justify-between gap-2 rounded-row px-2 text-left text-meta font-medium text-fg-strong transition-colors duration-fast hover:bg-soft"
      :aria-expanded="open"
      :aria-controls="listId"
      data-testid="edital-subject-toggle"
      @click="open = !open"
    >
      <span class="min-w-0">
        {{ subject.topics.length }} {{ subject.topics.length === 1 ? 'assunto' : 'assuntos' }}<span v-if="preview" class="font-normal text-fg-muted" data-testid="edital-subject-preview">: {{ preview }}</span>
      </span>
      <ChevronDown class="size-4 shrink-0 text-fg-muted transition-transform duration-fast" :class="open ? 'rotate-180' : ''" aria-hidden="true" />
    </button>

    <div v-if="open" :id="listId" class="mt-2">
      <ul v-if="subject.topics.length" class="flex flex-col gap-2">
        <li v-for="(topic, i) in subject.topics" :key="topic.key" class="flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <UiInput
              v-model="topic.name"
              :label="`Assunto ${i + 1} de ${subject.name || 'esta matéria'}`"
              hide-label
              :maxlength="EDITAL_LIMITS.name"
              data-testid="edital-topic-name"
            />
            <p v-if="topic.description" class="mt-1 px-1 text-meta break-words text-fg-muted" data-testid="edital-topic-description">{{ topic.description }}</p>
          </div>
          <UiIconButton :icon="X" :label="`Tirar o assunto ${topic.name || i + 1}`" @click="subject.topics.splice(i, 1)" />
        </li>
      </ul>
      <p v-else class="px-2 text-meta text-fg-muted">Sem assuntos: a matéria entra vazia e você acrescenta depois.</p>
      <UiButton
        variant="ghost"
        size="sm"
        :icon-left="Plus"
        class="mt-2"
        :disabled="!canAdd"
        :title="canAdd ? undefined : 'Chegou ao limite de assuntos'"
        @click="addTopic"
      >
        Assunto
      </UiButton>
    </div>
  </li>
</template>

<script setup lang="ts">
// One matéria of the edital's proposal (prd-edital-caderno RF-F1): name, its assuntos (collapsed: an edital can
// bring 400 of them), the item of the edital under each assunto (the articles of a law, whole), and remove/add within
// config/edital.php.
import { ChevronDown, Plus, Trash2, X } from 'lucide-vue-next'
import { EDITAL_LIMITS, newEditalTopic, type DraftSubject } from '~/utils/editalProposal'

const props = defineProps<{ index: number; canAdd: boolean; startOpen?: boolean }>()
const subject = defineModel<DraftSubject>({ required: true })
const emit = defineEmits<{ (e: 'remove'): void }>()

const open = ref(!!props.startOpen)
/** Closed, a matéria of 1-2 assuntos says which ("1 assunto: Código Penal"): one law is one assunto, not a mistake */
const preview = computed(() => {
  const names = subject.value.topics.map(t => t.name.trim()).filter(Boolean)
  return names.length > 0 && names.length <= 2 && names.length === subject.value.topics.length ? names.join(' e ') : ''
})
const listId = useId()

function addTopic() {
  subject.value.topics.push(newEditalTopic())
  void nextTick(() => {
    const inputs = document.querySelectorAll<HTMLInputElement>(`#${CSS.escape(listId)} input`)
    inputs[inputs.length - 1]?.focus()
  })
}
</script>
