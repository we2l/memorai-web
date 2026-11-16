/**
 * "Feito" / "Pular" of a session of the cronograma (prd-cronograma RF-W2, RF-W4): POST, then a toast with "Desfazer"
 * (DELETE). Plain function with its dependencies passed in, so the Hoje loads it only on the click (out of its chunk)
 * and the cronograma page uses the same one through useScheduleMark.
 */
import type { SchedulePass } from '~/utils/studySchedule'

export interface MarkTarget {
  /** The caderno (root) of the schedule */
  scheduleTopicId: string
  topicId: string
  pass: SchedulePass
  /** "Crase" (the toast) */
  label: string
}

type ApiFn = (url: string, opts: { method: 'POST' | 'DELETE', body: Record<string, unknown> }) => Promise<unknown>
type RunFn = <T>(fn: () => Promise<T>, opts: { error: string }) => Promise<T | undefined>
interface ToastLike { show: (message: string, kind: 'success', opts: { action: { label: string, onClick: () => void } }) => unknown }

export interface MarkDeps { api: ApiFn, run: RunFn, toast: ToastLike }

const sessionsPath = (topicId: string) => `/topics/${encodeURIComponent(topicId)}/schedule/sessions`

/** `onChange(status | null)` after each answer (null = undone). */
export async function markScheduleSession(deps: MarkDeps, target: MarkTarget, status: 'done' | 'skipped', onChange: (status: 'done' | 'skipped' | null) => void): Promise<void> {
  const path = sessionsPath(target.scheduleTopicId)
  const ok = await deps.run(() => deps.api(path, { method: 'POST', body: { topic_id: target.topicId, pass: target.pass, status } }).then(() => true), {
    error: status === 'done' ? 'Não foi possível marcar como feito. Tente de novo.' : 'Não foi possível pular. Tente de novo.',
  })
  if (!ok) return
  onChange(status)
  deps.toast.show(status === 'done' ? `Feito: ${target.label}` : `${target.label} foi para o fim da rodada`, 'success', {
    action: {
      label: 'Desfazer',
      onClick: () => {
        void deps.run(() => deps.api(path, { method: 'DELETE', body: { topic_id: target.topicId, pass: target.pass } }).then(() => true), {
          error: 'Não foi possível desfazer. Tente de novo.',
        }).then((undone) => { if (undone) onChange(null) })
      },
    },
  })
}
