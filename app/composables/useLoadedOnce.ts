import { ref, watch, type Ref } from 'vue'

/**
 * True from the first time `source()` is true on. Pairs with `<LazyX v-if="loaded">`:
 * the chunk only downloads on first open and the component stays mounted afterwards,
 * so its own leave transition keeps working. Components mounted this way must react to
 * their open prop with `{ immediate: true }` (they are born already open).
 */
export function useLoadedOnce(source: () => boolean): Ref<boolean> {
  const loaded = ref(source())
  if (!loaded.value) {
    const stop = watch(source, (v) => {
      if (!v) return
      loaded.value = true
      stop()
    })
  }
  return loaded
}
