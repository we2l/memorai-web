<template>
  <UiModal v-model="open" size="md" aria-label="Editar flashcard">
    <h2 class="text-headline mb-4">Editar card</h2>
    <form @submit.prevent="submit" class="flex flex-col gap-4">
      <div>
        <label for="edit-front" class="text-label mb-1 block">Frente</label>
        <textarea id="edit-front" v-model="form.front" class="textarea-base" rows="3" />
      </div>
      <div>
        <label for="edit-back" class="text-label mb-1 block">Verso</label>
        <textarea id="edit-back" v-model="form.back" class="textarea-base" rows="3" />
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
import type { Flashcard } from '~/types'

const props = defineProps<{ card: Flashcard }>()
const emit = defineEmits<{ (e: 'updated'): void }>()
const open = defineModel<boolean>({ required: true })

const flashcardStore = useFlashcardStore()
const toast = useToast()
const saving = ref(false)
const form = reactive({ front: '', back: '' })

watch(() => props.card, (c) => {
  form.front = c.front
  form.back = c.back
}, { immediate: true })

async function submit() {
  saving.value = true
  try {
    await flashcardStore.update(props.card.id, { front: form.front, back: form.back })
    toast.show('Card atualizado!', 'success')
    open.value = false
    emit('updated')
  } catch {
    toast.show('Erro ao atualizar card.', 'error')
  } finally {
    saving.value = false
  }
}
</script>
