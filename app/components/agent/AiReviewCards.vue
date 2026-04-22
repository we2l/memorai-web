<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-heading">Revisar cards gerados ({{ cards.length }})</h2>
      <button class="text-small text-base-muted hover:text-base-primary" @click="$emit('back')">← Voltar</button>
    </div>

    <div class="space-y-3 max-h-[400px] overflow-y-auto">
      <div
        v-for="(card, i) in editableCards"
        :key="i"
        class="card p-4"
        :class="card.discarded ? 'opacity-40' : ''"
      >
        <div class="flex justify-between items-start gap-2 mb-2">
          <span class="text-label">Card {{ i + 1 }}</span>
          <div class="flex items-center gap-3">
            <button
              v-if="!card.discarded"
              class="flex items-center gap-1 text-small text-accent-primary hover:underline"
              @click.stop="openEdit(i)"
            >
              <Pencil :size="14" /> Editar
            </button>
            <button
              class="text-small"
              :class="card.discarded ? 'text-accent-primary' : 'text-danger'"
              @click.stop="card.discarded = !card.discarded"
            >
              {{ card.discarded ? 'Restaurar' : 'Descartar' }}
            </button>
          </div>
        </div>
        <div v-if="!card.discarded">
          <p class="text-small text-base-primary font-medium">{{ card.front }}</p>
          <p class="text-small text-base-muted mt-1">{{ card.back }}</p>
          <p v-if="card.source_reference" class="text-micro text-base-muted italic mt-1">
            {{ card.source_reference }}
          </p>
        </div>
      </div>
    </div>

    <div class="flex justify-end gap-3 mt-6">
      <button class="btn-secondary" @click="$emit('back')">Cancelar</button>
      <button class="btn-primary" :disabled="loading || !acceptedCards.length" @click="acceptAll">
        {{ loading ? 'Salvando...' : `Aceitar ${acceptedCards.length} cards` }}
      </button>
    </div>

    <!-- Edit modal -->
    <FlashcardCardFormModal
      v-if="editingIndex !== null"
      v-model="showEditModal"
      :deck-id="deckId"
      :initial-front="editableCards[editingIndex].front"
      :initial-back="editableCards[editingIndex].back"
      @created="onCardCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { Pencil } from 'lucide-vue-next'
import type { AiGeneratedCard } from '~/types'

const props = defineProps<{
  cards: AiGeneratedCard[]
  deckId: string
  closeModal: () => void
}>()

const emit = defineEmits<{ (e: 'back'): void }>()

const { $api } = useNuxtApp()
const loading = ref(false)
const showEditModal = ref(false)
const editingIndex = ref<number | null>(null)

const editableCards = ref(
  props.cards.map(c => ({ ...c, discarded: false })),
)

const acceptedCards = computed(() =>
  editableCards.value.filter(c => !c.discarded),
)

function openEdit(index: number) {
  editingIndex.value = index
  showEditModal.value = true
}

function onCardCreated() {
  // Card was saved via modal — mark as discarded (already saved)
  if (editingIndex.value !== null) {
    editableCards.value[editingIndex.value].discarded = true
  }
  showEditModal.value = false
  editingIndex.value = null
  useToast().show('Card salvo!')
}

async function acceptAll() {
  loading.value = true
  try {
    await $api('/ai/accept-cards', {
      method: 'POST',
      body: {
        deck_id: props.deckId,
        cards: acceptedCards.value.map(c => ({ front: c.front, back: c.back })),
      },
    })
    useToast().show(`${acceptedCards.value.length} cards adicionados!`)
    props.closeModal()
  } catch (e: any) {
    useToast().show(e?.data?.message || 'Erro ao salvar cards', 'error')
  } finally {
    loading.value = false
  }
}
</script>
