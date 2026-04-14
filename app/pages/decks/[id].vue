<template>
  <div class="p-6 max-w-5xl mx-auto">
    <!-- Loading -->
    <div v-if="deckStore.loading && !deckStore.current" class="space-y-4">
      <div class="skeleton h-8 w-64" />
      <div class="skeleton h-4 w-48" />
      <div class="grid grid-cols-3 gap-4 mt-6">
        <div v-for="i in 3" :key="i" class="card"><div class="skeleton h-6 w-20" /></div>
      </div>
    </div>

    <template v-else-if="deckStore.current">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <NuxtLink to="/decks" class="text-small text-base-muted hover:text-primary-400 mb-2 inline-block">← Voltar</NuxtLink>
          <h1 class="text-display">{{ deckStore.current.name }}</h1>
          <p v-if="deckStore.current.description" class="text-base-secondary mt-1">{{ deckStore.current.description }}</p>
        </div>
        <div class="flex gap-3">
          <NuxtLink :to="`/review?deck_id=${deckId}`" class="btn-primary">
            <Play :size="18" /> Revisar este deck
          </NuxtLink>
          <button class="btn-secondary" @click="showAdd = true">
            <Plus :size="18" /> Adicionar card
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div class="card text-center">
          <p class="text-label">Total cards</p>
          <p class="text-2xl font-bold text-base-primary mt-1">{{ deckStore.current.cards_count ?? 0 }}</p>
        </div>
        <div class="card text-center">
          <p class="text-label">Criado em</p>
          <p class="text-small text-base-primary mt-1">{{ formatDate(deckStore.current.created_at) }}</p>
        </div>
      </div>

      <!-- Add card modal -->
      <div v-if="showAdd" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showAdd = false">
        <div class="card w-full max-w-lg mx-4 p-6" role="dialog" aria-label="Adicionar flashcard">
          <h2 class="text-headline mb-4">Novo card</h2>
          <form @submit.prevent="handleAddCard" class="flex flex-col gap-4">
            <div>
              <label for="card-front" class="text-label mb-1 block">Frente</label>
              <textarea id="card-front" v-model="cardForm.front" class="textarea-base" rows="3" placeholder="Digite a pergunta..." />
            </div>
            <div>
              <label for="card-back" class="text-label mb-1 block">Verso</label>
              <textarea id="card-back" v-model="cardForm.back" class="textarea-base" rows="3" placeholder="Digite a resposta..." />
            </div>
            <div class="flex gap-3 justify-end">
              <button type="button" class="btn-secondary" @click="showAdd = false">Cancelar</button>
              <button type="submit" class="btn-primary" :disabled="!cardForm.front || !cardForm.back || adding">
                {{ adding ? 'Salvando...' : 'Salvar' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Cards list -->
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-headline">Conteúdo do Deck</h2>
      </div>

      <div v-if="flashcardStore.loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="card">
          <div class="skeleton h-4 w-3/4 mb-2" />
          <div class="skeleton h-3 w-1/2" />
        </div>
      </div>

      <div v-else-if="flashcardStore.flashcards.length" class="space-y-2">
        <div v-for="card in flashcardStore.flashcards" :key="card.id" class="card group">
          <div class="flex items-center justify-between gap-4">
            <p class="text-base-primary text-small truncate flex-1">{{ card.front }}</p>
            <div class="flex items-center gap-3 shrink-0">
              <button class="text-micro text-primary-400 hover:underline" @click="toggleCard(card.id)">
                {{ expandedCards.has(card.id) ? 'Ocultar' : 'Ver verso' }}
              </button>
              <button class="text-micro text-danger" @click="handleDelete(card.id)">Remover</button>
            </div>
          </div>
          <Transition name="expand">
            <div v-if="expandedCards.has(card.id)" class="bg-surface-tertiary rounded-lg p-3 mt-2">
              <p class="text-base-secondary text-small">{{ card.back }}</p>
            </div>
          </Transition>
        </div>
      </div>

      <div v-else class="card text-center py-10">
        <p class="text-base-secondary">Nenhum card neste deck.</p>
        <button class="btn-primary mt-4" @click="showAdd = true">Adicionar primeiro card</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Play, Plus } from 'lucide-vue-next'

const route = useRoute()
const deckStore = useDeckStore()
const flashcardStore = useFlashcardStore()
const toast = useToast()

const deckId = route.params.id as string
const showAdd = ref(false)
const adding = ref(false)
const cardForm = reactive({ front: '', back: '' })
const expandedCards = ref(new Set<string>())

function toggleCard(id: string) {
  if (expandedCards.value.has(id)) {
    expandedCards.value.delete(id)
  } else {
    expandedCards.value.add(id)
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function handleAddCard() {
  adding.value = true
  try {
    await flashcardStore.create(deckId, { front: cardForm.front, back: cardForm.back })
    toast.show('Card criado!', 'success')
    showAdd.value = false
    cardForm.front = ''
    cardForm.back = ''
    await deckStore.fetchDeck(deckId)
  } catch {
    toast.show('Erro ao criar card.', 'error')
  } finally {
    adding.value = false
  }
}

async function handleDelete(cardId: string) {
  try {
    await flashcardStore.remove(cardId)
    toast.show('Card removido.', 'success')
    await deckStore.fetchDeck(deckId)
  } catch {
    toast.show('Erro ao remover card.', 'error')
  }
}

onMounted(async () => {
  await Promise.all([
    deckStore.fetchDeck(deckId),
    flashcardStore.fetchForDeck(deckId),
  ])
})
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 150ms ease-in-out;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  padding: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 200px;
}
</style>
