import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { startLandingMotion } from '~/utils/landingMotion'

// Client-side navigation to / (owner's print, 11/11): the head script that adds html.lp-motion runs after
// onMounted, so the motion must not depend on the class being there already.
describe('startLandingMotion', () => {
  const observed: Element[] = []
  let reduced = false

  beforeEach(() => {
    observed.length = 0
    reduced = false
    document.documentElement.classList.remove('lp-motion')
    vi.stubGlobal('IntersectionObserver', class {
      observe(el: Element) { observed.push(el) }
      unobserve() {}
      disconnect() {}
    })
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') && reduced }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    document.documentElement.classList.remove('lp-motion')
  })

  function page() {
    const root = document.createElement('div')
    root.innerHTML = '<section data-reveal></section><section data-reveal></section>'
    return root
  }

  it('turns the motion on and watches every [data-reveal] even without html.lp-motion yet', () => {
    const stop = startLandingMotion(page())
    expect(document.documentElement.classList.contains('lp-motion')).toBe(true)
    expect(observed.filter(el => el.hasAttribute('data-reveal'))).toHaveLength(2)
    stop()
    expect(document.documentElement.classList.contains('lp-motion')).toBe(false)
  })

  it('keeps everything still with reduced motion', () => {
    reduced = true
    document.documentElement.classList.add('lp-motion')
    startLandingMotion(page())
    expect(document.documentElement.classList.contains('lp-motion')).toBe(false)
    expect(observed).toHaveLength(0)
  })
})
