<template>
  <div class="p-6 max-w-5xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-display">Seus decks</h1>
      <button class="btn-primary" @click="showCreate = true">
        <Plus :size="18" /> Novo deck
      </button>
    </div>

    <!-- Create modal -->
    <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showCreate = false">
      <div class="card w-full max-w-md mx-4 p-6" role="dialog" aria-label="Criar deck">
        <h2 class="text-headline mb-4">Novo deck</h2>
        <form @submit.prevent="handleCreate" class="flex flex-col gap-4">
          <div>
            <label for="deck-name" class="text-label mb-1 block">Nome</label>
            <input id="deck-name" v-model="form.name" class="input-base" placeholder="Ex: Direito Constitucional" />
          </div>
          <div>
            <label for="deck-desc" class="text-label mb-1 block">Descrição (opcional)</label>
            <input id="deck-desc" v-model="form.description" class="input-base" placeholder="Ex: Artigos 5º ao 37" />
          </div>
          <div class="flex gap-3 justify-end">
            <button type="button" class="btn-secondary" @click="showCreate = false">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="!form.name || creating">
              {{ creating ? 'Criando...' : 'Criar' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="deckStore.loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="card">
        <div class="skeleton h-5 w-40 mb-3" />
        <div class="skeleton h-3 w-56" />
      </div>
    </div>

    <!-- Decks grid -->
    <div v-else-if="deckStore.decks.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <FlashcardDeckCard v-for="deck in deckStore.decks" :key="deck.id" :deck="deck" />
    </div>

    <!-- Empty -->
    <div v-else class="card text-center py-16">
      <p class="text-base-secondary text-title">Nenhum deck ainda</p>
      <p class="text-base-muted text-small mt-1">Crie seu primeiro deck para começar a estudar.</p>
      <button class="btn-primary mt-6" @click="showCreate = true">Criar primeiro deck</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus } from 'lucide-vue-next'

const deckStore = useDeckStore()
const toast = useToast()

const showCreate = ref(false)
const creating = ref(false)
const form = reactive({ name: '', description: '' })

async function handleCreate() {
  creating.value = true
  try {
    await deckStore.createDeck({ name: form.name, description: form.description || undefined })
    toast.show('Deck criado!', 'success')
    showCreate.value = false
    form.name = ''
    form.description = ''
  } catch {
    toast.show('Erro ao criar deck.', 'error')
  } finally {
    creating.value = false
  }
}

onMounted(() => deckStore.fetchDecks())
</script>
