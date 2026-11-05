import { nextTick, onMounted, onUnmounted, watch, type Ref } from 'vue'

// Stack of open modal layers (UiDialog, UiSheet): Esc only closes the topmost one
const openStack: symbol[] = []

/**
 * Behaviour shared by every modal layer (prd-ds-v3-fundacao RF-2.1 / tasks 12.1):
 * Esc on the topmost layer only, body scroll lock (counted, nested layers keep it locked), focus trapped
 * in the panel, initial focus skipping the close button ([data-modal-close]) and focus returned to the
 * opener on close.
 */
export function useModalLayer(opts: {
  open: () => boolean
  panel: Ref<HTMLElement | null | undefined>
  /** Esc on the topmost layer */
  onEscape: () => void
}) {
  const token = Symbol('modal-layer')
  const trap = useFocusTrap(opts.panel)
  const scroll = useScrollLock()
  let active = false

  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !active || openStack[openStack.length - 1] !== token) return
    e.stopPropagation()
    opts.onEscape()
  }

  async function activate() {
    if (active) return
    active = true
    openStack.push(token)
    document.addEventListener('keydown', onKeydown)
    scroll.lock()
    await nextTick()
    await trap.activate()
  }

  function deactivate() {
    if (!active) return
    active = false
    const i = openStack.indexOf(token)
    if (i !== -1) openStack.splice(i, 1)
    document.removeEventListener('keydown', onKeydown)
    scroll.unlock()
    trap.deactivate()
  }

  watch(opts.open, v => (v ? activate() : deactivate()))
  onMounted(() => { if (opts.open()) activate() })
  onUnmounted(deactivate)

  return { isTop: () => openStack[openStack.length - 1] === token }
}
