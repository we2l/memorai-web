import { test, expect, type Page } from '@playwright/test'
import { login } from './helpers'

/**
 * Who used the previous release opens the app with its leftovers (pós-release 06/11): a chunk that no longer exists
 * (Vercel answers it with the app's HTML, 200 text/html) and localStorage in another shape. The app must open.
 */

const errorScreen = (page: Page) => page.getByRole('heading', { name: 'Algo deu errado' })

/** The Hoje drawn: its greeting (<h1>), not the error screen. */
async function hojeOpen(page: Page, timeout = 10_000) {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout })
  await expect(errorScreen(page)).toHaveCount(0)
  expect(new URL(page.url()).pathname).toBe('/hoje')
}

async function initialAssets(page: Page, path: string): Promise<Set<string>> {
  const html = await (await page.request.get(path)).text()
  return new Set([...html.matchAll(/(?:src|href)="(\/_nuxt\/[^"]+\.js)"/g)].map(m => m[1]!))
}

test.describe('estado velho da versão anterior', () => {
  // page.route does not see what the service worker serves from its precache
  test.use({ serviceWorkers: 'block' })

  test('chunk que não existe mais: recarrega uma vez e o app abre', async ({ page }) => {
    await login(page)
    const initial = await initialAssets(page, '/hoje')
    const shell = await (await page.request.get('/hoje')).text()
    // The first lazy chunk of the next load comes back as HTML, like a chunk of another release on Vercel
    let broken = ''
    await page.route('**/_nuxt/*.js', async (route) => {
      const url = new URL(route.request().url())
      if (broken || initial.has(url.pathname)) return route.continue()
      broken = url.pathname
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', headers: { 'cache-control': 'no-store' }, body: shell })
    })
    let loads = 0
    page.on('load', () => { loads++ })

    await page.goto('/hoje')
    await page.waitForLoadState('networkidle')
    await hojeOpen(page, 15_000)
    expect(broken, 'nenhum chunk preguiçoso foi quebrado').not.toBe('')
    expect(loads).toBe(2)
  })

  test('aba aberta da versão anterior: o componente preguiçoso que sumiu recarrega a página', async ({ page }) => {
    await login(page)
    await hojeOpen(page)
    // From now on every chunk not loaded yet "is gone" (a new deploy), until the page reloads
    const loaded = new Set(await page.evaluate(() => performance.getEntriesByType('resource').map(e => new URL(e.name).pathname)))
    let deployed = true
    const shell = await (await page.request.get('/hoje')).text()
    await page.route('**/_nuxt/*.js', (route) => {
      const path = new URL(route.request().url()).pathname
      if (!deployed || loaded.has(path)) return route.continue()
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', headers: { 'cache-control': 'no-store' }, body: shell })
    })
    // The search (Ctrl K) is a lazy component: no navigation involved
    page.once('framenavigated', () => { deployed = false })
    const reload = page.waitForEvent('load')
    await page.keyboard.press('Control+k')
    await reload
    await hojeOpen(page)
  })

  test('falha de chunk repetida não vira laço de recarga', async ({ page }) => {
    await login(page)
    let loads = 0
    page.on('load', () => { loads++ })
    const fail = () => page.evaluate(() => window.dispatchEvent(new Event('vite:preloadError')))

    await Promise.all([page.waitForEvent('load'), fail()])
    expect(loads).toBe(1)
    // Within the window: no second reload
    await fail()
    await page.waitForTimeout(1500)
    expect(loads).toBe(1)
    await hojeOpen(page)
  })

  test('localStorage com lixo da versão anterior: o app abre', async ({ page }) => {
    await page.addInitScript(() => {
      const junk: Record<string, string> = {
        'color-mode': '{lixo',
        'baigi-podcast-progress-pending': '{"ep":"lixo","x":{"position":"10"}}',
        'baigi-add-last-topic': '{"id":1}',
        'baigi-auto-cards': 'talvez',
        'review-shortcut-tip': 'NaN',
        'baigi-podcast-progress': '[[[',
      }
      try {
        for (const [k, v] of Object.entries(junk)) localStorage.setItem(k, v)
        sessionStorage.setItem('baigi-card-workshop-x', '{lixo')
        sessionStorage.setItem('baigi-chunk-reload', 'lixo')
      } catch { /* only the test */ }
    })
    await login(page)
    for (const path of ['/hoje', '/cadernos', '/podcasts', '/praticar']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expect(errorScreen(page), path).toHaveCount(0)
      expect(new URL(page.url()).pathname).toBe(path)
    }
  })
})
