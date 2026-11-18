/**
 * How far down the landing a visit went (prd-entrada-primeira-dobra RF-0, `landing_scroll_depth`): four invisible
 * markers at 25, 50, 75 and 100% of the page, watched by an IntersectionObserver (no scroll listener). Each depth is
 * reported at most once per page view. A marker that is already above the screen counts as passed, and reaching a depth
 * also reports the lower ones still missing, so a jump with End or a reload in the middle of the page keeps the funnel
 * whole (25 >= 50 >= 75 >= 100).
 */
export const SCROLL_DEPTHS = [25, 50, 75, 100] as const
export type ScrollDepth = typeof SCROLL_DEPTHS[number]

export const MOBILE_QUERY = '(max-width: 767px)'

export function depthOf(value: string | undefined): ScrollDepth | null {
  const n = Number(value)
  return (SCROLL_DEPTHS as readonly number[]).includes(n) ? n as ScrollDepth : null
}

/** Watches the markers (`data-depth`); returns the function that stops. Without IntersectionObserver, nothing. */
export function watchScrollDepth(markers: Iterable<HTMLElement>, onDepth: (depth: ScrollDepth) => void): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {}
  const sent = new Set<ScrollDepth>()
  const io = new IntersectionObserver((entries) => {
    let reached = 0
    for (const e of entries) {
      const depth = depthOf((e.target as HTMLElement).dataset.depth)
      // On screen, or already scrolled past (its top above the viewport)
      if (depth && (e.isIntersecting || e.boundingClientRect.top < 0)) reached = Math.max(reached, depth)
    }
    for (const depth of SCROLL_DEPTHS) {
      if (depth > reached || sent.has(depth)) continue
      sent.add(depth)
      onDepth(depth)
    }
    if (sent.size === SCROLL_DEPTHS.length) io.disconnect()
  })
  for (const el of markers) io.observe(el)
  return () => io.disconnect()
}
