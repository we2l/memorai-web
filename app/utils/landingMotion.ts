/**
 * Motion of the landing D (prd-landing-d RF-D14), on the prerendered DOM: reveal on scroll, the counters, and the
 * real clips of the app playing only while on screen. Everything here depends on html.lp-motion, set by
 * LANDING_MESSAGE_SCRIPT before the first paint only when the system allows motion: with prefers-reduced-motion
 * nothing is hidden, nothing counts and no video downloads (posters only, `preload="none"`).
 * Returns the cleanup for onBeforeUnmount.
 */
export function motionAllowed(): boolean {
  return document.documentElement.classList.contains('lp-motion')
}

/** One IntersectionObserver per call; `once` stops observing after the first time in view. */
function watch(els: Iterable<Element>, onChange: (el: Element, inView: boolean) => void, options: IntersectionObserverInit, once = false): IntersectionObserver {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      onChange(e.target, e.isIntersecting)
      if (once && e.isIntersecting) io.unobserve(e.target)
    }
  }, options)
  for (const el of els) io.observe(el)
  return io
}

/** Counts a [data-count] element up to its value (ease-out), then fires `counted` (the dolphin celebrates). */
function count(el: HTMLElement) {
  const to = Number(el.dataset.count)
  const suffix = el.dataset.suffix ?? ''
  const ms = Number(el.dataset.ms ?? 1400)
  const t0 = performance.now()
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / ms)
    el.textContent = `${Math.round(to * (1 - (1 - k) ** 3))}${suffix}`
    if (k < 1) requestAnimationFrame(step)
    else el.dispatchEvent(new CustomEvent('counted', { bubbles: true }))
  }
  requestAnimationFrame(step)
}

/** Plays a muted clip; shows it over its poster only once frames arrive. */
export function playClip(video: HTMLVideoElement) {
  video.muted = true
  if (!video.dataset.wired) {
    video.dataset.wired = '1'
    video.addEventListener('playing', () => { video.dataset.playing = 'true' })
  }
  video.play().catch(() => { /* autoplay refused: the poster stays, which is the reduced-motion look */ })
}

export function startLandingMotion(root: HTMLElement): () => void {
  ;(window as unknown as { __lpReady?: boolean }).__lpReady = true
  if (!motionAllowed() || !('IntersectionObserver' in window)) {
    document.documentElement.classList.remove('lp-motion')
    return () => {}
  }
  const observers: IntersectionObserver[] = []

  observers.push(watch(root.querySelectorAll('[data-reveal]'), (el, inView) => {
    if (inView) el.classList.add('in')
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }, true))

  // Counters start at 0 only when they are still below the screen (no visible jump)
  const counters = [...root.querySelectorAll<HTMLElement>('[data-count]')].filter(el => el.getBoundingClientRect().top > window.innerHeight)
  for (const el of counters) el.textContent = `0${el.dataset.suffix ?? ''}`
  observers.push(watch(counters, (el, inView) => {
    if (inView) count(el as HTMLElement)
  }, { threshold: 0.6 }, true))

  observers.push(watch(root.querySelectorAll('video[data-auto]'), (el, inView) => {
    const video = el as HTMLVideoElement
    if (inView) playClip(video)
    else video.pause()
  }, { threshold: 0.35 }))

  return () => {
    for (const io of observers) io.disconnect()
    document.documentElement.classList.remove('lp-motion')
  }
}
