import { onMounted, onUnmounted } from 'vue'

export interface ReviewShortcutHandlers {
  flip: () => void
  rate: (rating: 1 | 2 | 3 | 4) => void
  undo: () => void
  edit?: () => void
  toggleHelp: () => void
  escape: () => void
  isFlipped: () => boolean
  /** Suspend everything (card editor open, timer modal...). */
  isSuspended?: () => boolean
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
    if ((key === 'z' || key === 'Z') && e.ctrlKey) {
      e.preventDefault()
      h.undo()
      return
    }
    if (e.ctrlKey) return

    if (key === ' ' || key === 'Enter') {
      // Let Enter/Space activate a focused button (other than the card itself)
      const target = e.target as HTMLElement | null
      if (target?.closest?.('button, a') && !target.closest('.review-card')) return
      e.preventDefault()
      if (h.isFlipped()) h.rate(3)
      else h.flip()
      return
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
