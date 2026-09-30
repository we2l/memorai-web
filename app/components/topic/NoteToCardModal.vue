<template>
  <UiModal v-model="open" size="md" aria-label="Criar card a partir da nota">
    <h2 class="text-headline mb-4">Criar card</h2>
    <form @submit.prevent="submit" class="flex flex-col gap-4">
      <div>
        <label for="card-front" class="text-label mb-1 block">Frente</label>
        <textarea id="card-front" v-model="form.front" class="textarea-base" rows="3" placeholder="Pergunta..." />
      </div>
      <div>
        <label for="card-back" class="text-label mb-1 block">Verso</label>
        <textarea id="card-back" v-model="form.back" class="textarea-base" rows="3" placeholder="Resposta..." />
      </div>
      <p v-if="notebookName" class="text-small text-base-muted">Caderno: <span class="text-base-primary font-medium">{{ notebookName }}</span></p>
      <div class="flex gap-3 justify-end">
        <button type="button" class="btn-secondary" @click="open = false">Cancelar</button>
        <button type="submit" class="btn-primary" :disabled="!form.front || !form.back || saving">
          {{ saving ? 'Salvando...' : 'Criar card' }}
        </button>
      </div>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
const props = defineProps<{ noteId: string; selectedText?: string }>()
const emit = defineEmits<{ (e: 'created'): void }>()
const open = defineModel<boolean>({ required: true })

const noteStore = useNoteStore()
const topicStore = useTopicStore()
const toast = useToast()
const saving = ref(false)
const form = reactive({ front: '', back: '' })

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
