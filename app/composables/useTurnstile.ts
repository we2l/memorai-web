/**
 * Turnstile widget of one screen (sign-up, forgot password, resend verification banner).
 * No NUXT_PUBLIC_TURNSTILE_SITE_KEY = off: getToken() gives undefined and the API, without its secret, asks for nothing.
 * Managed widget with appearance "interaction-only": it stays invisible unless Cloudflare needs a click (then it shows
 * in the container, with its own accessible mode). Tokens are single use: reset() after every submit.
 */
import { CAPTCHA_MESSAGES, loadTurnstile, type TurnstileApi } from '~/utils/turnstile'

const TOKEN_WAIT_MS = 30_000

export function useTurnstile() {
  const siteKey = String(useRuntimeConfig().public.turnstileSiteKey || '')
  const enabled = siteKey !== ''
  const error = ref('')

  let api: TurnstileApi | null = null
  let widgetId: string | undefined
  let host: HTMLElement | null = null
  /** Last element asked for: a failed script load is tried again there on the next getToken(). */
  let target: HTMLElement | null = null
  let token: string | null = null
  let waiters: { resolve: (t: string) => void, reject: (e: Error) => void }[] = []

  function settle(result: string | Error) {
    for (const w of waiters.splice(0)) {
      if (typeof result === 'string') w.resolve(result)
      else w.reject(result)
    }
  }

  function fail(message: string) {
    error.value = message
    settle(new Error(message))
  }

  function remove() {
    if (api && widgetId !== undefined) api.remove(widgetId)
    widgetId = undefined
    host = null
    token = null
  }

  /** Renders the widget in `el` (moves it when called with another element). Starts the check right away. */
  async function render(el: HTMLElement | null | undefined): Promise<void> {
    if (!enabled || !el) return
    target = el
    if (host === el && widgetId !== undefined) return
    try {
      api = await loadTurnstile()
    } catch {
      fail(CAPTCHA_MESSAGES.load)
      return
    }
    remove()
    host = el
    error.value = ''
    widgetId = api.render(el, {
      sitekey: siteKey,
      appearance: 'interaction-only',
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      language: 'pt-br',
      size: 'flexible',
      'refresh-expired': 'auto',
      callback: (t) => {
        token = t
        error.value = ''
        settle(t)
      },
      // true: handled here, the widget does not throw to the console
      'error-callback': () => {
        token = null
        fail(CAPTCHA_MESSAGES.failed)
        return true
      },
      'expired-callback': () => { token = null },
      'timeout-callback': () => {
        token = null
        fail(CAPTCHA_MESSAGES.timeout)
      },
    })
  }

  /** The token for the next request; undefined when the captcha is off. Throws with the PT-BR message in `error`. */
  async function getToken(el?: HTMLElement | null): Promise<string | undefined> {
    if (!enabled) return undefined
    await render(el ?? target)
    if (error.value && widgetId !== undefined) reset()
    if (widgetId === undefined) throw new Error(error.value || CAPTCHA_MESSAGES.load)
    if (token) return token
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => fail(CAPTCHA_MESSAGES.timeout), TOKEN_WAIT_MS)
      waiters.push({
        resolve: (t) => { clearTimeout(timer); resolve(t) },
        reject: (e) => { clearTimeout(timer); reject(e) },
      })
    })
  }

  /** New check after a submit (the token was spent) or after an error. */
  function reset() {
    token = null
    error.value = ''
    if (api && widgetId !== undefined) api.reset(widgetId)
  }

  onBeforeUnmount(() => {
    settle(new Error('unmounted'))
    remove()
  })

  return { enabled, error, render, getToken, reset }
}
