import { watch, onBeforeUnmount, type Ref } from 'vue'

/** Page-level sticky action bars report their height so the FAB/toasts stack above them. */
export function useStickyActionHeight(visible: Ref<boolean>, height = 68) {
  const h = useState<number>('sticky-action-h', () => 0)
  watch(visible, v => { h.value = v ? height : 0 }, { immediate: true })
  onBeforeUnmount(() => { h.value = 0 })
  return h
}
