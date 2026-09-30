<template>
  <div class="review-bg review-shell flex flex-col overflow-hidden">
    <!-- Top bar — minimal -->
    <div v-show="!dive.active.value" class="flex items-center justify-between gap-2 px-4 py-2">
      <div class="flex items-center gap-1">
        <NuxtLink to="/hoje" class="inline-flex items-center min-h-[44px] px-1 text-sm text-base-muted hover:text-base-primary transition-opacity">
          ← Voltar
        </NuxtLink>
        <button
          v-if="review.canUndo"
          type="button"
          class="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-full text-small text-base-secondary hover:text-base-primary hover:bg-[var(--border-divider)] transition-colors"
          aria-keyshortcuts="U Control+Z"
          @click="handleUndo"
        >
          <Undo2 :size="16" aria-hidden="true" />
          Desfazer
        </button>
        <button
          v-if="review.currentCard && !review.showErrorDiary"
          type="button"
          class="inline-flex items-center justify-center w-11 h-11 rounded-full text-base-muted hover:text-base-primary hover:bg-[var(--border-divider)] transition-colors"
          aria-label="Editar card"
          aria-keyshortcuts="E"
          @click="openEdit"
        >
          <Pencil :size="16" aria-hidden="true" />
        </button>
      </div>
      <div class="flex items-center gap-3 text-small text-base-secondary min-w-0">
        <span v-if="isSurvivalMode" class="px-2 py-0.5 rounded-full text-micro uppercase tracking-wide font-medium bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)]">Sobrevivência</span>
        <span v-if="isBlitz" class="px-2 py-0.5 rounded-full text-micro uppercase tracking-wide font-medium bg-[var(--badge-primary-bg)] text-[var(--badge-primary-text)] inline-flex items-center gap-1"><Zap :size="10" aria-hidden="true" /> Relâmpago</span>
        <span v-if="sessionTimer > 0" class="font-mono" :class="sessionTimer <= 60 ? 'text-[var(--badge-danger-text)]' : ''" aria-live="polite" :aria-label="`${formatTime(sessionTimer)} restantes`">
          {{ formatTime(sessionTimer) }}
        </span>
        <span v-if="review.currentCard" class="font-medium text-base-primary">{{ review.remaining <= 1 ? 'Último!' : `${review.remaining - 1} restante${review.remaining - 1 !== 1 ? 's' : ''}` }}</span>
        <span class="hidden min-[400px]:inline text-micro text-base-muted">{{ reviewMood }}</span>
      </div>
      <button class="min-h-[44px] px-3 rounded-full text-micro font-medium bg-accent-primary-subtle text-accent-primary border border-[var(--color-accent-primary)]/20 hover:bg-[var(--badge-primary-bg)] transition-colors" @click="dive.start()">
        Mergulhar
      </button>
    </div>

    <!-- Screen reader announcements (undo) -->
    <p class="sr-only" aria-live="polite">{{ review.undoAnnouncement }}</p>

    <!-- Unsent ratings (RF-F2.4) -->
    <div
      v-if="review.queuePaused"
      role="alert"
      class="flex items-center justify-center gap-3 px-4 py-2 bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] text-small font-medium"
    >
      <span>{{ review.pendingCount }} avaliaç{{ review.pendingCount === 1 ? 'ão não enviada' : 'ões não enviadas' }}</span>
      <button type="button" class="min-h-[44px] px-3 underline underline-offset-2 font-semibold" @click="review.retryQueue()">
        Tentar de novo
      </button>
    </div>

    <!-- Progress bar — thin, with pulse on update -->
    <div class="w-full h-[3px] bg-[var(--border-base)]">
      <div
        class="h-[3px] transition-all duration-500 ease-out bg-[var(--color-accent-soft)]"
        :class="progressPulse ? 'progress-pulse' : ''"
        :style="{ width: review.progress + '%' }"
      />
    </div>

    <!-- Micro reward toast -->
    <Transition name="reward-pop">
      <div v-if="rewardMessage" class="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--color-accent-primary)]/20 text-sm text-accent-primary shadow-lg">
        {{ rewardMessage }}
      </div>
    </Transition>

    <!-- Insight banners -->
    <div v-if="!review.loading && !review.finished && !review.sessionError" class="px-4 space-y-2 mt-2">
      <UiInsightBanner
        v-if="review.retaFinal?.active"
        :icon="Flame"
        :text="`Reta Final — +${review.retaFinal.extra_count} cards extras de ${review.retaFinal.exam_titles.join(', ')}`"
        variant="accent"
      />
      <UiInsightBanner
        v-if="isSurvivalMode"
        :icon="AlertOctagon"
        text="Modo Sobrevivência — apenas os 20 mais urgentes"
        variant="warning"
        dismissible
        persist-key="survival-review"
      />
      <UiInsightBanner
        v-if="isBlitz"
        :icon="Timer"
        text="Revisão relâmpago — só cards pendentes, sem novos"
        variant="info"
        dismissible
        persist-key="blitz-review"
      />
    </div>

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

    <!-- Load error: never "Tudo em dia" (RN-UX-03) -->
    <div v-else-if="review.sessionError" class="flex-1 flex flex-col items-center justify-center px-4">
      <UiErrorState
        variant="page"
        title="Não foi possível carregar sua revisão"
        description="Verifique sua conexão e tente de novo."
        @retry="loadSession"
      >
        <template #actions>
          <NuxtLink to="/hoje" class="btn-ghost min-h-[44px]">Voltar</NuxtLink>
        </template>
      </UiErrorState>
    </div>

    <!-- Queue still draining -->
    <div v-else-if="review.saving && !review.showErrorDiary" class="flex-1 flex flex-col items-center justify-center px-4 text-center" role="status">
      <div class="w-8 h-8 border-2 border-[var(--color-accent-primary)] border-t-transparent rounded-full animate-spin mb-4" aria-hidden="true" />
      <p class="text-body text-base-secondary">Salvando suas avaliações…</p>
    </div>

    <!-- Finished -->
    <div v-else-if="review.finished && !review.showErrorDiary" class="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-4 py-6 text-center">
      <!-- Empty session (no cards found) -->
      <template v-if="review.reviewed === 0">
        <picture class="contents"><source srcset="~/assets/mascots/mascot-baigi-celebrating.avif" type="image/avif"><img src="~/assets/mascots/mascot-baigi-celebrating.webp" alt="Baigi celebrando" class="w-24 h-24 object-contain mb-4" width="96" height="96" loading="lazy" decoding="async" /></picture>
        <h2 class="text-display">{{ isErrorsOnly ? 'Sem erros pra revisar' : 'Tudo em dia!' }}</h2>
        <p class="text-body text-base-muted mt-3 max-w-sm">
          {{ isErrorsOnly
            ? 'Seus cards errados já foram revisados ou ainda não estão na hora de voltar. Eles vão reaparecer automaticamente.'
            : 'Nenhum card pendente agora. Que tal criar novos cards?'
          }}
        </p>
        <NuxtLink to="/hoje" class="btn-primary mt-8">Voltar</NuxtLink>
      </template>

      <!-- Normal finish (reviewed some cards) — RF-F2.10 -->
      <ReviewSessionSummary
        v-else
        :reviewed="review.totalRated"
        :ratings="review.ratingsCount"
        :started-at="review.sessionStartedAt"
        :pending-learning="review.pendingLearning"
        :top-error-topic="topErrorTopic ?? null"
        :has-backlog="hasBacklog"
      >
        <template v-if="!tomorrowFailed" #tomorrow>
          <ReviewSessionTomorrow
            :forecast="tomorrow"
            :loading="tomorrowLoading"
            :enabling="enablingReminder"
            @enable-reminder="enableReminder"
          />
        </template>
      </ReviewSessionSummary>
    </div>

    <!-- Waiting for learning cards -->
    <div v-else-if="!review.currentCard && review.pendingLearning > 0 && !review.showErrorDiary" class="flex-1 flex flex-col items-center justify-center px-4 text-center">
      <p class="text-4xl mb-4">⏳</p>
      <h2 class="text-display">Aguardando...</h2>
      <p class="text-base-muted text-small mt-2">
        {{ review.pendingLearning }} card{{ review.pendingLearning !== 1 ? 's' : '' }} em aprendizado — {{ review.pendingLearning === 1 ? 'volta' : 'voltam' }} em breve.
      </p>
      <NuxtLink to="/hoje" class="btn-secondary mt-8">Voltar</NuxtLink>
    </div>

    <!-- Review -->
    <template v-else-if="review.currentCard">
      <div class="flex-1 min-h-0 overflow-y-auto">
        <div class="min-h-full flex flex-col items-center justify-center px-4 py-4 gap-4">
          <!-- State badge -->
          <div v-if="review.currentCard.is_learning || review.currentCard.state === 'new'" class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-full text-xs tracking-wide uppercase font-medium bg-surface-secondary border border-base text-base-muted">
              {{ review.currentCard.state === 'relearning' ? 'Reaprendendo' : review.currentCard.state === 'new' ? 'Novo' : 'Aprendendo' }}
            </span>
          </div>

          <!-- Context badge -->
          <UiTooltip v-if="contextBadge" :text="contextBadge.tooltip">
            <span class="px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5" :class="contextBadge.classes">
              <component :is="contextBadge.icon" :size="12" aria-hidden="true" />
              {{ contextBadge.label }}
            </span>
          </UiTooltip>

          <FlashcardCard
            :card="review.showErrorDiary && review.diary ? review.diary.card : review.currentCard"
            :flipped="review.flipped || review.showErrorDiary"
            :feedback="cardFeedback"
            @flip="review.flip()"
          />

          <p v-if="!review.flipped && !review.showErrorDiary" class="kbd-only text-micro text-base-muted">
            <kbd class="kbd">Espaço</kbd> para virar
          </p>
          <p v-if="showShortcutTip && !review.flipped" class="kbd-only text-micro text-base-muted">
            Pressione <kbd class="kbd">?</kbd> para ver atalhos
          </p>

          <!-- Error diary (replaces buttons after error) -->
          <div v-if="review.showErrorDiary" class="w-full max-w-lg space-y-3">
            <FlashcardErrorDiary
              :visible="true"
              :flashcard-id="review.diary?.flashcard_id ?? ''"
              :review-id="review.diary?.review_id ?? ''"
              @saved="dismissErrorDiary"
              @skipped="dismissErrorDiary"
            />
            <!-- Note snippet -->
            <div v-if="review.noteSnippet" class="p-3 rounded-lg bg-surface-secondary border border-base">
              <p class="text-xs text-accent-primary font-medium mb-1">Da sua nota: {{ review.noteSnippet.title }}</p>
              <p class="text-sm text-base-secondary">{{ review.noteSnippet.snippet }}</p>
            </div>
            <!-- Actions -->
            <div class="flex gap-2 justify-center">
              <button class="btn-secondary min-h-[44px] !py-1.5 !px-3 text-sm" @click="openChatForError">
                Me explica esse erro
              </button>
            </div>
          </div>

          <!-- Hints after an error (RF-F2.9): optional context, never blocks -->
          <section
            v-if="!review.showErrorDiary && (review.hintsLoading || review.hints.length)"
            class="w-full max-w-lg"
            aria-live="polite"
            aria-label="Dicas da sua nota"
          >
            <div v-if="review.hintsLoading" class="space-y-2" aria-busy="true">
              <div class="skeleton h-4 w-full rounded" />
              <div class="skeleton h-4 w-2/3 rounded" />
            </div>
            <template v-else>
              <ul class="space-y-2">
                <li
                  v-for="(hint, i) in visibleHints"
                  :key="i"
                  class="flex gap-2 p-3 rounded-lg border text-small text-left"
                  :class="hintStyle(hint.type).box"
                >
                  <component :is="hintStyle(hint.type).icon" :size="16" class="shrink-0 mt-0.5" aria-hidden="true" />
                  <span><span class="sr-only">{{ hintStyle(hint.type).label }}: </span><span v-html="sanitize(hint.text)" /></span>
                </li>
              </ul>
              <button
                v-if="!showAllHints && review.hints.length > 2"
                type="button"
                class="mt-2 text-small text-accent-primary underline underline-offset-2 min-h-[44px]"
                @click="showAllHints = true"
              >
                Ver mais {{ review.hints.length - 2 }}
              </button>
            </template>
          </section>

          <!-- Weak connection suggestion -->
          <div v-if="review.weakSuggestion?.length && !review.showErrorDiary" class="w-full max-w-lg px-4">
            <div class="card border border-warning/30 text-center">
              <p class="text-small text-base-muted mb-2">Caderno conectado também está fraco:</p>
              <div v-for="w in review.weakSuggestion" :key="w.id" class="flex items-center justify-center gap-2 text-small">
                <AlertTriangle :size="14" class="text-[var(--badge-warning-text)]" aria-hidden="true" />
                <span class="text-base-primary font-medium">{{ w.name }}</span>
                <span class="text-base-muted">({{ Math.round(w.progress * 100) }}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rating footer (fixed inside the shell, safe-area aware) -->
      <div v-if="review.flipped && !review.showErrorDiary" class="review-footer shrink-0 px-4 pt-3 border-t border-base bg-[var(--bg-base)]">
        <FlashcardButtons :intervals="review.currentIntervals" @rate="handleRate" />
      </div>
    </template>

    <!-- No cards -->
    <div v-else-if="!review.showErrorDiary" class="flex-1 flex flex-col items-center justify-center px-4 text-center">
      <p class="text-base-secondary text-title">Tudo em dia! 🎉 Que tal gerar novos cards?</p>
      <p class="text-base-muted text-small mt-1">Suba um PDF ou peça pra IA gerar.</p>
      <NuxtLink to="/cadernos" class="btn-primary mt-6">Ir pra Cadernos</NuxtLink>
    </div>

    <!-- Timer expired modal -->
    <UiModal v-model="showTimerModal" size="sm" aria-label="Tempo esgotado">
      <div class="text-center">
        <p class="text-4xl mb-4"></p>
        <h2 class="text-title">{{ isBlitz ? 'Revisão relâmpago concluída!' : 'Tempo esgotado!' }}</h2>
        <p class="text-base-muted text-small mt-2">
          Você revisou <span class="text-accent-primary font-medium">{{ review.reviewed }}</span> card{{ review.reviewed !== 1 ? 's' : '' }}{{ isBlitz ? ' em 5 min' : '' }}.
        </p>
        <div class="flex gap-3 mt-6 justify-center">
          <NuxtLink to="/hoje" class="btn-secondary">Encerrar</NuxtLink>
          <button class="btn-primary" @click="continueAfterTimer">{{ isBlitz ? 'Mais 5 min' : 'Continuar' }}</button>
        </div>
      </div>
    </UiModal>

    <!-- Edit current card (E) -->
    <LazyFlashcardCardFormModal
      v-if="editLoaded && editingCard"
      v-model="showEditCard"
      :card="editingCard"
      @updated="onCardUpdated"
    />

    <!-- Shortcuts help (?) -->
    <UiModal v-model="showShortcuts" size="sm">
      <h2 class="text-title mb-4">Atalhos da revisão</h2>
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-small">
        <template v-for="s in shortcutList" :key="s.keys">
          <dt><kbd class="kbd">{{ s.keys }}</kbd></dt>
          <dd class="text-base-secondary">{{ s.label }}</dd>
        </template>
      </dl>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import type { TomorrowForecast } from '~/types'
import { Flame, AlertOctagon, AlertTriangle, Timer, Zap, CalendarClock, GitBranch, FastForward, Undo2, XCircle, Lightbulb, Pencil } from 'lucide-vue-next'

definePageMeta({ chrome: 'focus' })

const review = useReviewStore()
const deckStore = useDeckStore()
const chat = useChatStore()
const examStore = useExamStore()
const route = useRoute()
const dive = useDiveMode()
const lastErrorCard = ref<any>(null)
const cardFeedback = ref<'success' | 'error' | null>(null)
const correctStreak = ref(0)
const rewardMessage = ref('')
const progressPulse = ref(false)
const errorsByTopic = ref<Record<string, { name: string; count: number; id: string }>>({})
const showAllHints = ref(false)
let rewardTimeout: ReturnType<typeof setTimeout> | null = null

const visibleHints = computed(() =>
  showAllHints.value ? review.hints : review.hints.slice(0, 2),
)

const { sanitize } = useSanitize()

function hintStyle(type: string) {
  if (type === 'error') return { icon: XCircle, label: 'Erro comum', box: 'bg-[var(--badge-danger-bg)] border-[var(--badge-danger-text)]/20 text-base-primary' }
  if (type === 'gotcha') return { icon: AlertTriangle, label: 'Pegadinha', box: 'bg-[var(--badge-warning-bg)] border-[var(--badge-warning-text)]/20 text-base-primary' }
  return { icon: Lightbulb, label: 'Dica', box: 'bg-[var(--badge-info-bg)] border-[var(--badge-info-text)]/20 text-base-primary' }
}

// "Revisar mais" on the summary when there is backlog (silent: decorative)
const hasBacklog = ref(false)
watch(() => review.finished, async (done) => {
  if (!done || review.reviewed === 0) return
  try {
    const res = await useNuxtApp().$api<any>('/review/backlog-stats')
    hasBacklog.value = (res.data?.overdue_count ?? 0) > 0
  } catch (e) {
    reportApiError(e, { silent: true })
  }
})

// "Amanhã: N cards" + dias seguidos (prd-retencao-lembretes RF-F04): one fetch, after the queue drains
const tomorrow = ref<TomorrowForecast | null>(null)
const tomorrowLoading = ref(false)
const tomorrowFailed = ref(false)
watch(() => review.finished && review.reviewed > 0 && !review.saving, async (ready) => {
  if (!ready || tomorrow.value || tomorrowLoading.value) return
  tomorrowLoading.value = true
  try {
    const res = await useNuxtApp().$api<{ data: TomorrowForecast }>('/review/tomorrow')
    tomorrow.value = res.data
  } catch (e) {
    // Never lie: the block simply does not render
    tomorrowFailed.value = true
    reportApiError(e, { silent: true })
  } finally {
    tomorrowLoading.value = false
  }
})

// A new session in the same page ("Revisar mais") gets a fresh forecast
watch(() => review.finished, (done) => {
  if (done) return
  tomorrow.value = null
  tomorrowFailed.value = false
})

const { run: runReminder, pending: enablingReminder } = useApiAction()
async function enableReminder() {
  const f = tomorrow.value
  if (!f) return
  try {
    await runReminder(() => useNuxtApp().$api('/settings', { method: 'PUT', body: { reminder_enabled: true } }), {
      success: `Lembrete ativado para ${formatReminderHour(f.reminder.hour)}`,
      error: 'Não foi possível ativar o lembrete.',
      rethrow: true,
    })
    f.reminder.enabled = true
    useAnalytics().track('reminder_toggled', { on: true, hour: f.reminder.hour, source: 'session_end' })
  } catch (e) {
    if (isEmailSuppressedError(e)) f.reminder.suppressed = true
  }
}

const topErrorTopic = computed(() => {
  const entries = Object.values(errorsByTopic.value).filter(e => e.count >= 2)
  if (!entries.length) return null
  return entries.sort((a, b) => b.count - a.count)[0]
})

const contextBadge = computed(() => {
  const card = review.currentCard
  if (!card) return null

  // Priority 1: Exam boost
  if (card.topic_id && examStore.upcoming.length) {
    const exam = examStore.upcoming.find(e =>
      e.days_remaining <= 14 && e.topics.some(t => t.id === card.topic_id)
    )
    if (exam) {
      return {
        icon: CalendarClock,
        label: `Prova em ${exam.days_remaining}d`,
        tooltip: `Priorizado porque você tem prova de "${exam.title}" em ${exam.days_remaining} dias`,
        classes: 'bg-warning/15 text-[var(--badge-warning-text)] border border-warning/20',
      }
    }
  }

  // Priority 2: Interleaved (card from different topic than query)
  const queryTopicId = route.query.topic_id as string | undefined
  if (queryTopicId && card.topic_id && card.topic_id !== queryTopicId) {
    return {
      icon: GitBranch,
      label: 'Tópico conectado',
      tooltip: 'Cards de cadernos conectados são revisados juntos pra fortalecer relações',
      classes: 'bg-info/15 text-info border border-info/20',
    }
  }

  // Priority 3: Learn ahead
  const isLearnAhead = !review.cards[review.currentIndex] && review.pendingLearning > 0
  if (isLearnAhead && card.due && new Date(card.due).getTime() > Date.now()) {
    return {
      icon: FastForward,
      label: 'Adiantando',
      tooltip: 'Não tem mais cards pendentes — você está revisando adiantado',
      classes: 'bg-surface-secondary text-base-muted border border-base',
    }
  }

  return null
})

let feedbackTimeout: ReturnType<typeof setTimeout> | null = null

function handleRate(rating: number) {
  const card = review.currentCard
  if (!card || review.showErrorDiary) return
  showAllHints.value = false

  // Visual feedback only (150ms via CSS) — never blocks the next card
  cardFeedback.value = rating >= 3 ? 'success' : 'error'
  if (feedbackTimeout) clearTimeout(feedbackTimeout)
  feedbackTimeout = setTimeout(() => { cardFeedback.value = null }, 150)

  // Micro reaction
  if (rating === 4) showReward('Fácil demais — esse você dominou')
  else if (rating === 3) showReward('Boa — conceito reforçado 👏')
  else if (rating === 2) showReward('Quase — vai fixar na próxima')
  else if (rating === 1) showReward('Normal — você vai fixar isso agora')

  // Track streak
  if (rating >= 3) {
    correctStreak.value++
    if (correctStreak.value === 5) showReward('5 seguidos — você está no ritmo!')
    else if (correctStreak.value === 10) showReward('10 seguidos — seu cérebro tá voando!')
    else if (correctStreak.value > 10 && correctStreak.value % 10 === 0) showReward(`${correctStreak.value} seguidos!`)
  } else {
    correctStreak.value = 0
    // Track errors by topic for post-session suggestion
    if (card.topic_id) {
      const key = card.topic_id
      if (!errorsByTopic.value[key]) {
        errorsByTopic.value[key] = { id: card.topic_id, name: card.topic_name ?? 'Caderno', count: 0 }
      }
      errorsByTopic.value[key].count++
    }
  }
  if (rating <= 2) lastErrorCard.value = { ...card }

  // Progress pulse
  progressPulse.value = true
  setTimeout(() => { progressPulse.value = false }, 600)

  review.rate(rating as 1 | 2 | 3 | 4)
}

async function handleUndo() {
  const entry = review.undoStack[review.undoStack.length - 1]
  const ok = await review.undo()
  if (ok && entry && entry.rating <= 2 && entry.cardSnapshot.topic_id) {
    const e = errorsByTopic.value[entry.cardSnapshot.topic_id]
    if (e) e.count = Math.max(0, e.count - 1)
  }
}

// Shortcuts (RF-F2.1) + help overlay
const showShortcuts = ref(false)
const shortcutList = [
  { keys: 'Espaço / Enter', label: 'Virar; com o card virado, "Lembrei"' },
  { keys: '1 2 3 4', label: 'Não lembrei · Quase · Lembrei · Fácil demais' },
  { keys: 'U / Ctrl+Z', label: 'Desfazer a última avaliação' },
  { keys: 'E', label: 'Editar o card atual' },
  { keys: '?', label: 'Mostrar ou esconder os atalhos' },
  { keys: 'Esc', label: 'Fechar o diário; senão, voltar para Hoje' },
]

// Edit the current card (E) — content only, scheduling untouched (RF-F2.11)
const showEditCard = ref(false)
const editLoaded = useLoadedOnce(() => showEditCard.value)
const editingCard = ref<any>(null)
function openEdit() {
  if (!review.currentCard || review.showErrorDiary) return
  editingCard.value = { ...review.currentCard }
  showEditCard.value = true
}
function onCardUpdated(card?: { id: string; front: string; back: string }) {
  if (card) review.updateCurrentContent(card)
}

useReviewShortcuts({
  edit: openEdit,
  flip: () => { if (review.currentCard && !review.showErrorDiary) review.flip() },
  rate: (r) => { if (review.flipped && !review.showErrorDiary) handleRate(r) },
  undo: () => { if (review.canUndo) void handleUndo() },
  toggleHelp: () => { showShortcuts.value = !showShortcuts.value },
  escape: () => {
    if (review.showErrorDiary) dismissErrorDiary()
    else navigateTo('/hoje')
  },
  isFlipped: () => review.flipped,
  isSuspended: () => showTimerModal.value || showEditCard.value,
})

// "Press ? for shortcuts" tip on the first 3 sessions (pointer: fine only, via CSS)
const showShortcutTip = ref(false)
onMounted(() => {
  try {
    const n = Number(localStorage.getItem('review-shortcut-tip') ?? '0')
    if (n < 3) {
      showShortcutTip.value = true
      localStorage.setItem('review-shortcut-tip', String(n + 1))
    }
  } catch {
    // intencional: localStorage indisponível (modo privado) — só não mostra a dica
  }
})

// Leaving with unsent ratings asks first (RF-F2.4)
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (review.pendingCount > 0) {
    e.preventDefault()
    e.returnValue = ''
  }
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onUnmounted(() => window.removeEventListener('beforeunload', onBeforeUnload))
onBeforeRouteLeave(() => {
  if (review.pendingCount > 0) {
    return window.confirm(`${review.pendingCount} avaliação(ões) ainda não foram enviadas. Sair mesmo assim?`)
  }
  return true
})

async function loadSession() {
  errorsByTopic.value = {}
  const deckId = route.query.deck_id as string | undefined
  const topicId = route.query.topic_id as string | undefined
  const errorsOnly = route.query.errors_only === '1'
  const backlog = route.query.backlog === '1'
  const mode = route.query.mode as string | undefined
  if (deckId) await deckStore.fetchDeck(deckId)
  await review.fetchSession(deckId, topicId, errorsOnly, backlog, mode)

  // Blitz mode: fixed 5 min timer, ignore settings timer
  isBlitz.value = mode === 'blitz'
  if (isBlitz.value) {
    sessionTimer.value = 300
    timerInterval = setInterval(() => {
      if (sessionTimer.value > 0) sessionTimer.value--
    }, 1000)
  } else {
    await loadSessionTimer()
  }
  // After the settings load: survival mode is known
  sessionAnalytics.started(route.query, isSurvivalMode.value, review.total)
}

const sessionAnalytics = useReviewSessionAnalytics()
watch(() => review.finished, (done) => {
  if (done) sessionAnalytics.completed(review.ratingsCount)
})

// Session timer & survival mode
const sessionTimer = ref(0)
const showTimerModal = ref(false)
const isSurvivalMode = ref(false)
const isBlitz = ref(false)
const isErrorsOnly = computed(() => route.query.errors_only === '1')
let timerInterval: ReturnType<typeof setInterval> | null = null

// Sync blitz countdown with dive mode
watch(sessionTimer, (val) => {
  if (isBlitz.value && dive.active.value) {
    dive.setCountdown(val > 0 ? val : null)
  }
})

watch(() => dive.active.value, (active) => {
  if (active && isBlitz.value && sessionTimer.value > 0) {
    dive.setCountdown(sessionTimer.value)
  } else if (!active) {
    dive.setCountdown(null)
  }
})

async function loadSessionTimer() {
  try {
    const { $api } = useNuxtApp()
    const res = await $api<any>('/settings')
    isSurvivalMode.value = res.data.survival_mode ?? false
    if (res.data.error_diary_mode) review.errorDiaryMode = res.data.error_diary_mode
    const limit = res.data.session_time_limit
    if (limit) {
      sessionTimer.value = limit * 60
      timerInterval = setInterval(() => {
        if (sessionTimer.value > 0) sessionTimer.value--
      }, 1000)
    }
  } catch (e) {
    reportApiError(e, { silent: true })
  }
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
  if (isBlitz.value) {
    sessionTimer.value = 300
    timerInterval = setInterval(() => {
      if (sessionTimer.value > 0) sessionTimer.value--
    }, 1000)
  }
}

function dismissErrorDiary() {
  review.dismissDiary()
}

function openChatForError() {
  const card = review.diary?.card ?? lastErrorCard.value
  if (!card) return
  chat.newConversation()
  chat.open({
    cardId: card.id,
    cardFront: card.front,
    topicId: card.topic_id,
    source: 'review_error',
  })
  nextTick(() => {
    chat.sendMessage(`Me explica esse card que errei: "${stripHtml(card.front)}"`)
  })
}

function stripHtml(html: string): string {
  return html?.replace(/<[^>]*>/g, '').trim() ?? ''
}


function showReward(msg: string) {
  rewardMessage.value = msg
  if (rewardTimeout) clearTimeout(rewardTimeout)
  rewardTimeout = setTimeout(() => { rewardMessage.value = '' }, 1800)
}

const reviewMood = computed(() => {
  const pct = review.progress
  if (pct === 0) return ''
  if (pct < 30) return 'aquecendo'
  if (pct < 70) return 'no ritmo'
  if (pct < 100) return 'quase lá'
  return 'concluído'
})

onMounted(loadSession)
onMounted(() => examStore.fetchUpcoming())

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
  if (feedbackTimeout) clearTimeout(feedbackTimeout)
  if (rewardTimeout) clearTimeout(rewardTimeout)
})

watch(() => route.query, (newQ, oldQ) => {
  if (JSON.stringify(newQ) !== JSON.stringify(oldQ)) loadSession()
})
</script>

<style scoped>
.review-shell {
  height: 100vh;
}
@supports (height: 100dvh) {
  .review-shell {
    height: 100dvh;
  }
}
.review-footer {
  padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
}
.kbd-only {
  display: none;
}
@media (pointer: fine) {
  .kbd-only {
    display: block;
  }
}
.kbd {
  display: inline-block;
  padding: 0 0.35rem;
  border-radius: 0.25rem;
  border: 1px solid var(--border-hover);
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  color: var(--text-body);
}
.review-bg {
  background: var(--bg-base);
  color: var(--text-heading);
}

.progress-pulse {
  box-shadow: 0 0 8px rgba(111, 63, 245, 0.3);
  animation: pulse-glow 0.6s ease;
}

@keyframes pulse-glow {
  0% { box-shadow: 0 0 4px rgba(111, 63, 245, 0.1); }
  50% { box-shadow: 0 0 12px rgba(111, 63, 245, 0.4); }
  100% { box-shadow: 0 0 4px rgba(111, 63, 245, 0.1); }
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
