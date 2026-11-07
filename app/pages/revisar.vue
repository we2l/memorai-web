<template>
  <div class="flex h-dvh flex-col bg-page text-fg">
    <ReviewTopBar
      v-if="!focusMode"
      :back-to="backTo"
      :scope-text="scopeText"
      :scope-note="scopeNote"
      :batch="showBatchBar ? batches.position.value : null"
      :can-undo="review.canUndo"
      :can-edit="!!review.currentCard && !review.showErrorDiary && !batchEndIndex && !onboardingEnd"
      :blitz-to="isBlitz ? null : blitzTo"
      :onboarding="isOnboarding"
      @undo="handleUndo"
      @edit="openEdit"
      @focus-mode="enterFocus"
      @shortcuts="showShortcuts = true"
    >
      <template v-if="isBlitz || sessionTimer > 0" #status>
        <span class="ml-auto text-meta font-medium tabular-nums sm:ml-0" :class="sessionTimer <= 60 ? 'text-danger' : 'text-fg-strong'" role="timer" :aria-label="`${formatTime(sessionTimer)} restantes`">
          {{ formatTime(sessionTimer) }}
        </span>
      </template>
    </ReviewTopBar>

    <!-- One line of context in place of the old banners -->
    <p v-if="contextText && !focusMode && !review.loading" class="px-gutter pt-2 text-center text-meta text-fg-muted" data-testid="review-context">{{ contextText }}</p>

    <!-- Screen reader: undo and the end of a batch -->
    <p class="sr-only" aria-live="polite">{{ review.undoAnnouncement }}</p>
    <p class="sr-only" aria-live="polite" data-testid="review-announce">{{ announcement }}</p>

    <!-- Unsent ratings (RF-F2.4) -->
    <div v-if="review.queuePaused" role="alert" class="flex items-center justify-center gap-3 bg-warning-subtle px-4 py-2 text-meta font-medium text-warning">
      <span>{{ review.pendingCount }} avaliaç{{ review.pendingCount === 1 ? 'ão não enviada' : 'ões não enviadas' }}</span>
      <UiButton size="sm" variant="ghost" @click="review.retryQueue()">Tentar de novo</UiButton>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <!-- Loading: the card and the bar keep their place -->
      <div v-if="review.loading" class="mx-auto flex w-full max-w-3xl flex-col gap-4 px-gutter py-6" aria-busy="true">
        <span class="sr-only" role="status">Carregando a revisão…</span>
        <UiSkeleton variant="block" size="lg" />
        <UiSkeleton variant="text" :lines="2" />
      </div>

      <!-- Load error: never "Tudo em dia" (RN-UX-03) -->
      <UiErrorState
        v-else-if="review.sessionError"
        variant="page"
        title="Não foi possível carregar sua revisão"
        description="Verifique sua conexão e tente de novo."
        @retry="loadSession"
      >
        <template #actions>
          <UiButton variant="ghost" :to="backTo">Voltar</UiButton>
        </template>
      </UiErrorState>

      <!-- First batch of the onboarding: 1st rating of every card, no waiting for the learning ones (prd-4g RF-F8) -->
      <LazyReviewOnboardingEnd v-else-if="onboardingEnd" :summary="sessionSummary" :forecast="tomorrow" :loading="tomorrowLoading" :failed="tomorrowFailed" />

      <!-- Queue still draining / next page on its way -->
      <div v-else-if="(review.saving || review.awaitingPage) && !review.showErrorDiary" class="flex flex-col items-center gap-4 px-gutter py-16 text-center" role="status">
        <UiSpinner />
        <p class="text-body text-fg">{{ review.saving ? 'Salvando suas avaliações…' : 'Carregando mais cards…' }}</p>
      </div>

      <!-- End of a batch: the reward lives here, not on each rating -->
      <LazyReviewBatchEnd
        v-else-if="batchEndIndex && !review.showErrorDiary"
        :index="batchEndIndex"
        :summary="batchEndSummary!"
        :goal="statsNow?.goal ?? null"
        :goal-met="goalCelebrated"
        :streak="streakInfo"
        :stats-loading="statsLoading"
        :next-count="Math.min(review.batchSize, review.remaining)"
        :back-to="backTo"
        :back-label="backLabel"
        :language="language"
        @next="nextBatch"
        @stop="stopAtBatch"
      />

      <!-- The session ended -->
      <template v-else-if="review.finished && !review.showErrorDiary">
        <LazyReviewSessionEnd
          v-if="review.totalRated > 0"
          :summary="sessionSummary"
          :scope-label="scopeEndLabel"
          :goal="statsNow?.goal ?? null"
          :goal-met="goalCelebrated"
          :streak="streakInfo"
          :back-to="backTo"
          :back-label="backLabel"
          :errors-to="errorsScope ? reviewPath(errorsScope, { errorsOnly: true, origin: scopeOrigin }) : null"
          :errors-count="errorsCount"
          :retention="!isBlitz && !isErrorsOnly"
        >
          <template v-if="!tomorrowFailed" #tomorrow>
            <LazyReviewSessionTomorrow :forecast="tomorrow" :loading="tomorrowLoading" :enabling="enablingReminder" @enable-reminder="enableReminder" />
          </template>
        </LazyReviewSessionEnd>

        <!-- No card in the whole account: never "Tudo em dia" for someone without cards (03 Q6) -->
        <LazyUiEmptyState
          v-else-if="statsBefore && statsBefore.total_cards === 0"
          title="Você ainda não tem cards"
          description="Mande um PDF, cole um texto ou crie à mão: a revisão começa com eles."
          mascot="idle"
          data-testid="review-no-cards"
        >
          <template #action>
            <UiButton variant="primary" @click="addSheet.show('review')">Criar meus primeiros cards</UiButton>
          </template>
        </LazyUiEmptyState>

        <!-- All done (has cards, nothing to review now): no celebration, nothing was achieved here -->
        <div v-else class="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-gutter py-12 text-center" data-testid="review-all-done">
          <LazyUiBaigiMascot :size="88" state="idle" />
          <h1 class="text-page-title-sm text-fg-strong">{{ isErrorsOnly ? 'Sem erros para revisar' : 'Tudo em dia' }}</h1>
          <p class="text-body text-fg-muted">
            {{ isErrorsOnly ? 'Os cards que você errou já foram revisados ou ainda não estão na hora de voltar.' : 'Nada para revisar agora neste recorte.' }}
          </p>
          <LazyReviewSessionTomorrow v-if="!tomorrowFailed" :forecast="tomorrow" :loading="tomorrowLoading" :enabling="enablingReminder" @enable-reminder="enableReminder" />
          <UiButton variant="primary" :to="backTo">{{ backLabel }}</UiButton>
        </div>
      </template>

      <!-- Waiting for cards in learning -->
      <div v-else-if="!review.currentCard && review.pendingLearning > 0 && !review.showErrorDiary" class="mx-auto flex max-w-md flex-col items-center gap-3 px-gutter py-16 text-center" data-testid="review-waiting">
        <h1 class="text-section text-fg-strong">Volta em 1 min</h1>
        <p class="text-body text-fg-muted">{{ review.pendingLearning }} {{ review.pendingLearning === 1 ? 'card que você está aprendendo volta' : 'cards que você está aprendendo voltam' }} em instantes.</p>
        <UiButton variant="primary" :to="backTo">Encerrar por hoje</UiButton>
      </div>

      <!-- The card -->
      <div v-else-if="review.currentCard" class="mx-auto flex w-full max-w-3xl flex-col gap-4 px-gutter py-6">
        <ReviewCard
          :card="review.showErrorDiary && review.diary ? review.diary.card : review.currentCard"
          :flipped="review.flipped || review.showErrorDiary"
          :label="cardLabel"
          @flip="review.flip()"
        >
          <template #origin>
            <ReviewOrigin
              :origin="shownCard?.origin"
              :lapses="shownCard?.lapses"
              :topic-id="shownCard?.topic_id"
              :back-to="route.fullPath"
              @open="(kind) => track('review_origin_open', { kind })"
              @view-question="openQuestion"
            />
          </template>
        </ReviewCard>

        <!-- The first batch of the onboarding has no AI on the way: nothing to confirm, nothing to spend -->
        <div v-if="review.flipped && !review.showErrorDiary && !isOnboarding" class="flex flex-wrap items-center justify-center gap-x-3">
          <UiButton size="sm" variant="ghost" :icon-left="MessageCircle" data-testid="review-explain" @click="explainCard">Explicar este card</UiButton>
          <span v-if="chatQuota" class="text-label text-fg-muted">{{ chatQuota }}</span>
        </div>

        <!-- Error diary (replaces the ratings after an error) -->
        <template v-if="review.showErrorDiary">
          <LazyFlashcardErrorDiary
            :visible="true"
            :flashcard-id="review.diary?.flashcard_id ?? ''"
            :review-id="review.diary?.review_id ?? ''"
            @saved="dismissErrorDiary"
            @skipped="dismissErrorDiary"
          />
          <div class="flex justify-center">
            <UiButton size="sm" variant="ghost" :icon-left="MessageCircle" @click="openChatForError">Me explica esse erro</UiButton>
          </div>
        </template>

        <!-- Hints after an error and a weak connected caderno: optional context, never blocks -->
        <LazyReviewHints v-if="!review.showErrorDiary && (review.hintsLoading || review.hints.length || review.weakSuggestion?.length)" />
      </div>

      <!-- No card at all to show (the API answered nothing; should not happen once finished) -->
      <div v-else-if="!review.showErrorDiary" class="flex flex-col items-center gap-4 px-gutter py-16 text-center">
        <p class="text-body text-fg">Nada para revisar agora.</p>
        <UiButton variant="primary" :to="backTo">{{ backLabel }}</UiButton>
      </div>
    </div>

    <!-- Bottom bar: "Mostrar resposta" (the primary before the turn) or the 4 ratings, fixed on the phone -->
    <footer
      v-if="review.currentCard && !review.showErrorDiary && !batchEndIndex && !onboardingEnd && !review.finished && !review.saving && !review.awaitingPage"
      class="shrink-0 border-t border-line bg-raised px-gutter pt-3 pb-safe-bottom"
      data-testid="review-footer"
    >
      <div class="mx-auto w-full max-w-3xl pb-3">
        <ReviewRatings v-if="review.flipped" :intervals="review.currentIntervals" @rate="handleRate" />
        <UiButton v-else variant="primary" block aria-keyshortcuts="Space" data-testid="review-show" @click="review.flip()">Mostrar resposta</UiButton>
        <p class="mt-2 hidden text-center text-label text-fg-muted pointer-fine:block" data-testid="review-keys">
          <kbd class="font-sans">1</kbd> <kbd class="font-sans">2</kbd> <kbd class="font-sans">3</kbd> <kbd class="font-sans">4</kbd> · Espaço mostrar · U desfazer<template v-if="showShortcutTip"> · ? atalhos</template>
        </p>
      </div>
    </footer>

    <!-- Timer expired -->
    <UiDialog v-model="showTimerModal" :title="isBlitz ? 'Relâmpago concluído!' : 'Tempo esgotado'" size="sm">
      <p class="text-body text-fg">Você revisou <span class="font-semibold text-fg-strong">{{ review.reviewed }}</span> {{ review.reviewed === 1 ? 'card' : 'cards' }}{{ isBlitz ? ' em 5 min' : '' }}.</p>
      <template #footer>
        <UiButton variant="ghost" :to="backTo">Encerrar</UiButton>
        <UiButton variant="primary" @click="continueAfterTimer">{{ isBlitz ? 'Mais 5 min' : 'Continuar' }}</UiButton>
      </template>
    </UiDialog>

    <!-- Edit current card (E) -->
    <LazyFlashcardCardFormModal v-if="editLoaded && editingCard" v-model="showEditCard" :card="editingCard" @updated="onCardUpdated" />

    <!-- Shortcuts help (?) -->
    <UiDialog v-model="showShortcuts" title="Atalhos da revisão" size="sm">
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-meta">
        <template v-for="s in shortcutList" :key="s.keys">
          <dt><kbd class="rounded-tag border border-line-strong px-1.5 font-sans text-label text-fg">{{ s.keys }}</kbd></dt>
          <dd class="text-fg">{{ s.label }}</dd>
        </template>
      </dl>
    </UiDialog>
    <LazyQuestionViewDialog v-if="questionLoaded" v-model="questionOpen" :question-id="questionId" />
  </div>
</template>

<script setup lang="ts">
// Review v3 (prd-4d-revisao-v3): batches of 10, 20 or 30 (the person's choice) with a visible end, the origin of each card with a link to the
// excerpt, the 4 ratings in the same order on every screen, the end of a batch with the celebration, the goal
// of the day and the streak, and the end of the session with tomorrow and the retention suggestion. The
// reward moved from each rating (the old toasts) to the end of the batch; the 3 banners became one line; the
// "Mergulhar" became the focus mode. Slices of the F2 (scope=, card_ids, origin, ahead, errors_only), the
// blitz (5 min, no batches), the session timer, undo, the error diary and the unsent ratings stay as they were.
import type { Stats, TomorrowForecast } from '~/types'
import { cadernoPath, markScopeCleared } from '~/utils/scope'
import { reviewPath, scopeBackPath, scopeOf, scopeQuery, sessionScopeFromQuery } from '~/utils/reviewScope'
import { batchSummary, studyDayEnd } from '~/composables/useReviewBatches'
import type { StreakInfo } from '~/components/review/ReviewBatchEnd.vue'
import { MessageCircle } from 'lucide-vue-next'

definePageMeta({ chrome: 'focus' })

const review = useReviewStore()
const deckStore = useDeckStore()
const chat = useChatStore()
const examStore = useExamStore()
const topicStore = useTopicStore()
const addSheet = useAddSheet()
const route = useRoute()
const { $api } = useNuxtApp()
const { track } = useAnalytics()
const featureUsage = usePaidQuota()
const lastErrorCard = ref<any>(null)

// === Session modes ===
const sessionTimer = ref(0)
const showTimerModal = ref(false)
const isSurvivalMode = ref(false)
const isBlitz = ref(false)
const isErrorsOnly = computed(() => route.query.errors_only === '1')
const querySlice = computed(() => sessionScopeFromQuery(route.query))
const scopeTopicId = computed(() => querySlice.value.topicId ?? (querySlice.value.scope?.type === 'topic' ? querySlice.value.scope.id : null))
const isAhead = computed(() => !!querySlice.value.ahead)
const scopeOrigin = computed(() => querySlice.value.origin)
const blitzTo = computed(() => (scopeTopicId.value ? `/revisar?mode=blitz&topic_id=${scopeTopicId.value}` : '/revisar?mode=blitz'))

// === Batches (RF-F1) ===
const batches = useReviewBatches(isBlitz)
const showBatchBar = computed(() => batches.enabled.value && !review.loading && !review.sessionError && !review.finished)
const batchEndIndex = computed(() => batches.ended.value)
const batchEndSummary = computed(() => (batchEndIndex.value ? batchSummary(review.log, batchEndIndex.value, studyDayEnd()) : null))
const sessionSummary = computed(() => batchSummary(review.log, null, studyDayEnd()))

// === First batch of the onboarding (prd-4g-conta-onboarding-v3 RF-F5, F8): step 3 of the assistant ===
const auth = useAuthStore()
const isOnboarding = computed(() => route.query.onboarding === '1')
const onboardingEnd = computed(() => isOnboarding.value && review.sessionCount > 0 && review.firstPass.length >= review.sessionCount && !review.showErrorDiary)

// === Where the session goes back to and what it is about ===
const scopeBack = computed(() => scopeBackPath(review.scope) ?? (scopeTopicId.value ? cadernoPath(scopeTopicId.value) : null))
const backTo = computed(() => (isOnboarding.value ? '/hoje' : scopeBack.value ?? '/hoje'))
const backLabel = computed(() => {
  if (isOnboarding.value) return 'Ir para o Hoje'
  if (review.scope?.label && scopeBack.value) return `Voltar a ${review.scope.label}`
  return scopeTopicId.value ? 'Voltar ao caderno' : 'Ir para o Hoje'
})
/** "TRF 4ª Região" (+ "(todas as matérias)") or the path of the slice "TRF 4ª Região › Apostila" */
const scopeText = computed(() => {
  const sc = review.scope
  if (!sc?.label) return ''
  return sc.topic && sc.topic.name !== sc.label && sc.type !== 'topic' ? `${sc.topic.name} › ${sc.label}` : sc.label
})
const scopeNote = computed(() => (review.scope?.type === 'topic' && !review.scope.origin && !isErrorsOnly.value ? '(todas as matérias)' : ''))
const scopeEndLabel = computed(() => (review.scope?.label && review.scope.type !== 'cards' ? review.scope.label : null))
const language = computed(() => {
  const id = review.scope?.topic?.id ?? scopeTopicId.value
  return !!id && topicStore.rootOf(id)?.learning_mode === 'language'
})

/** The one line of context (in place of the Reta final / Sobrevivência / Relâmpago banners) */
const contextText = computed(() => {
  if (isBlitz.value) return 'Relâmpago: só os cards pendentes, sem novos'
  if (review.retaFinal?.active) {
    const exam = examStore.upcoming.find(e => review.retaFinal?.exam_titles.includes(e.title))
    return exam ? `Prova em ${exam.days_remaining} dias: estes cards valem mais` : `Reta final: +${review.retaFinal.extra_count} cards da prova`
  }
  if (isSurvivalMode.value) return 'Modo recuperação ligado: só os 20 mais urgentes'
  if (isAhead.value) return 'Praticando adiantado: o agendamento continua sendo atualizado'
  return ''
})

// The card on screen (the diary keeps the card that was missed)
const shownCard = computed(() => (review.showErrorDiary && review.diary ? review.diary.card : review.currentCard))
const cardLabel = computed(() => shownCard.value?.topic_name ?? '')

// === Stats: before the session (goal, streak, cards in the account) and at each end ===
const statsBefore = shallowRef<Stats | null>(null)
const statsNow = shallowRef<Stats | null>(null)
const statsLoading = ref(false)
const goalCelebrated = ref(false)
const streakAnimated = ref(false)
async function fetchStats(): Promise<Stats | null> {
  try {
    return (await $api<{ data: Stats }>('/stats')).data
  } catch (e) {
    reportApiError(e, { silent: true })
    return null
  }
}
/** At the end of a batch or of the session, once the ratings reached the server: fresh numbers. */
async function refreshStats() {
  statsLoading.value = true
  const s = await fetchStats()
  statsLoading.value = false
  if (!s) return
  statsNow.value = s
  const goal = s.goal
  if (goal?.met && statsBefore.value?.goal && !statsBefore.value.goal.met && !goalCelebrated.value) {
    // Once per study day on this device, shared with Hoje (prd-4a-hoje-v3)
    const key = `baigi-goal-celebrated-${studyDay()}`
    try {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1')
        goalCelebrated.value = true
        track('review_goal_met', { target_batches: goal.target_batches })
      }
    } catch { /* intencional: localStorage bloqueado, a meta não é celebrada de novo neste aparelho */ }
  }
}
const streakInfo = computed<StreakInfo | null>(() => {
  const s = statsNow.value
  if (!s) return null
  const extendedNow = !!s.streak_extended_today && !statsBefore.value?.streak_extended_today && !streakAnimated.value
  return { current: s.streak, record: s.streak >= 3 && s.streak === (s.streak_longest ?? 0), extendedNow }
})

const announcement = ref('')
watch(batchEndIndex, async (index, prev) => {
  if (!index) {
    if (prev) streakAnimated.value = streakAnimated.value || !!streakInfo.value?.extendedNow
    return
  }
  const sum = batchEndSummary.value!
  announcement.value = `Lote ${index} concluído, ${sum.remembered} de ${sum.size} lembrados.`
  track('review_batch_end', { batch_index: index, batches_total: batches.position.value.total, remembered: sum.remembered, size: sum.size, scope_type: review.scope?.type ?? null })
  await until(() => review.pendingCount === 0)
  if (batchEndIndex.value === index) await refreshStats()
})
watch(() => review.finished && review.totalRated > 0 && !review.saving, (done) => {
  if (done) void refreshStats()
})

function nextBatch() {
  const index = batchEndIndex.value
  if (!index) return
  track('review_batch_continue', { batch_index: index })
  goalCelebrated.value = false
  if (statsNow.value) statsBefore.value = statsNow.value
  review.ackBatch(index)
  announcement.value = ''
}
function stopAtBatch() {
  if (batchEndIndex.value) track('review_batch_stop', { batch_index: batchEndIndex.value })
}

/** Resolves when `cond` holds (or after 8 s: the numbers are then the last known). */
function until(cond: () => boolean): Promise<void> {
  if (cond()) return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(() => { stop(); resolve() }, 8000)
    const stop = watch(cond, (ok) => { if (ok) { clearTimeout(timer); stop(); resolve() } })
  })
}

// === "Amanhã: N cards" + the reminder (prd-retencao-lembretes RF-F04): after the queue drains ===
const tomorrow = ref<TomorrowForecast | null>(null)
const tomorrowLoading = ref(false)
const tomorrowFailed = ref(false)
watch(() => (review.finished || onboardingEnd.value) && !review.saving && (!onboardingEnd.value || review.pendingCount === 0), async (ready) => {
  if (!ready || tomorrow.value || tomorrowLoading.value) return
  tomorrowLoading.value = true
  try {
    tomorrow.value = (await $api<{ data: TomorrowForecast }>('/review/tomorrow')).data
  } catch (e) {
    tomorrowFailed.value = true // never lie: the block simply does not render
    reportApiError(e, { silent: true })
  } finally {
    tomorrowLoading.value = false
  }
})
watch(() => review.finished, (done) => {
  if (done) return
  tomorrow.value = null
  tomorrowFailed.value = false
})

// Activation = the first batch concluded, whatever the way in (prd-4g RF-B3): the server records it once
watch(() => !isBlitz.value && review.pendingCount === 0 && !!auth.user && !auth.user.first_batch_at
  && (!!batchEndIndex.value || onboardingEnd.value || (review.finished && review.totalRated > 0)), (reached) => {
  if (!reached || !auth.user) return
  auth.user.first_batch_at = new Date().toISOString()
  $api('/onboarding/first-batch', { method: 'POST' }).catch((e: unknown) => reportApiError(e, { silent: true }))
})

const { run: runReminder, pending: enablingReminder } = useApiAction()
async function enableReminder() {
  const f = tomorrow.value
  if (!f) return
  try {
    await runReminder(() => $api('/settings', { method: 'PUT', body: { reminder_enabled: true } }), {
      success: `Lembrete ativado para ${formatReminderHour(f.reminder.hour)}`,
      error: 'Não foi possível ativar o lembrete.',
      rethrow: true,
    })
    f.reminder.enabled = true
    track('reminder_toggled', { on: true, hour: f.reminder.hour, source: 'session_end' })
  } catch (e) {
    if (isEmailSuppressedError(e)) f.reminder.suppressed = true
  }
}

// "Reforçar erros (N)" in the same slice (F2): its size from /review/session-count, hidden when 0
const errorsScope = computed(() => (isErrorsOnly.value ? null : scopeOf(review.scope, querySlice.value.scope?.type === 'cards' ? querySlice.value.scope.ids : [])))
const errorsCount = ref<number | null>(null)
watch(() => review.finished && !review.saving && review.totalRated > 0, async (done) => {
  errorsCount.value = null
  if (!done || !errorsScope.value) return
  try {
    const res = await $api<{ data: { session_count: number } }>(`/review/session-count?${scopeQuery(errorsScope.value, { errorsOnly: true, origin: scopeOrigin.value })}`)
    errorsCount.value = res.data.session_count
  } catch (e) {
    reportApiError(e, { silent: true })
  }
})

// The person's own session emptied the caderno: its page celebrates once (05/#11)
watch(() => review.finished && !review.saving, (done) => {
  const topicId = scopeTopicId.value
  if (!done || !topicId || review.totalRated === 0 || review.pendingLearning > 0) return
  if (isErrorsOnly.value || isBlitz.value || route.query.backlog === '1') return
  markScopeCleared(topicId)
})

// === Rating ===
function handleRate(rating: number) {
  const card = review.currentCard
  if (!card || review.showErrorDiary || batchEndIndex.value) return
  if (rating <= 2) lastErrorCard.value = { ...card }
  review.rate(rating as 1 | 2 | 3 | 4)
}

async function handleUndo() {
  await review.undo()
}

function dismissErrorDiary() {
  review.dismissDiary()
}

// === Focus mode (in place of "Mergulhar"): no top, no context, full screen when the browser allows ===
const focusMode = ref(false)
function enterFocus() {
  focusMode.value = true
  document.documentElement.requestFullscreen?.().catch(() => { /* intencional: sem tela cheia, o modo foco só esconde o topo */ })
}
function exitFocus() {
  focusMode.value = false
  if (document.fullscreenElement) void document.exitFullscreen?.()
}
function onFullscreenChange() {
  if (!document.fullscreenElement && focusMode.value) focusMode.value = false
}
onMounted(() => document.addEventListener('fullscreenchange', onFullscreenChange))
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', onFullscreenChange))

// === Shortcuts (RF-F8) ===
const showShortcuts = ref(false)
const shortcutList = [
  { keys: 'Espaço / Enter', label: 'Mostrar a resposta; com ela na tela, "Bom"' },
  { keys: '1 2 3 4', label: 'De novo · Difícil · Bom · Fácil' },
  { keys: 'O', label: 'Abrir a origem do card' },
  { keys: 'U / Ctrl+Z', label: 'Desfazer a última avaliação' },
  { keys: 'E', label: 'Editar o card atual' },
  { keys: 'Enter / Esc', label: 'No fim do lote: próximo lote / voltar' },
  { keys: '?', label: 'Mostrar ou esconder os atalhos' },
  { keys: 'Esc', label: 'Sair do modo foco; fechar o diário; senão, sair' },
]

const showEditCard = ref(false)
const editLoaded = useLoadedOnce(() => showEditCard.value)
const editingCard = ref<any>(null)
function openEdit() {
  if (!review.currentCard || review.showErrorDiary || batchEndIndex.value) return
  editingCard.value = { ...review.currentCard }
  showEditCard.value = true
}
function onCardUpdated(card?: { id: string; front: string; back: string }) {
  if (card) review.updateCurrentContent(card)
}

// "Ver a questão" of a pasted question (prd-questao-errada RF-F5): a dialog over the session
const questionOpen = ref(false)
const questionId = ref<string | null>(null)
const questionLoaded = useLoadedOnce(() => questionOpen.value)
function openQuestion(id: string) {
  questionId.value = id
  questionOpen.value = true
}

function openOrigin() {
  const link = document.querySelector<HTMLAnchorElement>('[data-testid=review-origin-link]')
  link?.click()
}

useReviewShortcuts({
  edit: openEdit,
  openOrigin,
  flip: () => { if (review.currentCard && !review.showErrorDiary) review.flip() },
  rate: (r) => { if (review.flipped && !review.showErrorDiary) handleRate(r) },
  undo: () => { if (review.canUndo) void handleUndo() },
  toggleHelp: () => { showShortcuts.value = !showShortcuts.value },
  escape: () => {
    if (focusMode.value) exitFocus()
    else if (review.showErrorDiary) dismissErrorDiary()
    else void navigateTo(backTo.value)
  },
  isFlipped: () => review.flipped,
  isSuspended: () => showTimerModal.value || showEditCard.value || onboardingEnd.value,
  batchEnd: () => (batchEndIndex.value && !review.showErrorDiary
    ? { next: nextBatch, stop: () => { stopAtBatch(); void navigateTo(backTo.value) } }
    : null),
})

// "? atalhos" on the first 3 sessions (pointer: fine only)
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

// === Tira-dúvidas in context: the card goes to the server (flashcard_id, RF-B4) ===
const chatQuota = computed(() => {
  // A Free account whose trial opens on this click: no "0 de 0", the server opens the trial (RF-F7b)
  if (!featureUsage.isLimited('agent_chat') || featureUsage.opensTrial('agent_chat')) return ''
  const f = featureUsage.usage.value?.features.agent_chat
  return f && f.limit ? `${f.remaining ?? 0} de ${f.limit} ${featureUsage.periodLabel.value}` : ''
})
function askAbout(card: { id: string; front: string; back: string; topic_id?: string | null }, source: 'review_card' | 'review_error', draft: string) {
  if (!featureUsage.canUse('agent_chat')) {
    // The paid plan at the limit gets the toast with the reset day, not the upgrade (prd-uso-justo RN-3)
    window.dispatchEvent(new CustomEvent('feature-limit-reached', { detail: featureUsage.limitDetail('agent_chat') }))
    return
  }
  chat.ask({ cardId: card.id, cardFront: card.front, topicId: card.topic_id ?? scopeTopicId.value ?? undefined, source }, draft)
}
function openChatForError() {
  const card = review.diary?.card ?? lastErrorCard.value
  if (card) askAbout(card, 'review_error', `Me explica esse card que errei: "${htmlToPlain(card.front)}"`)
}
function explainCard() {
  const card = review.currentCard
  if (!card) return
  track('review_explain_open', {})
  askAbout(card, 'review_card', 'Me explica este card.')
}

// === Leaving with unsent ratings asks first (RF-F2.4) ===
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (review.pendingCount > 0) {
    e.preventDefault()
    e.returnValue = ''
  }
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onUnmounted(() => window.removeEventListener('beforeunload', onBeforeUnload))
onBeforeRouteLeave(() => {
  if (review.pendingCount > 0) return window.confirm(`${review.pendingCount} avaliação(ões) ainda não foram enviadas. Sair mesmo assim?`)
  return true
})

// === Loading the session ===
const sessionAnalytics = useReviewSessionAnalytics()
let timerInterval: ReturnType<typeof setInterval> | null = null

async function loadSession() {
  const deckId = route.query.deck_id as string | undefined
  const mode = route.query.mode as string | undefined
  const slice = sessionScopeFromQuery(route.query)
  goalCelebrated.value = false
  streakAnimated.value = false
  statsNow.value = null
  // The first batch of the onboarding is not interrupted: the diary of errors starts with the second session.
  // Set before the first card shows up, and /settings does not bring it back.
  if (isOnboarding.value) review.errorDiaryMode = 'never'
  if (deckId) await deckStore.fetchDeck(deckId)
  const [, before] = await Promise.all([
    review.fetchSession({ ...slice, deckId, backlog: route.query.backlog === '1', mode, includeRelated: route.query.include_related === '1' }),
    fetchStats(),
  ])
  statsBefore.value = before

  isBlitz.value = mode === 'blitz'
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = null
  if (isBlitz.value) startTimer(300)
  else await loadSessionTimer()
  if (isOnboarding.value) track('onboarding_step', { step: 3, mode: auth.user?.default_learning_mode ?? null })
  sessionAnalytics.started(route.query, isSurvivalMode.value, review.total)
}

watch(() => review.finished || onboardingEnd.value, (done) => {
  if (done) sessionAnalytics.completed(review.ratingsCount)
})

function startTimer(seconds: number) {
  sessionTimer.value = seconds
  timerInterval = setInterval(() => { if (sessionTimer.value > 0) sessionTimer.value-- }, 1000)
}

async function loadSessionTimer() {
  try {
    const res = await $api<any>('/settings')
    isSurvivalMode.value = res.data.survival_mode ?? false
    if (res.data.error_diary_mode && !isOnboarding.value) review.errorDiaryMode = res.data.error_diary_mode
    if (res.data.session_time_limit) startTimer(res.data.session_time_limit * 60)
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
  if (isBlitz.value) startTimer(300)
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

onMounted(loadSession)
onMounted(() => {
  void examStore.fetchUpcoming()
  void featureUsage.fetchUsage()
  if (!topicStore.tree.length && !topicStore.loading) void topicStore.fetchTree()
})

// Tick every 5 s: cards in learning become due
let tickInterval: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  tickInterval = setInterval(() => { if (review.learningQueue.length > 0) review._tick++ }, 5000)
})
onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
  if (timerInterval) clearInterval(timerInterval)
  if (document.fullscreenElement) void document.exitFullscreen?.()
})

watch(() => route.query, (newQ, oldQ) => {
  if (JSON.stringify(newQ) !== JSON.stringify(oldQ)) void loadSession()
})

useHead({ title: 'Revisão · Baigi' })
</script>
