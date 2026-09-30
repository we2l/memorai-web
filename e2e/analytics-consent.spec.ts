import { test, expect, type Page, type Request } from '@playwright/test'
import { sharedPage } from './helpers'

/**
 * prd-analytics-posthog: LGPD banner + consent-gated PostHog.
 * Run `node .output/server` with NUXT_PUBLIC_POSTHOG_KEY=phc_e2e_fake so the plugin is active;
 * every PostHog request is intercepted here and never leaves the machine.
 */
const EMPTY = { cookies: [], origins: [] }

function watchAnalytics(page: Page) {
  const hits: Request[] = []
  page.on('request', (r) => {
    if (/\/_nuxt\/analytics-|\/ingest\/|posthog\.com/.test(r.url())) hits.push(r)
  })
  return hits
}

/** posthog-js sends `data=<base64 JSON>` (or raw JSON) when compression is not negotiated. */
function decodeBody(body: string): string {
  if (!body.startsWith('data=')) return body
  return Buffer.from(decodeURIComponent(body.slice(5)), 'base64').toString('utf8')
}

async function stubPosthog(page: Page) {
  await page.route(/\/ingest\/|posthog\.com/, route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }))
}

test.describe('Banner de consentimento', () => {
  // posthog-js drops events from likely bots (HeadlessChrome UA, navigator.webdriver)
  test.use({ storageState: EMPTY, userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' })
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false })
      Object.defineProperty(navigator, 'userAgentData', { get: () => undefined })
    })
  })

  test('aparece na 1ª visita com Recusar e Aceitar do mesmo peso', async ({ page }) => {
    await page.goto('/')
    const banner = page.getByTestId('consent-banner')
    await expect(banner).toBeVisible()
    await expect(banner).toHaveAttribute('role', 'dialog')
    const reject = await page.getByTestId('consent-reject').boundingBox()
    const accept = await page.getByTestId('consent-accept').boundingBox()
    expect(Math.round(reject!.width)).toBe(Math.round(accept!.width))
    expect(Math.round(reject!.height)).toBe(Math.round(accept!.height))
  })

  test('não aparece na /privacidade', async ({ page }) => {
    await page.goto('/privacidade')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('consent-banner')).toHaveCount(0)
  })

  test('Recusar: nada do PostHog é baixado nem enviado, e a escolha persiste', async ({ page }) => {
    const hits = watchAnalytics(page)
    await stubPosthog(page)
    await page.goto('/')
    await page.getByTestId('consent-reject').click()
    await expect(page.getByTestId('consent-banner')).toHaveCount(0)

    await page.goto('/planos')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('consent-banner')).toHaveCount(0)
    expect(hits.map(r => r.url())).toEqual([])
  })

  test('Sem decisão: nenhum chunk posthog-js nem requisição ao PostHog', async ({ page }) => {
    const hits = watchAnalytics(page)
    await stubPosthog(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    expect(hits.map(r => r.url())).toEqual([])
  })

  test('Aceitar: carrega o SDK sob demanda e envia pageview sem tokens da URL', async ({ page }) => {
    const hits = watchAnalytics(page)
    await stubPosthog(page)
    // SPA route: reads the runtime key of `node .output/server` (prerendered pages bake the build-time key)
    await page.goto('/redefinir-senha?utm_source=e2e&t=segredo-e2e&token=segredo-e2e')
    await page.getByTestId('consent-accept').click()
    await expect(page.getByTestId('consent-banner')).toHaveCount(0)

    const isEvents = (r: Request) => /\/ingest\/(e|i\/v0\/e)\//.test(r.url())
    await expect.poll(() => hits.filter(isEvents).length, { timeout: 15000 }).toBeGreaterThan(0)
    expect(hits.some(r => r.url().includes('/_nuxt/analytics-'))).toBe(true)

    const payload = hits.filter(isEvents).map(r => decodeBody(r.postData() ?? '')).join('\n')
    expect(payload).toContain('$pageview')
    expect(payload).toContain('utm_source=e2e')
    expect(payload).not.toContain('segredo-e2e')
  })

  test('mobile 375px: banner no rodapé, sem cobrir o CTA principal da landing', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: 'http://localhost:3000', storageState: EMPTY, viewport: { width: 375, height: 740 } })
    const page = await context.newPage()
    await page.goto('/')
    const banner = await page.getByTestId('consent-banner').boundingBox()
    expect(Math.round(banner!.y + banner!.height)).toBe(740)
    expect(Math.round(banner!.width)).toBe(375)
    await context.close()
  })
})

test.describe('Privacidade em Configurações (logado)', () => {
  test.describe.configure({ mode: 'serial' })
  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await sharedPage(browser)
  })

  test('switch grava na conta via PUT /api/consent', async () => {
    await page.goto('/configuracoes#privacidade')
    const sw = page.getByTestId('analytics-switch')
    await expect(sw).toBeVisible()
    const before = await sw.getAttribute('aria-checked')

    const put = page.waitForResponse(r => r.url().endsWith('/api/consent') && r.request().method() === 'PUT')
    await sw.click()
    expect((await put).status()).toBe(200)
    await expect(sw).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true')

    // Back to "off" so other specs keep the default
    if (before !== 'true') {
      const back = page.waitForResponse(r => r.url().endsWith('/api/consent'))
      await sw.click()
      await back
    }
    await expect(sw).toHaveAttribute('aria-checked', 'false')
  })
})
