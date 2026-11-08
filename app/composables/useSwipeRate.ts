/**
 * Swipe to rate (prd-revisao-v5-fase-b RF-F10, B-D10): optional, off by default (/me.review_swipe). Only a touch or a
 * pen, only with the answer on screen, only a horizontal move (|dx| > 1.5·|dy|; otherwise it is a scroll and the card
 * stays). Past 30% of the card's width (at least 96 px) it rates: right = "Lembrei" (3), left = "Não lembrei" (1); in
 * the 4-button mode right = "Bom" and left = "De novo". The buttons stay; this is a shortcut for the common case.
 */
import type { Ref } from 'vue'

export const SWIPE_MIN_PX = 96
export const SWIPE_RATIO = 0.3

export type SwipeDirection = 'left' | 'right' | null

/** The rating a release gives, or null (below the threshold, or not horizontal). Pure: tested without the DOM. */
export function swipeRating(dx: number, dy: number, width: number): 1 | 3 | null {
  if (Math.abs(dx) <= Math.abs(dy) * 1.5) return null
  const threshold = Math.max(SWIPE_MIN_PX, width * SWIPE_RATIO)
  if (Math.abs(dx) < threshold) return null
  return dx > 0 ? 3 : 1
}

export function useSwipeRate(el: Ref<HTMLElement | null>, opts: { enabled: () => boolean; onRate: (rating: 1 | 3) => void }) {
  const dx = ref(0)
  const dragging = ref(false)
  let start: { x: number; y: number; id: number; width: number } | null = null
  let horizontal: boolean | null = null

  const direction = computed<SwipeDirection>(() => (dx.value > 12 ? 'right' : dx.value < -12 ? 'left' : null))
  const armed = computed(() => !!start && swipeRating(dx.value, 0, start.width) !== null)

  function down(e: PointerEvent) {
    if (!opts.enabled() || e.pointerType === 'mouse' || !el.value) return
    start = { x: e.clientX, y: e.clientY, id: e.pointerId, width: el.value.getBoundingClientRect().width }
    horizontal = null
  }
  function move(e: PointerEvent) {
    if (!start || e.pointerId !== start.id) return
    const mx = e.clientX - start.x
    const my = e.clientY - start.y
    if (horizontal === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) horizontal = Math.abs(mx) > Math.abs(my) * 1.5
    if (!horizontal) return
    dragging.value = true
    dx.value = mx
  }
  function up(e: PointerEvent) {
    if (!start || e.pointerId !== start.id) return
    const rating = horizontal ? swipeRating(e.clientX - start.x, e.clientY - start.y, start.width) : null
    reset()
    if (rating) opts.onRate(rating)
  }
  function reset() {
    start = null
    horizontal = null
    dragging.value = false
    dx.value = 0
  }

  onMounted(() => {
    const node = el.value
    if (!node) return
    node.addEventListener('pointerdown', down)
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerup', up)
    node.addEventListener('pointercancel', reset)
  })
  onUnmounted(() => {
    const node = el.value
    if (!node) return
    node.removeEventListener('pointerdown', down)
    node.removeEventListener('pointermove', move)
    node.removeEventListener('pointerup', up)
    node.removeEventListener('pointercancel', reset)
  })

  return { dx, dragging, direction, armed }
}
