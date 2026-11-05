// A logout that could not reach the API (no network): the session cookie is HttpOnly and only the API ends it.
// plugins/auth.client.ts finishes it on the next boot, and no /me runs while it is pending.
const KEY = 'baigi-pending-logout'

export function markPendingLogout() {
  try { localStorage.setItem(KEY, '1') } catch { /* intencional: sem localStorage, o logout offline fica como era */ }
}

export function clearPendingLogout() {
  if (!import.meta.client) return
  try { localStorage.removeItem(KEY) } catch { /* intencional: sem localStorage não há o que limpar */ }
}

export function hasPendingLogout(): boolean {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}
