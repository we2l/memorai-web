const STORAGE_PREFIX = 'baigi-first-time-'

export function useFirstTimeTooltip() {
  function shouldShow(key: string): boolean {
    if (!import.meta.client) return false
    return !localStorage.getItem(`${STORAGE_PREFIX}${key}`)
  }

  function dismiss(key: string): void {
    if (import.meta.client) {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, new Date().toISOString())
    }
  }

  return { shouldShow, dismiss }
}
