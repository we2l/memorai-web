import { test, expect, type Page } from '@playwright/test'

/**
 * Tema sem piscar (prd-ds-v3-fundacao RF-1.4): o script do <head> (nuxt.config.ts THEME_SCRIPT) põe .dark
 * e color-scheme no <html> antes de o <body> existir, isto é, antes de qualquer pintura, CSS ou JS do app.
 * localStorage['color-mode'] = light | dark | system (ausente = system). Não precisa da API.
 */

// Recorded when <body> is inserted: the state the first paint would use
async function recordThemeAtBody(page: Page, mode: string | null) {
  await page.addInitScript((m) => {
    try { if (m) localStorage.setItem('color-mode', m); else localStorage.removeItem('color-mode') } catch {}
    new MutationObserver((_, obs) => {
      if (!document.body) return
      obs.disconnect()
      const root = document.documentElement
      ;(window as unknown as { __themeAtBody: object }).__themeAtBody = { dark: root.classList.contains('dark'), scheme: root.style.colorScheme }
    }).observe(document, { childList: true, subtree: true })
  }, mode)
}

const themeAtBody = (page: Page) => page.evaluate(() => (window as unknown as { __themeAtBody: { dark: boolean, scheme: string } }).__themeAtBody)
const isDark = (page: Page) => page.evaluate(() => document.documentElement.classList.contains('dark'))

for (const path of ['/entrar', '/hoje']) {
  test(`${path}: color-mode=dark já está escuro antes do <body> (sem flash branco)`, async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light' })
    const page = await ctx.newPage()
    await recordThemeAtBody(page, 'dark')
    await page.goto(path)
    expect(await themeAtBody(page)).toEqual({ dark: true, scheme: 'dark' })
    await page.waitForLoadState('networkidle')
    expect(await isDark(page)).toBe(true)
    await ctx.close()
  })
}

test('"Sistema" (sem escolha salva) segue prefers-color-scheme e reage à troca', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark' })
  const page = await ctx.newPage()
  await recordThemeAtBody(page, null)
  await page.goto('/entrar')
  expect(await themeAtBody(page)).toEqual({ dark: true, scheme: 'dark' })
  await page.waitForLoadState('networkidle')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect.poll(() => isDark(page)).toBe(false)
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect.poll(() => isDark(page)).toBe(true)
  await ctx.close()
})

test('escolha "light" vence o sistema escuro', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'dark' })
  const page = await ctx.newPage()
  await recordThemeAtBody(page, 'light')
  await page.goto('/entrar')
  expect(await themeAtBody(page)).toEqual({ dark: false, scheme: 'light' })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.waitForTimeout(200)
  expect(await isDark(page)).toBe(false)
  await ctx.close()
})

test('a barra do navegador (theme-color) segue o tema do app, não só o do sistema', async ({ browser }) => {
  const ctx = await browser.newContext({ colorScheme: 'light' })
  const page = await ctx.newPage()
  await recordThemeAtBody(page, 'dark')
  await page.goto('/entrar')
  await page.waitForLoadState('networkidle')
  const metas = await page.locator('meta[name="theme-color"]').evaluateAll(ms => ms.map(m => [m.getAttribute('content'), m.getAttribute('media')]))
  expect(metas.length).toBeGreaterThan(0)
  for (const [content, media] of metas) {
    expect(content?.toUpperCase()).toBe('#141218')
    expect(media).toBeNull()
  }
  await ctx.close()
})
