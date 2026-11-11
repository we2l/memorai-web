/** Routes reachable without a session (plus everything under /auth/ and /_ds, the dev-only DS reference). */
export const PUBLIC_ROUTES = ['/', '/entrar', '/criar-conta', '/esqueci-senha', '/redefinir-senha', '/termos', '/privacidade', '/ajuda', '/planos', '/lembretes/desativado', '/provas/resultado', '/quem-faz']
/** Blog and free tools (prd-blog-seo): every path under them is public */
const PUBLIC_PREFIXES = ['/blog', '/ferramentas']

/** Reading pages (blog, tools, /quem-faz): the consent banner is the thin bar there (prd-blog-v2 RF-L1) */
export function isReadingRoute(path: string): boolean {
  return path === '/quem-faz' || PUBLIC_PREFIXES.some(p => path === p || path.startsWith(`${p}/`))
}

export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.includes(path) || path.startsWith('/auth/') || path === '/_ds' || isGuestOnboardingRoute(path)
    || PUBLIC_PREFIXES.some(p => path === p || path.startsWith(`${p}/`))
}

/**
 * Whether the boot asks GET /me (plugins/auth.client): always with the session hint (cookie baigi_logged_in); without
 * it, only on a private route. A path no page matches (the 404) is not private (QA 2026-11 M6): a visitor there
 * would only get a 401 in the console.
 */
export function bootNeedsMe(path: string, opts: { known: boolean, hasHint: boolean }): boolean {
  if (opts.hasHint) return true
  return opts.known && !isPublicRoute(path)
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
