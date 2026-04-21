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
          <NuxtLink to="/decks" class="text-small text-base-muted hover:text-accent-primary mb-2 inline-block">← Voltar</NuxtLink>
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
          <button class="btn-secondary" @click="showEditDeck = true" aria-label="Editar deck">
            <Pencil :size="18" />
          </button>
          <button class="btn-secondary text-danger" @click="showDeleteDeck = true" aria-label="Deletar deck">
            <Trash2 :size="18" />
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

      <!-- Modals -->
      <FlashcardCardFormModal v-model="showAdd" :deck-id="deckId" @created="refreshCards" />
      <FlashcardCardFormModal v-if="editCard" v-model="showEditCard" :deck-id="deckId" :card="editCard" @updated="refreshCards" />
      <DeckEditModal v-model="showEditDeck" :deck="deckStore.current" @updated="deckStore.fetchDeck(deckId)" />
      <UiConfirmModal
        v-model="showDelete"
        title="Remover card?"
        message="Essa ação não pode ser desfeita."
        confirm-label="Remover"
        @confirm="handleDeleteCard"
      />
      <UiConfirmModal
        v-model="showDeleteDeck"
        title="Deletar deck?"
        message="Todos os cards e revisões deste deck serão perdidos permanentemente."
        confirm-label="Deletar"
        @confirm="handleDeleteDeck"
      />

      <!-- Study settings -->
      <DeckSettings :deck="deckStore.current" class="mb-8" />

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
        <div v-for="item in groupedCards" :key="item.id" class="card group">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2 text-base-primary text-small truncate flex-1">
              <span class="truncate">{{ stripHtml(item.front) }}</span>
              <span v-if="item.clozeCount > 1" class="shrink-0 text-micro bg-accent-primary-subtle text-accent-primary px-1.5 py-0.5 rounded-full font-medium">
                {{ item.clozeCount }} lacunas
              </span>
              <span v-else-if="item.type === 'cloze'" class="shrink-0 text-micro bg-accent-primary-subtle text-accent-primary px-1.5 py-0.5 rounded-full font-medium">
                lacuna
              </span>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <button v-if="item.type !== 'cloze'" class="text-micro text-accent-primary hover:underline" @click="toggleCard(item.id)">
                {{ expandedCards.has(item.id) ? 'Ocultar' : 'Ver verso' }}
              </button>
              <button v-else class="text-micro text-accent-primary hover:underline" @click="toggleCard(item.id)">
                {{ expandedCards.has(item.id) ? 'Ocultar' : 'Ver lacunas' }}
              </button>
              <button class="text-micro text-accent-primary hover:underline" @click="openEditCard(item.card)">Editar</button>
              <button class="text-micro text-danger" @click="confirmDeleteCard(item.card.id)">Remover</button>
            </div>
          </div>
          <Transition name="expand">
            <div v-if="expandedCards.has(item.id)" class="bg-surface-tertiary rounded-lg p-3 mt-2">
              <!-- Basic card: show back -->
              <div v-if="item.type !== 'cloze'" class="text-base-secondary text-small card-content" v-html="item.card.back" />
              <!-- Cloze group: show individual cards -->
              <div v-else class="space-y-2">
                <div v-for="sibling in item.siblings" :key="sibling.id" class="flex items-center gap-3 text-small">
                  <span class="shrink-0 text-micro font-bold text-accent-primary">c{{ sibling.cloze_index }}</span>
                  <span class="text-base-secondary">{{ clozePreview(sibling) }}</span>
                  <span class="ml-auto text-micro text-base-muted">{{ sibling.state }}</span>
                </div>
              </div>
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
import { Play, Plus, Pencil, Trash2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const deckStore = useDeckStore()
const flashcardStore = useFlashcardStore()
const toast = useToast()

const deckId = route.params.id as string

function stripHtml(html: string): string {
  return html?.replace(/<[^>]*>/g, '').replace(/\{\{c\d+::.*?(?:::.*?)?\}\}/g, '___') ?? ''
}

interface GroupedCard {
  id: string
  front: string
  type: string
  card: import('~/types').Flashcard
  clozeCount: number
  siblings: import('~/types').Flashcard[]
}

const groupedCards = computed<GroupedCard[]>(() => {
  const cards = flashcardStore.flashcards
  const seen = new Set<string>()
  const result: GroupedCard[] = []

  for (const card of cards) {
    if (card.cloze_group_id) {
      if (seen.has(card.cloze_group_id)) continue
      seen.add(card.cloze_group_id)
      const siblings = cards
        .filter(c => c.cloze_group_id === card.cloze_group_id)
        .sort((a, b) => (a.cloze_index ?? 0) - (b.cloze_index ?? 0))
      result.push({
        id: card.cloze_group_id,
        front: card.front,
        type: 'cloze',
        card: siblings[0],
        clozeCount: siblings.length,
        siblings,
      })
    } else {
      result.push({
        id: card.id,
        front: card.front,
        type: card.type,
        card,
        clozeCount: card.type === 'cloze' ? 1 : 0,
        siblings: [],
      })
    }
  }
  return result
})

function clozePreview(card: import('~/types').Flashcard): string {
  const text = stripHtml(card.front)
  // Show which word this cloze tests
  const match = card.front.match(new RegExp(`\\{\\{c${card.cloze_index}::(.*?)(?:::.*?)?\\}\\}`))
  return match ? match[1] : text
}

const showAdd = ref(false)
const showEditDeck = ref(false)
const showDeleteDeck = ref(false)
const showEditCard = ref(false)
const showDelete = ref(false)
const deleteTarget = ref<string | null>(null)
const editCard = ref<import('~/types').Flashcard | null>(null)
const expandedCards = ref(new Set<string>())

function toggleCard(id: string) {
  expandedCards.value.has(id) ? expandedCards.value.delete(id) : expandedCards.value.add(id)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function confirmDeleteCard(cardId: string) {
  deleteTarget.value = cardId
  showDelete.value = true
}

async function handleDeleteCard() {
  if (!deleteTarget.value) return
  try {
    await flashcardStore.remove(deleteTarget.value)
    toast.show('Card removido.', 'success')
    await deckStore.fetchDeck(deckId)
  } catch {
    toast.show('Erro ao remover card.', 'error')
  } finally {
    showDelete.value = false
    deleteTarget.value = null
  }
}

function openEditCard(card: import('~/types').Flashcard) {
  editCard.value = card
  showEditCard.value = true
}

function refreshCards() {
  flashcardStore.fetchForDeck(deckId)
}

async function handleDeleteDeck() {
  try {
    await deckStore.deleteDeck(deckId)
    toast.show('Deck deletado.', 'success')
    await router.push('/decks')
  } catch {
    toast.show('Erro ao deletar deck.', 'error')
  } finally {
    showDeleteDeck.value = false
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
