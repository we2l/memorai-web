import { chromium } from '@playwright/test'
const [,, label, origin] = process.argv
const OUT = '/tmp/claude-1000/-home-weslley-Documentos-app-memorizacao/a309b046-dd3c-4bd9-b2f0-e0fef1f6d8cf/scratchpad/release-forms'
const pages = [
  ['calc', '/ferramentas/calculadora-do-esquecimento', 'tool-forgetting'],
  ['plano', '/ferramentas/plano-ate-a-prova', 'tool-plan'],
  ['blog-curva', '/blog/curva-do-esquecimento', 'tool-forgetting'],
  ['blog-tjsp', '/blog/tj-sp-escrevente-lei-seca-vunesp', 'tool-plan'],
]
const host = new URL(origin).hostname
const browser = await chromium.launch()
const problems = []
for (const scheme of ['light', 'dark']) for (const w of [390, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme, reducedMotion: 'reduce', deviceScaleFactor: 1 })
  await ctx.addCookies([{ name: 'baigi_consent', value: encodeURIComponent(JSON.stringify({ v: '2026-09', analytics: false, ts: 1759000000 })), domain: host, path: '/' }])
  for (const [name, path, tid] of pages) {
    const page = await ctx.newPage()
    page.on('pageerror', e => problems.push(`${label} ${name} ${w} ${scheme} pageerror: ${e.message}`))
    await page.goto(origin + path, { waitUntil: 'networkidle' })
    const sec = page.getByTestId(tid)
    await sec.scrollIntoViewIfNeeded()
    await sec.waitFor()
    if (tid === 'tool-plan') {
      const d = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10)
      await page.locator('[data-testid=tool-plan-date] input, input[data-testid=tool-plan-date]').first().fill(d)
      await page.locator('[data-testid=tool-plan-cards] input, input[data-testid=tool-plan-cards]').first().fill('1500')
    } else {
      await page.locator('[data-testid=tool-forgetting-days] input, input[data-testid=tool-forgetting-days]').first().fill('12')
    }
    await page.waitForTimeout(400)
    const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    if (sw > 0) problems.push(`${label} ${name} ${w} ${scheme} horizontal scroll ${sw}px`)
    await sec.screenshot({ path: `${OUT}/${label}-${name}-${w}-${scheme}.png` })
    await page.close()
  }
  await ctx.close()
}
await browser.close()
console.log(problems.length ? problems.join('\n') : 'ok sem problemas')
