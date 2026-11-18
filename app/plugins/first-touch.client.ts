import { captureFirstTouch, readFirstTouch } from '~/utils/firstTouch'

/**
 * Keeps the campaign of the first visit (utils/firstTouch.ts). Read at boot from the address, or from the query that
 * the <head> script of a prerendered page kept (/ and /comecar: Nuxt takes the query out of the address while it
 * hydrates), and once more after the first navigation, when the other prerendered pages (/entrar, /blog) have it back.
 * Only then, with no campaign stored, the referrer of the visit (prd-entrada-primeira-dobra RF-0), from its own chunk.
 */
export default defineNuxtPlugin(() => {
  captureFirstTouch(firstHref())
  const stop = useRouter().afterEach(() => {
    const href = window.location.href
    captureFirstTouch(href)
    stop()
    const referrer = document.referrer
    if (!referrer || readFirstTouch()) return
    import('~/utils/firstTouchReferrer')
      .then(m => m.captureReferrerTouch(href, referrer))
      .catch(() => { /* intencional: sem o chunk (rede), a visita fica sem origem, como antes */ })
  })
})

function firstHref(): string {
  const w = window as unknown as { __baigiLandingQuery?: string, __baigiEntryQuery?: string }
  const kept = w.__baigiEntryQuery || w.__baigiLandingQuery
  if (!kept || window.location.search) return window.location.href
  return `${window.location.origin}${window.location.pathname}${kept}`
}
