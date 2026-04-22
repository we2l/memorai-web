<template>
  <div class="review-bg h-[calc(100vh-56px)] flex flex-col overflow-y-auto">
    <!-- Top bar — minimal -->
    <div class="flex items-center justify-between px-4 py-3">
      <NuxtLink to="/today" class="text-small text-base-muted opacity-60 hover:opacity-100 hover:text-accent-primary transition-opacity">
        ← Voltar
      </NuxtLink>
      <div class="flex items-center gap-3 text-small text-base-muted">
        <span v-if="isSurvivalMode" class="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-medium bg-warning/15 text-warning">Sobrevivência</span>
        <span v-if="sessionTimer > 0" class="font-mono" :class="sessionTimer <= 60 ? 'text-danger' : ''" aria-live="polite" :aria-label="`${formatTimer(sessionTimer)} restantes`">
          {{ formatTimer(sessionTimer) }}
        </span>
        <span class="font-medium text-base-primary">{{ review.reviewed }} <span class="opacity-40">/ {{ review.total }}</span></span>
        <span class="text-micro opacity-50">{{ progressLabel }}</span>
      </div>
      <div class="w-12" />
    </div>

    <!-- Progress bar — thin, with pulse on update -->
    <div class="w-full h-[3px] bg-[rgba(255,255,255,0.06)]">
      <div
        class="h-[3px] transition-all duration-500 ease-out"
        :class="progressPulse ? 'progress-pulse' : ''"
        :style="{ width: review.progress + '%', background: 'linear-gradient(90deg, #B45309, #D97706, #F59E0B)' }"
      />
    </div>

    <!-- Micro reward toast -->
    <Transition name="reward-pop">
      <div v-if="rewardMessage" class="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-surface-secondary border border-success/20 text-small text-success shadow-lg">
        {{ rewardMessage }}
      </div>
    </Transition>

    <!-- Loading -->
    <div v-if="review.loading" class="flex-1 flex flex-col items-center justify-center px-4 gap-6">
      <div class="w-full max-w-2xl">
        <div class="review-card rounded-2xl px-12 py-12 min-h-[360px] flex flex-col items-center justify-center gap-4">
          <div class="skeleton h-4 w-24 rounded" />
          <div class="skeleton h-6 w-64 rounded mt-4" />
          <div class="skeleton h-4 w-48 rounded" />
        </div>
      </div>
      <p class="text-small text-base-muted animate-pulse">Carregando sessão...</p>
    </div>

    <!-- Finished -->
    <div v-else-if="review.finished && !review.showErrorDiary" class="flex-1 flex flex-col items-center justify-center px-4 text-center">
      <p class="text-5xl mb-6">🎉</p>
      <h2 class="text-display">Sessão concluída!</h2>
      <p class="text-base-muted mt-3">
        Você revisou <span class="text-accent-primary font-medium">{{ review.reviewed }}</span> card{{ review.reviewed !== 1 ? 's' : '' }}.
      </p>
      <p v-if="review.pendingLearning > 0" class="text-base-muted text-small mt-2">
        {{ review.pendingLearning }} card{{ review.pendingLearning !== 1 ? 's' : '' }} em aprendizado — {{ review.pendingLearning === 1 ? 'volta' : 'voltam' }} em breve.
      </p>
      <NuxtLink to="/today" class="btn-primary mt-8">Voltar</NuxtLink>
    </div>

    <!-- Waiting for learning cards -->
    <div v-else-if="!review.currentCard && review.pendingLearning > 0 && !review.showErrorDiary" class="flex-1 flex flex-col items-center justify-center px-4 text-center">
      <p class="text-4xl mb-4">⏳</p>
      <h2 class="text-display">Aguardando...</h2>
      <p class="text-base-muted text-small mt-2">
        {{ review.pendingLearning }} card{{ review.pendingLearning !== 1 ? 's' : '' }} em aprendizado — {{ review.pendingLearning === 1 ? 'volta' : 'voltam' }} em breve.
      </p>
      <NuxtLink to="/today" class="btn-secondary mt-8">Voltar</NuxtLink>
    </div>

    <!-- Review -->
    <div v-else-if="review.currentCard" class="flex-1 flex flex-col items-center justify-center px-4 pt-6 gap-10">
      <!-- State badge -->
      <div v-if="review.currentCard.is_learning || review.currentCard.state === 'new'" class="flex items-center gap-2">
        <span
          class="px-3 py-1 rounded-full text-[11px] tracking-wide uppercase font-medium"
          :class="{
            'bg-orange-500/15 text-orange-400': review.currentCard.state === 'relearning',
            'bg-blue-500/15 text-blue-400': review.currentCard.state === 'learning',
            'bg-emerald-500/15 text-emerald-400': review.currentCard.state === 'new',
          }"
        >
          {{ review.currentCard.state === 'relearning' ? '🔄 Reaprendendo' : review.currentCard.state === 'new' ? '✨ Novo' : '📖 Aprendendo' }}
        </span>
      </div>

      <FlashcardCard
        :card="review.currentCard"
        :flipped="review.flipped"
        :feedback="cardFeedback"
        @flip="review.flip()"
      />

      <FlashcardButtons
        v-if="review.flipped"
        class="sticky bottom-4 z-10"
        :disabled="review.submitting"
        :intervals="review.currentIntervals"
        @rate="handleRate"
      />

      <!-- Weak connection suggestion -->
      <div v-if="review.weakSuggestion?.length && !review.showErrorDiary" class="w-full max-w-lg px-4">
        <div class="card border border-warning/30 text-center">
          <p class="text-small text-base-muted mb-2">Tópico conectado também está fraco:</p>
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
      <p class="text-base-secondary text-title">Tudo em dia! 🎉 Que tal gerar novos cards?</p>
      <p class="text-base-muted text-small mt-1">Suba um PDF ou peça pra IA gerar.</p>
      <NuxtLink to="/topics" class="btn-primary mt-6">Ir pra Tópicos</NuxtLink>
    </div>

    <!-- Error diary -->
    <div v-if="review.showErrorDiary" class="flex-1 flex flex-col items-center justify-center px-4">
      <FlashcardErrorDiary
        :visible="true"
        :flashcard-id="lastErrorCardId"
        :review-id="review.lastReviewId ?? ''"
        @saved="review.showErrorDiary = false"
        @skipped="review.showErrorDiary = false"
      />
      <!-- Note snippet (reverse linking) -->
      <div v-if="review.noteSnippet" class="mt-4 w-full max-w-md p-3 rounded-lg bg-accent-primary-subtle border border-accent-primary/20">
        <p class="text-micro text-accent-primary font-medium mb-1">📝 Da sua nota: {{ review.noteSnippet.title }}</p>
        <p class="text-small text-base-secondary">{{ review.noteSnippet.snippet }}</p>
        <NuxtLink
          :to="`/topics?topic=${review.noteSnippet.topic_id}&note=${review.noteSnippet.note_id}`"
          class="text-micro text-accent-primary hover:underline mt-1 inline-block"
        >
          Ver nota completa →
        </NuxtLink>
      </div>

      <!-- Chat trigger after error -->
      <button
        v-if="review.showErrorDiary || review.noteSnippet"
        class="mt-3 btn-secondary !py-1.5 !px-3 !min-h-0 text-small"
        @click="openChatForError"
      >
        ✨ Entender isso
      </button>
    </div>
    <!-- Timer expired modal -->
    <UiModal v-model="showTimerModal" size="sm" aria-label="Tempo esgotado">
      <div class="text-center">
        <p class="text-4xl mb-4">⏰</p>
        <h2 class="text-title font-serif">Tempo esgotado!</h2>
        <p class="text-base-muted text-small mt-2">
          Você revisou <span class="text-accent-primary font-medium">{{ review.reviewed }}</span> card{{ review.reviewed !== 1 ? 's' : '' }}.
        </p>
        <div class="flex gap-3 mt-6 justify-center">
          <NuxtLink to="/today" class="btn-secondary">Encerrar</NuxtLink>
          <button class="btn-primary" @click="continueAfterTimer">Continuar</button>
        </div>
      </div>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
const review = useReviewStore()
const deckStore = useDeckStore()
const chat = useChatStore()
const route = useRoute()
const toast = useToast()
const lastErrorCardId = ref('')
const cardFeedback = ref<'success' | 'error' | null>(null)
const correctStreak = ref(0)
const rewardMessage = ref('')
const progressPulse = ref(false)
let rewardTimeout: ReturnType<typeof setTimeout> | null = null

async function handleRate(rating: number) {
  const cardId = review.currentCard?.id ?? ''

  // Micro feedback
  cardFeedback.value = rating >= 3 ? 'success' : 'error'

  // Track streak
  if (rating >= 3) {
    correctStreak.value++
    // Micro reward at milestones
    if (correctStreak.value === 3) showReward('🔥 3 seguidos!')
    else if (correctStreak.value === 5) showReward('⚡ 5 seguidos — bom ritmo!')
    else if (correctStreak.value === 10) showReward('🧠 10 seguidos — você tá voando!')
    else if (correctStreak.value > 0 && correctStreak.value % 10 === 0) showReward(`🔥 ${correctStreak.value} seguidos!`)
  } else {
    correctStreak.value = 0
  }

  // Progress pulse
  progressPulse.value = true
  setTimeout(() => { progressPulse.value = false }, 600)

  // Let feedback show briefly before advancing
  await new Promise(r => setTimeout(r, 450))
  cardFeedback.value = null

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
  const backlog = route.query.backlog === '1'
  if (deckId) await deckStore.fetchDeck(deckId)
  await review.fetchSession(deckId, topicId, errorsOnly, backlog)
  await loadSessionTimer()
}

// Session timer & survival mode
const sessionTimer = ref(0)
const showTimerModal = ref(false)
const isSurvivalMode = ref(false)
let timerInterval: ReturnType<typeof setInterval> | null = null

async function loadSessionTimer() {
  try {
    const { $api } = useNuxtApp()
    const res = await $api<any>('/settings')
    isSurvivalMode.value = res.data.survival_mode ?? false
    const limit = res.data.session_time_limit
    if (limit) {
      sessionTimer.value = limit * 60
      timerInterval = setInterval(() => {
        if (sessionTimer.value > 0) sessionTimer.value--
      }, 1000)
    }
  } catch {}
}

watch(sessionTimer, (val, oldVal) => {
  if (val === 0 && oldVal > 0) {
    if (timerInterval) clearInterval(timerInterval)
    timerInterval = null
    showTimerModal.value = true
  }
})

function continueAfterTimer() {
  showTimerModal.value = false
}

function openChatForError() {
  const card = review.currentCard
  if (!card) return
  chat.open({
    cardId: card.id,
    cardFront: card.front,
    topicId: card.topic_id,
    source: 'review_error',
  })
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function showReward(msg: string) {
  rewardMessage.value = msg
  if (rewardTimeout) clearTimeout(rewardTimeout)
  rewardTimeout = setTimeout(() => { rewardMessage.value = '' }, 1800)
}

const progressLabel = computed(() => {
  const pct = review.progress
  if (pct === 0) return 'começando'
  if (pct < 25) return 'aquecendo'
  if (pct < 70) return 'no ritmo'
  if (pct < 100) return 'quase lá'
  return 'concluído'
})

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
  if (timerInterval) clearInterval(timerInterval)
  if (rewardTimeout) clearTimeout(rewardTimeout)
})

watch(() => route.query, (newQ, oldQ) => {
  if (JSON.stringify(newQ) !== JSON.stringify(oldQ)) loadSession()
})
</script>

<style scoped>
.review-bg {
  background: radial-gradient(ellipse at 50% 45%, #1E1814 0%, #110F0D 40%, #0A0908 70%);
  color: var(--text-primary);
}

.progress-pulse {
  box-shadow: 0 0 8px rgba(217, 119, 6, 0.3);
  animation: pulse-glow 0.6s ease;
}

@keyframes pulse-glow {
  0% { box-shadow: 0 0 4px rgba(217, 119, 6, 0.1); }
  50% { box-shadow: 0 0 12px rgba(217, 119, 6, 0.4); }
  100% { box-shadow: 0 0 4px rgba(217, 119, 6, 0.1); }
}

.reward-pop-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.reward-pop-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.reward-pop-enter-from {
  opacity: 0;
  transform: translate(-50%, -8px) scale(0.95);
}
.reward-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, -4px);
}
</style>
