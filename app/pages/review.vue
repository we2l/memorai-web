<template>
  <div class="min-h-screen flex flex-col bg-surface">
    <!-- Top bar -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-base">
      <NuxtLink to="/dashboard" class="text-small text-base-muted hover:text-primary-400">
        ← Voltar
      </NuxtLink>
      <div class="flex items-center gap-2 text-small text-base-secondary">
        <span>{{ review.reviewed }} / {{ review.total }}</span>
        <div class="w-32 h-1.5 rounded-full bg-surface-tertiary">
          <div class="h-1.5 rounded-full bg-primary-500 transition-all duration-300" :style="{ width: review.progress + '%' }" />
        </div>
      </div>
      <div class="w-12" />
    </div>

    <!-- Loading -->
    <div v-if="review.loading" class="flex-1 flex items-center justify-center">
      <div class="skeleton h-64 w-full max-w-lg rounded-2xl" />
    </div>

    <!-- Finished -->
    <div v-else-if="review.finished" class="flex-1 flex flex-col items-center justify-center px-4 text-center">
      <p class="text-4xl mb-4">🎉</p>
      <h2 class="text-display">Sessão concluída!</h2>
      <p class="text-base-secondary mt-2">
        Você revisou {{ review.total }} card{{ review.total !== 1 ? 's' : '' }}.
      </p>
      <div class="flex gap-3 mt-8">
        <NuxtLink to="/dashboard" class="btn-secondary">Voltar ao dashboard</NuxtLink>
        <button class="btn-primary" @click="review.fetchSession()">Nova sessão</button>
      </div>
    </div>

    <!-- Waiting for learning cards -->
    <div v-else-if="!review.currentCard && review.pendingLearning > 0" class="flex-1 flex flex-col items-center justify-center px-4 text-center">
      <p class="text-2xl mb-4">⏳</p>
      <h2 class="text-title">Aguardando cards em aprendizado</h2>
      <p class="text-base-secondary mt-2">
        {{ review.pendingLearning }} card{{ review.pendingLearning !== 1 ? 's' : '' }} voltando em breve...
      </p>
      <p class="text-base-muted text-small mt-1">Próximo em {{ nextLearningIn }}</p>
    </div>

    <!-- Review -->
    <div v-else-if="review.currentCard" class="flex-1 flex flex-col items-center justify-center px-4 gap-8">
      <!-- Learning badge -->
      <div v-if="review.currentCard.is_learning" class="flex items-center gap-2">
        <span
          class="px-3 py-1 rounded-full text-micro font-medium"
          :class="review.currentCard.state === 'relearning' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'"
        >
          {{ review.currentCard.state === 'relearning' ? '🔄 Reaprendendo' : '📖 Aprendendo' }}
        </span>
      </div>

      <FlashcardCard
        :card="review.currentCard"
        :flipped="review.flipped"
        @flip="review.flip()"
      />

      <FlashcardButtons
        v-if="review.flipped"
        :disabled="review.submitting"
        :intervals="review.currentIntervals"
        @rate="handleRate"
      />
    </div>

    <!-- No cards -->
    <div v-else class="flex-1 flex flex-col items-center justify-center px-4 text-center">
      <p class="text-base-secondary text-title">Nenhum card para revisar agora.</p>
      <p class="text-base-muted text-small mt-1">Volte mais tarde ou crie novos cards.</p>
      <NuxtLink to="/dashboard" class="btn-primary mt-6">Voltar ao dashboard</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const review = useReviewStore()
const deckStore = useDeckStore()
const route = useRoute()
const toast = useToast()

// Timer for learning cards
const nextLearningIn = ref('')
let timerInterval: ReturnType<typeof setInterval> | null = null

function updateTimer() {
  if (!review.pendingLearning) {
    nextLearningIn.value = ''
    return
  }
  const now = Date.now()
  const nearest = Math.min(...review.learningQueue.map(q => q.dueAt))
  const diff = Math.max(0, nearest - now)
  const secs = Math.ceil(diff / 1000)
  if (secs <= 0) {
    // Force reactivity — a learning card is due
    nextLearningIn.value = 'agora!'
    return
  }
  const m = Math.floor(secs / 60)
  const s = secs % 60
  nextLearningIn.value = m > 0 ? `${m}min ${s}s` : `${s}s`
}

async function handleRate(rating: number) {
  try {
    await review.submitReview(rating as 1 | 2 | 3 | 4)
    if (review.finished) {
      toast.show('Sessão concluída! 🎉', 'success')
    }
  } catch {
    toast.show('Erro ao enviar revisão.', 'error')
  }
}

onMounted(async () => {
  const deckId = route.query.deck_id as string | undefined
  if (deckId) await deckStore.fetchDeck(deckId)
  await review.fetchSession(deckId)

  timerInterval = setInterval(updateTimer, 1000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>
