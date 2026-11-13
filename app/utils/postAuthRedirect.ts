import type { User } from '~/types'
import { safeRedirect } from '~/utils/routes'
import { pendingGuestProgress } from '~/utils/guestProgress'
import { pendingEditalIntent, publicEditalResultPath } from '~/utils/editalIntent'

/**
 * Where to go after login/sign-up/OAuth (RF-F4.5): straight to /comecar when the
 * onboarding is pending (avoids the /hoje → /comecar double hop), otherwise the
 * safe `redirect` query or /hoje.
 */
export function postAuthRedirect(user: Pick<User, 'onboarding_completed'> | null | undefined, redirect?: unknown): string {
  // A finished visitor's lote on this device goes into the account first (prd-onboarding-v4 RF-F4)
  if (user && pendingGuestProgress()) return '/comecar/pronto'
  // "Estudar isso no Baigi" pressed before the account existed (prd-edital-verticalizado-publico RF-F5): the lote
  // wins (above); without one, the result page applies the reading and opens the caderno
  const edital = user ? pendingEditalIntent() : null
  if (edital) return `${publicEditalResultPath(edital)}?aplicar=1`
  if (user && !user.onboarding_completed) return '/comecar'
  return safeRedirect(redirect)
}
