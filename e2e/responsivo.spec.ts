import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { CONSENT_DECIDED } from './helpers'
import { SCREENS, API_URL, NO_MOTION_CSS, initScript, settle, type Fixture } from './screens/screens'
import { CI_DEVICES } from './responsivo/devices'
import { inspect } from './responsivo/checks'

/**
 * Responsividade no CI (prd-responsividade RF-2), sem backend: as telas do job `screens` (API do HAR gravado,
 * e2e/screens/api.har) e as páginas públicas, em 5 aparelhos (o menor Android, o iPhone SE, o Pro Max, a paisagem
 * e o iPad Mini). Falha com rolagem horizontal, folha ou diálogo fora da tela, campo com fonte menor que 16 px
 * (zoom do iOS) ou alvo de toque abaixo de 24 px (WCAG 2.5.8). A auditoria completa, com capturas e os 44 px do
 * projeto, é e2e/responsivo/audit.ts (local, com a API).
 * O build precisa apontar para a origem gravada: NUXT_PUBLIC_API_BASE=http://localhost:8037/api.
 */
const HAR = path.join(__dirname, 'screens', 'api.har')
const fx: Fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'screens', 'fixture.json'), 'utf8'))
const SESSION_HINT = { ...CONSENT_DECIDED.cookies[0]!, name: 'baigi_logged_in', value: '1' }

// The public pages seen by a visitor (the landing with its cookie bar: no consent cookie)
const PUBLIC = [
  { name: 'landing', url: '/', consent: false },
  { name: 'landing-m', url: '/?m=prova', consent: true },
  { name: 'planos-publico', url: '/planos', consent: true },
  { name: 'criar-conta', url: '/criar-conta', consent: true },
  { name: 'esqueci-senha', url: '/esqueci-senha', consent: true },
  { name: 'termos', url: '/termos', consent: true },
]

// Below 24 px on purpose: the cells of the 26-week heatmap (role=grid, arrows move; the day also opens in a list)
const SMALL_ALLOWED = /"\d+ de \w+: /

for (const device of CI_DEVICES) {
  test.describe(device.label, () => {
    const screens = [
      ...SCREENS.map(s => ({ name: s.name, anonymous: !!s.anonymous, consent: true, run: (p: import('@playwright/test').Page) => s.run(p, fx, { tag: 'mobile', theme: 'light' }) })),
      ...PUBLIC.map(p => ({ name: p.name, anonymous: true, consent: p.consent, run: async (page: import('@playwright/test').Page) => { await page.goto(p.url); await settle(page) } })),
    ]
    for (const s of screens) {
      test(`${s.name} @responsivo`, async ({ browser }) => {
        const { defaultBrowserType: _browser, ...use } = device.use
        const cookies = [...(s.consent ? CONSENT_DECIDED.cookies : []), ...(s.anonymous ? [] : [SESSION_HINT])]
        const ctx = await browser.newContext({ ...use, baseURL: process.env.RESP_BASE_URL || 'http://localhost:3000', reducedMotion: 'reduce', storageState: { cookies, origins: [] } })
        await ctx.clock.install({ time: new Date(fx.recordedAt) })
        await ctx.routeFromHAR(HAR, { url: API_URL, notFound: 'abort' })
        const page = await ctx.newPage()
        await page.addInitScript(initScript(use.colorScheme === 'dark' ? 'dark' : 'light', NO_MOTION_CSS))
        await s.run(page)
        const r = await inspect(page, { coverage: false })
        await ctx.close()

        expect.soft(r.overflowX, `rolagem horizontal: ${r.overflowers.map(o => o.el).join(' | ')}`).toBeLessThanOrEqual(1)
        expect.soft(r.dialogs.map(d => `${d.el} ${d.note}`), 'folha ou diálogo fora da tela').toEqual([])
        expect.soft(r.zoomInputs.map(z => `${z.el} ${z.note}`), 'campo com fonte < 16 px (zoom do iOS)').toEqual([])
        const tiny = r.small.filter(t => Math.min(t.box.w, t.box.h) < 24 && !SMALL_ALLOWED.test(t.el))
        expect.soft(tiny.map(t => `${t.el} ${t.note}`), 'alvo de toque < 24 px').toEqual([])
      })
    }
  })
}
