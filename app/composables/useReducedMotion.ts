import { onBeforeUnmount, onMounted, ref } from 'vue'

/** `prefers-reduced-motion: reduce`, reactive (RF-F9.4). */
export function useReducedMotion() {
  const reduced = ref(false)
  let mql: MediaQueryList | null = null
  const update = () => { reduced.value = !!mql?.matches }

  onMounted(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    update()
    mql.addEventListener?.('change', update)
  })
  onBeforeUnmount(() => mql?.removeEventListener?.('change', update))

  return reduced
}
