import AxeBuilder from '@axe-core/playwright'
import { test, expect, gotoApp, apiCall, sql, USERS, API, WEB, catalogProName } from './support/fixtures'
import type { Page } from '@playwright/test'

/**
 * Conta e auth v3 (prd-4g-conta-onboarding-v3 §9): as seções são os itens do menu da conta, a meta do dia muda o
 * Hoje, âncoras antigas, rótulos do catálogo, login/cadastro/senha no v4, 404 em português, axe nos dois temas.
 */
async function axe(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  const serious = results.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? ''))
  expect(serious.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`), `axe ${label}`).toEqual([])
}

/** Cada combinação de tema e largura do PRD (claro e escuro, 390 e 1440 px). */
async function axeEverywhere(page: Page, url: string, ready: () => Promise<void>) {
  for (const theme of ['light', 'dark'] as const) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript((t) => { try { localStorage.setItem('color-mode', t) } catch { /* intencional: sem storage */ } }, theme)
      await page.goto(url)
      await page.waitForLoadState('networkidle')
      await ready()
      await axe(page, `${url} ${theme} ${width}`)
    }
  }
}

const SECTIONS = ['Conta e segurança', 'Plano e uso de IA', 'Estudo e lembretes', 'Aparência', 'Seus dados']

test.describe('Configurações (Free)', () => {
  test.use({ auditUser: 'conta' })

  test('5 seções com os nomes do menu; cada item do menu rola até a sua', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await gotoApp(page, '/configuracoes')
    await expect(page.locator('main h1, h1')).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(SECTIONS)
    const nav = page.getByRole('navigation', { name: 'Configurações' })
    await expect(nav.getByRole('link')).toHaveText(SECTIONS)

    for (const [item, id] of [['Conta e segurança', 'conta'], ['Estudo e lembretes', 'estudo'], ['Uso de IA no mês', 'plano'], ['Exportar meus dados', 'dados']] as const) {
      await page.getByRole('button', { name: 'Menu da conta' }).first().click()
      await page.getByRole('menuitem', { name: item }).click()
      await expect(page).toHaveURL(new RegExp(`/configuracoes#${id}$`))
      await expect(page.locator(`#${id}`)).toBeInViewport()
    }

    // Item ativo acompanha a rolagem
    await page.locator('#aparencia').scrollIntoViewIfNeeded()
    await page.evaluate(() => document.getElementById('aparencia')!.scrollIntoView())
    await expect(nav.getByRole('link', { name: 'Aparência' })).toHaveAttribute('aria-current', 'page')
  })

  test('primário só o "Conhecer o Pro"; nome salva sozinho com "Salvo"', async ({ page }) => {
    await gotoApp(page, '/configuracoes')
    await expect(page.locator('main .bg-action.text-on-action, .bg-action.text-on-action').filter({ visible: true })).toHaveCount(1)
    await expect(page.getByRole('link', { name: `Conhecer o ${await catalogProName()}` })).toHaveAttribute('href', '/planos')
    await page.locator('#profile-name').fill('Conta Nova')
    await page.locator('#profile-name').blur()
    await expect(page.getByTestId('name-saved')).toHaveText('Salvo')
    expect(sql(`select name from users where email='${USERS.conta.email}'`)).toBe('Conta Nova')
  })

  test('a meta diária muda o Hoje e o /stats', async ({ page }) => {
    // Hoje com cards para que a meta tenha o que mostrar: 45 cards dão mais de 2 lotes, sem o teto de 20 novos
    await apiCall(page, 'PUT', '/settings', { daily_new_cards_limit: 100 })
    const topic = (await apiCall(page, 'POST', '/topics', { name: 'Meta' })).data.id
    for (let i = 0; i < 45; i++) await apiCall(page, 'POST', '/flashcards', { topic_id: topic, front: `F${i}`, back: `V${i}` })

    await gotoApp(page, '/configuracoes#estudo')
    const goal = page.getByTestId('daily-goal')
    await expect(goal.getByRole('radio')).toHaveCount(6)
    await expect(goal.getByRole('radio', { name: '3 lotes' })).toBeChecked()
    const saved = page.waitForResponse(r => r.url().endsWith('/api/settings') && r.request().method() === 'PUT')
    await goal.getByRole('radio', { name: '2 lotes' }).check()
    expect((await saved).request().postDataJSON()).toEqual({ daily_goal_batches: 2 })
    await expect(page.getByText('Meta salva')).toBeVisible()
    expect(sql(`select daily_goal_batches from users where email='${USERS.conta.email}'`)).toBe('2')
    expect((await apiCall(page, 'GET', '/stats')).data.goal.target_batches).toBe(2)

    await gotoApp(page, '/hoje')
    await expect(page.getByTestId('home-goal').locator('[role=text]')).toHaveAttribute('aria-label', /\/ 2 lotes/)
  })

  test('o tamanho do lote salva sozinho e muda a meta do /stats e o lote da revisão', async ({ page }) => {
    await apiCall(page, 'PUT', '/settings', { daily_new_cards_limit: 100, daily_goal_batches: 6 })
    const topic = (await apiCall(page, 'POST', '/topics', { name: 'Lote' })).data.id
    for (let i = 0; i < 25; i++) await apiCall(page, 'POST', '/flashcards', { topic_id: topic, front: `L${i}`, back: `R${i}` })

    await gotoApp(page, '/configuracoes#estudo')
    const size = page.getByTestId('batch-size')
    await expect(size.getByRole('radio')).toHaveCount(3)
    await expect(size.getByRole('radio', { name: '20 cards' })).toBeChecked()
    const saved = page.waitForResponse(r => r.url().endsWith('/api/settings') && r.request().method() === 'PUT')
    await size.getByRole('radio', { name: '10 cards' }).check()
    expect((await saved).request().postDataJSON()).toEqual({ review_batch_size: 10 })
    await expect(page.getByTestId('batch-size-saved')).toHaveText('Salvo')
    await expect(page.getByTestId('daily-goal')).toContainText('Um lote = 10 cards.')
    expect(sql(`select review_batch_size from users where email='${USERS.conta.email}'`)).toBe('10')
    const stats = (await apiCall(page, 'GET', '/stats')).data
    expect(stats.goal.batch_size).toBe(10)
    // The account keeps the cards of the other tests: the goal counts the whole day in lotes of 10, up to 6
    expect(stats.goal.target_batches).toBe(Math.min(6, Math.ceil((stats.due_today + stats.reviewed_today) / 10)))

    // 25 cards in lotes of 10: 3 lotes, the review cuts them with the size of /me
    await gotoApp(page, `/revisar?scope=topic:${topic}`)
    await expect(page.getByTestId('review-batch')).toContainText(/Lote 1 de 3\s*card 1 de 10/)
  })

  test('âncoras antigas vão para a seção nova', async ({ page }) => {
    await gotoApp(page, '/configuracoes#lembretes')
    await expect(page).toHaveURL(/\/configuracoes#estudo$/)
    await expect(page.locator('#estudo')).toBeInViewport()
    await gotoApp(page, '/configuracoes#uso')
    await expect(page).toHaveURL(/\/configuracoes#plano$/)
  })

  test('uso de IA: rótulos exatos do catálogo e quando a contagem recomeça', async ({ page }) => {
    const plans = (await (await page.context().request.get(`${API}/plans`, { headers: { Accept: 'application/json', Origin: WEB } })).json()).data
    const expected = Object.values(plans.features as Record<string, { label: string }>).map(f => f.label.charAt(0).toUpperCase() + f.label.slice(1))
    // The Free's preview of the AI (prd-uso-justo §9): + the PDF pages line, and it never resets
    if (plans.preview) expected.push('Páginas de PDF lidas pela IA')
    await gotoApp(page, '/configuracoes#plano')
    const rows = page.getByTestId('usage-row')
    await expect(rows).toHaveCount(expected.length)
    for (let i = 0; i < expected.length; i++) await expect(rows.nth(i)).toContainText(expected[i]!)
    await expect(page.getByText('Revisão em áudio')).toHaveCount(0)
    if (plans.preview) {
      await expect(page.getByTestId('usage-renews')).toHaveCount(0)
    } else {
      await expect(page.getByTestId('usage-renews')).toHaveText(/^a contagem recomeça em 01\/\d\d$/)
    }
  })

  test('axe nas configurações: claro e escuro, 390 e 1440', async ({ page }) => {
    test.setTimeout(120_000)
    await axeEverywhere(page, '/configuracoes', async () => { await expect(page.getByTestId('daily-goal')).toBeVisible() })
  })
})

test.describe('Configurações (Pro)', () => {
  test.use({ auditUser: 'contaPro' })

  test('nenhum primário para Pro', async ({ page }) => {
    await gotoApp(page, '/configuracoes')
    await expect(page.getByTestId('daily-goal')).toBeVisible()
    await expect(page.locator('.bg-action.text-on-action').filter({ visible: true })).toHaveCount(0)
  })
})

test.describe('Auth', () => {
  test('/entrar: h1, 1 primário, mostrar senha com aria-pressed e o foco no campo', async ({ page }) => {
    await page.goto('/entrar')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entrar no Baigi')
    await expect(page.locator('.bg-action.text-on-action').filter({ visible: true })).toHaveCount(1)
    await expect(page.getByTestId('google-button')).toContainText('Continuar com Google')
    const input = page.locator('#password')
    await input.fill('segredo-123')
    await input.focus()
    const toggle = page.getByTestId('password-toggle')
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await toggle.click()
    await expect(input).toHaveAttribute('type', 'text')
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(input).toBeFocused()
  })

  test('/entrar: throttle com o tempo do Retry-After, credenciais sem dizer qual, link expirado', async ({ page }) => {
    await page.route('**/api/login', r => r.fulfill({ status: 429, headers: { 'Retry-After': '42', 'Access-Control-Expose-Headers': 'Retry-After', 'Access-Control-Allow-Origin': WEB, 'Access-Control-Allow-Credentials': 'true' }, json: { message: 'Too Many Attempts.' } }))
    await page.goto('/entrar?verificacao=expirada')
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId('entrar-notice')).toHaveText('O link de confirmação expirou. Entre para receber outro.')
    await page.locator('#email').fill('alguem@audit.test')
    await page.locator('#password').fill('qualquer-coisa')
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByTestId('entrar-error')).toHaveText('Muitas tentativas. Tente de novo em 42 segundos.')

    await page.unroute('**/api/login')
    await page.route('**/api/login', r => r.fulfill({ status: 422, headers: { 'Access-Control-Allow-Origin': WEB, 'Access-Control-Allow-Credentials': 'true' }, json: { message: 'x', errors: { email: ['As credenciais informadas estão incorretas.'] } } }))
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page.getByTestId('entrar-error')).toHaveText('E-mail ou senha incorretos.')
  })

  test('/criar-conta: sem confirmar senha, dica em texto, aceite dos Termos e throttle', async ({ page }) => {
    let body: Record<string, unknown> = {}
    await page.route('**/api/register', (r) => {
      body = r.request().postDataJSON()
      return r.fulfill({ status: 429, headers: { 'Access-Control-Allow-Origin': WEB, 'Access-Control-Allow-Credentials': 'true' }, json: { message: 'x' } })
    })
    await page.goto('/criar-conta')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('#password_confirmation')).toHaveCount(0)
    await page.locator('#email').fill('novo@audit.test')
    await page.locator('#password').fill('abc')
    await expect(page.getByText('Faltam 5 caracteres.')).toBeVisible()
    await page.locator('#password').fill('abcdefgh1234')
    await expect(page.getByText('Senha forte.')).toBeVisible()
    await page.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByTestId('signup-error')).toHaveText('Muitas contas criadas daqui. Tente de novo mais tarde.')
    expect(body).not.toHaveProperty('password_confirmation')
  })

  test('/esqueci-senha não revela a conta; /redefinir-senha com link ruim oferece outro', async ({ page }) => {
    await page.route('**/api/forgot-password', r => r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': WEB, 'Access-Control-Allow-Credentials': 'true' }, json: { message: 'ok' } }))
    await page.goto('/esqueci-senha')
    await page.waitForLoadState('networkidle')
    await page.locator('#email').fill('alguem@audit.test')
    await page.getByRole('button', { name: 'Enviar link' }).click()
    await expect(page.getByTestId('forgot-sent')).toContainText('Se houver uma conta com alguem@audit.test, enviamos um link (vale por 60 min).')

    await page.goto('/redefinir-senha')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Este link expirou')
    await expect(page.getByTestId('reset-ask-again')).toHaveAttribute('href', '/esqueci-senha')

    await page.route('**/api/reset-password', r => r.fulfill({ status: 422, headers: { 'Access-Control-Allow-Origin': WEB, 'Access-Control-Allow-Credentials': 'true' }, json: { message: 'x', errors: { email: ['token'] } } }))
    await page.goto('/redefinir-senha?token=abc&email=alguem%40audit.test')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Criar nova senha')
    await page.locator('#password').fill('NovaSenha-123')
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Este link expirou')

    // Link bom: volta para /entrar com o aviso (navegação no cliente, a query já vem no setup)
    await page.unroute('**/api/reset-password')
    await page.route('**/api/reset-password', r => r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': WEB, 'Access-Control-Allow-Credentials': 'true' }, json: { message: 'ok' } }))
    await page.goto('/redefinir-senha?token=abc&email=alguem%40audit.test')
    await page.waitForLoadState('networkidle')
    await page.locator('#password').fill('NovaSenha-123')
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
    await page.waitForURL('**/entrar?senha_redefinida=1')
    await expect(page.getByText('Senha redefinida. Entre com a nova senha.')).toBeVisible()
  })

  test('a barra de consentimento não cobre o formulário', async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: WEB, viewport: { width: 390, height: 844 }, storageState: { cookies: [], origins: [] } })
    const p = await ctx.newPage()
    await p.goto('/criar-conta')
    await p.waitForLoadState('networkidle')
    const bar = p.getByTestId('consent-banner')
    await expect(bar).toBeVisible()
    await expect(bar).toHaveCSS('position', 'static')
    await p.getByRole('button', { name: 'Criar conta' }).scrollIntoViewIfNeeded()
    const button = await p.getByRole('button', { name: 'Criar conta' }).boundingBox()
    const barBox = await bar.boundingBox()
    expect(button!.y + button!.height).toBeLessThanOrEqual(barBox!.y)
    await ctx.close()
  })

  test('axe nas 4 telas de auth e no 404: claro e escuro, 390 e 1440', async ({ page }) => {
    test.setTimeout(180_000)
    for (const [url, title] of [['/entrar', 'Entrar no Baigi'], ['/criar-conta', 'Criar sua conta'], ['/esqueci-senha', 'Esqueci a senha'], ['/redefinir-senha?token=a&email=a%40b.c', 'Criar nova senha'], ['/endereco-que-nao-existe', 'Página não encontrada']] as const) {
      await axeEverywhere(page, url, async () => { await expect(page.getByRole('heading', { level: 1 })).toHaveText(title) })
    }
  })
})

test.describe('404', () => {
  test('anônimo: em português, sem ir para /entrar, com saída para o início', async ({ page }) => {
    await page.goto('/isso-nao-existe')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página não encontrada')
    await expect(page).toHaveURL(/\/isso-nao-existe$/)
    await expect(page.getByTestId('error-lead')).toContainText('/isso-nao-existe')
    await expect(page.getByTestId('error-search')).toHaveCount(0)
    await page.getByTestId('error-home').click()
    await expect(page).toHaveURL(`${WEB}/`)
  })

  test.describe('logado', () => {
    test.use({ auditUser: 'conta' })

    test('Ir para o Hoje; Buscar abre a busca no Hoje', async ({ page }) => {
      await page.goto('/isso-nao-existe')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página não encontrada')
      await expect(page.getByTestId('error-home')).toHaveText('Ir para o Hoje')
      await page.getByTestId('error-search').click()
      await page.waitForURL('**/hoje')
      await expect(page.getByRole('dialog').or(page.getByRole('combobox')).first()).toBeVisible()
    })
  })
})
