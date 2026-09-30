// Global counter: nested modals keep the body locked until the last one closes
let locks = 0
let saved: { overflow: string; paddingRight: string } | null = null

export function lockScroll() {
  if (typeof document === 'undefined') return
  if (locks === 0) {
    const body = document.body
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight }
    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`
  }
  locks++
}

export function unlockScroll() {
  if (typeof document === 'undefined' || locks === 0) return
  locks--
  if (locks === 0 && saved) {
    document.body.style.overflow = saved.overflow
    document.body.style.paddingRight = saved.paddingRight
    saved = null
  }
}

export function useScrollLock() {
  let held = false
  return {
    lock() { if (!held) { held = true; lockScroll() } },
    unlock() { if (held) { held = false; unlockScroll() } },
  }
}

/** Test helper. */
export function scrollLockCount() {
  return locks
}
