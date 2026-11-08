/**
 * Single logout flow (menu da conta, Configurações).
 * `auth.logout()` swallows the API error on purpose: logging out always
 * clears the local state, even if the session is already gone server-side.
 * It ends in a full page load (utils/accountState.ts): nothing of this account stays in memory for the next one.
 */
export function useLogout() {
  const auth = useAuthStore()

  async function logout(opts: { to?: string; message?: string } = {}) {
    await auth.logout()
    const to = opts.to ?? '/entrar'
    // Without network (the logout is pending, utils/pendingLogout.ts) a full load would hit the browser's offline
    // page: the stores were already reset by clearAuth, and the next login reloads anyway
    if (hasPendingLogout()) {
      if (opts.message) useToast().show(opts.message, 'success')
      await navigateTo(to, { replace: true })
      return
    }
    if (opts.message) flashToast(opts.message, 'success')
    reloadTo(to, { replace: true })
  }

  return { logout }
}
