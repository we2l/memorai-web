import { onMounted, onUnmounted } from 'vue'
import { binaryRatingOfKey, type ReviewButtonsMode } from '~/utils/reviewButtons'

export interface ReviewShortcutHandlers {
  flip: () => void
  rate: (rating: 1 | 2 | 3 | 4) => void
  undo: () => void
  edit?: () => void
  /** O: open the origin of the card (the material, the note or the question) */
  openOrigin?: () => void
  toggleHelp: () => void
  escape: () => void
  isFlipped: () => boolean
  /** Suspend everything (card editor open, timer modal...). */
  isSuspended?: () => boolean
  /** End of a batch on screen: Enter = next batch, Esc = back to the scope; the rest is off */
  batchEnd?: () => { next: () => void; stop: () => void } | null
  /** Two buttons (default when absent: four): 1 / ← "Não lembrei", 2 / → / Space / Enter "Lembrei" (prd-revisao-v5-fase-a D2) */
  mode?: () => ReviewButtonsMode
}

export function isTypingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null
  if (!node || typeof node.closest !== 'function') return false
  if (node.isContentEditable) return true
  return !!node.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')
}

function hasOpenModal(): boolean {
  return typeof document !== 'undefined' && !!document.querySelector('[aria-modal="true"]')
}

/**
 * Anki-style shortcuts for /revisar (RF-F2.1). Listener on `document`, ignored while
 * typing or with a modal open (Esc and ? still go through the modal's own handler).
 */
export function createReviewShortcutHandler(h: ReviewShortcutHandlers) {
  return (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey || e.metaKey) return
    if (isTypingTarget(e.target)) return
    if (h.isSuspended?.() || hasOpenModal()) return

    const key = e.key
    const batch = h.batchEnd?.()
    if (batch) {
      if (key === 'Enter' && !(e.target as HTMLElement | null)?.closest?.('button, a')) {
        e.preventDefault()
        batch.next()
      } else if (key === 'Escape') {
        e.preventDefault()
        batch.stop()
      } else if ((key === 'z' || key === 'Z') && e.ctrlKey) {
        e.preventDefault()
        h.undo()
      } else if (key === 'u' || key === 'U') {
        e.preventDefault()
        h.undo()
      }
      return
    }
    if ((key === 'z' || key === 'Z') && e.ctrlKey) {
      e.preventDefault()
      h.undo()
      return
    }
    if (e.ctrlKey) return

    if (key === ' ' || key === 'Enter') {
      // Let Enter/Space activate a focused button (other than the card itself)
      const target = e.target as HTMLElement | null
      if (target?.closest?.('button, a') && !target.closest('[data-review-card]')) return
      e.preventDefault()
      if (h.isFlipped()) h.rate(3)
      else h.flip()
      return
    }
    // The rating only with the answer on screen (prd-revisao-v5-fase-a RF-F3)
    if (h.mode?.() === 'two') {
      const rating = binaryRatingOfKey(key)
      if (rating === null || !h.isFlipped()) {
        if (['3', '4'].includes(key)) e.preventDefault()
      } else {
        e.preventDefault()
        h.rate(rating)
        return
      }
      if (['1', '2', '3', '4', 'ArrowLeft', 'ArrowRight'].includes(key)) return
    }
    if (['1', '2', '3', '4'].includes(key)) {
      if (!h.isFlipped()) return
      e.preventDefault()
      h.rate(Number(key) as 1 | 2 | 3 | 4)
      return
    }
    if (key === 'u' || key === 'U') {
      e.preventDefault()
      h.undo()
      return
    }
    if (key === 'e' || key === 'E') {
      if (!h.edit) return
      e.preventDefault()
      h.edit()
      return
    }
    if (key === 'o' || key === 'O') {
      if (!h.openOrigin || !h.isFlipped()) return
      e.preventDefault()
      h.openOrigin()
      return
    }
    if (key === '?') {
      e.preventDefault()
      h.toggleHelp()
      return
    }
    if (key === 'Escape') {
      h.escape()
    }
  }
}

export function useReviewShortcuts(h: ReviewShortcutHandlers) {
  const handler = createReviewShortcutHandler(h)
  onMounted(() => document.addEventListener('keydown', handler))
  onUnmounted(() => document.removeEventListener('keydown', handler))
}
