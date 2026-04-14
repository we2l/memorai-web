<template>
  <UiModal v-model="open" size="md" aria-label="Adicionar flashcard">
    <h2 class="text-headline mb-4">Novo card</h2>
    <form @submit.prevent="submit" class="flex flex-col gap-4">
      <div>
        <label for="card-front" class="text-label mb-1 block">Frente</label>
        <textarea id="card-front" v-model="form.front" class="textarea-base" rows="3" placeholder="Digite a pergunta..." />
      </div>
      <div>
        <label for="card-back" class="text-label mb-1 block">Verso</label>
        <textarea id="card-back" v-model="form.back" class="textarea-base" rows="3" placeholder="Digite a resposta..." />
      </div>
      <div class="flex gap-3 justify-end">
        <button type="button" class="btn-secondary" @click="open = false">Cancelar</button>
        <button type="submit" class="btn-primary" :disabled="!form.front || !form.back || saving">
          {{ saving ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
const props = defineProps<{ deckId: string }>()
const emit = defineEmits<{ (e: 'created'): void }>()
const open = defineModel<boolean>({ required: true })

const flashcardStore = useFlashcardStore()
const deckStore = useDeckStore()
const toast = useToast()
const saving = ref(false)
const form = reactive({ front: '', back: '' })

async function submit() {
  saving.value = true
  try {
    await flashcardStore.create(props.deckId, { front: form.front, back: form.back })
    toast.show('Card criado!', 'success')
    open.value = false
    form.front = ''
    form.back = ''
    await deckStore.fetchDeck(props.deckId)
    emit('created')
  } catch {
    toast.show('Erro ao criar card.', 'error')
  } finally {
    saving.value = false
  }
}
</script>
