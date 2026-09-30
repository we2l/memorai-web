// Global keyboard shortcuts (⌘K, Alt+R, Alt+N). Lives outside UiCommandPalette so
// the palette can be lazy-mounted only when opened (prd-performance-frontend RN-F05).
export function handleGlobalShortcut(e: KeyboardEvent) {
  if (!useAuthStore().isAuthenticated) return

  const target = e.target as HTMLElement | null
  const isEditable = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

  // Ctrl+K / ⌘K — always capture (even in inputs)
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    const open = useCommandPaletteOpen()
    open.value = !open.value
    return
  }

  if (isEditable) return

  if (e.altKey && e.key === 'r') {
    e.preventDefault()
    navigateTo('/revisar')
    return
  }

  if (e.altKey && e.key === 'n') {
    e.preventDefault()
    navigateTo('/cadernos?action=new-note')
  }
}

export default defineNuxtPlugin(() => {
  document.addEventListener('keydown', handleGlobalShortcut)
})
