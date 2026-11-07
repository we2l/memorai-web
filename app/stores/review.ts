import { defineStore } from 'pinia'
import type { CardOrigin, Flashcard, WeakConnection } from '~/types'
import { getErrorStatus } from '~/utils/apiErrors'
import { scopeQuery, type ReviewScope, type SessionScopeInfo } from '~/utils/reviewScope'

export interface SessionCard extends Flashcard {
  next_intervals: { again: string; hard: string; good: string; easy: string }
  topic_name?: string | null
  /** Where the card came from (prd-4d-revisao-v3 RF-B1): quiz question › part of a PDF › note */
  origin?: CardOrigin | null
}

/** One rating of the session, for the batches (prd-4d-revisao-v3 RF-F1, RF-F5). */
export interface RatingLog {
  client_id: string
  card_id: string
  rating: Rating
  /** Time on the card, from the moment it showed up to the rating */
  duration_ms: number
  topic_id: string | null
  topic_name: string | null
  /** The 1st rating of this card in the session (only those count in a batch) */
  first: boolean
  /** Batch (1-based) the rating belongs to */
  batch: number
  /** New due date from the server answer (null until it arrives) */
  due: string | null
}

/** A batch is 20 distinct cards rated for the 1st time in the session (ReviewService::BATCH_SIZE). */
export const REVIEW_BATCH = 20

export type Rating = 1 | 2 | 3 | 4

/** What /revisar asks the API for (prd-caderno-f2-recorte RF-F2). */
export interface SessionOptions {
  deckId?: string
  /** Caderno or subject (the subtree): `topic_id=` */
  topicId?: string
  /** Any slice: document, note, quiz, podcast or a list of card ids */
  scope?: ReviewScope
  origin?: 'quiz' | 'question' | 'loose'
  ahead?: boolean
  errorsOnly?: boolean
  backlog?: boolean
  mode?: string
  includeRelated?: boolean
}
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
/** The next page of the session is asked when this many main cards are left (RF-F7). */
export const NEXT_PAGE_AT = 10

// Bumped by each fetchSession: a late page of the previous session is dropped
let sessionSeq = 0

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
    // GET /review/session pages (≤ 100 cards, prd-performance-caderno RF-F7): one continuous session
    sessionQuery: '',
    /** The slice the API reports for this session (null = the global one; prd-caderno-f2-recorte RF-B5) */
    scope: null as SessionScopeInfo | null,
    hasMore: false,
    loadingMore: false,
    /** Session cards beyond the loaded pages (session_count − page size, at the last page) */
    unloadedCount: 0,
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
    /** Size of the session the button promised (session_count of the 1st page) */
    sessionCount: 0,
    /** Cards rated at least once, in the order of their 1st rating */
    firstPass: [] as string[],
    log: [] as RatingLog[],
    /** Batch ends the person already left ("Próximo lote") */
    batchesAcked: 0,
    /** When the current card showed up (duration of each rating) */
    cardShownAt: 0,
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
      return state.cards.length + state.learningQueue.length + state.unloadedCount
    },
    reviewed: (state) => state.currentIndex,
    progress(state): number {
      void state._tick // force reactivity
      const total = state.cards.length + state.learningQueue.length + state.unloadedCount
      const left = (state.cards.length - state.currentIndex) + state.learningQueue.length + state.unloadedCount
      if (!total) return 0
      return Math.min(100, Math.round(((total - left) / total) * 100))
    },
    pendingLearning: (state) => state.learningQueue.length,
    remaining(state): number {
      void state._tick // force reactivity
      return (state.cards.length - state.currentIndex) + state.learningQueue.length + state.unloadedCount
    },
    pendingCount: (state) => state.reviewQueue.length,
    canUndo: (state) => state.undoStack.length > 0,
    /** Nothing left to show but answers still on their way to the server. */
    saving(state): boolean {
      return state.currentIndex >= state.cards.length && state.learningQueue.length === 0 && state.reviewQueue.length > 0
    },
    /** Nothing left to show while the next page of the session is on its way (never "Tudo em dia"). */
    awaitingPage(state): boolean {
      return state.currentIndex >= state.cards.length && state.learningQueue.length === 0 && state.hasMore
    },
    totalRated: (state) => state.ratingsCount[1] + state.ratingsCount[2] + state.ratingsCount[3] + state.ratingsCount[4],
  },

  actions: {
    /**
     * Opens a session. `topicId` = the topic and its subtree; `scope` = any slice of the F2 (document,
     * note, quiz, podcast, cards; prd-caderno-f2-recorte RF-F2). includeRelated adds the graph neighbours
     * of a topic (F1 RF-B1, no UI yet).
     */
    async fetchSession(opts: SessionOptions = {}) {
      const seq = ++sessionSeq
      this.loading = true
      this.finished = false
      this.sessionError = null
      this.scope = null
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
      this.sessionCount = 0
      this.firstPass = []
      this.log = []
      this.batchesAcked = 0
      this.hasMore = false
      this.loadingMore = false
      this.unloadedCount = 0
      try {
        const { $api } = useNuxtApp()
        const params = new URLSearchParams(scopeQuery(opts.scope ?? opts.topicId ?? null, {
          errorsOnly: opts.errorsOnly, ahead: opts.ahead, origin: opts.origin,
        }))
        if (opts.deckId) params.set('deck_id', opts.deckId)
        if (opts.backlog) params.set('backlog', '1')
        if (opts.mode) params.set('mode', opts.mode)
        if (opts.includeRelated) params.set('include_related', '1')
        const query = params.toString() ? `?${params}` : ''
        const res = await $api<any>(`/review/session${query}`)
        if (seq !== sessionSeq) return
        this.sessionQuery = query
        this.scope = res.scope ?? null
        this.retaFinal = res.reta_final ?? null
        this.addPage(res)

        this.initialTotal = this.cards.length
        this.sessionCount = res.session_count ?? (this.cards.length + this.learningQueue.length)
        this.sessionStartedAt = Date.now()
        this.cardShownAt = Date.now()
        // "Tudo em dia" only after a 2xx (RN-UX-03)
        this.checkFinished()
        this.prefetchPage()
      } catch (e) {
        if (seq !== sessionSeq) return
        this.sessionError = e
        this.finished = false
      } finally {
        if (seq === sessionSeq) this.loading = false
      }
    },

    /**
     * Cards of a session page. Reviewed cards are no longer eligible on the server, but the
     * page may repeat cards still unrated here, in learning or with the answer on its way: an id
     * already in the session is dropped.
     */
    addPage(res: { data: SessionCard[]; has_more?: boolean; session_count?: number }): number {
      const seen = new Set([...this.cards.map(c => c.id), ...this.learningQueue.map(q => q.card.id), ...this.reviewQueue.map(q => q.flashcard_id)])
      const now = Date.now()
      let added = 0
      // Separate learning/relearning cards with future due into learningQueue
      for (const card of res.data) {
        if (seen.has(card.id)) continue
        seen.add(card.id)
        added++
        const isLearning = card.state === 'learning' || card.state === 'relearning'
        const dueFuture = card.due && new Date(card.due).getTime() > now
        if (isLearning && dueFuture) {
          this.learningQueue.push({ card, dueAt: new Date(card.due!).getTime() })
        } else {
          this.cards.push(card)
        }
      }
      // A page with nothing new (all of it already here) ends the paging: no request loop
      this.hasMore = !!res.has_more && added > 0
      this.unloadedCount = this.hasMore ? Math.max(0, (res.session_count ?? 0) - res.data.length) : 0
      return added
    },

    /** Asks the next page when few main cards are left: after the first page, a page and each rating. */
    prefetchPage() {
      const mainLeft = this.cards.length - this.currentIndex
      if (this.hasMore && !this.loadingMore && !this.sessionError && mainLeft <= NEXT_PAGE_AT) void this.fetchMore()
    },

    /** Next page of the session, asked before the current one runs out (RF-F7). */
    async fetchMore() {
      if (!this.hasMore || this.loadingMore) return
      const seq = sessionSeq
      this.loadingMore = true
      let ok = false
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>(`/review/session${this.sessionQuery}`)
        if (seq !== sessionSeq) return
        this.addPage(res)
        ok = true
      } catch (e) {
        if (seq !== sessionSeq) return
        // Cards still on screen: the next rating tries again; nothing left: the error screen retries
        if (this.currentIndex >= this.cards.length && !this.learningQueue.length) this.sessionError = e
        else reportApiError(e, { silent: true })
      } finally {
        if (seq === sessionSeq) {
          this.loadingMore = false
          this._tick++
          this.checkFinished()
          if (ok) this.prefetchPage()
        }
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

      // Batches: distinct cards in their 1st rating; a learning card that comes back belongs to the batch open now
      const first = !this.firstPass.includes(card.id)
      const batch = first ? Math.floor(this.firstPass.length / REVIEW_BATCH) + 1 : Math.max(1, this.batchesAcked + 1)
      if (first) this.firstPass.push(card.id)
      this.log.push({
        client_id: clientId, card_id: card.id, rating, duration_ms: Math.max(0, Date.now() - (this.cardShownAt || Date.now())),
        topic_id: card.topic_id ?? null, topic_name: card.topic_name ?? null, first, batch, due: null,
      })

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
        this.cardShownAt = Date.now()
        this._tick++
        this.checkFinished()
        this.prefetchPage()
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

      const logged = this.log.find(l => l.client_id === item.client_id)
      if (logged) logged.due = data?.flashcard?.due ?? null

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
      const i = this.log.findIndex(l => l.client_id === entry.client_id)
      if (i !== -1) {
        const [gone] = this.log.splice(i, 1)
        if (gone?.first) this.firstPass = this.firstPass.filter(id => id !== gone.card_id)
      }
    },

    /** "Próximo lote": the batch end that is showing is left behind. */
    ackBatch(index: number) {
      this.batchesAcked = Math.max(this.batchesAcked, index)
      this.cardShownAt = Date.now()
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
      // The end screen waits for the queue to drain (RF-F2.4) and for the last page of the session
      this.finished = !hasMainCards && !hasPendingLearning && this.reviewQueue.length === 0 && !this.sessionError && !this.hasMore
    },
  },
})
