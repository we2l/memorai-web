import { watch, onBeforeUnmount, type Ref } from 'vue'

/**
 * Focus trap + focus return + body scroll lock for full-screen overlays that are not
 * UiModal (RF-F9.2). Pair with role="dialog" aria-modal="true" on the element.
 */
export function useOverlayA11y(isOpen: () => boolean, container: Ref<HTMLElement | null | undefined>, opts: { lockScroll?: boolean } = {}) {
  const trap = useFocusTrap(container)
  const scroll = useScrollLock()
  const lock = opts.lockScroll !== false

  watch(isOpen, (open) => {
    if (open) {
      if (lock) scroll.lock()
      void trap.activate()
    } else {
      if (lock) scroll.unlock()
      trap.deactivate()
    }
  }, { immediate: true, flush: 'post' })

  onBeforeUnmount(() => {
    scroll.unlock()
    trap.deactivate()
  })
}
