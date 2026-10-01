import fs from 'node:fs'
import path from 'node:path'
import { test } from '@playwright/test'
import { CONSENT_DECIDED } from './helpers'
import { SCREENS, VIEWPORTS, API_URL, NO_MOTION_CSS, FULL_PAGE_CSS, initScript, variantsOf, shotName, type Fixture } from './screens/screens'

/**
 * Screenshots das telas principais para revisão visual de PR (job `screens` do CI).
 * Sem backend: a API é servida do HAR gravado por e2e/screens/record.ts (ver e2e/README.md).
 * Não compara pixels (sem toHaveScreenshot): os PNG vão como artefato para revisão humana.
 * O build precisa apontar para a origem gravada: NUXT_PUBLIC_API_BASE=http://localhost:8037/api.
 */

const HAR = path.join(__dirname, 'screens', 'api.har')
const OUT = path.join(__dirname, '..', 'screens-output')
const fx: Fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'screens', 'fixture.json'), 'utf8'))

const SESSION_HINT = { ...CONSENT_DECIDED.cookies[0]!, name: 'baigi_logged_in', value: '1' }

test.use({ actionTimeout: 10_000 })
test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }))

for (const s of SCREENS) {
  for (const v of variantsOf(s)) {
    const name = shotName(s, v)
    test(`${name} @screens`, async ({ browser }, info) => {
      const ctx = await browser.newContext({
        ...VIEWPORTS[v.tag],
        baseURL: 'http://localhost:3000',
        colorScheme: v.theme,
        reducedMotion: 'reduce',
        storageState: { ...CONSENT_DECIDED, cookies: s.anonymous ? CONSENT_DECIDED.cookies : [...CONSENT_DECIDED.cookies, SESSION_HINT] },
      })
      // Datas relativas ("vence hoje", streak) batem com o momento da gravação
      await ctx.clock.install({ time: new Date(fx.recordedAt) })
      await ctx.routeFromHAR(HAR, { url: API_URL, notFound: 'abort' })

      const unmatched: string[] = []
      ctx.on('requestfailed', (r) => {
        if (API_URL.test(r.url())) unmatched.push(`${r.method()} ${r.url()} (${r.failure()?.errorText ?? 'falhou'})`)
      })

      const page = await ctx.newPage()
      await page.addInitScript(initScript(v.theme, NO_MOTION_CSS))
      await s.run(page, fx, v)
      if (s.fullPage) await page.addStyleTag({ content: FULL_PAGE_CSS })
      await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: !!s.fullPage, animations: 'disabled', caret: 'hide' })
      await ctx.close()

      if (unmatched.length) {
        // Request fora do HAR: a tela pode ter saído incompleta — regravar (e2e/README.md)
        const list = [...new Set(unmatched)]
        console.warn(`[screens] ${name}: ${list.length} request(s) fora do HAR:\n  ${list.join('\n  ')}`)
        info.annotations.push({ type: 'unmatched-har', description: list.join(' | ') })
        fs.appendFileSync(path.join(OUT, 'unmatched.txt'), list.map(l => `${name}: ${l}`).join('\n') + '\n')
      }
    })
  }
}
