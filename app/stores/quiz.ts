import { defineStore } from 'pinia'
import type { Quiz, QuizQuestion, QuizStats } from '~/types'

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
    async fetchQuizzes(topicId?: string) {
      this.loading = true
      try {
        const { $api } = useNuxtApp()
        const params = new URLSearchParams()
        if (topicId) params.set('topic_id', topicId)
        const res = await $api<any>(`/quizzes?${params}`)
        this.quizzes = res.data
      } finally {
        this.loading = false
      }
    },

    async createQuiz(data: {
      topic_id: string
      quantity?: number
      types?: string[]
      time_limit?: number | null
      mode?: string
      difficulty?: string
    }) {
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

    async fetchQuiz(id: string) {
      const { $api } = useNuxtApp()
      const res = await $api<any>(`/quizzes/${id}`)
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
      const idx = this.questions.findIndex((q) => q.id === questionId)
      if (idx !== -1) {
        this.questions[idx].user_answer = answer
        this.questions[idx].answered_at = new Date().toISOString()
        if (res.data.is_correct !== null) {
          this.questions[idx].is_correct = res.data.is_correct
        }
        if (res.data.correct_answer) {
          this.questions[idx].correct_answer = res.data.correct_answer
        }
        if (res.data.explanation) {
          this.questions[idx].explanation = res.data.explanation
        }
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
      const res = await $api<any>(`/quizzes/${this.currentQuiz.id}/finish`, {
        method: 'POST',
        body: { time_spent: timeSpent },
      })
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

    async createCardsFromErrors(id: string) {
      const { $api } = useNuxtApp()
      const res = await $api<any>(`/quizzes/${id}/create-cards`, { method: 'POST' })
      return res.data.cards_created as number
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
            this.finishQuiz()
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

    // Polling for quiz generation
    async pollUntilReady(id: string, maxAttempts = 30) {
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        const quiz = await this.fetchQuiz(id)
        if (quiz.status === 'in_progress' || quiz.status === 'completed') {
          return quiz
        }
        if (quiz.status === 'failed') {
          throw new Error('Falha ao gerar simulado. Tente novamente.')
        }
      }
      throw new Error('Timeout na geração do simulado.')
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
