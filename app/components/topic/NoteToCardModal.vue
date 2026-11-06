<template>
  <UiDialog v-model="open" title="Criar card" description="Do trecho selecionado: o card fica ligado a esta nota." size="md">
    <form :id="formId" class="flex flex-col gap-4" @submit.prevent="submit">
      <UiTextarea v-model="form.front" label="Frente" :rows="3" placeholder="Pergunta..." />
      <UiTextarea v-model="form.back" label="Verso" :rows="3" placeholder="Resposta..." />
      <p v-if="notebookName" class="text-meta text-fg-muted">Caderno: <span class="font-medium text-fg-strong">{{ notebookName }}</span></p>
    </form>
    <template #footer="{ close }">
      <UiButton variant="ghost" @click="close">Cancelar</UiButton>
      <UiButton type="submit" :form="formId" variant="primary" :loading="saving" :disabled="!form.front || !form.back">Criar card</UiButton>
    </template>
  </UiDialog>
</template>

<script setup lang="ts">
// Card from a selected excerpt of the material (prd-4c-material-v3 RF-F5 "Criar card"): POST
// /notes/{id}/flashcards records the note as the card's origin.
const props = defineProps<{ noteId: string; selectedText?: string }>()
const emit = defineEmits<{ (e: 'created'): void }>()
const open = defineModel<boolean>({ required: true })

const noteStore = useNoteStore()
const topicStore = useTopicStore()
const toast = useToast()
const saving = ref(false)
const form = reactive({ front: '', back: '' })
const formId = useId()

// The deck is inferred by the API from the note's root caderno (RF-B7)
const notebookName = computed(() => {
  const note = noteStore.notes.find(n => n.id === props.noteId) ?? noteStore.current
  return topicStore.rootOf(note?.topic_id)?.name ?? ''
})

watch(() => props.selectedText, (text) => {
  if (text) form.front = text
}, { immediate: true })

async function submit() {
  saving.value = true
  try {
    await noteStore.createFlashcard(props.noteId, {
      front: form.front,
      back: form.back,
    })
    toast.show('Card criado!', 'success')
    open.value = false
    form.front = ''
    form.back = ''
    emit('created')
  } catch (e) {
    reportApiError(e, { error: extractApiMessage(e, 'Não foi possível criar o card.') })
  } finally {
    saving.value = false
  }
}
</script>
