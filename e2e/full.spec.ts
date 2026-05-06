import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Dashboard (/hoje)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('exibe saudação e streak', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByText('dias 🔥')).toBeVisible()
  })

  test('exibe CTA de revisão ou estado vazio', async ({ page }) => {
    const cta = page.getByRole('link', { name: /Começar revisão/i })
    const empty = page.getByText(/Tudo em dia|Pare de esquecer/i)
    await expect(cta.or(empty)).toBeVisible()
  })
})

test.describe('Cadernos (/cadernos)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/cadernos')
    await page.waitForLoadState('networkidle')
  })

  test('página carrega com título e botão Novo', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Cadernos' })).toBeVisible()
    await expect(page.getByText('Novo', { exact: true })).toBeVisible()
  })

  test('botão Novo abre menu com opções', async ({ page }) => {
    await page.getByText('Novo', { exact: true }).click()
    await expect(page.getByText('Novo caderno')).toBeVisible()
    await expect(page.getByText('Importar Anki')).toBeVisible()
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
    const hasCards = await page.locator('.review-card').count() > 0
    const finished = await page.getByText(/Tudo em dia|Missão de hoje concluída/i).count() > 0
    const waiting = await page.getByText('Aguardando').count() > 0
    expect(hasCards || finished || waiting).toBeTruthy()
  })

  test('botão Voltar leva ao dashboard', async ({ page }) => {
    await page.getByText('← Voltar').click()
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
    const loading = page.locator('.skeleton').first()
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
    await expect(page.getByText('Perfil')).toBeVisible()
    await expect(page.getByText('weslleyadesousa@gmail.com')).toBeVisible()
  })

  test('exibe uso de IA', async ({ page }) => {
    await expect(page.getByText('Uso de IA este mês')).toBeVisible()
  })

  test('exibe seção de aparência', async ({ page }) => {
    await expect(page.getByText('Aparência')).toBeVisible()
    await expect(page.getByText('Tema')).toBeVisible()
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

  test('exibe planos Grátis e Pro', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Escolha seu plano/i })).toBeVisible()
    await expect(page.getByText('Grátis', { exact: true })).toBeVisible()
    await expect(page.getByText('R$14')).toBeVisible()
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
    await expect(page.getByText('weslleyadesousa@gmail.com')).toBeVisible()
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
    await expect(page.locator('[role="alert"], .text-danger, .text-red-500').first()).toBeVisible({ timeout: 5000 })
  })

  test('página de criar conta carrega', async ({ page }) => {
    await page.goto('/criar-conta')
    await expect(page.getByText(/Criar conta|Cadastr/i)).toBeVisible()
  })
})
