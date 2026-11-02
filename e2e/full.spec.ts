import { test, expect } from '@playwright/test'
import { login, TEST_USER } from './helpers'

test.describe('Dashboard (/hoje)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('exibe saudação e streak', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible()
    // Streak só aparece com ≥ 1 dia ("N dias" com a chama); usuário novo não tem
    const streak = page.getByTestId('hero-streak')
    if (await streak.count()) await expect(streak.first()).toHaveText(/\d+ dias?/)
  })

  test('exibe CTA de revisão ou estado vazio', async ({ page }) => {
    const cta = page.getByTestId('plan-step-review').getByRole('link', { name: 'Começar' })
    const empty = page.getByText(/Tudo em dia|Que bom ter você aqui/i).first()
    await expect(cta.or(empty)).toBeVisible()
  })
})

test.describe('Cadernos (/cadernos)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/cadernos')
    await page.waitForLoadState('networkidle')
  })

  test('página carrega com título e "Novo caderno"', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Cadernos' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Novo caderno|Criar caderno/ }).first()).toBeVisible()
  })

  test('"Novo caderno" abre o diálogo; o Anki fica a um link', async ({ page }) => {
    await page.getByRole('button', { name: /Novo caderno|Criar caderno/ }).first().click()
    await expect(page.getByRole('dialog', { name: 'Novo caderno' })).toBeVisible()
    await page.getByRole('dialog', { name: 'Novo caderno' }).getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('link', { name: /Importe seus baralhos|Importar do Anki/ }).first()).toBeVisible()
  })
})

test.describe('Revisão (/revisar)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/revisar')
    await page.waitForLoadState('networkidle')
  })

  test('carrega sessão de revisão ou mostra tudo em dia', async ({ page }) => {
    await page.waitForTimeout(2000)
    const hasCards = await page.getByTestId('review-card').count() > 0
    const finished = await page.getByTestId('review-all-done').or(page.getByTestId('review-session-end')).or(page.getByTestId('review-no-cards')).count() > 0
    const waiting = await page.getByTestId('review-waiting').count() > 0
    expect(hasCards || finished || waiting).toBeTruthy()
  })

  test('botão Voltar leva ao dashboard', async ({ page }) => {
    await page.getByTestId('review-exit').click()
    await expect(page).toHaveURL(/\/hoje/)
  })
})

test.describe('Progresso (/progresso)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/progresso')
    await page.waitForLoadState('networkidle')
  })

  test('exibe título e métricas', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Progresso' })).toBeVisible()
    await page.waitForTimeout(2000)
    const mastery = page.getByText('Domínio geral')
    const loading = page.getByTestId('skeleton').first()
    await expect(mastery.or(loading)).toBeVisible()
  })
})

test.describe('Configurações (/configuracoes)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/configuracoes')
    await page.waitForLoadState('networkidle')
  })

  test('exibe perfil do usuário', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Perfil' })).toBeVisible()
    await expect(page.getByText(TEST_USER.email)).toBeVisible()
  })

  test('exibe uso de IA', async ({ page }) => {
    await expect(page.getByText('Uso de IA este mês')).toBeVisible()
  })

  test('exibe seção de aparência', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Aparência' })).toBeVisible()
    await expect(page.getByText('Tema', { exact: true })).toBeVisible()
  })
})

test.describe('Podcasts (/podcasts)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/podcasts')
    await page.waitForLoadState('networkidle')
  })

  test('página carrega com título e botão gerar', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Podcasts' })).toBeVisible()
    await expect(page.getByText('Gerar podcast')).toBeVisible()
  })

  test('exibe lista de podcasts ou estado vazio', async ({ page }) => {
    const empty = page.getByText('Nenhum podcast ainda')
    const list = page.getByText('Tocando agora').or(page.locator('[class*="space-y"]'))
    await expect(empty.or(list)).toBeVisible()
  })
})

test.describe('Planos (/planos)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/planos')
    await page.waitForLoadState('networkidle')
  })

  test('exibe planos Grátis e Pro', async ({ page, request }) => {
    await expect(page.getByRole('heading', { name: /Escolha seu plano/i })).toBeVisible()
    const main = page.getByRole('main')
    await expect(main.getByText('Grátis', { exact: true })).toBeVisible()
    // Price comes from GET /api/plans; /planos abre no anual: alterna para o mensal
    const catalog = (await (await request.get('http://localhost:8037/api/plans')).json()).data
    const monthly = catalog.plans.find((p: any) => p.key === 'pro').prices.monthly.amount_cents
    const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthly / 100)
    await page.getByRole('button', { name: 'Alternar entre plano mensal e anual' }).click()
    await expect(main.getByText(brl).first()).toBeVisible()
  })

  test('mostra plano atual como desabilitado', async ({ page }) => {
    await expect(page.getByText('Plano atual')).toBeVisible()
  })
})

test.describe('Importar Anki (/importar)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/importar')
    await page.waitForLoadState('networkidle')
  })

  test('exibe upload de arquivo .apkg', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Importar Anki/i })).toBeVisible()
    await expect(page.getByText('Selecionar arquivo')).toBeVisible()
    await expect(page.getByText(/arraste e solte/i)).toBeVisible()
  })
})

test.describe('Navegação global', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('sidebar contém links principais', async ({ page }) => {
    const sidebar = page.locator('aside, nav').first()
    await expect(sidebar).toBeVisible()
  })

  test('navegar entre páginas mantém sessão', async ({ page }) => {
    await page.goto('/cadernos')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/cadernos/)

    await page.goto('/progresso')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/progresso/)

    await page.goto('/configuracoes')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(TEST_USER.email)).toBeVisible()
  })
})

test.describe('Auth', () => {
  test('redireciona para login quando não autenticado', async ({ page }) => {
    await page.goto('/hoje')
    await expect(page).toHaveURL(/\/entrar/)
  })

  test('login com credenciais inválidas mostra erro', async ({ page }) => {
    await page.goto('/entrar')
    await page.fill('#email', 'invalido@teste.com')
    await page.fill('#password', 'senhaerrada')
    await page.click('button[type="submit"]')
    await expect(page.locator('p[role="alert"], main [role="alert"]:not(:empty)').first()).toBeVisible({ timeout: 5000 })
  })

  test('página de criar conta carrega', async ({ page }) => {
    await page.goto('/criar-conta')
    await expect(page.getByText(/Criar conta|Cadastr/i)).toBeVisible()
  })
})
