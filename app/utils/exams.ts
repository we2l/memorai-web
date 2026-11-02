import type { Exam } from '~/types'

/**
 * An exam before today (the API clamps days_remaining at 0, so the date decides). Today in São Paulo, the study
 * day of the product; the browser's clock is close enough for a date-only comparison.
 */
export function isPastExam(exam: Pick<Exam, 'exam_date'>): boolean {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  return exam.exam_date.slice(0, 10) < today
}

/** "Abrir no Google Agenda": the link of the API (Progresso only, out of the store that Hoje loads) */
export async function examCalendarLink(id: string): Promise<string> {
  const { $api } = useNuxtApp()
  const res = await $api<{ data: { google_calendar_url: string } }>(`/exams/${id}/calendar-link`)
  return res.data.google_calendar_url
}

/** "Baixar para a agenda (.ics)": the file needs the session, so it comes through the API client as a blob. */
export async function downloadExamIcs(exam: Pick<Exam, 'id' | 'title'>) {
  const { $api } = useNuxtApp()
  // ofetch types `responseType` as json only in this client; the runtime takes blob
  const blob = await $api<Blob>(`/exams/${exam.id}/ics`, { responseType: 'blob' } as unknown as { responseType: 'json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${exam.title || 'prova'}.ics`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
