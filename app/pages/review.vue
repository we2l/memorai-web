<template>
  <div class="min-h-screen flex flex-col bg-surface">
    <!-- Top bar -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-base">
      <NuxtLink to="/dashboard" class="text-small text-base-muted hover:text-accent-primary">
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
    <div v-else-if="review.finished && !review.showErrorDiary" class="flex-1 flex flex-col items-center justify-center px-4 text-center">
      <p class="text-4xl mb-4">🎉</p>
      <h2 class="text-display">Sessão concluída!</h2>
      <p class="text-base-secondary mt-2">
        Você revisou {{ review.reviewed }} card{{ review.reviewed !== 1 ? 's' : '' }}.
      </p>
      <p v-if="review.pendingLearning > 0" class="text-base-muted text-small mt-2">
        {{ review.pendingLearning }} card{{ review.pendingLearning !== 1 ? 's' : '' }} em aprendizado — {{ review.pendingLearning === 1 ? 'volta' : 'voltam' }} em breve.
      </p>
      <NuxtLink to="/dashboard" class="btn-primary mt-8">Voltar ao dashboard</NuxtLink>
    </div>

    <!-- Waiting for learning cards -->
    <div v-else-if="!review.currentCard && review.pendingLearning > 0 && !review.showErrorDiary" class="flex-1 flex flex-col items-center justify-center px-4 text-center">
      <p class="text-4xl mb-4">⏳</p>
      <h2 class="text-display">Aguardando...</h2>
      <p class="text-base-muted text-small mt-2">
        {{ review.pendingLearning }} card{{ review.pendingLearning !== 1 ? 's' : '' }} em aprendizado — {{ review.pendingLearning === 1 ? 'volta' : 'voltam' }} em breve.
      </p>
      <NuxtLink to="/dashboard" class="btn-secondary mt-8">Voltar ao dashboard</NuxtLink>
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

      <!-- Weak connection suggestion -->
      <div v-if="review.weakSuggestion?.length && !review.showErrorDiary" class="w-full max-w-lg px-4">
        <div class="card border border-warning/30 text-center">
          <p class="text-small text-base-secondary mb-2">Tópico conectado também está fraco:</p>
          <div v-for="w in review.weakSuggestion" :key="w.id" class="flex items-center justify-center gap-2 text-small">
            <span class="text-warning">⚠</span>
            <span class="text-base-primary font-medium">{{ w.name }}</span>
            <span class="text-base-muted">({{ Math.round(w.progress * 100) }}%)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- No cards -->
    <div v-else-if="!review.showErrorDiary" class="flex-1 flex flex-col items-center justify-center px-4 text-center">
      <p class="text-base-secondary text-title">Nenhum card para revisar agora.</p>
      <p class="text-base-muted text-small mt-1">Volte mais tarde ou crie novos cards.</p>
      <NuxtLink to="/dashboard" class="btn-primary mt-6">Voltar ao dashboard</NuxtLink>
    </div>

    <!-- Error diary (outside card flow so it persists after card advances) -->
    <div v-if="review.showErrorDiary" class="flex-1 flex flex-col items-center justify-center px-4">
      <FlashcardErrorDiary
        :visible="true"
        :flashcard-id="lastErrorCardId"
        :review-id="review.lastReviewId ?? ''"
        @saved="review.showErrorDiary = false"
        @skipped="review.showErrorDiary = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const review = useReviewStore()
const deckStore = useDeckStore()
const route = useRoute()
const toast = useToast()
const lastErrorCardId = ref('')

async function handleRate(rating: number) {
  const cardId = review.currentCard?.id ?? ''
  try {
    await review.submitReview(rating as 1 | 2 | 3 | 4)
    if (rating === 1) {
      lastErrorCardId.value = cardId
    }
    if (!review.showErrorDiary && (review.finished || (!review.currentCard && review.pendingLearning > 0))) {
      toast.show('Sessão concluída! 🎉', 'success')
    }
  } catch {
    toast.show('Erro ao enviar revisão.', 'error')
  }
}

async function loadSession() {
  const deckId = route.query.deck_id as string | undefined
  const topicId = route.query.topic_id as string | undefined
  const errorsOnly = route.query.errors_only === '1'
  if (deckId) await deckStore.fetchDeck(deckId)
  await review.fetchSession(deckId, topicId, errorsOnly)
}

onMounted(loadSession)

// Tick every 5s to re-evaluate learning queue due times
let tickInterval: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  tickInterval = setInterval(() => {
    if (review.learningQueue.length > 0) review._tick++
  }, 5000)
})
onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
})

watch(() => route.query, (newQ, oldQ) => {
  if (JSON.stringify(newQ) !== JSON.stringify(oldQ)) loadSession()
})
</script>
