import type { Exam } from '~/types'

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
