import type { User } from '~/types'
import { safeRedirect } from '~/utils/routes'

/**
 * Where to go after login/sign-up/OAuth (RF-F4.5): straight to /comecar when the
 * onboarding is pending (avoids the /hoje → /comecar double hop), otherwise the
 * safe `redirect` query or /hoje.
 */
export function postAuthRedirect(user: Pick<User, 'onboarding_completed'> | null | undefined, redirect?: unknown): string {
  if (user && !user.onboarding_completed) return '/comecar'
  return safeRedirect(redirect)
}
