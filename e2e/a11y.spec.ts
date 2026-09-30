import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { sharedPage } from './helpers'

/**
 * Axe on the main routes, light and dark (prd-ux-critica RF-F9). Only serious/critical fail:
 * moderate/minor findings are printed for triage.
 */
const ROUTES = ['/hoje', '/cadernos', '/revisar', '/configuracoes', '/provas']

test.describe('Acessibilidade (axe)', () => {
  let page: import('@playwright/test').Page

  test.beforeAll(async ({ browser }) => {
    page = await sharedPage(browser)
  })
  test.afterAll(async () => { await page.context().close() })

  for (const theme of ['light', 'dark'] as const) {
    for (const route of ROUTES) {
      test(`${route} (${theme}) sem violações serious/critical`, async () => {
        await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch {} }, theme)
        await page.goto(route)
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(500)
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
        const blocking = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
        for (const v of results.violations) {
          console.log(`[axe ${theme} ${route}] ${v.impact} ${v.id}: ${v.nodes.length} nó(s) — ${v.nodes.slice(0, 3).map(n => `${n.target.join(' ')} ${n.html.slice(0, 120)} ${(n.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 160)}`).join(' | ')}`)
        }
        expect(blocking.map(v => `${v.id} (${v.nodes.length})`)).toEqual([])
      })
    }
  }
})
