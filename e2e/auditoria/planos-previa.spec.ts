import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect, gotoApp, apiCall, uid, tinker } from './support/fixtures'

async function axe(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const blocking = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
  expect(blocking.map(v => `${label}: ${v.id} ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([])
}

/**
 * Prévia grátis da IA no lugar do teste de 7 dias (prd-uso-justo §9). Conta Grátis com e-mail confirmado e a prévia
 * em uso (provision quota_exhausted na linha vitalícia: 1 de 10 gerações de cards, o mapa da prévia gasto). Sem IA:
 * nenhum POST de IA é feito, a tela lê o /usage e o catálogo.
 */
test.describe('Prévia grátis da IA', () => {
  test.use({ auditUser: 'preview' })

  test('a contagem da prévia onde a IA acontece e, gasta, o convite a /planos sem botão de pagar', async ({ page }) => {
    const catalog = (await apiCall(page, 'GET', '/plans')).data
    test.skip(!catalog.preview, 'API sem a prévia (prd-uso-justo §9)')
    const usage = (await apiCall(page, 'GET', '/usage')).data
    expect(usage.period).toBe('lifetime')

    const t = await apiCall(page, 'POST', '/topics', { name: `Prévia ${uid()}` })
    await gotoApp(page, `/cadernos/${t.data.id}/cards`)
    await expect(page.getByTestId('usage-notice')).toHaveText(`Prévia grátis: 1 de ${catalog.preview.limits.cards_ai} ${catalog.features.cards_ai.label}.`)

    // The map asks for 3 notes; written through tinker without events (no embedding job, no AI)
    tinker(`$t = App\\Domain\\Topic\\Models\\Topic::find('${t.data.id}'); App\\Domain\\Topic\\Models\\Note::withoutEvents(function () use ($t) { foreach ([1, 2, 3] as $i) { App\\Domain\\Topic\\Models\\Note::create(['user_id' => $t->user_id, 'topic_id' => $t->id, 'title' => "Nota $i", 'content' => ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => str_repeat("Controle de constitucionalidade $i. ", 20)]]]]], 'plain_content' => str_repeat("Controle de constitucionalidade $i. ", 20)]); } });`)
    await gotoApp(page, `/cadernos/${t.data.id}/mapa`)
    const ai = page.getByRole('tab', { name: /Detalhado/ })
    if (await ai.count()) await ai.click()
    const spent = page.getByTestId('usage-notice')
    await expect(spent).toContainText(`Você usou a prévia grátis de ${catalog.features.mindmap_ai.label}.`)
    const invite = spent.getByRole('link', { name: /^Conhecer o / })
    await invite.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/planos$/)
    if (catalog.checkout?.available === false) {
      await expect(page.getByText('Assinatura em breve').first()).toBeVisible()
      await expect(page.getByRole('button', { name: /^Assinar/ })).toHaveCount(0)
    }
    await expect(page.getByTestId('plan-faq')).toContainText('Como funciona a prévia grátis?')
  })

  // The podcast paywall (prd-planos-lancamento RF-F3): the real sample with sound instead of the muted video
  test('podcast no Grátis: a amostra com som no lugar de gerar (Ouvir e Praticar), só baixa no play e fora do precache', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    // The preview's own ~30 s podcast already spent: the sheet shows the sample instead of the form
    await page.route('**/api/usage', async (route) => {
      const res = await route.fetch()
      const body = await res.json()
      if (body.data?.features?.podcast) Object.assign(body.data.features.podcast, { used: body.data.features.podcast.limit, remaining: 0 })
      await route.fulfill({ response: res, json: body })
    })
    await gotoApp(page, '/podcasts')
    const name = ((await apiCall(page, 'GET', '/plans')).data.plans as { key: string, name: string }[]).find(p => p.key === 'pro')!.name
    await page.getByTestId('podcast-generate').click()
    const sheet = page.getByRole('dialog', { name: 'Podcast dos pontos fracos' })
    await expect(sheet).toBeVisible()
    const sample = sheet.getByTestId('podcast-sample')
    await expect(sample.locator('audio')).toHaveAttribute('preload', 'none')
    await expect(sample.locator('audio')).not.toHaveAttribute('autoplay', /.*/)
    // The whole transcript, nothing current before the play
    await expect(sample.getByTestId('podcast-sample-lines').locator('li')).toHaveCount(5)
    await expect(sample.locator('[aria-current="true"]')).toHaveCount(0)
    await expect(sheet.getByTestId('podcast-scope')).toHaveCount(0)
    await expect(sheet.getByRole('link', { name: `Conhecer o ${name}` })).toHaveAttribute('href', '/planos')
    // Plays for real: the clock moves and a line of the transcript lights up
    await sample.getByRole('button', { name: 'Ouvir um exemplo' }).click()
    await expect(sample.getByTestId('podcast-sample-time')).not.toHaveText(/^0:00 \//, { timeout: 10_000 })
    await expect(sample.locator('[aria-current="true"]')).toHaveCount(1)
    await sample.getByRole('button', { name: 'Pausar o exemplo' }).click()
    // The audio is there, and the service worker does not precache it
    expect((await page.request.get('/landing/podcast-amostra.mp3')).status()).toBe(200)
    const sw = await (await page.request.get('/sw.js')).text()
    expect(sw).not.toContain('podcast-amostra')
    await axe(page, 'paywall do podcast')
    await page.keyboard.press('Escape')

    await gotoApp(page, '/praticar')
    const listen = page.getByTestId('practice-listen')
    // Compact: only the line being spoken
    await expect(listen.getByTestId('podcast-sample-lines').locator('li')).toHaveCount(1)
    await expect(listen.getByTestId('practice-listen-plans')).toHaveAttribute('href', '/planos')
    await expect(listen).not.toContainText('Gerar um episódio')
  })

  test('escuro: a amostra no Praticar', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('color-mode', 'dark'))
    await gotoApp(page, '/praticar')
    await expect(page.getByTestId('practice-listen').getByTestId('podcast-sample')).toBeVisible()
    await axe(page, 'Praticar escuro')
  })
})
