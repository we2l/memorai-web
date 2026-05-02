<template>
  <UiModal v-model="open" size="md" aria-label="Criar card do PDF">
    <h2 class="text-headline mb-4">Criar card</h2>
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <div>
        <label for="pdf-card-front" class="text-label mb-1 block">Frente</label>
        <textarea id="pdf-card-front" v-model="form.front" class="textarea-base" rows="3" placeholder="Pergunta..." />
      </div>
      <div>
        <label for="pdf-card-back" class="text-label mb-1 block">Verso</label>
        <textarea id="pdf-card-back" v-model="form.back" class="textarea-base" rows="3" placeholder="Resposta..." />
      </div>
      <div>
        <label class="text-label mb-1 block">Deck</label>
        <UiSelect v-model="form.deck_id" :options="deckOptions" placeholder="Selecione um deck" />
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
const props = defineProps<{ selectedText?: string; topicId: string }>()
const open = defineModel<boolean>({ required: true })

const { $api } = useNuxtApp()
const deckStore = useDeckStore()
const toast = useToast()
const saving = ref(false)
const form = reactive({ front: '', back: '', deck_id: '' })

const deckOptions = computed(() =>
  deckStore.decks.map(d => ({ value: d.id, label: d.name })),
)

watch(() => props.selectedText, (text) => {
  if (text) form.front = text
}, { immediate: true })

watch(open, (val) => {
  if (val && !deckStore.decks.length) deckStore.fetchDecks()
})

async function submit() {
  saving.value = true
  try {
    await $api('/flashcards', {
      method: 'POST',
      body: {
        front: form.front,
        back: form.back,
        deck_id: form.deck_id,
        topic_id: props.topicId,
      },
    })
    toast.show('Card criado!', 'success')
    open.value = false
    form.front = ''
    form.back = ''
  } catch {
    toast.show('Erro ao criar card.', 'error')
  } finally {
    saving.value = false
  }
}
</script>
