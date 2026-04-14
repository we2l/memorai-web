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

    <!-- Review -->
    <div v-else-if="review.currentCard" class="flex-1 flex flex-col items-center justify-center px-4 gap-8">
      <FlashcardCard
        :card="review.currentCard"
        :flipped="review.flipped"
        @flip="review.flip()"
      />

      <ReviewButtons
        v-if="review.flipped"
        :disabled="review.submitting"
        @rate="(r) => review.submitReview(r)"
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
const route = useRoute()

onMounted(() => {
  const deckId = route.query.deck_id as string | undefined
  review.fetchSession(deckId)
})
</script>
