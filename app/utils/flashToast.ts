import type { ToastType } from '~/composables/useToast'

// A toast that outlives the full page load of an account change (utils/accountState.ts reloadTo):
// written right before it, shown once by the ToastHost of the next page.
const KEY = 'baigi-flash-toast'

export function flashToast(message: string, type: ToastType = 'success') {
  try { sessionStorage.setItem(KEY, JSON.stringify({ message, type })) } catch { /* intencional: sem sessionStorage o aviso só não aparece depois de recarregar */ }
}

export function takeFlashToast(): { message: string, type: ToastType } | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    sessionStorage.removeItem(KEY)
    const v = JSON.parse(raw) as { message?: unknown, type?: unknown }
    if (typeof v.message !== 'string' || !v.message) return null
    return { message: v.message, type: (['success', 'error', 'warning', 'info'] as const).find(t => t === v.type) ?? 'success' }
  } catch {
    // intencional: sem sessionStorage ou valor ilegível, não há aviso a mostrar
    return null
  }
}
