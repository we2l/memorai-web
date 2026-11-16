/**
 * Cronograma de estudos (prd-cronograma §4): the API of one caderno's schedule and the "Feito" / "Pular" of a
 * session, with "Desfazer" in the toast. The schedule itself is computed in the browser (utils/studySchedule).
 */
import type { SchedulePass, StudyScheduleResource } from '~/utils/studySchedule'
import { markScheduleSession, type MarkTarget } from '~/utils/scheduleMark'

export type { MarkTarget }

export interface ScheduleSaveBody {
  hours_by_weekday: number[]
  start_times?: (string | null)[] | null
  session_minutes: number
  levels?: Record<string, string>
  weights?: Record<string, number | null>
}

export function useScheduleApi() {
  const { $api } = useNuxtApp()
  const path = (topicId: string) => `/topics/${encodeURIComponent(topicId)}/schedule`
  return {
    get: async (topicId: string) => (await $api<{ data: StudyScheduleResource }>(path(topicId))).data,
    /** The schedule updated last (Hoje); null without one */
    latest: async () => (await $api<{ data: StudyScheduleResource | null }>('/schedule')).data,
    save: async (topicId: string, body: ScheduleSaveBody) => (await $api<{ data: StudyScheduleResource }>(path(topicId), { method: 'PUT', body })).data,
    remove: (topicId: string) => $api(path(topicId), { method: 'DELETE' }),
    mark: (topicId: string, body: { topic_id: string, pass: SchedulePass, status: 'done' | 'skipped' }) => $api(`${path(topicId)}/sessions`, { method: 'POST', body }),
    unmark: (topicId: string, body: { topic_id: string, pass: SchedulePass }) => $api(`${path(topicId)}/sessions`, { method: 'DELETE', body }),
  }
}

/** "Feito" / "Pular" with "Desfazer" (utils/scheduleMark, shared with the Hoje). */
export function useScheduleMark() {
  const { $api } = useNuxtApp()
  const toast = useToast()
  const { run, pending } = useApiAction()

  function mark(target: MarkTarget, status: 'done' | 'skipped', onChange: (status: 'done' | 'skipped' | null) => void) {
    return markScheduleSession({ api: (url, opts) => $api(url, opts), run, toast }, target, status, onChange)
  }

  return { mark, pending }
}

/**
 * "Baixar PDF" = the browser's print of <SchedulePrint> alone: it renders only while `printing` (html.print-schedule
 * hides the page), and the class leaves after the dialog closes.
 */
export function usePrintSchedule() {
  const printing = ref(false)

  function done() {
    document.documentElement.classList.remove('print-schedule')
    printing.value = false
  }

  async function print() {
    printing.value = true
    await nextTick()
    document.documentElement.classList.add('print-schedule')
    window.addEventListener('afterprint', done, { once: true })
    window.print()
  }

  onBeforeUnmount(done)
  return { printing, print }
}
