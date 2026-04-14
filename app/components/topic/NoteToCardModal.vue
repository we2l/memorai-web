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
      <div>
        <label for="card-deck" class="text-label mb-1 block">Deck</label>
        <select id="card-deck" v-model="form.deck_id" class="input-base w-full">
          <option value="" disabled>Selecione um deck</option>
          <option v-for="deck in deckStore.decks" :key="deck.id" :value="deck.id">{{ deck.name }}</option>
        </select>
      </div>
      <div class="flex gap-3 justify-end">
        <button type="button" class="btn-secondary" @click="open = false">Cancelar</button>
        <button type="submit" class="btn-primary" :disabled="!form.front || !form.back || !form.deck_id || saving">
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
const deckStore = useDeckStore()
const toast = useToast()
const saving = ref(false)
const form = reactive({ front: '', back: '', deck_id: '' })

watch(() => props.selectedText, (text) => {
  if (text) form.front = text
}, { immediate: true })

watch(open, (val) => {
  if (val && !deckStore.decks.length) deckStore.fetchDecks()
})

async function submit() {
  saving.value = true
  try {
    await noteStore.createFlashcard(props.noteId, {
      front: form.front,
      back: form.back,
      deck_id: form.deck_id,
    })
    toast.show('Card criado!', 'success')
    open.value = false
    form.front = ''
    form.back = ''
    emit('created')
  } catch {
    toast.show('Erro ao criar card.', 'error')
  } finally {
    saving.value = false
  }
}
</script>
