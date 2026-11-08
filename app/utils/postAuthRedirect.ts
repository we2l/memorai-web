import type { User } from '~/types'
import { safeRedirect } from '~/utils/routes'
import { pendingGuestProgress } from '~/utils/guestProgress'

/**
 * Where to go after login/sign-up/OAuth (RF-F4.5): straight to /comecar when the
 * onboarding is pending (avoids the /hoje → /comecar double hop), otherwise the
 * safe `redirect` query or /hoje.
 */
export function postAuthRedirect(user: Pick<User, 'onboarding_completed'> | null | undefined, redirect?: unknown): string {
  // A finished visitor's lote on this device goes into the account first (prd-onboarding-v4 RF-F4)
  if (user && pendingGuestProgress()) return '/comecar/pronto'
  if (user && !user.onboarding_completed) return '/comecar'
  return safeRedirect(redirect)
}
