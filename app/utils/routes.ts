/** Routes reachable without a session (plus everything under /auth/). */
export const PUBLIC_ROUTES = ['/', '/entrar', '/criar-conta', '/esqueci-senha', '/redefinir-senha', '/termos', '/privacidade', '/ajuda', '/planos']

export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.includes(path) || path.startsWith('/auth/')
}

/** Only same-app paths: avoids open redirects via ?redirect=//evil.com */
export function safeRedirect(target: unknown, fallback = '/hoje'): string {
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\')
    ? target
    : fallback
}
