<template>
  <UiModal v-model="open" size="md" aria-label="Editar deck">
    <h2 class="text-headline mb-4">Editar deck</h2>
    <form @submit.prevent="submit" class="flex flex-col gap-4">
      <div>
        <label for="deck-name" class="text-label mb-1 block">Nome</label>
        <input id="deck-name" v-model="form.name" type="text" class="input-base w-full" />
      </div>
      <div>
        <label for="deck-desc" class="text-label mb-1 block">Descrição</label>
        <textarea id="deck-desc" v-model="form.description" class="textarea-base" rows="2" placeholder="Opcional" />
      </div>
      <div class="flex gap-3 justify-end">
        <button type="button" class="btn-secondary" @click="open = false">Cancelar</button>
        <button type="submit" class="btn-primary" :disabled="!form.name || saving">
          {{ saving ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </form>
  </UiModal>
</template>

<script setup lang="ts">
import type { Deck } from '~/types'

const props = defineProps<{ deck: Deck }>()
const emit = defineEmits<{ (e: 'updated'): void }>()
const open = defineModel<boolean>({ required: true })

const deckStore = useDeckStore()
const toast = useToast()
const saving = ref(false)
const form = reactive({ name: '', description: '' })

watch(() => props.deck, (d) => {
  form.name = d.name
  form.description = d.description ?? ''
}, { immediate: true })

async function submit() {
  saving.value = true
  try {
    await deckStore.updateDeck(props.deck.id, { name: form.name, description: form.description || undefined })
    toast.show('Deck atualizado!', 'success')
    open.value = false
    emit('updated')
  } catch {
    toast.show('Erro ao atualizar deck.', 'error')
  } finally {
    saving.value = false
  }
}
</script>
