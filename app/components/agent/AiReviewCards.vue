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
          <button
            class="text-small"
            :class="card.discarded ? 'text-accent-primary' : 'text-danger'"
            @click="card.discarded = !card.discarded"
          >
            {{ card.discarded ? 'Restaurar' : 'Descartar' }}
          </button>
        </div>
        <div v-if="!card.discarded" class="space-y-2">
          <div>
            <label :for="`front-${i}`" class="text-small text-base-muted">Frente</label>
            <input :id="`front-${i}`" v-model="card.front" class="input w-full text-small" />
          </div>
          <div>
            <label :for="`back-${i}`" class="text-small text-base-muted">Verso</label>
            <input :id="`back-${i}`" v-model="card.back" class="input w-full text-small" />
          </div>
          <p v-if="card.source_reference" class="text-small text-base-muted italic">
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
  </div>
</template>

<script setup lang="ts">
import type { AiGeneratedCard } from '~/types'

const props = defineProps<{
  cards: AiGeneratedCard[]
  deckId: string
}>()

const emit = defineEmits<{ (e: 'accepted'): void; (e: 'back'): void }>()

const { $api } = useNuxtApp()
const loading = ref(false)

const editableCards = ref(
  props.cards.map(c => ({ ...c, discarded: false })),
)

const acceptedCards = computed(() =>
  editableCards.value.filter(c => !c.discarded),
)

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
    useToast().success(`${acceptedCards.value.length} cards adicionados!`)
    emit('accepted')
  } catch (e: any) {
    useToast().error(e?.data?.message || 'Erro ao salvar cards')
  } finally {
    loading.value = false
  }
}
</script>
