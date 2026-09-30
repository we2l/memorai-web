import { test, expect } from '@playwright/test'

// routeRules.redirect (prd-performance-frontend RF-01): real 301, no client bundle.
// Run against `nuxt preview` (or the Vercel preview) — `nuxt dev` also honors routeRules.
const REDIRECTS: Record<string, string> = {
  '/dashboard': '/hoje',
  '/chat': '/hoje',
  '/stats': '/progresso',
  '/graph': '/cadernos?view=graph',
  '/documents': '/cadernos',
  '/decks': '/cadernos',
  '/decks/abc-123': '/cadernos',
}

for (const [from, to] of Object.entries(REDIRECTS)) {
  test(`${from} → 301 ${to}`, async ({ request }) => {
    const res = await request.get(from, { maxRedirects: 0 })
    expect(res.status()).toBe(301)
    expect(res.headers().location).toBe(to)
  })
}
