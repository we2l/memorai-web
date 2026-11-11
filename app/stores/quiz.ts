import { defineStore } from 'pinia'
import { PollTimeoutError, pollUntil } from '~/composables/usePoll'
import type { Quiz, QuizKind, QuizQuestion, QuizStats } from '~/types'

/** Ceiling of the history /praticar reads: 20 pages of 15 = 300 quizzes. */
const QUIZ_HISTORY_MAX_PAGES = 20

/** POST /quizzes (prd-4e-praticar-v3 RF-B1/B2): `scope` = topic:|document:|note:<id> (or the topic_id shortcut). */
export interface CreateQuizInput {
  topic_id?: string
  scope?: string
  kind?: QuizKind
  quantity?: number
  types?: string[]
  time_limit?: number | null
  mode?: string
  difficulty?: string
}

/** POST /quizzes/{id}/create-cards: every card of the quiz's errors (all ids, not only the new ones). */
export interface QuizCardsResult {
  cards_created: number
  card_ids: string[]
  session_count: number
}

export const useQuizStore = defineStore('quiz', {
  state: () => ({
    quizzes: [] as Quiz[],
    currentQuiz: null as Quiz | null,
    questions: [] as QuizQuestion[],
    currentIndex: 0,
    timeRemaining: 0,
    timerInterval: null as ReturnType<typeof setInterval> | null,
    loading: false,
    generating: false,
    stats: null as QuizStats | null,
  }),

  getters: {
    currentQuestion: (state): QuizQuestion | null => state.questions[state.currentIndex] ?? null,
    progress: (state) => ({
      current: state.currentIndex + 1,
      total: state.questions.length,
      percent: state.questions.length > 0 ? Math.round(((state.currentIndex + 1) / state.questions.length) * 100) : 0,
    }),
    answeredCount: (state) => state.questions.filter((q) => q.user_answer !== null).length,
    isCompleted: (state) => state.currentQuiz?.status === 'completed',
    isInProgress: (state) => state.currentQuiz?.status === 'in_progress',
    hasTimer: (state) => (state.currentQuiz?.time_limit_seconds ?? 0) > 0,
  },

  actions: {
    /**
     * The whole history: GET /quizzes pages 15 at a time (in progress first, then the newest). /praticar filters it by
     * caderno and counts it, so page 1 alone lost quizzes after the 15th (auditoria 2026-11 BUG-16). The other pages
     * come in parallel, up to QUIZ_HISTORY_MAX_PAGES.
     */
    async fetchQuizzes(topicId?: string) {
      this.loading = true
      try {
        const { $api } = useNuxtApp()
        const page = (n: number) => $api<{ data: Quiz[]; meta?: { last_page?: number } }>('/quizzes', {
          params: { ...(topicId ? { topic_id: topicId } : {}), page: n },
        })
        const first = await page(1)
        const last = Math.min(first.meta?.last_page ?? 1, QUIZ_HISTORY_MAX_PAGES)
        const rest = await Promise.all(Array.from({ length: last - 1 }, (_, i) => page(i + 2)))
        const seen = new Set<string>()
        this.quizzes = [first, ...rest].flatMap(r => r.data).filter(q => !seen.has(q.id) && seen.add(q.id))
      } finally {
        this.loading = false
      }
    },

    async createQuiz(data: CreateQuizInput) {
      this.generating = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<any>('/quizzes', { method: 'POST', body: data })
        this.currentQuiz = res.data
        return res.data as Quiz
      } finally {
        this.generating = false
      }
    },

    async fetchQuiz(id: string, signal?: AbortSignal) {
      const { $api } = useNuxtApp()
      const res = await $api<any>(`/quizzes/${id}`, { signal })
      this.currentQuiz = res.data
      this.questions = res.data.questions ?? []
      return res.data as Quiz
    },

    async startQuiz(id: string) {
      const { $api } = useNuxtApp()
      const res = await $api<any>(`/quizzes/${id}/start`, { method: 'POST' })
      this.currentQuiz = res.data
      this.questions = res.data.questions ?? []
      this.currentIndex = 0

      if (this.currentQuiz?.time_limit_seconds) {
        this.timeRemaining = this.currentQuiz.time_limit_seconds - (this.currentQuiz.time_spent_seconds ?? 0)
        this.startTimer()
      }

      return res.data as Quiz
    },

    async answerQuestion(questionId: string, answer: string) {
      const { $api } = useNuxtApp()
      const res = await $api<any>(`/quizzes/${this.currentQuiz!.id}/answer`, {
        method: 'POST',
        body: { question_id: questionId, answer },
      })

      // Update local question state
      const q = this.questions.find(x => x.id === questionId)
      if (q) {
        q.user_answer = answer
        q.answered_at = new Date().toISOString()
        if (res.data.is_correct !== null) q.is_correct = res.data.is_correct
        if (res.data.correct_answer) q.correct_answer = res.data.correct_answer
        if (res.data.explanation) q.explanation = res.data.explanation
      }

      return res.data
    },

    async pauseQuiz() {
      if (!this.currentQuiz) return
      this.stopTimer()
      const { $api } = useNuxtApp()
      const timeSpent = this.getTimeSpent()
      await $api(`/quizzes/${this.currentQuiz.id}/pause`, {
        method: 'POST',
        body: { time_spent: timeSpent },
      })
    },

    async finishQuiz() {
      if (!this.currentQuiz) return
      this.stopTimer()
      const { $api } = useNuxtApp()
      const timeSpent = this.getTimeSpent()
      const id = this.currentQuiz.id
      let res: any
      try {
        res = await $api<any>(`/quizzes/${id}/finish`, {
          method: 'POST',
          body: { time_spent: timeSpent },
        })
      } catch (e) {
        // Already finished (the Prova's timer a moment before the click) or no longer in progress: the server's
        // state wins, no error; the caller opens the result when it is completed (API #177)
        // The code read inline (no utils/quizConflict here: the result's chunk is at its budget of 19.5 KB)
        const code = (e as { data?: { code?: string } } | null)?.data?.code
        if (code === 'quiz_not_in_progress' || code === 'quiz_completed') return this.fetchQuiz(id)
        throw e
      }
      this.currentQuiz = res.data
      this.questions = res.data.questions ?? []
      return res.data as Quiz
    },

    async deleteQuiz(id: string) {
      const { $api } = useNuxtApp()
      await $api(`/quizzes/${id}`, { method: 'DELETE' })
      this.quizzes = this.quizzes.filter((q) => q.id !== id)
    },

    async fetchStats(topicId?: string) {
      const { $api } = useNuxtApp()
      const params = topicId ? `?topic_id=${topicId}` : ''
      const res = await $api<any>(`/quizzes/stats${params}`)
      this.stats = res.data
      return res.data as QuizStats
    },

    /**
     * Cards of the wrong answers the person chose (prd-4e-praticar-v3 RF-B6): each one in the assunto of its
     * question, idempotent per question. Without `questionIds` the API keeps the F2 call (all, once). The ids
     * and the session size feed "Revisar os N agora" (scope=quiz:).
     */
    async createCardsFromErrors(id: string, questionIds?: string[]): Promise<QuizCardsResult> {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: { cards_created: number; card_ids?: string[]; session_count?: number } }>(`/quizzes/${id}/create-cards`, {
        method: 'POST',
        ...(questionIds ? { body: { question_ids: questionIds } } : {}),
      })
      const out = { cards_created: res.data.cards_created, card_ids: res.data.card_ids ?? [], session_count: res.data.session_count ?? 0 }
      if (this.currentQuiz?.id === id) {
        this.currentQuiz.cards_from_errors = { count: out.card_ids.length, session_count: out.session_count }
        this.currentQuiz.cards_created_at ??= new Date().toISOString()
      }
      return out
    },

    /** "Refazer as que errei" (RF-B4): a new bateria with copies of the wrong questions, no AI and no quota. */
    async retryErrors(id: string): Promise<Quiz> {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: Quiz }>(`/quizzes/${id}/retry-errors`, { method: 'POST' })
      return res.data
    },

    // Navigation
    goToQuestion(index: number) {
      if (index >= 0 && index < this.questions.length) {
        this.currentIndex = index
      }
    },

    nextQuestion() {
      if (this.currentIndex < this.questions.length - 1) {
        this.currentIndex++
      }
    },

    prevQuestion() {
      if (this.currentIndex > 0) {
        this.currentIndex--
      }
    },

    // Timer
    startTimer() {
      this.stopTimer()
      this.timerInterval = setInterval(() => {
        if (this.timeRemaining <= 0) {
          this.stopTimer()
          // Auto-finish in exam mode
          if (this.currentQuiz?.mode === 'exam') {
            this.finishQuiz().catch(() => {
              // intencional: the 409 of a finished quiz is handled inside; any other error leaves the quiz open
              // with its "Finalizar" (no useApiAction here: this store is in the result's chunk, budget 19.5 KB)
            })
          }
          return
        }
        this.timeRemaining--
      }, 1000)
    },

    stopTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval)
        this.timerInterval = null
      }
    },

    getTimeSpent(): number {
      if (!this.currentQuiz?.time_limit_seconds) {
        // No timer — calculate from started_at
        if (this.currentQuiz?.started_at) {
          return Math.floor((Date.now() - new Date(this.currentQuiz.started_at).getTime()) / 1000)
        }
        return 0
      }
      return this.currentQuiz.time_limit_seconds - this.timeRemaining
    },

    // Polling for quiz generation (2 s; the job runs up to 180 s in blocks of 15, RF-B3; pauses with hidden tab)
    async pollUntilReady(id: string) {
      let quiz: Quiz
      try {
        quiz = await pollUntil(signal => this.fetchQuiz(id, signal), {
          interval: 2000,
          immediate: false,
          timeout: 200_000,
          until: q => ['in_progress', 'completed', 'failed'].includes(q.status),
        })
      } catch (e) {
        if (e instanceof PollTimeoutError) throw new Error('A geração das questões passou do tempo.')
        throw e
      }
      if (quiz.status === 'failed') throw new Error('Não conseguimos gerar as questões.')
      return quiz
    },

    reset() {
      this.stopTimer()
      this.currentQuiz = null
      this.questions = []
      this.currentIndex = 0
      this.timeRemaining = 0
    },
  },
})
