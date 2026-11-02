import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect, gotoApp, apiCall, cachedLoginState, USERS } from './support/fixtures'
import { ensurePraticarSeed, fakeAudio, seedEpisode, type PraticarSeed } from './support/seed-praticar'

/**
 * Ouvir v3 (prd-4e-praticar-v3 §9, tasks 13.1): "Para hoje · Continuar · Biblioteca"; the transcript follows the
 * audio and a click seeks; the position lives on the server (another context continues from it); "revisar os
 * N agora" when the episode ends; the episódio da manhã switch only for Pro (Free sees "No Pro"). The episodes
 * are written in the database with a script and its marks (the transcript is the API's); the <audio> runs on
 * a fake clock (no sound, no network). No AI: POST /podcasts is never called.
 */
test.use({ auditUser: 'praticar' })

let seed: PraticarSeed
test.beforeEach(async ({ page }) => {
  await fakeAudio(page)
  await gotoApp(page, '/hoje')
  // The Free account has no seed (its library is empty)
  if (!test.info().titlePath.includes('Free')) seed = await ensurePraticarSeed(page)
})

const player = (page: Page) => page.getByTestId('player-panel').first()
const transcript = (page: Page) => page.getByTestId('podcast-transcript').first()
const current = (page: Page) => transcript(page).locator('button[aria-current="true"]')
const seekTo = (page: Page, s: number) => page.evaluate(t => (window as any).__audio.seek(t), s)

async function axe(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const blocking = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
  expect(blocking.map(v => `${label}: ${v.id} ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([])
}

test('"Para hoje" (o episódio da manhã), "Continuar" (ouvido 40%) e "Biblioteca"; um primário só', async ({ page }) => {
  await gotoApp(page, '/podcasts')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ouvir')
  await expect(page.getByTestId('podcasts-today')).toContainText('Seus erros de ontem')
  await expect(page.getByTestId('podcasts-today')).toContainText('gerado esta madrugada')
  await expect(page.getByTestId('podcasts-continue')).toContainText('Controle pela metade')
  await expect(page.getByTestId('podcasts-continue')).toContainText('ouvido 40%')
  await expect(page.getByTestId('podcasts-library')).toContainText('Português ouvido')
  await expect(page.getByTestId('podcasts-library')).toContainText('ouvido até o fim')
  await expect(page.locator('.shadow-press').filter({ visible: true })).toHaveCount(1)
  await axe(page, '/podcasts')
})

test('a transcrição acompanha o áudio (trecho atual em aria-current) e o clique leva o áudio até o trecho', async ({ page }) => {
  await gotoApp(page, '/podcasts')
  await page.getByTestId(`episode-${seed.dailyId}`).getByTestId('episode-open').click()
  await expect(transcript(page).getByRole('button')).toHaveCount(6)
  await expect(transcript(page).locator('ol')).toHaveAttribute('aria-live', 'off')
  await expect(current(page)).toContainText('Ontem você errou o controle difuso')
  // 2nd section (100–200 s), 2nd line (150–200 s)
  await seekTo(page, 160)
  await expect(current(page)).toContainText('E a decisão vale só entre as partes')
  await expect(player(page)).toContainText('2:40')
  // A click on the last line seeks to its start (250 s)
  await transcript(page).getByRole('button', { name: /artigo cinquenta e dois/ }).click()
  await expect.poll(() => page.evaluate(() => (window as any).__audio.time())).toBe(250)
  await expect(current(page)).toContainText('artigo cinquenta e dois')
  await axe(page, 'player')
})

test('posição no servidor: ouvir 40% num navegador e continuar do mesmo ponto em outro', async ({ page, browser }) => {
  const id = seedEpisode('praticar', seed.rootId, `Duas abas ${Date.now()}`, seed.cardIds.slice(0, 2), { hoursAgo: 2 })
  await gotoApp(page, '/podcasts')
  await page.getByTestId(`episode-${id}`).getByRole('button', { name: /^Tocar/ }).click()
  await seekTo(page, 120)
  const put = page.waitForResponse(r => r.url().endsWith(`/api/podcasts/${id}/progress`) && r.request().method() === 'PUT')
  await page.getByTestId(`episode-${id}`).getByRole('button', { name: /^Pausar/ }).click()
  expect((await put).status()).toBe(204)
  expect((await apiCall(page, 'GET', `/podcasts/${id}`)).data.listened_seconds).toBe(120)

  const other = await browser.newContext({ storageState: await cachedLoginState(browser, USERS.praticar.email, 'Senha-Audit-2026') })
  const page2 = await other.newPage()
  await fakeAudio(page2)
  await gotoApp(page2, '/podcasts')
  await expect(page2.getByTestId('podcasts-continue')).toContainText('ouvido 40%')
  await page2.getByTestId(`episode-${id}`).getByTestId('episode-open').click()
  await expect.poll(() => page2.evaluate(() => (window as any).__audio.time())).toBe(120)
  await expect(player(page2)).toContainText('2:00')
  await other.close()
})

test('no fim do episódio: "revisar os N agora" com exatamente os cards dele, e o fim gravado no servidor', async ({ page }) => {
  const id = seedEpisode('praticar', seed.rootId, `Até o fim ${Date.now()}`, seed.cardIds.slice(0, 3), { hoursAgo: 2 })
  await gotoApp(page, '/podcasts')
  await page.getByTestId(`episode-${id}`).getByTestId('episode-open').click()
  const put = page.waitForResponse(r => r.url().endsWith(`/api/podcasts/${id}/progress`) && r.request().method() === 'PUT')
  await page.evaluate(() => (window as any).__audio.end())
  expect((await put).request().postDataJSON()).toEqual({ position_seconds: 300, completed: true })
  const review = player(page).getByTestId('player-review')
  await expect(review).toContainText('Episódio concluído')
  await expect(review.getByRole('link', { name: 'revisar os 3 agora →' })).toHaveAttribute('href', `/revisar?scope=podcast:${id}`)
  await expect.poll(async () => (await apiCall(page, 'GET', `/podcasts/${id}`)).data.completed_at).not.toBeNull()
})

test('celular: o player abre numa folha com a transcrição', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await gotoApp(page, '/podcasts')
  await page.getByTestId(`episode-${seed.dailyId}`).getByTestId('episode-open').click()
  const sheet = page.getByRole('dialog', { name: 'Tocando agora' })
  await expect(sheet).toBeVisible()
  await expect(sheet.getByTestId('podcast-transcript').getByRole('button')).toHaveCount(6)
  await expect(sheet.getByTestId('player-toggle')).toHaveAttribute('aria-label', 'Pausar')
  await axe(page, 'player celular')
})

test('Pro: "Episódio da manhã" liga e fica gravado nas configurações', async ({ page }) => {
  await gotoApp(page, '/podcasts')
  const toggle = page.getByTestId('daily-episode').getByRole('switch', { name: 'Episódio da manhã' })
  await expect(toggle).toBeEnabled()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await expect.poll(async () => (await apiCall(page, 'GET', '/settings')).data.daily_episode).toBe(true)
  await page.reload()
  await expect(page.getByTestId('daily-episode').getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('daily-episode').getByRole('switch').click()
  await expect.poll(async () => (await apiCall(page, 'GET', '/settings')).data.daily_episode).toBe(false)
})

test.describe('Free', () => {
  test.use({ auditUser: 'praticarFree' })

  test('vê "No Pro" e o switch desligado (a API recusaria com pro_only)', async ({ page }) => {
    await gotoApp(page, '/podcasts')
    const box = page.getByTestId('daily-episode')
    await expect(box.getByRole('switch')).toBeDisabled()
    await expect(box.getByRole('link', { name: 'No Pro' })).toHaveAttribute('href', '/planos')
    await expect(page.getByTestId('podcasts-empty')).toContainText('Seu primeiro episódio')
    await expect(page.locator('.shadow-press').filter({ visible: true })).toHaveCount(1)
  })
})

test('axe sem violação séria em claro e escuro, 390 e 1440 px: Praticar, Questões, resultado, Ouvir e o player', async ({ page }) => {
  test.setTimeout(120_000)
  for (const theme of ['light', 'dark'] as const) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ colorScheme: theme })
      await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch {} }, theme)
      for (const path of ['/praticar', '/simulados', `/simulados/${seed.quizId}/resultado`, '/podcasts']) {
        await gotoApp(page, path)
        await axe(page, `${path} ${theme} ${width}`)
      }
      // The player: in the column (desktop) or in the sheet (phone)
      await page.getByTestId(`episode-${seed.dailyId}`).getByTestId('episode-open').click()
      await expect(page.getByTestId('podcast-transcript').first()).toBeVisible()
      await axe(page, `player ${theme} ${width}`)
      await page.evaluate(() => (window as any).__audio.seek(0))
    }
  }
})
