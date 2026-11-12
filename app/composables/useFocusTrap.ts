import { nextTick, type Ref } from 'vue'

const FOCUSABLE = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** How the last interaction happened: a layer opened by pointer does not put the keyboard ring on a button. */
let lastPointer = false
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', () => { lastPointer = true }, true)
  document.addEventListener('keydown', () => { lastPointer = false }, true)
}

const TEXT_ENTRY = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, select, [contenteditable="true"]'

export function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter(el => !el.hasAttribute('inert') && !el.closest('[aria-hidden="true"]') && !el.closest('[hidden]'))
}

/**
 * Keeps Tab/Shift+Tab inside `container` while active, moves the initial
 * focus to `[autofocus]` (or the first focusable, or the container) and
 * returns focus to the element that opened it on deactivate.
 */
export function useFocusTrap(container: Ref<HTMLElement | null | undefined>, opts: { initial?: () => HTMLElement | null | undefined } = {}) {
  let previous: HTMLElement | null = null
  let active = false

  function onKeydown(e: KeyboardEvent) {
    if (!active || e.key !== 'Tab' || !container.value) return
    const items = getFocusable(container.value)
    if (!items.length) {
      e.preventDefault()
      container.value.focus()
      return
    }
    const first = items[0]!
    const last = items[items.length - 1]!
    const current = document.activeElement as HTMLElement | null
    const inside = current && container.value.contains(current)
    if (e.shiftKey && (current === first || !inside)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && (current === last || !inside)) {
      e.preventDefault()
      first.focus()
    }
  }

  async function activate() {
    if (active || typeof document === 'undefined') return
    active = true
    previous = document.activeElement as HTMLElement | null
    document.addEventListener('keydown', onKeydown, true)
    await nextTick()
    const root = container.value
    if (!root) return
    const target = opts.initial?.()
      ?? root.querySelector<HTMLElement>('[autofocus]')
      ?? getFocusable(root).find(el => !el.dataset.modalClose)
      ?? root
    // Opened by pointer: a text field still takes the focus (typing), anything else leaves it on the panel so no
    // ring shows on a tab or a button (owner's review of 12/11/2026); Tab and the arrows start from there.
    const focusTarget = lastPointer && target !== root && !target.matches(TEXT_ENTRY) ? root : target
    if (focusTarget === root && !root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1')
    focusTarget.focus({ preventScroll: true })
  }

  function deactivate() {
    if (!active) return
    active = false
    document.removeEventListener('keydown', onKeydown, true)
    const el = previous
    previous = null
    if (el && typeof el.focus === 'function' && document.contains(el)) el.focus({ preventScroll: true })
  }

  return { activate, deactivate }
}
