import { test, expect, gotoApp, isApiUrl } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * API fora do ar (500) ou sem rede (abort) nas telas principais: a tela mostra erro com
 * "Tentar de novo" ou finge que está vazia? (RN-UX-03: erro nunca vira estado vazio.)
 * /me, /subscription, /usage e /settings continuam respondendo (sessão e layout de pé);
 * todos os outros GET da API falham.
 */
test.use({ auditUser: 'free' })

const KEEP = /\/api\/(me|subscription|usage|settings|plans)(\?|$)/

async function breakApi(page: Page, mode: 'http500' | 'offline') {
  const state = { broken: true, hits: 0 }
  await page.route(isApiUrl, async (route) => {
    const req = route.request()
    if (!state.broken || req.method() !== 'GET' || KEEP.test(req.url())) return route.fallback()
    state.hits++
    return mode === 'http500'
      ? route.fulfill({ status: 500, json: { message: 'Server Error' } })
      : route.abort('internetdisconnected')
  })
  return state
}

const SCREENS: { path: string; fakeEmpty: RegExp; loaded: RegExp }[] = [
  { path: '/hoje', fakeEmpty: /boas-vindas ao Baigi|Primeiros passos|Tudo em dia/, loaded: /boas-vindas ao Baigi|Tudo em dia|Plano do dia/ },
  { path: '/cadernos', fakeEmpty: /Comece sua jornada|Crie seu primeiro caderno/, loaded: /Comece sua jornada|Crie seu primeiro caderno/ },
  { path: '/progresso', fakeEmpty: /Seu progresso aparece aqui|Defina sua prova para ver/, loaded: /Seu progresso aparece aqui/ },
  { path: '/podcasts', fakeEmpty: /Seu primeiro episódio|Nenhum podcast ainda/, loaded: /Seu primeiro episódio/ },
  { path: '/simulados', fakeEmpty: /Treine com questões do seu material|Nenhum simulado ainda/, loaded: /Treine com questões do seu material/ },
]

for (const mode of ['http500', 'offline'] as const) {
  test.describe(`API ${mode === 'http500' ? 'com erro 500' : 'sem rede'}`, () => {
    for (const screen of SCREENS) {
      test(`${screen.path}: erro com "Tentar de novo", nunca estado vazio falso; retry recupera`, async ({ page }) => {
        const state = await breakApi(page, mode)
        await gotoApp(page, screen.path)
        await page.waitForTimeout(500)
        expect(state.hits, 'a tela não chamou a API').toBeGreaterThan(0)

        const retry = page.getByRole('alert').getByRole('button', { name: 'Tentar de novo' }).first()
        const fakeEmpty = await page.getByRole('main').getByText(screen.fakeEmpty).count()
        const evidence = `retry visível=${await retry.isVisible()} | estado vazio falso=${fakeEmpty > 0}`
        test.info().annotations.push({ type: 'evidência', description: evidence })
        console.log(`[${mode} ${screen.path}] ${evidence}`)
        expect(fakeEmpty, `${screen.path} mostra estado vazio com a API falhando`).toBe(0)
        await expect(retry).toBeVisible()

        state.broken = false
        await retry.click()
        await expect(page.getByRole('main').getByText(screen.loaded).first()).toBeVisible()
      })
    }
  })
}
