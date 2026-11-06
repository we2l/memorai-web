// Global keyboard shortcuts (⌘K / Ctrl K, Alt+R, Alt+N, ?). They live outside the palette and the
// "+ Adicionar" sheet so both can be lazy-mounted only when opened (prd-performance-frontend RN-F05).
// Alt+N (nota em branco) replaced Ctrl+N, which the browser reserves for a new window (navegação v3).
// Keys are read by `code` with Alt: on macOS Option+N types a dead key ("˜"), not "n".
export function handleGlobalShortcut(e: KeyboardEvent) {
  if (!useAuthStore().isAuthenticated) return

  const target = e.target as HTMLElement | null
  const isEditable = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)

  // Ctrl+K / ⌘K — always capture (even in inputs)
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    const open = useCommandPaletteOpen()
    open.value = !open.value
    if (open.value) useAnalytics().track('search_opened', { origin: 'shortcut' })
    return
  }

  if (isEditable) return

  if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'KeyR' || e.key === 'r')) {
    e.preventDefault()
    void navigateTo('/revisar')
    return
  }

  if (e.altKey && !e.ctrlKey && !e.metaKey && (e.code === 'KeyN' || e.key === 'n')) {
    e.preventDefault()
    useAddSheet().show('shortcut', 'note')
    return
  }

  // "?" opens the shortcuts help; the review has its own "?" (focus chrome) and keeps it
  if (e.key === '?' && !e.altKey && !e.ctrlKey && !e.metaKey && document.documentElement.dataset.chrome !== 'focus') {
    e.preventDefault()
    void navigateTo('/ajuda?tab=atalhos')
  }
}

export default defineNuxtPlugin(() => {
  document.addEventListener('keydown', handleGlobalShortcut)
})
