/** Routes reachable without a session (plus everything under /auth/ and /_ds, the dev-only DS reference). */
export const PUBLIC_ROUTES = ['/', '/entrar', '/criar-conta', '/esqueci-senha', '/redefinir-senha', '/termos', '/privacidade', '/ajuda', '/planos', '/lembretes/desativado', '/provas/resultado']

export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.includes(path) || path.startsWith('/auth/') || path === '/_ds' || isGuestOnboardingRoute(path)
}

/** The visitor's onboarding (prd-onboarding-v4 RF-F6): /comecar and /comecar/{area}; /comecar/pronto needs the account. */
export function isGuestOnboardingRoute(path: string): boolean {
  const p = path.replace(/\/+$/, '') || '/'
  return p === '/comecar' || (p.startsWith('/comecar/') && p !== '/comecar/pronto')
}

/** Only same-app paths: avoids open redirects via ?redirect=//evil.com */
export function safeRedirect(target: unknown, fallback = '/hoje'): string {
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\')
    ? target
    : fallback
}
