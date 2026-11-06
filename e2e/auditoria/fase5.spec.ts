import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect, gotoApp, apiCall, doc, uid } from './support/fixtures'

/**
 * Fechamento do DS v3 (tasks 15.11): axe nas rotas principais, claro e escuro, 390 e 1440 px, sem legacy-v2.css e com o
 * tema padrão do Tailwind zerado. A landing entrou no DS na v4 (prd-landing-v4) e passa pela mesma régua.
 */
async function serious(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  return results.violations
    .filter(v => v.impact === 'serious' || v.impact === 'critical')
    .map(v => `${label} ${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)
}

const THEMES = ['light', 'dark'] as const
const WIDTHS = [390, 1440]

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    test.describe(`axe ${theme} ${width} px`, () => {
      test.use({ viewport: { width, height: 900 } })
      test.beforeEach(async ({ page }) => {
        await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch { /* só no teste */ } }, theme)
      })

      test.describe('app', () => {
        test.use({ auditUser: 'pro' })

        test('rotas principais', async ({ page }) => {
          test.setTimeout(90_000)
          await gotoApp(page, '/hoje')
          const topic = (await apiCall(page, 'POST', '/topics', { name: `Fase 5 ${uid()}` })).data
          const note = (await apiCall(page, 'POST', `/topics/${topic.id}/notes`, { title: 'Material', content: doc('Fotossíntese.') })).data
          const found: string[] = []
          for (const path of ['/hoje', '/cadernos', `/cadernos/${topic.id}`, `/cadernos/${topic.id}/material/${note.id}`, `/cadernos/${topic.id}/cards`, `/cadernos/${topic.id}/mapa`, '/revisar', '/praticar', '/simulados', '/podcasts', '/progresso', '/configuracoes', '/importar', '/planos']) {
            await gotoApp(page, path)
            await page.waitForTimeout(300)
            found.push(...await serious(page, path))
          }
          expect(found).toEqual([])
        })
      })

      test.describe('onboarding', () => {
        test.use({ auditUser: 'onboarding' })

        test('/comecar', async ({ page }) => {
          await gotoApp(page, '/comecar')
          expect(await serious(page, '/comecar')).toEqual([])
        })
      })

      // Landing v4 (prd-landing-v4 §9): inside the DS since the v4, it passes like every other screen
      test('landing', async ({ page }) => {
        await gotoApp(page, '/')
        expect(await serious(page, '/')).toEqual([])
      })
    })
  }
}

test.describe('as sobreposições migradas do UiModal', () => {
  test.describe('Pro', () => {
    test.use({ auditUser: 'pro' })

    test('confirmação com role alertdialog: nome, Esc fecha e o foco volta', async ({ page }) => {
      await gotoApp(page, '/configuracoes#dados')
      const opener = page.getByRole('button', { name: 'Exportar meus dados' }).or(page.getByRole('button', { name: 'Exportar' })).first()
      await opener.click()
      const dialog = page.getByRole('alertdialog')
      await expect(dialog).toBeVisible()
      await expect(dialog.getByRole('heading').first()).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(opener).toBeFocused()
    })
  })

  test('consentimento: "Personalizar" abre o diálogo e salva', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    await page.goto('/ajuda')
    await page.waitForLoadState('networkidle')
    await page.getByTestId('consent-customize').click()
    const dialog = page.getByRole('dialog', { name: 'Preferências de cookies' })
    await expect(dialog).toBeVisible()
    await dialog.getByTestId('consent-save').click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByTestId('consent-banner')).toHaveCount(0)
    await ctx.close()
  })
})

test.describe('mapa mental sem hex: as cores vêm dos tokens', () => {
  test.use({ auditUser: 'pro' })

  for (const theme of THEMES) {
    test(`os galhos seguem --subject-* (${theme}) e o escopo mostra as abas`, async ({ page }) => {
      await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch { /* só no teste */ } }, theme)
      await gotoApp(page, '/hoje')
      const topic = (await apiCall(page, 'POST', '/topics', { name: `Mapa ${uid()}` })).data
      for (const title of ['Primeira nota', 'Segunda nota', 'Terceira nota']) {
        await apiCall(page, 'POST', `/topics/${topic.id}/notes`, { title, content: doc(`${title} com conteúdo suficiente para o mapa mental da Fase 5.`) })
      }
      await gotoApp(page, `/cadernos/${topic.id}/mapa`)
      await expect(page.getByRole('tab', { name: 'Automático' })).toHaveAttribute('aria-selected', 'true')
      const branch = page.locator('.mindmap-container svg path.markmap-link').first()
      await expect(branch).toBeAttached({ timeout: 10_000 })
      const colors = await page.evaluate(() => {
        const styles = getComputedStyle(document.documentElement)
        // The same way d3 writes the color on the path
        const rgb = (name: string) => {
          const n = Number.parseInt(styles.getPropertyValue(name).trim().slice(1), 16)
          return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`
        }
        const strokes = [...document.querySelectorAll('.mindmap-container svg path.markmap-link')].map(p => p.getAttribute('stroke') ?? '')
        return { strokes, tokens: ['--subject-1', '--subject-2', '--subject-3', '--subject-7', '--subject-4'].map(rgb) }
      })
      expect(colors.strokes.length).toBeGreaterThan(0)
      for (const stroke of colors.strokes) expect(colors.tokens, stroke).toContain(stroke)
    })
  }
})

test.describe('a landing não vaza para o app', () => {
  test('de / para /entrar pela navegação do app: o login é o mesmo de quem abre direto', async ({ page }) => {
    const snapshot = () => page.evaluate(() => {
      const out: string[] = []
      for (const el of document.querySelectorAll('main *')) {
        const s = getComputedStyle(el)
        out.push(`${el.tagName} ${s.display} ${s.fontSize} ${s.color} ${s.borderRadius} ${s.boxShadow} ${s.padding}`)
      }
      return out
    })
    await page.goto('/entrar')
    await page.waitForLoadState('networkidle')
    const direct = await snapshot()

    await gotoApp(page, '/')
    await page.getByRole('link', { name: 'Entrar' }).first().click()
    await page.waitForURL('**/entrar')
    await page.waitForLoadState('networkidle')
    expect(await snapshot()).toEqual(direct)
  })
})
