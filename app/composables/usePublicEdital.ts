/**
 * Edital verticalizado grátis (prd-edital-verticalizado-publico RF-F1): POST /public/editais (PDF or text + Turnstile),
 * then the page /r/{id} polls GET /public/editais/{id}. The source stays in the memory of the page (module scope,
 * client only) so "choose" can send the same file again with `section`, and a failed reading keeps it for the fix.
 * Own state: nothing is shared with useEditalReader (the logged-in flow of the app).
 * Call in setup (useTurnstile and $api need the instance).
 */
import type { PublicEditalReading } from '~/utils/publicEdital'
import { PUBLIC_EDITAL_LIMITS } from '~/utils/publicEdital'
import { publicEditalResultPath } from '~/utils/editalIntent'
import { CAPTCHA_MESSAGES } from '~/utils/turnstile'

export interface PublicEditalSource {
  file?: File | null
  text?: string
  pageFrom?: number | null
  pageTo?: number | null
  /** The edital picked in the "choose" list (alternatives[].section) */
  section?: number | null
}

/** What the person was sending, for the "choose" and for the retry after a failure */
let lastSource: PublicEditalSource | null = null
/** Where the fix after a failure should open (set by the result page, read by the form) */
let retryHint: 'text' | 'pages' | null = null

export const takeLastSource = () => lastSource
export const rememberSource = (s: PublicEditalSource | null) => { lastSource = s }
export function takeRetryHint() {
  const h = retryHint
  retryHint = null
  return h
}
export function setRetryHint(h: 'text' | 'pages' | null) { retryHint = h }

export function usePublicEdital() {
  const { $api } = useNuxtApp()
  const { track } = useAnalytics()
  const captcha = useTurnstile()
  const captchaEl = ref<HTMLElement | null>(null)

  /** The token for the next POST ('' = captcha off in this environment); throws with the PT-BR message */
  async function captchaToken(): Promise<string | undefined> {
    try {
      return await captcha.getToken(captchaEl.value)
    } catch {
      throw Object.assign(new Error('captcha'), { captchaMessage: captcha.error.value || CAPTCHA_MESSAGES.load })
    }
  }

  function form(source: PublicEditalSource, token: string | undefined): FormData {
    const body = new FormData()
    if (source.file) {
      body.append('file', source.file)
      if (source.section != null) body.append('section', String(source.section))
      else if (source.pageFrom && source.pageTo) {
        body.append('page_from', String(source.pageFrom))
        body.append('page_to', String(source.pageTo))
      }
    } else {
      body.append('text', source.text ?? '')
    }
    if (token) body.append('captcha_token', token)
    return body
  }

  /** Sends the source and returns the new reading ({id, status, cached}). The caller shows the errors. */
  async function submit(source: PublicEditalSource): Promise<{ id: string, status: PublicEditalReading['status'], cached: boolean }> {
    const token = await captchaToken()
    try {
      const res = await $api<{ data: { id: string, status: PublicEditalReading['status'], cached?: boolean } }>('/public/editais', { method: 'POST', body: form(source, token) })
      rememberSource({ ...source, section: null })
      if (source.section == null) track('tool_used', { tool: 'edital', input: source.file ? 'pdf' : 'text' })
      return { id: res.data.id, status: res.data.status, cached: !!res.data.cached }
    } finally {
      // The token is single use
      captcha.reset()
    }
  }

  /** Sends the same source again to read the edital picked in "choose" */
  async function choose(section: number) {
    const source = lastSource
    if (!source?.file) throw new Error('no_source')
    return await submit({ ...source, section })
  }

  async function fetchReading(id: string, signal?: AbortSignal): Promise<PublicEditalReading> {
    return (await $api<{ data: PublicEditalReading }>(`/public/editais/${encodeURIComponent(id)}`, { signal })).data
  }

  async function open(id: string) {
    await navigateTo(publicEditalResultPath(id))
  }

  return { captcha, captchaEl, submit, choose, fetchReading, open, limits: PUBLIC_EDITAL_LIMITS }
}
