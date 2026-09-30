import { getCurrentScope, onScopeDispose, ref, type Ref } from 'vue'

export interface PollOptions<T> {
  /** Delay between the end of one call and the start of the next (ms). */
  interval: number
  /** Total time budget (ms). When exceeded, polling stops and `onTimeout` runs. */
  timeout?: number
  /** Pause while the tab is hidden and fire immediately when it becomes visible. Default true. */
  pauseHidden?: boolean
  /** Run the first call right away on `start()`. Default true. */
  immediate?: boolean
  /** Stop condition, evaluated after each successful call. */
  until?: (result: T) => boolean
  /** Delay multiplier after an error (capped at 30 s). Default 1.5. */
  backoff?: number
  onTimeout?: () => void
  onError?: (error: unknown) => void
  /**
   * Do not bind to the current effect scope. Use in Pinia actions: an action
   * called from a component hook would otherwise stop when that component unmounts.
   */
  detached?: boolean
}

export interface Poller {
  start: () => void
  stop: () => void
  isActive: Ref<boolean>
  lastError: Ref<unknown>
}

const MAX_BACKOFF_DELAY = 30_000

/**
 * Single polling mechanism of the app (prd-performance-frontend RF-08).
 *
 * - Recursive `setTimeout`: the next call only starts after the previous one settles.
 * - One `AbortController` per call: `stop()` aborts the request in flight
 *   (pass the `signal` to `$api(url, { signal })`).
 * - Hidden tab → paused (no timer, no request); visible again → immediate call.
 * - Called inside a component/effect scope, it stops on scope dispose.
 *   In a Pinia store pass `detached: true`: the store owns `stop()`.
 */
export function usePoll<T>(fn: (signal: AbortSignal) => Promise<T>, opts: PollOptions<T>): Poller {
  const pauseHidden = opts.pauseHidden ?? true
  const backoff = opts.backoff ?? 1.5
  const isActive = ref(false)
  const lastError = ref<unknown>(null)

  let timer: ReturnType<typeof setTimeout> | null = null
  let controller: AbortController | null = null
  let inFlight = false
  let deadline: number | null = null
  let delay = opts.interval
  let run = 0 // bumps on stop/start so stale continuations do nothing

  const isHidden = () => pauseHidden && typeof document !== 'undefined' && document.visibilityState === 'hidden'

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function schedule(ms: number) {
    clearTimer()
    if (isHidden()) return // resumed by onVisibility
    timer = setTimeout(tick, ms)
  }

  async function tick() {
    timer = null
    if (!isActive.value || inFlight || isHidden()) return
    if (deadline !== null && Date.now() >= deadline) {
      stop()
      opts.onTimeout?.()
      return
    }

    const current = run
    const ctrl = new AbortController()
    controller = ctrl
    inFlight = true
    let done = false
    try {
      const result = await fn(ctrl.signal)
      if (current !== run) return
      lastError.value = null
      delay = opts.interval
      done = opts.until?.(result) ?? false
    }
    catch (e) {
      if (current !== run || ctrl.signal.aborted) return
      lastError.value = e
      opts.onError?.(e)
      delay = Math.min(delay * backoff, MAX_BACKOFF_DELAY)
    }
    finally {
      if (controller === ctrl) controller = null
      inFlight = false
    }

    if (current !== run || !isActive.value) return
    if (done) stop()
    else schedule(delay)
  }

  function onVisibility() {
    if (!isActive.value) return
    if (document.visibilityState === 'hidden') clearTimer()
    else if (!timer && !inFlight) tick()
  }

  function start() {
    if (isActive.value) return
    run++
    isActive.value = true
    delay = opts.interval
    deadline = opts.timeout ? Date.now() + opts.timeout : null
    if (pauseHidden && typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility)
    if (opts.immediate ?? true) tick()
    else schedule(opts.interval)
  }

  function stop() {
    run++
    isActive.value = false
    clearTimer()
    controller?.abort()
    controller = null
    inFlight = false
    deadline = null
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility)
  }

  if (!opts.detached && getCurrentScope()) onScopeDispose(stop)

  return { start, stop, isActive, lastError }
}

export class PollTimeoutError extends Error {
  constructor(message = 'Tempo esgotado. Tente novamente.') {
    super(message)
    this.name = 'PollTimeoutError'
  }
}

/**
 * Promise form of `usePoll` for "wait until a job is ready" flows (quiz, OCR, AI jobs).
 * Resolves with the first result where `until` is true; rejects with `PollTimeoutError`
 * on timeout, or with an `AbortError` if the calling scope is disposed first.
 * Errors thrown by `fn` are retried with backoff (like `usePoll`).
 */
export function pollUntil<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  opts: Omit<PollOptions<T>, 'until' | 'onTimeout' | 'detached'> & { until: (result: T) => boolean },
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const settle = (cb: () => void) => {
      if (settled) return
      settled = true
      cb()
    }
    const poller = usePoll(async (signal) => {
      const result = await fn(signal)
      if (opts.until(result)) settle(() => resolve(result))
      return result
    }, {
      ...opts,
      detached: true,
      until: () => settled,
      onTimeout: () => settle(() => reject(new PollTimeoutError())),
    })
    if (getCurrentScope()) {
      onScopeDispose(() => {
        poller.stop()
        settle(() => reject(new DOMException('Polling cancelado', 'AbortError')))
      })
    }
    poller.start()
  })
}
