import { defineStore } from 'pinia'
import type { Flashcard, WeakConnection } from '~/types'
import { getErrorStatus } from '~/utils/apiErrors'

export interface SessionCard extends Flashcard {
  next_intervals: { again: string; hard: string; good: string; easy: string }
  topic_name?: string | null
}

export type Rating = 1 | 2 | 3 | 4
export type ErrorDiaryMode = 'always' | 'sometimes' | 'never'

export interface QueueItem {
  client_id: string
  flashcard_id: string
  rating: Rating
  attempts: number
  status: 'pending' | 'sending'
  /** Undone while in flight: the server review is undone as soon as it answers. */
  cancelled?: boolean
}

export interface UndoEntry {
  client_id: string
  review_id?: string
  rating: Rating
  cardSnapshot: SessionCard
  index: number
  wasFromLearningQueue: boolean
}

export const UNDO_MAX = 10
export const RETRY_DELAYS = [1000, 2000, 4000]

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // RFC4122 v4 fallback (old Safari)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Diary cadence (RN-UX-04): `sometimes` = 1st error of the session and then every 3rd. */
export function shouldOpenDiary(mode: ErrorDiaryMode, errorsThisSession: number): boolean {
  if (mode === 'never') return false
  if (mode === 'always') return true
  return errorsThisSession >= 1 && (errorsThisSession - 1) % 3 === 0
}

export const useReviewStore = defineStore('review', {
  state: () => ({
    cards: [] as SessionCard[],
    learningQueue: [] as { card: SessionCard; dueAt: number }[],
    currentIndex: 0,
    totalReviewed: 0,
    initialTotal: 0,
    flipped: false,
    loading: false,
    finished: false,
    sessionError: null as unknown,
    weakSuggestion: null as WeakConnection[] | null,
    noteSnippet: null as { note_id: string; title: string; snippet: string; topic_id: string } | null,
    lastReviewId: null as string | null,
    showErrorDiary: false,
    /** Card and review the open diary refers to (review_id arrives with the server answer). */
    diary: null as { client_id: string; flashcard_id: string; card: SessionCard; review_id: string | null } | null,
    errorDiaryMode: 'sometimes' as ErrorDiaryMode,
    hints: [] as { type: string; text: string }[],
    hintsLoading: false,
    retaFinal: null as { active: boolean; exam_titles: string[]; extra_count: number } | null,
    // Optimistic submit queue (RF-F2.3/F2.4)
    reviewQueue: [] as QueueItem[],
    queuePaused: false,
    processing: false,
    undoStack: [] as UndoEntry[],
    undoAnnouncement: '',
    // Session summary (RF-F2.10)
    sessionStartedAt: 0,
    ratingsCount: { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<Rating, number>,
    errorsThisSession: 0,
    _tick: 0,
    _pendingAdvance: null as (() => void) | null,
  }),

  getters: {
    currentCard(state): SessionCard | null {
      void state._tick // reactive dependency
      const now = Date.now()
      // Show due learning cards first
      const dueLearn = state.learningQueue.find(q => q.dueAt <= now)
      if (dueLearn) return dueLearn.card
      // Show main cards
      const mainCard = state.cards[state.currentIndex] ?? null
      if (mainCard) return mainCard
      // No main cards left — show next learning card regardless of timer (learn ahead)
      return state.learningQueue[0]?.card ?? null
    },
    currentIntervals(): { again: string; hard: string; good: string; easy: string } {
      return this.currentCard?.next_intervals ?? { again: '', hard: '', good: '', easy: '' }
    },
    total(state): number {
      return state.cards.length + state.learningQueue.length
    },
    reviewed: (state) => state.currentIndex,
    progress(state): number {
      void state._tick // force reactivity
      const total = state.cards.length + state.learningQueue.length
      const left = (state.cards.length - state.currentIndex) + state.learningQueue.length
      if (!total) return 0
      return Math.min(100, Math.round(((total - left) / total) * 100))
    },
    pendingLearning: (state) => state.learningQueue.length,
    remaining(state): number {
      void state._tick // force reactivity
      return (state.cards.length - state.currentIndex) + state.learningQueue.length
    },
    pendingCount: (state) => state.reviewQueue.length,
    canUndo: (state) => state.undoStack.length > 0,
    /** Nothing left to show but answers still on their way to the server. */
    saving(state): boolean {
      return state.currentIndex >= state.cards.length && state.learningQueue.length === 0 && state.reviewQueue.length > 0
    },
    totalRated: (state) => state.ratingsCount[1] + state.ratingsCount[2] + state.ratingsCount[3] + state.ratingsCount[4],
  },

  actions: {
    async fetchSession(deckId?: string, topicId?: string, errorsOnly?: boolean, backlog?: boolean, mode?: string) {
      this.loading = true
      this.finished = false
      this.sessionError = null
      this.cards = []
      this.currentIndex = 0
      this.totalReviewed = 0
      this.flipped = false
      this.learningQueue = []
      this.weakSuggestion = null
      this.noteSnippet = null
      this.hints = []
      this.showErrorDiary = false
      this.diary = null
      this._pendingAdvance = null
      this.retaFinal = null
      this.undoStack = []
      this.ratingsCount = { 1: 0, 2: 0, 3: 0, 4: 0 }
      this.errorsThisSession = 0
      try {
        const { $api } = useNuxtApp()
        const params = new URLSearchParams()
        if (deckId) params.set('deck_id', deckId)
        if (topicId) params.set('topic_id', topicId)
        if (errorsOnly) params.set('errors_only', '1')
        if (backlog) params.set('backlog', '1')
        if (mode) params.set('mode', mode)
        const query = params.toString() ? `?${params}` : ''
        const res = await $api<any>(`/review/session${query}`)
        const allCards = res.data as SessionCard[]
        this.retaFinal = res.reta_final ?? null
        const now = Date.now()

        // Separate learning/relearning cards with future due into learningQueue
        for (const card of allCards) {
          const isLearning = card.state === 'learning' || card.state === 'relearning'
          const dueFuture = card.due && new Date(card.due).getTime() > now
          if (isLearning && dueFuture) {
            this.learningQueue.push({ card, dueAt: new Date(card.due!).getTime() })
          } else {
            this.cards.push(card)
          }
        }

        this.initialTotal = this.cards.length
        this.sessionStartedAt = Date.now()
        // "Tudo em dia" only after a 2xx (RN-UX-03)
        this.checkFinished()
      } catch (e) {
        this.sessionError = e
        this.finished = false
      } finally {
        this.loading = false
      }
    },

    flip() {
      this.flipped = true
    },

    /** Rate the current card: advances immediately and queues the submit (RF-F2.3). */
    rate(rating: Rating) {
      const card = this.currentCard
      if (!card || this.showErrorDiary) return

      const clientId = uuid()
      const wasFromLearningQueue = this.learningQueue.some(q => q.card.id === card.id)

      this.reviewQueue.push({ client_id: clientId, flashcard_id: card.id, rating, attempts: 0, status: 'pending' })
      this.undoStack.push({ client_id: clientId, rating, cardSnapshot: { ...card }, index: this.currentIndex, wasFromLearningQueue })
      if (this.undoStack.length > UNDO_MAX) this.undoStack.shift()

      this.ratingsCount[rating]++
      this.hints = []
      if (rating === 1) this.errorsThisSession++

      // The rated card leaves the session until the server answers
      this.learningQueue = this.learningQueue.filter(q => q.card.id !== card.id)

      const advance = () => {
        if (!wasFromLearningQueue) {
          this.currentIndex++
          this.totalReviewed++
        }
        if (this.currentIndex >= this.cards.length) {
          // No main cards left: learning cards become available right away (learn ahead)
          this.learningQueue = this.learningQueue.map(item => ({ ...item, dueAt: Date.now() }))
        }
        this.flipped = false
        this._tick++
        this.checkFinished()
      }

      if (rating === 1 && shouldOpenDiary(this.errorDiaryMode, this.errorsThisSession)) {
        this.diary = { client_id: clientId, flashcard_id: card.id, card: { ...card }, review_id: null }
        this.showErrorDiary = true
        this._pendingAdvance = advance
      } else {
        advance()
      }

      void this.processQueue()
    },

    /** Legacy entry point kept for callers; the answer is no longer awaited. */
    async submitReview(rating: Rating) {
      this.rate(rating)
    },

    dismissDiary() {
      this.showErrorDiary = false
      this.diary = null
      const advance = this._pendingAdvance
      this._pendingAdvance = null
      advance?.()
    },

    /** Serial, idempotent sender (RN-UX-02). */
    async processQueue() {
      if (this.processing || this.queuePaused) return
      this.processing = true
      const { $api } = useNuxtApp()
      try {
        while (this.reviewQueue.length && !this.queuePaused) {
          const item = this.reviewQueue[0]!
          item.status = 'sending'
          try {
            const res = await $api<any>('/review', {
              method: 'POST',
              body: { flashcard_id: item.flashcard_id, rating: item.rating, client_id: item.client_id },
            })
            this.reviewQueue.shift()
            if (item.cancelled) {
              // Undone while in flight: revert on the server before sending the next one
              const reviewId: string | undefined = res.data?.review?.id
              if (reviewId) await $api(`/reviews/${reviewId}/undo`, { method: 'POST' }).catch((err: unknown) => reportApiError(err, { silent: true }))
              continue
            }
            this.applyServerAnswer(item, res.data)
          } catch (e) {
            item.status = 'pending'
            const status = getErrorStatus(e)
            if (status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429) {
              // Card gone / invalid: drop it and keep reviewing
              this.reviewQueue.shift()
              this.undoStack = this.undoStack.filter(u => u.client_id !== item.client_id)
              if (status !== 401) useToast().show('Uma avaliação não pôde ser salva (o card pode ter sido excluído).', 'warning')
              continue
            }
            item.attempts++
            if (item.attempts > RETRY_DELAYS.length) {
              this.queuePaused = true
              break
            }
            await sleep(RETRY_DELAYS[item.attempts - 1]!)
          }
        }
      } finally {
        this.processing = false
        this.checkFinished()
      }
    },

    applyServerAnswer(item: QueueItem, data: any) {
      const reviewId: string | null = data?.review?.id ?? null
      const entry = this.undoStack.find(u => u.client_id === item.client_id)
      if (entry && reviewId) entry.review_id = reviewId

      this.lastReviewId = reviewId
      if (this.diary?.client_id === item.client_id) this.diary.review_id = reviewId

      this.weakSuggestion = data?.weak_connections ?? null
      this.noteSnippet = data?.note_snippet ?? null

      const updatedCard = { ...data.flashcard, next_intervals: data.next_intervals } as SessionCard
      // The server answer is the source of truth for scheduling
      if (updatedCard.is_learning) {
        const noMainLeft = this.currentIndex >= this.cards.length
        const dueAt = noMainLeft ? Date.now() : (updatedCard.due ? new Date(updatedCard.due).getTime() : Date.now() + 60000)
        this.learningQueue.push({ card: updatedCard, dueAt })
        this._tick++
      }

      if (item.rating <= 2 && updatedCard.source_note_id) void this.fetchHints(updatedCard.id)
    },

    /** Hints are optional context: fetched after the answer, never on the critical path (RF-F2.7). */
    async fetchHints(cardId: string) {
      this.hintsLoading = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>(`/flashcards/${cardId}/hints`)
        this.hints = res.data ?? []
      } catch (e) {
        reportApiError(e, { silent: true })
        this.hints = []
      } finally {
        this.hintsLoading = false
      }
    },

    retryQueue() {
      this.queuePaused = false
      for (const item of this.reviewQueue) item.attempts = 0
      void this.processQueue()
    },

    /** Undo the last rating (RF-F2.5). Local when still queued, otherwise via the API. */
    async undo(): Promise<boolean> {
      const entry = this.undoStack[this.undoStack.length - 1]
      if (!entry) return false

      if (this.diary?.client_id === entry.client_id) {
        this.showErrorDiary = false
        this.diary = null
        this._pendingAdvance = null
        // Advance never happened: just drop the rating below without moving the index
        this.undoStack.pop()
        this.forgetRating(entry)
        const queued = this.reviewQueue.findIndex(q => q.client_id === entry.client_id)
        if (queued !== -1 && this.reviewQueue[queued]!.status !== 'sending') this.reviewQueue.splice(queued, 1)
        else if (queued !== -1) this.reviewQueue[queued]!.cancelled = true
        else if (entry.review_id) await this.remoteUndo(entry, true)
        this.restoreCard(entry, entry.cardSnapshot, true)
        this.announceUndo()
        return true
      }

      const queued = this.reviewQueue.findIndex(q => q.client_id === entry.client_id)
      if (queued !== -1) {
        if (this.reviewQueue[queued]!.status === 'sending') this.reviewQueue[queued]!.cancelled = true
        else this.reviewQueue.splice(queued, 1)
        this.undoStack.pop()
        this.forgetRating(entry)
        this.restoreCard(entry, entry.cardSnapshot)
        this.announceUndo()
        return true
      }

      if (!entry.review_id) return false
      return this.remoteUndo(entry)
    },

    async remoteUndo(entry: UndoEntry, alreadyRestored = false): Promise<boolean> {
      const { $api } = useNuxtApp()
      try {
        const res = await $api<any>(`/reviews/${entry.review_id}/undo`, { method: 'POST' })
        if (alreadyRestored) return true
        this.undoStack = this.undoStack.filter(u => u.client_id !== entry.client_id)
        this.forgetRating(entry)
        const card = { ...entry.cardSnapshot, ...res.data.flashcard, next_intervals: res.data.next_intervals } as SessionCard
        this.restoreCard(entry, card)
        this.announceUndo()
        return true
      } catch (e) {
        if (getErrorStatus(e) === 409) {
          this.undoStack = this.undoStack.filter(u => u.client_id !== entry.client_id)
          useToast().show('Não dá mais para desfazer essa avaliação.', 'warning')
        } else {
          reportApiError(e)
        }
        return false
      }
    },

    forgetRating(entry: UndoEntry) {
      this.ratingsCount[entry.rating] = Math.max(0, this.ratingsCount[entry.rating] - 1)
      if (entry.rating === 1) this.errorsThisSession = Math.max(0, this.errorsThisSession - 1)
    },

    restoreCard(entry: UndoEntry, card: SessionCard, notAdvanced = false) {
      // The server answer may have re-queued the card in learning: drop that copy
      this.learningQueue = this.learningQueue.filter(q => q.card.id !== card.id)
      if (entry.wasFromLearningQueue) {
        this.learningQueue.unshift({ card, dueAt: 0 })
      } else {
        this.cards.splice(entry.index, 1, card)
        if (!notAdvanced) this.totalReviewed = Math.max(0, this.totalReviewed - 1)
        this.currentIndex = entry.index
      }
      this.flipped = false
      this.finished = false
      this.weakSuggestion = null
      this.noteSnippet = null
      this.hints = []
      this._tick++
    },

    announceUndo() {
      this.undoAnnouncement = ''
      // Re-set on next tick so repeated undos are announced again
      setTimeout(() => { this.undoAnnouncement = 'Avaliação desfeita' }, 50)
    },

    /** Edit (E) during review: content only, scheduling untouched (RF-F2.11). */
    updateCurrentContent(card: Pick<Flashcard, 'id' | 'front' | 'back'>) {
      const patch = (c: SessionCard) => (c.id === card.id ? { ...c, front: card.front, back: card.back } : c)
      this.cards = this.cards.map(patch)
      this.learningQueue = this.learningQueue.map(q => ({ ...q, card: patch(q.card) }))
    },

    checkFinished() {
      const hasMainCards = this.currentIndex < this.cards.length
      const hasPendingLearning = this.learningQueue.length > 0
      // The end screen waits for the queue to drain (RF-F2.4)
      this.finished = !hasMainCards && !hasPendingLearning && this.reviewQueue.length === 0 && !this.sessionError
    },
  },
})
