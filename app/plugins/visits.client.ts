import { isVisitor, visitEvent } from '~/utils/visits'

/**
 * How many visitors open each page (relatorio-redes-2026-11-20: without it, a visit that calls no API is invisible).
 * Vercel Web Analytics: no cookie and no identifier, so it runs without the analytics consent (Privacidade, "Contagem
 * de visitas"). Production deploy only (runtimeConfig visits), visitors only (utils/visits), path and utm_* only.
 * The script is /_vercel/insights/script.js, served by Vercel once Web Analytics is on in the project; it follows the
 * SPA navigations by itself. Off in the dashboard, the file 404s and nothing is sent.
 */
export default defineNuxtPlugin(() => {
  if (!useRuntimeConfig().public.visits || !isVisitor()) return
  const w = window as unknown as { va?: (...args: unknown[]) => void, vaq?: unknown[][] }
  w.va = w.va || ((...args: unknown[]) => { (w.vaq = w.vaq || []).push(args) })
  w.va('beforeSend', visitEvent)
  const script = document.createElement('script')
  script.defer = true
  script.src = '/_vercel/insights/script.js'
  document.head.appendChild(script)
})
