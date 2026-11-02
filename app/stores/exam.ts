import { defineStore } from 'pinia'
import type { Exam, ExamOutcome, ExamUpcoming } from '~/types'

export interface ExamInput {
  title: string
  exam_date: string
  topic_ids: string[]
}

/**
 * The exams of the person (prd-4f-progresso-v3): the agenda (`GET /exams?status=all`, future ones first, each
 * with its coverage, pace and projection), the next ones of Hoje (`/exams/upcoming`) and the export to the
 * calendar of the phone (.ics download, Google Agenda link).
 */
export const useExamStore = defineStore('exam', {
  state: () => ({
    exams: [] as Exam[],
    upcoming: [] as ExamUpcoming[],
    loading: false,
  }),

  getters: {
    hasExamSoon: (state) => state.upcoming.some(e => e.days_remaining <= 7),
    upcomingCount: (state) => state.upcoming.length,
  },

  actions: {
    /** The whole agenda (≤ 100, no pages). Throws: the screen says when it did not load. */
    async fetchAgenda(status: 'upcoming' | 'past' | 'all' = 'all') {
      this.loading = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api<{ data: Exam[] }>('/exams', { params: { status } })
        this.exams = res.data
        return res.data
      } finally {
        this.loading = false
      }
    },

    async fetchUpcoming() {
      try {
        const { $api } = useNuxtApp()
        const res = await $api<{ data: ExamUpcoming[] }>('/exams/upcoming')
        this.upcoming = res.data
      } catch (e) {
        // Dashboard shouldn't break if exams fail (RF-F3b: S)
        reportApiError(e, { silent: true })
      }
    },

    async createExam(data: ExamInput) {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: Exam }>('/exams', { method: 'POST', body: data })
      this.exams = [res.data, ...this.exams.filter(e => e.id !== res.data.id)]
      void this.fetchUpcoming()
      return res.data
    },

    async updateExam(id: string, data: Partial<ExamInput>) {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: Exam }>(`/exams/${id}`, { method: 'PUT', body: data })
      this.replace(res.data)
      void this.fetchUpcoming()
      return res.data
    },

    async deleteExam(id: string) {
      const { $api } = useNuxtApp()
      await $api(`/exams/${id}`, { method: 'DELETE' })
      this.exams = this.exams.filter(e => e.id !== id)
      void this.fetchUpcoming()
    },

    async toggleRetaFinal(id: string) {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: Exam }>(`/exams/${id}/toggle-reta-final`, { method: 'POST' })
      this.replace(res.data)
      return res.data
    },

    /** Owner answer ("Passei" / "Não passei"); replaces a previous one (RF-B20). */
    async recordOutcome(id: string, outcome: ExamOutcome) {
      const { $api } = useNuxtApp()
      const res = await $api<{ data: Exam }>(`/exams/${id}/outcome`, { method: 'POST', body: { outcome } })
      this.replace(res.data)
      return res.data
    },

    replace(exam: Exam) {
      const index = this.exams.findIndex(e => e.id === exam.id)
      if (index >= 0) this.exams[index] = exam
    },
  },
})
