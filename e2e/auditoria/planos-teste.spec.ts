import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { test, expect, gotoApp, apiCall, uid, doc, realGate, sql, USERS } from './support/fixtures'

/**
 * Teste do Intensivo e planos de lançamento (prd-planos-lancamento §3.2, tasks 7.8). Usuários próprios, cada um num
 * estado do teste (support/provision.php `trial`): disponível (abre no 1º material), sem e-mail confirmado, rodando,
 * no penúltimo e no último dia, e acabado.
 * - O nome do plano pago vem do catálogo: a API local ainda pode dizer "Pro"; com o catálogo mockado nos dois nomes a
 *   tela segue o que vier.
 * - Nenhuma IA: o guarda do fixture corta os POSTs de IA (599) e registra que o clique chegou à rede; o teste abre de
 *   verdade pelo POST /topics/{id}/notes (a 1ª nota), que não gasta IA.
 */

const dayMonth = (iso: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }).format(new Date(iso))
const banner = (page: Page) => page.getByRole('banner')

async function catalog(page: Page) {
  return (await apiCall(page, 'GET', '/plans')).data
}

// The 7-day trial is off since the preview of the AI (prd-uso-justo §9, TRIAL_DAYS=0): these run only with it on
test.beforeEach(async ({ page }) => {
  test.skip(!(await catalog(page)).trial, 'teste de 7 dias desligado (TRIAL_DAYS=0): ver planos-previa.spec.ts')
})
async function proName(page: Page): Promise<string> {
  return (await catalog(page)).plans.find((p: any) => p.key === 'pro').name
}

/** The real catalog with the paid plan renamed: the screen must follow it. */
async function renameCatalog(page: Page, name: string) {
  await page.route('**/api/plans', async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    body.data.plans.find((p: any) => p.key === 'pro').name = name
    await route.fulfill({ response: res, json: body })
  })
}

async function planItem(page: Page) {
  await banner(page).getByRole('button', { name: 'Menu da conta' }).click()
  const item = page.getByRole('menu').getByRole('menuitem').first()
  await expect(item).toBeVisible()
  return item
}

async function axe(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const blocking = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
  expect(blocking.map(v => `${label}: ${v.id} ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([])
}

test.describe('Teste disponível (Grátis, e-mail confirmado, sem material)', () => {
  test.describe.configure({ mode: 'serial' })
  test.use({ auditUser: 'trialInvite', viewport: { width: 1280, height: 800 } })

  test('convite com os dias do catálogo nos primeiros passos e no "+ Adicionar"; nenhum aviso de teste rodando', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const { days } = (await catalog(page)).trial
    const name = await proName(page)
    const invite = `Mande seu primeiro material e ganhe ${days} dias do ${name}`
    await expect(page.getByTestId('home-checklist').getByTestId('checklist-hint')).toHaveText(invite)
    await expect(page.getByTestId('home-trial')).toHaveCount(0)
    await apiCall(page, 'POST', '/topics', { name: `Convite ${uid()}` })
    await banner(page).getByRole('button', { name: 'Adicionar' }).click()
    await expect(page.getByRole('dialog', { name: 'Adicionar' }).getByTestId('add-trial')).toHaveText(`${invite}.`)
  })

  test('IA não bloqueada no cliente: "Explicar este card" abre o tira-dúvidas e o simulado vai ao servidor, sem "0 de 0"', async ({ page, aiGuard }) => {
    const topic = (await apiCall(page, 'GET', '/topics')).data[0]
    for (let i = 0; i < 3; i++) await apiCall(page, 'POST', '/flashcards', { topic_id: topic.id, front: `Pergunta ${i}`, back: `Resposta ${i}` })
    expect(sql(`select trial_started_at is null from users where email='${USERS.trialInvite.email}'`), 'pré-condição: teste disponível').toBe('t')

    await gotoApp(page, `/revisar?topic_id=${topic.id}`)
    await page.getByRole('button', { name: 'Mostrar resposta' }).click()
    await page.getByTestId('review-explain').click()
    await expect(page.getByRole('dialog').getByRole('textbox')).toHaveValue('Me explica este card.')
    await expect(page.getByRole('dialog', { name: /fazem parte|Você usou/ })).toHaveCount(0)

    // The scope has no material: /details is read-only and mocked to free the button; the POST is the guard's
    await page.route('**/api/topics/*/details', async (route) => {
      const res = await route.fetch()
      const body = await res.json()
      body.data.can_quiz = { ok: true }
      await route.fulfill({ response: res, json: body })
    })
    await gotoApp(page, `/simulados?topic_id=${topic.id}`)
    const sheet = page.getByRole('dialog', { name: 'Novas questões' })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByTestId('quiz-quota')).toHaveCount(0)
    await expect(sheet.getByTestId('quiz-submit')).toHaveText('Gerar 10 questões')
    await sheet.getByTestId('quiz-submit').click()
    await expect.poll(() => aiGuard).toContain('POST /api/quizzes')
    await expect(page.getByRole('dialog', { name: /fazem parte/ })).toHaveCount(0)
  })

  test('a 1ª nota abre o teste no servidor e a tela mostra "grátis até" sem recarregar', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const name = await proName(page)
    await banner(page).getByRole('button', { name: 'Adicionar' }).click()
    await page.getByRole('dialog', { name: 'Adicionar' }).getByRole('button', { name: /Colar texto/ }).click()
    await page.getByRole('dialog', { name: 'Colar texto' }).getByLabel('Texto').fill('Fotossíntese\nA clorofila absorve a luz.')
    await page.getByRole('button', { name: 'Salvar nota' }).click()
    await expect.poll(() => sql(`select trial_started_at is not null from users where email='${USERS.trialInvite.email}'`)).toBe('t')
    const me = (await apiCall(page, 'GET', '/me')).data
    expect(me.trial.status).toBe('active')
    await expect(page.getByTestId('home-trial')).toContainText(`${name} grátis até ${dayMonth(me.trial.ends_at)}`)
    await expect(page.getByTestId('home-checklist').getByTestId('checklist-hint')).toHaveCount(0)
  })
})

test.describe('Teste disponível sem e-mail confirmado', () => {
  test.use({ auditUser: 'trialUnverified' })

  test('o aviso de e-mail diz que o teste pede a confirmação', async ({ page }) => {
    await gotoApp(page, '/hoje')
    const { days } = (await catalog(page)).trial
    await expect(page.locator('#verify-email-notice')).toContainText(`Confirme seu e-mail para usar a IA e ganhar ${days} dias do ${await proName(page)} no primeiro material`)
  })

  test('/planos: o anual do catálogo, "equivale a" e a linha do teste', async ({ page }) => {
    await gotoApp(page, '/planos')
    const pro = (await catalog(page)).plans.find((p: any) => p.key === 'pro')
    const brl = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
    await expect(page.getByTestId('plan-pro-price')).toContainText(brl(pro.prices.annual.amount_cents))
    await expect(page.getByTestId('plan-pro-note')).toContainText(`Equivale a ${brl(pro.prices.annual.monthly_equivalent_cents)} por mês`)
    const { days } = (await catalog(page)).trial
    await expect(page.getByTestId('plan-trial')).toHaveText(`Ou teste ${days} dias grátis, sem cartão: começa quando você mandar o primeiro material.`)
    await expect(page.getByTestId('plan-free')).not.toContainText('Não incluído')
    await expect(page.getByTestId('plan-faq')).toContainText('Como funciona o teste grátis?')
  })
})

test.describe('Teste rodando', () => {
  test.use({ auditUser: 'trialActive', viewport: { width: 1280, height: 800 } })

  for (const name of ['Pro', 'Intensivo']) {
    test(`a linha do Hoje e o menu da conta seguem o catálogo ("${name}")`, async ({ page }) => {
      await renameCatalog(page, name)
      await gotoApp(page, '/hoje')
      const me = (await apiCall(page, 'GET', '/me')).data
      const line = `${name} grátis até ${dayMonth(me.trial.ends_at)}`
      await expect(page.getByTestId('home-trial')).toHaveText(`${line}. Ver planos`)
      await expect(page.getByTestId('home-trial').getByRole('link', { name: 'Ver planos' })).toHaveAttribute('href', '/planos')
      await expect(await planItem(page)).toContainText(line)
    })
  }

  test('configurações: "grátis até" no lugar do renova em, a contagem do teste e as páginas de PDF', async ({ page }) => {
    await gotoApp(page, '/configuracoes#plano')
    const me = (await apiCall(page, 'GET', '/me')).data
    await expect(page.getByTestId('plan-summary')).toHaveText(`${await proName(page)} grátis até ${dayMonth(me.trial.ends_at)}`)
    await expect(page.getByTestId('usage')).toContainText('Uso de IA no teste')
    await expect(page.getByTestId('usage-renews')).toHaveCount(0)
    await expect(page.getByTestId('usage-row').filter({ hasText: 'Páginas de PDF lidas pela IA' })).toContainText('0 de 100')
  })

  test('podcast fora do teste: o vídeo de demonstração no lugar de gerar (Ouvir e Praticar), sem autoplay e fora do precache', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const name = await (async () => { await gotoApp(page, '/podcasts'); return proName(page) })()
    await page.getByTestId('podcast-generate').click()
    const sheet = page.getByRole('dialog', { name: 'Podcast dos pontos fracos' })
    await expect(sheet).toBeVisible()
    const video = sheet.getByTestId('podcast-demo-video')
    await expect(video).toHaveAttribute('preload', 'none')
    await expect(video).toHaveAttribute('poster', '/demo/podcast-light-poster.jpg')
    await expect(video).toHaveAttribute('playsinline', '')
    await expect(video).toHaveAttribute('controls', '')
    await expect(video).not.toHaveAttribute('autoplay', /.*/)
    expect(await video.evaluate((v: HTMLVideoElement) => v.muted && v.paused)).toBe(true)
    await expect(sheet).toContainText('Demonstração sem som')
    await expect(sheet).toContainText('O podcast não entra no teste grátis.')
    await expect(sheet.getByTestId('podcast-scope')).toHaveCount(0)
    await expect(sheet.getByRole('link', { name: `Conhecer o ${name}` })).toHaveAttribute('href', '/planos')
    // The recording itself is there, and the service worker does not precache it
    expect((await page.request.get('/demo/podcast-light.mp4')).status()).toBe(200)
    const sw = await (await page.request.get('/sw.js')).text()
    expect(sw).not.toContain('demo/')
    await axe(page, 'paywall do podcast')
    await page.keyboard.press('Escape')

    await gotoApp(page, '/praticar')
    const listen = page.getByTestId('practice-listen')
    await expect(listen.getByTestId('podcast-demo-video')).toHaveAttribute('preload', 'none')
    await expect(listen.getByTestId('practice-listen-plans')).toHaveAttribute('href', '/planos')
    await expect(listen).not.toContainText('Gerar um episódio')
  })

  test('escuro: o vídeo e o poster do tema escuro', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('color-mode', 'dark'))
    await gotoApp(page, '/praticar')
    await expect(page.getByTestId('practice-listen').getByTestId('podcast-demo-video')).toHaveAttribute('poster', '/demo/podcast-dark-poster.jpg')
    await axe(page, 'Praticar escuro')
  })
})

test.describe('Últimos dias do teste', () => {
  test.describe('amanhã', () => {
    test.use({ auditUser: 'trialTomorrow' })
    test('"acaba amanhã" no Hoje e no menu', async ({ page }) => {
      await gotoApp(page, '/hoje')
      const line = `Seu ${await proName(page)} grátis acaba amanhã`
      await expect(page.getByTestId('home-trial')).toContainText(line)
      await expect(await planItem(page)).toContainText(line)
    })
  })

  test.describe('hoje', () => {
    test.use({ auditUser: 'trialToday' })
    test('"acaba hoje" no Hoje e no menu', async ({ page }) => {
      await gotoApp(page, '/hoje')
      const line = `Seu ${await proName(page)} grátis acaba hoje`
      await expect(page.getByTestId('home-trial')).toContainText(line)
      await expect(await planItem(page)).toContainText(line)
    })
  })
})

test.describe('Teste acabado', () => {
  test.use({ auditUser: 'trialUsed' })

  test('a IA responde 402 (limite 0) e o aviso diz "Seu teste do … acabou"', async ({ page }) => {
    await renameCatalog(page, 'Intensivo')
    await gotoApp(page, '/hoje')
    const t = await apiCall(page, 'POST', '/topics', { name: `Acabou ${uid()}` })
    await apiCall(page, 'POST', `/topics/${t.data.id}/notes`, { title: 'Material', content: doc('Fotossíntese e clorofila.') })
    const ended = () => sql(`select trial_started_at is not null and trial_ends_at < now() from users where email='${USERS.trialUsed.email}'`) === 't'
    expect(ended(), 'pré-condição: teste acabado').toBe(true)
    const gate = await realGate(page, /\/api\/ai\/generate-cards$/, 'trialUsed', ended)

    await gotoApp(page, `/cadernos/${t.data.id}`)
    await page.getByTestId('scope-generate').click()
    const modal = page.getByRole('dialog', { name: 'Seu teste do Intensivo acabou' })
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('Seus cadernos, notas e cards continuam com você.')
    expect(gate.map(g => g.status)).toEqual([402])
    expect(gate[0]!.body.limit).toBe(0)
  })
})
