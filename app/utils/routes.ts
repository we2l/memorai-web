/** Routes reachable without a session (plus everything under /auth/ and /_ds, the dev-only DS reference). */
export const PUBLIC_ROUTES = ['/', '/entrar', '/criar-conta', '/esqueci-senha', '/redefinir-senha', '/termos', '/privacidade', '/ajuda', '/planos', '/lembretes/desativado', '/provas/resultado', '/quem-faz']
/** Blog and free tools (prd-blog-seo): every path under them is public */
const PUBLIC_PREFIXES = ['/blog', '/ferramentas']

export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.includes(path) || path.startsWith('/auth/') || path === '/_ds'
    || PUBLIC_PREFIXES.some(p => path === p || path.startsWith(`${p}/`))
}

/** Only same-app paths: avoids open redirects via ?redirect=//evil.com */
export function safeRedirect(target: unknown, fallback = '/hoje'): string {
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\')
    ? target
    : fallback
}
