import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { depthOf, watchScrollDepth, type ScrollDepth } from '~/utils/scrollDepth'

type Entry = { target: HTMLElement, isIntersecting: boolean, boundingClientRect: { top: number } }

let observers: FakeObserver[] = []
class FakeObserver {
  observed: Element[] = []
  disconnected = false
  constructor(public cb: (entries: Entry[]) => void) { observers.push(this) }
  observe(el: Element) { this.observed.push(el) }
  disconnect() { this.disconnected = true }
}

function markers(): HTMLElement[] {
  return [25, 50, 75, 100].map((d) => {
    const el = document.createElement('span')
    el.dataset.depth = String(d)
    return el
  })
}

/** One IntersectionObserver callback: `on` on screen, `above` already scrolled past, the rest below. */
function fire(els: HTMLElement[], on: number[], above: number[] = []) {
  observers[0]!.cb(els.map(el => ({
    target: el,
    isIntersecting: on.includes(Number(el.dataset.depth)),
    boundingClientRect: { top: above.includes(Number(el.dataset.depth)) ? -100 : 500 },
  })))
}

describe('watchScrollDepth', () => {
  beforeEach(() => {
    observers = []
    vi.stubGlobal('IntersectionObserver', FakeObserver)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('avisa cada limiar uma vez só, em ordem', () => {
    const els = markers()
    const seen: ScrollDepth[] = []
    watchScrollDepth(els, d => seen.push(d))
    expect(observers[0]!.observed).toHaveLength(4)
    fire(els, [])
    fire(els, [25])
    fire(els, [25])
    fire(els, [50], [25])
    expect(seen).toEqual([25, 50])
  })

  it('um salto até o fim conta os limiares do meio', () => {
    const els = markers()
    const seen: ScrollDepth[] = []
    watchScrollDepth(els, d => seen.push(d))
    fire(els, [100], [25, 50, 75])
    expect(seen).toEqual([25, 50, 75, 100])
    expect(observers[0]!.disconnected).toBe(true)
  })

  it('carregar no meio da página conta o que já ficou para trás', () => {
    const els = markers()
    const seen: ScrollDepth[] = []
    watchScrollDepth(els, d => seen.push(d))
    fire(els, [], [25, 50])
    expect(seen).toEqual([25, 50])
  })

  it('sem IntersectionObserver não faz nada', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const stop = watchScrollDepth(markers(), () => { throw new Error('não devia') })
    expect(() => stop()).not.toThrow()
  })
})

describe('depthOf', () => {
  it('aceita só os quatro limiares', () => {
    expect(depthOf('75')).toBe(75)
    expect(depthOf('30')).toBeNull()
    expect(depthOf(undefined)).toBeNull()
  })
})
