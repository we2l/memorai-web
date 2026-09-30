export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  duration?: number
  action?: ToastAction
}

export interface ToastItem {
  id: number
  message: string
  type: ToastType
  duration: number
  action?: ToastAction
}

interface ToastState {
  items: ToastItem[]
  // Legacy single-toast mirror (latest item) kept for existing consumers/tests
  message: string
  type: ToastType
  visible: boolean
}

export const TOAST_MAX = 3
const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3000,
  info: 4000,
  warning: 6000,
  error: 6000,
}

const state = reactive<ToastState>({
  items: [],
  message: '',
  type: 'success',
  visible: false,
})

interface Timer { handle?: ReturnType<typeof setTimeout>; remaining: number; startedAt: number; paused: boolean }
const timers = new Map<number, Timer>()
let seq = 0

function syncLegacy() {
  const last = state.items[state.items.length - 1]
  state.visible = !!last
  if (last) {
    state.message = last.message
    state.type = last.type
  }
}

function schedule(id: number, ms: number) {
  const t = timers.get(id)
  if (!t) return
  clearTimeout(t.handle)
  t.remaining = ms
  t.startedAt = Date.now()
  t.paused = false
  t.handle = setTimeout(() => dismiss(id), ms)
}

function dismiss(id: number) {
  const t = timers.get(id)
  if (t) clearTimeout(t.handle)
  timers.delete(id)
  const idx = state.items.findIndex(i => i.id === id)
  if (idx !== -1) state.items.splice(idx, 1)
  syncLegacy()
}

/** Stops the countdown (hover/focus). Only toasts with an action pause. */
function pause(id: number) {
  const t = timers.get(id)
  if (!t || t.paused) return
  clearTimeout(t.handle)
  t.remaining = Math.max(0, t.remaining - (Date.now() - t.startedAt))
  t.paused = true
}

function resume(id: number) {
  const t = timers.get(id)
  if (!t || !t.paused) return
  schedule(id, Math.max(t.remaining, 1000))
}

export function useToast() {
  /**
   * show(message, type?, durationOrOptions?) — the numeric 3rd argument is the
   * legacy signature; new callers pass `{ duration, action }`.
   */
  function show(message: string, type: ToastType = 'success', opts?: number | ToastOptions): number {
    const options: ToastOptions = typeof opts === 'number' ? { duration: opts } : (opts ?? {})
    const duration = options.duration ?? (options.action ? Math.max(DEFAULT_DURATION[type], 6000) : DEFAULT_DURATION[type])
    const id = ++seq

    // Same message already visible: refresh instead of stacking duplicates
    const dup = state.items.find(i => i.message === message && i.type === type && !i.action && !options.action)
    if (dup) {
      schedule(dup.id, duration)
      return dup.id
    }

    state.items.push({ id, message, type, duration, action: options.action })
    while (state.items.length > TOAST_MAX) {
      const oldest = state.items[0]
      if (!oldest) break
      dismiss(oldest.id)
    }
    timers.set(id, { remaining: duration, startedAt: Date.now(), paused: false })
    schedule(id, duration)
    syncLegacy()
    return id
  }

  function runAction(id: number) {
    const item = state.items.find(i => i.id === id)
    dismiss(id)
    item?.action?.onClick()
  }

  return { state, show, dismiss, pause, resume, runAction }
}
