/**
 * Single logout flow (Sidebar, MoreSheet, Configurações).
 * `auth.logout()` swallows the API error on purpose: logging out always
 * clears the local state, even if the session is already gone server-side.
 */
export function useLogout() {
  const auth = useAuthStore()

  async function logout(opts: { to?: string; message?: string } = {}) {
    await auth.logout()
    if (opts.message) useToast().show(opts.message, 'success')
    await navigateTo(opts.to ?? '/entrar')
  }

  return { logout }
}
