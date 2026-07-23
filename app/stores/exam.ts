import { defineStore } from 'pinia'
import type { Exam, ExamUpcoming, ExamCalendarDay } from '~/types'

export const useExamStore = defineStore('exam', {
  state: () => ({
    exams: [] as Exam[],
    upcoming: [] as ExamUpcoming[],
    calendarData: [] as ExamCalendarDay[],
    loading: false,
    calendarLoading: false,
  }),

  getters: {
    futureExams: (state) => state.exams.filter((e) => e.days_remaining > 0),
    pastExams: (state) => state.exams.filter((e) => e.days_remaining <= 0),
    hasExamSoon: (state) => state.upcoming.some((e) => e.days_remaining <= 7),
    upcomingCount: (state) => state.upcoming.length,
  },

  actions: {
    async fetchExams(filter?: 'upcoming' | 'past') {
      this.loading = true
      try {
        const { $api } = useNuxtApp()
        const params = filter ? `?filter=${filter}` : ''
        const res = await $api(`/exams${params}`)
        this.exams = res.data
      } finally {
        this.loading = false
      }
    },

    async fetchUpcoming() {
      try {
        const { $api } = useNuxtApp()
        const res = await $api('/exams/upcoming')
        this.upcoming = res.data
      } catch (e) {
        // Silent — dashboard shouldn't break if exams fail
      }
    },

    async fetchCalendar(start: string, end: string) {
      this.calendarLoading = true
      try {
        const { $api } = useNuxtApp()
        const res = await $api(`/exams/calendar?start=${start}&end=${end}`)
        this.calendarData = res.data
      } finally {
        this.calendarLoading = false
      }
    },

    async createExam(data: { title: string; exam_date: string; topic_ids: string[] }) {
      const { $api } = useNuxtApp()
      const res = await $api('/exams', { method: 'POST', body: data })
      this.exams.unshift(res.data)
      await this.fetchUpcoming()
      return res.data
    },

    async updateExam(id: string, data: Partial<{ title: string; exam_date: string; topic_ids: string[] }>) {
      const { $api } = useNuxtApp()
      const res = await $api(`/exams/${id}`, { method: 'PUT', body: data })
      const index = this.exams.findIndex((e) => e.id === id)
      if (index >= 0) this.exams[index] = res.data
      await this.fetchUpcoming()
      return res.data
    },

    async deleteExam(id: string) {
      const { $api } = useNuxtApp()
      await $api(`/exams/${id}`, { method: 'DELETE' })
      this.exams = this.exams.filter((e) => e.id !== id)
      await this.fetchUpcoming()
    },

    async toggleRetaFinal(id: string) {
      const { $api } = useNuxtApp()
      const res = await $api(`/exams/${id}/toggle-reta-final`, { method: 'POST' })
      const index = this.exams.findIndex((e) => e.id === id)
      if (index >= 0) this.exams[index] = res.data
      return res.data
    },

    async getCalendarLink(id: string): Promise<string> {
      const { $api } = useNuxtApp()
      const res = await $api(`/exams/${id}/calendar-link`)
      return res.data.google_calendar_url
    },

    getIcsUrl(id: string): string {
      return `/api/exams/${id}/ics`
    },
  },
})
