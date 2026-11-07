// Cloudflare Turnstile (captcha of sign-up, forgot password and resend verification; M3/M4 of the 2026-11 audit).
// The script comes from Cloudflare when one of those screens asks for it (never in the entry nor in the precache):
// Cloudflare asks it not to be proxied or cached. Messages in PT-BR; the widget itself speaks pt-br.

export const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export const CAPTCHA_MESSAGES = {
  load: 'Não foi possível carregar a verificação anti-robô. Confira a conexão (ou um bloqueador de anúncios) e tente de novo.',
  failed: 'A verificação anti-robô não passou. Recarregue a página e tente de novo.',
  timeout: 'A verificação anti-robô demorou demais. Tente de novo.',
} as const

export interface TurnstileRenderOptions {
  sitekey: string
  callback: (token: string) => void
  'error-callback': (code: string) => boolean | void
  'expired-callback': () => void
  'timeout-callback': () => void
  appearance: 'always' | 'execute' | 'interaction-only'
  theme: 'light' | 'dark' | 'auto'
  language: string
  size: 'normal' | 'flexible' | 'compact'
  'refresh-expired': 'auto' | 'manual' | 'never'
}

export interface TurnstileApi {
  render: (el: HTMLElement, options: TurnstileRenderOptions) => string | undefined
  reset: (id?: string) => void
  remove: (id?: string) => void
}

declare global {
  interface Window { turnstile?: TurnstileApi }
}

let loading: Promise<TurnstileApi> | null = null

/** Injects the script once; a failure lets the next call try again. */
export function loadTurnstile(doc: Document = document): Promise<TurnstileApi> {
  const win = doc.defaultView as Window | null
  if (win?.turnstile) return Promise.resolve(win.turnstile)
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = doc.createElement('script')
    script.src = TURNSTILE_SCRIPT
    script.async = true
    script.onload = () => (win?.turnstile ? resolve(win.turnstile) : reject(new Error('turnstile missing')))
    script.onerror = () => {
      script.remove()
      reject(new Error('turnstile script failed'))
    }
    doc.head.appendChild(script)
  }).catch((e) => {
    loading = null
    throw e
  })
  return loading
}

/** Test seam: forget the cached load. */
export function resetTurnstileLoader() {
  loading = null
}
