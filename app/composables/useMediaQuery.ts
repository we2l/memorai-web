/**
 * A CSS media query as a ref (client only; the app is `ssr: false`). For layouts that change what is
 * mounted, not only how it looks (the material's panel is an aside on the desktop and a sheet on the
 * phone): rendering both and hiding one with CSS would mount the panel twice.
 */
export function useMediaQuery(query: string) {
  const matches = ref(false)
  if (!import.meta.client || typeof window.matchMedia !== 'function') return matches
  const list = window.matchMedia(query)
  matches.value = list.matches
  const onChange = (e: MediaQueryListEvent) => { matches.value = e.matches }
  list.addEventListener('change', onChange)
  if (getCurrentScope()) onScopeDispose(() => list.removeEventListener('change', onChange))
  return matches
}
